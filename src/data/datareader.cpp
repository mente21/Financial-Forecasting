#include "datareader.h"
#include <fstream>
#include <sstream>
#include <iostream>
#include <algorithm>
#include <cctype>

DataReader::DataReader() {}

std::string DataReader::trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n\"");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n\"");
    return str.substr(first, (last - first + 1));
}

std::vector<std::string> DataReader::splitCSVLine(const std::string& line) {
    std::vector<std::string> tokens;
    std::string token;
    bool inQuotes = false;

    for (char ch : line) {
        if (ch == '\"') {
            inQuotes = !inQuotes;
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

std::vector<StockRecord> DataReader::readCSV(const std::string& filepath) {
    std::vector<StockRecord> records;
    std::ifstream file(filepath);

    if (!file.is_open()) {
        std::cerr << "[Error] Unable to open data file: " << filepath << std::endl;
        return records;
    }

    std::string line;
    // Read header line
    if (!std::getline(file, line)) {
        std::cerr << "[Error] CSV file is empty: " << filepath << std::endl;
        return records;
    }

    std::vector<std::string> headers = splitCSVLine(line);
    int dateCol = -1, openCol = -1, highCol = -1, lowCol = -1, closeCol = -1, volCol = -1;

    for (size_t i = 0; i < headers.size(); ++i) {
        std::string h = headers[i];
        std::transform(h.begin(), h.end(), h.begin(), [](unsigned char c) { return std::tolower(c); });

        if (h == "date") dateCol = static_cast<int>(i);
        else if (h == "open") openCol = static_cast<int>(i);
        else if (h == "high") highCol = static_cast<int>(i);
        else if (h == "low") lowCol = static_cast<int>(i);
        else if (h == "close") closeCol = static_cast<int>(i);
        else if (h == "volume") volCol = static_cast<int>(i);
    }

    // Default indices if header matching wasn't complete
    if (dateCol == -1) dateCol = 0;
    if (openCol == -1) openCol = 1;
    if (highCol == -1) highCol = 2;
    if (lowCol == -1) lowCol = 3;
    if (closeCol == -1) closeCol = 4;
    if (volCol == -1) volCol = 5;

    int lineNum = 1;
    while (std::getline(file, line)) {
        lineNum++;
        if (line.empty()) continue;

        std::vector<std::string> cols = splitCSVLine(line);
        if (cols.size() < 5) continue;

        try {
            StockRecord record;
            record.date = (dateCol < static_cast<int>(cols.size())) ? cols[dateCol] : "";
            record.openPrice = (openCol < static_cast<int>(cols.size())) ? std::stod(cols[openCol]) : 0.0;
            record.highPrice = (highCol < static_cast<int>(cols.size())) ? std::stod(cols[highCol]) : 0.0;
            record.lowPrice = (lowCol < static_cast<int>(cols.size())) ? std::stod(cols[lowCol]) : 0.0;
            record.closePrice = (closeCol < static_cast<int>(cols.size())) ? std::stod(cols[closeCol]) : 0.0;
            record.volume = (volCol < static_cast<int>(cols.size()) && !cols[volCol].empty())
                                ? std::stoll(cols[volCol]) : 0;

            records.push_back(record);
        } catch (const std::exception& e) {
            std::cerr << "[Warning] Skipping row " << lineNum << ": parse error (" << e.what() << ")" << std::endl;
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
