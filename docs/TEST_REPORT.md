# System Test Report & Empirical Validation

This test report documents the validation of the Financial Forecasting System (`StockPricePredictor.exe` and test suites) executed against real datasets under various operational parameter configurations.

---

## 1. Test Environment Specification

- **Operating System**: Microsoft Windows 11
- **C++ Compiler / Runtime**: MinGW-w64 GCC (ucrt64)
- **Runtime Dependencies**: `libstdc++-6.dll`, `libgcc_s_seh-1.dll`, `libwinpthread-1.dll`
- **Node.js Environment**: v24.22.0 (for Web GUI bridge)

---

## 2. Test Execution Matrix

| Test ID | Dataset | Configuration ($M, H, T$) | Exit Code | Validation Outcome |
|---|---|---|---|---|
| **TEST-01** | `sample_stock_data.csv` (60 rows) | $M=10, H=5, T=5$ (Default) | `0` | **PASS**: MAE $0.14, MAPE 0.08%, DirAcc 100% |
| **TEST-02** | `sample_stock_data.csv` (60 rows) | $M=15, H=8, T=8$ (Larger) | `0` | **PASS**: MAE $0.23, MAPE 0.13%, DirAcc 87.5% |
| **TEST-03** | `sample_stock_data.csv` (60 rows) | $M=5, H=3, T=3$ (Small) | `0` | **PASS**: MAE $0.24, MAPE 0.13%, DirAcc 100% |
| **TEST-04** | `preset_aapl_tech.csv` (90 rows) | $M=10, H=5, T=5$ | `0` | **PASS**: MAE $0.34, MAPE 0.17%, DirAcc 100% |
| **TEST-05** | `preset_nvda_momentum.csv` (75 rows) | $M=10, H=5, T=5$ | `0` | **PASS**: MAE $2.28, MAPE 0.38%, DirAcc 100% |
| **TEST-06** | `preset_xom_defensive.csv` (80 rows) | $M=10, H=5, T=5$ | `0` | **PASS**: MAE $0.72, MAPE 0.62%, DirAcc 80% |
| **TEST-07** | `nonexistent_file.csv` | $M=10, H=5, T=5$ | `1` | **PASS**: Graceful error handling (`[Error] Unable to open data file`) |
| **TEST-08** | `sample_stock_data.csv` (60 rows) | $M=50, H=5, T=5$ (Oversized) | `0` | **PASS**: Handled extreme window constraint ($M=50$) |
| **TEST-09** | `tiny_test.csv` (3 rows) | $M=10, H=5, T=5$ (Insufficient) | `0` | **PASS**: Outputted error: `Not enough data points to forecast` |
| **TEST-10** | Unit Test Suite (`run_tests.exe`) | All test suites | `0` | **PASS**: 4/4 Unit tests passed |

---

## 3. Detailed Empirical Test Results

### 3.1 TEST-01: Baseline Default Parameters
- **Command**: `.\StockPricePredictor.exe data\sample_stock_data.csv 10 5 5`
- **Output Excerpt**:
  ```
  [Performance Metrics Summary]
    - Number of Evaluated Periods : 5
    - Mean Absolute Error (MAE)   : $0.14
    - Mean Abs % Error (MAPE)     : 0.08%
    - Root Mean Sq Error (RMSE)   : $0.16
    - Directional Accuracy        : 100.00%
    - Best Matched Hist. Regime   : Index [25 .. 34]
    - Dynamic Warping Distance    : 0.9042
  ```

### 3.2 TEST-02: Extended Window & Horizon
- **Command**: `.\StockPricePredictor.exe data\sample_stock_data.csv 15 8 8`
- **Evaluation**:
  - MAE: `$0.23`
  - MAPE: `0.13%`
  - RMSE: `$0.27`
  - Directional Accuracy: `87.50%`
  - Matched Historical Regime: Index `[17 .. 31]`
  - Warping Distance: `1.7883`

### 3.3 TEST-05: High-Volatility Asset (NVDA Preset)
- **Command**: `.\StockPricePredictor.exe data\preset_nvda_momentum.csv 10 5 5`
- **Evaluation**:
  - Price Range: ~$590–$600
  - MAE: `$2.28` (Higher dollar error due to asset scale)
  - MAPE: `0.38%` (Low percentage error indicates stable relative fit)
  - Directional Accuracy: `100.00%`
  - Warping Distance: `0.0688`

### 3.4 TEST-07: File Not Found Error Handling
- **Command**: `.\StockPricePredictor.exe nonexistent_file.csv 10 5 5`
- **Observed Standard Error Output**:
  ```
  [Error] Unable to open data file: nonexistent_file.csv
  [Error] No data loaded from nonexistent_file.csv. Exiting.
  ```
- **Exit Code**: `1` (Verified clean exit on error).

### 3.5 TEST-09: Insufficient Data Verification
- **Command**: `.\StockPricePredictor.exe data\tiny_test.csv 10 5 5` (3 records present, 20 required)
- **Observed Standard Error Output**:
  ```
  [Error] Not enough data for backtesting with testSize = 5
  [Error] Not enough data points to forecast. Required: 15, Available: 3
  ```
- **Outcome**: Successfully caught boundary violation without memory corruption or segmentation faults.

### 3.6 TEST-10: C++ Unit Test Suite
- **Command**: `.\run_tests.exe`
- **Output**:
  ```
  Running Stock Price Predictor Unit Tests...
  [PASS] testDTWIdentity (identical sequences have DTW distance 0)
  [PASS] testDTWSymmetryAndCost (symmetric distance)
  [PASS] testEvaluationMetrics (MAE, MAPE, RMSE accuracy)
  [PASS] testCSVReading (read 60 records)
  All Unit Tests Passed Successfully!
  ```

---

## 4. Identified System Constraints & Technical Limitations

1. **Hardcoded Top-K Parameter (`kNearest`)**:
   - In `src/main.cpp`, `int kNearest = 3;` is statically configured. The CLI argument parser accepts `[csvPath] [windowSize] [forecastHorizon] [testSize]`, but does not expose `kNearest` as a 5th command-line argument.
2. **MinGW Windows Runtime Dependency**:
   - On Windows, `StockPricePredictor.exe` requires MinGW runtime dynamic link libraries (`libstdc++-6.dll`, `libgcc_s_seh-1.dll`, `libwinpthread-1.dll`) in either the working directory or in the system PATH.
3. **Data Length Precondition**:
   - The dataset must satisfy $N \ge M + H + T$. If a user supplies fewer records, backtesting and forecasting return zero values with diagnostic errors logged to `stderr`.
4. **Univariate Modeling**:
   - Pattern matching relies solely on the `Close` price series; volume and open/high/low intra-day spreads are ingested into `StockRecord` but not currently incorporated into the DTW warping cost metric.
