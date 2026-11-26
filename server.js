const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const EXECUTABLE_PATH = path.join(ROOT_DIR, 'StockPricePredictor.exe');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Parses raw CSV text into structured records with robust delimiter,
 * header matching, number cleaning, and chronological ordering.
 */
function parseCSV(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('CSV file must contain a header row and at least one data row.');
  }

  // Detect delimiter: comma, semicolon, tab
  const firstLine = lines[0];
  let delimiter = ',';
  if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';';
  } else if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = '\t';
  }

  // Parse headers
  const headers = firstLine.split(delimiter).map(h => 
    h.trim().replace(/^["']|["']$/g, '').toLowerCase().replace(/[\s_-]+/g, ' ')
  );

  let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time') || h === 'day');
  let openIdx = headers.findIndex(h => h.includes('open') || h.includes('first'));
  let highIdx = headers.findIndex(h => h.includes('high') || h.includes('max'));
  let lowIdx = headers.findIndex(h => h.includes('low') || h.includes('min'));
  let closeIdx = headers.findIndex(h => h.includes('close') || h.includes('price') || h.includes('last'));
  let volIdx = headers.findIndex(h => h.includes('vol') || h.includes('shares'));

  // Only fall back to index 4 if headers are completely unlabeled/numeric (no recognized financial names)
  const hasRecognizedNames = headers.some(h => ['date', 'open', 'high', 'low', 'volume', 'vol'].some(k => h.includes(k)));
  if (closeIdx === -1 && !hasRecognizedNames && headers.length >= 5) {
    closeIdx = 4;
  }
  if (dateIdx === -1 && !hasRecognizedNames && headers.length >= 1) {
    dateIdx = 0;
  }

  if (closeIdx === -1) {
    throw new Error('Missing required column: "Close" price is mandatory for time-series forecasting.');
  }

  function cleanNum(str) {
    if (!str) return NaN;
    const cleaned = String(str).replace(/[$,\s€£%]/g, '');
    return parseFloat(cleaned);
  }

  const rawRecords = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (rawCols.length <= closeIdx) continue;

    const closeVal = cleanNum(rawCols[closeIdx]);
    if (isNaN(closeVal)) continue;

    const dateVal = dateIdx !== -1 && rawCols[dateIdx] ? rawCols[dateIdx] : `Day-${i}`;
    const openVal = openIdx !== -1 && !isNaN(cleanNum(rawCols[openIdx])) ? cleanNum(rawCols[openIdx]) : closeVal;
    const highVal = highIdx !== -1 && !isNaN(cleanNum(rawCols[highIdx])) ? cleanNum(rawCols[highIdx]) : Math.max(openVal, closeVal);
    const lowVal = lowIdx !== -1 && !isNaN(cleanNum(rawCols[lowIdx])) ? cleanNum(rawCols[lowIdx]) : Math.min(openVal, closeVal);
    const volVal = volIdx !== -1 && !isNaN(cleanNum(rawCols[volIdx])) ? Math.round(cleanNum(rawCols[volIdx])) : 0;

    rawRecords.push({
      date: dateVal,
      open: openVal,
      high: highVal,
      low: lowVal,
      close: closeVal,
      volume: volVal
    });
  }

  if (rawRecords.length === 0) {
    throw new Error('No valid numeric stock records found in CSV.');
  }

  // Ensure chronological order (oldest to newest)
  // If first record date is later than last record date, reverse to chronological
  let isDescending = false;
  const dFirst = new Date(rawRecords[0].date).getTime();
  const dLast = new Date(rawRecords[rawRecords.length - 1].date).getTime();
  if (!isNaN(dFirst) && !isNaN(dLast) && dFirst > dLast) {
    isDescending = true;
  }

  const sortedRecords = isDescending ? rawRecords.reverse() : rawRecords;

  // Add chronological index
  return sortedRecords.map((r, idx) => Object.assign({ index: idx }, r));
}

/**
 * Serializes records into clean standard CSV for C++ executable
 */
function serializeToStandardCSV(records) {
  let csv = 'Date,Open,High,Low,Close,Volume\n';
  for (const r of records) {
    csv += `${r.date},${r.open.toFixed(2)},${r.high.toFixed(2)},${r.low.toFixed(2)},${r.close.toFixed(2)},${r.volume}\n`;
  }
  return csv;
}

/**
 * Parses stdout from C++ StockPricePredictor.exe
 */
function parseCppOutput(rawStdout) {
  const result = {
    recordsCount: 0,
    dateRange: { start: '', end: '' },
    parameters: {
      windowSize: 10,
      forecastHorizon: 5,
      kNearest: 3,
      testSize: 5
    },
    dpTableDemo: {
      querySequence: [],
      targetSequence: [],
      dpMatrix: [],
      optimalDistance: 0.0
    },
    backtest: [],
    metrics: {
      sampleCount: 0,
      mae: 0.0,
      mape: 0.0,
      rmse: 0.0,
      directionalAccuracy: 0.0,
      matchedRegime: { start: -1, end: -1 },
      dtwDistance: 0.0
    },
    futureProjections: {
      latestPrice: 0.0,
      latestDate: '',
      projections: []
    },
    rawStdout: rawStdout
  };

  const lines = rawStdout.split(/\r?\n/);

  // 1. Records loaded & date range
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const recMatch = line.match(/Successfully loaded\s+(\d+)\s+records/i);
    if (recMatch) {
      result.recordsCount = parseInt(recMatch[1], 10);
    }

    const dateMatch = line.match(/Date range:\s+([^\s]+)\s+to\s+([^\s]+)/i);
    if (dateMatch) {
      result.dateRange.start = dateMatch[1];
      result.dateRange.end = dateMatch[2];
    }

    if (line.includes('Pattern Window Size (M)')) {
      const m = line.match(/:\s*(\d+)/);
      if (m) result.parameters.windowSize = parseInt(m[1], 10);
    }
    if (line.includes('Forecast Horizon (H)')) {
      const m = line.match(/:\s*(\d+)/);
      if (m) result.parameters.forecastHorizon = parseInt(m[1], 10);
    }
    if (line.includes('Top-K Similar Regimes')) {
      const m = line.match(/:\s*(\d+)/);
      if (m) result.parameters.kNearest = parseInt(m[1], 10);
    }
    if (line.includes('Backtest Validation Size')) {
      const m = line.match(/:\s*(\d+)/);
      if (m) result.parameters.testSize = parseInt(m[1], 10);
    }
  }

  // 2. DP Table Demo
  let inDpDemo = false;
  let inDpMatrix = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('DYNAMIC PROGRAMMING (DTW) TABLE DEMONSTRATION')) {
      inDpDemo = true;
      continue;
    }
    if (inDpDemo) {
      if (line.startsWith('Query Sequence')) {
        const parts = line.split(':')[1]?.trim().split(/\s+/).map(Number) || [];
        result.dpTableDemo.querySequence = parts;
      } else if (line.startsWith('Target Sequence')) {
        const parts = line.split(':')[1]?.trim().split(/\s+/).map(Number) || [];
        result.dpTableDemo.targetSequence = parts;
      } else if (line.startsWith('Resulting DP Cost Matrix')) {
        inDpMatrix = true;
      } else if (inDpMatrix && line.startsWith('i=')) {
        const tokens = line.split(/\s+/);
        const row = tokens.slice(1);
        result.dpTableDemo.dpMatrix.push(row);
      } else if (line.includes('Optimal Alignment Distance')) {
        const distMatch = line.match(/=\s*([0-9.]+)/);
        if (distMatch) result.dpTableDemo.optimalDistance = parseFloat(distMatch[1]);
        inDpDemo = false;
        inDpMatrix = false;
      }
    }
  }

  // 3. Backtest Table
  let inBacktest = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('STOCK PRICE FORECASTING EVALUATION')) {
      inBacktest = true;
      continue;
    }
    if (inBacktest) {
      if (line.startsWith('Step') || line.startsWith('---') || line.length === 0) {
        continue;
      }
      if (line.includes('[Performance Metrics Summary]')) {
        inBacktest = false;
        continue;
      }
      // Line format: "1 183.70 183.51 0.19 0.10"
      const cols = line.split(/\s+/);
      if (cols.length >= 5 && !isNaN(parseInt(cols[0], 10))) {
        result.backtest.push({
          step: parseInt(cols[0], 10),
          actual: parseFloat(cols[1]),
          predicted: parseFloat(cols[2]),
          absError: parseFloat(cols[3]),
          pctError: parseFloat(cols[4])
        });
      }
    }
  }

  // 4. Performance Metrics Summary
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Number of Evaluated Periods')) {
      const m = line.match(/:\s*(\d+)/);
      if (m) result.metrics.sampleCount = parseInt(m[1], 10);
    }
    if (line.includes('Mean Absolute Error (MAE)')) {
      const m = line.match(/\$([0-9.]+)/);
      if (m) result.metrics.mae = parseFloat(m[1]);
    }
    if (line.includes('Mean Abs % Error (MAPE)')) {
      const m = line.match(/:\s*([0-9.]+)%/);
      if (m) result.metrics.mape = parseFloat(m[1]);
    }
    if (line.includes('Root Mean Sq Error (RMSE)')) {
      const m = line.match(/\$([0-9.]+)/);
      if (m) result.metrics.rmse = parseFloat(m[1]);
    }
    if (line.includes('Directional Accuracy')) {
      const m = line.match(/:\s*([0-9.]+)%/);
      if (m) result.metrics.directionalAccuracy = parseFloat(m[1]);
    }
    if (line.includes('Best Matched Hist. Regime')) {
      const m = line.match(/\[(\d+)\s*\.\.\s*(\d+)\]/);
      if (m) {
        result.metrics.matchedRegime.start = parseInt(m[1], 10);
        result.metrics.matchedRegime.end = parseInt(m[2], 10);
      }
    }
    if (line.includes('Dynamic Warping Distance')) {
      const m = line.match(/:\s*([0-9.]+)/);
      if (m) result.metrics.dtwDistance = parseFloat(m[1]);
    }
  }

  // 5. Future Price Projections
  let inFuture = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('FUTURE PRICE PROJECTION')) {
      inFuture = true;
      continue;
    }
    if (inFuture) {
      if (line.includes('Current Latest Price')) {
        const pMatch = line.match(/\(([^)]+)\):\s*\$([0-9.]+)/);
        if (pMatch) {
          result.futureProjections.latestDate = pMatch[1];
          result.futureProjections.latestPrice = parseFloat(pMatch[2]);
        }
      }
      // Line format: "T+1 180.82 +0.120%"
      const rowMatch = line.match(/^(T\+\d+)\s+([0-9.]+)\s+([+-]?[0-9.]+%)/);
      if (rowMatch) {
        result.futureProjections.projections.push({
          step: rowMatch[1],
          price: parseFloat(rowMatch[2]),
          expectedChange: rowMatch[3],
          changePct: parseFloat(rowMatch[3].replace('%', ''))
        });
      }
    }
  }

  return result;
}

/**
 * Executes C++ StockPricePredictor.exe
 */
function executeForecastCpp(csvFilePath, windowSize, forecastHorizon, testSize) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(EXECUTABLE_PATH)) {
      return reject(new Error(`StockPricePredictor executable not found at: ${EXECUTABLE_PATH}`));
    }
    if (!fs.existsSync(csvFilePath)) {
      return reject(new Error(`Dataset CSV file not found at: ${csvFilePath}`));
    }

    const args = [
      csvFilePath,
      String(windowSize || 10),
      String(forecastHorizon || 5),
      String(testSize || 5)
    ];

    const env = Object.assign({}, process.env, {
      PATH: `${ROOT_DIR};${process.env.PATH || ''}`
    });

    execFile(EXECUTABLE_PATH, args, { cwd: ROOT_DIR, env }, (err, stdout, stderr) => {
      if (err) {
        const errorMsg = (stderr && stderr.trim()) || (stdout && stdout.trim()) || err.message;
        return reject(new Error(errorMsg));
      }
      try {
        const parsed = parseCppOutput(stdout);
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Failed to parse C++ forecast output: ${parseErr.message}\nRaw output:\n${stdout}`));
      }
    });
  });
}

/**
 * Handle HTTP Requests
 */
const server = http.createServer((req, res) => {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API 1: Health & System Status
  if (req.method === 'GET' && pathname === '/api/health') {
    const hasBinary = fs.existsSync(EXECUTABLE_PATH);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      cPlusPlusExecutable: hasBinary,
      executablePath: EXECUTABLE_PATH,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // API 2: Get Preset Datasets
  if (req.method === 'GET' && pathname === '/api/presets') {
    const presets = [
      { id: 'default', name: 'Default Sample Data (60D)', filepath: 'data/sample_stock_data.csv', desc: 'Baseline market regime from original repository' },
      { id: 'aapl', name: 'Apple Inc. Growth (90D)', filepath: 'data/preset_aapl_tech.csv', desc: 'Steady tech trend with realistic OHLCV variance' },
      { id: 'nvda', name: 'Nvidia Momentum (75D)', filepath: 'data/preset_nvda_momentum.csv', desc: 'High-volatility semiconductor surge' },
      { id: 'xom', name: 'Exxon Energy Defensive (80D)', filepath: 'data/preset_xom_defensive.csv', desc: 'Range-bound defensive asset with cyclical swings' }
    ];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(presets));
    return;
  }

  // API 2b: Get Specific Dataset
  if (req.method === 'GET' && (pathname === '/api/sample-data' || pathname.startsWith('/api/dataset'))) {
    const targetQuery = parsedUrl.searchParams.get('file') || 'data/sample_stock_data.csv';
    const samplePath = path.isAbsolute(targetQuery) ? targetQuery : path.join(ROOT_DIR, targetQuery);

    if (!fs.existsSync(samplePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `File not found: ${targetQuery}` }));
      return;
    }
    const content = fs.readFileSync(samplePath, 'utf8');
    try {
      const records = parseCSV(content);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        filename: path.basename(samplePath),
        filepath: path.relative(ROOT_DIR, samplePath),
        recordCount: records.length,
        records: records,
        summary: {
          startDate: records[0].date,
          endDate: records[records.length - 1].date,
          latestClose: records[records.length - 1].close,
          minClose: Math.min(...records.map(r => r.close)),
          maxClose: Math.max(...records.map(r => r.close))
        }
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 3: Upload Custom CSV
  if (req.method === 'POST' && pathname === '/api/upload') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Cap at 15MB
      if (body.length > 15 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.filename || !payload.content) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Expected JSON with "filename" and "content" fields.' }));
          return;
        }

        // Validate CSV content and sort chronologically
        const records = parseCSV(payload.content);
        const safeName = `upload_${Date.now()}_${path.basename(payload.filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const targetPath = path.join(UPLOADS_DIR, safeName);
        
        // Write standardized chronological CSV for C++ binary
        const standardizedCsv = serializeToStandardCSV(records);
        fs.writeFileSync(targetPath, standardizedCsv, 'utf8');

        // Relative path for C++ executable
        const relativePath = path.relative(ROOT_DIR, targetPath);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          filename: payload.filename,
          savedPath: relativePath,
          recordCount: records.length,
          records: records,
          summary: {
            startDate: records[0].date,
            endDate: records[records.length - 1].date,
            latestClose: records[records.length - 1].close,
            minClose: Math.min(...records.map(r => r.close)),
            maxClose: Math.max(...records.map(r => r.close))
          }
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 4: Run C++ Forecast
  if (req.method === 'POST' && pathname === '/api/forecast') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const csvPath = payload.csvPath || 'data/sample_stock_data.csv';
        const windowSize = parseInt(payload.windowSize, 10) || 10;
        const forecastHorizon = parseInt(payload.forecastHorizon, 10) || 5;
        const testSize = parseInt(payload.testSize, 10) || 5;

        // Resolve absolute and relative paths
        const fullCsvPath = path.isAbsolute(csvPath) ? csvPath : path.join(ROOT_DIR, csvPath);

        if (!fs.existsSync(fullCsvPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Dataset file not found: ${csvPath}` }));
          return;
        }

        // Parse records for chart synchronization
        const fileContent = fs.readFileSync(fullCsvPath, 'utf8');
        const records = parseCSV(fileContent);

        // Validation against C++ constraints
        if (records.length < windowSize + forecastHorizon) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Insufficient data points: dataset has ${records.length} records, but Window Size (${windowSize}) + Horizon (${forecastHorizon}) requires at least ${windowSize + forecastHorizon}.`
          }));
          return;
        }

        if (records.length < windowSize + forecastHorizon + testSize) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Insufficient data for backtesting: dataset has ${records.length} records, but Window Size (${windowSize}) + Horizon (${forecastHorizon}) + Test Size (${testSize}) requires at least ${windowSize + forecastHorizon + testSize}.`
          }));
          return;
        }

        // Execute C++ application
        const forecastResult = await executeForecastCpp(
          fullCsvPath,
          windowSize,
          forecastHorizon,
          testSize
        );

        // Include historical records so frontend chart aligns perfectly
        forecastResult.historicalRecords = records;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(forecastResult));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve Static Frontend Files
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Security: prevent path traversal out of PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Financial Forecasting Server running at http://localhost:${PORT}`);
    console.log(`C++ Executable bound to: ${EXECUTABLE_PATH}`);
  });
}

module.exports = { server, parseCSV, parseCppOutput, executeForecastCpp };
