#include "datareader.h"
#include <fstream>
#include <sstream>
#include <iostream>
#include <algorithm>
#include <cctype>
#include <cmath>
#include <stdexcept>

DataReader::DataReader() {}

std::string DataReader::trim(const std::string& str) {
    if (str.empty()) return "";
    size_t start = 0;
    // Skip UTF-8 BOM if present: 0xEF, 0xBB, 0xBF
    if (str.size() >= 3 &&
        static_cast<unsigned char>(str[0]) == 0xEF &&
        static_cast<unsigned char>(str[1]) == 0xBB &&
        static_cast<unsigned char>(str[2]) == 0xBF) {
        start = 3;
    }
    size_t first = str.find_first_not_of(" \t\r\n\"", start);
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n\"");
    return str.substr(first, (last - first + 1));
}

std::vector<std::string> DataReader::splitCSVLine(const std::string& line) {
    std::vector<std::string> tokens;
    std::string token;
    bool inQuotes = false;

    for (size_t i = 0; i < line.length(); ++i) {
        char ch = line[i];
        if (ch == '\"') {
            if (inQuotes && i + 1 < line.length() && line[i + 1] == '\"') {
                token += '\"';
                ++i; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch == ',' && !inQuotes) {
            tokens.push_back(trim(token));
            token.clear();
        } else {
            token += ch;
        }
    }
    tokens.push_back(trim(token));
    return tokens;
}

bool DataReader::isLeapYear(int year) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

int DataReader::daysInMonth(int year, int month) {
    switch (month) {
        case 1: case 3: case 5: case 7: case 8: case 10: case 12:
            return 31;
        case 4: case 6: case 9: case 11:
            return 30;
        case 2:
            return isLeapYear(year) ? 29 : 28;
        default:
            return 0;
    }
}

bool DataReader::isValidDate(const std::string& date, std::string* reason) {
    if (date.length() != 10) {
        if (reason) *reason = "length must be 10 characters (expected format: YYYY-MM-DD)";
        return false;
    }
    if (date[4] != '-' || date[7] != '-') {
        if (reason) *reason = "expected hyphen separators at positions 5 and 8 (YYYY-MM-DD)";
        return false;
    }
    for (int i = 0; i < 10; ++i) {
        if (i == 4 || i == 7) continue;
        if (!std::isdigit(static_cast<unsigned char>(date[i]))) {
            if (reason) *reason = "date contains non-digit characters";
            return false;
        }
    }

    int year = 0;
    int month = 0;
    int day = 0;
    try {
        year = std::stoi(date.substr(0, 4));
        month = std::stoi(date.substr(5, 2));
        day = std::stoi(date.substr(8, 2));
    } catch (...) {
        if (reason) *reason = "unable to parse date numbers";
        return false;
    }

    if (year < 1000 || year > 9999) {
        if (reason) *reason = "year " + std::to_string(year) + " out of valid range (1000-9999)";
        return false;
    }
    if (month < 1 || month > 12) {
        if (reason) *reason = "month " + std::to_string(month) + " out of range (01-12)";
        return false;
    }
    int maxDays = daysInMonth(year, month);
    if (day < 1 || day > maxDays) {
        if (reason) {
            *reason = "day " + std::to_string(day) + " invalid for month " +
                      std::to_string(month) + " (max days: " + std::to_string(maxDays) + ")";
        }
        return false;
    }

    return true;
}

bool DataReader::parsePositivePrice(const std::string& str, double& outVal, std::string* reason) {
    if (str.empty()) {
        if (reason) *reason = "value is empty";
        return false;
    }
    try {
        size_t idx = 0;
        double val = std::stod(str, &idx);
        while (idx < str.length() && (str[idx] == ' ' || str[idx] == '\t' || str[idx] == '\r')) {
            idx++;
        }
        if (idx != str.length()) {
            if (reason) *reason = "contains non-numeric characters: '" + str + "'";
            return false;
        }
        if (std::isnan(val) || std::isinf(val)) {
            if (reason) *reason = "value is NaN or Infinite";
            return false;
        }
        if (val <= 0.0) {
            if (reason) *reason = "price must be positive (> 0.0), found " + str;
            return false;
        }
        outVal = val;
        return true;
    } catch (const std::invalid_argument& e) {
        if (reason) *reason = "non-numeric value '" + str + "' (" + e.what() + ")";
        return false;
    } catch (const std::out_of_range& e) {
        if (reason) *reason = "value out of numerical range: '" + str + "' (" + e.what() + ")";
        return false;
    } catch (...) {
        if (reason) *reason = "unexpected error parsing price: '" + str + "'";
        return false;
    }
}

bool DataReader::parseNonNegativePrice(const std::string& str, double& outVal, std::string* reason) {
    if (str.empty()) {
        if (reason) *reason = "value is empty";
        return false;
    }
    try {
        size_t idx = 0;
        double val = std::stod(str, &idx);
        while (idx < str.length() && (str[idx] == ' ' || str[idx] == '\t' || str[idx] == '\r')) {
            idx++;
        }
        if (idx != str.length()) {
            if (reason) *reason = "contains non-numeric characters: '" + str + "'";
            return false;
        }
        if (std::isnan(val) || std::isinf(val)) {
            if (reason) *reason = "value is NaN or Infinite";
            return false;
        }
        if (val < 0.0) {
            if (reason) *reason = "price cannot be negative (>= 0.0), found " + str;
            return false;
        }
        outVal = val;
        return true;
    } catch (const std::invalid_argument& e) {
        if (reason) *reason = "non-numeric value '" + str + "' (" + e.what() + ")";
        return false;
    } catch (const std::out_of_range& e) {
        if (reason) *reason = "value out of numerical range: '" + str + "' (" + e.what() + ")";
        return false;
    } catch (...) {
        if (reason) *reason = "unexpected error parsing price: '" + str + "'";
        return false;
    }
}

bool DataReader::parseVolume(const std::string& str, long long& outVal, std::string* reason) {
    if (str.empty()) {
        outVal = 0;
        return true;
    }
    try {
        size_t idx = 0;
        long long val = std::stoll(str, &idx);
        while (idx < str.length() && (str[idx] == ' ' || str[idx] == '\t' || str[idx] == '\r')) {
            idx++;
        }
        if (idx != str.length()) {
            if (reason) *reason = "contains non-numeric characters: '" + str + "'";
            return false;
        }
        if (val < 0) {
            if (reason) *reason = "volume cannot be negative, found " + str;
            return false;
        }
        outVal = val;
        return true;
    } catch (const std::invalid_argument& e) {
        if (reason) *reason = "non-numeric volume '" + str + "' (" + e.what() + ")";
        return false;
    } catch (const std::out_of_range& e) {
        if (reason) *reason = "volume out of numerical range: '" + str + "' (" + e.what() + ")";
        return false;
    } catch (...) {
        if (reason) *reason = "unexpected error parsing volume: '" + str + "'";
        return false;
    }
}

void DataReader::logError(const std::string& msg) {
    errors_.push_back(msg);
    std::cerr << msg << std::endl;
}

void DataReader::logWarning(const std::string& msg) {
    warnings_.push_back(msg);
    std::cerr << msg << std::endl;
}

std::vector<StockRecord> DataReader::readCSV(const std::string& filepath) {
    clearLogs();
    std::vector<StockRecord> records;
    std::ifstream file(filepath);

    // 1. Validate file exists and can be opened
    if (!file.is_open()) {
        logError("[Error] Unable to open data file: " + filepath + " (File does not exist or permission denied).");
        return records;
    }

    std::string line;
    // 2. Read and validate header line
    if (!std::getline(file, line)) {
        logError("[Error] CSV file is empty: " + filepath);
        file.close();
        return records;
    }

    std::vector<std::string> headers = splitCSVLine(line);
    int dateCol = -1, openCol = -1, highCol = -1, lowCol = -1, closeCol = -1, volCol = -1;

    for (size_t i = 0; i < headers.size(); ++i) {
        std::string h = headers[i];
        std::transform(h.begin(), h.end(), h.begin(), [](unsigned char c) { return std::tolower(c); });

        if (h == "date") {
            dateCol = static_cast<int>(i);
        } else if (h == "open" || h == "opening price") {
            openCol = static_cast<int>(i);
        } else if (h == "high" || h == "high price") {
            highCol = static_cast<int>(i);
        } else if (h == "low" || h == "low price") {
            lowCol = static_cast<int>(i);
        } else if (h == "close" || h == "closing price" || h == "closing_price" || h == "adj close" || h == "adj_close") {
            closeCol = static_cast<int>(i);
        } else if (h == "volume" || h == "vol") {
            volCol = static_cast<int>(i);
        }
    }

    // 3. Ensure required columns (Date and Closing Price) exist in the header
    if (dateCol == -1 || closeCol == -1) {
        std::string missing;
        if (dateCol == -1) missing += "Date";
        if (closeCol == -1) {
            if (!missing.empty()) missing += ", ";
            missing += "Closing Price (Close)";
        }
        logError("[Error] CSV header missing required column(s): " + missing + " in file: " + filepath);
        file.close();
        return records;
    }

    int lineNum = 1;
    while (std::getline(file, line)) {
        lineNum++;

        // Detect empty rows (blank line or whitespace only)
        size_t nonWs = line.find_first_not_of(" \t\r\n");
        if (nonWs == std::string::npos) {
            logWarning("[Warning] Skipping row " + std::to_string(lineNum) + ": empty row.");
            continue;
        }

        std::vector<std::string> cols = splitCSVLine(line);

        // Detect empty rows where all cells are empty (e.g. ",,,,")
        bool allEmpty = true;
        for (const auto& c : cols) {
            if (!c.empty()) {
                allEmpty = false;
                break;
            }
        }
        if (allEmpty) {
            logWarning("[Warning] Skipping row " + std::to_string(lineNum) + ": empty row.");
            continue;
        }

        // Check required column bounds
        int maxRequiredCol = std::max(dateCol, closeCol);
        if (static_cast<int>(cols.size()) <= maxRequiredCol) {
            logError("[Error] Skipping row " + std::to_string(lineNum) +
                     ": insufficient columns (expected at least " + std::to_string(maxRequiredCol + 1) +
                     ", found " + std::to_string(cols.size()) + ").");
            continue;
        }

        // Validate Date column
        const std::string& dateStr = cols[dateCol];
        if (dateStr.empty()) {
            logError("[Error] Skipping row " + std::to_string(lineNum) +
                     ": missing required Date value.");
            continue;
        }
        std::string dateReason;
        if (!isValidDate(dateStr, &dateReason)) {
            logError("[Error] Skipping row " + std::to_string(lineNum) +
                     ": invalid date format '" + dateStr + "' (" + dateReason +
                     "). Expected format: YYYY-MM-DD.");
            continue;
        }

        // Validate Closing Price column
        const std::string& closeStr = cols[closeCol];
        if (closeStr.empty()) {
            logError("[Error] Skipping row " + std::to_string(lineNum) +
                     ": missing required Closing Price value.");
            continue;
        }
        double closeVal = 0.0;
        std::string priceReason;
        if (!parsePositivePrice(closeStr, closeVal, &priceReason)) {
            logError("[Error] Skipping row " + std::to_string(lineNum) +
                     ": invalid Closing Price '" + closeStr + "' (" + priceReason + ").");
            continue;
        }

        // Validate optional columns if present: Open, High, Low, Volume
        double openVal = 0.0;
        if (openCol != -1 && openCol < static_cast<int>(cols.size()) && !cols[openCol].empty()) {
            std::string openReason;
            if (!parsePositivePrice(cols[openCol], openVal, &openReason)) {
                logError("[Error] Skipping row " + std::to_string(lineNum) +
                         ": invalid Open Price '" + cols[openCol] + "' (" + openReason + ").");
                continue;
            }
        }

        double highVal = 0.0;
        if (highCol != -1 && highCol < static_cast<int>(cols.size()) && !cols[highCol].empty()) {
            std::string highReason;
            if (!parsePositivePrice(cols[highCol], highVal, &highReason)) {
                logError("[Error] Skipping row " + std::to_string(lineNum) +
                         ": invalid High Price '" + cols[highCol] + "' (" + highReason + ").");
                continue;
            }
        }

        double lowVal = 0.0;
        if (lowCol != -1 && lowCol < static_cast<int>(cols.size()) && !cols[lowCol].empty()) {
            std::string lowReason;
            if (!parsePositivePrice(cols[lowCol], lowVal, &lowReason)) {
                logError("[Error] Skipping row " + std::to_string(lineNum) +
                         ": invalid Low Price '" + cols[lowCol] + "' (" + lowReason + ").");
                continue;
            }
        }

        if (highVal > 0.0 && lowVal > 0.0 && highVal < lowVal) {
            logError("[Error] Skipping row " + std::to_string(lineNum) +
                     ": High Price (" + std::to_string(highVal) + ") is lower than Low Price (" +
                     std::to_string(lowVal) + ").");
            continue;
        }

        long long volVal = 0;
        if (volCol != -1 && volCol < static_cast<int>(cols.size()) && !cols[volCol].empty()) {
            std::string volReason;
            if (!parseVolume(cols[volCol], volVal, &volReason)) {
                logError("[Error] Skipping row " + std::to_string(lineNum) +
                         ": invalid Volume '" + cols[volCol] + "' (" + volReason + ").");
                continue;
            }
        }

        // Only valid records pass and enter the records list
        StockRecord record(dateStr, openVal, highVal, lowVal, closeVal, volVal);
        if (record.isValid()) {
            records.push_back(record);
        } else {
            logError("[Error] Skipping row " + std::to_string(lineNum) + ": record failed validity check.");
        }
    }

    file.close();
    return records;
}

std::vector<double> DataReader::extractClosePrices(const std::vector<StockRecord>& records) {
    std::vector<double> prices;
    prices.reserve(records.size());
    for (const auto& rec : records) {
        prices.push_back(rec.closePrice);
    }
    return prices;
}

std::vector<std::string> DataReader::extractDates(const std::vector<StockRecord>& records) {
    std::vector<std::string> dates;
    dates.reserve(records.size());
    for (const auto& rec : records) {
        dates.push_back(rec.date);
    }
    return dates;
}
