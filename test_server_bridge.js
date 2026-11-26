const { executeForecastCpp, parseCSV } = require('./server');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('Testing C++ Bridge Integration...');
  const samplePath = path.join(__dirname, 'data', 'sample_stock_data.csv');
  
  try {
    const content = fs.readFileSync(samplePath, 'utf8');
    const records = parseCSV(content);
    console.log(`[PASS] CSV parsing: read ${records.length} records successfully.`);

    const res = await executeForecastCpp(samplePath, 10, 5, 5);
    console.log('[PASS] C++ execution completed successfully!');
    console.log(`- Loaded records reported by C++: ${res.recordsCount}`);
    console.log(`- Date range: ${res.dateRange.start} to ${res.dateRange.end}`);
    console.log(`- Window size: ${res.parameters.windowSize}, Horizon: ${res.parameters.forecastHorizon}`);
    console.log(`- Backtest steps evaluated: ${res.backtest.length}`);
    console.log(`- Performance Metrics: MAE=$${res.metrics.mae}, MAPE=${res.metrics.mape}%, RMSE=$${res.metrics.rmse}, Directional=${res.metrics.directionalAccuracy}%`);
    console.log(`- Matched Regime: Index [${res.metrics.matchedRegime.start} .. ${res.metrics.matchedRegime.end}], DTW Dist: ${res.metrics.dtwDistance}`);
    console.log(`- Future Projections count: ${res.futureProjections.projections.length}`);
    console.log(`- Latest Price: $${res.futureProjections.latestPrice} on ${res.futureProjections.latestDate}`);
    res.futureProjections.projections.forEach(p => {
      console.log(`  * ${p.step}: $${p.price.toFixed(2)} (${p.expectedChange})`);
    });
    console.log(`- DP Table Demo Matrix rows: ${res.dpTableDemo.dpMatrix.length}`);

    if (res.metrics.mae <= 0 || res.metrics.sampleCount !== 5 || res.futureProjections.projections.length !== 5) {
      throw new Error('Integrity check failed: missing expected values in parsed C++ output');
    }
    console.log('\nALL C++ INTEGRATION TESTS PASSED 100%!');
  } catch (err) {
    console.error('[FAIL] Error:', err);
    process.exit(1);
  }
}

runTest();
