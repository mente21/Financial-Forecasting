# Financial Forecasting System (Dynamic Programming & DTW)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#running-tests)
[![C++](https://img.shields.io/badge/C++-17-blue.svg)](src/)
[![Node.js](https://img.shields.io/badge/Node.js-v24-green.svg)](server.js)
[![Documentation](https://img.shields.io/badge/docs-complete-blue)](docs/)

A high-performance stock price forecasting system combining a **Dynamic Programming / Dynamic Time Warping (DTW)** algorithm in C++ with an interactive financial dashboard built using Tailwind CSS and Chart.js.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │   Web Dashboard (HTML5, Tailwind CSS)   │
                      │       Interactive Chart.js Visuals      │
                      └────────────────────┬────────────────────┘
                                           │ HTTP / JSON
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │  Node.js Zero-Dependency API Bridge     │
                      │  (CSV parsing, Child Process Spawner)   │
                      └────────────────────┬────────────────────┘
                                           │ CLI Arguments & Stdout
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           C++ CORE ENGINE                                       │
│                                                                                 │
│   DataReader (CSV Ingestion) ──► DPForecaster (DTW Alignment O(M*N))            │
│                                           │                                     │
│                                           ├──► Out-of-Sample Backtesting        │
│                                           └──► Evaluator (MAE, MAPE, RMSE, MDA) │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

- **Dynamic Time Warping (DTW) Core**: Scale-invariant Z-score normalized pattern matching via dynamic programming with recurrence:
  $$D(i, j) = |Q[i] - T[j]| + \min(D(i-1, j), D(i, j-1), D(i-1, j-1))$$
- **Top-K Historical Regimes**: Inverse-distance weighting of the most similar historical time segments.
- **Evaluation Suite**: Out-of-sample backtesting assessing Mean Absolute Error (MAE), Mean Absolute Percentage Error (MAPE), Root Mean Squared Error (RMSE), and Directional Accuracy.
- **Modern Web Dashboard**: Real-time interactive charts, CSV upload, custom parameter configuration, and out-of-sample visual overlays.

---

## Detailed Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- 📘 [**Algorithm Specification**](docs/ALGORITHM.md) – Full mathematical foundation of Dynamic Time Warping, dynamic programming tables, complexity analysis, and projection mechanics.
- 📐 [**Data Structures**](docs/DATA_STRUCTURES.md) – Reference for `StockRecord`, `ForecastResult`, `EvaluationMetrics`, and data reader schemas.
- 📊 [**Evaluation Metrics**](docs/EVALUATION_METRICS.md) – Formulas and interpretations for MAE, MAPE, RMSE, Directional Accuracy, and Warping Distance.
- 🧪 [**System Test Report**](docs/TEST_REPORT.md) – Empirical test outputs across multiple assets, boundary conditions, error cases, and system limitations.

---

## Prerequisites & Dependencies

### C++ Core Engine
- Windows 10/11
- MinGW-w64 runtime libraries: `libstdc++-6.dll`, `libgcc_s_seh-1.dll`, `libwinpthread-1.dll` (included in repository root)
- G++ with C++17 support (optional, for compiling from source)

### Web Dashboard
- Node.js (v18.0.0 or later)

---

## Quick Start Guide

### Option 1: Running the Web Interface
```bash
# 1. Install dependencies (zero production dependencies required)
npm install

# 2. Launch the local server bridge
npm start
# or: node server.js

# 3. Open in your browser
http://localhost:3000
```

### Option 2: Running the C++ Command-Line Interface Directly
```powershell
# Syntax:
# .\StockPricePredictor.exe <csvPath> <windowSize> <forecastHorizon> <testSize>

.\StockPricePredictor.exe data\sample_stock_data.csv 10 5 5
```

#### Parameter Reference
| Parameter | Type | Default | Description |
|---|---|---|---|
| `csvPath` | string | `data/sample_stock_data.csv` | Relative or absolute path to CSV dataset |
| `windowSize` | integer | `10` | Number of days used for query pattern ($M$) |
| `forecastHorizon` | integer | `5` | Number of days to forecast into the future ($H$) |
| `testSize` | integer | `5` | Backtest evaluation sample size ($T$) |

---

## Running Tests

### 1. C++ Unit Tests
```powershell
.\run_tests.exe
```
Validates DTW identity, symmetry, metric computations, and CSV reader integrity.

### 2. Node.js & E2E Integration Tests
```powershell
npm test
```
Executes server bridge communication and end-to-end integration tests.

---

## CSV Dataset Requirements

Uploaded CSV files should have column headers corresponding to standard stock market data:

```csv
Date,Open,High,Low,Close,Volume
2024-01-02,150.25,152.00,149.80,151.75,45230000
2024-01-03,151.50,153.20,150.90,152.40,41200000
```

*Note: The forecasting engine requires a minimum dataset length of $\text{windowSize} + \text{forecastHorizon} + \text{testSize}$ rows.*

---

## Repository Structure

```
Financial-Forecasting/
├── data/                       # Sample and preset historical datasets
├── docs/                       # Detailed technical documentation
│   ├── ALGORITHM.md            # DTW dynamic programming explanation
│   ├── DATA_STRUCTURES.md      # Structs, classes, and CSV specifications
│   ├── EVALUATION_METRICS.md   # Mathematical definitions of metrics
│   └── TEST_REPORT.md          # Complete test log and empirical results
├── public/                     # Web dashboard frontend (HTML, CSS, JS)
├── src/                        # Core C++ forecasting engine source
│   ├── algorithm/              # DTW implementation (forecasting.cpp)
│   ├── data/                   # Data structures and CSV reader
│   └── evaluation/             # Error calculation and reporting
├── tests/                      # C++ unit test definitions
├── package.json                # Web server scripts
├── README.md                   # Project overview and quick start
├── run_tests.exe               # Compiled C++ test runner
├── server.js                   # Node.js REST API bridge
└── StockPricePredictor.exe     # Compiled C++ forecasting executable
```

---

## Known System Limitations

1. **Static Top-K Setting**: In `src/main.cpp`, `kNearest` is hardcoded to `3` in the CLI executable; future enhancements can expose this as a fifth parameter.
2. **MinGW Windows Runtime**: The precompiled `.exe` depends on MinGW runtime DLLs in the root folder.
3. **Univariate Time-Series**: Pattern matching exclusively warps against closing prices (`Close`).

---

## License
MIT License
