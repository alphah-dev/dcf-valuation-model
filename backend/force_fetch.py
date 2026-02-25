from services.data_fetcher import fetch_and_store
from database import SessionLocal

db = SessionLocal()
tickers = ["RELIANCE.NS", "SNAP", "YESBANK.NS", "LICI.NS"]

for ticker in tickers:
    print(f"Fetching {ticker}...")
    fetch_and_store(db, ticker)
    print(f"Finished {ticker}")
