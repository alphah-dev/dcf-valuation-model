import math
import logging
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from models.financial import Financial
from models.stock import Stock
from models.valuation import Valuation

logger = logging.getLogger(__name__)


def _get_latest_financials(db: Session, ticker: str, limit: int = 5) -> List[Financial]:
    return (
        db.query(Financial)
        .filter(Financial.ticker == ticker)
        .order_by(Financial.year.desc())
        .limit(limit)
        .all()
    )


def _get_stock(db: Session, ticker: str) -> Optional[Stock]:
    return db.query(Stock).filter(Stock.ticker == ticker).first()


def _valuation_signal(margin_of_safety: Optional[float], is_vc: bool = False) -> str:
    if margin_of_safety is None:
        return "NEUTRAL"
    if is_vc:
        if margin_of_safety > 100:
            return "STRONG BUY"
        elif margin_of_safety > 50:
            return "BUY"
        elif margin_of_safety > 0:
            return "HOLD"
        else:
            return "SELL"
    else:
        if margin_of_safety > 30:
            return "STRONG BUY"
        elif margin_of_safety > 15:
            return "BUY"
        elif margin_of_safety > -15:
            return "HOLD"
        elif margin_of_safety > -30:
            return "SELL"
        else:
            return "STRONG SELL"


def _normalize_capex(capex):
    if capex is None:
        return None
    return -abs(capex) if capex > 0 else capex


def _compute_base_fcf(latest: Financial):
    base_fcf = latest.free_cash_flow
    if base_fcf is None or base_fcf == 0:
        capex = _normalize_capex(latest.capex)
        if latest.operating_cash_flow and capex is not None:
            base_fcf = latest.operating_cash_flow + capex
    return base_fcf


def _get_shares(stock: Optional[Stock], latest: Financial):
    if stock and stock.shares_outstanding:
        return stock.shares_outstanding
    return latest.shares_outstanding


def _margin_of_safety(fair_value, current_price):
    if fair_value and current_price and current_price > 0:
        return round(((fair_value - current_price) / current_price) * 100, 2)
    return None


def _save_valuation(db, ticker, wacc, terminal_growth, growth_rates, projection_years,
                    enterprise_value, equity_value, fair_value, current_price,
                    margin_of_safety, pv_fcf, pv_terminal):
    v = Valuation(
        ticker=ticker,
        wacc=wacc,
        terminal_growth=terminal_growth,
        growth_rates_json="",
        projection_years=projection_years,
        enterprise_value=round(enterprise_value),
        equity_value=round(equity_value),
        fair_value_per_share=round(fair_value, 2) if fair_value else None,
        current_price=current_price,
        margin_of_safety=margin_of_safety,
        pv_fcf=round(pv_fcf),
        pv_terminal=round(pv_terminal),
    )
    v.growth_rates = growth_rates
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


def calculate_dcf(
    db: Session,
    ticker: str,
    wacc: float,
    growth_rates: List[float],
    terminal_growth: float = 0.03,
    fade_years: int = 0,
) -> Dict[str, Any]:
    financials = _get_latest_financials(db, ticker)
    stock = _get_stock(db, ticker)

    if not financials:
        return {"error": f"No financial data found for {ticker}"}

    latest = financials[0]

    if stock and stock.sector == "Financial Services":
        if stock.industry and "Insurance" in stock.industry:
            return _calculate_ev_growth_model(db, ticker, wacc, growth_rates, terminal_growth, financials, stock)
        else:
            return _calculate_residual_income_model(db, ticker, wacc, growth_rates, terminal_growth, financials, stock)

    if stock and (stock.sector == "Real Estate" or (stock.industry and "Conglomerate" in stock.industry)):
        return _calculate_asset_based_valuation(db, ticker, wacc, growth_rates, terminal_growth, financials, stock)

    if latest.net_income and latest.net_income < 0 and stock and stock.sector in ["Technology", "Healthcare", "Communication Services"]:
        if latest.revenue and latest.revenue > 0:
            return _calculate_vc_method(db, ticker, wacc, growth_rates, terminal_growth, financials, stock)

    if stock and stock.sector in ["Basic Materials", "Energy", "Industrials"]:
        return _calculate_normalized_earnings_model(db, ticker, wacc, growth_rates, terminal_growth, financials, stock)

    if wacc <= terminal_growth:
        return {"error": f"WACC ({wacc:.1%}) must be greater than terminal growth ({terminal_growth:.1%})"}

    base_fcf = _compute_base_fcf(latest)
    if base_fcf is None or base_fcf == 0:
        return {
            "error": f"No Free Cash Flow data for {ticker}. FCF is required for DCF.",
            "suggestion": "Try using EV/EBITDA or P/S valuation instead.",
        }

    fcf_negative = base_fcf < 0
    warnings = []

    effective_rates = list(growth_rates)
    if fade_years > 0 and len(growth_rates) > 0:
        last_rate = growth_rates[-1]
        for i in range(1, fade_years + 1):
            faded = last_rate + (terminal_growth - last_rate) * (i / (fade_years + 1))
            effective_rates.append(faded)

    projection_years = len(effective_rates)

    current_fcf = float(base_fcf)
    projected_fcf = []

    for i, rate in enumerate(effective_rates):
        current_fcf = current_fcf * (1 + rate)
        projected_fcf.append({
            "year": latest.year + i + 1,
            "fcf": current_fcf,
            "growth_rate": rate,
            "is_fade": i >= len(growth_rates),
        })

    final_fcf = projected_fcf[-1]["fcf"]

    terminal_warning = None
    if final_fcf < 0:
        terminal_value = 0
        terminal_warning = "Final projected FCF is negative — terminal value set to 0. Company may be structurally unprofitable."
        warnings.append(terminal_warning)
    else:
        terminal_value = (final_fcf * (1 + terminal_growth)) / (wacc - terminal_growth)

    pv_fcf_items = []
    total_pv_fcf = 0.0
    for i, proj in enumerate(projected_fcf):
        discount_factor = (1 + wacc) ** (i + 1)
        pv = proj["fcf"] / discount_factor
        pv_fcf_items.append({
            "year": proj["year"],
            "fcf": round(proj["fcf"]),
            "pv": round(pv),
            "discount_factor": round(discount_factor, 4),
            "is_fade": proj.get("is_fade", False),
        })
        total_pv_fcf += pv

    pv_terminal = terminal_value / ((1 + wacc) ** projection_years)
    enterprise_value = total_pv_fcf + pv_terminal

    total_debt = latest.total_debt or 0
    cash = latest.cash_and_equivalents or 0
    equity_value = enterprise_value - total_debt + cash

    shares = _get_shares(stock, latest)
    current_price = stock.current_price if stock else None

    fair_value_per_share = round(equity_value / shares, 2) if shares and shares > 0 else None
    mos = _margin_of_safety(fair_value_per_share, current_price)
    verdict = _valuation_signal(mos)

    terminal_sanity_warning = None
    implied_terminal_multiple = None
    ebitda = latest.ebitda or latest.operating_income
    if ebitda and ebitda > 0 and terminal_value > 0:
        implied_terminal_multiple = round(terminal_value / ebitda, 1)
        if implied_terminal_multiple > 30:
            terminal_sanity_warning = f"Implied terminal EV/EBITDA of {implied_terminal_multiple}x is high — consider lower growth assumptions."
            warnings.append(terminal_sanity_warning)
        elif implied_terminal_multiple < 3:
            terminal_sanity_warning = f"Implied terminal EV/EBITDA of {implied_terminal_multiple}x is unusually low."
            warnings.append(terminal_sanity_warning)

    diagnostics = {
        "terminal_value_pct_of_ev": round((pv_terminal / enterprise_value) * 100, 1) if enterprise_value else None,
        "fade_years_added": fade_years,
        "implied_terminal_multiple": implied_terminal_multiple,
        "warnings": warnings,
    }

    valuation = _save_valuation(
        db, ticker, wacc, terminal_growth, growth_rates, projection_years,
        enterprise_value, equity_value, fair_value_per_share, current_price,
        mos, total_pv_fcf, pv_terminal,
    )

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "currency": stock.currency if stock else "USD",
        "methodology": "Standard DCF",
        "base_fcf": base_fcf,
        "fcf_negative_warning": fcf_negative,
        "assumptions": {
            "wacc": wacc,
            "terminal_growth": terminal_growth,
            "growth_rates": growth_rates,
            "effective_rates": effective_rates,
            "projection_years": projection_years,
            "fade_years": fade_years,
        },
        "projected_fcf": pv_fcf_items,
        "terminal_value": round(terminal_value),
        "pv_fcf": round(total_pv_fcf),
        "pv_terminal": round(pv_terminal),
        "enterprise_value": round(enterprise_value),
        "adjustments": {
            "total_debt": total_debt,
            "cash": cash,
        },
        "equity_value": round(equity_value),
        "shares_outstanding": shares,
        "fair_value_per_share": fair_value_per_share,
        "current_price": current_price,
        "margin_of_safety_pct": mos,
        "verdict": verdict,
        "valuation_id": valuation.id,
        "diagnostics": diagnostics,
    }


def _calculate_residual_income_model(
    db: Session, ticker: str, cost_of_equity: float, growth_rates: List[float],
    terminal_growth: float, financials: List[Financial], stock: Optional[Stock],
) -> Dict[str, Any]:
    if not financials:
        return {"error": f"No financial data found for {ticker}"}

    latest = financials[0]
    book_value = latest.total_equity
    net_income = latest.net_income

    if not book_value or not net_income:
        return {"error": f"No Book Value or Net Income available for {ticker} (Required for Residual Income Model)"}

    if cost_of_equity <= terminal_growth:
        return {"error": f"Cost of Equity ({cost_of_equity:.1%}) must be greater than terminal growth ({terminal_growth:.1%})"}

    projection_years = len(growth_rates)
    current_ni = float(net_income)
    current_bv = float(book_value)

    payout_ratio = 0.30

    total_pv_ri = 0.0
    pv_ri_items = []
    warnings = []

    for i, rate in enumerate(growth_rates):
        prev_bv = current_bv
        current_ni = current_ni * (1 + rate)
        dividends = current_ni * payout_ratio
        current_bv = prev_bv + current_ni - dividends

        equity_charge = prev_bv * cost_of_equity
        residual_income = current_ni - equity_charge

        discount_factor = (1 + cost_of_equity) ** (i + 1)
        pv = residual_income / discount_factor

        pv_ri_items.append({
            "year": latest.year + i + 1,
            "fcf": round(residual_income),
            "pv": round(pv),
            "discount_factor": round(discount_factor, 4),
        })
        total_pv_ri += pv

    final_ri = residual_income

    if final_ri < 0:
        terminal_value = 0
        warnings.append("Final residual income is negative — terminal value set to 0.")
    else:
        terminal_value = (final_ri * (1 + terminal_growth)) / (cost_of_equity - terminal_growth)

    pv_terminal = terminal_value / ((1 + cost_of_equity) ** projection_years)

    equity_value = float(book_value) + total_pv_ri + pv_terminal

    shares = _get_shares(stock, latest)
    current_price = stock.current_price if stock else None
    fair_value = round(equity_value / shares, 2) if shares and shares > 0 else None
    mos = _margin_of_safety(fair_value, current_price)
    verdict = _valuation_signal(mos)

    diagnostics = {
        "terminal_value_pct_of_ev": round((pv_terminal / equity_value) * 100, 1) if equity_value else None,
        "payout_ratio": payout_ratio,
        "final_book_value": round(current_bv),
        "warnings": warnings,
    }

    valuation = _save_valuation(
        db, ticker, cost_of_equity, terminal_growth, growth_rates, projection_years,
        equity_value, equity_value, fair_value, current_price,
        mos, total_pv_ri, pv_terminal,
    )

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "currency": stock.currency if stock else "USD",
        "methodology": "Residual Income Model (Bank/NBFC framework)",
        "base_fcf": net_income,
        "fcf_negative_warning": net_income < 0,
        "assumptions": {
            "wacc": cost_of_equity,
            "terminal_growth": terminal_growth,
            "growth_rates": growth_rates,
            "projection_years": projection_years,
            "payout_ratio": payout_ratio,
        },
        "projected_fcf": pv_ri_items,
        "terminal_value": round(terminal_value),
        "pv_fcf": round(total_pv_ri),
        "pv_terminal": round(pv_terminal),
        "enterprise_value": round(equity_value),
        "adjustments": {
            "total_debt": 0,
            "cash": book_value,
        },
        "equity_value": round(equity_value),
        "shares_outstanding": shares,
        "fair_value_per_share": fair_value,
        "current_price": current_price,
        "margin_of_safety_pct": mos,
        "verdict": verdict,
        "valuation_id": valuation.id,
        "diagnostics": diagnostics,
    }


def _calculate_ev_growth_model(
    db: Session, ticker: str, cost_of_equity: float, growth_rates: List[float],
    terminal_growth: float, financials: List[Financial], stock: Optional[Stock],
) -> Dict[str, Any]:
    if not financials:
        return {"error": f"No financial data found for {ticker}"}

    latest = financials[0]
    book_value = latest.total_equity
    if not book_value:
        return {"error": f"No Book Value available for {ticker} (Required for EV Proxy)"}

    projection_years = len(growth_rates)
    current_bv = float(book_value)
    warnings = []

    pv_items = []
    for i, rate in enumerate(growth_rates):
        prev_bv = current_bv
        current_bv = current_bv * (1 + rate)
        ev_increment = current_bv - prev_bv

        discount_factor = (1 + cost_of_equity) ** (i + 1)
        pv = ev_increment / discount_factor

        pv_items.append({
            "year": latest.year + i + 1,
            "fcf": round(ev_increment),
            "pv": round(pv),
            "discount_factor": round(discount_factor, 4),
        })

    target_pb_multiple = 2.0
    terminal_value = current_bv * target_pb_multiple
    pv_terminal = terminal_value / ((1 + cost_of_equity) ** projection_years)

    equity_value = pv_terminal

    shares = _get_shares(stock, latest)
    current_price = stock.current_price if stock else None
    fair_value = round(equity_value / shares, 2) if shares and shares > 0 else None
    mos = _margin_of_safety(fair_value, current_price)
    verdict = _valuation_signal(mos)

    diagnostics = {
        "terminal_value_pct_of_ev": 100.0,
        "target_pb_multiple": target_pb_multiple,
        "final_projected_bv": round(current_bv),
        "warnings": warnings,
    }

    valuation = _save_valuation(
        db, ticker, cost_of_equity, terminal_growth, growth_rates, projection_years,
        equity_value, equity_value, fair_value, current_price,
        mos, 0, pv_terminal,
    )

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "currency": stock.currency if stock else "USD",
        "methodology": "EV Growth Model (Insurance framework)",
        "base_fcf": 0,
        "fcf_negative_warning": False,
        "assumptions": {
            "wacc": cost_of_equity,
            "terminal_growth": terminal_growth,
            "growth_rates": growth_rates,
            "projection_years": projection_years,
            "target_pb_multiple": target_pb_multiple,
        },
        "projected_fcf": pv_items,
        "terminal_value": round(terminal_value),
        "pv_fcf": 0,
        "pv_terminal": round(pv_terminal),
        "enterprise_value": round(equity_value),
        "adjustments": {
            "total_debt": 0,
            "cash": book_value,
        },
        "equity_value": round(equity_value),
        "shares_outstanding": shares,
        "fair_value_per_share": fair_value,
        "current_price": current_price,
        "margin_of_safety_pct": mos,
        "verdict": verdict,
        "valuation_id": valuation.id,
        "diagnostics": diagnostics,
    }


def _calculate_vc_method(
    db: Session, ticker: str, target_irr: float, growth_rates: List[float],
    terminal_growth: float, financials: List[Financial], stock: Optional[Stock],
) -> Dict[str, Any]:
    latest = financials[0]
    revenue = latest.revenue

    projection_years = len(growth_rates)
    current_rev = float(revenue)

    hurdle_rate = max(target_irr, 0.30)

    pv_rev_items = []
    for i, rate in enumerate(growth_rates):
        current_rev = current_rev * (1 + rate)
        discount_factor = (1 + hurdle_rate) ** (i + 1)
        pv = current_rev / discount_factor

        pv_rev_items.append({
            "year": latest.year + i + 1,
            "fcf": round(current_rev),
            "pv": round(pv),
            "discount_factor": round(discount_factor, 4),
        })

    exit_multiple = 5.0
    exit_value = current_rev * exit_multiple
    pv_terminal = exit_value / ((1 + hurdle_rate) ** projection_years)

    cash = latest.cash_and_equivalents or 0
    equity_value = pv_terminal + cash

    shares = _get_shares(stock, latest)
    current_price = stock.current_price if stock else None
    fair_value = round(equity_value / shares, 2) if shares and shares > 0 else None
    mos = _margin_of_safety(fair_value, current_price)
    verdict = _valuation_signal(mos, is_vc=True)

    diagnostics = {
        "terminal_value_pct_of_ev": round((pv_terminal / equity_value) * 100, 1) if equity_value else None,
        "exit_multiple": exit_multiple,
        "hurdle_rate": hurdle_rate,
        "terminal_revenue": round(current_rev),
        "warnings": [],
    }

    valuation = _save_valuation(
        db, ticker, hurdle_rate, terminal_growth, growth_rates, projection_years,
        pv_terminal, equity_value, fair_value, current_price,
        mos, 0, pv_terminal,
    )

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "currency": stock.currency if stock else "USD",
        "methodology": "VC Method (Startup Revenue Projection / Exit Multiple)",
        "base_fcf": revenue,
        "fcf_negative_warning": True,
        "assumptions": {
            "wacc": hurdle_rate,
            "terminal_growth": terminal_growth,
            "growth_rates": growth_rates,
            "projection_years": projection_years,
            "exit_multiple": exit_multiple,
        },
        "projected_fcf": pv_rev_items,
        "terminal_value": round(exit_value),
        "pv_fcf": 0,
        "pv_terminal": round(pv_terminal),
        "enterprise_value": round(pv_terminal),
        "adjustments": {
            "total_debt": 0,
            "cash": cash,
        },
        "equity_value": round(equity_value),
        "shares_outstanding": shares,
        "fair_value_per_share": fair_value,
        "current_price": current_price,
        "margin_of_safety_pct": mos,
        "verdict": verdict,
        "valuation_id": valuation.id,
        "diagnostics": diagnostics,
    }


def _calculate_normalized_earnings_model(
    db: Session, ticker: str, wacc: float, growth_rates: List[float],
    terminal_growth: float, financials: List[Financial], stock: Optional[Stock],
) -> Dict[str, Any]:
    latest = financials[0]

    margins = []
    for f in financials:
        if f.net_margin and f.net_income and f.net_income > 0:
            margins.append(f.net_margin)
        elif f.net_income and f.revenue and f.revenue > 0:
            margins.append(f.net_income / f.revenue)

    if not margins:
        return calculate_dcf(db, ticker, wacc, growth_rates, terminal_growth)

    avg_margin = sum(margins) / len(margins)
    normalized_earnings = latest.revenue * avg_margin if latest.revenue else 0

    if wacc <= terminal_growth:
        return {"error": f"WACC ({wacc:.1%}) must be greater than terminal growth ({terminal_growth:.1%})"}

    avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0.05
    roic = latest.roic

    if roic and roic > 0.01:
        reinvestment_rate = min(max(avg_growth / roic, 0), 0.80)
    else:
        reinvestment_rate = 0.50 if avg_growth > 0 else 0.0

    normalized_fcf = normalized_earnings * (1 - reinvestment_rate)

    projection_years = len(growth_rates)
    current_fcf = float(normalized_fcf)
    warnings = []

    total_pv = 0.0
    pv_items = []

    for i, rate in enumerate(growth_rates):
        current_fcf = current_fcf * (1 + rate)

        discount_factor = (1 + wacc) ** (i + 1)
        pv = current_fcf / discount_factor

        pv_items.append({
            "year": latest.year + i + 1,
            "fcf": round(current_fcf),
            "pv": round(pv),
            "discount_factor": round(discount_factor, 4),
        })
        total_pv += pv

    final_fcf = current_fcf

    if final_fcf < 0:
        terminal_value = 0
        warnings.append("Final projected FCF is negative — terminal value set to 0.")
    else:
        terminal_value = (final_fcf * (1 + terminal_growth)) / (wacc - terminal_growth)

    pv_terminal = terminal_value / ((1 + wacc) ** projection_years)
    enterprise_value = total_pv + pv_terminal

    total_debt = latest.total_debt or 0
    cash = latest.cash_and_equivalents or 0
    equity_value = enterprise_value - total_debt + cash

    shares = _get_shares(stock, latest)
    current_price = stock.current_price if stock else None
    fair_value = round(equity_value / shares, 2) if shares and shares > 0 else None
    mos = _margin_of_safety(fair_value, current_price)
    verdict = _valuation_signal(mos)

    diagnostics = {
        "terminal_value_pct_of_ev": round((pv_terminal / enterprise_value) * 100, 1) if enterprise_value else None,
        "reinvestment_rate": round(reinvestment_rate * 100, 1),
        "roic_used": round(roic * 100, 2) if roic else None,
        "normalized_earnings": round(normalized_earnings),
        "normalized_fcf": round(normalized_fcf),
        "warnings": warnings,
    }

    valuation = _save_valuation(
        db, ticker, wacc, terminal_growth, growth_rates, projection_years,
        enterprise_value, equity_value, fair_value, current_price,
        mos, total_pv, pv_terminal,
    )

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "currency": stock.currency if stock else "USD",
        "methodology": "Normalized Earnings Model (Cyclicals framework)",
        "base_fcf": normalized_fcf,
        "fcf_negative_warning": False,
        "assumptions": {
            "wacc": wacc,
            "terminal_growth": terminal_growth,
            "growth_rates": growth_rates,
            "projection_years": projection_years,
            "reinvestment_rate": reinvestment_rate,
        },
        "projected_fcf": pv_items,
        "terminal_value": round(terminal_value),
        "pv_fcf": round(total_pv),
        "pv_terminal": round(pv_terminal),
        "enterprise_value": round(enterprise_value),
        "adjustments": {
            "total_debt": total_debt,
            "cash": cash,
        },
        "equity_value": round(equity_value),
        "shares_outstanding": shares,
        "fair_value_per_share": fair_value,
        "current_price": current_price,
        "margin_of_safety_pct": mos,
        "verdict": verdict,
        "valuation_id": valuation.id,
        "diagnostics": diagnostics,
    }


def _calculate_asset_based_valuation(
    db: Session, ticker: str, wacc: float, growth_rates: List[float],
    terminal_growth: float, financials: List[Financial], stock: Optional[Stock],
) -> Dict[str, Any]:
    latest = financials[0]
    total_assets = latest.total_assets
    total_liabilities = latest.total_liabilities

    if not total_assets or not total_liabilities:
        return {"error": f"Missing Asset/Liability data for {ticker} (Required for Asset-Based Valuation)"}

    net_asset_value = total_assets - total_liabilities
    equity_value = net_asset_value

    shares = _get_shares(stock, latest)
    current_price = stock.current_price if stock else None
    fair_value = round(equity_value / shares, 2) if shares and shares > 0 else None
    mos = _margin_of_safety(fair_value, current_price)
    verdict = _valuation_signal(mos)

    pv_items = []
    for i in range(len(growth_rates)):
        pv_items.append({
            "year": latest.year + i + 1,
            "fcf": 0,
            "pv": 0,
            "discount_factor": 1.0,
        })

    diagnostics = {
        "terminal_value_pct_of_ev": 100.0,
        "warnings": [],
    }

    valuation = _save_valuation(
        db, ticker, wacc, 0, growth_rates, len(growth_rates),
        equity_value, equity_value, fair_value, current_price,
        mos, 0, equity_value,
    )

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "currency": stock.currency if stock else "USD",
        "methodology": "Net Asset Value Model (Unpredictable Cashflow framework)",
        "base_fcf": 0,
        "fcf_negative_warning": False,
        "assumptions": {
            "wacc": wacc,
            "terminal_growth": 0,
            "growth_rates": [0] * len(growth_rates),
            "projection_years": len(growth_rates),
        },
        "projected_fcf": pv_items,
        "terminal_value": round(equity_value),
        "pv_fcf": 0,
        "pv_terminal": round(equity_value),
        "enterprise_value": round(equity_value),
        "adjustments": {
            "total_debt": total_liabilities,
            "cash": total_assets,
        },
        "equity_value": round(equity_value),
        "shares_outstanding": shares,
        "fair_value_per_share": fair_value,
        "current_price": current_price,
        "margin_of_safety_pct": mos,
        "verdict": verdict,
        "valuation_id": valuation.id,
        "diagnostics": diagnostics,
    }


def reverse_dcf(
    db: Session,
    ticker: str,
    wacc: float,
    terminal_growth: float = 0.03,
    projection_years: int = 5,
) -> Dict[str, Any]:
    financials = _get_latest_financials(db, ticker)
    stock = _get_stock(db, ticker)

    if not financials:
        return {"error": f"No financial data found for {ticker}"}
    if not stock or not stock.current_price or not stock.shares_outstanding:
        return {"error": f"Missing price or shares data for {ticker}"}

    latest = financials[0]
    base_fcf = _compute_base_fcf(latest)
    if not base_fcf:
        return {"error": f"No FCF data for {ticker}"}

    if wacc <= terminal_growth:
        return {"error": f"WACC ({wacc:.1%}) must be greater than terminal growth ({terminal_growth:.1%})"}

    target_equity = stock.current_price * stock.shares_outstanding
    total_debt = latest.total_debt or 0
    cash = latest.cash_and_equivalents or 0
    target_ev = target_equity + total_debt - cash

    bounds_attempts = [
        (-0.50, 1.00),
        (-0.80, 2.00),
        (-0.95, 5.00),
    ]

    implied_growth = None
    convergence_warning = None

    for low, high in bounds_attempts:
        for _ in range(200):
            mid = (low + high) / 2

            current_fcf = float(base_fcf)
            total_pv = 0
            for i in range(projection_years):
                current_fcf *= (1 + mid)
                total_pv += current_fcf / ((1 + wacc) ** (i + 1))

            tv = (current_fcf * (1 + terminal_growth)) / (wacc - terminal_growth)
            pv_tv = tv / ((1 + wacc) ** projection_years)
            ev = total_pv + pv_tv

            if abs(ev - target_ev) < target_ev * 0.0005:
                implied_growth = mid
                break
            elif ev < target_ev:
                low = mid
            else:
                high = mid

        if implied_growth is not None:
            break

    if implied_growth is None:
        implied_growth = (low + high) / 2
        convergence_warning = f"Binary search did not converge within tolerance. Result is approximate (bounds: [{low:.1%}, {high:.1%}])."

    if implied_growth > 0.25:
        assessment = "AGGRESSIVE - Market expects very high growth"
    elif implied_growth > 0.15:
        assessment = "OPTIMISTIC - Priced for strong growth"
    elif implied_growth > 0.05:
        assessment = "REASONABLE - Moderate growth expectations"
    elif implied_growth > 0:
        assessment = "CONSERVATIVE - Low growth priced in"
    else:
        assessment = "PESSIMISTIC - Market expects decline"

    result = {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "current_price": stock.current_price,
        "market_cap": stock.market_cap,
        "base_fcf": base_fcf,
        "wacc": wacc,
        "terminal_growth": terminal_growth,
        "implied_growth_rate": round(implied_growth, 4),
        "implied_growth_pct": round(implied_growth * 100, 2),
        "assessment": assessment,
        "interpretation": (
            f"At the current price of {stock.currency} {stock.current_price:,.2f}, "
            f"the market is pricing in {implied_growth * 100:.1f}% annual FCF growth "
            f"for the next {projection_years} years."
        ),
    }

    if convergence_warning:
        result["convergence_warning"] = convergence_warning

    return result


def sensitivity_analysis(
    db: Session,
    ticker: str,
    wacc_range: Optional[List[float]] = None,
    growth_range: Optional[List[float]] = None,
    terminal_growth: float = 0.03,
    projection_years: int = 5,
) -> Dict[str, Any]:
    if wacc_range is None:
        wacc_range = [0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.14]
    if growth_range is None:
        growth_range = [0.02, 0.05, 0.08, 0.10, 0.12, 0.15, 0.18, 0.20, 0.25]

    financials = _get_latest_financials(db, ticker)
    stock = _get_stock(db, ticker)

    if not financials:
        return {"error": f"No financial data found for {ticker}"}

    latest = financials[0]
    base_fcf = _compute_base_fcf(latest)
    if not base_fcf:
        return {"error": f"No FCF data for {ticker}"}

    shares = _get_shares(stock, latest)
    total_debt = latest.total_debt or 0
    cash = latest.cash_and_equivalents or 0
    current_price = stock.current_price if stock else None

    matrix = []
    for wacc in wacc_range:
        row = {"wacc": wacc, "wacc_pct": f"{wacc * 100:.1f}%", "values": []}
        for growth in growth_range:
            current_fcf = float(base_fcf)
            total_pv = 0
            for i in range(projection_years):
                current_fcf *= (1 + growth)
                total_pv += current_fcf / ((1 + wacc) ** (i + 1))

            if wacc <= terminal_growth:
                fair_value = None
            else:
                tv = (current_fcf * (1 + terminal_growth)) / (wacc - terminal_growth)
                pv_tv = tv / ((1 + wacc) ** projection_years)
                ev = total_pv + pv_tv
                equity = ev - total_debt + cash
                fair_value = round(equity / shares, 2) if shares and shares > 0 else None

            signal = "neutral"
            if fair_value and current_price:
                pct_diff = (fair_value - current_price) / current_price * 100
                if pct_diff > 30:
                    signal = "strong_buy"
                elif pct_diff > 10:
                    signal = "buy"
                elif pct_diff > -10:
                    signal = "neutral"
                elif pct_diff > -30:
                    signal = "sell"
                else:
                    signal = "strong_sell"

            row["values"].append({
                "growth_rate": growth,
                "growth_pct": f"{growth * 100:.1f}%",
                "fair_value": fair_value,
                "signal": signal,
            })
        matrix.append(row)

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "current_price": current_price,
        "base_fcf": base_fcf,
        "terminal_growth": terminal_growth,
        "projection_years": projection_years,
        "wacc_range": [f"{w * 100:.1f}%" for w in wacc_range],
        "growth_range": [f"{g * 100:.1f}%" for g in growth_range],
        "matrix": matrix,
    }


def calculate_quality_scores(db: Session, ticker: str, wacc: Optional[float] = None) -> Dict[str, Any]:
    financials = _get_latest_financials(db, ticker, limit=3)
    stock = _get_stock(db, ticker)

    if len(financials) < 2:
        return {"error": f"Need at least 2 years of data for {ticker}"}

    if stock and stock.sector == "Financial Services":
        if stock.industry and "Insurance" in stock.industry:
            return _calculate_insurance_quality(ticker, financials, stock)
        else:
            return _calculate_camels_quality(ticker, financials, stock)

    current = financials[0]
    previous = financials[1]

    f_score = 0
    f_details = {}

    roa = None
    if current.net_income and current.total_assets and current.total_assets > 0:
        roa = current.net_income / current.total_assets
    f_details["positive_roa"] = roa is not None and roa > 0
    if f_details["positive_roa"]:
        f_score += 1

    f_details["positive_ocf"] = current.operating_cash_flow is not None and current.operating_cash_flow > 0
    if f_details["positive_ocf"]:
        f_score += 1

    prev_roa = None
    if previous.net_income and previous.total_assets and previous.total_assets > 0:
        prev_roa = previous.net_income / previous.total_assets
    f_details["improving_roa"] = roa is not None and prev_roa is not None and roa > prev_roa
    if f_details["improving_roa"]:
        f_score += 1

    f_details["accruals_check"] = (
        current.operating_cash_flow is not None
        and current.net_income is not None
        and current.operating_cash_flow > current.net_income
    )
    if f_details["accruals_check"]:
        f_score += 1

    curr_leverage = (current.total_debt or 0) / current.total_assets if current.total_assets else None
    prev_leverage = (previous.total_debt or 0) / previous.total_assets if previous.total_assets else None
    f_details["decreasing_leverage"] = curr_leverage is not None and prev_leverage is not None and curr_leverage < prev_leverage
    if f_details["decreasing_leverage"]:
        f_score += 1

    f_details["improving_liquidity"] = (
        current.current_ratio is not None
        and previous.current_ratio is not None
        and current.current_ratio > previous.current_ratio
    )
    if f_details["improving_liquidity"]:
        f_score += 1

    f_details["no_dilution"] = (
        current.shares_outstanding is not None
        and previous.shares_outstanding is not None
        and current.shares_outstanding <= previous.shares_outstanding
    )
    if f_details["no_dilution"]:
        f_score += 1

    curr_gm = current.gross_profit / current.revenue if current.gross_profit and current.revenue else None
    prev_gm = previous.gross_profit / previous.revenue if previous.gross_profit and previous.revenue else None
    f_details["improving_margin"] = curr_gm is not None and prev_gm is not None and curr_gm > prev_gm
    if f_details["improving_margin"]:
        f_score += 1

    curr_at = current.revenue / current.total_assets if current.revenue and current.total_assets else None
    prev_at = previous.revenue / previous.total_assets if previous.revenue and previous.total_assets else None
    f_details["improving_turnover"] = curr_at is not None and prev_at is not None and curr_at > prev_at
    if f_details["improving_turnover"]:
        f_score += 1

    if f_score >= 8:
        f_assessment = "STRONG - High financial quality"
    elif f_score >= 6:
        f_assessment = "GOOD - Healthy fundamentals"
    elif f_score >= 4:
        f_assessment = "AVERAGE - Mixed signals"
    elif f_score >= 2:
        f_assessment = "WEAK - Financial concerns"
    else:
        f_assessment = "DISTRESSED - Significant red flags"

    z_score = None
    z_assessment = "N/A"
    z_note = None

    if (
        current.total_assets
        and current.total_assets > 0
        and current.total_liabilities is not None
        and current.revenue
    ):
        ta = current.total_assets
        tl = current.total_liabilities or 0
        working_cap = (current.current_assets or 0) - (current.current_liabilities or 0)

        retained_earnings_proxy = current.total_equity or 0
        z_note = "Retained earnings approximated by total equity"

        market_cap = stock.market_cap if stock else None

        a = working_cap / ta
        b = retained_earnings_proxy / ta
        c = (current.ebitda or current.operating_income or 0) / ta
        d = (market_cap / tl) if market_cap and tl > 0 else 0
        e = current.revenue / ta

        z_score = round(1.2 * a + 1.4 * b + 3.3 * c + 0.6 * d + 1.0 * e, 2)

        if z_score > 2.99:
            z_assessment = "SAFE - Low bankruptcy risk"
        elif z_score > 1.81:
            z_assessment = "GREY ZONE - Moderate risk"
        else:
            z_assessment = "DISTRESS - High bankruptcy risk"

    roic = current.roic
    roic_assessment = "N/A"
    value_creation = None
    benchmark_wacc = wacc if wacc else 0.10

    if roic is not None:
        value_creation = round((roic - benchmark_wacc) * 100, 2)

        if roic > 0.20:
            roic_assessment = "EXCELLENT - Outstanding capital allocation"
        elif roic > benchmark_wacc:
            roic_assessment = f"GOOD - Creating value (ROIC {roic:.1%} > WACC {benchmark_wacc:.0%})"
        elif roic > 0:
            roic_assessment = f"POOR - Destroying value (ROIC {roic:.1%} < WACC {benchmark_wacc:.0%})"
        else:
            roic_assessment = "NEGATIVE - Losing money on invested capital"

    result = {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "piotroski": {
            "score": f_score,
            "max_score": 9,
            "assessment": f_assessment,
            "details": f_details,
        },
        "altman_z": {
            "score": z_score,
            "assessment": z_assessment,
        },
        "roic": {
            "value": round(roic * 100, 2) if roic else None,
            "benchmark_wacc": round(benchmark_wacc * 100, 1),
            "value_spread": value_creation,
            "assessment": roic_assessment,
        },
        "overall_quality": _overall_quality(f_score, z_score, roic),
    }

    if z_note:
        result["altman_z"]["note"] = z_note

    return result


def _overall_quality(f_score: int, z_score: Optional[float], roic: Optional[float]) -> Dict[str, Any]:
    points = 0
    max_points = 0

    points += (f_score / 9) * 40
    max_points += 40

    if z_score is not None:
        if z_score > 2.99:
            points += 30
        elif z_score > 1.81:
            points += 15
        max_points += 30

    if roic is not None:
        if roic > 0.20:
            points += 30
        elif roic > 0.10:
            points += 20
        elif roic > 0:
            points += 10
        max_points += 30

    if max_points == 0:
        return {"grade": "N/A", "score": 0}

    pct = points / max_points * 100
    if pct >= 85:
        grade = "A"
    elif pct >= 70:
        grade = "B"
    elif pct >= 55:
        grade = "C"
    elif pct >= 40:
        grade = "D"
    else:
        grade = "F"

    return {"grade": grade, "score": round(pct, 1)}


def _calculate_camels_quality(ticker: str, financials: List[Financial], stock: Optional[Stock]) -> Dict[str, Any]:
    current = financials[0]
    previous = financials[1]

    c_score = 0
    c_details = {}
    eq_asset_ratio = None
    if current.total_assets and current.total_equity:
        eq_asset_ratio = current.total_equity / current.total_assets
        c_details["equity_to_assets"] = f"{eq_asset_ratio * 100:.1f}%"
        if eq_asset_ratio > 0.10:
            c_score += 2
        elif eq_asset_ratio > 0.07:
            c_score += 1

    m_score = 0
    m_details = {}
    roe = current.roe
    if roe:
        m_details["roe"] = f"{roe * 100:.1f}%"
        if roe > 0.12:
            m_score += 2
        elif roe > 0.08:
            m_score += 1

    e_score = 0
    e_details = {}
    roa = None
    if current.net_income and current.total_assets:
        roa = current.net_income / current.total_assets
        e_details["roa"] = f"{roa * 100:.2f}%"
        if roa > 0.01:
            e_score += 2
        elif roa > 0.005:
            e_score += 1

    l_score = 0
    l_details = {}
    if current.cash_and_equivalents and current.total_assets:
        cash_ratio = current.cash_and_equivalents / current.total_assets
        l_details["cash_to_assets"] = f"{cash_ratio * 100:.1f}%"
        if cash_ratio > 0.05:
            l_score += 2
        elif cash_ratio > 0.02:
            l_score += 1

    total_camels = c_score + m_score + e_score + l_score
    max_camels = 8

    pct = total_camels / max_camels if max_camels else 0
    if pct >= 0.75:
        assessment = "STRONG - Healthy Capital & Earnings"
        grade = "A"
    elif pct >= 0.5:
        assessment = "ADEQUATE - Stable Fundamentals"
        grade = "B"
    elif pct >= 0.25:
        assessment = "WEAK - Vulnerable Financials"
        grade = "C"
    else:
        assessment = "POOR - High Risk"
        grade = "D"

    details_combined = {
        "Capital (Eq/Assets, target >10%)": c_details.get("equity_to_assets", "N/A"),
        "Management (ROE, target >12%)": m_details.get("roe", "N/A"),
        "Earnings (ROA, target >1%)": e_details.get("roa", "N/A"),
        "Liquidity (Cash/Assets)": l_details.get("cash_to_assets", "N/A")
    }

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "piotroski": {
            "score": total_camels,
            "max_score": max_camels,
            "assessment": f"CAMELS Proxy: {assessment}",
            "details": details_combined,
        },
        "altman_z": {
            "score": round(pct * 10, 1),
            "assessment": "N/A - Replaced by CAMELS",
        },
        "roic": {
            "value": round(roe * 100, 2) if roe else None,
            "benchmark_wacc": 12.0,
            "value_spread": round((roe - 0.12) * 100, 2) if roe else None,
            "assessment": f"ROE substituted for ROIC: {m_details.get('roe', 'N/A')}",
        },
        "overall_quality": {"grade": grade, "score": round(pct * 100, 1)},
    }


def _calculate_insurance_quality(ticker: str, financials: List[Financial], stock: Optional[Stock]) -> Dict[str, Any]:
    current = financials[0]
    previous = financials[1]

    score = 0
    max_score = 6
    details = {}

    eq_asset_ratio = None
    if current.total_assets and current.total_equity:
        eq_asset_ratio = current.total_equity / current.total_assets
        details["Solvency Proxy (Eq/Assets)"] = f"{eq_asset_ratio * 100:.1f}%"
        if eq_asset_ratio > 0.15:
            score += 2
        elif eq_asset_ratio > 0.08:
            score += 1

    bv_growth = None
    if current.total_equity and previous.total_equity and previous.total_equity > 0:
        bv_growth = (current.total_equity - previous.total_equity) / previous.total_equity
        details["EV Growth Proxy (BV Growth)"] = f"{bv_growth * 100:.1f}%"
        if bv_growth > 0.12:
            score += 2
        elif bv_growth > 0.05:
            score += 1

    roa = None
    if current.net_income and current.total_assets:
        roa = current.net_income / current.total_assets
        details["Profitability (ROA)"] = f"{roa * 100:.2f}%"
        if roa > 0.01:
            score += 2
        elif roa > 0.005:
            score += 1

    pct = score / max_score if max_score else 0
    if pct >= 0.8:
        assessment = "STRONG - High Solvency & Growth"
        grade = "A"
    elif pct >= 0.5:
        assessment = "ADEQUATE - Stable Insurance Ops"
        grade = "B"
    elif pct >= 0.3:
        assessment = "WEAK - Underperforming"
        grade = "C"
    else:
        assessment = "POOR - High Risk"
        grade = "D"

    return {
        "ticker": ticker,
        "company_name": stock.name if stock else ticker,
        "piotroski": {
            "score": score,
            "max_score": max_score,
            "assessment": f"Insurance Framework: {assessment}",
            "details": details,
        },
        "altman_z": {
            "score": round(pct * 10, 1),
            "assessment": "N/A - Replaced by Insurance Framework",
        },
        "roic": {
            "value": round(bv_growth * 100, 2) if bv_growth else None,
            "benchmark_wacc": 10.0,
            "value_spread": round((bv_growth - 0.10) * 100, 2) if bv_growth else None,
            "assessment": f"BV Growth substituted for ROIC: {details.get('EV Growth Proxy (BV Growth)', 'N/A')}",
        },
        "overall_quality": {"grade": grade, "score": round(pct * 100, 1)},
    }
