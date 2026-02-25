"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Navbar } from "@/components/Navbar"
import { WaterfallChart } from "@/components/WaterfallChart"
import { Calculator, ArrowRight, Settings2, SlidersHorizontal, Activity, Info } from "lucide-react"

export default function DCFPage() {
    const { ticker } = useParams()
    const [result, setResult] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const [wacc, setWacc] = useState(10.0)
    const [termGrowth, setTermGrowth] = useState(3.0)
    const [growthR1, setGrowthR1] = useState(15.0)
    const [growthR2, setGrowthR2] = useState(12.0)
    const [growthR3, setGrowthR3] = useState(10.0)
    const [growthR4, setGrowthR4] = useState(8.0)
    const [growthR5, setGrowthR5] = useState(5.0)

    const runModel = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const payload = {
                ticker,
                wacc: wacc / 100,
                terminal_growth: termGrowth / 100,
                growth_rates: [growthR1 / 100, growthR2 / 100, growthR3 / 100, growthR4 / 100, growthR5 / 100]
            }
            const data = await api.calculateDCF(payload)
            if (data.error) throw new Error(data.error)
            setResult(data)
        } catch (err) {
            setError(err.message || "Failed to run DCF model.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (ticker) runModel()
    }, [ticker])

    return (
        <>
            <Navbar />
            <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href={`/stock/${ticker}`} className="text-muted-foreground hover:text-foreground transition-colors">
                                ← Back to profile
                            </Link>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2 flex items-center gap-3">
                            <Calculator className="h-7 w-7 text-primary" />
                            {result?.methodology ? `${result.methodology.split('(')[0].trim()}:` : 'Valuation Model:'} {ticker}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">{result?.company_name || "Enterprise Value to Equity Bridge"}</p>
                    </div>

                    <div className="flex gap-3 mt-4 md:mt-0">
                        <Link
                            href={`/dcf/${ticker}/reverse`}
                            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
                        >
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            Reverse DCF
                        </Link>
                        <Link
                            href={`/dcf/${ticker}/sensitivity`}
                            className="px-4 py-2 bg-card border rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
                        >
                            <SlidersHorizontal className="h-4 w-4 text-primary" />
                            Sensitivity Matrix
                        </Link>
                    </div>
                </div>

                {!isLoading && result && result.is_conglomerate && (
                    <div className="bg-orange-500/10 border-l-4 border-l-orange-500 border-y border-r border-orange-500/20 rounded-r-xl p-5 mb-6 shadow-sm">
                        <div className="flex items-start gap-4 flex-col sm:flex-row">
                            <div className="bg-orange-500/20 p-2 rounded-full mt-0.5 shrink-0 self-start">
                                <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400">Multi-Segment Conglomerate Detected</h3>
                                <p className="text-orange-800/80 dark:text-orange-200/80 mt-1.5 leading-relaxed">
                                    A single-model valuation is structurally imprecise for highly diversified businesses. For institutional accuracy, we recommend valuing each business segment separately.
                                </p>
                                <div className="mt-4">
                                    <Link href={`/dcf/${ticker}/sotp`} className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 hover:bg-orange-700 rounded-lg text-sm font-medium transition-colors">
                                        Switch to Segment-Based SOTP <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!isLoading && result && result.methodology && (
                    <div className="bg-primary/5 border-l-4 border-l-primary border-y border-r border-primary/20 rounded-r-xl p-5 mb-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-2 rounded-full mt-0.5 shrink-0">
                                <Info className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Why this model? ({result.methodology.split('(')[0].trim()})</h3>
                                <p className="text-muted-foreground mt-1.5 leading-relaxed">
                                    {result.methodology.includes("VC") && "High-growth tech and startups often burn cash early on. Standard DCFs fail here, so the engine automatically pivoted to project future Revenue Multiples discounted backwards via a high Target IRR hurdle rate."}
                                    {result.methodology.includes("Normalized") && "Commodity and manufacturing businesses are highly cyclical. Using current cash flows distorts value. The engine automatically scanned historicals to calculate and apply Mid-Cycle Margins to neutralize boom/bust cycle distortions."}
                                    {result.methodology.includes("Residual") && "Banks use debt as raw material, fundamentally breaking standard free cash flow models. The engine automatically switched to a Residual Income Model, measuring Return on Equity against Book Value capital charges."}
                                    {result.methodology.includes("EV Growth") && "Insurance value lies in future policy float, not operating cash. The engine automatically overrode the standard DCF to project Embedded Value growth mapped to target Price-to-Book exit multiples."}
                                    {result.methodology.includes("Net Asset Value") && "Traditional DCF assumptions fail for holding companies and real estate due to unpredictable lumpy cash flows. The engine calculated a strict Net Asset Value (Total Assets - Total Liabilities) for immediate margin of safety."}
                                    {!result.methodology.includes("VC") && !result.methodology.includes("Normalized") && !result.methodology.includes("Residual") && !result.methodology.includes("EV Growth") && !result.methodology.includes("Net Asset Value") && "The engine detected stable, predictable cash flows and applied a standard 5-year Free Cash Flow (FCFF) timeline discount model."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-card border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 border-b pb-4 mb-4">
                                <Settings2 className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold text-lg">Model Assumptions</h3>
                            </div>

                            <div className="space-y-5">
                                {(!result?.methodology?.includes("Net Asset Value")) && (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 flex justify-between">
                                                <span>
                                                    {result?.methodology?.includes("VC") ? "Target IRR Hurdle (%)" :
                                                        result?.methodology?.includes("Residual") ? "Cost of Equity (%)" :
                                                            result?.methodology?.includes("EV Growth") ? "Target Return on EV (%)" :
                                                                "Discount Rate (WACC) %"}
                                                </span>
                                                <span className="text-primary font-mono">{wacc.toFixed(1)}%</span>
                                            </label>
                                            <input
                                                type="range" min="4" max="50" step="0.5"
                                                value={wacc} onChange={(e) => setWacc(parseFloat(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>

                                        {!result?.methodology?.includes("VC") && (
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
                                        )}

                                        <div className="pt-4 border-t">
                                            <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                                                {result?.methodology?.includes("VC") ? "Revenue Growth Projections (Y1-Y5)" :
                                                    result?.methodology?.includes("Normalized") ? "Normalized Earnings Growth (Y1-Y5)" :
                                                        result?.methodology?.includes("Residual") ? "Net Income Growth (Y1-Y5)" :
                                                            result?.methodology?.includes("EV Growth") ? "Embedded Value Growth (Y1-Y5)" :
                                                                "FCF Growth Projections (Years 1-5)"}
                                            </h4>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[
                                                    { label: "Y1", val: growthR1, set: setGrowthR1 },
                                                    { label: "Y2", val: growthR2, set: setGrowthR2 },
                                                    { label: "Y3", val: growthR3, set: setGrowthR3 },
                                                    { label: "Y4", val: growthR4, set: setGrowthR4 },
                                                    { label: "Y5", val: growthR5, set: setGrowthR5 },
                                                ].map((g, i) => (
                                                    <div key={i} className="flex flex-col items-center gap-1">
                                                        <span className="text-xs text-muted-foreground">{g.label}</span>
                                                        <input
                                                            type="number"
                                                            value={g.val}
                                                            onChange={(e) => g.set(parseFloat(e.target.value) || 0)}
                                                            className="w-full text-center bg-background border rounded px-1 py-1 text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {result?.methodology?.includes("Net Asset Value") && (
                                    <div className="pt-2">
                                        <p className="text-sm text-muted-foreground italic text-center">
                                            Growth and discount projections are disabled. Valuation drives strictly from the balance sheet.
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={runModel}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors mt-6 flex justify-center items-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>Run Calculation <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </button>
                            </div>
                        </div>

                        {result && result.fcf_negative_warning && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-sm">
                                <strong>Warning:</strong> Base Free Cash Flow is negative. The terminal value relies on out-year turnaround assumptions. DCF may be highly sensitive.
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        {!isLoading && result && !error && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Implied Fair Value</span>
                                        <div className="text-5xl font-bold font-mono text-primary tracking-tight">
                                            {result.fair_value_per_share ? result.fair_value_per_share.toFixed(2) : "-"}
                                            <span className="text-xl text-muted-foreground ml-2">{result.currency}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                            <span className="text-sm text-muted-foreground">Current Market Price</span>
                                            <span className="font-mono">{result.current_price ? result.current_price.toFixed(2) : "-"}</span>
                                        </div>
                                    </div>

                                    <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-center ${result.verdict === "STRONG BUY" || result.verdict === "BUY" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" :
                                        result.verdict === "HOLD" ? "bg-card text-foreground" :
                                            "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                                        }`}>
                                        <span className="text-sm font-medium text-current/80 uppercase tracking-widest mb-1">Valuation Signal</span>
                                        <div className="text-4xl font-black uppercase tracking-tight">
                                            {result.verdict}
                                        </div>
                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-current/20">
                                            <span className="text-sm text-current/80">Margin of Safety</span>
                                            <span className="font-mono font-bold text-lg">
                                                {result.margin_of_safety_pct > 0 ? "+" : ""}{result.margin_of_safety_pct ? result.margin_of_safety_pct.toFixed(1) : "-"}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-xl font-bold mb-6">Enterprise to Equity Value Bridge</h3>
                                    <WaterfallChart data={result} currency={result.currency} />
                                </div>
                            </>
                        )}

                        {isLoading && !result && (
                            <div className="flex flex-col items-center justify-center h-[500px] border rounded-2xl bg-card">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                                <p className="text-muted-foreground">Computing valuation model...</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}
