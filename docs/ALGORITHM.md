# Dynamic Programming Stock Price Forecasting & Pattern Recognition (DAA)

## 1. Introduction
This project implements a stock price forecasting system based on **Dynamic Programming (DP)**, specifically utilizing **Dynamic Time Warping (DTW)** for non-linear subsequence similarity detection and temporal pattern extrapolation.

In stock markets, price patterns (such as breakouts, pullbacks, and consolidations) frequently recur across history but with variations in execution speed and amplitude. Standard Euclidean distance fails when two identical patterns unfold over slightly different timescales. Dynamic Programming solves this with optimal alignment.

---

## 2. Dynamic Programming Formulation

### 2.1 State Representation
Let:
- $Q = (q_1, q_2, \dots, q_m)$ be the current query sequence of stock prices (normalized).
- $C = (c_1, c_2, \dots, c_n)$ be a historical candidate window of stock prices (normalized).

We define a 2D Dynamic Programming table:
- $D[i][j]$: The minimum cumulative warping distance required to align the prefix $Q[1 \dots i]$ with candidate prefix $C[1 \dots j]$.

### 2.2 Base Cases
- $D[0][0] = 0$ (Zero distance to align two empty sequences)
- $D[i][0] = \infty$ for all $1 \le i \le m$
- $D[0][j] = \infty$ for all $1 \le j \le n$

### 2.3 Recurrence Relation (Bellman Equation)
For each cell $(i, j)$ where $1 \le i \le m$ and $1 \le j \le n$:

$$D[i][j] = \text{cost}(q_i, c_j) + \min \begin{cases} D[i-1][j] & \text{(Insertion / Vertical Step)} \\ D[i][j-1] & \text{(Deletion / Horizontal Step)} \\ D[i-1][j-1] & \text{(Match / Diagonal Step)} \end{cases}$$

Where the local cost function is the absolute distance:
$$\text{cost}(q_i, c_j) = |q_i - c_j|$$

The final minimum alignment cost between the two series is located at:
$$\text{DTW}(Q, C) = D[m][n]$$

---

## 3. Complexity Analysis

| Metric | Complexity | Explanation |
| :--- | :--- | :--- |
| **Time Complexity** | $O(M \times N)$ | Computing each cell in the $M \times N$ DP grid takes $O(1)$ constant time. For scanning $K$ candidate windows of length $N$, overall search takes $O(K \times M \times N)$. |
| **Space Complexity** | $O(M \times N)$ | Storing the 2D tabulation matrix for alignment visualization and optimal warping path traceback. |

---

## 4. Forecasting Mechanism
1. **Z-Score Normalization**: Each window is normalized $(\mu = 0, \sigma = 1)$ to achieve scale-invariance.
2. **DP Subsequence Search**: The DP table evaluates every past historical window against the current pattern.
3. **K-Nearest Historical Regimes**: The top-$K$ best matching historical patterns (lowest DP warping distance) are selected.
4. **Weighted Return Extrapolation**: Future trajectory is projected onto the current price based on inverse-distance weighted historical returns:
   $$\hat{p}_{t+h} = p_t \times \left(1 + \sum_{k=1}^K w_k \cdot r_{k, h}\right)$$

---

## 5. Evaluation Metrics
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i|$$
- **Mean Absolute Percentage Error (MAPE)**:
  $$\text{MAPE} = \frac{100\%}{N} \sum_{i=1}^N \left|\frac{y_i - \hat{y}_i}{y_i}\right|$$
- **Root Mean Squared Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (y_i - \hat{y}_i)^2}$$
- **Directional Accuracy**: Percentage of periods where the predicted sign of price change matches the realized sign of price change.
