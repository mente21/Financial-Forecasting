#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include "data/datareader.h"
#include "algorithm/forecasting.h"
#include "evaluation/evaluation.h"
#include <cmath>
void printDPTableDemo(DPForecaster& forecaster) {
    std::vector<double> sampleQuery = {100.0, 102.5, 101.0, 104.0, 106.0};
    std::vector<double> sampleTarget = {99.5, 101.8, 101.2, 103.5, 105.8};

    std::cout << "\n========================================================\n";
    std::cout << "  DYNAMIC PROGRAMMING (DTW) TABLE DEMONSTRATION (DAA)   \n";
    std::cout << "========================================================\n";
    std::cout << "Query Sequence  (m=5): ";
    for (double v : sampleQuery) std::cout << v << " ";
    std::cout << "\nTarget Sequence (n=5): ";
    for (double v : sampleTarget) std::cout << v << " ";
    std::cout << "\n\nDP Recurrence Relation:\n";
    std::cout << "  D(i, j) = |Q[i] - T[j]| + min(D(i-1, j), D(i, j-1), D(i-1, j-1))\n";
    std::cout << "  Time Complexity: O(M * N) | Space Complexity: O(M * N)\n\n";

    double distance = forecaster.computeDTW(sampleQuery, sampleTarget);
    const auto& dp = forecaster.getLastDPTable();

    std::cout << "Resulting DP Cost Matrix (n+1 x m+1):\n";
    std::cout << std::setw(8) << "i\\j";
    for (size_t j = 0; j <= sampleTarget.size(); ++j) {
        std::cout << std::setw(10) << ("j=" + std::to_string(j));
    }
    std::cout << "\n";

    for (size_t i = 0; i < dp.size(); ++i) {
        std::cout << std::setw(8) << ("i=" + std::to_string(i));
        for (size_t j = 0; j < dp[i].size(); ++j) {
            if (std::isinf(dp[i][j])) {
                std::cout << std::setw(10) << "INF";
            } else {
                std::cout << std::setw(10) << std::fixed << std::setprecision(2) << dp[i][j];
            }
        }
        std::cout << "\n";
    }
    std::cout << "--------------------------------------------------------\n";
    std::cout << "Optimal Alignment Distance D(5, 5) = " << std::fixed << std::setprecision(4) << distance << "\n";
    std::cout << "========================================================\n\n";
}

int main(int argc, char* argv[]) {
    std::cout << "********************************************************\n";
    std::cout << "*     FINANCIAL FORECASTING WITH DYNAMIC PROGRAMMING   *\n";
    std::cout << "*              Stock Price Predictor (DAA)             *\n";
    std::cout << "********************************************************\n";

    std::string csvPath = "data/sample_stock_data.csv";
    int windowSize = 10;
    int forecastHorizon = 5;
    int testSize = 5;
    int kNearest = 3;

    if (argc >= 2) csvPath = argv[1];
    if (argc >= 3) windowSize = std::stoi(argv[2]);
    if (argc >= 4) forecastHorizon = std::stoi(argv[3]);
    if (argc >= 5) testSize = std::stoi(argv[4]);

    DataReader reader;
    std::vector<StockRecord> records = reader.readCSV(csvPath);

    if (records.empty()) {
        std::cerr << "[Error] No data loaded from " << csvPath << ". Exiting.\n";
        return 1;
    }

    std::vector<double> closePrices = DataReader::extractClosePrices(records);
    std::vector<std::string> dates = DataReader::extractDates(records);

    std::cout << "\nSuccessfully loaded " << records.size() << " records from: " << csvPath << "\n";
    std::cout << "Date range: " << dates.front() << " to " << dates.back() << "\n";
    std::cout << "Parameters:\n";
    std::cout << "  - Pattern Window Size (M) : " << windowSize << " days\n";
    std::cout << "  - Forecast Horizon (H)    : " << forecastHorizon << " days\n";
    std::cout << "  - Top-K Similar Regimes   : " << kNearest << "\n";
    std::cout << "  - Backtest Validation Size: " << testSize << " days\n";

    DPForecaster forecaster(windowSize, forecastHorizon, kNearest);

    // 1. DAA DP Matrix Walkthrough Demo
    printDPTableDemo(forecaster);

    // 2. Backtesting Evaluation Mode
    std::cout << "Running Out-of-Sample Backtesting Validation...\n";
    ForecastResult backtestResult = forecaster.backtest(closePrices, testSize);

    double baselinePrice = closePrices[closePrices.size() - testSize - 1];
    EvaluationMetrics metrics = Evaluator::calculateMetrics(
        backtestResult.actualPrices,
        backtestResult.predictedPrices,
        baselinePrice
    );

    Evaluator::printReport(metrics, backtestResult);

    // 3. Future Forecasting (from the latest known price)
    std::cout << "\n========================================================\n";
    std::cout << "         FUTURE PRICE PROJECTION (FORWARD-LOOKING)      \n";
    std::cout << "========================================================\n";
    forecaster.setForecastHorizon(forecastHorizon);
    ForecastResult futureResult = forecaster.forecast(closePrices);

    std::cout << "Current Latest Price (" << dates.back() << "): $"
              << std::fixed << std::setprecision(2) << closePrices.back() << "\n\n";
    std::cout << std::left
              << std::setw(10) << "Day Ahead"
              << std::setw(20) << "Projected Price ($)"
              << std::setw(15) << "Expected Change"
              << "\n";
    std::cout << "--------------------------------------------------------\n";

    for (size_t i = 0; i < futureResult.predictedPrices.size(); ++i) {
        double pred = futureResult.predictedPrices[i];
        double pctChange = ((pred - closePrices.back()) / closePrices.back()) * 100.0;
        std::cout << std::left
                  << std::setw(10) << ("T+" + std::to_string(i + 1))
                  << std::setw(20) << std::fixed << std::setprecision(2) << pred
                  << std::setw(15) << (pctChange >= 0 ? "+" : "") + std::to_string(pctChange).substr(0, 5) + "%"
                  << "\n";
    }
    std::cout << "========================================================\n";

    return 0;
}
