#include <iostream>
#include <fstream>
#include <cassert>
#include <cmath>
#include <vector>
#include <string>
#include <cstdio>
#include "../src/data/datareader.h"
#include "../src/algorithm/forecasting.h"
#include "../src/evaluation/evaluation.h"

// Helper to write temporary files
void createTempCSV(const std::string& filename, const std::string& content) {
    std::ofstream out(filename);
    out << content;
    out.close();
}

// -------------------------------------------------------------
// Existing Algorithms & Model Unit Tests
// -------------------------------------------------------------
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

    EvaluationMetrics metrics = Evaluator::calculateMetrics(actual, predicted, 98.0);

    assert(std::abs(metrics.mae - 2.0) < 1e-4);
    assert(metrics.mape > 0.0);
    assert(metrics.rmse > 0.0);
    std::cout << "[PASS] testEvaluationMetrics (MAE, MAPE, RMSE accuracy)\n";
}

// -------------------------------------------------------------
// New CSV Validation Unit Tests
// -------------------------------------------------------------

/**
 * @brief Test Requirement: Test a valid CSV file.
 */
void testValidCSVFile() {
    DataReader reader;
    // 1. Test reading project sample stock data
    std::vector<StockRecord> records = reader.readCSV("data/sample_stock_data.csv");
    assert(!records.empty());
    assert(records.size() == 60);
    assert(reader.getErrors().empty());
    for (const auto& r : records) {
        assert(r.isValid());
        assert(r.closePrice > 0.0);
        assert(!r.date.empty());
    }

    // 2. Test reading a custom generated valid CSV file
    const std::string tempFile = "temp_valid_test.csv";
    std::string csvContent =
        "Date,Open,High,Low,Close,Volume\n"
        "2024-01-02,150.0,155.0,149.0,154.0,1000000\n"
        "2024-01-03,154.0,158.0,153.0,157.5,1200000\n"
        "2024-01-04,157.0,160.0,156.0,159.0,1100000\n";
    createTempCSV(tempFile, csvContent);

    DataReader customReader;
    std::vector<StockRecord> customRecords = customReader.readCSV(tempFile);
    std::remove(tempFile.c_str());

    assert(customRecords.size() == 3);
    assert(customRecords[0].date == "2024-01-02");
    assert(customRecords[0].closePrice == 154.0);
    assert(customRecords[1].date == "2024-01-03");
    assert(customRecords[1].closePrice == 157.5);
    assert(customRecords[2].date == "2024-01-04");
    assert(customRecords[2].closePrice == 159.0);
    assert(customReader.getErrors().empty());

    std::cout << "[PASS] testValidCSVFile (successfully loaded and verified valid CSV records)\n";
}

/**
 * @brief Test Requirement: Test a missing CSV file.
 */
void testMissingCSVFile() {
    DataReader reader;
    const std::string missingFile = "data/non_existent_file_12345.csv";
    std::vector<StockRecord> records = reader.readCSV(missingFile);

    // Records must be empty and errors must be reported without crashing
    assert(records.empty());
    assert(!reader.getErrors().empty());
    bool foundMissingMessage = false;
    for (const auto& err : reader.getErrors()) {
        if (err.find("Unable to open data file") != std::string::npos) {
            foundMissingMessage = true;
            break;
        }
    }
    assert(foundMissingMessage);

    std::cout << "[PASS] testMissingCSVFile (handled missing file gracefully without crashing)\n";
}

/**
 * @brief Test Requirement: Test invalid date formats.
 */
void testInvalidDateFormats() {
    // 1. Direct unit checks on helper isValidDate
    std::string reason;
    assert(DataReader::isValidDate("2024-01-15", &reason) == true);
    assert(DataReader::isValidDate("2024-02-29", &reason) == true); // 2024 is leap year
    assert(DataReader::isValidDate("2023-02-29", &reason) == false); // 2023 is not leap year
    assert(DataReader::isValidDate("2024-04-31", &reason) == false); // April has 30 days
    assert(DataReader::isValidDate("2024-13-01", &reason) == false); // Month 13 invalid
    assert(DataReader::isValidDate("2024-00-10", &reason) == false); // Month 00 invalid
    assert(DataReader::isValidDate("01-02-2024", &reason) == false); // DD-MM-YYYY invalid
    assert(DataReader::isValidDate("2024/01/02", &reason) == false); // Slashes invalid
    assert(DataReader::isValidDate("2024-1-2", &reason) == false);   // Missing leading zeros
    assert(DataReader::isValidDate("invalid-date", &reason) == false);

    // 2. CSV parsing with invalid dates
    const std::string tempFile = "temp_invalid_dates.csv";
    std::string csvContent =
        "Date,Open,High,Low,Close,Volume\n"
        "2024-01-02,150.0,155.0,149.0,152.0,1000000\n"       // Valid (Row 2)
        "2024/01/03,151.0,156.0,150.0,153.0,1000000\n"       // Invalid format slash (Row 3)
        "04-01-2024,152.0,157.0,151.0,154.0,1000000\n"       // Invalid order DD-MM-YYYY (Row 4)
        "2024-02-30,153.0,158.0,152.0,155.0,1000000\n"       // Invalid day Feb 30 (Row 5)
        "2024-13-01,154.0,159.0,153.0,156.0,1000000\n"       // Invalid month 13 (Row 6)
        "not-a-date,155.0,160.0,154.0,157.0,1000000\n"       // Completely non-date (Row 7)
        "2024-01-08,156.0,161.0,155.0,158.0,1000000\n";      // Valid (Row 8)
    createTempCSV(tempFile, csvContent);

    DataReader reader;
    std::vector<StockRecord> records = reader.readCSV(tempFile);
    std::remove(tempFile.c_str());

    // Only the 2 valid rows must be accepted
    assert(records.size() == 2);
    assert(records[0].date == "2024-01-02");
    assert(records[1].date == "2024-01-08");

    // Check that error messages were logged for rows 3, 4, 5, 6, 7
    assert(reader.getErrors().size() == 5);
    for (const auto& err : reader.getErrors()) {
        assert(err.find("invalid date format") != std::string::npos);
    }

    std::cout << "[PASS] testInvalidDateFormats (filtered out all invalid dates and reported errors)\n";
}

/**
 * @brief Test Requirement: Test negative and non-numeric prices.
 */
void testNegativeAndNonNumericPrices() {
    // 1. Direct unit checks on helper parsePositivePrice
    double val = 0.0;
    std::string reason;
    assert(DataReader::parsePositivePrice("150.25", val, &reason) == true && std::abs(val - 150.25) < 1e-6);
    assert(DataReader::parsePositivePrice("0.01", val, &reason) == true && std::abs(val - 0.01) < 1e-6);
    assert(DataReader::parsePositivePrice("-10.5", val, &reason) == false); // Negative
    assert(DataReader::parsePositivePrice("0.0", val, &reason) == false);   // Zero
    assert(DataReader::parsePositivePrice("-0.0", val, &reason) == false);  // Zero
    assert(DataReader::parsePositivePrice("abc", val, &reason) == false);   // Non-numeric
    assert(DataReader::parsePositivePrice("$150", val, &reason) == false);  // Non-numeric symbol
    assert(DataReader::parsePositivePrice("150.5.5", val, &reason) == false); // Malformed float
    assert(DataReader::parsePositivePrice("150abc", val, &reason) == false); // Trailing chars

    // 2. CSV parsing with negative and non-numeric prices
    const std::string tempFile = "temp_invalid_prices.csv";
    std::string csvContent =
        "Date,Open,High,Low,Close,Volume\n"
        "2024-01-02,150.0,155.0,149.0,152.0,1000000\n"       // Valid (Row 2)
        "2024-01-03,151.0,156.0,150.0,-153.0,1000000\n"      // Negative close price (Row 3)
        "2024-01-04,152.0,157.0,151.0,0.0,1000000\n"         // Zero close price (Row 4)
        "2024-01-05,153.0,158.0,152.0,N/A,1000000\n"         // Non-numeric close price N/A (Row 5)
        "2024-01-06,154.0,159.0,153.0,$155.00,1000000\n"     // Non-numeric currency close price (Row 6)
        "2024-01-07,-150.0,160.0,154.0,156.0,1000000\n"      // Negative open price (Row 7)
        "2024-01-08,155.0,140.0,150.0,157.0,1000000\n"       // High price < Low price (Row 8)
        "2024-01-09,157.0,162.0,156.0,159.0,1000000\n";      // Valid (Row 9)
    createTempCSV(tempFile, csvContent);

    DataReader reader;
    std::vector<StockRecord> records = reader.readCSV(tempFile);
    std::remove(tempFile.c_str());

    // Only rows 2 and 9 should be accepted
    assert(records.size() == 2);
    assert(records[0].date == "2024-01-02");
    assert(records[0].closePrice == 152.0);
    assert(records[1].date == "2024-01-09");
    assert(records[1].closePrice == 159.0);

    // Errors recorded for rows 3, 4, 5, 6, 7, 8
    assert(reader.getErrors().size() == 6);

    std::cout << "[PASS] testNegativeAndNonNumericPrices (rejected negative and non-numeric prices)\n";
}

/**
 * @brief Test Requirement: Test missing values and empty rows.
 */
void testMissingValuesAndEmptyRows() {
    const std::string tempFile = "temp_missing_empty.csv";
    std::string csvContent =
        "Date,Open,High,Low,Close,Volume\n"
        "2024-01-02,150.0,155.0,149.0,152.0,1000000\n"       // Valid (Row 2)
        "\n"                                                  // Blank empty row (Row 3)
        "   \t  \r\n"                                         // Whitespace-only empty row (Row 4)
        ",,,,,\n"                                             // Row with commas but all empty cells (Row 5)
        ",151.0,156.0,150.0,153.0,1000000\n"                  // Missing date (Row 6)
        "2024-01-05,152.0,157.0,151.0,,1000000\n"             // Missing close price (Row 7)
        "2024-01-06,153.0\n"                                  // Insufficient columns (Row 8)
        "2024-01-07,154.0,159.0,153.0,156.0,1000000\n";      // Valid (Row 9)
    createTempCSV(tempFile, csvContent);

    DataReader reader;
    std::vector<StockRecord> records = reader.readCSV(tempFile);
    std::remove(tempFile.c_str());

    // Only rows 2 and 9 are valid
    assert(records.size() == 2);
    assert(records[0].date == "2024-01-02");
    assert(records[1].date == "2024-01-07");

    // Warnings logged for empty rows (rows 3, 4, 5)
    assert(reader.getWarnings().size() >= 3);
    for (const auto& w : reader.getWarnings()) {
        assert(w.find("empty row") != std::string::npos);
    }

    // Errors logged for missing date, missing close, and insufficient columns (rows 6, 7, 8)
    assert(reader.getErrors().size() == 3);

    std::cout << "[PASS] testMissingValuesAndEmptyRows (handled empty rows and missing fields cleanly)\n";
}

/**
 * @brief Test Requirement: Test missing required columns in CSV header.
 */
void testMissingRequiredHeaders() {
    // 1. Missing Close column in header
    const std::string tempNoClose = "temp_no_close.csv";
    createTempCSV(tempNoClose,
        "Date,Open,High,Low,Volume\n"
        "2024-01-02,150.0,155.0,149.0,1000000\n");

    DataReader reader1;
    std::vector<StockRecord> rec1 = reader1.readCSV(tempNoClose);
    std::remove(tempNoClose.c_str());
    assert(rec1.empty());
    assert(!reader1.getErrors().empty());
    assert(reader1.getErrors()[0].find("Closing Price (Close)") != std::string::npos);

    // 2. Missing Date column in header
    const std::string tempNoDate = "temp_no_date.csv";
    createTempCSV(tempNoDate,
        "Open,High,Low,Close,Volume\n"
        "150.0,155.0,149.0,152.0,1000000\n");

    DataReader reader2;
    std::vector<StockRecord> rec2 = reader2.readCSV(tempNoDate);
    std::remove(tempNoDate.c_str());
    assert(rec2.empty());
    assert(!reader2.getErrors().empty());
    assert(reader2.getErrors()[0].find("Date") != std::string::npos);

    std::cout << "[PASS] testMissingRequiredHeaders (rejected CSVs with missing required header columns)\n";
}

/**
 * @brief Test Requirement: Prevent invalid records from entering the forecasting algorithm.
 */
void testPreventInvalidRecordsEnteringForecasting() {
    const std::string mixedFile = "temp_mixed_forecasting.csv";
    std::string csvContent =
        "Date,Open,High,Low,Close,Volume\n"
        "2024-01-01,100.0,102.0,99.0,101.0,1000\n"
        "invalid-date,101.0,103.0,100.0,102.0,1000\n"
        "2024-01-03,102.0,104.0,101.0,-999.0,1000\n"
        ",,,,\n"
        "2024-01-04,103.0,105.0,102.0,104.0,1000\n"
        "2024-01-05,104.0,106.0,103.0,105.0,1000\n"
        "2024-01-06,105.0,107.0,104.0,106.0,1000\n"
        "2024-01-07,106.0,108.0,105.0,107.0,1000\n"
        "2024-01-08,107.0,109.0,106.0,108.0,1000\n"
        "2024-01-09,108.0,110.0,107.0,109.0,1000\n"
        "2024-01-10,109.0,111.0,108.0,110.0,1000\n"
        "2024-01-11,110.0,112.0,109.0,111.0,1000\n"
        "2024-01-12,111.0,113.0,110.0,112.0,1000\n"
        "2024-01-13,112.0,114.0,111.0,113.0,1000\n"
        "2024-01-14,113.0,115.0,112.0,114.0,1000\n"
        "2024-01-15,114.0,116.0,113.0,115.0,1000\n";
    createTempCSV(mixedFile, csvContent);

    DataReader reader;
    std::vector<StockRecord> records = reader.readCSV(mixedFile);
    std::remove(mixedFile.c_str());

    // 17 lines minus header = 16 rows: 3 invalid rows (invalid date, negative price, empty row), 13 valid rows
    assert(records.size() == 13);

    // Extract close prices
    std::vector<double> closePrices = DataReader::extractClosePrices(records);
    assert(closePrices.size() == 13);

    // Ensure all close prices entering the algorithm are strictly positive and finite
    for (double p : closePrices) {
        assert(p > 0.0);
        assert(!std::isnan(p));
        assert(!std::isinf(p));
    }

    // Pass to forecaster
    DPForecaster forecaster(5, 2, 1);
    ForecastResult result = forecaster.forecast(closePrices);

    assert(result.predictedPrices.size() == 2);
    for (double pred : result.predictedPrices) {
        assert(pred > 0.0);
        assert(!std::isnan(pred));
        assert(!std::isinf(pred));
    }

    std::cout << "[PASS] testPreventInvalidRecordsEnteringForecasting (forecasting ran safely with clean data)\n";
}

int main() {
    std::cout << "========================================================\n";
    std::cout << "      RUNNING COMPREHENSIVE STOCK PREDICTOR TESTS       \n";
    std::cout << "========================================================\n";

    // Original algorithm tests
    testDTWIdentity();
    testDTWSymmetryAndCost();
    testEvaluationMetrics();

    // Required CSV validation tests
    testValidCSVFile();
    testMissingCSVFile();
    testInvalidDateFormats();
    testNegativeAndNonNumericPrices();
    testMissingValuesAndEmptyRows();
    testMissingRequiredHeaders();
    testPreventInvalidRecordsEnteringForecasting();

    std::cout << "========================================================\n";
    std::cout << "      ALL UNIT AND VALIDATION TESTS PASSED (10/10)!     \n";
    std::cout << "========================================================\n";
    return 0;
}
