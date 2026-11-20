#include "forecasting.h"
#include <cmath>
#include <limits>
#include <algorithm>
#include <iostream>
#include <numeric>

DPForecaster::DPForecaster(int windowSize, int forecastHorizon, int kNearest)
    : windowSize(windowSize), forecastHorizon(forecastHorizon), kNearest(kNearest) {}

std::vector<double> DPForecaster::zNormalize(const std::vector<double>& seq) {
    if (seq.empty()) return {};

    double sum = std::accumulate(seq.begin(), seq.end(), 0.0);
    double mean = sum / seq.size();

    double sqDiffSum = 0.0;
    for (double v : seq) {
        sqDiffSum += (v - mean) * (v - mean);
    }
    double stdDev = std::sqrt(sqDiffSum / seq.size());

    // If series is constant, return zeros
    if (stdDev < 1e-8) {
        return std::vector<double>(seq.size(), 0.0);
    }

    std::vector<double> normalized(seq.size());
    for (size_t i = 0; i < seq.size(); ++i) {
        normalized[i] = (seq[i] - mean) / stdDev;
    }
    return normalized;
}

double DPForecaster::computeDTW(const std::vector<double>& s1, const std::vector<double>& s2) {
    int n = static_cast<int>(s1.size());
    int m = static_cast<int>(s2.size());

    if (n == 0 || m == 0) return std::numeric_limits<double>::infinity();

    const double INF = std::numeric_limits<double>::infinity();

    // DP Table: (n+1) x (m+1)
    // dp[i][j] stores the minimum cumulative warping distance between s1[0..i-1] and s2[0..j-1]
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

    return lastDPTable[n][m];
}

const std::vector<std::vector<double>>& DPForecaster::getLastDPTable() const {
    return lastDPTable;
}

ForecastResult DPForecaster::forecast(const std::vector<double>& historicalPrices) {
    ForecastResult result;
    int totalPoints = static_cast<int>(historicalPrices.size());

    if (totalPoints < windowSize + forecastHorizon) {
        std::cerr << "[Error] Not enough data points to forecast. Required: "
                  << (windowSize + forecastHorizon) << ", Available: " << totalPoints << std::endl;
        return result;
    }

    // Target query pattern: the most recent `windowSize` prices
    std::vector<double> currentPattern(
        historicalPrices.end() - windowSize,
        historicalPrices.end()
    );
    std::vector<double> normCurrent = zNormalize(currentPattern);

    // Search historical subsequences of length `windowSize`
    // We cannot use segments that overlap with future horizons of the query pattern
    int searchEnd = totalPoints - windowSize - forecastHorizon;

    struct MatchCandidate {
        int startIndex;
        double distance;
    };
    std::vector<MatchCandidate> candidates;

    for (int i = 0; i <= searchEnd; ++i) {
        std::vector<double> candidatePattern(
            historicalPrices.begin() + i,
            historicalPrices.begin() + i + windowSize
        );
        std::vector<double> normCandidate = zNormalize(candidatePattern);

        double dtwDist = computeDTW(normCurrent, normCandidate);
        candidates.push_back({i, dtwDist});
    }

    if (candidates.empty()) {
        std::cerr << "[Error] No candidate subsequences available for matching." << std::endl;
        return result;
    }

    // Sort candidate patterns by ascending DTW distance
    std::sort(candidates.begin(), candidates.end(), [](const MatchCandidate& a, const MatchCandidate& b) {
        return a.distance < b.distance;
    });

    int k = std::min(kNearest, static_cast<int>(candidates.size()));
    result.matchedHistoricalStartIndex = candidates[0].startIndex;
    result.matchedHistoricalEndIndex = candidates[0].startIndex + windowSize - 1;
    result.dtwDistance = candidates[0].distance;

    // Weight candidate projections using inverse DTW distance
    double totalWeight = 0.0;
    std::vector<double> weights(k, 0.0);
    for (int i = 0; i < k; ++i) {
        weights[i] = 1.0 / (candidates[i].distance + 1e-4);
        totalWeight += weights[i];
    }
    for (int i = 0; i < k; ++i) {
        weights[i] /= totalWeight;
    }

    double currentPrice = historicalPrices.back();
    result.predictedPrices.assign(forecastHorizon, 0.0);

    for (int step = 1; step <= forecastHorizon; ++step) {
        double weightedChange = 0.0;
        for (int i = 0; i < k; ++i) {
            int histBaseIdx = candidates[i].startIndex + windowSize - 1;
            int histFutureIdx = histBaseIdx + step;

            double histBasePrice = historicalPrices[histBaseIdx];
            double histFuturePrice = historicalPrices[histFutureIdx];

            // Percentage return seen in that historical regime
            double relativeReturn = (histFuturePrice - histBasePrice) / histBasePrice;
            weightedChange += weights[i] * relativeReturn;
        }

        // Project onto current price
        result.predictedPrices[step - 1] = currentPrice * (1.0 + weightedChange);
    }

    return result;
}

ForecastResult DPForecaster::backtest(const std::vector<double>& allPrices, int testSize) {
    ForecastResult combinedResult;
    int total = static_cast<int>(allPrices.size());

    if (total < windowSize + forecastHorizon + testSize) {
        std::cerr << "[Error] Not enough data for backtesting with testSize = " << testSize << std::endl;
        return combinedResult;
    }

    int trainEnd = total - testSize;
    std::vector<double> trainData(allPrices.begin(), allPrices.begin() + trainEnd);

    // Iteratively forecast using rolling window or multi-step horizon
    int stepsToPredict = std::min(testSize, forecastHorizon);
    this->setForecastHorizon(stepsToPredict);

    ForecastResult res = forecast(trainData);

    res.actualPrices.assign(allPrices.begin() + trainEnd, allPrices.begin() + trainEnd + stepsToPredict);

    return res;
}
