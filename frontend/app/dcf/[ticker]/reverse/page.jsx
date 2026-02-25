"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Navbar } from "@/components/Navbar"
import { Activity, ArrowLeft, TrendingUp } from "lucide-react"

export default function ReverseDCFPage() {
    const { ticker } = useParams()
    const [result, setResult] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const [wacc, setWacc] = useState(10.0)
    const [termGrowth, setTermGrowth] = useState(3.0)

    const runAnalysis = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const payload = {
                ticker,
                wacc: wacc / 100,
                terminal_growth: termGrowth / 100,
                projection_years: 5
            }
            const data = await api.calculateReverseDCF(payload)
            if (data.error) throw new Error(data.error)
            setResult(data)
        } catch (err) {
            setError(err.message || "Failed to run reverse valuation.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (ticker) runAnalysis()
    }, [ticker])

    return (
        <>
            <Navbar />
            <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href={`/dcf/${ticker}`} className="text-muted-foreground hover:text-foreground transition-colors flex items-center">
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Base DCF
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mt-2 flex items-center gap-2">
                            <Activity className="h-7 w-7 text-primary" />
                            Reverse Valuation: {ticker}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">Discover the growth rate implied by the current market price.</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-card border rounded-2xl p-6 shadow-sm">
                            <h3 className="font-semibold text-lg border-b pb-4 mb-4">Adjust Known Variables</h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 flex justify-between">
                                        <span>Discount Rate (WACC) %</span>
                                        <span className="text-primary font-mono">{wacc.toFixed(1)}%</span>
                                    </label>
                                    <input
                                        type="range" min="4" max="25" step="0.5"
                                        value={wacc} onChange={(e) => setWacc(parseFloat(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-1.5 flex justify-between">
                                        <span>Terminal Growth Rate %</span>
                                        <span className="text-primary font-mono">{termGrowth.toFixed(1)}%</span>
                                    </label>
                                    <input
                                        type="range" min="0" max="8" step="0.5"
                                        value={termGrowth} onChange={(e) => setTermGrowth(parseFloat(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                </div>

                                <button
                                    onClick={runAnalysis}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors mt-6 flex justify-center items-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : "Recalculate Implied Growth"}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
                                {error}
                            </div>
                        )}
                        {result?.is_unrealistic && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm">
                                <strong>Extreme Valuation Warning:</strong> The market price implies a growth rate outside of realistic bounds (&gt;100% or &lt; -100%).
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                        {!isLoading && result && !error && (
                            <div className="bg-card border rounded-2xl p-8 shadow-sm h-full flex flex-col justify-center items-center text-center">
                                <TrendingUp className="h-16 w-16 text-primary/20 mb-6" />
                                <h2 className="text-xl text-muted-foreground mb-2">Market Implied Growth Rate (Years 1-5)</h2>

                                <div className="text-7xl font-black tracking-tighter text-foreground my-4">
                                    {(result.implied_growth_rate * 100).toFixed(1)}<span className="text-4xl text-muted-foreground ml-1">%</span>
                                </div>

                                <p className="text-lg text-muted-foreground max-w-lg mx-auto mt-6 leading-relaxed">
                                    To justify the current trading price of <span className="font-bold text-foreground">{result.current_price}</span> at a {wacc}% discount rate, the market is pricing in exactly <span className="font-bold text-primary">{(result.implied_growth_rate * 100).toFixed(1)}%</span> annualized FCF growth for the next 5 years.
                                </p>

                                <div className="mt-8 p-4 bg-muted/30 rounded-lg max-w-md w-full border text-sm flex justify-between">
                                    <span className="text-muted-foreground">Historical Revenue Growth (5Y)</span>
                                    <span className="font-mono font-medium">
                                        {result.historical_growth ? (result.historical_growth * 100).toFixed(1) + "%" : "N/A"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {isLoading && !result && (
                            <div className="flex flex-col items-center justify-center h-full min-h-[400px] border rounded-2xl bg-card">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                                <p className="text-muted-foreground">Solving for implied growth...</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}
