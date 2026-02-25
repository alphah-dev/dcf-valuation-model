"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { formatCurrency, formatLargeNumber, formatPercent } from "@/lib/utils"
import { useWatchlist } from "@/lib/useWatchlist"
import { Navbar } from "@/components/Navbar"
import { FinancialsChart } from "@/components/FinancialsChart"
import { PriceChart } from "@/components/PriceChart"
import {
    RefreshCw, ArrowRight, TrendingUp, TrendingDown,
    Calculator, GitCompareArrows, Shield, ChevronRight,
    CheckCircle2, XCircle, Users, Building2, Star, Zap
} from "lucide-react"

const PRICE_POLL_INTERVAL = 2 * 60 * 1000

export default function StockDetailPage() {
    const { ticker } = useParams()
    const [stock, setStock] = useState(null)
    const [financials, setFinancials] = useState([])
    const [ratios, setRatios] = useState({})
    const [peers, setPeers] = useState([])
    const [quarterly, setQuarterly] = useState({ quarters: [] })
    const [prosCons, setProsCons] = useState({ pros: [], cons: [] })
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState("overview")
    const { toggle, isWatched } = useWatchlist()
    const watched = isWatched(ticker)

    const [priceDelta, setPriceDelta] = useState(null)
    const [priceFlash, setPriceFlash] = useState(null)
    const [lastSynced, setLastSynced] = useState(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const prevPriceRef = useRef(null)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [stockData, finData, ratioData, peersData, quarterlyData, prosConsData] = await Promise.allSettled([
                    api.getStockDetails(ticker, true),
                    api.getFinancials(ticker),
                    api.getKeyRatios(ticker),
                    api.getPeers(ticker),
                    api.getQuarterly(ticker),
                    api.getProsCons(ticker),
                ])

                if (stockData.status === "fulfilled") {
                    setStock(stockData.value)
                    prevPriceRef.current = stockData.value?.current_price
                    setLastSynced(new Date())
                }
                else setError(`Stock ${ticker} not found.`)

                if (finData.status === "fulfilled") setFinancials(finData.value?.financials || [])
                if (ratioData.status === "fulfilled") setRatios(ratioData.value || {})
                if (peersData.status === "fulfilled") setPeers(peersData.value || [])
                if (quarterlyData.status === "fulfilled") setQuarterly(quarterlyData.value || { quarters: [] })
                if (prosConsData.status === "fulfilled") setProsCons(prosConsData.value || { pros: [], cons: [] })
            } catch (err) {
                setError(err.message || "Failed to load stock data.")
            } finally {
                setIsLoading(false)
            }
        }
        if (ticker) fetchAll()
    }, [ticker])

    const syncPrice = useCallback(async (showSpinner = false) => {
        if (showSpinner) setIsSyncing(true)
        try {
            const fresh = await api.getStockDetails(ticker)
            if (fresh?.current_price != null) {
                const oldPrice = prevPriceRef.current
                const newPrice = fresh.current_price

                if (oldPrice != null && oldPrice !== newPrice) {
                    const delta = newPrice - oldPrice
                    setPriceDelta(delta)
                    setPriceFlash(delta > 0 ? "up" : "down")
                    setTimeout(() => { setPriceFlash(null); setPriceDelta(null) }, 4000)
                }

                prevPriceRef.current = newPrice
                setStock(prev => ({ ...prev, current_price: newPrice, market_cap: fresh.market_cap, pe_ratio: fresh.pe_ratio, pb_ratio: fresh.pb_ratio }))
                setLastSynced(new Date())
            }
        } catch { }
        finally { if (showSpinner) setIsSyncing(false) }
    }, [ticker])

    useEffect(() => {
        if (!ticker || isLoading) return
        const interval = setInterval(() => syncPrice(false), PRICE_POLL_INTERVAL)
        return () => clearInterval(interval)
    }, [ticker, isLoading, syncPrice])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            await api.refreshStock(ticker)
            window.location.reload()
        } catch {
            setIsRefreshing(false)
        }
    }

    const currency = stock?.currency || ratios?.currency || "USD"
    const fmtVal = (v, prefix = "") => {
        if (v == null) return "—"
        return prefix + formatLargeNumber(v, currency)
    }
    const fmtPct = (v) => {
        if (v == null) return "—"
        return (v * 100).toFixed(2) + "%"
    }

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "financials", label: "Financials" },
        { id: "quarterly", label: "Quarterly" },
        { id: "peers", label: "Peers" },
    ]

    const sortedFin = useMemo(() =>
        [...financials].sort((a, b) => b.year - a.year), [financials]
    )

    if (isLoading) {
        return (
            <>
                <Navbar />
                <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full">
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Loading {ticker}...</p>
                    </div>
                </main>
            </>
        )
    }

    if (error || !stock) {
        return (
            <>
                <Navbar />
                <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full">
                    <div className="p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
                        {error || "Stock not found"}
                    </div>
                </main>
            </>
        )
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 p-3 sm:p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight font-mono">{stock.ticker}</h1>
                            <span className="text-xs bg-muted px-2 py-1 rounded font-mono">{stock.market === "IN" ? "NSE/BSE" : "NASDAQ/NYSE"}</span>
                        </div>
                        <p className="text-lg text-muted-foreground mt-1">{stock.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-primary">{stock.sector}</span>
                            {stock.industry && <><span className="text-muted-foreground">•</span><span className="text-sm text-muted-foreground">{stock.industry}</span></>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Current Price</div>
                        <div className={`text-2xl sm:text-4xl font-bold tracking-tight transition-colors duration-500 ${priceFlash === "up" ? "text-emerald-500" : priceFlash === "down" ? "text-rose-500" : ""}`}>
                            {formatCurrency(stock.current_price, currency)}
                            {priceDelta != null && (
                                <span className={`ml-2 text-sm font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md animate-pulse ${priceDelta > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                                    {priceDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {priceDelta > 0 ? "+" : ""}{priceDelta.toFixed(2)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 justify-end flex-wrap">
                            {lastSynced && (
                                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                                    Synced {lastSynced.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={() => syncPrice(true)}
                                disabled={isSyncing}
                                title="Fetch latest price"
                                className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                            >
                                <Zap className={`h-3 w-3 ${isSyncing ? "animate-pulse" : ""}`} />
                                {isSyncing ? "Syncing..." : "Sync"}
                            </button>
                            <span className="text-muted-foreground/30">|</span>
                            <button
                                onClick={() => toggle(ticker)}
                                title={watched ? "Remove from watchlist" : "Add to watchlist"}
                                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${watched
                                    ? "bg-amber-50 dark:bg-yellow-500/10 border-amber-200 dark:border-yellow-500/20 text-amber-600 dark:text-yellow-400"
                                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                                    }`}
                            >
                                <Star className={`h-3.5 w-3.5 ${watched ? "fill-amber-500 text-amber-500" : ""}`} />
                                {watched ? "Watching" : "Watch"}
                            </button>
                            <button onClick={handleRefresh} disabled={isRefreshing}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} /> Force refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <Link href={`/dcf/${ticker}`} className="flex items-center justify-between p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
                        <div className="flex items-center gap-3"><Calculator className="h-5 w-5 text-primary" /><span className="font-medium">Run Base DCF Model</span></div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                    <Link href={`/dcf/${ticker}/reverse`} className="flex items-center justify-between p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
                        <div className="flex items-center gap-3"><GitCompareArrows className="h-5 w-5 text-primary" /><span className="font-medium">Reverse Valuation</span></div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                    <Link href={`/stock/${ticker}/quality`} className="flex items-center justify-between p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
                        <div className="flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><span className="font-medium">Quality & Risk Scores</span></div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                </div>

                <div className="border-b flex gap-0 overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <div className="bg-card border rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm">
                            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Price Chart</h2>
                            <PriceChart ticker={ticker} currency={currency} />
                        </div>

                        <div className="bg-card border rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm">
                            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Key Ratios</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                                {[
                                    { label: "Market Cap", value: formatLargeNumber(stock.market_cap, currency) },
                                    { label: "Current Price", value: formatCurrency(stock.current_price, currency) },
                                    { label: "52W High / Low", value: `${formatCurrency(stock.fifty_two_week_high, currency)} / ${formatCurrency(stock.fifty_two_week_low, currency)}` },
                                    { label: "Stock P/E", value: stock.pe_ratio?.toFixed(2) || "—" },
                                    { label: "Book Value", value: ratios.book_value ? `${ratios.book_value.toFixed(2)} ${currency}` : "—" },
                                    { label: "Dividend Yield", value: stock.dividend_yield ? (stock.dividend_yield * 100).toFixed(1) + "%" : "—" },
                                    { label: "ROCE", value: ratios.roce ? (ratios.roce * 100).toFixed(2) + "%" : "—" },
                                    { label: "ROE", value: ratios.roe ? (ratios.roe * 100).toFixed(2) + "%" : "—" },
                                    { label: "Forward P/E", value: ratios.forward_pe?.toFixed(2) || "—" },
                                    { label: "P/B Ratio", value: stock.pb_ratio?.toFixed(2) || "—" },
                                    { label: "EPS", value: ratios.eps ? `${ratios.eps.toFixed(2)} ${currency}` : "—" },
                                    { label: "D/E Ratio", value: ratios.debt_to_equity?.toFixed(2) || "—" },
                                    { label: "Profit Margin", value: fmtPct(ratios.net_margin) },
                                    { label: "Op. Margin", value: fmtPct(ratios.operating_margin) },
                                    { label: "Revenue", value: formatLargeNumber(ratios.revenue, currency) },
                                    { label: "Net Income", value: formatLargeNumber(ratios.net_income, currency) },
                                    { label: "Free Cashflow", value: formatLargeNumber(ratios.free_cash_flow, currency) },
                                    { label: "Beta", value: stock.beta?.toFixed(2) || "—" },
                                    { label: "Shares Out.", value: formatLargeNumber(stock.shares_outstanding) },
                                    { label: "Current Ratio", value: ratios.current_ratio?.toFixed(2) || "—" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="p-2 sm:p-3 bg-muted/30 rounded-lg sm:rounded-xl">
                                        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-0.5 sm:mb-1 truncate">{label}</div>
                                        <div className="font-bold text-xs sm:text-sm truncate">{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {ratios.cagr && Object.keys(ratios.cagr).length > 0 && (
                            <div className="bg-card border rounded-2xl p-6 shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Compounded Annual Growth Rate (CAGR)</h2>
                                <p className="text-sm text-muted-foreground mb-4">Based on historical financial data. CAGR computed over trailing periods.</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(ratios.cagr).map(([key, val]) => {
                                        const label = key.replace(/_/g, " ").replace(/(\d)y/, " ($1Y)")
                                        return (
                                            <div key={key} className="p-3 bg-muted/30 rounded-xl">
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
                                                <div className={`font-bold text-sm ${val > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                    {val > 0 ? "+" : ""}{(val * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {(prosCons.pros.length > 0 || prosCons.cons.length > 0) && (
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-emerald-500" /> Positive Indicators
                                    </h3>
                                    <ul className="space-y-3">
                                        {prosCons.pros.map((pro, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                                <span>{pro}</span>
                                            </li>
                                        ))}
                                        {prosCons.pros.length === 0 && <li className="text-sm text-muted-foreground">No strong positive signals detected</li>}
                                    </ul>
                                </div>
                                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <TrendingDown className="h-5 w-5 text-rose-500" /> Risk Factors
                                    </h3>
                                    <ul className="space-y-3">
                                        {prosCons.cons.map((con, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                                                <span>{con}</span>
                                            </li>
                                        ))}
                                        {prosCons.cons.length === 0 && <li className="text-sm text-muted-foreground">No significant risk factors detected</li>}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="bg-card border rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold mb-4">5-Year Financial Profile</h2>
                            <FinancialsChart data={financials} currency={currency} />
                        </div>
                    </div>
                )}

                {activeTab === "financials" && (
                    <div className="space-y-6">
                        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b bg-muted/20">
                                <h2 className="text-xl font-bold">Profit & Loss</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="border-b bg-muted/10">
                                            <th className="text-left p-3 pl-6 font-medium">Period</th>
                                            {sortedFin.map(f => <th key={f.year} className="p-3 text-right font-medium">{f.year}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: "Revenue", key: "revenue" },
                                            { label: "Cost of Revenue", key: "cost_of_revenue" },
                                            { label: "Gross Profit", key: "gross_profit" },
                                            { label: "Operating Income", key: "operating_income" },
                                            { label: "Net Income", key: "net_income" },
                                            { label: "EPS", key: "eps", isCurrency: false },
                                            { label: "EBITDA", key: "ebitda" },
                                        ].map(({ label, key, isCurrency = true }) => (
                                            <tr key={key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="p-3 pl-6 font-medium">{label}</td>
                                                {sortedFin.map(f => (
                                                    <td key={f.year} className="p-3 text-right font-mono text-sm">
                                                        {f[key] != null ? (isCurrency ? formatLargeNumber(f[key], currency) : f[key]?.toFixed(2)) : "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b bg-muted/20">
                                <h2 className="text-xl font-bold">Balance Sheet</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="border-b bg-muted/10">
                                            <th className="text-left p-3 pl-6 font-medium">Item</th>
                                            {sortedFin.map(f => <th key={f.year} className="p-3 text-right font-medium">{f.year}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: "Total Assets", key: "total_assets" },
                                            { label: "Total Liabilities", key: "total_liabilities" },
                                            { label: "Stockholders Equity", key: "total_equity" },
                                            { label: "Total Debt", key: "total_debt" },
                                            { label: "Cash & Equivalents", key: "cash_and_equivalents" },
                                            { label: "Current Assets", key: "current_assets" },
                                            { label: "Current Liabilities", key: "current_liabilities" },
                                        ].map(({ label, key }) => (
                                            <tr key={key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="p-3 pl-6 font-medium">{label}</td>
                                                {sortedFin.map(f => (
                                                    <td key={f.year} className="p-3 text-right font-mono text-sm">
                                                        {f[key] != null ? formatLargeNumber(f[key], currency) : "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b bg-muted/20">
                                <h2 className="text-xl font-bold">Cash Flow</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="border-b bg-muted/10">
                                            <th className="text-left p-3 pl-6 font-medium">Item</th>
                                            {sortedFin.map(f => <th key={f.year} className="p-3 text-right font-medium">{f.year}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: "Operating Cash Flow", key: "operating_cash_flow" },
                                            { label: "Capital Expenditure", key: "capex" },
                                            { label: "Free Cash Flow", key: "free_cash_flow" },
                                        ].map(({ label, key }) => (
                                            <tr key={key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="p-3 pl-6 font-medium">{label}</td>
                                                {sortedFin.map(f => (
                                                    <td key={f.year} className="p-3 text-right font-mono text-sm">
                                                        {f[key] != null ? formatLargeNumber(f[key], currency) : "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b bg-muted/20">
                                <h2 className="text-xl font-bold">Key Ratios</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="border-b bg-muted/10">
                                            <th className="text-left p-3 pl-6 font-medium">Ratio</th>
                                            {sortedFin.map(f => <th key={f.year} className="p-3 text-right font-medium">{f.year}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: "Revenue Growth", key: "revenue_growth" },
                                            { label: "Net Margin", key: "net_margin" },
                                            { label: "ROE", key: "roe" },
                                            { label: "ROIC", key: "roic" },
                                            { label: "D/E Ratio", key: "debt_to_equity", isPct: false },
                                            { label: "Current Ratio", key: "current_ratio", isPct: false },
                                        ].map(({ label, key, isPct = true }) => (
                                            <tr key={key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="p-3 pl-6 font-medium">{label}</td>
                                                {sortedFin.map(f => (
                                                    <td key={f.year} className={`p-3 text-right font-mono text-sm ${isPct && f[key] != null
                                                        ? (f[key] > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400") : ""}`}>
                                                        {f[key] != null ? (isPct ? (f[key] * 100).toFixed(1) + "%" : f[key].toFixed(2)) : "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "quarterly" && (
                    <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b bg-muted/20">
                            <h2 className="text-xl font-bold">Quarterly Results</h2>
                        </div>
                        {quarterly.quarters.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <p>No quarterly data available. Try refreshing the stock data.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="border-b bg-muted/10">
                                            <th className="text-left p-3 pl-6 font-medium">Quarter</th>
                                            <th className="p-3 text-right font-medium">Revenue</th>
                                            <th className="p-3 text-right font-medium">Expenses</th>
                                            <th className="p-3 text-right font-medium">Op. Profit</th>
                                            <th className="p-3 text-right font-medium">OPM %</th>
                                            <th className="p-3 text-right font-medium">Net Profit</th>
                                            <th className="p-3 text-right font-medium">EPS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quarterly.quarters.map((q, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="p-3 pl-6 font-medium">{q.period}</td>
                                                <td className="p-3 text-right font-mono text-sm">{formatLargeNumber(q.revenue, currency)}</td>
                                                <td className="p-3 text-right font-mono text-sm">{formatLargeNumber(q.expenses, currency)}</td>
                                                <td className="p-3 text-right font-mono text-sm">{formatLargeNumber(q.operating_profit, currency)}</td>
                                                <td className="p-3 text-right font-mono text-sm">{q.opm_pct != null ? q.opm_pct + "%" : "—"}</td>
                                                <td className="p-3 text-right font-mono text-sm">{formatLargeNumber(q.net_profit, currency)}</td>
                                                <td className="p-3 text-right font-mono text-sm">{q.eps?.toFixed(2) || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "peers" && (
                    <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b bg-muted/20 flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-primary" />
                            <div>
                                <h2 className="text-xl font-bold">Peer Comparison</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">Companies in the same sector ({stock?.sector})</p>
                            </div>
                        </div>
                        {peers.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <p>No peer data available for this sector.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="border-b bg-muted/10">
                                            <th className="text-left p-3 pl-6 font-medium w-8">#</th>
                                            <th className="text-left p-3 font-medium">Name</th>
                                            <th className="p-3 text-right font-medium">CMP</th>
                                            <th className="p-3 text-right font-medium">P/E</th>
                                            <th className="p-3 text-right font-medium">Mkt Cap</th>
                                            <th className="p-3 text-right font-medium">Div Yld %</th>
                                            <th className="p-3 text-right font-medium">ROCE %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {peers.map((peer, i) => (
                                            <tr key={peer.ticker} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="p-3 pl-6 text-muted-foreground">{i + 1}</td>
                                                <td className="p-3">
                                                    <Link href={`/stock/${peer.ticker}`} className="hover:text-primary transition-colors flex items-center gap-2">
                                                        <span className="font-bold text-primary font-mono">{peer.ticker}</span>
                                                        <span className="text-muted-foreground truncate max-w-[200px]">{peer.name}</span>
                                                    </Link>
                                                </td>
                                                <td className="p-3 text-right font-mono">{peer.current_price ? formatCurrency(peer.current_price, peer.currency) : "—"}</td>
                                                <td className="p-3 text-right font-mono">{peer.pe_ratio?.toFixed(1) || "—"}</td>
                                                <td className="p-3 text-right font-mono">{formatLargeNumber(peer.market_cap, peer.currency)}</td>
                                                <td className="p-3 text-right font-mono">{peer.dividend_yield?.toFixed(1) || "—"}</td>
                                                <td className="p-3 text-right font-mono">{peer.roce?.toFixed(2) || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
    )
}
