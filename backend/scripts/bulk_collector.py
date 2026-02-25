import sys
import os
import time
import argparse
import logging
import concurrent.futures
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, init_db
from services.data_fetcher import fetch_and_store
from services.ticker_lists import (
    get_nifty_tickers_with_suffix,
    NASDAQ_TICKERS,
    get_all_tickers,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("collector")

FAILED_FILE = os.path.join(os.path.dirname(__file__), "..", "failed_tickers.txt")
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "..", "collector_progress.txt")
DELAY_SECONDS = 0.5


def load_failed_tickers() -> list:
    if not os.path.exists(FAILED_FILE):
        return []
    with open(FAILED_FILE, "r") as f:
        return [line.strip() for line in f if line.strip()]


def save_failed_ticker(ticker: str):
    with open(FAILED_FILE, "a") as f:
        f.write(f"{ticker}\n")


def clear_failed():
    if os.path.exists(FAILED_FILE):
        os.remove(FAILED_FILE)


def load_progress() -> int:
    if not os.path.exists(PROGRESS_FILE):
        return 0
    try:
        with open(PROGRESS_FILE, "r") as f:
            return int(f.read().strip())
    except:
        return 0


def save_progress(index: int):
    with open(PROGRESS_FILE, "w") as f:
        f.write(str(index))


def run_single_ticker(ticker: str) -> bool:
    db = SessionLocal()
    try:
        ok = fetch_and_store(db, ticker)
        return ok
    except Exception as e:
        logger.error(f"{ticker}: Unhandled error in thread - {e}")
        return False
    finally:
        db.close()


def run(tickers: list, delay: float = DELAY_SECONDS, resume: bool = False, workers: int = 5):
    init_db()

    total = len(tickers)
    start_index = load_progress() if resume else 0
    if start_index >= total:
        start_index = 0

    success = 0
    failed = 0
    start_time = time.time()
    
    tickers_to_process = tickers[start_index:]
    
    logger.info(f"Starting bulk collection for {len(tickers_to_process)} tickers ({workers} workers)")
    logger.info(f"Resuming from index {start_index}" if resume and start_index > 0 else "Starting fresh")
    logger.info("=" * 60)

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_ticker = {
            executor.submit(run_single_ticker, ticker): ticker 
            for ticker in tickers_to_process
        }
        
        for idx, future in enumerate(concurrent.futures.as_completed(future_to_ticker)):
            ticker = future_to_ticker[future]
            try:
                ok = future.result()
                if ok:
                    success += 1
                    logger.info(f"[{success+failed}/{len(tickers_to_process)}] {ticker} - OK")
                else:
                    failed += 1
                    save_failed_ticker(ticker)
                    logger.warning(f"[{success+failed}/{len(tickers_to_process)}] {ticker} - skipped (no data)")
            except Exception as exc:
                failed += 1
                save_failed_ticker(ticker)
                logger.error(f"[{success+failed}/{len(tickers_to_process)}] {ticker} generated an exception: {exc}")
                
            save_progress(start_index + success + failed)
            
            if delay > 0:
                time.sleep(delay)

    elapsed = time.time() - start_time
    logger.info("=" * 60)
    logger.info(f"Done in {elapsed / 60:.1f} minutes")
    logger.info(f"Success: {success}/{len(tickers_to_process)}")
    logger.info(f"Failed:  {failed}/{len(tickers_to_process)}")

    if failed > 0:
        logger.info(f"Failed tickers logged to: {FAILED_FILE}")
        logger.info(f"To retry: python scripts/bulk_collector.py --retry")

    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)


def main():
    parser = argparse.ArgumentParser(description="Bulk data collector for DCF platform")
    parser.add_argument("--limit", type=int, default=None, help="Max tickers to fetch")
    parser.add_argument("--market", choices=["IN", "US"], default=None, help="Filter by market")
    parser.add_argument("--retry", action="store_true", help="Retry previously failed tickers")
    parser.add_argument("--resume", action="store_true", help="Resume from where we left off")
    parser.add_argument("--delay", type=float, default=DELAY_SECONDS, help="Seconds delay between processed tasks")
    parser.add_argument("--workers", type=int, default=5, help="Number of concurrent threads")
    args = parser.parse_args()

    if args.retry:
        tickers = load_failed_tickers()
        if not tickers:
            logger.info("No failed tickers to retry")
            return
        clear_failed()
        logger.info(f"Retrying {len(tickers)} previously failed tickers")
    elif args.market == "IN":
        tickers = get_nifty_tickers_with_suffix()
    elif args.market == "US":
        tickers = list(NASDAQ_TICKERS)
    else:
        tickers = get_all_tickers()

    if args.limit:
        tickers = tickers[: args.limit]

    run(tickers, delay=args.delay, resume=args.resume, workers=args.workers)


if __name__ == "__main__":
    main()
