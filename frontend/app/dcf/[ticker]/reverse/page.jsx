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

                <div className="mt-12 border rounded-2xl bg-card overflow-hidden shadow-sm">
                    <div className="p-6 border-b bg-muted/20">
                        <h3 className="text-xl font-bold">Understanding Reverse Valuation</h3>
                        <p className="text-sm text-muted-foreground mt-1">How the implied growth rate is derived and what it means for your investment thesis</p>
                    </div>

                    <div className="divide-y">
                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">What is a Reverse DCF?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <p>A <strong className="text-foreground">Reverse DCF (Discounted Cash Flow)</strong> flips the traditional valuation model on its head. Instead of estimating growth to find fair value, it starts with the <strong className="text-foreground">current market price</strong> and works backwards to find what growth rate the market is implicitly pricing in.</p>
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Standard DCF</div>
                                        <p className="text-xs">You assume growth rates &rarr; model projects cash flows &rarr; calculates fair value</p>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
                                        <div className="font-semibold text-primary text-xs uppercase tracking-wider mb-1">Reverse DCF</div>
                                        <p className="text-xs">Takes current price as input &rarr; solves for what growth rate justifies that price</p>
                                    </div>
                                </div>
                                <p><strong className="text-foreground">Why this matters:</strong> It removes the subjectivity of growth assumptions. Instead of debating whether a company will grow at 10% or 15%, you ask: "What growth is the market already betting on?"</p>
                            </div>
                        </details>

                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">How is the implied growth rate calculated?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <p>The engine uses <strong className="text-foreground">binary search</strong> to find the growth rate that makes the DCF fair value equal the current market price:</p>
                                <ol className="text-xs space-y-2 list-decimal list-inside">
                                    <li>Start with the company's <strong className="text-foreground">last reported Free Cash Flow (FCF)</strong></li>
                                    <li>Calculate the target Enterprise Value from: <span className="font-mono text-foreground">Market Cap + Debt - Cash</span></li>
                                    <li>Try a growth rate (starting with a range of -50% to +100%)</li>
                                    <li>Project FCF forward for 5 years at that growth rate</li>
                                    <li>Add a terminal value using the Gordon Growth Model</li>
                                    <li>Discount everything back at the WACC</li>
                                    <li>If the result is too high, try a lower growth rate; if too low, try higher</li>
                                    <li>Repeat until the DCF value matches the market price (within 0.05% tolerance)</li>
                                </ol>
                                <p>This converges in about 20-30 iterations, giving a precise implied growth rate.</p>
                            </div>
                        </details>

                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">How do I interpret the result?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <p>Compare the <strong className="text-foreground">implied growth rate</strong> against the <strong className="text-foreground">historical revenue growth</strong> shown below it:</p>
                                <div className="space-y-2">
                                    <div className="p-3 border rounded-lg bg-emerald-500/5">
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">Implied &lt; Historical Growth</span>
                                        <p className="text-xs mt-1">The market expects growth to slow down from its historical pace. If you believe the company can maintain its past growth, the stock may be <strong>undervalued</strong>.</p>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-amber-500/5">
                                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs">Implied &asymp; Historical Growth</span>
                                        <p className="text-xs mt-1">The market is pricing the company to grow roughly at its historical rate. The stock is <strong>fairly valued</strong> — no clear edge either way.</p>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-rose-500/5">
                                        <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs">Implied &gt; Historical Growth</span>
                                        <p className="text-xs mt-1">The market expects the company to grow <strong>faster</strong> than it has historically. Unless there's a strong catalyst (new product, market expansion), the stock may be <strong>overvalued</strong>.</p>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">What do the WACC and Terminal Growth sliders do?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">WACC (Discount Rate)</div>
                                        <p className="text-xs">The rate at which future cash flows are discounted to present value. A higher WACC means future cash flows are worth less today, so the implied growth rate will be higher (the market must expect more growth to justify the price at a higher discount rate).</p>
                                        <p className="text-xs mt-2 font-medium text-foreground">Typical: 8-12% for stable companies, 12-18% for riskier ones.</p>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Terminal Growth Rate</div>
                                        <p className="text-xs">The perpetual growth rate assumed after the 5-year projection period. This represents the company's long-run growth rate forever — it should never exceed GDP growth (2-4%).</p>
                                        <p className="text-xs mt-2 font-medium text-foreground">Typical: 2-3% for most companies.</p>
                                    </div>
                                </div>
                                <p><strong className="text-foreground">Tip:</strong> Try different WACC values to see how sensitive the implied growth is. If a small change in WACC dramatically shifts the implied growth, the valuation signal is weak.</p>
                            </div>
                        </details>

                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">When should I NOT trust this analysis?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <p>Reverse DCF has known blind spots:</p>
                                <ul className="text-xs space-y-2">
                                    <li><strong className="text-foreground">Negative or near-zero FCF:</strong> If the base FCF is negative, the math breaks down. The model relies on projecting positive cash flows forward.</li>
                                    <li><strong className="text-foreground">Banks and financials:</strong> FCF is not meaningful for banks since debt is their raw material. A Residual Income approach is more appropriate.</li>
                                    <li><strong className="text-foreground">Cyclical companies:</strong> If the base year FCF is at a cyclical peak or trough, the implied growth will be distorted. Consider whether the base FCF is "normal."</li>
                                    <li><strong className="text-foreground">One-time items:</strong> Large acquisitions, asset sales, or restructuring charges in the base year can make FCF artificially high or low.</li>
                                    <li><strong className="text-foreground">Very high implied growth (&gt;25%):</strong> The model shows what the market is pricing, but growth rates above 25% for 5+ years are extremely rare in practice.</li>
                                </ul>
                                <p><strong className="text-foreground">Best practice:</strong> Use reverse DCF alongside the standard DCF, sensitivity matrix, and quality scores for a complete picture.</p>
                            </div>
                        </details>
                    </div>
                </div>

            </main>
        </>
    )
}
