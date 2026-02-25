import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routers import stocks, dcf

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("dcf")

class _SuppressWin10054(logging.Filter):
    def filter(self, record):
        return "WinError 10054" not in record.getMessage()

logging.getLogger("asyncio").addFilter(_SuppressWin10054())


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DCF Valuation Platform")
    init_db()
    logger.info("Database tables initialized")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="DCF Stock Valuation API",
    description=(
        "Financial Decision Engine that transforms raw financial data "
        "into actionable Buy/Sell/Hold signals using DCF analysis. "
        "Covers 700+ stocks across Indian (Nifty 500) and US (NASDAQ) markets."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(dcf.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "name": "DCF Stock Valuation API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
