#ifndef DATAREADER_H
#define DATAREADER_H

#include "stockdata.h"
#include <string>
#include <vector>

/**
 * @brief Handles reading and parsing stock price time-series data from CSV files.
 */
class DataReader {
public:
    DataReader();

    /**
     * @brief Reads stock records from a CSV file.
     * Expected CSV headers (case-insensitive): Date, Open, High, Low, Close, [Adj Close], Volume
     * @param filepath Path to the CSV file.
     * @return std::vector<StockRecord> Parsed records ordered chronologically.
     */
    std::vector<StockRecord> readCSV(const std::string& filepath);

    /**
     * @brief Extracts closing prices from a list of stock records.
     * @param records List of stock records.
     * @return std::vector<double> Closing prices in chronological order.
     */
    static std::vector<double> extractClosePrices(const std::vector<StockRecord>& records);

    /**
     * @brief Extracts dates from a list of stock records.
     * @param records List of stock records.
     * @return std::vector<std::string> Dates in chronological order.
     */
    static std::vector<std::string> extractDates(const std::vector<StockRecord>& records);

private:
    std::string trim(const std::string& str);
    std::vector<std::string> splitCSVLine(const std::string& line);
};

#endif // DATAREADER_H
