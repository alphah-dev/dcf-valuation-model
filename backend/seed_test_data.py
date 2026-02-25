import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, init_db
from models.stock import Stock
from models.financial import Financial

STOCKS = [
    {
        "ticker": "AAPL", "name": "Apple Inc.", "sector": "Technology",
        "industry": "Consumer Electronics", "market": "US",
        "market_cap": 3500000000000, "current_price": 228.0,
        "pe_ratio": 35.2, "pb_ratio": 48.5, "dividend_yield": 0.0044,
        "beta": 1.24, "fifty_two_week_high": 237.49,
        "fifty_two_week_low": 164.08, "shares_outstanding": 15334000000,
        "currency": "USD",
    },
    {
        "ticker": "RELIANCE.NS", "name": "Reliance Industries Limited",
        "sector": "Energy", "industry": "Oil & Gas Refining & Marketing",
        "market": "IN", "market_cap": 17300000000000,
        "current_price": 1280.0, "pe_ratio": 26.8, "pb_ratio": 2.1,
        "dividend_yield": 0.0035, "beta": 0.78,
        "fifty_two_week_high": 1608.95, "fifty_two_week_low": 1202.0,
        "shares_outstanding": 13530000000, "currency": "INR",
    },
    {
        "ticker": "MSFT", "name": "Microsoft Corporation",
        "sector": "Technology", "industry": "Software - Infrastructure",
        "market": "US", "market_cap": 3060000000000,
        "current_price": 412.0, "pe_ratio": 36.5, "pb_ratio": 12.8,
        "dividend_yield": 0.0072, "beta": 0.89,
        "fifty_two_week_high": 468.35, "fifty_two_week_low": 362.9,
        "shares_outstanding": 7430000000, "currency": "USD",
    },
]

FINANCIALS = {
    "AAPL": [
        {"year": 2024, "revenue": 383285000000, "cost_of_revenue": 214137000000, "gross_profit": 169148000000, "operating_income": 114301000000, "net_income": 93736000000, "ebitda": 125820000000, "eps": 6.11, "total_assets": 352583000000, "total_liabilities": 290437000000, "total_equity": 62146000000, "total_debt": 104590000000, "cash_and_equivalents": 29965000000, "current_assets": 133120000000, "current_liabilities": 153982000000, "operating_cash_flow": 110543000000, "capex": -9959000000, "free_cash_flow": 100584000000, "shares_outstanding": 15334000000, "revenue_growth": 0.021, "net_margin": 0.2445, "roe": 1.508, "roic": 0.499, "debt_to_equity": 1.683, "current_ratio": 0.864},
        {"year": 2023, "revenue": 383933000000, "cost_of_revenue": 214137000000, "gross_profit": 169796000000, "operating_income": 114301000000, "net_income": 96995000000, "ebitda": 123456000000, "eps": 6.13, "total_assets": 352583000000, "total_liabilities": 290020000000, "total_equity": 62563000000, "total_debt": 111088000000, "cash_and_equivalents": 29965000000, "current_assets": 143566000000, "current_liabilities": 145308000000, "operating_cash_flow": 110543000000, "capex": -10708000000, "free_cash_flow": 99835000000, "shares_outstanding": 15813000000, "revenue_growth": -0.028, "net_margin": 0.2526, "roe": 1.551, "roic": 0.493, "debt_to_equity": 1.776, "current_ratio": 0.988},
        {"year": 2022, "revenue": 394328000000, "cost_of_revenue": 223546000000, "gross_profit": 170782000000, "operating_income": 119437000000, "net_income": 99803000000, "ebitda": 130541000000, "eps": 6.15, "total_assets": 352755000000, "total_liabilities": 302083000000, "total_equity": 50672000000, "total_debt": 111088000000, "cash_and_equivalents": 23646000000, "current_assets": 135405000000, "current_liabilities": 153982000000, "operating_cash_flow": 122151000000, "capex": -10708000000, "free_cash_flow": 111443000000, "shares_outstanding": 16216000000, "revenue_growth": 0.079, "net_margin": 0.2531, "roe": 1.970, "roic": 0.554, "debt_to_equity": 2.192, "current_ratio": 0.879},
        {"year": 2021, "revenue": 365817000000, "cost_of_revenue": 212981000000, "gross_profit": 152836000000, "operating_income": 108949000000, "net_income": 94680000000, "ebitda": 120233000000, "eps": 5.61, "total_assets": 351002000000, "total_liabilities": 287912000000, "total_equity": 63090000000, "total_debt": 124719000000, "cash_and_equivalents": 34940000000, "current_assets": 134836000000, "current_liabilities": 125481000000, "operating_cash_flow": 104038000000, "capex": -11085000000, "free_cash_flow": 92953000000, "shares_outstanding": 16865000000, "revenue_growth": 0.334, "net_margin": 0.2588, "roe": 1.501, "roic": 0.435, "debt_to_equity": 1.977, "current_ratio": 1.075},
        {"year": 2020, "revenue": 274515000000, "cost_of_revenue": 169559000000, "gross_profit": 104956000000, "operating_income": 66288000000, "net_income": 57411000000, "ebitda": 77344000000, "eps": 3.28, "total_assets": 323888000000, "total_liabilities": 258549000000, "total_equity": 65339000000, "total_debt": 112436000000, "cash_and_equivalents": 38016000000, "current_assets": 143713000000, "current_liabilities": 105392000000, "operating_cash_flow": 80674000000, "capex": -7309000000, "free_cash_flow": 73365000000, "shares_outstanding": 17528000000, "revenue_growth": 0.056, "net_margin": 0.2091, "roe": 0.879, "roic": 0.280, "debt_to_equity": 1.721, "current_ratio": 1.364},
    ],
    "RELIANCE.NS": [
        {"year": 2024, "revenue": 9741030000000, "cost_of_revenue": 6389430000000, "gross_profit": 3351600000000, "operating_income": 1578000000000, "net_income": 790230000000, "ebitda": 2100000000000, "eps": 58.41, "total_assets": 16573500000000, "total_liabilities": 10089700000000, "total_equity": 6483800000000, "total_debt": 3189000000000, "cash_and_equivalents": 189350000000, "current_assets": 4300000000000, "current_liabilities": 5200000000000, "operating_cash_flow": 1230500000000, "capex": -865000000000, "free_cash_flow": 365500000000, "shares_outstanding": 13530000000, "revenue_growth": 0.024, "net_margin": 0.0812, "roe": 0.122, "roic": 0.122, "debt_to_equity": 0.492, "current_ratio": 0.827},
        {"year": 2023, "revenue": 9515620000000, "cost_of_revenue": 6300000000000, "gross_profit": 3215620000000, "operating_income": 1456000000000, "net_income": 730040000000, "ebitda": 1950000000000, "eps": 53.97, "total_assets": 15680000000000, "total_liabilities": 9620000000000, "total_equity": 6060000000000, "total_debt": 3050000000000, "cash_and_equivalents": 167000000000, "current_assets": 4100000000000, "current_liabilities": 4900000000000, "operating_cash_flow": 1100000000000, "capex": -780000000000, "free_cash_flow": 320000000000, "shares_outstanding": 13530000000, "revenue_growth": 0.237, "net_margin": 0.0767, "roe": 0.120, "roic": 0.120, "debt_to_equity": 0.503, "current_ratio": 0.837},
        {"year": 2022, "revenue": 7692310000000, "cost_of_revenue": 5100000000000, "gross_profit": 2592310000000, "operating_income": 1200000000000, "net_income": 605030000000, "ebitda": 1600000000000, "eps": 44.73, "total_assets": 14200000000000, "total_liabilities": 8800000000000, "total_equity": 5400000000000, "total_debt": 2800000000000, "cash_and_equivalents": 150000000000, "current_assets": 3800000000000, "current_liabilities": 4500000000000, "operating_cash_flow": 950000000000, "capex": -650000000000, "free_cash_flow": 300000000000, "shares_outstanding": 13530000000, "revenue_growth": 0.468, "net_margin": 0.0787, "roe": 0.112, "roic": 0.110, "debt_to_equity": 0.519, "current_ratio": 0.844},
        {"year": 2021, "revenue": 5239910000000, "cost_of_revenue": 3500000000000, "gross_profit": 1739910000000, "operating_income": 850000000000, "net_income": 493780000000, "ebitda": 1200000000000, "eps": 36.50, "total_assets": 13000000000000, "total_liabilities": 8100000000000, "total_equity": 4900000000000, "total_debt": 2600000000000, "cash_and_equivalents": 130000000000, "current_assets": 3500000000000, "current_liabilities": 4100000000000, "operating_cash_flow": 800000000000, "capex": -550000000000, "free_cash_flow": 250000000000, "shares_outstanding": 13530000000, "revenue_growth": -0.222, "net_margin": 0.0942, "roe": 0.101, "roic": 0.085, "debt_to_equity": 0.531, "current_ratio": 0.854},
        {"year": 2020, "revenue": 6735070000000, "cost_of_revenue": 4600000000000, "gross_profit": 2135070000000, "operating_income": 980000000000, "net_income": 394130000000, "ebitda": 1400000000000, "eps": 29.13, "total_assets": 12500000000000, "total_liabilities": 7800000000000, "total_equity": 4700000000000, "total_debt": 2500000000000, "cash_and_equivalents": 120000000000, "current_assets": 3200000000000, "current_liabilities": 3900000000000, "operating_cash_flow": 700000000000, "capex": -500000000000, "free_cash_flow": 200000000000, "shares_outstanding": 13530000000, "revenue_growth": 0.052, "net_margin": 0.0585, "roe": 0.084, "roic": 0.102, "debt_to_equity": 0.532, "current_ratio": 0.821},
    ],
    "MSFT": [
        {"year": 2024, "revenue": 245122000000, "cost_of_revenue": 74073000000, "gross_profit": 171049000000, "operating_income": 109433000000, "net_income": 88136000000, "ebitda": 127950000000, "eps": 11.86, "total_assets": 512163000000, "total_liabilities": 243686000000, "total_equity": 268477000000, "total_debt": 59520000000, "cash_and_equivalents": 18315000000, "current_assets": 159734000000, "current_liabilities": 125286000000, "operating_cash_flow": 118548000000, "capex": -44477000000, "free_cash_flow": 74071000000, "shares_outstanding": 7430000000, "revenue_growth": 0.158, "net_margin": 0.3596, "roe": 0.328, "roic": 0.250, "debt_to_equity": 0.222, "current_ratio": 1.275},
        {"year": 2023, "revenue": 211915000000, "cost_of_revenue": 65863000000, "gross_profit": 146052000000, "operating_income": 88523000000, "net_income": 72361000000, "ebitda": 107543000000, "eps": 9.68, "total_assets": 411976000000, "total_liabilities": 205753000000, "total_equity": 206223000000, "total_debt": 47032000000, "cash_and_equivalents": 34704000000, "current_assets": 184257000000, "current_liabilities": 104149000000, "operating_cash_flow": 87582000000, "capex": -28107000000, "free_cash_flow": 59475000000, "shares_outstanding": 7472000000, "revenue_growth": 0.069, "net_margin": 0.3415, "roe": 0.351, "roic": 0.262, "debt_to_equity": 0.228, "current_ratio": 1.769},
        {"year": 2022, "revenue": 198270000000, "cost_of_revenue": 62650000000, "gross_profit": 135620000000, "operating_income": 83383000000, "net_income": 72738000000, "ebitda": 100116000000, "eps": 9.65, "total_assets": 364840000000, "total_liabilities": 198298000000, "total_equity": 166542000000, "total_debt": 47032000000, "cash_and_equivalents": 13931000000, "current_assets": 169684000000, "current_liabilities": 95082000000, "operating_cash_flow": 89035000000, "capex": -23886000000, "free_cash_flow": 65149000000, "shares_outstanding": 7540000000, "revenue_growth": 0.180, "net_margin": 0.3669, "roe": 0.437, "roic": 0.293, "debt_to_equity": 0.282, "current_ratio": 1.785},
        {"year": 2021, "revenue": 168088000000, "cost_of_revenue": 52232000000, "gross_profit": 115856000000, "operating_income": 69916000000, "net_income": 61271000000, "ebitda": 82730000000, "eps": 8.05, "total_assets": 333779000000, "total_liabilities": 191791000000, "total_equity": 141988000000, "total_debt": 50074000000, "cash_and_equivalents": 14224000000, "current_assets": 184406000000, "current_liabilities": 88657000000, "operating_cash_flow": 76740000000, "capex": -20622000000, "free_cash_flow": 56118000000, "shares_outstanding": 7610000000, "revenue_growth": 0.178, "net_margin": 0.3645, "roe": 0.431, "roic": 0.273, "debt_to_equity": 0.353, "current_ratio": 2.080},
        {"year": 2020, "revenue": 143015000000, "cost_of_revenue": 46078000000, "gross_profit": 96937000000, "operating_income": 52959000000, "net_income": 44281000000, "ebitda": 64768000000, "eps": 5.76, "total_assets": 301311000000, "total_liabilities": 183007000000, "total_equity": 118304000000, "total_debt": 59578000000, "cash_and_equivalents": 13576000000, "current_assets": 181915000000, "current_liabilities": 72310000000, "operating_cash_flow": 60675000000, "capex": -15441000000, "free_cash_flow": 45234000000, "shares_outstanding": 7690000000, "revenue_growth": 0.138, "net_margin": 0.3096, "roe": 0.374, "roic": 0.224, "debt_to_equity": 0.503, "current_ratio": 2.517},
    ],
}

init_db()
db = SessionLocal()

total_s = 0
total_f = 0

for s_data in STOCKS:
    from datetime import datetime
    existing = db.query(Stock).filter(Stock.ticker == s_data["ticker"]).first()
    if existing:
        for k, v in s_data.items():
            setattr(existing, k, v)
        existing.last_updated = datetime.utcnow()
    else:
        db.add(Stock(**s_data, last_updated=datetime.utcnow()))
    db.commit()
    total_s += 1

    ticker = s_data["ticker"]
    for f_data in FINANCIALS.get(ticker, []):
        existing = db.query(Financial).filter(
            Financial.ticker == ticker, Financial.year == f_data["year"]
        ).first()
        if existing:
            for k, v in f_data.items():
                setattr(existing, k, v)
        else:
            db.add(Financial(ticker=ticker, **f_data))
        db.commit()
        total_f += 1

    t = ticker
    s = db.query(Stock).filter(Stock.ticker == t).first()
    n = db.query(Financial).filter(Financial.ticker == t).count()
    print(f"  {t}: {s.name} | Price: {s.currency} {s.current_price} | {n} years of financials")

db.close()
print(f"\nDatabase: {total_s} stocks, {total_f} financial records")
print("Seed complete.")
