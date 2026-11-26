/**
 * Financial Forecasting System - Web Interface Controller
 * Integrates directly with real C++ Dynamic Programming (DTW) Engine
 */

// Application State
const state = {
  currentCsvPath: 'data/sample_stock_data.csv',
  currentFilename: 'sample_stock_data.csv',
  parameters: {
    windowSize: 10,
    forecastHorizon: 5,
    testSize: 5,
    kNearest: 3
  },
  forecastData: null,
  chartInstance: null,
  chartRange: 'all',
  showValidationCurve: true,
  isPriceHidden: false,
  pendingUploadFile: null
};

// DOM Elements
const elements = {
  // Navigation & Modals
  navOverviewBtn: document.getElementById('nav-overview-btn'),
  navChartBtn: document.getElementById('nav-chart-btn'),
  navBacktestBtn: document.getElementById('nav-backtest-btn'),
  navDtwBtn: document.getElementById('nav-dtw-btn'),
  openParamsModalBtn: document.getElementById('open-params-modal-btn'),
  quickSettingsBtn: document.getElementById('quick-settings-btn'),
  closeParamsModalBtn: document.getElementById('close-params-modal-btn'),
  paramsModal: document.getElementById('params-modal'),
  openUploadModalBtn: document.getElementById('open-upload-modal-btn'),
  closeUploadModalBtn: document.getElementById('close-upload-modal-btn'),
  cancelUploadBtn: document.getElementById('cancel-upload-btn'),
  uploadModal: document.getElementById('upload-modal'),
  closeDtwModalBtn: document.getElementById('close-dtw-modal-btn'),
  closeDtwBtn2: document.getElementById('close-dtw-btn-2'),
  dtwModal: document.getElementById('dtw-modal'),
  toastContainer: document.getElementById('toast-container'),

  // Hero Card Left
  heroLatestPrice: document.getElementById('hero-latest-price'),
  togglePricePrivacyBtn: document.getElementById('toggle-price-privacy-btn'),
  currentFilenameLabel: document.getElementById('current-filename-label'),
  accountNumberDisplay: document.getElementById('account-number-display'),
  copyDatasetBtn: document.getElementById('copy-dataset-btn'),
  runForecastBtn: document.getElementById('run-forecast-btn'),
  forecastBtnIcon: document.getElementById('forecast-btn-icon'),
  forecastBtnSpinner: document.getElementById('forecast-btn-spinner'),
  scrollToProjectionsBtn: document.getElementById('scroll-to-projections-btn'),

  // Hero Card Right (Priority / Rewards)
  heroRewardPrice: document.getElementById('hero-reward-price'),
  heroRewardPill: document.getElementById('hero-reward-pill'),
  delibixPointsVal: document.getElementById('delibix-points-val'),
  voucherRegimeVal: document.getElementById('voucher-regime-val'),

  // Lower Left Card (Spending / Model Evaluation)
  spendingPeriodPill: document.getElementById('spending-period-pill'),
  gaugeCenterVal: document.getElementById('gauge-center-val'),
  gaugeSubPill: document.getElementById('gauge-sub-pill'),
  gaugeArcLime: document.getElementById('gauge-arc-lime'),
  spendingAlertPct: document.getElementById('spending-alert-pct'),
  metricMaeVal: document.getElementById('metric-mae-val'),
  metricRmseVal: document.getElementById('metric-rmse-val'),
  metricMapeVal: document.getElementById('metric-mape-val'),
  metricDirVal: document.getElementById('metric-dir-val'),

  // Lower Middle Card (Earning / Horizon Projections)
  earningTargetBadge: document.getElementById('earning-target-badge'),
  earningMainVal: document.getElementById('earning-main-val'),
  earningSubPct: document.getElementById('earning-sub-pct'),
  projectionsProgressList: document.getElementById('projections-progress-list'),

  // Lower Right Card (Transactions / Stock Records)
  recentTransactionsList: document.getElementById('recent-transactions-list'),
  txBannerTitle: document.getElementById('tx-banner-title'),
  txBannerSub: document.getElementById('tx-banner-sub'),

  // Chart Section
  chartCanvas: document.getElementById('financialChart'),
  chartSection: document.getElementById('chart-section'),
  chartRangeBtns: document.querySelectorAll('.chart-range-btn'),
  toggleBacktestCurveBtn: document.getElementById('toggle-backtest-curve-btn'),
  chartDataPointsCount: document.getElementById('chart-data-points-count'),

  // Parameters Inputs
  windowSizeInput: document.getElementById('window-size-input'),
  windowSizeVal: document.getElementById('window-size-val'),
  forecastHorizonInput: document.getElementById('forecast-horizon-input'),
  forecastHorizonVal: document.getElementById('forecast-horizon-val'),
  testSizeInput: document.getElementById('test-size-input'),
  testSizeVal: document.getElementById('test-size-val'),
  kNearestInput: document.getElementById('k-nearest-input'),
  kNearestVal: document.getElementById('k-nearest-val'),
  resetParamsBtn: document.getElementById('reset-params-btn'),
  saveParamsBtn: document.getElementById('save-params-btn'),

  // Upload Elements
  csvDropzone: document.getElementById('csv-dropzone'),
  csvFileInput: document.getElementById('csv-file-input'),
  uploadStatusBox: document.getElementById('upload-status-box'),
  confirmUploadBtn: document.getElementById('confirm-upload-btn'),
  loadSampleBtn: document.getElementById('load-sample-btn'),

  // DTW Demonstration Elements
  dtwQuerySeq: document.getElementById('dtw-query-seq'),
  dtwTargetSeq: document.getElementById('dtw-target-seq'),
  dtwMatrixTable: document.getElementById('dtw-matrix-table'),
  dtwOptimalDistVal: document.getElementById('dtw-optimal-dist-val')
};

// UI Notification Toast
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-[#0D2B1D] text-white border-l-4 border-[#B4F73C]',
    error: 'bg-rose-900 text-white border-l-4 border-rose-500',
    info: 'bg-gray-900 text-white border-l-4 border-blue-400',
    warning: 'bg-amber-900 text-white border-l-4 border-amber-400'
  };

  toast.className = `p-4 rounded-xl shadow-lg text-xs font-medium flex items-center space-x-2 transition-all transform translate-y-2 opacity-0 pointer-events-auto max-w-sm ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <span class="font-bold">${type.toUpperCase()}:</span>
    <span>${message}</span>
  `;

  elements.toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  // Auto remove
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/**
 * Format USD Currency
 */
function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Fetch and Run Real C++ Forecast from Backend
 */
async function runForecast() {
  setLoadingState(true);

  try {
    const payload = {
      csvPath: state.currentCsvPath,
      windowSize: state.parameters.windowSize,
      forecastHorizon: state.parameters.forecastHorizon,
      testSize: state.parameters.testSize,
      kNearest: state.parameters.kNearest
    };

    const response = await fetch('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to execute C++ forecast');
    }

    state.forecastData = data;
    renderDashboard(data);
    showToast(`C++ forecast completed: ${data.futureProjections.projections.length} forward days projected`, 'success');
  } catch (err) {
    console.error('Forecast execution error:', err);
    showToast(err.message, 'error');
  } finally {
    setLoadingState(false);
  }
}

/**
 * Toggle Loading State on UI Controls
 */
function setLoadingState(isLoading) {
  if (isLoading) {
    elements.forecastBtnIcon.classList.add('hidden');
    elements.forecastBtnSpinner.classList.remove('hidden');
    elements.runForecastBtn.disabled = true;
    elements.runForecastBtn.classList.add('opacity-80', 'cursor-not-allowed');
  } else {
    elements.forecastBtnIcon.classList.remove('hidden');
    elements.forecastBtnSpinner.classList.add('hidden');
    elements.runForecastBtn.disabled = false;
    elements.runForecastBtn.classList.remove('opacity-80', 'cursor-not-allowed');
  }
}

/**
 * Render Complete Dashboard with Real C++ Output
 */
function renderDashboard(data) {
  const latestPrice = data.futureProjections.latestPrice;
  const projections = data.futureProjections.projections;
  const metrics = data.metrics;
  const records = data.historicalRecords || [];

  // 1. Hero Left Card
  elements.currentFilenameLabel.textContent = state.currentFilename;
  if (state.isPriceHidden) {
    elements.heroLatestPrice.textContent = '$••••••';
  } else {
    elements.heroLatestPrice.textContent = formatCurrency(latestPrice);
  }
  elements.accountNumberDisplay.textContent = state.currentFilename.includes('sample') ? '90340222748' : `DATA-${records.length}REC`;

  // 2. Hero Right Card (Priority / Rewards Highlight)
  if (projections.length > 0) {
    const finalProj = projections[projections.length - 1];
    elements.heroRewardPrice.textContent = formatCurrency(finalProj.price);
    const sign = finalProj.changePct >= 0 ? '+' : '';
    elements.heroRewardPill.textContent = `${sign}${finalProj.changePct.toFixed(2)}% (${projections.length}D Horizon)`;
  } else {
    elements.heroRewardPrice.textContent = formatCurrency(latestPrice);
    elements.heroRewardPill.textContent = '+0.00%';
  }
  elements.delibixPointsVal.textContent = metrics.dtwDistance.toFixed(4);
  elements.voucherRegimeVal.textContent = `Idx [${metrics.matchedRegime.start}..${metrics.matchedRegime.end}]`;

  // 3. Lower Left Card (Model Evaluation / Spending Gauge)
  elements.spendingPeriodPill.textContent = data.dateRange.end || 'Evaluation';
  elements.gaugeCenterVal.textContent = `${metrics.directionalAccuracy.toFixed(1)}%`;
  elements.gaugeSubPill.textContent = `MAE ${formatCurrency(metrics.mae)}`;

  // Circular Gauge Stroke (Circumference: 2 * PI * 42 ≈ 264)
  const accuracyPct = Math.min(100, Math.max(0, metrics.directionalAccuracy));
  const offset = 264 - (264 * accuracyPct / 100);
  elements.gaugeArcLime.setAttribute('stroke-dashoffset', offset);

  elements.spendingAlertPct.textContent = `${metrics.mape.toFixed(2)}% MAPE`;
  elements.metricMaeVal.textContent = formatCurrency(metrics.mae);
  elements.metricRmseVal.textContent = formatCurrency(metrics.rmse);
  elements.metricMapeVal.textContent = `${metrics.mape.toFixed(2)}%`;
  elements.metricDirVal.textContent = `${metrics.directionalAccuracy.toFixed(1)}%`;

  // 4. Lower Middle Card (Horizon Projections / Earning)
  if (projections.length > 0) {
    const topProj = projections[projections.length - 1];
    elements.earningTargetBadge.textContent = formatCurrency(topProj.price);
    elements.earningMainVal.textContent = formatCurrency(topProj.price);
    const changeSign = topProj.changePct >= 0 ? '+' : '';
    elements.earningSubPct.textContent = `${changeSign}${topProj.changePct.toFixed(2)}%`;
    renderProjectionsProgressList(projections);
  }

  // 5. Lower Right Card (Recent Records / Transactions)
  elements.txBannerTitle.textContent = `${state.currentFilename} (${records.length} records)`;
  elements.txBannerSub.textContent = `Range: ${data.dateRange.start} to ${data.dateRange.end}`;
  renderRecentRecords(records);

  // 6. DTW Modal Data
  elements.dtwQuerySeq.textContent = data.dpTableDemo.querySequence.join(', ');
  elements.dtwTargetSeq.textContent = data.dpTableDemo.targetSequence.join(', ');
  elements.dtwOptimalDistVal.textContent = data.dpTableDemo.optimalDistance.toFixed(4);
  renderDtwMatrix(data.dpTableDemo.dpMatrix);

  // 7. Interactive Chart.js Graph
  renderChart(records, projections, data.backtest);
}

/**
 * Render Horizon Progress Rows in Lower Middle Card
 */
function renderProjectionsProgressList(projections) {
  elements.projectionsProgressList.innerHTML = '';
  const maxPrice = Math.max(...projections.map(p => p.price));
  const minPrice = Math.min(...projections.map(p => p.price));
  const range = maxPrice - minPrice || 1;

  projections.forEach((p, idx) => {
    const isHighlight = idx === projections.length - 1;
    const progressWidth = Math.min(100, Math.max(15, Math.round(((p.price - minPrice) / range) * 85 + 15)));

    const row = document.createElement('div');
    row.innerHTML = `
      <div class="flex justify-between items-center text-xs font-medium text-gray-500 mb-1">
        <div class="flex items-center space-x-2">
          <span class="${isHighlight ? 'text-gray-900 font-bold' : 'text-gray-700'}">${p.step} Projection</span>
          <span class="${isHighlight ? 'bg-[#0D2B1D] text-[#B4F73C]' : 'bg-gray-100 text-gray-700'} text-[10px] font-bold px-2 py-0.2 rounded-full">
            ${p.expectedChange}
          </span>
        </div>
        <span class="font-semibold text-gray-800">${formatCurrency(p.price)}</span>
      </div>
      <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div class="${isHighlight ? 'bg-[#B4F73C]' : 'bg-gray-300'} h-full rounded-full transition-all duration-500" style="width: ${progressWidth}%"></div>
      </div>
    `;
    elements.projectionsProgressList.appendChild(row);
  });
}

/**
 * Render Recent Stock Records in Lower Right Card
 */
function renderRecentRecords(records) {
  elements.recentTransactionsList.innerHTML = '';
  // Show most recent 6 records in reverse chronological order
  const recentSlice = records.slice(-6).reverse();

  recentSlice.forEach((r, idx) => {
    const prevRecord = records[records.length - 1 - idx - 1];
    const diff = prevRecord ? r.close - prevRecord.close : 0;
    const diffSign = diff >= 0 ? '+' : '';
    const diffClass = diff >= 0 ? 'text-emerald-600' : 'text-rose-500';

    const item = document.createElement('div');
    item.className = 'flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0';
    item.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-xs">
          ${r.date.slice(-2)}
        </div>
        <div>
          <div class="font-bold text-gray-900">${formatCurrency(r.close)}</div>
          <div class="text-[10px] text-gray-400 font-mono-code">${r.date} • Vol: ${(r.volume / 1000000).toFixed(1)}M</div>
        </div>
      </div>
      <span class="font-bold ${diffClass}">${diffSign}${formatCurrency(diff)}</span>
    `;
    elements.recentTransactionsList.appendChild(item);
  });
}

/**
 * Render DTW Matrix Table in Modal
 */
function renderDtwMatrix(matrix) {
  if (!matrix || matrix.length === 0) {
    elements.dtwMatrixTable.innerHTML = '<tr><td class="p-4 text-gray-400">No DP matrix data available</td></tr>';
    return;
  }

  let html = '<thead><tr class="bg-gray-100 text-gray-700 font-semibold">';
  html += '<th class="p-2 border border-gray-200">i \\ j</th>';
  for (let j = 0; j < matrix[0].length; j++) {
    html += `<th class="p-2 border border-gray-200 font-mono">j=${j}</th>`;
  }
  html += '</tr></thead><tbody>';

  matrix.forEach((row, i) => {
    html += `<tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}">`;
    html += `<td class="p-2 font-mono font-bold border border-gray-200 text-gray-600">i=${i}</td>`;
    row.forEach(cell => {
      const isInf = cell === 'INF' || cell === 'inf';
      const cellClass = isInf ? 'text-gray-300' : 'text-emerald-700 font-semibold';
      html += `<td class="p-2 border border-gray-200 font-mono ${cellClass}">${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';

  elements.dtwMatrixTable.innerHTML = html;
}

/**
 * Render Financial Time-Series Chart using Chart.js
 */
function renderChart(historicalRecords, projections, backtest) {
  if (!historicalRecords || historicalRecords.length === 0) return;

  // Filter based on selected range
  let records = historicalRecords;
  if (state.chartRange === '60') records = historicalRecords.slice(-60);
  else if (state.chartRange === '30') records = historicalRecords.slice(-30);
  else if (state.chartRange === '15') records = historicalRecords.slice(-15);

  elements.chartDataPointsCount.textContent = `${records.length} historical + ${projections.length} projected`;

  // Build unified timeline
  const labels = [];
  const historicalSeries = [];
  const projectionSeries = [];
  const backtestSeries = [];

  // Historical points
  records.forEach(r => {
    labels.push(r.date);
    historicalSeries.push(r.close);
    projectionSeries.push(null);
    backtestSeries.push(null);
  });

  // Future projections point starting from the last historical point
  if (projections && projections.length > 0 && records.length > 0) {
    const lastHistIdx = records.length - 1;
    projectionSeries[lastHistIdx] = records[lastHistIdx].close; // Connect lines seamlessly

    // Calculate future dates or labels
    const lastDate = new Date(records[lastHistIdx].date);
    projections.forEach((p, idx) => {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + (idx + 1));
      const dateLabel = isNaN(nextDate.getTime()) ? p.step : nextDate.toISOString().split('T')[0];
      
      labels.push(`${p.step} (${dateLabel})`);
      historicalSeries.push(null);
      projectionSeries.push(p.price);
      backtestSeries.push(null);
    });
  }

  // Backtest validation predictions
  if (state.showValidationCurve && backtest && backtest.length > 0) {
    const testSize = backtest.length;
    const trainEndIdx = records.length - testSize;

    if (trainEndIdx >= 0) {
      backtest.forEach((b, idx) => {
        const targetIdx = trainEndIdx + idx;
        if (targetIdx < historicalSeries.length) {
          backtestSeries[targetIdx] = b.predicted;
        }
      });
    }
  }

  // Destroy previous chart instance if exists
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  const ctx = elements.chartCanvas.getContext('2d');

  // Gradient fill for historical data
  const gradientFill = ctx.createLinearGradient(0, 0, 0, 350);
  gradientFill.addColorStop(0, 'rgba(17, 24, 39, 0.08)');
  gradientFill.addColorStop(1, 'rgba(17, 24, 39, 0.00)');

  // Gradient fill for projected data
  const projGradient = ctx.createLinearGradient(0, 0, 0, 350);
  projGradient.addColorStop(0, 'rgba(180, 247, 60, 0.25)');
  projGradient.addColorStop(1, 'rgba(180, 247, 60, 0.00)');

  state.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Historical Close ($)',
          data: historicalSeries,
          borderColor: '#111827',
          backgroundColor: gradientFill,
          borderWidth: 2.2,
          fill: true,
          tension: 0.25,
          pointRadius: records.length > 40 ? 0 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#111827',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2
        },
        {
          label: 'Future C++ Forecast ($)',
          data: projectionSeries,
          borderColor: '#9AE61C',
          backgroundColor: projGradient,
          borderWidth: 3,
          borderDash: [0, 0],
          fill: true,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#B4F73C',
          pointBorderColor: '#0D2B1D',
          pointBorderWidth: 2
        },
        {
          label: 'Backtest Validation ($)',
          data: backtestSeries,
          borderColor: '#F59E0B',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 4],
          fill: false,
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#F59E0B',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          hidden: !state.showValidationCurve
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(13, 43, 29, 0.95)',
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
          padding: 12,
          cornerRadius: 12,
          borderColor: 'rgba(180, 247, 60, 0.3)',
          borderWidth: 1,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              if (val === null || val === undefined) return null;
              return `${context.dataset.label}: ${formatCurrency(val)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            maxTicksLimit: 10,
            font: { family: 'Plus Jakarta Sans', size: 11 },
            color: '#9CA3AF'
          }
        },
        y: {
          grid: {
            color: 'rgba(243, 244, 246, 0.8)',
            drawBorder: false
          },
          ticks: {
            callback: value => '$' + value,
            font: { family: 'Plus Jakarta Sans', size: 11 },
            color: '#9CA3AF'
          }
        }
      }
    }
  });
}

/**
 * Handle CSV File Selection and Validation
 */
function handleFileSelection(file) {
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Invalid file format. Please upload a .csv file.', 'error');
    return;
  }

  state.pendingUploadFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    const content = e.target.result;
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length < 2) {
      elements.uploadStatusBox.className = 'p-3 rounded-xl text-xs bg-rose-50 text-rose-700 border border-rose-200 block';
      elements.uploadStatusBox.textContent = 'CSV is empty or missing data rows.';
      elements.confirmUploadBtn.disabled = true;
      elements.confirmUploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
      return;
    }

    const headers = lines[0].toLowerCase();
    if (!headers.includes('close')) {
      elements.uploadStatusBox.className = 'p-3 rounded-xl text-xs bg-rose-50 text-rose-700 border border-rose-200 block';
      elements.uploadStatusBox.textContent = 'CSV missing required "Close" column header.';
      elements.confirmUploadBtn.disabled = true;
      elements.confirmUploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
      return;
    }

    // Success preview
    elements.uploadStatusBox.className = 'p-3 rounded-xl text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 block';
    elements.uploadStatusBox.innerHTML = `
      <strong>Valid CSV selected:</strong> ${file.name} (${lines.length - 1} records detected).
      Ready to upload and run C++ forecasting.
    `;
    elements.confirmUploadBtn.disabled = false;
    elements.confirmUploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  };

  reader.readAsText(file);
}

/**
 * Upload Validated CSV to Backend
 */
async function uploadAndApplyCSV() {
  if (!state.pendingUploadFile) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const content = e.target.result;
    try {
      elements.confirmUploadBtn.textContent = 'Uploading...';
      elements.confirmUploadBtn.disabled = true;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: state.pendingUploadFile.name,
          content: content
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to upload CSV');
      }

      state.currentCsvPath = resData.savedPath;
      state.currentFilename = resData.filename;

      elements.uploadModal.classList.add('hidden');
      showToast(`Uploaded ${resData.filename} (${resData.recordCount} rows). Running forecast...`, 'success');

      // Automatically execute C++ forecast on new data
      await runForecast();
    } catch (err) {
      console.error('Upload error:', err);
      showToast(err.message, 'error');
    } finally {
      elements.confirmUploadBtn.textContent = 'Upload & Validate';
      elements.confirmUploadBtn.disabled = false;
    }
  };

  reader.readAsText(state.pendingUploadFile);
}

/**
 * Attach Event Listeners
 */
function setupEventListeners() {
  // 1. Forecast Trigger Buttons
  elements.runForecastBtn.addEventListener('click', runForecast);

  // 2. Navigation Tab Buttons
  elements.navOverviewBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  elements.navChartBtn.addEventListener('click', () => {
    elements.chartSection.scrollIntoView({ behavior: 'smooth' });
  });
  elements.navBacktestBtn.addEventListener('click', () => {
    state.showValidationCurve = true;
    elements.toggleBacktestCurveBtn.textContent = 'Validation: On';
    elements.toggleBacktestCurveBtn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100 transition';
    elements.chartSection.scrollIntoView({ behavior: 'smooth' });
    if (state.forecastData) renderDashboard(state.forecastData);
  });
  elements.navDtwBtn.addEventListener('click', () => {
    elements.dtwModal.classList.remove('hidden');
  });

  // 3. Modals Controls
  elements.openParamsModalBtn.addEventListener('click', () => elements.paramsModal.classList.remove('hidden'));
  elements.quickSettingsBtn.addEventListener('click', () => elements.paramsModal.classList.remove('hidden'));
  elements.closeParamsModalBtn.addEventListener('click', () => elements.paramsModal.classList.add('hidden'));

  elements.openUploadModalBtn.addEventListener('click', () => {
    elements.uploadStatusBox.classList.add('hidden');
    elements.uploadModal.classList.remove('hidden');
  });
  elements.closeUploadModalBtn.addEventListener('click', () => elements.uploadModal.classList.add('hidden'));
  elements.cancelUploadBtn.addEventListener('click', () => elements.uploadModal.classList.add('hidden'));

  elements.closeDtwModalBtn.addEventListener('click', () => elements.dtwModal.classList.add('hidden'));
  elements.closeDtwBtn2.addEventListener('click', () => elements.dtwModal.classList.add('hidden'));

  // 4. Sliders live feedback
  elements.windowSizeInput.addEventListener('input', e => {
    elements.windowSizeVal.textContent = `${e.target.value} days`;
  });
  elements.forecastHorizonInput.addEventListener('input', e => {
    elements.forecastHorizonVal.textContent = `${e.target.value} days`;
  });
  elements.testSizeInput.addEventListener('input', e => {
    elements.testSizeVal.textContent = `${e.target.value} days`;
  });
  elements.kNearestInput.addEventListener('input', e => {
    elements.kNearestVal.textContent = `${e.target.value} patterns`;
  });

  // 5. Apply Parameters
  elements.saveParamsBtn.addEventListener('click', () => {
    state.parameters.windowSize = parseInt(elements.windowSizeInput.value, 10);
    state.parameters.forecastHorizon = parseInt(elements.forecastHorizonInput.value, 10);
    state.parameters.testSize = parseInt(elements.testSizeInput.value, 10);
    state.parameters.kNearest = parseInt(elements.kNearestInput.value, 10);
    elements.paramsModal.classList.add('hidden');
    runForecast();
  });

  // 6. Reset Parameters
  elements.resetParamsBtn.addEventListener('click', () => {
    elements.windowSizeInput.value = 10;
    elements.windowSizeVal.textContent = '10 days';
    elements.forecastHorizonInput.value = 5;
    elements.forecastHorizonVal.textContent = '5 days';
    elements.testSizeInput.value = 5;
    elements.testSizeVal.textContent = '5 days';
    elements.kNearestInput.value = 3;
    elements.kNearestVal.textContent = '3 patterns';
  });

  // 7. Drag and Drop File Upload
  elements.csvDropzone.addEventListener('click', () => elements.csvFileInput.click());
  elements.csvFileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  });

  elements.csvDropzone.addEventListener('dragover', e => {
    e.preventDefault();
    elements.csvDropzone.classList.add('border-[#B4F73C]', 'bg-emerald-50/20');
  });

  elements.csvDropzone.addEventListener('dragleave', () => {
    elements.csvDropzone.classList.remove('border-[#B4F73C]', 'bg-emerald-50/20');
  });

  elements.csvDropzone.addEventListener('drop', e => {
    e.preventDefault();
    elements.csvDropzone.classList.remove('border-[#B4F73C]', 'bg-emerald-50/20');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  elements.confirmUploadBtn.addEventListener('click', uploadAndApplyCSV);

  // 8. Revert to Sample Data Button
  elements.loadSampleBtn.addEventListener('click', () => {
    state.currentCsvPath = 'data/sample_stock_data.csv';
    state.currentFilename = 'sample_stock_data.csv';
    elements.uploadModal.classList.add('hidden');
    showToast('Reverted to default sample dataset', 'info');
    runForecast();
  });

  // 9. Chart Range Buttons
  elements.chartRangeBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      elements.chartRangeBtns.forEach(b => {
        b.className = 'chart-range-btn px-3 py-1 font-medium rounded-full text-gray-500 hover:text-gray-800';
      });
      e.target.className = 'chart-range-btn px-3 py-1 font-semibold rounded-full bg-white shadow-xs text-gray-900';
      state.chartRange = e.target.dataset.range;
      if (state.forecastData) {
        renderChart(state.forecastData.historicalRecords, state.forecastData.futureProjections.projections, state.forecastData.backtest);
      }
    });
  });

  // 10. Toggle Backtest Validation Curve
  elements.toggleBacktestCurveBtn.addEventListener('click', () => {
    state.showValidationCurve = !state.showValidationCurve;
    if (state.showValidationCurve) {
      elements.toggleBacktestCurveBtn.textContent = 'Validation: On';
      elements.toggleBacktestCurveBtn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100 transition';
    } else {
      elements.toggleBacktestCurveBtn.textContent = 'Validation: Off';
      elements.toggleBacktestCurveBtn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 transition';
    }
    if (state.forecastData) {
      renderChart(state.forecastData.historicalRecords, state.forecastData.futureProjections.projections, state.forecastData.backtest);
    }
  });

  // 11. Toggle Price Privacy Eye Button
  elements.togglePricePrivacyBtn.addEventListener('click', () => {
    state.isPriceHidden = !state.isPriceHidden;
    if (state.forecastData) {
      const price = state.forecastData.futureProjections.latestPrice;
      elements.heroLatestPrice.textContent = state.isPriceHidden ? '$••••••' : formatCurrency(price);
    }
  });

  // 12. Copy Dataset Info
  elements.copyDatasetBtn.addEventListener('click', () => {
    const info = `Dataset: ${state.currentFilename} | Model: DP DTW O(M·N) | Window: ${state.parameters.windowSize} | Horizon: ${state.parameters.forecastHorizon}`;
    navigator.clipboard.writeText(info).then(() => {
      showToast('Dataset specification copied to clipboard', 'info');
    });
  });

  // 13. Scroll to Projections Button
  elements.scrollToProjectionsBtn.addEventListener('click', () => {
    elements.projectionsProgressList.scrollIntoView({ behavior: 'smooth' });
  });

  // 14. System Status Button
  document.getElementById('system-status-btn').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/health');
      const health = await res.json();
      showToast(`C++ Engine: ${health.cPlusPlusExecutable ? 'Operational' : 'Unavailable'} (StockPricePredictor.exe)`, 'info');
    } catch {
      showToast('Backend server connection failed', 'error');
    }
  });
}

// Initialization on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  // Automatically execute first forecast with default sample data
  runForecast();
});
