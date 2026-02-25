<p align="center">
  <img src="frontend/app/icon.svg" alt="DCF Terminal" width="64" height="64" />
</p>

<h1 align="center">DCF Valuation Platform</h1>

<p align="center">
  <strong>Institutional-grade equity valuation engine with multi-model DCF analysis</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#screenshots">Screenshots</a>
</p>

---

## Overview

DCF Terminal is a full-stack equity valuation platform that automatically selects the right valuation methodology based on company characteristics. It covers **1,000+ equities** across US (NASDAQ/NYSE) and Indian (NSE/BSE) markets, with real-time price feeds, comprehensive financial analysis, and sector-specific modeling.

Unlike generic DCF calculators, this engine detects company type — banks, insurance, cyclicals, high-growth tech, conglomerates — and applies the institutional-correct methodology automatically.

## Features

### Smart Valuation Engine
- **Standard DCF** — 5-year FCFF projection with terminal value via Gordon Growth
- **Residual Income Model (RIM)** — For banks and financials where debt is raw material
- **Normalized Earnings DCF** — Mid-cycle margin adjustment for cyclical businesses
- **VC Revenue Multiples** — Terminal revenue × exit multiple for pre-profit companies
- **Embedded Value Growth** — Insurance-specific float-based valuation
- **Net Asset Value (NAV)** — Strict balance-sheet valuation for holding companies
- **Sum-of-the-Parts (SOTP)** — Segment-level valuation for conglomerates

### Analysis Tools
- **Reverse DCF** — Back-solve implied growth expectations from current market price
- **Sensitivity Matrix** — WACC × Growth heatmap showing fair value across scenarios
- **Quality Scores** — Piotroski F-Score, Altman Z, ROIC vs WACC spread, CAMELS (banks)
- **Valuation Diagnostics** — Terminal value % of EV, implied terminal multiple, reinvestment rate

### Market Data
- **Real-time prices** — Live yFinance feed with 2-minute cache, always-live on stock page load
- **Price charts** — Interactive area charts with 1m/3m/6m/1y/2y period selection
- **Market heatmap** — Sector-weighted visualization across 100+ stocks
- **Peer comparison** — Side-by-side ratios against sector peers
- **Quarterly results** — Trailing 8-quarter P&L breakdown

### Frontend
- **Dark/Light mode** — System-aware with manual toggle
- **Fully responsive** — Mobile hamburger menu, touch-optimized tables, adaptive grids
- **Watchlist** — LocalStorage-backed stock monitoring with navbar indicator
- **Live price sync** — Auto-polling with visual flash animation on price changes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS 3.4 |
| **Charts** | Recharts |
| **Backend** | FastAPI, Uvicorn |
| **Database** | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy 2.0 |
| **Cache** | Redis (optional, graceful fallback) |
| **Data Sources** | yfinance, yahooquery (fallback), FMP API (fallback) |
| **Deployment** | Railway (backend), Vercel (frontend) |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Next.js Frontend                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Landing  │ │  Market  │ │  Stock   │ │  DCF   │ │
│  │  Page    │ │ Overview │ │  Detail  │ │ Models │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────────┐
│                  FastAPI Backend                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │  Stock   │ │   DCF    │ │   Data Fetcher       │ │
│  │  Router  │ │  Router  │ │ yfinance → yquery →  │ │
│  │          │ │          │ │ FMP (cascade)         │ │
│  └────┬─────┘ └────┬─────┘ └──────────┬───────────┘ │
│       │            │                  │              │
│  ┌────┴────────────┴──────────────────┴───────────┐ │
│  │         SQLAlchemy ORM + Redis Cache            │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Redis (optional — app works without it)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment (optional)
cp .env.example .env
# Edit .env with your FMP_API_KEY, DATABASE_URL, REDIS_URL

# Start the server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies API calls to the backend at `http://localhost:8000`.

### Seed Data

```bash
cd backend

# Bulk import all stocks (US + India)
python scripts/bulk_collector.py

# Or update existing data
python scripts/daily_update.py
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./dcf.db` | Database connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis cache URL |
| `FMP_API_KEY` | — | Financial Modeling Prep API key (fallback data source) |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

## API Reference

### Stocks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stocks/search?q=AAPL` | Search stocks by ticker or name |
| `GET` | `/api/stocks/overview?market=US` | Market overview with pagination |
| `GET` | `/api/stocks/{ticker}?live=true` | Stock detail (live=true skips cache) |
| `GET` | `/api/stocks/{ticker}/financials` | Annual financials (5 years) |
| `GET` | `/api/stocks/{ticker}/key-ratios` | Comprehensive ratio analysis |
| `GET` | `/api/stocks/{ticker}/quarterly` | Quarterly P&L (8 quarters) |
| `GET` | `/api/stocks/{ticker}/peers` | Sector peer comparison |
| `GET` | `/api/stocks/{ticker}/pros-cons` | Auto-generated bull/bear points |
| `GET` | `/api/stocks/{ticker}/price-history` | Historical prices for charting |
| `POST` | `/api/stocks/{ticker}/refresh` | Force re-fetch from yFinance |
| `GET` | `/api/stocks/heatmap/data` | Heatmap visualization data |
| `GET` | `/api/stocks/movers/top` | Value and growth picks |

### Valuation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/dcf/calculate` | Run DCF model (auto-selects methodology) |
| `POST` | `/api/dcf/reverse` | Reverse DCF — solve for implied growth |
| `POST` | `/api/dcf/sensitivity` | WACC × Growth sensitivity matrix |
| `GET` | `/api/dcf/quality/{ticker}` | Quality & risk scoring |

## Project Structure

```
dcf/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment configuration
│   ├── database.py             # SQLAlchemy engine & session
│   ├── models/
│   │   ├── stock.py            # Stock model
│   │   ├── financial.py        # Financial statement model
│   │   └── valuation.py        # Valuation history model
│   ├── routers/
│   │   ├── stocks.py           # Stock data endpoints
│   │   └── dcf.py              # DCF calculation endpoints
│   ├── services/
│   │   ├── dcf_calculator.py   # Core valuation engine
│   │   ├── data_fetcher.py     # yFinance data fetcher
│   │   ├── fmp_fetcher.py      # FMP API fallback
│   │   ├── yq_fetcher.py       # yahooquery fallback
│   │   ├── cache_manager.py    # Redis cache layer
│   │   └── ticker_lists.py     # Market ticker definitions
│   ├── scripts/
│   │   ├── bulk_collector.py   # Full data import
│   │   └── daily_update.py     # Incremental update
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.jsx            # Landing page
│   │   ├── market/page.jsx     # Market overview
│   │   ├── search/page.jsx     # Equity screener
│   │   ├── stock/[ticker]/     # Stock detail page
│   │   └── dcf/[ticker]/       # DCF calculator pages
│   ├── components/
│   │   ├── Navbar.jsx          # Navigation with mobile menu
│   │   ├── PriceChart.jsx      # Interactive price chart
│   │   └── WaterfallChart.jsx  # EV-to-equity bridge
│   ├── lib/
│   │   ├── api.js              # API client
│   │   ├── utils.js            # Formatting utilities
│   │   └── useWatchlist.js     # Watchlist hook
│   └── package.json
└── README.md
```

## Valuation Methodology

The engine automatically detects the company type and selects the appropriate model:

| Company Type | Model Applied | Why |
|-------------|---------------|-----|
| Stable cashflow businesses | Standard FCFF DCF | Predictable free cash flows |
| Banks & NBFCs | Residual Income Model | Debt is raw material, FCF meaningless |
| Insurance | Embedded Value Growth | Value lies in policy float |
| Cyclicals & Commodities | Normalized Earnings DCF | Current margins distort value |
| Pre-profit / High growth | VC Revenue Multiples | Negative earnings break DCF |
| Holding companies | Net Asset Value | Unpredictable lumpy cash flows |
| Conglomerates | Sum-of-the-Parts | Single WACC destroys precision |

## License

This project is for educational and personal use. Financial data is sourced via yFinance and FMP. **Not investment advice.**

---

<p align="center">
  Built with FastAPI + Next.js
</p>
