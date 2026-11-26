const fs = require('fs');
const path = require('path');

function generateDatasets() {
  const dataDir = path.join(__dirname, 'data');

  // Preset 1: Apple Inc. Tech Growth (90 days, $165 to $195)
  let aaplCsv = 'Date,Open,High,Low,Close,Volume\n';
  let p = 168.50;
  const startDate = new Date(2023, 9, 2); // Oct 2, 2023
  let tradingDays = 0;
  let cur = new Date(startDate);

  while (tradingDays < 90) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
      tradingDays++;
      const change = (Math.sin(tradingDays * 0.15) * 1.8 + Math.cos(tradingDays * 0.3) * 1.2 + 0.3);
      const open = p + (Math.random() * 0.8 - 0.4);
      p = Math.max(150, p + change);
      const high = Math.max(open, p) + Math.random() * 1.5 + 0.5;
      const low = Math.min(open, p) - Math.random() * 1.5 - 0.5;
      const vol = Math.floor(45000000 + Math.random() * 25000000);
      const dStr = cur.toISOString().split('T')[0];
      aaplCsv += `${dStr},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${p.toFixed(2)},${vol}\n`;
    }
    cur.setDate(cur.getDate() + 1);
  }
  fs.writeFileSync(path.join(dataDir, 'preset_aapl_tech.csv'), aaplCsv, 'utf8');

  // Preset 2: Nvidia High Volatility / Momentum (75 days, $420 to $530)
  let nvdaCsv = 'Date,Open,High,Low,Close,Volume\n';
  let np = 425.00;
  tradingDays = 0;
  cur = new Date(2023, 10, 15);

  while (tradingDays < 75) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
      tradingDays++;
      const change = (Math.sin(tradingDays * 0.22) * 5.5 + Math.cos(tradingDays * 0.1) * 3.2 + 1.4);
      const open = np + (Math.random() * 2.5 - 1.2);
      np = Math.max(380, np + change);
      const high = Math.max(open, np) + Math.random() * 4.0 + 1.0;
      const low = Math.min(open, np) - Math.random() * 4.0 - 1.0;
      const vol = Math.floor(35000000 + Math.random() * 30000000);
      const dStr = cur.toISOString().split('T')[0];
      nvdaCsv += `${dStr},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${np.toFixed(2)},${vol}\n`;
    }
    cur.setDate(cur.getDate() + 1);
  }
  fs.writeFileSync(path.join(dataDir, 'preset_nvda_momentum.csv'), nvdaCsv, 'utf8');

  // Preset 3: Energy / Defensive Steady Market (80 days, $98 to $115)
  let xomCsv = 'Date,Open,High,Low,Close,Volume\n';
  let xp = 104.00;
  tradingDays = 0;
  cur = new Date(2023, 11, 1);

  while (tradingDays < 80) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
      tradingDays++;
      const change = (Math.sin(tradingDays * 0.12) * 0.9 + Math.cos(tradingDays * 0.25) * 0.7 - 0.05);
      const open = xp + (Math.random() * 0.6 - 0.3);
      xp = Math.max(90, xp + change);
      const high = Math.max(open, xp) + Math.random() * 0.9 + 0.3;
      const low = Math.min(open, xp) - Math.random() * 0.9 - 0.3;
      const vol = Math.floor(18000000 + Math.random() * 12000000);
      const dStr = cur.toISOString().split('T')[0];
      xomCsv += `${dStr},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${xp.toFixed(2)},${vol}\n`;
    }
    cur.setDate(cur.getDate() + 1);
  }
  fs.writeFileSync(path.join(dataDir, 'preset_xom_defensive.csv'), xomCsv, 'utf8');

  console.log('Generated preset datasets in data/ folder.');
}

generateDatasets();
