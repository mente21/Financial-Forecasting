cmake_minimum_required(VERSION 3.10)
project(StockPricePredictor LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(src)

# Main Application Executable
add_executable(StockPricePredictor
    src/main.cpp
    src/data/datareader.cpp
    src/algorithm/forecasting.cpp
    src/evaluation/evaluation.cpp
)

# Test Suite Executable
add_executable(run_tests
    tests/test_forecast.cpp
    src/data/datareader.cpp
    src/algorithm/forecasting.cpp
    src/evaluation/evaluation.cpp
)
