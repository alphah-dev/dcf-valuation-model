from sqlalchemy import Column, String, Integer, Float, Text, DateTime, func
from database import Base
import json


class Valuation(Base):
    __tablename__ = "valuations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), index=True, nullable=False)

    wacc = Column(Float, nullable=False)
    terminal_growth = Column(Float, nullable=False, default=0.03)
    growth_rates_json = Column(Text, nullable=False)
    projection_years = Column(Integer, default=5)

    enterprise_value = Column(Float, nullable=True)
    equity_value = Column(Float, nullable=True)
    fair_value_per_share = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    margin_of_safety = Column(Float, nullable=True)

    pv_fcf = Column(Float, nullable=True)
    pv_terminal = Column(Float, nullable=True)

    implied_growth_rate = Column(Float, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    @property
    def growth_rates(self):
        return json.loads(self.growth_rates_json) if self.growth_rates_json else []

    @growth_rates.setter
    def growth_rates(self, value):
        self.growth_rates_json = json.dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "ticker": self.ticker,
            "wacc": self.wacc,
            "terminal_growth": self.terminal_growth,
            "growth_rates": self.growth_rates,
            "projection_years": self.projection_years,
            "enterprise_value": self.enterprise_value,
            "equity_value": self.equity_value,
            "fair_value_per_share": self.fair_value_per_share,
            "current_price": self.current_price,
            "margin_of_safety": self.margin_of_safety,
            "pv_fcf": self.pv_fcf,
            "pv_terminal": self.pv_terminal,
            "implied_growth_rate": self.implied_growth_rate,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
