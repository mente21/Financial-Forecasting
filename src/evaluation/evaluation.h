#ifndef EVALUATION_H
#define EVALUATION_H

#include "../data/stockdata.h"
#include <vector>
#include <string>

/**
 * @brief Holds evaluation metrics comparing predicted values against actual values.
 */
struct EvaluationMetrics {
    double mae;                 // Mean Absolute Error
    double mape;                // Mean Absolute Percentage Error (%)
    double mse;                 // Mean Squared Error
    double rmse;                // Root Mean Squared Error
    double directionalAccuracy; // Directional Accuracy (%)
    int sampleCount;

    EvaluationMetrics()
        : mae(0.0), mape(0.0), mse(0.0), rmse(0.0), directionalAccuracy(0.0), sampleCount(0) {}
};

/**
 * @brief Computes standard statistical accuracy metrics for time-series forecasting.
 */
class Evaluator {
public:
    Evaluator();

    /**
     * @brief Computes MAE, MAPE, MSE, RMSE, and Directional Accuracy.
     * @param actual Actual ground-truth stock prices.
     * @param predicted Forecasted stock prices.
     * @param baselinePrice Last known price prior to forecast horizon (used for directional accuracy).
     * @return EvaluationMetrics Struct with calculated metrics.
     */
    static EvaluationMetrics calculateMetrics(
        const std::vector<double>& actual,
        const std::vector<double>& predicted,
        double baselinePrice = 0.0
    );

    /**
     * @brief Prints a formatted evaluation report to stdout.
     * @param metrics Calculated evaluation metrics.
     * @param result Detailed forecast result with dates, actual, and predicted prices.
     */
    static void printReport(
        const EvaluationMetrics& metrics,
        const ForecastResult& result
    );
};

#endif // EVALUATION_H
