import logging
import math
from typing import Optional, Dict, Any, List

from yahooquery import Ticker

logger = logging.getLogger(__name__)

def _safe_float(val) -> Optional[float]:
    if val is None or isinstance(val, str):
        return None
    try:
        v = float(val)
        if math.isnan(v) or math.isinf(v):
            return None
        return round(v, 4)
    except (ValueError, TypeError):
        return None

def _safe_int(val) -> Optional[int]:
    if val is None or isinstance(val, str):
        return None
    try:
        v = float(val)
        if math.isnan(v) or math.isinf(v):
            return None
        return int(v)
    except (ValueError, TypeError):
        return None

def fetch_profile(ticker: str) -> Optional[Dict[str, Any]]:
    try:
        yq = Ticker(ticker)
        summary_detail = yq.summary_detail
        if (isinstance(summary_detail, dict) and ticker in summary_detail and 
            isinstance(summary_detail[ticker], dict)):
            detail = summary_detail[ticker]
            
            profile = yq.asset_profile.get(ticker, {})
            price_info = yq.price.get(ticker, {})
            
            if 'error' in detail or len(detail) == 0:
                logger.warning(f"{ticker}: yahooquery profile empty or errored")
                return None
            
            name = price_info.get("longName") or price_info.get("shortName") or ticker
            market = "IN" if ticker.endswith(".NS") or ticker.endswith(".BO") else "US"
            
            return {
                "ticker": ticker,
                "name": name,
                "sector": profile.get("sector", None),
                "industry": profile.get("industry", None),
                "market": market,
                "market_cap": _safe_int(price_info.get("marketCap") or detail.get("marketCap")),
                "current_price": _safe_float(price_info.get("regularMarketPrice") or detail.get("previousClose")),
                "pe_ratio": _safe_float(detail.get("trailingPE")),
                "pb_ratio": _safe_float(detail.get("priceToBook")),
                "dividend_yield": _safe_float(detail.get("dividendYield")),
                "beta": _safe_float(detail.get("beta")),
                "fifty_two_week_high": _safe_float(detail.get("fiftyTwoWeekHigh")),
                "fifty_two_week_low": _safe_float(detail.get("fiftyTwoWeekLow")),
                "shares_outstanding": _safe_int(yq.key_stats.get(ticker, {}).get("sharesOutstanding")),
                "currency": price_info.get("currency", "USD" if market == "US" else "INR"),
            }
        
    except Exception as e:
        logger.error(f"{ticker}: yahooquery profile failed - {e}")
    
    return None

def fetch_financials(ticker: str) -> List[Dict[str, Any]]:
    results = []
    try:
        yq = Ticker(ticker)
        income_stmt = yq.income_statement()
        balance_sheet = yq.balance_sheet()
        cash_flow = yq.cash_flow()

        if income_stmt is not None and not isinstance(income_stmt, dict):
            if isinstance(income_stmt, str):
                logger.warning(f"{ticker}: yahooquery income statement returned string: {income_stmt}")
                return []
            
            if ticker in income_stmt.index.get_level_values('symbol'):
                income_data = income_stmt.xs(ticker, level='symbol')
                balance_data = balance_sheet.xs(ticker, level='symbol') if not isinstance(balance_sheet, dict) and not isinstance(balance_sheet, str) and ticker in balance_sheet.index.get_level_values('symbol') else None
                cash_data = cash_flow.xs(ticker, level='symbol') if not isinstance(cash_flow, dict) and not isinstance(cash_flow, str) and ticker in cash_flow.index.get_level_values('symbol') else None

                prev_revenue = None

                for date, inc_row in income_data.iterrows():
                    try:
                        year = date.year
                    except AttributeError:
                        try:
                            year = int(str(date)[:4])
                        except ValueError:
                            continue

                    def get_val(df_row, col_name):
                        if df_row is not None and col_name in df_row.index:
                            return df_row[col_name]
                        return None
                    
                    revenue = _safe_int(get_val(inc_row, 'TotalRevenue'))
                    cost_of_rev = _safe_int(get_val(inc_row, 'CostOfRevenue'))
                    gross_profit = _safe_int(get_val(inc_row, 'GrossProfit'))
                    op_income = _safe_int(get_val(inc_row, 'OperatingIncome'))
                    net_income = _safe_int(get_val(inc_row, 'NetIncome'))
                    ebitda = _safe_int(get_val(inc_row, 'NormalizedEBITDA'))
                    
                    bal_row = balance_data.loc[date] if balance_data is not None and date in balance_data.index else None
                    total_assets = _safe_int(get_val(bal_row, 'TotalAssets'))
                    total_liab = _safe_int(get_val(bal_row, 'TotalLiabilitiesNetMinorityInterest'))
                    total_equity = _safe_int(get_val(bal_row, 'StockholdersEquity'))
                    total_debt = _safe_int(get_val(bal_row, 'TotalDebt'))
                    cash = _safe_int(get_val(bal_row, 'CashAndCashEquivalents'))
                    current_assets = _safe_int(get_val(bal_row, 'CurrentAssets'))
                    current_liab = _safe_int(get_val(bal_row, 'CurrentLiabilities'))

                    cf_row = cash_data.loc[date] if cash_data is not None and date in cash_data.index else None
                    op_cf = _safe_int(get_val(cf_row, 'OperatingCashFlow'))
                    capex = _safe_int(get_val(cf_row, 'CapitalExpenditure'))
                    fcf = _safe_int(get_val(cf_row, 'FreeCashFlow'))
                    if fcf is None and op_cf is not None and capex is not None:
                         fcf = op_cf + capex

                    shares = _safe_int(get_val(inc_row, 'DilutedAverageShares'))
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
        logger.error(f"{ticker}: yahooquery financials failed - {e}")
        
    return results
