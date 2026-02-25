import logging
import math
import time
from typing import Optional, Dict, Any, List

import httpx

from config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://financialmodelingprep.com/api/v3"
API_KEY = settings.FMP_API_KEY
REQUEST_TIMEOUT = 15


def _request(endpoint: str, params: dict = None) -> Optional[Any]:
    if not API_KEY:
        return None
    if params is None:
        params = {}
    params["apikey"] = API_KEY
    try:
        r = httpx.get(f"{BASE_URL}/{endpoint}", params=params, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            return r.json()
        logger.warning(f"FMP {endpoint}: HTTP {r.status_code}")
        return None
    except Exception as e:
        logger.error(f"FMP {endpoint}: {e}")
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


def fetch_profile(ticker: str) -> Optional[Dict[str, Any]]:
    data = _request(f"profile/{ticker}")
    if not data or not isinstance(data, list) or len(data) == 0:
        return None

    p = data[0]
    market = "IN" if ticker.endswith(".NS") or ticker.endswith(".BO") else "US"

    return {
        "ticker": ticker,
        "name": p.get("companyName"),
        "sector": p.get("sector"),
        "industry": p.get("industry"),
        "market": market,
        "market_cap": _safe_int(p.get("mktCap")),
        "current_price": _safe_float(p.get("price")),
        "pe_ratio": _safe_float(p.get("peRatio") if p.get("peRatio") else None),
        "pb_ratio": _safe_float(p.get("priceToBook") if p.get("priceToBook") else None),
        "dividend_yield": _safe_float(p.get("lastDiv") / p.get("price") if p.get("lastDiv") and p.get("price") else None),
        "beta": _safe_float(p.get("beta")),
        "fifty_two_week_high": _safe_float(p.get("range", "").split("-")[-1].strip() if p.get("range") else None),
        "fifty_two_week_low": _safe_float(p.get("range", "").split("-")[0].strip() if p.get("range") else None),
        "shares_outstanding": _safe_int(p.get("sharesOutstanding") if p.get("sharesOutstanding") else p.get("mktCap", 0) / p.get("price", 1) if p.get("price") else None),
        "currency": p.get("currency", "USD"),
    }


def fetch_financials(ticker: str) -> List[Dict[str, Any]]:
    income = _request(f"income-statement/{ticker}", {"period": "annual", "limit": 5})
    balance = _request(f"balance-sheet-statement/{ticker}", {"period": "annual", "limit": 5})
    cashflow = _request(f"cash-flow-statement/{ticker}", {"period": "annual", "limit": 5})

    if not income:
        return []

    balance_map = {}
    if balance:
        for b in balance:
            year = b.get("calendarYear") or str(b.get("date", ""))[:4]
            balance_map[year] = b

    cf_map = {}
    if cashflow:
        for c in cashflow:
            year = c.get("calendarYear") or str(c.get("date", ""))[:4]
            cf_map[year] = c

    results = []
    prev_revenue = None

    for item in income:
        year_str = item.get("calendarYear") or str(item.get("date", ""))[:4]
        try:
            year = int(year_str)
        except (ValueError, TypeError):
            continue

        revenue = _safe_int(item.get("revenue"))
        cost_of_rev = _safe_int(item.get("costOfRevenue"))
        gross_profit = _safe_int(item.get("grossProfit"))
        op_income = _safe_int(item.get("operatingIncome"))
        net_income = _safe_int(item.get("netIncome"))
        ebitda = _safe_int(item.get("ebitda"))
        eps = _safe_float(item.get("epsdiluted"))

        bs = balance_map.get(year_str, {})
        total_assets = _safe_int(bs.get("totalAssets"))
        total_liab = _safe_int(bs.get("totalLiabilities"))
        total_equity = _safe_int(bs.get("totalStockholdersEquity"))
        total_debt = _safe_int(bs.get("totalDebt"))
        cash = _safe_int(bs.get("cashAndCashEquivalents"))
        current_assets = _safe_int(bs.get("totalCurrentAssets"))
        current_liab = _safe_int(bs.get("totalCurrentLiabilities"))

        cf = cf_map.get(year_str, {})
        op_cf = _safe_int(cf.get("operatingCashFlow"))
        capex = _safe_int(cf.get("capitalExpenditure"))
        fcf = _safe_int(cf.get("freeCashFlow"))
        if fcf is None and op_cf is not None and capex is not None:
            fcf = op_cf + capex

        shares = _safe_int(item.get("weightedAverageShsOutDil"))
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

    return results


def fetch_quote(ticker: str) -> Optional[Dict[str, Any]]:
    data = _request(f"quote/{ticker}")
    if not data or not isinstance(data, list) or len(data) == 0:
        return None

    q = data[0]
    return {
        "current_price": _safe_float(q.get("price")),
        "market_cap": _safe_int(q.get("marketCap")),
        "pe_ratio": _safe_float(q.get("pe")),
        "shares_outstanding": _safe_int(q.get("sharesOutstanding")),
        "fifty_two_week_high": _safe_float(q.get("yearHigh")),
        "fifty_two_week_low": _safe_float(q.get("yearLow")),
    }


def search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    data = _request("search", {"query": query, "limit": limit})
    if not data or not isinstance(data, list):
        return []
    return [
        {
            "ticker": item.get("symbol"),
            "name": item.get("name"),
            "exchange": item.get("exchangeShortName"),
            "currency": item.get("currency"),
        }
        for item in data
    ]


def is_available() -> bool:
    return bool(API_KEY)
