"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Navbar } from "@/components/Navbar"
import { Layers, Plus, Trash2, ArrowLeft, RefreshCcw, HandCoins } from "lucide-react"

export default function SOTPPage() {
    const { ticker } = useParams()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const [stock, setStock] = useState(null)
    const [totalDebt, setTotalDebt] = useState(0)
    const [cash, setCash] = useState(0)
    const [shares, setShares] = useState(0)

    const [segments, setSegments] = useState([
        { id: 1, name: "Core Business (e.g. O2C)", metric: 1000, multiple: 8 },
        { id: 2, name: "High-Growth Asset (e.g. Retail)", metric: 500, multiple: 25 },
    ])

    const [unitMultiplier, setUnitMultiplier] = useState(1e9)

    useEffect(() => {
        const fetchBaseData = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const stockData = await api.getStockDetails(ticker)
                setStock(stockData)

                const finData = await api.getFinancials(ticker, 1)
                if (finData.financials && finData.financials.length > 0) {
                    const latest = finData.financials[0]
                    setTotalDebt(latest.total_debt || 0)
                    setCash(latest.cash_and_equivalents || 0)
                    setShares(latest.shares_outstanding || stockData.shares_outstanding || 0)
                } else {
                    setShares(stockData.shares_outstanding || 0)
                }
            } catch (err) {
                setError("Failed to load company financials. You may need to refresh the data.")
            } finally {
                setIsLoading(false)
            }
        }
        if (ticker) fetchBaseData()
    }, [ticker])

    const formatLargeNumber = (num, currency = "USD") => {
        if (!num) return "-"
        if (num >= 1e12 || num <= -1e12) return `${currency} ${(num / 1e12).toFixed(2)}T`
        if (num >= 1e9 || num <= -1e9) return `${currency} ${(num / 1e9).toFixed(2)}B`
        if (num >= 1e6 || num <= -1e6) return `${currency} ${(num / 1e6).toFixed(2)}M`
        return `${currency} ${num.toLocaleString()}`
    }

    const addSegment = () => {
        setSegments([...segments, {
            id: Date.now(),
            name: `New Segment ${segments.length + 1}`,
            metric: 0,
            multiple: 10
        }])
    }

    const removeSegment = (id) => {
        if (segments.length <= 1) return
        setSegments(segments.filter(s => s.id !== id))
    }

    const updateSegment = (id, field, value) => {
        setSegments(segments.map(s => {
            if (s.id === id) {
                return { ...s, [field]: value }
            }
            return s
        }))
    }

    const rawSegmentEV = segments.reduce((acc, seg) => acc + (seg.metric * seg.multiple), 0)
    const totalSegmentEV = rawSegmentEV * unitMultiplier
    const netDebt = totalDebt - cash
    const impliedEquityValue = totalSegmentEV - netDebt
    const isNegativeEquity = totalSegmentEV > 0 && totalSegmentEV < netDebt
    const fairValuePerShare = shares > 0 ? impliedEquityValue / shares : 0
    const marginOfSafety = stock?.current_price ? ((fairValuePerShare - stock.current_price) / stock.current_price) * 100 : null
    const currency = stock?.currency || "USD"

    return (
        <>
            <Navbar />
            <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href={`/dcf/${ticker}`} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                                <ArrowLeft className="h-4 w-4" /> Back to DCF Overview
                            </Link>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2 flex items-center gap-3">
                            <Layers className="h-7 w-7 text-primary" />
                            Sum-of-the-Parts (SOTP): {ticker}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">{stock?.name || "Segment-Based Valuation"}</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <RefreshCcw className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Loading structural financial data...</p>
                    </div>
                ) : error ? (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
                        {error}
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card border rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold">Segment Builder</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Input Unit Scale:</span>
                                        <select
                                            value={unitMultiplier}
                                            onChange={(e) => setUnitMultiplier(Number(e.target.value))}
                                            className="bg-background border rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            <option value={1e6}>{stock?.currency || "$"} Millions (M)</option>
                                            <option value={1e9}>{stock?.currency || "$"} Billions (B)</option>
                                            <option value={1}>Raw Exact Numbers</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {segments.map((seg, index) => (
                                        <div key={seg.id} className="grid grid-cols-12 gap-4 items-center bg-muted/20 p-4 rounded-xl border">
                                            <div className="col-span-12 md:col-span-5">
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Segment Name</label>
                                                <input
                                                    type="text"
                                                    value={seg.name}
                                                    onChange={(e) => updateSegment(seg.id, 'name', e.target.value)}
                                                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                    placeholder="e.g. Retail Division"
                                                />
                                            </div>
                                            <div className="col-span-5 md:col-span-3">
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Metric (EBITDA/Rev)</label>
                                                <input
                                                    type="number"
                                                    value={seg.metric}
                                                    onChange={(e) => updateSegment(seg.id, 'metric', Number(e.target.value))}
                                                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div className="col-span-5 md:col-span-3">
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Target Multiple (x)</label>
                                                <input
                                                    type="number"
                                                    value={seg.multiple}
                                                    onChange={(e) => updateSegment(seg.id, 'multiple', Number(e.target.value))}
                                                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 flex justify-end mt-5">
                                                <button
                                                    onClick={() => removeSegment(seg.id)}
                                                    disabled={segments.length <= 1}
                                                    className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={addSegment}
                                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 border border-dashed rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                                >
                                    <Plus className="h-4 w-4" /> Add Business Segment
                                </button>
                            </div>

                            <div className="bg-primary/5 border rounded-2xl p-6 shadow-sm border-primary/20">
                                <h3 className="font-bold mb-2 text-primary flex items-center gap-2">
                                    <HandCoins className="h-5 w-5" />
                                    Consolidated Balance Sheet Adjustments
                                </h3>
                                <p className="text-sm text-primary/80 mb-4">
                                    Total Enterprise Value aggregates the segments above. Equity value deducts consolidated net debt.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background border rounded-lg p-3">
                                        <div className="text-xs text-muted-foreground mb-1">Total Debt (-)</div>
                                        <input
                                            type="number"
                                            value={totalDebt}
                                            onChange={(e) => setTotalDebt(Number(e.target.value))}
                                            className="w-full bg-transparent text-sm font-mono border-b focus:border-primary outline-none py-1"
                                        />
                                    </div>
                                    <div className="bg-background border rounded-lg p-3">
                                        <div className="text-xs text-muted-foreground mb-1">Cash & Equivalents (+)</div>
                                        <input
                                            type="number"
                                            value={cash}
                                            onChange={(e) => setCash(Number(e.target.value))}
                                            className="w-full bg-transparent text-sm font-mono border-b focus:border-primary outline-none py-1"
                                        />
                                    </div>
                                    <div className="bg-background border rounded-lg p-3">
                                        <div className="text-xs text-muted-foreground mb-1">Shares Outstanding (÷)</div>
                                        <input
                                            type="number"
                                            value={shares}
                                            onChange={(e) => setShares(Number(e.target.value))}
                                            className="w-full bg-transparent text-sm font-mono border-b focus:border-primary outline-none py-1"
                                        />
                                    </div>
                                    <div className="bg-background border rounded-lg p-3">
                                        <div className="text-xs text-muted-foreground mb-1">Calculated Net Debt</div>
                                        <div className="text-sm font-mono py-1">{formatLargeNumber(netDebt, currency)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-card border rounded-2xl p-6 shadow-sm sticky top-6">
                                <h2 className="text-xl font-bold mb-6">Valuation Output</h2>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end pb-3 border-b">
                                        <span className="text-sm text-muted-foreground">Sum of Segment EVs</span>
                                        <span className="font-mono font-medium">{formatLargeNumber(totalSegmentEV, currency)}</span>
                                    </div>

                                    <div className="flex justify-between items-end pb-3 border-b">
                                        <span className="text-sm text-muted-foreground">Less: Net Debt</span>
                                        <span className="font-mono font-medium text-destructive">
                                            {formatLargeNumber(netDebt, currency)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-end pb-3 border-b">
                                        <span className="text-sm font-bold">Implied Equity Value</span>
                                        <span className={`font-mono font-bold ${isNegativeEquity ? "text-destructive" : "text-primary"}`}>
                                            {formatLargeNumber(impliedEquityValue, currency)}
                                        </span>
                                    </div>

                                    {isNegativeEquity && (
                                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2 border border-destructive/20">
                                            <span className="text-lg leading-none">⚠️</span>
                                            <div>Segment EV is below net debt. Equity value is physically negative.</div>
                                        </div>
                                    )}

                                    <div className="mt-8 pt-4 bg-muted/30 rounded-xl p-4 border text-center">
                                        <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-2">Fair Value Per Share</div>
                                        <div className="text-4xl font-bold text-primary tracking-tight">
                                            <span className="text-xl mr-1">{currency}</span>
                                            {fairValuePerShare > 0 ? fairValuePerShare.toFixed(2) : "-"}
                                        </div>
                                    </div>

                                    {stock?.current_price && (
                                        <div className="flex justify-between items-center text-sm px-2">
                                            <span className="text-muted-foreground">Current Price:</span>
                                            <span className="font-mono font-medium">{currency} {stock.current_price.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {marginOfSafety !== null && (
                                        <div className={`mt-4 w-full py-3 rounded-lg text-center font-bold text-sm ${marginOfSafety > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                                            }`}>
                                            Margin of Safety: {marginOfSafety > 0 ? "+" : ""}{marginOfSafety.toFixed(2)}%
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 pt-6 border-t">
                                    <h4 className="text-sm font-semibold mb-3">Segment Weights</h4>
                                    <div className="space-y-2">
                                        {segments.map(seg => {
                                            const ev = seg.metric * seg.multiple;
                                            const pct = totalSegmentEV > 0 ? (ev / totalSegmentEV) * 100 : 0;
                                            return (
                                                <div key={seg.id} className="text-xs">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="truncate pr-2">{seg.name || "Unnamed"}</span>
                                                        <span className="font-mono">{pct.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-primary h-full" style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    )
}
