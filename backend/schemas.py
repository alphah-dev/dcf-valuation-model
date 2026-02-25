from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


class DCFRequest(BaseModel):
    ticker: str = Field(..., example="AAPL")
    wacc: float = Field(..., ge=0.01, le=0.25, example=0.10)
    growth_rates: List[float] = Field(
        ...,
        min_length=1,
        max_length=15,
        example=[0.15, 0.12, 0.10, 0.08, 0.05],
    )
    terminal_growth: float = Field(default=0.03, ge=0.0, le=0.08, example=0.03)
    fade_years: int = Field(default=0, ge=0, le=10, description="Optional fade years from last growth rate to terminal growth")

    @field_validator("growth_rates")
    @classmethod
    def validate_growth_rates(cls, v):
        for rate in v:
            if rate > 0.50 or rate < -0.50:
                raise ValueError(f"Individual growth rate {rate:.1%} out of range [-50%, +50%]")
        return v


class ReverseDCFRequest(BaseModel):
    ticker: str = Field(..., example="AAPL")
    wacc: float = Field(..., ge=0.01, le=0.25, example=0.10)
    terminal_growth: float = Field(default=0.03, ge=0.0, le=0.08)
    projection_years: int = Field(default=5, ge=1, le=15)


class SensitivityRequest(BaseModel):
    ticker: str = Field(..., example="AAPL")
    wacc_range: Optional[List[float]] = Field(
        default=None,
        example=[0.06, 0.08, 0.10, 0.12, 0.14],
    )
    growth_range: Optional[List[float]] = Field(
        default=None,
        example=[0.02, 0.05, 0.10, 0.15, 0.20],
    )
    terminal_growth: float = Field(default=0.03, ge=0.0, le=0.08)
    projection_years: int = Field(default=5, ge=1, le=15)


class StockSearchResponse(BaseModel):
    ticker: str
    name: Optional[str]
    sector: Optional[str]
    market: Optional[str]
    market_cap: Optional[int]
    current_price: Optional[float]


class RefreshRequest(BaseModel):
    ticker: str = Field(..., example="AAPL")
