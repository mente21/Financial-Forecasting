#ifndef STOCKDATA_H
#define STOCKDATA_H

#include <string>
#include <vector>

/**
 * @brief Represents a single daily record of stock market data.
 */
struct StockRecord {
    std::string date;
    double openPrice;
    double highPrice;
    double lowPrice;
    double closePrice;
    long long volume;

    StockRecord()
        : date(""), openPrice(0.0), highPrice(0.0), lowPrice(0.0), closePrice(0.0), volume(0) {}

    StockRecord(const std::string& d, double o, double h, double l, double c, long long v)
        : date(d), openPrice(o), highPrice(h), lowPrice(l), closePrice(c), volume(v) {}
};

/**
 * @brief Represents a forecast result containing predicted prices and actual prices (if available).
 */
struct ForecastResult {
    std::vector<std::string> dates;
    std::vector<double> actualPrices;
    std::vector<double> predictedPrices;
    double dtwDistance;
    int matchedHistoricalStartIndex;
    int matchedHistoricalEndIndex;

    ForecastResult()
        : dtwDistance(0.0), matchedHistoricalStartIndex(-1), matchedHistoricalEndIndex(-1) {}
};

#endif // STOCKDATA_H
