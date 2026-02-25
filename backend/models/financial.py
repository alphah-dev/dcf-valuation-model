from sqlalchemy import Column, String, Integer, BigInteger, Float, DateTime, func
from database import Base


class Financial(Base):
    __tablename__ = "financials"

    ticker = Column(String(20), primary_key=True, index=True)
    year = Column(Integer, primary_key=True)

    revenue = Column(BigInteger, nullable=True)
    cost_of_revenue = Column(BigInteger, nullable=True)
    gross_profit = Column(BigInteger, nullable=True)
    operating_income = Column(BigInteger, nullable=True)
    net_income = Column(BigInteger, nullable=True)
    ebitda = Column(BigInteger, nullable=True)
    eps = Column(Float, nullable=True)

    total_assets = Column(BigInteger, nullable=True)
    total_liabilities = Column(BigInteger, nullable=True)
    total_equity = Column(BigInteger, nullable=True)
    total_debt = Column(BigInteger, nullable=True)
    cash_and_equivalents = Column(BigInteger, nullable=True)
    current_assets = Column(BigInteger, nullable=True)
    current_liabilities = Column(BigInteger, nullable=True)

    operating_cash_flow = Column(BigInteger, nullable=True)
    capex = Column(BigInteger, nullable=True)
    free_cash_flow = Column(BigInteger, nullable=True)

    shares_outstanding = Column(BigInteger, nullable=True)
    revenue_growth = Column(Float, nullable=True)
    net_margin = Column(Float, nullable=True)
    roe = Column(Float, nullable=True)
    roic = Column(Float, nullable=True)
    debt_to_equity = Column(Float, nullable=True)
    current_ratio = Column(Float, nullable=True)

    last_updated = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "ticker": self.ticker,
            "year": self.year,
            "revenue": self.revenue,
            "cost_of_revenue": self.cost_of_revenue,
            "gross_profit": self.gross_profit,
            "operating_income": self.operating_income,
            "net_income": self.net_income,
            "ebitda": self.ebitda,
            "eps": self.eps,
            "total_assets": self.total_assets,
            "total_liabilities": self.total_liabilities,
            "total_equity": self.total_equity,
            "total_debt": self.total_debt,
            "cash_and_equivalents": self.cash_and_equivalents,
            "current_assets": self.current_assets,
            "current_liabilities": self.current_liabilities,
            "operating_cash_flow": self.operating_cash_flow,
            "capex": self.capex,
            "free_cash_flow": self.free_cash_flow,
            "shares_outstanding": self.shares_outstanding,
            "revenue_growth": self.revenue_growth,
            "net_margin": self.net_margin,
            "roe": self.roe,
            "roic": self.roic,
            "debt_to_equity": self.debt_to_equity,
            "current_ratio": self.current_ratio,
        }
