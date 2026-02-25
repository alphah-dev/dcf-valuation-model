"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "@/lib/api"
import { Navbar } from "@/components/Navbar"
import { StockCard } from "@/components/StockCard"
import { Activity, Globe, RefreshCcw, Grid3X3 } from "lucide-react"
import Link from "next/link"

export default function MarketPage() {
    const [data, setData] = useState({ stocks: [], total: 0 })
    const [market, setMarket] = useState("US")
    const [isLoading, setIsLoading] = useState(true)

    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [isFetchingMore, setIsFetchingMore] = useState(false)
    const observer = useRef()

    const lastElementRef = useCallback(node => {
        if (isLoading || isFetchingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, isFetchingMore, hasMore]);

    const fetchData = async (pageNum, reset = false) => {
        if (reset) setIsLoading(true)
        else setIsFetchingMore(true)

        try {
            const overview = await api.getMarketOverview(market, pageNum, 50)
            setData(prev => {
                if (reset) {
                    return { stocks: overview.top_stocks || [], total: overview.summary?.total_stocks || 0 }
                } else {
                    return {
                        stocks: [
                            ...prev.stocks,
                            ...(overview.top_stocks || []).filter(
                                newStock => !prev.stocks.some(existing => existing.ticker === newStock.ticker)
                            )
                        ],
                        total: overview.summary?.total_stocks || prev.total
                    }
                }
            })
            setHasMore(overview.has_more)
        } catch (err) {
            console.error("Failed to load market overview", err)
        } finally {
            if (reset) setIsLoading(false)
            else setIsFetchingMore(false)
        }
    }

    useEffect(() => {
        setPage(1)
        fetchData(1, true)
    }, [market])

    useEffect(() => {
        if (page > 1) {
            fetchData(page, false)
        }
    }, [page])

    return (
        <>
            <Navbar />
            <main className="flex-1 p-3 sm:p-6 lg:p-12 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Market Overview</h1>
                        <p className="text-muted-foreground">
                            Tracking {data.total > 0 ? data.total.toLocaleString() : "..."} equities across global markets.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <Link href="/market/heatmap"
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
                            <Grid3X3 className="h-4 w-4" /> <span className="hidden sm:inline">Heatmap</span><span className="sm:hidden">Map</span>
                        </Link>
                        <div className="flex items-center bg-muted/50 p-1 rounded-lg border">
                            <button
                                onClick={() => setMarket("US")}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 ${market === "US" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground"} rounded-md text-xs sm:text-sm transition-all`}
                            >
                                <span className="sm:hidden">🇺🇸 US</span>
                                <span className="hidden sm:inline">NASDAQ / NYSE</span>
                            </button>
                            <button
                                onClick={() => setMarket("IN")}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 ${market === "IN" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground"} rounded-md text-xs sm:text-sm transition-all`}
                            >
                                <span className="sm:hidden">🇮🇳 India</span>
                                <span className="hidden sm:inline">NSE / BSE (India)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <RefreshCcw className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Loading market data...</p>
                    </div>
                ) : data.stocks && data.stocks.length > 0 ? (
                    <>
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center">
                                <Globe className="mr-2 h-5 w-5" />
                                Mega-Cap Leaders ({market === "US" ? "United States" : "India"})
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {data.stocks.map((stock, index) => {
                                const isLast = index === data.stocks.length - 1;
                                return (
                                    <div ref={isLast ? lastElementRef : null} key={`${stock.ticker}-${index}`}>
                                        <StockCard stock={stock} />
                                    </div>
                                )
                            })}
                        </div>
                        {isFetchingMore && (
                            <div className="flex justify-center p-8 mt-4">
                                <RefreshCcw className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center border rounded-xl p-12 bg-card min-h-[300px]">
                        <Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No Market Data Available</h3>
                        <p className="text-muted-foreground text-center max-w-md">
                            Run the backend bulk collector script to populate local NeonDB cache with comprehensive {market} market data.
                        </p>
                    </div>
                )}
            </main>
        </>
    )
}
