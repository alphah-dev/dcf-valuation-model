"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Navbar } from "@/components/Navbar"
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

export default function QualityPage() {
    const { ticker } = useParams()
    const [quality, setQuality] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchQuality = async () => {
            try {
                const data = await api.getQualityScores(ticker)
                if (data.error) throw new Error(data.error)
                setQuality(data)
            } catch (err) {
                setError(err.response?.data?.detail?.error || err.message || "Quality scores unavailable for this ticker.")
            } finally {
                setIsLoading(false)
            }
        }
        if (ticker) fetchQuality()
    }, [ticker])

    const PiotroskiRow = ({ label, passed }) => (
        <div className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium">{label}</span>
            {passed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
                <XCircle className="h-5 w-5 text-muted-foreground/40" />
            )}
        </div>
    )

    const piotroski = quality?.piotroski
    const pDetails = piotroski?.details || {}
    const altman = quality?.altman_z
    const roic = quality?.roic

    const roicDecimal = roic?.value != null ? roic.value / 100 : null
    const waccDecimal = roic?.benchmark_wacc != null ? roic.benchmark_wacc / 100 : 0.10
    const spreadDecimal = roic?.value_spread != null ? roic.value_spread / 100 : 0
    const isValueCreator = roicDecimal != null ? roicDecimal > waccDecimal : false

    const getAltmanZone = (assessment) => {
        if (!assessment) return "N/A"
        if (assessment.includes("SAFE")) return "Safe Zone"
        if (assessment.includes("GREY")) return "Grey Zone"
        return "Distress Zone"
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href={`/stock/${ticker}`} className="text-muted-foreground hover:text-foreground transition-colors flex items-center">
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Company Profile
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mt-2 flex items-center gap-2">
                            <span className="font-mono text-primary font-bold">Q.</span>
                            Quality & Risk Framework: {ticker}
                        </h1>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {isLoading && !quality && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] border rounded-2xl bg-card">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Evaluating financial constraints...</p>
                    </div>
                )}

                {!isLoading && quality && !error && (
                    <>
                        <div className="grid lg:grid-cols-2 gap-8">

                            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                                <div className="p-6 border-b bg-muted/20 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold">Piotroski F-Score</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Measures financial health via 9 criteria</p>
                                    </div>
                                    <div className={`text-4xl font-bold font-mono ${(piotroski?.score ?? 0) >= 7 ? "text-emerald-500" :
                                        (piotroski?.score ?? 0) >= 4 ? "text-amber-500" : "text-rose-500"
                                        }`}>
                                        {piotroski?.score ?? "?"}/{piotroski?.max_score ?? 9}
                                    </div>
                                </div>

                                <div className="p-2">
                                    <div className="px-4 py-2 mt-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profitability</div>
                                    <PiotroskiRow label="Positive ROA (1=Yes)" passed={pDetails.positive_roa} />
                                    <PiotroskiRow label="Positive Operating Cash Flow" passed={pDetails.positive_ocf} />
                                    <PiotroskiRow label="Higher ROA vs Prev Year" passed={pDetails.improving_roa} />
                                    <PiotroskiRow label="CFO > Net Income (Quality of Earnings)" passed={pDetails.accruals_check} />

                                    <div className="px-4 py-2 mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leverage, Liquidity, Source of Funds</div>
                                    <PiotroskiRow label="Lower Ratio of Long Term Debt to Assets" passed={pDetails.decreasing_leverage} />
                                    <PiotroskiRow label="Higher Current Ratio" passed={pDetails.improving_liquidity} />
                                    <PiotroskiRow label="No New Shares Issued" passed={pDetails.no_dilution} />

                                    <div className="px-4 py-2 mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operating Efficiency</div>
                                    <PiotroskiRow label="Higher Gross Margin" passed={pDetails.improving_margin} />
                                    <PiotroskiRow label="Higher Asset Turnover" passed={pDetails.improving_turnover} />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-card border rounded-2xl p-6 shadow-sm relative overflow-hidden">
                                    <h3 className="text-xl font-bold mb-1">Altman Z-Score</h3>
                                    <p className="text-sm text-muted-foreground mb-6">Predicts probability of bankruptcy within 2 years</p>

                                    <div className="flex items-end gap-4 mb-4">
                                        <span className="text-5xl font-mono font-bold tracking-tighter">
                                            {altman?.score != null ? altman.score.toFixed(2) : "N/A"}
                                        </span>
                                        <span className={`text-lg font-bold uppercase ${getAltmanZone(altman?.assessment) === "Safe Zone" ? "text-emerald-500" :
                                            getAltmanZone(altman?.assessment) === "Grey Zone" ? "text-amber-500" : "text-rose-500"
                                            }`}>
                                            {getAltmanZone(altman?.assessment)}
                                        </span>
                                    </div>

                                    <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex mt-6">
                                        <div className="h-full bg-rose-500 w-1/3" title="Distress Zone < 1.8"></div>
                                        <div className="h-full bg-amber-500 w-1/3" title="Grey Zone 1.8 - 3.0"></div>
                                        <div className="h-full bg-emerald-500 w-1/3" title="Safe Zone > 3.0"></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-2 font-mono">
                                        <span>Distress (&lt; 1.8)</span>
                                        <span>Safe (&gt; 3.0)</span>
                                    </div>
                                </div>

                                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-xl font-bold mb-1">Value Creation (ROIC vs WACC)</h3>
                                    <p className="text-sm text-muted-foreground mb-6">A company creates value when ROIC exceeds its cost of capital.</p>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 border rounded-xl bg-muted/30">
                                            <span className="text-xs font-semibold uppercase text-muted-foreground block mb-1">Return on Invested Capital</span>
                                            <span className="text-2xl font-mono font-bold">
                                                {roic?.value != null ? roic.value.toFixed(1) + "%" : "N/A"}
                                            </span>
                                        </div>
                                        <div className="p-4 border rounded-xl bg-muted/30">
                                            <span className="text-xs font-semibold uppercase text-muted-foreground block mb-1">Cost of Capital (Est)</span>
                                            <span className="text-2xl font-mono font-bold">
                                                {roic?.benchmark_wacc != null ? roic.benchmark_wacc.toFixed(1) + "%" : "10.0%"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl flex items-center justify-between border ${isValueCreator
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                                        : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200"
                                        }`}>
                                        <div className="font-semibold">
                                            {isValueCreator ? "Value Creator" : "Value Destroyer"}
                                        </div>
                                        <div className="text-sm font-medium flex items-center gap-1">
                                            Spread: {roic?.value_spread != null ? roic.value_spread.toFixed(1) : "0.0"}%
                                            {!isValueCreator && <AlertTriangle className="h-4 w-4 ml-1" />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="mt-12 border rounded-2xl bg-card overflow-hidden shadow-sm">
                            <div className="p-6 border-b bg-muted/20">
                                <h3 className="text-xl font-bold">Understanding These Scores</h3>
                                <p className="text-sm text-muted-foreground mt-1">How each metric is calculated and what it means for your investment decisions</p>
                            </div>

                            <div className="divide-y">
                                <details className="group">
                                    <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                        <span className="font-semibold">What is the Piotroski F-Score?</span>
                                        <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                                    </summary>
                                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                        <p>The <strong className="text-foreground">Piotroski F-Score</strong> is a scoring system developed by Joseph Piotroski (Stanford) that rates a company's financial strength on a scale of <strong className="text-foreground">0 to 9</strong>. Each point is awarded for passing one of nine binary tests across three categories:</p>
                                        <div className="grid md:grid-cols-3 gap-3 mt-2">
                                            <div className="p-3 border rounded-lg bg-muted/20">
                                                <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Profitability (4 pts)</div>
                                                <ul className="text-xs space-y-1 list-disc list-inside">
                                                    <li>Positive ROA</li>
                                                    <li>Positive Operating Cash Flow</li>
                                                    <li>ROA improving year-over-year</li>
                                                    <li>Cash flow exceeds net income</li>
                                                </ul>
                                            </div>
                                            <div className="p-3 border rounded-lg bg-muted/20">
                                                <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Leverage (3 pts)</div>
                                                <ul className="text-xs space-y-1 list-disc list-inside">
                                                    <li>Decreasing debt-to-assets</li>
                                                    <li>Improving current ratio</li>
                                                    <li>No share dilution</li>
                                                </ul>
                                            </div>
                                            <div className="p-3 border rounded-lg bg-muted/20">
                                                <div className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Efficiency (2 pts)</div>
                                                <ul className="text-xs space-y-1 list-disc list-inside">
                                                    <li>Higher gross margin</li>
                                                    <li>Higher asset turnover</li>
                                                </ul>
                                            </div>
                                        </div>
                                        <p><strong className="text-foreground">Impact:</strong> Scores of 8-9 indicate strong fundamentals with historically higher returns. Scores of 0-2 signal financial distress. Academic research shows high F-Score value stocks outperform low F-Score stocks by ~7.5% annually.</p>
                                    </div>
                                </details>

                                <details className="group">
                                    <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                        <span className="font-semibold">How is the Altman Z-Score calculated?</span>
                                        <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                                    </summary>
                                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                        <p>The <strong className="text-foreground">Altman Z-Score</strong> was developed by Professor Edward Altman (NYU) in 1968 to predict the likelihood of a company going bankrupt within 2 years. It combines five financial ratios into a single score:</p>
                                        <div className="p-3 border rounded-lg bg-muted/20 font-mono text-xs">
                                            Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
                                        </div>
                                        <ul className="text-xs space-y-1">
                                            <li><strong className="text-foreground font-mono">A</strong> = Working Capital / Total Assets (liquidity)</li>
                                            <li><strong className="text-foreground font-mono">B</strong> = Retained Earnings / Total Assets (profitability history)</li>
                                            <li><strong className="text-foreground font-mono">C</strong> = EBIT / Total Assets (operating efficiency)</li>
                                            <li><strong className="text-foreground font-mono">D</strong> = Market Cap / Total Liabilities (market confidence)</li>
                                            <li><strong className="text-foreground font-mono">E</strong> = Revenue / Total Assets (asset utilization)</li>
                                        </ul>
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            <div className="p-2 text-center border rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">&gt; 3.0 = Safe Zone</div>
                                            <div className="p-2 text-center border rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">1.8 - 3.0 = Grey Zone</div>
                                            <div className="p-2 text-center border rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold">&lt; 1.8 = Distress Zone</div>
                                        </div>
                                        <p><strong className="text-foreground">Impact:</strong> The model correctly predicted 72% of bankruptcies 2 years before they occurred. A score below 1.8 warrants serious caution. Note: this model is designed for manufacturing firms and may be less accurate for banks and financial companies.</p>
                                    </div>
                                </details>

                                <details className="group">
                                    <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                        <span className="font-semibold">What does ROIC vs WACC tell me?</span>
                                        <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                                    </summary>
                                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                        <p><strong className="text-foreground">ROIC (Return on Invested Capital)</strong> measures how efficiently a company converts its invested capital into profits. <strong className="text-foreground">WACC (Weighted Average Cost of Capital)</strong> is the minimum return a company must earn to satisfy its investors.</p>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            <div className="p-3 border rounded-lg bg-emerald-500/5">
                                                <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider mb-1">ROIC &gt; WACC = Value Creator</div>
                                                <p className="text-xs">The company earns more than its cost of capital. Every rupee/dollar invested generates economic profit. Share price should rise over time.</p>
                                            </div>
                                            <div className="p-3 border rounded-lg bg-rose-500/5">
                                                <div className="font-semibold text-rose-600 dark:text-rose-400 text-xs uppercase tracking-wider mb-1">ROIC &lt; WACC = Value Destroyer</div>
                                                <p className="text-xs">The company earns less than its cost of capital. It would be better off returning money to shareholders. Sustained value destruction erodes share price.</p>
                                            </div>
                                        </div>
                                        <p><strong className="text-foreground">The Spread</strong> (ROIC - WACC) is what matters. A spread of +5% or more is excellent. Consistently high ROIC (&gt;15%) is the hallmark of companies with durable competitive advantages (moats).</p>
                                        <p><strong className="text-foreground">Impact:</strong> Warren Buffett considers ROIC the single most important metric for evaluating management quality. Companies with ROIC &gt; 20% for 10+ years tend to be exceptional long-term investments.</p>
                                    </div>
                                </details>

                                <details className="group">
                                    <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                        <span className="font-semibold">How should I use these scores together?</span>
                                        <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                                    </summary>
                                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                        <p>Each score evaluates a different dimension of quality. Use them together for a holistic view:</p>
                                        <table className="w-full text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Score</th>
                                                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Measures</th>
                                                    <th className="text-left py-2 font-semibold text-foreground">Best For</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                <tr><td className="py-2 pr-4 font-medium text-foreground">Piotroski F-Score</td><td className="py-2 pr-4">Year-over-year financial improvement</td><td className="py-2">Screening value stocks, avoiding value traps</td></tr>
                                                <tr><td className="py-2 pr-4 font-medium text-foreground">Altman Z-Score</td><td className="py-2 pr-4">Bankruptcy risk and solvency</td><td className="py-2">Identifying financially distressed companies</td></tr>
                                                <tr><td className="py-2 pr-4 font-medium text-foreground">ROIC vs WACC</td><td className="py-2 pr-4">Capital allocation and competitive moat</td><td className="py-2">Long-term compounders, management quality</td></tr>
                                            </tbody>
                                        </table>
                                        <p><strong className="text-foreground">The ideal stock</strong> has a high F-Score (7+), Z-Score in the safe zone (&gt;3.0), and ROIC well above WACC. If any one score is weak, dig deeper into why before investing.</p>
                                    </div>
                                </details>

                                <details className="group">
                                    <summary className="p-5 cursor-pointer select-none flex justify-between items-center hover:bg-muted/30 transition-colors">
                                        <span className="font-semibold">Are these scores reliable for all types of companies?</span>
                                        <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg">&#9662;</span>
                                    </summary>
                                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
                                        <p>Not equally. Each score has known limitations:</p>
                                        <ul className="text-xs space-y-2">
                                            <li><strong className="text-foreground">Banks and financials:</strong> The Altman Z-Score and Piotroski F-Score were designed for non-financial companies. For banks, we use the <strong className="text-foreground">CAMELS framework</strong> instead (Capital adequacy, Asset quality, Management, Earnings, Liquidity, Sensitivity).</li>
                                            <li><strong className="text-foreground">High-growth tech:</strong> Young, fast-growing companies often score poorly on F-Score (high leverage, share dilution) and ROIC (reinvesting heavily). Low scores here may reflect growth investment, not weakness.</li>
                                            <li><strong className="text-foreground">Cyclical businesses:</strong> Scores can swing dramatically with the business cycle. A steel company may score 9/9 at the top of the cycle and 2/9 at the bottom — both are temporary.</li>
                                            <li><strong className="text-foreground">Insurance companies:</strong> We use a specialized <strong className="text-foreground">Insurance Quality</strong> framework focusing on combined ratio, investment income, and reserve adequacy.</li>
                                        </ul>
                                        <p>This platform <strong className="text-foreground">automatically detects</strong> the company type and applies the most appropriate scoring framework.</p>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </>
    )
}
