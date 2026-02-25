import sys
import os
import time
import argparse
import logging
import math
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import yfinance as yf
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models.stock import Stock
from services.ticker_lists import get_all_tickers, get_nifty_tickers_with_suffix, NASDAQ_TICKERS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("daily_update")

DELAY = 2


def update_price(db: Session, ticker: str) -> bool:
    try:
        stock_record = db.query(Stock).filter(Stock.ticker == ticker).first()
        if not stock_record:
            return False

        yf_stock = yf.Ticker(ticker)
        info = yf_stock.info

        price = info.get("currentPrice") or info.get("regularMarketPrice")
        if price and not (isinstance(price, float) and math.isnan(price)):
            stock_record.current_price = round(float(price), 2)

        mcap = info.get("marketCap")
        if mcap and not (isinstance(mcap, float) and math.isnan(mcap)):
            stock_record.market_cap = int(mcap)

        pe = info.get("trailingPE")
        if pe and not (isinstance(pe, float) and math.isnan(pe)):
            stock_record.pe_ratio = round(float(pe), 2)

        stock_record.last_updated = datetime.utcnow()
        db.commit()
        return True

    except Exception as e:
        logger.error(f"{ticker}: price update failed - {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Daily price update")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--market", choices=["IN", "US"], default=None)
    parser.add_argument("--delay", type=float, default=DELAY)
    args = parser.parse_args()

    init_db()
    db = SessionLocal()

    if args.market == "IN":
        tickers = get_nifty_tickers_with_suffix()
    elif args.market == "US":
        tickers = list(NASDAQ_TICKERS)
    else:
        tickers = get_all_tickers()

    if args.limit:
        tickers = tickers[:args.limit]

    total = len(tickers)
    success = 0
    start = time.time()

    logger.info(f"Updating prices for {total} stocks (delay={args.delay}s)")

    for i, ticker in enumerate(tickers, 1):
        ok = update_price(db, ticker)
        if ok:
            success += 1
            logger.info(f"[{i}/{total}] {ticker}")
        else:
            logger.warning(f"[{i}/{total}] {ticker} - skipped")

        if i < total:
            time.sleep(args.delay)

    elapsed = time.time() - start
    logger.info(f"Done in {elapsed / 60:.1f}m - updated {success}/{total}")
    db.close()


if __name__ == "__main__":
    main()
