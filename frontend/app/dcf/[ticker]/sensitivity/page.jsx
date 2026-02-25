"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Navbar } from "@/components/Navbar"
import { SlidersHorizontal, ArrowLeft } from "lucide-react"

export default function SensitivityPage() {
    const { ticker } = useParams()
    const [result, setResult] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const [termGrowth, setTermGrowth] = useState(3.0)

    const runAnalysis = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const payload = {
                ticker,
                wacc_range: [0.08, 0.09, 0.10, 0.11, 0.12],
                growth_range: [0.05, 0.08, 0.10, 0.12, 0.15],
                terminal_growth: termGrowth / 100,
                projection_years: 5
            }
            const data = await api.calculateSensitivity(payload)
            if (data.error) throw new Error(data.error)
            setResult(data)
        } catch (err) {
            setError(err.response?.data?.detail?.error || err.message || "Failed to run sensitivity model.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (ticker) runAnalysis()
    }, [ticker, termGrowth])

    const getHeatmapColor = (price, currentPrice) => {
        if (!currentPrice || !price) return "bg-card"
        const ratio = price / currentPrice
        if (ratio > 1.3) return "bg-emerald-500/30 text-emerald-900 dark:text-emerald-100"
        if (ratio > 1.1) return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
        if (ratio > 0.9) return "bg-card text-foreground"
        if (ratio > 0.7) return "bg-rose-500/10 text-rose-800 dark:text-rose-200"
        return "bg-rose-500/30 text-rose-900 dark:text-rose-100"
    }

    const parseGrowthRates = () => {
        if (!result?.growth_range) return []
        return result.growth_range.map(g => {
            if (typeof g === "string") return parseFloat(g.replace("%", "")) / 100
            return g
        })
    }

    const parseWaccRates = () => {
        if (!result?.wacc_range) return []
        return result.wacc_range.map(w => {
            if (typeof w === "string") return parseFloat(w.replace("%", "")) / 100
            return w
        })
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href={`/dcf/${ticker}`} className="text-muted-foreground hover:text-foreground transition-colors flex items-center">
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back to DCF Calculator
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mt-2 flex items-center gap-2">
                            <SlidersHorizontal className="h-7 w-7 text-primary" />
                            Sensitivity Matrix: {ticker}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">WACC vs. Growth heatmap (Current Price: {result?.current_price?.toFixed(2) || "..."})</p>
                    </div>

                    <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
                        <span className="text-sm font-medium text-muted-foreground">Adjust Terminal Growth Rate</span>
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min="0" max="6" step="0.5"
                                value={termGrowth} onChange={(e) => setTermGrowth(parseFloat(e.target.value))}
                                className="w-48 accent-primary"
                            />
                            <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{termGrowth.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {isLoading && !result && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] border rounded-2xl bg-card">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Computing 25 independent DCF scenarios...</p>
                    </div>
                )}

                {!isLoading && result && !error && (
                    <div className="border rounded-2xl bg-card overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-center">
                                <thead>
                                    <tr>
                                        <th className="p-4 border-b border-r bg-muted/30">
                                            <div className="text-xs text-muted-foreground font-normal uppercase text-left">WACC ↓</div>
                                            <div className="text-xs text-muted-foreground font-normal uppercase text-right">Growth →</div>
                                        </th>
                                        {parseGrowthRates().map((g, idx) => (
                                            <th key={idx} className="p-4 border-b bg-muted/10 font-medium">
                                                {(g * 100).toFixed(0)}%
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.matrix?.map((row, i) => (
                                        <tr key={i}>
                                            <th className="p-4 border-r bg-muted/10 font-medium text-left">
                                                {row.wacc_pct || `${(row.wacc * 100).toFixed(1)}%`}
                                            </th>
                                            {row.values?.map((cell, j) => (
                                                <td key={j} className={`p-4 font-mono transition-colors ${getHeatmapColor(cell.fair_value, result.current_price)}`}>
                                                    {cell.fair_value != null ? cell.fair_value.toFixed(2) : "N/A"}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-muted/30 p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500/30 border border-emerald-500/50 block rounded-sm"></span> Undervalued</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-card border block rounded-sm"></span> Fairly Valued</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-500/30 border border-rose-500/50 block rounded-sm"></span> Overvalued</span>
                            </div>
                            <div>Values represent Fair Value / Share</div>
                        </div>
                    </div>
                )}
            </main>
        </>
    )
}
