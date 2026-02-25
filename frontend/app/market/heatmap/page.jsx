"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { formatLargeNumber } from "@/lib/utils"
import { Navbar } from "@/components/Navbar"
import { ArrowLeft } from "lucide-react"

export default function HeatmapPage() {
    const router = useRouter()
    const [data, setData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [market, setMarket] = useState("US")

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const result = await api.getHeatmapData(market)
                setData(result)
            } catch (err) {
                console.error("Failed to load heatmap data", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [market])

    const getColor = (pe) => {
        if (!pe || pe <= 0) return "bg-slate-600/80"
        if (pe < 10) return "bg-emerald-700"
        if (pe < 15) return "bg-emerald-600"
        if (pe < 20) return "bg-emerald-500/80"
        if (pe < 25) return "bg-teal-500/70"
        if (pe < 35) return "bg-amber-500/70"
        if (pe < 50) return "bg-orange-500/80"
        if (pe < 80) return "bg-rose-500/80"
        return "bg-rose-700"
    }

    const getTextColor = (pe) => {
        if (!pe) return "text-white/70"
        return "text-white"
    }

    const maxMarketCap = useMemo(() => {
        if (!data?.sectors) return 1
        let max = 0
        data.sectors.forEach(s => s.stocks.forEach(st => {
            if (st.market_cap > max) max = st.market_cap
        }))
        return max || 1
    }, [data])

    return (
        <>
            <Navbar />
            <main className="flex-1 p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link href="/market" className="text-muted-foreground hover:text-foreground transition-colors flex items-center text-sm mb-2">
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Market Overview
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Market Heatmap</h1>
                        <p className="text-muted-foreground mt-1">Stocks sized by market cap, colored by P/E ratio</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setMarket("US")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${market === "US" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                            🇺🇸 US Market
                        </button>
                        <button onClick={() => setMarket("IN")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${market === "IN" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                            🇮🇳 India (NSE)
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">P/E Ratio:</span>
                    <span className="px-2 py-0.5 bg-emerald-700 text-white rounded">&lt;10</span>
                    <span className="px-2 py-0.5 bg-emerald-500/80 text-white rounded">15-20</span>
                    <span className="px-2 py-0.5 bg-teal-500/70 text-white rounded">20-25</span>
                    <span className="px-2 py-0.5 bg-amber-500/70 text-white rounded">25-35</span>
                    <span className="px-2 py-0.5 bg-orange-500/80 text-white rounded">35-50</span>
                    <span className="px-2 py-0.5 bg-rose-700 text-white rounded">&gt;80</span>
                    <span className="px-2 py-0.5 bg-slate-600/80 text-white rounded">N/A</span>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[500px] border rounded-2xl bg-card">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Loading heatmap data...</p>
                    </div>
                ) : !data?.sectors?.length ? (
                    <div className="flex items-center justify-center min-h-[400px] border rounded-2xl bg-card text-muted-foreground">
                        No heatmap data available. Run the bulk collector to populate stocks.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.sectors.map(sector => (
                            <div key={sector.name} className="border rounded-xl overflow-hidden bg-card">
                                <div className="px-4 py-2 bg-muted/30 border-b">
                                    <h3 className="font-semibold text-sm">{sector.name} <span className="text-muted-foreground font-normal">({sector.stocks.length})</span></h3>
                                </div>
                                <div className="flex flex-wrap p-1.5 gap-1.5">
                                    {sector.stocks
                                        .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
                                        .map(stock => {
                                            const logCap = Math.log10((stock.market_cap || 1) + 1)
                                            const logMax = Math.log10(maxMarketCap + 1)
                                            const sizeRatio = logCap / logMax
                                            const minSize = 80
                                            const maxSize = 200
                                            const size = Math.floor(minSize + sizeRatio * (maxSize - minSize))

                                            return (
                                                <button
                                                    key={stock.ticker}
                                                    onClick={() => router.push(`/stock/${stock.ticker}`)}
                                                    className={`${getColor(stock.pe_ratio)} ${getTextColor(stock.pe_ratio)} rounded-lg p-2 flex flex-col items-center justify-center hover:opacity-80 hover:scale-[1.02] transition-all cursor-pointer`}
                                                    style={{ width: size, height: Math.floor(size * 0.7) }}
                                                    title={`${stock.name}\nP/E: ${stock.pe_ratio || 'N/A'}\nMkt Cap: ${formatLargeNumber(stock.market_cap)}`}
                                                >
                                                    <span className="font-bold text-xs leading-tight truncate w-full text-center">{stock.ticker}</span>
                                                    <span className="text-[10px] opacity-70 truncate w-full text-center">{stock.pe_ratio ? `P/E ${stock.pe_ratio.toFixed(0)}` : ""}</span>
                                                    <span className="text-[10px] opacity-50">{formatLargeNumber(stock.market_cap)}</span>
                                                </button>
                                            )
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="text-center text-xs text-muted-foreground py-4">
                    Showing {data?.total_stocks || 0} stocks across {data?.sectors?.length || 0} sectors. Click any stock to view details.
                </div>
            </main>
        </>
    )
}
