import yfinance as yf
import json

def fetch_q():
    inc = yf.Ticker('RELIANCE.NS').quarterly_income_stmt
    if inc.empty:
        print("EMPTY")
        return
    res = []
    for col in list(inc.columns)[:8]:
        res.append({
            "date": str(col)[:7],
            "revenue": inc.loc["Total Revenue", col] if "Total Revenue" in inc.index else None,
            "operating_income": inc.loc["Operating Income", col] if "Operating Income" in inc.index else None,
            "net_income": inc.loc["Net Income", col] if "Net Income" in inc.index else None,
            "eps": inc.loc["Diluted EPS", col] if "Diluted EPS" in inc.index else None
        })
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    fetch_q()
