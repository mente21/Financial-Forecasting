# Dynamic Time Warping (DTW) Forecasting Algorithm

This document provides a comprehensive technical breakdown of the Dynamic Programming-based time-series forecasting algorithm implemented in `src/algorithm/forecasting.cpp` and `src/algorithm/forecasting.h`.

---

## 1. Overview & Mathematical Foundation

In financial time-series forecasting, traditional linear models (e.g., ARIMA) often struggle with non-linear warping, temporal phase shifts, and varying market velocity across regimes. 

The **Dynamic Time Warping (DTW)** algorithm measures the optimal alignment distance between two sequences of time series that may vary in speed or timing. By comparing the current market trajectory against past historical sequences, the system identifies the most statistically similar historical patterns and extrapolates future price behavior.

---

## 2. Mathematical Formulation & Dynamic Programming Recurrence

Let:
- $Q = (q_1, q_2, \dots, q_M)$ be the query pattern (the most recent $M$ normalized closing prices).
- $T = (t_1, t_2, \dots, t_N)$ be a candidate target pattern from historical data.

### 2.1 Local Distance Measure
The distance between any two points $q_i$ and $t_j$ is given by the absolute difference:
$$d(q_i, t_j) = |q_i - t_j|$$

### 2.2 Global Cumulative Distance Matrix (DP Recurrence)
We construct an $(M+1) \times (N+1)$ Dynamic Programming matrix $D$, where $D(i, j)$ represents the minimum cumulative warping cost to align prefix sequences $Q[1..i]$ and $T[1..j]$:

$$
D(i, j) = |q_i - t_j| + \min \begin{cases}
D(i - 1, j)     & \text{(Insertion / Warping query)} \\
D(i, j - 1)     & \text{(Deletion / Warping target)} \\
D(i - 1, j - 1) & \text{(Match / Diagonal step)}
\end{cases}
$$

### 2.3 Boundary & Initialization Conditions
$$
\begin{aligned}
D(0, 0) &= 0.0 \\
D(i, 0) &= +\infty \quad \forall i \in \{1, \dots, M\} \\
D(0, j) &= +\infty \quad \forall j \in \{1, \dots, N\}
\end{aligned}
$$

The overall alignment cost between $Q$ and $T$ is $D(M, N)$.

---

## 3. Algorithmic Workflow & Implementation Details

The complete forecasting pipeline in `DPForecaster::forecast` proceeds through five distinct stages:

```
[Historical Price Series]
         │
         ▼
 1. Z-Score Normalization
         │
         ▼
 2. Sliding Window Extraction (Length M)
         │
         ▼
 3. DP DTW Distance Evaluation Against Current Query
         │
         ▼
 4. Candidate Ranking & Inverse Distance Weighting (Top-K)
         │
         ▼
 5. Horizon Extrapolation (H Steps Forward)
```

### Stage 1: Z-Score Normalization
To make pattern matching scale-invariant (so matching depends on geometric shape rather than absolute price levels), all sequences are normalized:
$$\mu = \frac{1}{K}\sum_{i=1}^K x_i, \quad \sigma = \sqrt{\frac{1}{K}\sum_{i=1}^K (x_i - \mu)^2}$$
$$\tilde{x}_i = \frac{x_i - \mu}{\sigma}$$
*Note: If standard deviation $\sigma < 10^{-8}$, the implementation returns a zero vector to avoid division by zero.*

### Stage 2: Sliding Window Search
Given a total dataset of $P$ points, window size $M$, and forecast horizon $H$:
- Query sequence: `historicalPrices[P - M ... P - 1]`
- Candidate sequences: `historicalPrices[i ... i + M - 1]` where $0 \le i \le P - M - H$
This non-overlapping search boundary ensures historical candidates have at least $H$ future periods to sample returns from.

### Stage 3: Dynamic Time Warping Matrix Calculation
For each historical candidate, `computeDTW()` executes the recurrence relation:
```cpp
lastDPTable.assign(n + 1, std::vector<double>(m + 1, INF));
lastDPTable[0][0] = 0.0;

for (int i = 1; i <= n; ++i) {
    for (int j = 1; j <= m; ++j) {
        double cost = std::abs(s1[i - 1] - s2[j - 1]);
        double minPrev = std::min({
            lastDPTable[i - 1][j],     // insertion
            lastDPTable[i][j - 1],     // deletion
            lastDPTable[i - 1][j - 1]  // match
        });
        lastDPTable[i][j] = cost + minPrev;
    }
}
```

### Stage 4: Top-K Selection and Inverse-Distance Weighting
Candidates are sorted ascending by DTW distance. The top $K = \min(kNearest, |\text{candidates}|)$ regimes are weighted according to:
$$w_i = \frac{1}{\text{dist}_i + 10^{-4}}, \quad \tilde{w}_i = \frac{w_i}{\sum_{j=1}^K w_j}$$

### Stage 5: Price Projection
For each projection step $s \in \{1, \dots, H\}$:
1. Extract the historical base price $P_{\text{base}, i} = P[\text{startIndex}_i + M - 1]$
2. Extract the historical future price $P_{\text{future}, i} = P[\text{startIndex}_i + M - 1 + s]$
3. Compute the relative rate of return:
   $$R_{i, s} = \frac{P_{\text{future}, i} - P_{\text{base}, i}}{P_{\text{base}, i}}$$
4. Compute the weighted expected return:
   $$\bar{R}_s = \sum_{i=1}^K \tilde{w}_i R_{i, s}$$
5. Apply the return to the latest known closing price $P_{\text{latest}}$:
   $$\hat{P}_{s} = P_{\text{latest}} \cdot (1 + \bar{R}_s)$$

---

## 4. Complexity Analysis

| Metric | Complexity | Explanation |
|---|---|---|
| **DTW Pairwise Alignment Time** | $O(M \times N)$ | Filling the $(M+1) \times (N+1)$ DP grid with 3 lookups per cell. |
| **DTW Pairwise Space** | $O(M \times N)$ | Storage of `lastDPTable` for cost inspection. |
| **Complete Forecasting Search Time** | $O((P - M - H) \cdot M^2)$ | If query and candidate window length are $M$, $P - M - H$ evaluations are executed. |
| **Overall Auxiliary Memory** | $O(M^2 + P)$ | Grid storage and candidate index arrays. |

---

## 5. Walkthrough Demonstration Example

Below is the exact Dynamic Programming Cost Matrix produced during system initialization for the sample query $Q = [100.0, 102.5, 101.0, 104.0, 106.0]$ and target $T = [99.5, 101.8, 101.2, 103.5, 105.8]$:

```
     i\j       j=0       j=1       j=2       j=3       j=4       j=5
     i=0      0.00       INF       INF       INF       INF       INF
     i=1       INF      0.50      2.30      3.50      7.00     12.80
     i=2       INF      3.50      1.20      2.50      3.50      6.80
     i=3       INF      5.00      2.00      1.40      3.90      8.30
     i=4       INF      9.50      4.20      4.20      1.90      3.70
     i=5       INF     16.00      8.40      9.00      4.40      2.10

Optimal Alignment Distance D(5, 5) = 2.1000
```
Optimal warping path navigates through diagonal matches $(0,0) \to (1,1) \to (2,2) \to (3,3) \to (4,4) \to (5,5)$ with minimal cumulative cost accumulating to $2.1000$.
