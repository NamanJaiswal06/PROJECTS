def get_summary(df):
    return {
        "52_week_high": float(df["High"].max()),
        "52_week_low": float(df["Low"].min()),
        "avg_close": float(df["Close"].mean())
    }