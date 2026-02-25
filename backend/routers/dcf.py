from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.stock import Stock
from schemas import DCFRequest, ReverseDCFRequest, SensitivityRequest
from services.dcf_calculator import (
    calculate_dcf,
    reverse_dcf,
    sensitivity_analysis,
    calculate_quality_scores,
)
from services.cache_manager import CacheManager
from config import settings

router = APIRouter(prefix="/api/dcf", tags=["DCF Valuation"])
cache = CacheManager(settings.REDIS_URL)


@router.post("/calculate")
def run_dcf(request: DCFRequest, db: Session = Depends(get_db)):
    result = calculate_dcf(
        db=db,
        ticker=request.ticker,
        wacc=request.wacc,
        growth_rates=request.growth_rates,
        terminal_growth=request.terminal_growth,
        fade_years=request.fade_years,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result)

    stock = db.query(Stock).filter(Stock.ticker == request.ticker).first()
    known_conglomerates = ["RELIANCE.NS", "ITC.NS", "LT.NS", "BRK-B", "BRK-A", "SONY", "DIS"]
    is_cong = False
    if stock:
        is_cong = (
            (stock.industry and "Conglomerate" in stock.industry) 
            or stock.ticker in known_conglomerates
        )
    result["is_conglomerate"] = bool(is_cong)

    return result


@router.post("/reverse")
def run_reverse_dcf(request: ReverseDCFRequest, db: Session = Depends(get_db)):
    result = reverse_dcf(
        db=db,
        ticker=request.ticker,
        wacc=request.wacc,
        terminal_growth=request.terminal_growth,
        projection_years=request.projection_years,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result)

    return result


@router.post("/sensitivity")
def run_sensitivity(request: SensitivityRequest, db: Session = Depends(get_db)):
    result = sensitivity_analysis(
        db=db,
        ticker=request.ticker,
        wacc_range=request.wacc_range,
        growth_range=request.growth_range,
        terminal_growth=request.terminal_growth,
        projection_years=request.projection_years,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result)

    return result


@router.get("/quality/{ticker}")
def get_quality_scores(ticker: str, wacc: float = None, db: Session = Depends(get_db)):
    cached = cache.get_quality(ticker)
    if cached and wacc is None:
        return cached

    result = calculate_quality_scores(db, ticker, wacc=wacc)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result)

    if wacc is None:
        cache.set_quality(ticker, result)
    return result


@router.get("/history/{ticker}")
def get_valuation_history(
    ticker: str,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    from models.valuation import Valuation

    valuations = (
        db.query(Valuation)
        .filter(Valuation.ticker == ticker)
        .order_by(Valuation.created_at.desc())
        .limit(limit)
        .all()
    )

    return [v.to_dict() for v in valuations]
