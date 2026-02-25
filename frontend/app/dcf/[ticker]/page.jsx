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

                <div className="mt-12 border rounded-2xl bg-card overflow-hidden shadow-sm">
                    <div className="p-6 border-b bg-muted/20">
                        <h3 className="text-xl font-bold">Understanding DCF Valuation</h3>
                        <p className="text-sm text-muted-foreground mt-1">How this model calculates intrinsic value and what each component means</p>
                    </div>

                    <div className="divide-y">
                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">What is a DCF valuation?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <p>A <strong className="text-foreground">Discounted Cash Flow (DCF)</strong> model estimates a company's intrinsic value by projecting its future free cash flows and discounting them back to today's value. The core principle: <strong className="text-foreground">a company is worth the sum of all the cash it will ever generate, adjusted for the time value of money.</strong></p>
                                <div className="p-3 border rounded-lg bg-muted/20 font-mono text-xs text-center">
                                    Intrinsic Value = PV of Projected FCFs + PV of Terminal Value - Debt + Cash
                                </div>
                                <p>If the intrinsic value per share is higher than the current market price, the stock may be undervalued. If lower, it may be overvalued.</p>
                            </div>
                        </details>

                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">What do the input sliders control?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <div className="space-y-3">
                                    <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Growth Rates (Year 1-5)</div>
                                        <p className="text-xs">The expected annual growth rate of Free Cash Flow for each of the next 5 years. Typically set in a declining pattern (e.g., 15% &rarr; 12% &rarr; 10% &rarr; 8% &rarr; 5%) since high growth usually fades over time as companies mature.</p>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">WACC (Discount Rate)</div>
                                        <p className="text-xs">Weighted Average Cost of Capital — represents the minimum return investors require. Higher WACC = more risk = lower present value. Typical ranges: 8-10% for blue chips, 10-14% for mid-caps, 14-20% for small/risky companies.</p>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Terminal Growth Rate</div>
                                        <p className="text-xs">The perpetual growth rate after Year 5. This captures all growth from Year 6 to infinity using the Gordon Growth Model. Must be below long-term GDP growth (2-4%). Even a 0.5% change here significantly impacts valuation since it compounds forever.</p>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">How do I read the valuation output?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 pr-4 font-semibold text-foreground">Output</th>
                                            <th className="text-left py-2 font-semibold text-foreground">What It Means</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        <tr><td className="py-2 pr-4 font-medium text-foreground">Base FCF</td><td className="py-2">Starting free cash flow from the latest financials (Operating Cash Flow minus CapEx)</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium text-foreground">PV of Cash Flows</td><td className="py-2">Sum of discounted projected FCFs for Years 1-5</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium text-foreground">Terminal Value</td><td className="py-2">Value of all cash flows from Year 6 to infinity. Often 60-80% of total value — if above 85%, your growth assumptions may be too conservative</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium text-foreground">Enterprise Value</td><td className="py-2">PV of Cash Flows + PV of Terminal Value = total value of the business operations</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium text-foreground">Equity Value</td><td className="py-2">Enterprise Value - Total Debt + Cash = value belonging to shareholders</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium text-foreground">Fair Value/Share</td><td className="py-2">Equity Value &divide; Shares Outstanding = the intrinsic price per share</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium text-foreground">Margin of Safety</td><td className="py-2">How much cheaper (or expensive) the stock is vs fair value. Positive = potentially undervalued</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </details>

                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">Why does the methodology change for some companies?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <p>A standard FCFF DCF doesn't work for every company. This engine <strong className="text-foreground">automatically detects</strong> the company type and selects the right model:</p>
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 pr-3 font-semibold text-foreground">Company Type</th>
                                            <th className="text-left py-2 pr-3 font-semibold text-foreground">Model Used</th>
                                            <th className="text-left py-2 font-semibold text-foreground">Why Standard DCF Fails</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        <tr><td className="py-2 pr-3 font-medium text-foreground">Banks, NBFCs</td><td className="py-2 pr-3">Residual Income</td><td className="py-2">Debt is raw material, not a liability — FCF is meaningless</td></tr>
                                        <tr><td className="py-2 pr-3 font-medium text-foreground">Insurance</td><td className="py-2 pr-3">Embedded Value Growth</td><td className="py-2">Value sits in policy float, not operating cash flows</td></tr>
                                        <tr><td className="py-2 pr-3 font-medium text-foreground">Cyclicals</td><td className="py-2 pr-3">Normalized Earnings</td><td className="py-2">Current-year margins distort value at cycle peaks/troughs</td></tr>
                                        <tr><td className="py-2 pr-3 font-medium text-foreground">Pre-profit tech</td><td className="py-2 pr-3">VC Revenue Multiples</td><td className="py-2">Negative earnings make DCF impossible</td></tr>
                                        <tr><td className="py-2 pr-3 font-medium text-foreground">Holding cos</td><td className="py-2 pr-3">Net Asset Value</td><td className="py-2">Lumpy, unpredictable cash flows from diverse holdings</td></tr>
                                    </tbody>
                                </table>
                                <p>The methodology name is shown at the top of the results panel so you always know which model was applied.</p>
                            </div>
                        </details>

                        <details className="group">
                            <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <span className="font-semibold">What are the common mistakes to avoid?</span>
                                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                <ul className="text-xs space-y-2">
                                    <li><strong className="text-foreground">Overly optimistic growth rates:</strong> Most companies cannot sustain 15%+ growth for 5 years. Cross-check against historical revenue CAGR on the company profile page.</li>
                                    <li><strong className="text-foreground">Ignoring terminal value weight:</strong> If terminal value is &gt;85% of Enterprise Value, the model is saying most of the value comes from beyond Year 5 — your near-term assumptions have little impact. Consider raising near-term growth or lowering terminal growth.</li>
                                    <li><strong className="text-foreground">Using the same WACC for all companies:</strong> A stable utility deserves 7-8% WACC, while a small-cap biotech might need 18-20%. Risk matters.</li>
                                    <li><strong className="text-foreground">Treating fair value as precise:</strong> DCF gives a range, not a point estimate. Use the Sensitivity Matrix to see how fair value changes across different WACC and growth assumptions. A stock that looks cheap at 10% WACC might look expensive at 12%.</li>
                                    <li><strong className="text-foreground">Ignoring the Margin of Safety:</strong> Even if a stock trades below fair value, a 5% margin isn't meaningful. Look for 20-30%+ margin of safety to account for estimation errors.</li>
                                </ul>
                            </div>
                        </details>
                    </div>
                </div>

            </main>
        </>
    )
}
