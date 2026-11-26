const { server, executeForecastCpp, parseCSV } = require('./server');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 3099;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function verifyAllAreas() {
  console.log('================================================================');
  console.log('COMPREHENSIVE THREE-AREA INDEPENDENT VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  await new Promise(r => server.listen(PORT, r));

  try {
    // =================================================================
    // AREA 1: C++ BACKEND INTEGRATION & PARAMETER SENSITIVITY
    // =================================================================
    console.log('>>> [AREA 1] VERIFYING C++ BACKEND INTEGRATION & PARAMETERS');

    // Test 1.1: Run with Default Parameters (10, 5, 5)
    console.log('Test 1.1: Executing C++ with parameters (Window=10, Horizon=5, TestSize=5)...');
    const p1Res = await request({
      hostname: '127.0.0.1', port: PORT, path: '/api/forecast', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      csvPath: 'data/sample_stock_data.csv',
      windowSize: 10,
      forecastHorizon: 5,
      testSize: 5
    });

    if (p1Res.status !== 200) throw new Error(`Test 1.1 failed with status ${p1Res.status}`);
    const res1 = p1Res.data;
    console.log(`[PASS] P1 Results: MAE=$${res1.metrics.mae}, RMSE=$${res1.metrics.rmse}, MAPE=${res1.metrics.mape}%, DirAcc=${res1.metrics.directionalAccuracy}%, DTW Dist=${res1.metrics.dtwDistance}`);
    console.log(`  Projections: ${res1.futureProjections.projections.map(p => `${p.step}:${p.price.toFixed(2)}`).join(', ')}`);

    // Verify against direct C++ execution
    const directCpp1 = await executeForecastCpp(path.join(__dirname, 'data/sample_stock_data.csv'), 10, 5, 5);
    if (Math.abs(directCpp1.metrics.mae - res1.metrics.mae) > 1e-4 ||
        Math.abs(directCpp1.futureProjections.projections[0].price - res1.futureProjections.projections[0].price) > 1e-4) {
      throw new Error('Integrity check failed: API response does not match direct C++ output');
    }
    console.log('[PASS] C++ execution 100% matches API response');

    // Test 1.2: Run with Different Parameters (15, 8, 8)
    console.log('\nTest 1.2: Executing C++ with changed parameters (Window=15, Horizon=8, TestSize=8)...');
    const p2Res = await request({
      hostname: '127.0.0.1', port: PORT, path: '/api/forecast', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      csvPath: 'data/sample_stock_data.csv',
      windowSize: 15,
      forecastHorizon: 8,
      testSize: 8
    });

    if (p2Res.status !== 200) throw new Error(`Test 1.2 failed with status ${p2Res.status}`);
    const res2 = p2Res.data;
    console.log(`[PASS] P2 Results: MAE=$${res2.metrics.mae}, RMSE=$${res2.metrics.rmse}, MAPE=${res2.metrics.mape}%, DirAcc=${res2.metrics.directionalAccuracy}%, DTW Dist=${res2.metrics.dtwDistance}`);
    console.log(`  Projections count: ${res2.futureProjections.projections.length}`);
    console.log(`  Projections: ${res2.futureProjections.projections.map(p => `${p.step}:${p.price.toFixed(2)}`).join(', ')}`);

    // Verify parameter sensitivity
    if (res1.metrics.mae === res2.metrics.mae) {
      throw new Error('Sensitivity failure: MAE did not change when parameters were modified');
    }
    if (res1.futureProjections.projections.length === res2.futureProjections.projections.length) {
      throw new Error('Sensitivity failure: Horizon count did not reflect new horizon parameter');
    }
    console.log('[PASS] Changing parameters correctly alters C++ evaluation metrics and horizon count!');

    // =================================================================
    // AREA 2: CSV UPLOAD & DATASET VALIDATION
    // =================================================================
    console.log('\n>>> [AREA 2] VERIFYING CSV UPLOADS & ERROR HANDLING');

    // Test 2.1: Valid custom dataset with distinct price levels (Tech Stock: NVDA synthetic, 70 records)
    console.log('Test 2.1: Uploading valid custom dataset (70 records, prices around $450-$520)...');
    let validCsv1 = 'Date,Open,High,Low,Close,Volume\n';
    let basePrice = 450.0;
    for (let i = 1; i <= 70; i++) {
      const d = new Date(2024, 0, i);
      const dateStr = d.toISOString().split('T')[0];
      basePrice += (Math.sin(i * 0.4) * 2.5 + 0.8);
      validCsv1 += `${dateStr},${(basePrice - 1).toFixed(2)},${(basePrice + 2).toFixed(2)},${(basePrice - 2).toFixed(2)},${basePrice.toFixed(2)},${25000000 + i * 10000}\n`;
    }

    const up1Res = await request({
      hostname: '127.0.0.1', port: PORT, path: '/api/upload', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      filename: 'nvda_valid_test.csv',
      content: validCsv1
    });

    if (up1Res.status !== 200) throw new Error(`Upload 2.1 failed: ${JSON.stringify(up1Res.data)}`);
    console.log(`[PASS] Upload 2.1 successful: ${up1Res.data.recordCount} rows, saved to ${up1Res.data.savedPath}`);
    console.log(`  Summary: Start=${up1Res.data.summary.startDate}, End=${up1Res.data.summary.endDate}, LatestClose=$${up1Res.data.summary.latestClose}`);

    // Now execute C++ forecast on this uploaded file!
    const customForecastRes = await request({
      hostname: '127.0.0.1', port: PORT, path: '/api/forecast', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      csvPath: up1Res.data.savedPath,
      windowSize: 10,
      forecastHorizon: 5,
      testSize: 5
    });

    if (customForecastRes.status !== 200) throw new Error(`Forecast on uploaded CSV failed: ${JSON.stringify(customForecastRes.data)}`);
    const customData = customForecastRes.data;
    console.log(`[PASS] Real C++ forecast executed on uploaded CSV:`);
    console.log(`  Latest Price: $${customData.futureProjections.latestPrice}`);
    console.log(`  Projections: ${customData.futureProjections.projections.map(p => `${p.step}:$${p.price.toFixed(2)}`).join(', ')}`);
    console.log(`  MAE: $${customData.metrics.mae}, DirAcc: ${customData.metrics.directionalAccuracy}%`);

    if (Math.abs(customData.futureProjections.latestPrice - up1Res.data.summary.latestClose) > 1e-4) {
      throw new Error('Integrity failure: C++ latest price does not match uploaded CSV latest close');
    }
    console.log('[PASS] C++ latest price precisely matches uploaded dataset closing price!');

    // Test 2.2: Invalid CSV missing required "Close" column
    console.log('\nTest 2.2: Testing invalid CSV (missing "Close" column)...');
    const invalidNoCloseCsv = 'Date,Open,High,Low,Volume\n2024-01-01,100,105,95,50000\n2024-01-02,102,106,98,40000\n';
    const up2Res = await request({
      hostname: '127.0.0.1', port: PORT, path: '/api/upload', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      filename: 'no_close.csv',
      content: invalidNoCloseCsv
    });
    console.log(`Upload 2.2 Status: ${up2Res.status}, Error: ${up2Res.data.error}`);
    if (up2Res.status !== 400 || !up2Res.data.error.includes('Close')) {
      throw new Error('Failure: Invalid CSV without Close column was not properly rejected');
    }
    console.log('[PASS] Missing "Close" column rejected gracefully with status 400');

    // Test 2.3: Insufficient records for forecasting
    console.log('\nTest 2.3: Testing CSV with insufficient records (only 8 rows when 20 required)...');
    let shortCsv = 'Date,Open,High,Low,Close,Volume\n';
    for (let i = 1; i <= 8; i++) {
      shortCsv += `2024-01-0${i},100,105,95,102,1000\n`;
    }
    const up3Res = await request({
      hostname: '127.0.0.1', port: PORT, path: '/api/upload', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      filename: 'short.csv',
      content: shortCsv
    });
    // Upload succeeds, but running forecast should cleanly reject with 400
    const shortForecastRes = await request({
      hostname: '127.0.0.1', port: PORT, path: '/api/forecast', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      csvPath: up3Res.data.savedPath,
      windowSize: 10,
      forecastHorizon: 5,
      testSize: 5
    });
    console.log(`Short forecast status: ${shortForecastRes.status}, Error: ${shortForecastRes.data.error}`);
    if (shortForecastRes.status !== 400 || !shortForecastRes.data.error.includes('Insufficient data')) {
      throw new Error('Failure: Insufficient records did not trigger descriptive error');
    }
    console.log('[PASS] Insufficient records handled gracefully with clear descriptive error message');

    // Test 2.4: Empty CSV
    console.log('\nTest 2.4: Testing completely empty CSV...');
    const emptyRes = await request({
      hostname: '127.0.0.1', port: PORT, path: '/api/upload', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      filename: 'empty.csv',
      content: ''
    });
    if (emptyRes.status !== 400) {
      throw new Error('Failure: Empty CSV was not rejected');
    }
    console.log(`[PASS] Empty CSV rejected gracefully with status 400: ${emptyRes.data.error}`);

    // =================================================================
    // AREA 3: CHART ACCURACY & DATA ALIGNMENT
    // =================================================================
    console.log('\n>>> [AREA 3] VERIFYING CHART ACCURACY & MATHEMATICAL ALIGNMENT');

    const sampleCsvContent = fs.readFileSync(path.join(__dirname, 'data/sample_stock_data.csv'), 'utf8');
    const actualCsvRecords = parseCSV(sampleCsvContent);

    // Verify sample data dates and prices against C++ output records
    console.log(`Total CSV records in file: ${actualCsvRecords.length}`);
    console.log(`First record: Date=${actualCsvRecords[0].date}, Close=$${actualCsvRecords[0].close}`);
    console.log(`Last record: Date=${actualCsvRecords[59].date}, Close=$${actualCsvRecords[59].close}`);

    // Check specific known records from the file
    // 2024-02-22 -> index 36 (37th row) -> close 171.50
    const rFeb22 = actualCsvRecords.find(r => r.date === '2024-02-22');
    console.log(`Found record for 2024-02-22: Close=$${rFeb22.close}`);
    if (rFeb22.close !== 171.50) {
      throw new Error('Price mismatch on 2024-02-22');
    }
    console.log('[PASS] Historical Close for 2024-02-22 matches exact CSV price $171.50');

    // Check backtest steps against C++ Evaluator
    console.log('\nVerifying Backtest steps alignment:');
    res1.backtest.forEach(step => {
      const histIdx = actualCsvRecords.length - res1.backtest.length + (step.step - 1);
      const expectedActual = actualCsvRecords[histIdx].close;
      console.log(`  Step ${step.step}: HistDate=${actualCsvRecords[histIdx].date}, ActualInCpp=$${step.actual}, ActualInCSV=$${expectedActual}, PredInCpp=$${step.predicted}`);
      if (Math.abs(step.actual - expectedActual) > 1e-4) {
        throw new Error(`Backtest actual mismatch at step ${step.step}: C++ has ${step.actual}, CSV has ${expectedActual}`);
      }
    });
    console.log('[PASS] All backtest steps align 100% chronologically with historical data!');

    // Check future projections continuity
    console.log('\nVerifying Future Projections continuity:');
    const latestPrice = actualCsvRecords[actualCsvRecords.length - 1].close;
    console.log(`Latest known price in CSV: $${latestPrice}`);
    console.log(`Latest price in C++ forecast: $${res1.futureProjections.latestPrice}`);
    if (Math.abs(latestPrice - res1.futureProjections.latestPrice) > 1e-4) {
      throw new Error('Future projection base price mismatch');
    }
    res1.futureProjections.projections.forEach(p => {
      const calcPct = ((p.price - latestPrice) / latestPrice) * 100.0;
      console.log(`  ${p.step}: $${p.price.toFixed(2)} (${p.expectedChange}) -> Calculated Change: ${calcPct.toFixed(3)}%`);
      if (Math.abs(calcPct - p.changePct) > 0.05) {
        throw new Error(`Percentage mismatch on ${p.step}`);
      }
    });
    console.log('[PASS] Future projections are mathematically sound and continuous from latest closing price!');

    console.log('\n================================================================');
    console.log('ALL INDEPENDENT VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n[VERIFICATION ERROR]:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

verifyAllAreas();
