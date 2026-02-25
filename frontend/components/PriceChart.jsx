"use client"

import { useState, useEffect, useCallback } from "react"
import { useTheme } from "next-themes"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

const PERIODS = ["1m", "3m", "6m", "1y", "2y"]

function CustomTooltip({ active, payload, currency }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg text-sm">
            <div className="text-muted-foreground text-xs mb-0.5">{d.date}</div>
            <div className="font-bold">{formatCurrency(d.close, currency)}</div>
        </div>
    )
}

export function PriceChart({ ticker, currency = "USD" }) {
    const { theme } = useTheme()
    const [period, setPeriod] = useState("1y")
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const tickColor = theme === "dark" ? "#a1a1aa" : "#71717a"

    const load = useCallback(async (p) => {
        setLoading(true)
        setError(null)
        try {
            const res = await api.getPriceHistory(ticker, p)
            setData(res.prices || [])
        } catch {
            setError("Failed to load chart data")
        } finally {
            setLoading(false)
        }
    }, [ticker])

    useEffect(() => { load(period) }, [load, period])

    if (error) return (
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            {error}
        </div>
    )

    if (loading) return (
        <div className="h-64 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    )

    if (!data.length) return (
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No price data available.
        </div>
    )

    const first = data[0]?.close ?? 0
    const last = data[data.length - 1]?.close ?? 0
    const changeAbs = last - first
    const changePct = first !== 0 ? (changeAbs / first) * 100 : 0
    const isUp = changeAbs >= 0
    const color = isUp ? "#10b981" : "#f43f5e"

    const allCloses = data.map(d => d.close)
    const minClose = Math.min(...allCloses)
    const maxClose = Math.max(...allCloses)
    const pad = (maxClose - minClose) * 0.08 || maxClose * 0.05

    return (
        <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <span
                        className={`flex items-center gap-1 text-sm font-bold ${isUp ? "text-emerald-500" : "text-rose-500"}`}
                    >
                        {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {isUp ? "+" : ""}{changePct.toFixed(2)}%
                        &nbsp;<span className="font-normal text-muted-foreground">
                            ({isUp ? "+" : ""}{formatCurrency(changeAbs, currency)})
                        </span>
                    </span>
                </div>

                <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                    {PERIODS.map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors
                                ${period === p
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`priceGrad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => {
                            const d = new Date(v)
                            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        }}
                        tick={{ fontSize: 10, fill: tickColor }}
                        interval="preserveStartEnd"
                        minTickGap={60}
                    />
                    <YAxis
                        domain={[minClose - pad, maxClose + pad]}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => {
                            if (v >= 1000) return (v / 1000).toFixed(1) + "k"
                            return v.toFixed(0)
                        }}
                        tick={{ fontSize: 10, fill: tickColor }}
                        width={48}
                    />
                    <Tooltip content={<CustomTooltip currency={currency} />} />
                    <ReferenceLine y={first} stroke={color} strokeDasharray="3 3" strokeOpacity={0.4} />
                    <Area
                        type="monotone"
                        dataKey="close"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#priceGrad-${ticker})`}
                        dot={false}
                        activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
