import yfinance as yf
import pandas as pd

def get_stock_data(symbol):
    df = yf.download(symbol, period="1y")

    df.reset_index(inplace=True)

    # CLEANING
    df.dropna(inplace=True)

    # METRICS
    df["Daily Return"] = (df["Close"] - df["Open"]) / df["Open"]
    df["MA7"] = df["Close"].rolling(7).mean()
    df["Volatility"] = df["Close"].pct_change().rolling(7).std()

    return df