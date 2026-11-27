#ifndef DATAREADER_H
#define DATAREADER_H

#include "stockdata.h"
#include <string>
#include <vector>

/**
 * @brief Handles reading and parsing stock price time-series data from CSV files
 *        with comprehensive validation and error handling.
 */
class DataReader {
public:
    DataReader();

    /**
     * @brief Reads stock records from a CSV file.
     * Validates file existence, required headers (Date and Closing Price), date formats (YYYY-MM-DD),
     * positive numeric prices, empty rows, missing values, and corrupted records.
     * Invalid records are filtered out and logged, preventing them from entering forecasting.
     * 
     * @param filepath Path to the CSV file.
     * @return std::vector<StockRecord> Parsed valid records ordered chronologically.
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

    // Validation helper methods
    /**
     * @brief Validates if a date string strictly follows the YYYY-MM-DD format with valid calendar values.
     * @param date Date string to validate.
     * @param reason Optional pointer to receive failure explanation.
     * @return true if valid, false otherwise.
     */
    static bool isValidDate(const std::string& date, std::string* reason = nullptr);

    /**
     * @brief Validates and parses a strictly positive numeric price (> 0.0).
     * @param str String containing the price.
     * @param outVal Reference to store parsed double value.
     * @param reason Optional pointer to receive failure explanation.
     * @return true if valid positive numeric, false otherwise.
     */
    static bool parsePositivePrice(const std::string& str, double& outVal, std::string* reason = nullptr);

    /**
     * @brief Validates and parses a non-negative numeric price (>= 0.0).
     * @param str String containing the price.
     * @param outVal Reference to store parsed double value.
     * @param reason Optional pointer to receive failure explanation.
     * @return true if valid non-negative numeric, false otherwise.
     */
    static bool parseNonNegativePrice(const std::string& str, double& outVal, std::string* reason = nullptr);

    /**
     * @brief Validates and parses a non-negative volume integer (>= 0).
     * @param str String containing volume.
     * @param outVal Reference to store parsed long long value.
     * @param reason Optional pointer to receive failure explanation.
     * @return true if valid non-negative integer, false otherwise.
     */
    static bool parseVolume(const std::string& str, long long& outVal, std::string* reason = nullptr);

    /**
     * @brief Checks if a year is a leap year.
     */
    static bool isLeapYear(int year);

    /**
     * @brief Returns the number of days in a given month of a specific year.
     */
    static int daysInMonth(int year, int month);

    /**
     * @brief Gets recorded error messages from the last read operation.
     */
    const std::vector<std::string>& getErrors() const { return errors_; }

    /**
     * @brief Gets recorded warning messages from the last read operation.
     */
    const std::vector<std::string>& getWarnings() const { return warnings_; }

    /**
     * @brief Clears stored error and warning logs.
     */
    void clearLogs() { errors_.clear(); warnings_.clear(); }

private:
    std::string trim(const std::string& str);
    std::vector<std::string> splitCSVLine(const std::string& line);
    void logError(const std::string& msg);
    void logWarning(const std::string& msg);

    std::vector<std::string> errors_;
    std::vector<std::string> warnings_;
};

#endif // DATAREADER_H
