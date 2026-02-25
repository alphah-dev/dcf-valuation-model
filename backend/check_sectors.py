from database import SessionLocal
from models.stock import Stock

db = SessionLocal()

tickers = ["RELIANCE.NS", "SNAP", "YESBANK.NS", "LICI.NS"]
import json

results = {}
for ticker in tickers:
    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if stock:
        results[ticker] = {"Sector": stock.sector, "Industry": stock.industry}
    else:
        results[ticker] = "Not found in DB"

with open("sectors.json", "w") as f:
    json.dump(results, f, indent=4)
