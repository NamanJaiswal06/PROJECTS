from fastapi import FastAPI
from app.data import get_stock_data
from app.utils import get_summary

app = FastAPI(title="Stock Intelligence API")

COMPANIES = ["AAPL", "MSFT", "TSLA", "INFY.NS", "TCS.NS"]

@app.get("/")
def home():
    return {"message": "API Running 🚀"}

# ✅ Required
@app.get("/companies")
def companies():
    return COMPANIES

# ✅ Required
@app.get("/data/{symbol}")
def stock_data(symbol: str):
    df = get_stock_data(symbol)
    return df.tail(30).to_dict(orient="records")

# ✅ Required
@app.get("/summary/{symbol}")
def summary(symbol: str):
    df = get_stock_data(symbol)
    return get_summary(df)

# ✅ Bonus
@app.get("/compare")
def compare(symbol1: str, symbol2: str):
    df1 = get_stock_data(symbol1)
    df2 = get_stock_data(symbol2)

    return {
        symbol1: df1["Close"].iloc[-1],
        symbol2: df2["Close"].iloc[-1]
    }