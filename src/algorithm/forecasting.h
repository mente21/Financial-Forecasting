#ifndef FORECASTING_H
#define FORECASTING_H

#include "../data/stockdata.h"
#include <vector>
#include <utility>

/**
 * @brief Dynamic Programming based Stock Price Forecaster.
 * 
 * Uses Dynamic Time Warping (DTW) and Subsequence Pattern Matching
 * implemented with Dynamic Programming (2D memoization table) to find
 * historically analogous market regimes and extrapolate future trends.
 */
class DPForecaster {
public:
    /**
     * @brief Constructor
     * @param windowSize Number of historical periods used as query pattern (m).
     * @param forecastHorizon Number of future steps to predict (H).
     * @param kNearest Number of top matching historical patterns to combine (k).
     */
    DPForecaster(int windowSize = 10, int forecastHorizon = 5, int kNearest = 3);

    /**
     * @brief Computes the Dynamic Time Warping (DTW) distance between two series using DP.
     * Recurrence: D(i, j) = cost(i, j) + min(D(i-1, j), D(i, j-1), D(i-1, j-1))
     * Time Complexity: O(M * N)
     * Space Complexity: O(M * N)
     * @param s1 First time-series sequence.
     * @param s2 Second time-series sequence.
     * @return double Minimal warping cost.
     */
    double computeDTW(const std::vector<double>& s1, const std::vector<double>& s2);

    /**
     * @brief Returns the 2D DP table generated from the latest DTW calculation (for DAA analysis).
     * @return const std::vector<std::vector<double>>& 2D DP cost matrix.
     */
    const std::vector<std::vector<double>>& getLastDPTable() const;

    /**
     * @brief Forecasts future stock prices based on historical prices using DP pattern matching.
     * @param historicalPrices Historical sequence of close prices.
     * @return ForecastResult Contains predicted prices, matched indices, and DTW distance.
     */
    ForecastResult forecast(const std::vector<double>& historicalPrices);

    /**
     * @brief Performs backtesting across a validation segment.
     * @param allPrices Entire series of closing prices.
     * @param testSize Number of data points to evaluate at the end of the series.
     * @return ForecastResult Comparison of actual vs predicted prices across the test set.
     */
    ForecastResult backtest(const std::vector<double>& allPrices, int testSize);

    // Getters and setters
    int getWindowSize() const { return windowSize; }
    void setWindowSize(int w) { windowSize = w; }
    int getForecastHorizon() const { return forecastHorizon; }
    void setForecastHorizon(int h) { forecastHorizon = h; }
    int getKNearest() const { return kNearest; }
    void setKNearest(int k) { kNearest = k; }

private:
    int windowSize;
    int forecastHorizon;
    int kNearest;
    std::vector<std::vector<double>> lastDPTable;

    // Normalizes a sequence to zero-mean and unit variance (Z-score) for scale-invariant pattern matching
    std::vector<double> zNormalize(const std::vector<double>& seq);
};

#endif // FORECASTING_H
