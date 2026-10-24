# Stock Data Intelligence Dashboard

## Features
- Fetch stock data using yfinance
- Data cleaning & processing
- Metrics:
  - Daily Return
  - Moving Average (7 days)
  - Volatility
- REST APIs using FastAPI
- Frontend dashboard with Chart.js

## Setup

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload