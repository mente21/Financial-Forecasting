# Financial Forecasting with Dynamic Programming

## Project Description
A C++ application that uses Dynamic Programming techniques to analyze historical stock prices and forecast future prices.

## Project Objectives
- Load historical stock price data from CSV files.
- Apply a Dynamic Programming-based forecasting algorithm.
- Predict future stock prices.
- Evaluate prediction accuracy using MAE and MAPE.
- Explain the algorithm's effectiveness and data structures.

## Technologies
- C++ (Dynamic Time Warping / Dynamic Programming Core)
- Node.js (Zero-dependency HTTP Bridge Layer)
- HTML5, Modern JavaScript (ES6+), Tailwind CSS
- Chart.js (Interactive Financial Data Visualization)
- Git and GitHub
- CSV files

## Web Interface & Architecture
The system features a web analytics dashboard (`feature/web-gui`) that directly interfaces with the underlying C++ Dynamic Programming engine without rewriting or altering any forecasting math.

### Architecture Overview
1. **Frontend**: HTML5, Tailwind CSS, Chart.js, and vanilla JavaScript (`public/`). Recreates the modern fintech card dashboard aesthetic with real-time responsive time-series charts.
2. **Backend Bridge**: Lightweight zero-dependency Node.js bridge (`server.js`) that invokes `StockPricePredictor.exe` via child process execution, parses stdout into structured JSON, and serves the REST API.
3. **C++ Core Engine**: `StockPricePredictor.exe` compiled from `src/algorithm/forecasting.cpp`, `src/evaluation/evaluation.cpp`, and `src/data/datareader.cpp`. Executes DTW $O(M \cdot N)$ pattern alignment, out-of-sample backtesting, and forward projections.

### Quick Start (Web Dashboard)
To launch the modern web interface:
```bash
# 1. Start the local server
npm start
# or: node server.js

# 2. Open in your browser
http://localhost:3000
```

### Running Tests
```bash
# Run C++ Unit Tests
.\run_tests.exe

# Run Node.js C++ Bridge & E2E Tests
npm test
```

## Team Collaboration
All team members are expected to contribute through branches, commits, pull requests, code reviews, and testing.

## Project Structure
- `src/data/` – Historical stock data management.
- `src/algorithm/` – Forecasting algorithm.
- `src/evaluation/` – Prediction evaluation.
- `data/` – Historical stock datasets.
- `tests/` – Program testing.
- `docs/` – Project documentation.
