from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional

from database import get_db
from models.stock import Stock
from models.financial import Financial
from services.cache_manager import CacheManager
from services.data_fetcher import fetch_and_store
from services import fmp_fetcher
from config import settings

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])
cache = CacheManager(settings.REDIS_URL)


@router.get("/search")
def search_stocks(
    q: str = Query(..., min_length=1, description="Search query (ticker or name)"),
    market: Optional[str] = Query(None, description="Filter by market: IN or US"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Stock).filter(
        or_(
            Stock.ticker.ilike(f"%{q}%"),
            Stock.name.ilike(f"%{q}%"),
        )
    )
    if market:
        query = query.filter(Stock.market == market.upper())

    duplicate_classes = ["GOOGL", "FOXA", "NWSA", "UHAL.B", "BRK.B", "DIS.B"]
    query = query.filter(~Stock.ticker.in_(duplicate_classes))

    if market == "IN":
        query = query.filter(Stock.ticker != "RS")

    results = query.order_by(Stock.market_cap.desc().nullslast()).limit(limit).all()
    return [s.to_dict() for s in results]


@router.get("/overview")
def market_overview(
    market: Optional[str] = Query(None, description="IN or US"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Stock)
    if market:
        query = query.filter(Stock.market == market.upper())

    duplicate_classes = ["GOOGL", "FOXA", "NWSA", "UHAL.B", "BRK.B", "DIS.B"]
    query = query.filter(~Stock.ticker.in_(duplicate_classes))

    offset = (page - 1) * limit
    stocks = query.order_by(Stock.market_cap.desc().nullslast()).offset(offset).limit(limit).all()

    total_in = db.query(Stock).filter(Stock.market == "IN").count()
    total_us = db.query(Stock).filter(Stock.market == "US").count()

    return {
        "summary": {
            "total_stocks": total_in + total_us,
            "indian_stocks": total_in,
            "us_stocks": total_us,
        },
        "top_stocks": [s.to_dict() for s in stocks],
        "has_more": len(stocks) == limit,
    }


@router.get("/movers/top")
def get_top_movers(
    market: Optional[str] = Query(None, description="IN or US"),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    query = db.query(Stock).filter(
        Stock.market_cap.isnot(None),
        Stock.current_price.isnot(None),
    )
    if market:
        query = query.filter(Stock.market == market.upper())

    duplicate_classes = ["GOOGL", "FOXA", "NWSA", "UHAL.B", "BRK.B", "DIS.B"]
    query = query.filter(~Stock.ticker.in_(duplicate_classes))

    all_stocks = query.all()

    def to_mover(s):
        return {
            "ticker": s.ticker,
            "name": s.name,
            "current_price": s.current_price,
            "market_cap": s.market_cap,
            "currency": s.currency,
            "sector": s.sector,
            "pe_ratio": s.pe_ratio,
        }

    by_pe = sorted(
        [s for s in all_stocks if s.pe_ratio and 0 < s.pe_ratio < 1000],
        key=lambda s: s.pe_ratio,
    )

    lowest_pe = [to_mover(s) for s in by_pe[:limit]]
    highest_pe = [to_mover(s) for s in by_pe[-limit:][::-1]]

    return {
        "value_picks": lowest_pe,
        "growth_picks": highest_pe,
        "market": market or "ALL",
    }


@router.get("/{ticker}")
def get_stock_detail(
    ticker: str,
    live: bool = Query(False, description="Skip cache and fetch live price"),
    db: Session = Depends(get_db),
):
    if not live:
        cached = cache.get_stock(ticker)
        if cached:
            return cached

    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    data = stock.to_dict()

    from services.data_fetcher import fetch_live_price
    live_data = fetch_live_price(ticker)
    if live_data and live_data.get("current_price"):
        data["current_price"] = live_data["current_price"]
        if live_data.get("market_cap"):
            data["market_cap"] = live_data["market_cap"]
        if live_data.get("pe_ratio"):
            data["pe_ratio"] = live_data["pe_ratio"]
        if live_data.get("pb_ratio"):
            data["pb_ratio"] = live_data["pb_ratio"]

        stock.current_price = live_data["current_price"]
        if live_data.get("market_cap"):
            stock.market_cap = live_data["market_cap"]
        if live_data.get("pe_ratio"):
            stock.pe_ratio = live_data["pe_ratio"]
        if live_data.get("pb_ratio"):
            stock.pb_ratio = live_data["pb_ratio"]
        try:
            db.commit()
        except Exception:
            db.rollback()

    cache.set_stock(ticker, data)
    return data


@router.get("/{ticker}/financials")
def get_stock_financials(
    ticker: str,
    years: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
):
    cached = cache.get_financials(ticker)
    if cached:
        return cached

    financials = (
        db.query(Financial)
        .filter(Financial.ticker == ticker)
        .order_by(Financial.year.desc())
        .limit(years)
        .all()
    )

    if not financials:
        raise HTTPException(
            status_code=404,
            detail=f"No financial data for {ticker}. Try refreshing data.",
        )

    stock = db.query(Stock).filter(Stock.ticker == ticker).first()

    result = {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "currency": stock.currency if stock else None,
        "years_available": len(financials),
        "financials": [f.to_dict() for f in financials],
    }

    cache.set_financials(ticker, result)
    return result


@router.get("/{ticker}/key-ratios")
def get_key_ratios(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    financials = (
        db.query(Financial)
        .filter(Financial.ticker == ticker)
        .order_by(Financial.year.desc())
        .limit(5)
        .all()
    )

    latest = financials[0] if financials else None
    prev = financials[1] if len(financials) > 1 else None

    ratios = {
        "market_cap": stock.market_cap,
        "current_price": stock.current_price,
        "fifty_two_week_high": stock.fifty_two_week_high,
        "fifty_two_week_low": stock.fifty_two_week_low,
        "pe_ratio": stock.pe_ratio,
        "pb_ratio": stock.pb_ratio,
        "dividend_yield": stock.dividend_yield,
        "beta": stock.beta,
        "currency": stock.currency,
    }

    if latest:
        ratios["eps"] = latest.eps
        ratios["roe"] = latest.roe
        ratios["roic"] = latest.roic
        ratios["debt_to_equity"] = latest.debt_to_equity
        ratios["current_ratio"] = latest.current_ratio
        ratios["net_margin"] = latest.net_margin
        ratios["revenue"] = latest.revenue
        ratios["net_income"] = latest.net_income
        ratios["free_cash_flow"] = latest.free_cash_flow
        ratios["operating_cash_flow"] = latest.operating_cash_flow
        ratios["total_debt"] = latest.total_debt
        ratios["total_equity"] = latest.total_equity
        ratios["total_assets"] = latest.total_assets
        ratios["ebitda"] = latest.ebitda
        ratios["gross_profit"] = latest.gross_profit
        ratios["operating_income"] = latest.operating_income
        ratios["shares_outstanding"] = latest.shares_outstanding or stock.shares_outstanding

        if latest.operating_income and latest.revenue and latest.revenue != 0:
            ratios["operating_margin"] = round(latest.operating_income / latest.revenue, 4)
        else:
            ratios["operating_margin"] = None

        ebit = latest.operating_income or latest.ebitda
        if ebit and latest.total_assets and latest.current_liabilities:
            capital_employed = latest.total_assets - latest.current_liabilities
            if capital_employed > 0:
                ratios["roce"] = round(ebit / capital_employed, 4)
            else:
                ratios["roce"] = None
        else:
            ratios["roce"] = None

        if latest.total_equity and (latest.shares_outstanding or stock.shares_outstanding):
            shares = latest.shares_outstanding or stock.shares_outstanding
            ratios["book_value"] = round(latest.total_equity / shares, 2)
        else:
            ratios["book_value"] = None

        if stock.pe_ratio and latest.revenue_growth:
            ratios["forward_pe"] = round(stock.pe_ratio / (1 + (latest.revenue_growth or 0.05)), 2)
        else:
            ratios["forward_pe"] = None

    cagr = {}
    if len(financials) >= 2:
        latest_rev = financials[0].revenue
        for period in [3, 5]:
            idx = min(period, len(financials) - 1)
            older = financials[idx]
            if latest_rev and older.revenue and older.revenue > 0:
                cagr[f"revenue_{period}y"] = round(
                    ((latest_rev / older.revenue) ** (1 / (period if idx == period else idx)) - 1), 4
                )
            if financials[0].net_income and older.net_income and older.net_income > 0:
                cagr[f"profit_{period}y"] = round(
                    ((financials[0].net_income / older.net_income) ** (1 / (period if idx == period else idx)) - 1), 4
                )

    ratios["cagr"] = cagr

    return ratios


@router.get("/{ticker}/peers")
def get_peers(
    ticker: str,
    limit: int = Query(7, ge=1, le=20),
    db: Session = Depends(get_db),
):
    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    if not stock.sector:
        return []

    peers = (
        db.query(Stock)
        .filter(Stock.sector == stock.sector, Stock.ticker != ticker, Stock.market == stock.market)
        .order_by(Stock.market_cap.desc().nullslast())
        .limit(limit)
        .all()
    )

    result = []
    for p in peers:
        fin = db.query(Financial).filter(Financial.ticker == p.ticker).order_by(Financial.year.desc()).first()
        roce = None
        if fin and fin.operating_income and fin.total_assets and fin.current_liabilities:
            ce = fin.total_assets - fin.current_liabilities
            if ce > 0:
                roce = round(fin.operating_income / ce * 100, 2)

        result.append({
            "ticker": p.ticker,
            "name": p.name,
            "current_price": p.current_price,
            "pe_ratio": p.pe_ratio,
            "market_cap": p.market_cap,
            "dividend_yield": round(p.dividend_yield * 100, 2) if p.dividend_yield else None,
            "roce": roce,
            "currency": p.currency,
        })

    return result


@router.get("/{ticker}/quarterly")
def get_quarterly(ticker: str, db: Session = Depends(get_db)):
    import yfinance as yf
    import math

    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    try:
        yf_ticker = yf.Ticker(ticker)
        inc = yf_ticker.quarterly_income_stmt
        
        if inc.empty:
            return {"quarters": [], "currency": stock.currency}

        quarters = []
        cols = sorted(list(inc.columns), reverse=True)[:8]

        for col in cols:
            date_str = str(col)[:7]
            
            def safe_get(row_name):
                if row_name in inc.index:
                    val = inc.loc[row_name, col]
                    if not math.isnan(val):
                        return float(val)
                return None

            revenue = safe_get("Total Revenue") or safe_get("Operating Revenue")
            op_profit = safe_get("Operating Income") or safe_get("EBIT")
            net_profit = safe_get("Net Income")
            eps = safe_get("Diluted EPS") or safe_get("Basic EPS")
            
            expenses = None
            if revenue is not None and op_profit is not None:
                expenses = revenue - op_profit
                
            opm = None
            if op_profit and revenue and revenue > 0:
                opm = round((op_profit / revenue) * 100, 1)

            quarters.append({
                "period": date_str,
                "revenue": revenue,
                "expenses": expenses,
                "operating_profit": op_profit,
                "opm_pct": opm,
                "net_profit": net_profit,
                "eps": eps,
            })

        return {"quarters": quarters, "currency": stock.currency}
    except Exception as e:
        print(f"Error fetching quarterly for {ticker}: {e}")
        return {"quarters": [], "currency": stock.currency}


@router.get("/{ticker}/pros-cons")
def get_pros_cons(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    financials = (
        db.query(Financial)
        .filter(Financial.ticker == ticker)
        .order_by(Financial.year.desc())
        .limit(5)
        .all()
    )

    if not financials:
        return {"pros": [], "cons": []}

    latest = financials[0]
    pros = []
    cons = []

    if latest.roe:
        if latest.roe > 0.15:
            pros.append(f"Company has a good return on equity (ROE) track record: {latest.roe * 100:.1f}%")
        elif latest.roe < 0.05:
            cons.append(f"Low return on equity of {latest.roe * 100:.1f}%")

    if stock.dividend_yield:
        if stock.dividend_yield > 0.02:
            pros.append(f"Company has been maintaining a healthy dividend payout of {stock.dividend_yield * 100:.1f}%")
        elif stock.dividend_yield < 0.005:
            cons.append("Company pays very low or no dividends")

    if latest.net_margin:
        if latest.net_margin > 0.15:
            pros.append(f"Company has strong profit margins of {latest.net_margin * 100:.1f}%")
        elif latest.net_margin < 0.05:
            cons.append(f"Company has low profit margins of {latest.net_margin * 100:.1f}%")

    if latest.operating_income and latest.revenue and latest.revenue > 0:
        op_margin = latest.operating_income / latest.revenue
        if op_margin > 0.20:
            pros.append(f"Strong operating margins of {op_margin * 100:.1f}%")
        elif op_margin < 0.10:
            cons.append(f"Operating margins are low at {op_margin * 100:.1f}%")

    if latest.revenue_growth:
        if latest.revenue_growth > 0.10:
            pros.append(f"Revenue growing at {latest.revenue_growth * 100:.1f}%")
        elif latest.revenue_growth < 0:
            cons.append(f"Revenue declining at {latest.revenue_growth * 100:.1f}%")

    if stock.pb_ratio:
        if stock.pb_ratio > 10:
            cons.append(f"Stock is trading at {stock.pb_ratio:.1f} times its book value")
        elif stock.pb_ratio < 1:
            pros.append(f"Stock is trading below its book value (P/B: {stock.pb_ratio:.1f})")

    if latest.debt_to_equity:
        if latest.debt_to_equity > 2.0:
            cons.append(f"High debt-to-equity ratio of {latest.debt_to_equity:.2f}")
        elif latest.debt_to_equity < 0.5:
            pros.append(f"Company has low debt with D/E ratio of {latest.debt_to_equity:.2f}")

    if latest.current_ratio:
        if latest.current_ratio > 2.0:
            pros.append(f"Strong liquidity with current ratio of {latest.current_ratio:.2f}")
        elif latest.current_ratio < 1.0:
            cons.append(f"Current ratio of {latest.current_ratio:.2f} indicates liquidity risk")

    if latest.free_cash_flow:
        if latest.free_cash_flow > 0:
            pros.append("Company generates positive free cash flow")
        else:
            cons.append("Company has negative free cash flow")

    if stock.pe_ratio:
        if stock.pe_ratio > 50:
            cons.append(f"Stock is trading at a high P/E of {stock.pe_ratio:.1f}")
        elif stock.pe_ratio < 15 and stock.pe_ratio > 0:
            pros.append(f"Attractively valued with P/E of {stock.pe_ratio:.1f}")

    return {"pros": pros, "cons": cons}


@router.post("/{ticker}/refresh")
def refresh_stock_data(ticker: str, db: Session = Depends(get_db)):
    success = fetch_and_store(db, ticker)
    if not success:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch data for {ticker} from yFinance",
        )
    cache.flush_ticker(ticker)
    return {"status": "ok", "message": f"Data refreshed for {ticker}"}


@router.get("/sector/breakdown")
def sector_breakdown(
    market: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(
        Stock.sector,
        func.count(Stock.ticker).label("count"),
        func.avg(Stock.pe_ratio).label("avg_pe"),
        func.sum(Stock.market_cap).label("total_market_cap"),
    ).group_by(Stock.sector)

    if market:
        query = query.filter(Stock.market == market.upper())

    results = query.having(Stock.sector.isnot(None)).all()

    return [
        {
            "sector": r.sector,
            "stock_count": r.count,
            "avg_pe": round(r.avg_pe, 2) if r.avg_pe else None,
            "total_market_cap": r.total_market_cap,
        }
        for r in results
    ]


@router.get("/heatmap/data")
def heatmap_data(
    market: Optional[str] = Query(None, description="IN or US"),
    db: Session = Depends(get_db),
):
    query = db.query(Stock).filter(
        Stock.market_cap.isnot(None),
        Stock.sector.isnot(None),
    )
    if market:
        query = query.filter(Stock.market == market.upper())

    duplicate_classes = ["GOOGL", "FOXA", "NWSA", "UHAL.B", "BRK.B", "DIS.B"]
    query = query.filter(~Stock.ticker.in_(duplicate_classes))

    stocks = query.order_by(Stock.market_cap.desc().nullslast()).limit(100).all()

    sectors = {}
    for s in stocks:
        sector = s.sector or "Other"
        if sector not in sectors:
            sectors[sector] = []
        sectors[sector].append({
            "ticker": s.ticker,
            "name": s.name,
            "market_cap": s.market_cap,
            "current_price": s.current_price,
            "pe_ratio": s.pe_ratio,
            "change_pct": None,
        })

    return {
        "sectors": [
            {"name": name, "stocks": stocks}
            for name, stocks in sectors.items()
        ],
        "total_stocks": len(stocks),
    }


@router.get("/{ticker}/price-history")
def get_price_history(
    ticker: str,
    period: str = Query("1y", description="1m | 3m | 6m | 1y | 2y"),
    db: Session = Depends(get_db),
):
    import yfinance as yf
    import math

    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    period_map = {"1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "2y": "2y"}
    yf_period = period_map.get(period, "1y")

    try:
        hist = yf.Ticker(ticker).history(period=yf_period, interval="1d")
        if hist.empty:
            return {"ticker": ticker, "period": period, "prices": [], "currency": stock.currency}

        prices = []
        for dt, row in hist.iterrows():
            close = float(row["Close"])
            volume = int(row["Volume"]) if not math.isnan(row["Volume"]) else None
            if not math.isnan(close):
                prices.append({
                    "date": dt.strftime("%Y-%m-%d"),
                    "close": round(close, 4),
                    "volume": volume,
                })

        return {
            "ticker": ticker,
            "period": period,
            "currency": stock.currency,
            "prices": prices,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch price history: {e}")

