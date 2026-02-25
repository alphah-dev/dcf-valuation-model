"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, TrendingUp, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { Navbar } from "@/components/Navbar"

export default function SearchPage() {
    const [query, setQuery] = useState("")
    const [market, setMarket] = useState("")
    const [results, setResults] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchResults = async () => {
            if (query.trim().length < 1) {
                setResults([])
                return
            }

            setIsLoading(true)
            setError(null)
            try {
                const data = await api.searchStocks(query, market || null)
                setResults(data || [])
            } catch (err) {
                setError("Failed to fetch search results. Backend might be down.")
            } finally {
                setIsLoading(false)
            }
        }

        const timer = setTimeout(fetchResults, 300)
        return () => clearTimeout(timer)
    }, [query, market])

    return (
        <>
            <Navbar />
            <main className="flex-1 p-3 sm:p-6 lg:p-12 max-w-7xl mx-auto w-full">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Equity Screener</h1>
                        <p className="text-sm sm:text-base text-muted-foreground">Search across 1,200+ global equites for valuation analysis.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by company name or ticker symbol..."
                                className="w-full pl-10 pr-4 py-3 bg-card border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all text-lg"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <select
                            className="bg-card border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary h-[52px]"
                            value={market}
                            onChange={(e) => setMarket(e.target.value)}
                        >
                            <option value="">All Markets</option>
                            <option value="US">United States (NASDAQ/NYSE)</option>
                            <option value="IN">India (NSE/BSE)</option>
                        </select>
                    </div>

                    {error && (
                        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center">
                            <AlertCircle className="mr-2 h-5 w-5" />
                            {error}
                        </div>
                    )}

                    <div className="bg-card border rounded-xl overflow-hidden min-h-[400px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                Searching database...
                            </div>
                        ) : results.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                    <thead>
                                        <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                                            <th className="p-4 font-medium">Symbol</th>
                                            <th className="p-4 font-medium">Company Name</th>
                                            <th className="p-4 font-medium">Exchange</th>
                                            <th className="p-4 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {results.map((stock) => (
                                            <tr key={stock.ticker} className="hover:bg-muted/50 transition-colors group">
                                                <td className="p-4 font-medium text-primary">
                                                    <Link href={`/stock/${stock.ticker}`}>{stock.ticker}</Link>
                                                </td>
                                                <td className="p-4 font-medium">{stock.name}</td>
                                                <td className="p-4 text-sm text-muted-foreground">{stock.exchange}</td>
                                                <td className="p-4 text-right">
                                                    <Link
                                                        href={`/stock/${stock.ticker}`}
                                                        className="inline-flex items-center text-sm font-medium text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Analyze <TrendingUp className="ml-1 h-4 w-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : query.length > 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground text-center">
                                <Search className="h-12 w-12 opacity-20 mb-4" />
                                <p className="text-lg font-medium text-foreground">No equities found.</p>
                                <p>Try searching for a different ticker or company name.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground text-center">
                                <p className="mb-2">Enter a search term above to begin screening.</p>
                                <div className="flex gap-2 justify-center mt-4">
                                    <span className="px-2 py-1 bg-muted rounded text-xs select-none cursor-pointer" onClick={() => setQuery("AAPL")}>AAPL</span>
                                    <span className="px-2 py-1 bg-muted rounded text-xs select-none cursor-pointer" onClick={() => setQuery("MSFT")}>MSFT</span>
                                    <span className="px-2 py-1 bg-muted rounded text-xs select-none cursor-pointer" onClick={() => setQuery("RELIANCE")}>RELIANCE</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}
