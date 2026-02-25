from sqlalchemy import Column, String, BigInteger, Float, DateTime, func
from database import Base


class Stock(Base):
    __tablename__ = "stocks"

    ticker = Column(String(20), primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    sector = Column(String(100), nullable=True)
    industry = Column(String(200), nullable=True)
    market = Column(String(10), nullable=True)
    market_cap = Column(BigInteger, nullable=True)
    current_price = Column(Float, nullable=True)
    pe_ratio = Column(Float, nullable=True)
    pb_ratio = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    beta = Column(Float, nullable=True)
    fifty_two_week_high = Column(Float, nullable=True)
    fifty_two_week_low = Column(Float, nullable=True)
    shares_outstanding = Column(BigInteger, nullable=True)
    currency = Column(String(10), nullable=True)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "ticker": self.ticker,
            "name": self.name,
            "sector": self.sector,
            "industry": self.industry,
            "market": self.market,
            "market_cap": self.market_cap,
            "current_price": self.current_price,
            "pe_ratio": self.pe_ratio,
            "pb_ratio": self.pb_ratio,
            "dividend_yield": self.dividend_yield,
            "beta": self.beta,
            "fifty_two_week_high": self.fifty_two_week_high,
            "fifty_two_week_low": self.fifty_two_week_low,
            "shares_outstanding": self.shares_outstanding,
            "currency": self.currency,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }
