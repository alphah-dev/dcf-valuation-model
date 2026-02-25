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
                )}
            </main>
        </>
    )
}
