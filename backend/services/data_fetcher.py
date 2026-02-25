import time
import logging
import math
import requests
from datetime import datetime
from typing import Optional, Dict, Any, List

import yfinance as yf
from sqlalchemy.orm import Session

from models.stock import Stock
from models.financial import Financial
from services.ticker_lists import detect_market
from config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 4
RETRY_BACKOFF = [10, 30, 60, 120]


def _safe_get(info: dict, key: str, default=None):
    val = info.get(key, default)
    if val is None:
        return default
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return default
    return val


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        v = float(val)
        if math.isnan(v) or math.isinf(v):
            return None
        return int(v)
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        v = float(val)
        if math.isnan(v) or math.isinf(v):
            return None
        return round(v, 4)
    except (ValueError, TypeError):
        return None


def _extract_field(df, row_name, col):
    if df is not None and not df.empty and col in df.columns and row_name in df.index:
        return _safe_int(df.at[row_name, col])
    return None


def _fetch_yf_ticker(ticker: str, max_retries: int = MAX_RETRIES):
    for attempt in range(max_retries):
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            if info and len(info) > 5:
                return stock, info
            logger.warning(f"{ticker}: Empty info on attempt {attempt + 1}")
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "Too Many" in err_str:
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                logger.warning(f"{ticker}: Rate limited (429), retrying in {wait}s (attempt {attempt + 1})")
                time.sleep(wait)
                continue
            raise
        if attempt < max_retries - 1:
            time.sleep(RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)])
    return None, {}


def fetch_stock_info(ticker: str) -> Optional[Dict[str, Any]]:
    from services import fmp_fetcher
    from services import yq_fetcher

    try:
        stock, info = _fetch_yf_ticker(ticker)

        if info and (info.get("regularMarketPrice") is not None or info.get("currentPrice") is not None):
            market = detect_market(ticker)
            logger.info(f"{ticker}: Fetched profile via yFinance")
            return {
                "ticker": ticker,
                "name": _safe_get(info, "longName") or _safe_get(info, "shortName", ticker),
                "sector": _safe_get(info, "sector"),
                "industry": _safe_get(info, "industry"),
                "market": market,
                "market_cap": _safe_int(_safe_get(info, "marketCap")),
                "current_price": _safe_float(
                    _safe_get(info, "currentPrice") or _safe_get(info, "regularMarketPrice")
                ),
                "pe_ratio": _safe_float(_safe_get(info, "trailingPE")),
                "pb_ratio": _safe_float(_safe_get(info, "priceToBook")),
                "dividend_yield": _safe_float(_safe_get(info, "dividendYield")),
                "beta": _safe_float(_safe_get(info, "beta")),
                "fifty_two_week_high": _safe_float(_safe_get(info, "fiftyTwoWeekHigh")),
                "fifty_two_week_low": _safe_float(_safe_get(info, "fiftyTwoWeekLow")),
                "shares_outstanding": _safe_int(_safe_get(info, "sharesOutstanding")),
                "currency": _safe_get(info, "currency", "USD" if market == "US" else "INR"),
            }
        else:
            logger.warning(f"{ticker}: No valid info from yFinance, trying yahooquery")
    except Exception as e:
        logger.warning(f"{ticker}: yFinance profile failed - {e}, trying yahooquery")

    try:
        data = yq_fetcher.fetch_profile(ticker)
        if data and data.get("current_price"):
            logger.info(f"{ticker}: Fetched profile via yahooquery (fallback)")
            return data
    except Exception as e:
        logger.warning(f"{ticker}: yahooquery profile failed - {e}, trying FMP")

    if fmp_fetcher.is_available():
        try:
            data = fmp_fetcher.fetch_profile(ticker)
            if data and data.get("current_price"):
                logger.info(f"{ticker}: Fetched profile via FMP (fallback)")
                return data
        except Exception as e:
            logger.error(f"{ticker}: FMP fallback also failed - {e}")

    logger.error(f"{ticker}: All sources failed")
    return None


def fetch_live_price(ticker: str) -> Optional[Dict[str, Any]]:
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        if not info:
            return None

        price = info.get("currentPrice") or info.get("regularMarketPrice")
        if price is None:
            return None

        return {
            "current_price": float(price),
            "market_cap": _safe_int(info.get("marketCap")),
            "pe_ratio": _safe_float(info.get("trailingPE")),
            "pb_ratio": _safe_float(info.get("priceToBook")),
        }
    except Exception as e:
        logger.warning(f"{ticker}: Live price fetch failed - {e}")
        return None


def fetch_financials(ticker: str) -> List[Dict[str, Any]]:
    from services import fmp_fetcher
    from services import yq_fetcher

    results = []
    try:
        stock, _ = _fetch_yf_ticker(ticker)
        if stock is None:
            logger.warning(f"{ticker}: Could not fetch ticker after retries")
        else:
            income_stmt = stock.financials
            balance_sheet = stock.balance_sheet
            cash_flow = stock.cashflow

            if income_stmt is not None and not income_stmt.empty:
                years_available = income_stmt.columns
                prev_revenue = None

                for col in years_available:
                    year = col.year if hasattr(col, "year") else int(str(col)[:4])

                    revenue = _extract_field(income_stmt, "Total Revenue", col)
                    cost_of_rev = _extract_field(income_stmt, "Cost Of Revenue", col)
                    gross_profit = _extract_field(income_stmt, "Gross Profit", col)
                    op_income = _extract_field(income_stmt, "Operating Income", col)
                    net_income = _extract_field(income_stmt, "Net Income", col)
                    ebitda = _extract_field(income_stmt, "EBITDA", col)

                    total_assets = _extract_field(balance_sheet, "Total Assets", col)
                    total_liab = _extract_field(balance_sheet, "Total Liabilities Net Minority Interest", col)
                    total_equity = _extract_field(balance_sheet, "Stockholders Equity", col)
                    if total_equity is None:
                        total_equity = _extract_field(balance_sheet, "Total Equity Gross Minority Interest", col)
                    total_debt = _extract_field(balance_sheet, "Total Debt", col)
                    cash = _extract_field(balance_sheet, "Cash And Cash Equivalents", col)
                    current_assets = _extract_field(balance_sheet, "Current Assets", col)
                    current_liab = _extract_field(balance_sheet, "Current Liabilities", col)

                    op_cf = _extract_field(cash_flow, "Operating Cash Flow", col)
                    capex = _extract_field(cash_flow, "Capital Expenditure", col)
                    if op_cf is not None and capex is not None:
                        fcf = op_cf + capex
                    else:
                        fcf = _extract_field(cash_flow, "Free Cash Flow", col)

                    shares = _extract_field(income_stmt, "Diluted Average Shares", col)
                    eps = _safe_float(net_income / shares) if net_income and shares else None
                    rev_growth = _safe_float((revenue - prev_revenue) / abs(prev_revenue)) if revenue and prev_revenue and prev_revenue != 0 else None
                    net_margin = _safe_float(net_income / revenue) if net_income and revenue and revenue != 0 else None
                    roe = _safe_float(net_income / total_equity) if net_income and total_equity and total_equity != 0 else None
                    debt_to_eq = _safe_float(total_debt / total_equity) if total_debt is not None and total_equity and total_equity != 0 else None
                    curr_ratio = _safe_float(current_assets / current_liab) if current_assets and current_liab and current_liab != 0 else None

                    roic = None
                    if op_income and total_equity and total_debt is not None:
                        invested_capital = total_equity + total_debt
                        if invested_capital > 0:
                            nopat = op_income * 0.75
                            roic = _safe_float(nopat / invested_capital)

                    prev_revenue = revenue

                    results.append({
                        "ticker": ticker,
                        "year": year,
                        "revenue": revenue,
                        "cost_of_revenue": cost_of_rev,
                        "gross_profit": gross_profit,
                        "operating_income": op_income,
                        "net_income": net_income,
                        "ebitda": ebitda,
                        "eps": eps,
                        "total_assets": total_assets,
                        "total_liabilities": total_liab,
                        "total_equity": total_equity,
                        "total_debt": total_debt,
                        "cash_and_equivalents": cash,
                        "current_assets": current_assets,
                        "current_liabilities": current_liab,
                        "operating_cash_flow": op_cf,
                        "capex": capex,
                        "free_cash_flow": fcf,
                        "shares_outstanding": shares,
                        "revenue_growth": rev_growth,
                        "net_margin": net_margin,
                        "roe": roe,
                        "roic": roic,
                        "debt_to_equity": debt_to_eq,
                        "current_ratio": curr_ratio,
                    })

    except Exception as e:
        logger.error(f"{ticker}: yFinance financials failed - {e}")

    if not results:
        try:
            results = yq_fetcher.fetch_financials(ticker)
            if results:
                logger.info(f"{ticker}: Fetched {len(results)} years of financials via yahooquery (fallback)")
                return results
        except Exception as e:
            logger.warning(f"{ticker}: yahooquery financials fallback failed - {e}, trying FMP")

    if not results and fmp_fetcher.is_available():
        try:
            data = fmp_fetcher.fetch_financials(ticker)
            if data:
                logger.info(f"{ticker}: Fetched {len(data)} years of financials via FMP (fallback)")
                return data
        except Exception as e:
            logger.warning(f"{ticker}: FMP financials fallback also failed - {e}")

    return results


def store_stock(db: Session, data: Dict[str, Any]):
    existing = db.query(Stock).filter(Stock.ticker == data["ticker"]).first()
    if existing:
        for key, val in data.items():
            setattr(existing, key, val)
        existing.last_updated = datetime.utcnow()
    else:
        db.add(Stock(**data, last_updated=datetime.utcnow()))
    db.commit()


def store_financials(db: Session, records: List[Dict[str, Any]]):
    for record in records:
        existing = db.query(Financial).filter(
            Financial.ticker == record["ticker"],
            Financial.year == record["year"],
        ).first()
        if existing:
            for key, val in record.items():
                setattr(existing, key, val)
        else:
            db.add(Financial(**record))
    db.commit()


def fetch_and_store(db: Session, ticker: str) -> bool:
    info = fetch_stock_info(ticker)
    if info:
        store_stock(db, info)
    else:
        logger.warning(f"{ticker}: Skipping, no info available")
        return False

    financials = fetch_financials(ticker)
    if financials:
        store_financials(db, financials)
    else:
        logger.warning(f"{ticker}: No financial data (stock info saved)")

    return True
