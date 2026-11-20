#include "evaluation.h"
#include <iostream>
#include <iomanip>
#include <cmath>
#include <numeric>

Evaluator::Evaluator() {}

EvaluationMetrics Evaluator::calculateMetrics(
    const std::vector<double>& actual,
    const std::vector<double>& predicted,
    double baselinePrice
) {
    EvaluationMetrics metrics;
    size_t n = std::min(actual.size(), predicted.size());

    if (n == 0) return metrics;

    metrics.sampleCount = static_cast<int>(n);

    double sumAbsError = 0.0;
    double sumAbsPctError = 0.0;
    double sumSqError = 0.0;
    int correctDirectionCount = 0;

    double prevActual = (baselinePrice > 0.0) ? baselinePrice : actual[0];
    double prevPred = (baselinePrice > 0.0) ? baselinePrice : actual[0];

    for (size_t i = 0; i < n; ++i) {
        double absErr = std::abs(actual[i] - predicted[i]);
        sumAbsError += absErr;
        sumSqError += (actual[i] - predicted[i]) * (actual[i] - predicted[i]);

        if (std::abs(actual[i]) > 1e-8) {
            sumAbsPctError += (absErr / actual[i]) * 100.0;
        }

        // Directional Accuracy: did the forecast move in the same direction as the actual price?
        double actualChange = actual[i] - prevActual;
        double predChange = predicted[i] - prevPred;

        if ((actualChange >= 0.0 && predChange >= 0.0) || (actualChange < 0.0 && predChange < 0.0)) {
            correctDirectionCount++;
        }

        prevActual = actual[i];
        prevPred = predicted[i];
    }

    metrics.mae = sumAbsError / n;
    metrics.mape = sumAbsPctError / n;
    metrics.mse = sumSqError / n;
    metrics.rmse = std::sqrt(metrics.mse);
    metrics.directionalAccuracy = (static_cast<double>(correctDirectionCount) / n) * 100.0;

    return metrics;
}

void Evaluator::printReport(const EvaluationMetrics& metrics, const ForecastResult& result) {
    std::cout << "\n========================================================\n";
    std::cout << "           STOCK PRICE FORECASTING EVALUATION           \n";
    std::cout << "========================================================\n";

    if (!result.actualPrices.empty() && !result.predictedPrices.empty()) {
        std::cout << std::left 
                  << std::setw(8)  << "Step"
                  << std::setw(15) << "Actual ($)"
                  << std::setw(15) << "Predicted ($)"
                  << std::setw(15) << "Abs Error ($)"
                  << std::setw(12) << "Error (%)"
                  << "\n";
        std::cout << "--------------------------------------------------------\n";

        size_t n = std::min(result.actualPrices.size(), result.predictedPrices.size());
        for (size_t i = 0; i < n; ++i) {
            double err = std::abs(result.actualPrices[i] - result.predictedPrices[i]);
            double pctErr = (result.actualPrices[i] > 1e-8)
                                ? (err / result.actualPrices[i]) * 100.0 : 0.0;

            std::cout << std::left
                      << std::setw(8)  << (i + 1)
                      << std::setw(15) << std::fixed << std::setprecision(2) << result.actualPrices[i]
                      << std::setw(15) << std::fixed << std::setprecision(2) << result.predictedPrices[i]
                      << std::setw(15) << std::fixed << std::setprecision(2) << err
                      << std::setw(12) << std::fixed << std::setprecision(2) << pctErr
                      << "\n";
        }
        std::cout << "--------------------------------------------------------\n";
    }

    std::cout << "\n[Performance Metrics Summary]\n";
    std::cout << "  - Number of Evaluated Periods : " << metrics.sampleCount << "\n";
    std::cout << "  - Mean Absolute Error (MAE)   : $" << std::fixed << std::setprecision(2) << metrics.mae << "\n";
    std::cout << "  - Mean Abs % Error (MAPE)     : " << std::fixed << std::setprecision(2) << metrics.mape << "%\n";
    std::cout << "  - Root Mean Sq Error (RMSE)   : $" << std::fixed << std::setprecision(2) << metrics.rmse << "\n";
    std::cout << "  - Directional Accuracy        : " << std::fixed << std::setprecision(2) << metrics.directionalAccuracy << "%\n";
    std::cout << "  - Best Matched Hist. Regime   : Index [" << result.matchedHistoricalStartIndex
              << " .. " << result.matchedHistoricalEndIndex << "]\n";
    std::cout << "  - Dynamic Warping Distance    : " << std::fixed << std::setprecision(4) << result.dtwDistance << "\n";
    std::cout << "========================================================\n\n";
}
