"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { formatLargeNumber, formatCurrency } from "@/lib/utils"
import { Navbar } from "@/components/Navbar"
import {
    Calculator, GitCompareArrows, BarChart3, Shield,
    TrendingUp, Search, LineChart, ArrowRight,
    Globe, Landmark, Activity, Layers,
    ChevronRight, Sparkles, Grid3X3, Zap,
    TrendingDown, Building2, ArrowUpRight, Target
} from "lucide-react"

export default function HomePage() {
    const [stats, setStats] = useState(null)
    const [topStocks, setTopStocks] = useState({ us: [], in: [] })
    const [movers, setMovers] = useState({ value_picks: [], growth_picks: [] })
    const [moversMarket, setMoversMarket] = useState("IN")
    const [moversLoading, setMoversLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usOverview, inOverview] = await Promise.allSettled([
                    api.getMarketOverview("US"),
                    api.getMarketOverview("IN"),
                ])

                if (usOverview.status === "fulfilled" || inOverview.status === "fulfilled") {
                    const us = usOverview.status === "fulfilled" ? usOverview.value : { summary: {}, top_stocks: [] }
                    const india = inOverview.status === "fulfilled" ? inOverview.value : { summary: {}, top_stocks: [] }

                    setStats({
                        total: (us.summary?.us_stocks || 0) + (india.summary?.indian_stocks || 0),
                        us: us.summary?.us_stocks || 0,
                        in: india.summary?.indian_stocks || 0,
                    })
                    setTopStocks({
                        us: (us.top_stocks || []).slice(0, 5),
                        in: (india.top_stocks || []).slice(0, 5),
                    })
                }
            } catch (err) {
                console.error("Failed to load home data", err)
            }
        }
        fetchData()
    }, [])

    useEffect(() => {
        const fetchMovers = async () => {
            setMoversLoading(true)
            try {
                const data = await api.getTopMovers(moversMarket)
                setMovers(data)
            } catch { /* silent */ } finally {
                setMoversLoading(false)
            }
        }
        fetchMovers()
    }, [moversMarket])

    return (
        <>
            <Navbar />
            <main className="flex-1">
                <section className="relative overflow-hidden min-h-[80vh] sm:min-h-[90vh] flex items-center">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-500/8 blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
                        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-500/8 blur-3xl animate-pulse" style={{ animationDuration: "8s", animationDelay: "2s" }} />
                        <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "4s" }} />
                        <div className="absolute inset-0 opacity-[0.02]"
                            style={{
                                backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                                backgroundSize: "60px 60px"
                            }}
                        />
                    </div>

                    <div className="container mx-auto px-4 py-12 sm:py-20 lg:py-28 relative z-10">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex justify-center mb-8">
                                <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 backdrop-blur-sm text-primary text-xs px-4 py-2 rounded-full font-medium">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    Institutional-Grade Valuation Engine
                                </div>
                            </div>

                            <h1 className="text-center text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.08]">
                                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                                    Precision equity
                                </span>
                                <br />
                                <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 bg-clip-text text-transparent">
                                    valuation.
                                </span>
                            </h1>

                            <p className="text-center text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-4 sm:mt-6 leading-relaxed">
                                Multi-model DCF engine that auto-selects the right methodology.
                                {stats?.total ? ` ${stats.total.toLocaleString()}+ ` : " 1,000+ "}
                                equities across US & Indian markets.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center mt-6 sm:mt-10">
                                <Link href="/market" className="group flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all text-sm sm:text-base">
                                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" /> Market Overview
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                                <Link href="/search" className="flex items-center justify-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold hover:bg-card hover:border-border transition-all text-sm sm:text-base">
                                    <Search className="h-4 w-4 sm:h-5 sm:w-5" /> Launch Screener
                                </Link>
                                <Link href="/market/heatmap" className="flex items-center justify-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold hover:bg-card hover:border-border transition-all text-sm sm:text-base">
                                    <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5" /> Heatmap
                                </Link>
                            </div>

                            {stats && stats.total > 0 && (
                                <div className="mt-8 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                                    {[
                                        { value: stats.total.toLocaleString(), label: "Total Equities", gradient: "from-blue-500/10 to-violet-500/10", accent: "text-blue-500" },
                                        { value: stats.us.toLocaleString(), label: "US (NASDAQ/NYSE)", gradient: "from-sky-500/10 to-blue-500/10", accent: "text-sky-500" },
                                        { value: stats.in.toLocaleString(), label: "India (NSE/BSE)", gradient: "from-emerald-500/10 to-teal-500/10", accent: "text-emerald-500" },
                                        { value: "6", label: "Valuation Models", gradient: "from-violet-500/10 to-fuchsia-500/10", accent: "text-violet-500" },
                                    ].map(({ value, label, gradient, accent }) => (
                                        <div key={label} className={`relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/50 bg-gradient-to-br ${gradient} backdrop-blur-sm p-3 sm:p-5 md:p-6 text-center group hover:border-border hover:shadow-md transition-all`}>
                                            <div className={`text-2xl sm:text-3xl md:text-4xl font-bold ${accent} tabular-nums`}>{value}</div>
                                            <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-medium">{label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="border-t border-b bg-muted/10">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-primary">
                                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium">Built on original research — read the paper behind the valuation engine</span>
                            </div>
                            <a
                                href="https://drive.google.com/file/d/1XrX6Jts6NP-DirjR0ZXpUL3wlVFUbZ7o/view?usp=sharing"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Read Paper <ArrowUpRight className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </section>

                <section className="border-t bg-gradient-to-b from-muted/30 to-background">
                    <div className="container mx-auto px-4 py-10 sm:py-16 lg:py-20">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 text-xs text-primary font-semibold tracking-widest uppercase mb-3">
                                <Target className="h-3.5 w-3.5" /> Capabilities
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Complete Valuation Toolkit</h2>
                            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Every tool you need for institutional-quality equity analysis</p>
                        </div>

                        <div className="grid sm:grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 max-w-6xl mx-auto">
                            <div className="sm:col-span-2 md:col-span-4 group relative overflow-hidden rounded-2xl sm:rounded-3xl border bg-card p-5 sm:p-8 hover:shadow-lg hover:border-blue-500/30 transition-all">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl -translate-y-12 translate-x-12 group-hover:bg-blue-500/10 transition-colors" />
                                <div className="relative">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 mb-5">
                                        <Calculator className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Multi-Model DCF Engine</h3>
                                    <p className="text-muted-foreground leading-relaxed max-w-lg">
                                        Auto-detects company type and applies the correct methodology — Standard DCF, Residual Income, Embedded Value, Normalized Earnings, NAV, or VC Method. Full-precision math with optional growth fade period.
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-5">
                                        {["FCF Projections", "Terminal Value", "Fade Period", "Diagnostics"].map(tag => (
                                            <span key={tag} className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-card p-7 hover:shadow-lg hover:border-violet-500/30 transition-all flex flex-col">
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl translate-y-8 -translate-x-8 group-hover:bg-violet-500/10 transition-colors" />
                                <div className="relative flex-1 flex flex-col">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 mb-5">
                                        <GitCompareArrows className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">Reverse DCF</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                                        What growth is the market pricing in? Back-solve implied expectations from current stock price with adaptive convergence.
                                    </p>
                                </div>
                            </div>

                            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-card p-7 hover:shadow-lg hover:border-emerald-500/30 transition-all">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Quality Framework</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Piotroski F-Score, Altman Z, ROIC vs WACC spread. CAMELS for banks, custom scoring for insurance.
                                </p>
                            </div>

                            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-card p-7 hover:shadow-lg hover:border-amber-500/30 transition-all">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
                                    <Layers className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Sensitivity Matrix</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    WACC × Growth heatmap across scenarios. See fair value shift as assumptions change.
                                </p>
                            </div>

                            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-card p-7 hover:shadow-lg hover:border-teal-500/30 transition-all">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 mb-4">
                                    <Grid3X3 className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Market Heatmap</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Treemap visualisation sized by market cap, colored by valuation signal. Spot opportunities instantly.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {(topStocks.us.length > 0 || topStocks.in.length > 0) && (
                    <section className="border-t">
                        <div className="container mx-auto px-4 py-16 lg:py-20">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl md:text-4xl font-bold">Top Stocks by Market Cap</h2>
                                <p className="text-muted-foreground mt-2">Quick access to the most tracked equities</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                                {topStocks.us.length > 0 && (
                                    <div className="rounded-3xl border overflow-hidden bg-card hover:shadow-lg transition-shadow">
                                        <div className="p-5 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-b flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                <Globe className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">US Markets</h3>
                                                <p className="text-xs text-muted-foreground">NASDAQ / NYSE</p>
                                            </div>
                                        </div>
                                        <div className="divide-y">
                                            {topStocks.us.map((stock, i) => (
                                                <Link key={stock.ticker} href={`/stock/${stock.ticker}`}
                                                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground/60 w-5 font-mono">{i + 1}</span>
                                                        <div>
                                                            <span className="font-bold text-primary font-mono">{stock.ticker}</span>
                                                            <span className="text-sm text-muted-foreground ml-2 hidden md:inline">{stock.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-sm">{formatCurrency(stock.current_price, "USD")}</span>
                                                        <span className="text-xs text-muted-foreground hidden sm:inline">{formatLargeNumber(stock.market_cap, "USD")}</span>
                                                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                        <Link href="/market?m=US" className="flex items-center justify-center gap-1 p-3.5 border-t text-sm text-primary font-semibold hover:bg-muted/30 transition-colors">
                                            View all US stocks <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                )}

                                {topStocks.in.length > 0 && (
                                    <div className="rounded-3xl border overflow-hidden bg-card hover:shadow-lg transition-shadow">
                                        <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                <Landmark className="h-5 w-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">Indian Markets</h3>
                                                <p className="text-xs text-muted-foreground">NSE / BSE</p>
                                            </div>
                                        </div>
                                        <div className="divide-y">
                                            {topStocks.in.map((stock, i) => (
                                                <Link key={stock.ticker} href={`/stock/${stock.ticker}`}
                                                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground/60 w-5 font-mono">{i + 1}</span>
                                                        <div>
                                                            <span className="font-bold text-primary font-mono">{stock.ticker}</span>
                                                            <span className="text-sm text-muted-foreground ml-2 hidden md:inline">{stock.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-sm">{formatCurrency(stock.current_price, "INR")}</span>
                                                        <span className="text-xs text-muted-foreground hidden sm:inline">{formatLargeNumber(stock.market_cap, "INR")}</span>
                                                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                        <Link href="/market?m=IN" className="flex items-center justify-center gap-1 p-3.5 border-t text-sm text-primary font-semibold hover:bg-muted/30 transition-colors">
                                            View all Indian stocks <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                <section className="border-t bg-gradient-to-b from-muted/20 to-background">
                    <div className="container mx-auto px-4 py-16 lg:py-20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Valuation Picks</h2>
                                <p className="text-muted-foreground mt-1">Stocks ranked by current P/E ratio</p>
                            </div>
                            <div className="flex gap-1 bg-muted/60 rounded-xl p-1.5 backdrop-blur-sm">
                                {["IN", "US"].map(m => (
                                    <button key={m} onClick={() => setMoversMarket(m)}
                                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${moversMarket === m
                                            ? "bg-background shadow-md text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}>
                                        {m === "IN" ? "🇮🇳 India" : "🇺🇸 US"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {moversLoading ? (
                            <div className="flex justify-center py-16">
                                <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                                <div className="rounded-3xl border overflow-hidden bg-card hover:shadow-lg transition-shadow">
                                    <div className="p-5 border-b bg-gradient-to-r from-emerald-500/8 to-green-500/8 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                            <TrendingDown className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-400">Value Picks</h3>
                                            <p className="text-xs text-muted-foreground">Lowest P/E ratios</p>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        {movers.value_picks.map((s, i) => (
                                            <Link key={s.ticker} href={`/stock/${s.ticker}`}
                                                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground/60 w-5 font-mono">{i + 1}</span>
                                                    <div>
                                                        <span className="font-bold text-primary font-mono">{s.ticker}</span>
                                                        <span className="ml-2 text-sm text-muted-foreground hidden md:inline">{s.name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-mono">{formatCurrency(s.current_price, s.currency)}</span>
                                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                        P/E {s.pe_ratio?.toFixed(1)}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                        {movers.value_picks.length === 0 && (
                                            <div className="p-10 text-center text-sm text-muted-foreground">No data available</div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-3xl border overflow-hidden bg-card hover:shadow-lg transition-shadow">
                                    <div className="p-5 border-b bg-gradient-to-r from-violet-500/8 to-purple-500/8 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                            <TrendingUp className="h-5 w-5 text-violet-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-violet-700 dark:text-violet-400">Growth Picks</h3>
                                            <p className="text-xs text-muted-foreground">Highest P/E ratios</p>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        {movers.growth_picks.map((s, i) => (
                                            <Link key={s.ticker} href={`/stock/${s.ticker}`}
                                                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground/60 w-5 font-mono">{i + 1}</span>
                                                    <div>
                                                        <span className="font-bold text-primary font-mono">{s.ticker}</span>
                                                        <span className="ml-2 text-sm text-muted-foreground hidden md:inline">{s.name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-mono">{formatCurrency(s.current_price, s.currency)}</span>
                                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                                        P/E {s.pe_ratio?.toFixed(1)}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                        {movers.growth_picks.length === 0 && (
                                            <div className="p-10 text-center text-sm text-muted-foreground">No data available</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-card border-t">
                    <div className="container mx-auto px-4 py-16 lg:py-20">
                        <div className="text-center mb-12 max-w-2xl mx-auto">
                            <div className="inline-flex items-center gap-2 text-xs text-primary font-semibold tracking-widest uppercase mb-3">
                                <Sparkles className="h-3.5 w-3.5" /> Smart Routing
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Dynamic Sector Modeling</h2>
                            <p className="text-muted-foreground mt-3">
                                Our engine detects the company type and applies the correct institutional methodology automatically.
                            </p>
                        </div>

                        <div className="max-w-6xl mx-auto space-y-3">
                            {[
                                { sector: "FMCG, IT, Pharma, Auto", icon: TrendingUp, method: "Discounted Cash Flow (DCF)", methodDesc: "Stable margins, predictable cash — standard 5-year projection with fade period.", avoid: "—", avoidDesc: "DCF is optimal", color: "blue" },
                                { sector: "Banks & NBFCs", icon: Landmark, method: "P/B + Residual Income Model", methodDesc: "ROE vs Cost of Equity drives P/B premium. Proper BV rollforward with payout ratio.", avoid: "FCFF DCF", avoidDesc: "Debt is product, not funding. FCF is meaningless.", color: "rose" },
                                { sector: "Insurance", icon: Shield, method: "Embedded Value (EV) Proxy", methodDesc: "Terminal P/B multiple on projected book value. No double-counting.", avoid: "Operations DCF", avoidDesc: "Policy float models break standard cash flow.", color: "teal" },
                                { sector: "Steel, Cement, Oil", icon: TrendingDown, method: "Mid-cycle Normalized Earnings", methodDesc: "Average historical margin with reinvestment rate deduction for capital intensity.", avoid: "Peak/Trough DCF", avoidDesc: "Amplifies cyclical distortion.", color: "amber" },
                                { sector: "Real Estate", icon: Layers, method: "Net Asset Value (NAV)", methodDesc: "Total Assets minus Liabilities. No speculative cash flow projections.", avoid: "Traditional DCF", avoidDesc: "Lumpy revenue breaks perpetuity assumptions.", color: "slate" },
                                { sector: "Startups / High Growth", icon: Zap, method: "Revenue Multiples (VC Method)", methodDesc: "Exit multiple on terminal revenue, discounted at VC hurdle rate (30%+).", avoid: "FCF-based DCF", avoidDesc: "Negative earnings collapse the math.", color: "fuchsia" },
                                { sector: "Conglomerates", icon: Building2, method: "Sum-of-the-Parts (SOTP)", methodDesc: "Segment-level valuation with holding company discount.", avoid: "Single WACC DCF", avoidDesc: "Blending diverse WACC destroys precision.", color: "indigo" },
                            ].map(({ sector, icon: Icon, method, methodDesc, avoid, avoidDesc, color }) => (
                                <div key={sector} className="rounded-xl sm:rounded-2xl border bg-background overflow-hidden hover:border-border hover:shadow-sm transition-all">
                                    <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                                        <div className="p-3 sm:p-5 md:col-span-3 flex items-center gap-3">
                                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-${color}-500/10 text-${color}-500 flex items-center justify-center shrink-0`}>
                                                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                            </div>
                                            <div className="font-bold text-xs sm:text-sm">{sector}</div>
                                        </div>
                                        <div className="px-3 pb-3 sm:p-5 md:col-span-5 md:border-l">
                                            <div className={`font-bold text-${color}-600 dark:text-${color}-400 text-xs sm:text-sm`}>{method}</div>
                                            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-none">{methodDesc}</div>
                                        </div>
                                        <div className="hidden md:block p-5 md:col-span-4 md:border-l bg-rose-500/[0.02]">
                                            <div className="font-semibold text-rose-600/70 dark:text-rose-400/70 text-sm line-through decoration-rose-500/30">{avoid}</div>
                                            <div className="text-xs text-muted-foreground mt-1">{avoidDesc}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t">
                    <div className="container mx-auto px-4 py-16 lg:py-20">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">How It Works</h2>
                            <p className="text-muted-foreground mt-2">Three steps to institutional-quality analysis</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto relative">
                            <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                            {[
                                { step: "01", icon: Search, title: "Search & Screen", desc: "Find stocks across US and Indian markets. Filter by sector, market cap, and key metrics.", color: "blue" },
                                { step: "02", icon: LineChart, title: "Analyze & Model", desc: "Run DCF, reverse valuations, sensitivity analysis. Engine auto-selects the right methodology.", color: "violet" },
                                { step: "03", icon: Zap, title: "Act with Confidence", desc: "Get Buy/Hold/Sell signals backed by margin of safety, quality scores, and diagnostics.", color: "emerald" },
                            ].map(({ step, icon: Icon, title, desc, color }) => (
                                <div key={step} className="text-center space-y-4 relative">
                                    <div className={`mx-auto w-16 h-16 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center relative z-10 backdrop-blur-sm`}>
                                        <Icon className={`h-7 w-7 text-${color}-500`} />
                                    </div>
                                    <div className="text-xs font-mono text-primary font-bold tracking-widest">STEP {step}</div>
                                    <h3 className="text-lg font-bold">{title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>


                <footer className="border-t bg-muted/20">
                    <div className="container mx-auto px-4 py-10">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shadow-md shadow-blue-500/20 flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                                        <rect x="3" y="14" width="3.5" height="6" rx="1" fill="white" opacity="0.5" />
                                        <rect x="8.5" y="9" width="3.5" height="11" rx="1" fill="white" opacity="0.7" />
                                        <rect x="14" y="4" width="3.5" height="16" rx="1" fill="white" />
                                        <path d="M20.5 5.5L18 8l-1.5-1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span className="font-bold">DCF Terminal</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                © {new Date().getFullYear()} DCF Valuation Terminal. Financial data via FMP. Not investment advice.
                            </p>
                            <div className="flex items-center gap-4">
                                <Link href="/market" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Markets</Link>
                                <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Screener</Link>
                                <Link href="/market/heatmap" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Heatmap</Link>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </>
    )
}
