#include <iostream>
#include <cassert>
#include <cmath>
#include <vector>
#include "../src/data/datareader.h"
#include "../src/algorithm/forecasting.h"
#include "../src/evaluation/evaluation.h"

void testDTWIdentity() {
    DPForecaster forecaster;
    std::vector<double> seq1 = {10.0, 12.0, 15.0, 14.0, 16.0};
    std::vector<double> seq2 = {10.0, 12.0, 15.0, 14.0, 16.0};

    double distance = forecaster.computeDTW(seq1, seq2);
    assert(std::abs(distance - 0.0) < 1e-6);
    std::cout << "[PASS] testDTWIdentity (identical sequences have DTW distance 0)\n";
}

void testDTWSymmetryAndCost() {
    DPForecaster forecaster;
    std::vector<double> seq1 = {1.0, 2.0, 3.0};
    std::vector<double> seq2 = {2.0, 3.0, 4.0};

    double d1 = forecaster.computeDTW(seq1, seq2);
    double d2 = forecaster.computeDTW(seq2, seq1);

    assert(std::abs(d1 - d2) < 1e-6);
    assert(d1 > 0.0);
    std::cout << "[PASS] testDTWSymmetryAndCost (symmetric distance)\n";
}

void testEvaluationMetrics() {
    std::vector<double> actual = {100.0, 105.0, 110.0};
    std::vector<double> predicted = {102.0, 103.0, 112.0};

    // Errors: |100-102|=2, |105-103|=2, |110-112|=2
    // MAE = (2 + 2 + 2) / 3 = 2.0
    // MAPE = (2/100 + 2/105 + 2/110) * 100 / 3
    EvaluationMetrics metrics = Evaluator::calculateMetrics(actual, predicted, 98.0);

    assert(std::abs(metrics.mae - 2.0) < 1e-4);
    assert(metrics.mape > 0.0);
    assert(metrics.rmse > 0.0);
    std::cout << "[PASS] testEvaluationMetrics (MAE, MAPE, RMSE accuracy)\n";
}

void testCSVReading() {
    DataReader reader;
    std::vector<StockRecord> records = reader.readCSV("data/sample_stock_data.csv");

    assert(!records.empty());
    assert(records.size() >= 50);
    assert(records[0].closePrice > 0.0);
    std::cout << "[PASS] testCSVReading (read " << records.size() << " records)\n";
}

int main() {
    std::cout << "Running Stock Price Predictor Unit Tests...\n";
    testDTWIdentity();
    testDTWSymmetryAndCost();
    testEvaluationMetrics();
    testCSVReading();
    std::cout << "All Unit Tests Passed Successfully!\n";
    return 0;
}
