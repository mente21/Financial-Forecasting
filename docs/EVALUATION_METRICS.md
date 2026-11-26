# Evaluation Metrics Specification

This document details the performance metrics used to assess forecasting accuracy within the Financial Forecasting System, as implemented in `src/evaluation/evaluation.cpp`.

---

## 1. Metrics & Mathematical Formulations

Let:
- $y_t$ be the ground truth actual stock price at step $t$.
- $\hat{y}_t$ be the model predicted price at step $t$.
- $n$ be the number of evaluation periods (`sampleCount`).
- $y_0$ be the baseline price prior to the evaluation window (last training point).

---

### 1.1 Mean Absolute Error (MAE)
Measures the average magnitude of prediction errors in dollar terms without considering direction:

$$\text{MAE} = \frac{1}{n} \sum_{t=1}^n |y_t - \hat{y}_t|$$

- **Unit**: Currency ($ USD)
- **Interpretation**: A lower MAE indicates tighter alignment with actual market prices.

---

### 1.2 Mean Absolute Percentage Error (MAPE)
Measures relative prediction accuracy as an average percentage deviation:

$$\text{MAPE} = \frac{100\%}{n} \sum_{t=1}^n \left| \frac{y_t - \hat{y}_t}{y_t} \right|$$

- **Unit**: Percentage (%)
- **Guard Clause**: If $y_t \le 10^{-8}$, the division is guarded to prevent arithmetic overflow.
- **Interpretation**: Expresses error scale-independently, allowing comparison across assets with differing price ranges (e.g. $100 stock vs $600 stock).

---

### 1.3 Mean Squared Error (MSE) & Root Mean Squared Error (RMSE)
Penalizes larger forecast errors more heavily than small ones:

$$\text{MSE} = \frac{1}{n} \sum_{t=1}^n (y_t - \hat{y}_t)^2$$
$$\text{RMSE} = \sqrt{\text{MSE}} = \sqrt{\frac{1}{n} \sum_{t=1}^n (y_t - \hat{y}_t)^2}$$

- **Unit**: Currency ($ USD)
- **Interpretation**: Differences between RMSE and MAE reveal error variance: a wide gap indicates occasional large forecast misses.

---

### 1.4 Directional Accuracy (MDA)
Evaluates whether the predicted trajectory correctly mirrors the market trend direction (upward or downward):

$$\Delta y_t = y_t - y_{t-1}, \quad \Delta \hat{y}_t = \hat{y}_t - \hat{y}_{t-1}$$

$$
\text{SignMatch}(t) = \begin{cases}
1 & \text{if } (\Delta y_t \ge 0 \land \Delta \hat{y}_t \ge 0) \lor (\Delta y_t < 0 \land \Delta \hat{y}_t < 0) \\
0 & \text{otherwise}
\end{cases}
$$

$$\text{Directional Accuracy} = \left(\frac{1}{n} \sum_{t=1}^n \text{SignMatch}(t)\right) \times 100\%$$

- **Baseline Initialization**:
  For $t=1$, $y_0$ and $\hat{y}_0$ are initialized to `baselinePrice` (the closing price immediately prior to the test window).
- **Unit**: Percentage (0.0% to 100.0%)
- **Interpretation**: Crucial for trading strategies where trend direction matters more than absolute price levels.

---

### 1.5 Dynamic Time Warping (DTW) Distance
The optimal alignment distance computed between the query pattern and the best historical match:
$$\text{DTW Distance} = D(M, N)$$
- Normalized sequence alignment cost.
- Lower values denote stronger structural similarity between the current market phase and historical behavior.

---

## 2. Standard Evaluation Report Output

When executing `Evaluator::printReport()`, results are formatted as follows:

```
========================================================
           STOCK PRICE FORECASTING EVALUATION           
========================================================
Step    Actual ($)     Predicted ($)  Abs Error ($)  Error (%)   
--------------------------------------------------------
1       183.70         183.51         0.19           0.10        
2       183.00         183.22         0.22           0.12        
3       182.10         182.16         0.06           0.03        
4       181.30         181.26         0.04           0.02        
5       180.60         180.41         0.19           0.11        
--------------------------------------------------------

[Performance Metrics Summary]
  - Number of Evaluated Periods : 5
  - Mean Absolute Error (MAE)   : $0.14
  - Mean Abs % Error (MAPE)     : 0.08%
  - Root Mean Sq Error (RMSE)   : $0.16
  - Directional Accuracy        : 100.00%
  - Best Matched Hist. Regime   : Index [25 .. 34]
  - Dynamic Warping Distance    : 0.9042
========================================================
```
