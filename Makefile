CXX ?= g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -Isrc

SRC = src/data/datareader.cpp src/algorithm/forecasting.cpp src/evaluation/evaluation.cpp
MAIN_SRC = src/main.cpp $(SRC)
TEST_SRC = tests/test_forecast.cpp $(SRC)

TARGET = StockPricePredictor
TEST_TARGET = run_tests

all: $(TARGET) $(TEST_TARGET)

$(TARGET): $(MAIN_SRC)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(MAIN_SRC)

$(TEST_TARGET): $(TEST_SRC)
	$(CXX) $(CXXFLAGS) -o $(TEST_TARGET) $(TEST_SRC)

test: $(TEST_TARGET)
	./$(TEST_TARGET)

clean:
	rm -f $(TARGET) $(TEST_TARGET) *.o
