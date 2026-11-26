const { server } = require('./server');
const http = require('http');

const TEST_PORT = 3055;

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runE2ETests() {
  console.log('Starting In-Process E2E Server Tests on port', TEST_PORT);

  await new Promise(resolve => server.listen(TEST_PORT, resolve));

  try {
    // 1. Test /api/health
    console.log('Testing GET /api/health...');
    const healthRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/health',
      method: 'GET'
    });
    console.log('Health status code:', healthRes.statusCode);
    const health = JSON.parse(healthRes.body);
    console.log('Health body:', health);
    if (healthRes.statusCode !== 200 || !health.cPlusPlusExecutable) {
      throw new Error('Health check failed');
    }
    console.log('[PASS] GET /api/health');

    // 2. Test /api/sample-data
    console.log('Testing GET /api/sample-data...');
    const sampleRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/sample-data',
      method: 'GET'
    });
    console.log('Sample data status code:', sampleRes.statusCode);
    const sample = JSON.parse(sampleRes.body);
    console.log(`Sample records loaded: ${sample.recordCount}, latestClose: ${sample.summary.latestClose}`);
    if (sampleRes.statusCode !== 200 || sample.recordCount !== 60) {
      throw new Error('Sample data endpoint failed');
    }
    console.log('[PASS] GET /api/sample-data');

    // 3. Test POST /api/forecast (Executing Real C++ StockPricePredictor.exe)
    console.log('Testing POST /api/forecast with C++ execution...');
    const forecastPayload = JSON.stringify({
      csvPath: 'data/sample_stock_data.csv',
      windowSize: 10,
      forecastHorizon: 5,
      testSize: 5
    });
    const forecastRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/forecast',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(forecastPayload)
      }
    }, forecastPayload);

    console.log('Forecast status code:', forecastRes.statusCode);
    const forecast = JSON.parse(forecastRes.body);
    console.log(`Forecast MAE: $${forecast.metrics.mae}, Directional Acc: ${forecast.metrics.directionalAccuracy}%`);
    console.log(`Projected Horizon days: ${forecast.futureProjections.projections.length}`);
    console.log(`Historical records attached: ${forecast.historicalRecords.length}`);
    if (forecastRes.statusCode !== 200 || forecast.metrics.sampleCount !== 5 || forecast.futureProjections.projections.length !== 5) {
      throw new Error('Forecast execution check failed');
    }
    console.log('[PASS] POST /api/forecast');

    // 4. Test POST /api/upload (Validating CSV upload workflow)
    console.log('Testing POST /api/upload...');
    const testCsv = "Date,Open,High,Low,Close,Volume\n2024-05-01,100,105,95,102,1000\n2024-05-02,102,107,101,106,1200\n2024-05-03,106,108,104,107,1100";
    const uploadPayload = JSON.stringify({
      filename: 'custom_test.csv',
      content: testCsv
    });
    const uploadRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(uploadPayload)
      }
    }, uploadPayload);
    console.log('Upload status code:', uploadRes.statusCode);
    const upload = JSON.parse(uploadRes.body);
    console.log(`Uploaded rows: ${upload.recordCount}, saved to: ${upload.savedPath}`);
    if (uploadRes.statusCode !== 200 || upload.recordCount !== 3) {
      throw new Error('Upload endpoint failed');
    }
    console.log('[PASS] POST /api/upload');

    // 5. Test Static Files (GET / and GET /js/app.js and GET /css/styles.css)
    console.log('Testing GET / (index.html)...');
    const indexRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/',
      method: 'GET'
    });
    console.log(`Index status: ${indexRes.statusCode}, bytes: ${indexRes.body.length}`);
    if (indexRes.statusCode !== 200 || !indexRes.body.includes('Financial Forecasting System')) {
      throw new Error('Index.html serving failed');
    }
    console.log('[PASS] Static index.html');

    console.log('\n=========================================');
    console.log('ALL E2E SERVER & API TESTS PASSED 100%!');
    console.log('=========================================');
  } catch (err) {
    console.error('[FAIL] Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runE2ETests();
