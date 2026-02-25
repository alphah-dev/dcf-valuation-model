"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { formatLargeNumber } from "@/lib/utils"

export function FinancialsChart({ data, currency }) {
    if (!data || !Array.isArray(data) || data.length === 0) return (
        <div className="h-[300px] flex items-center justify-center border rounded-xl bg-card text-muted-foreground">
            No financial history available for charting.
        </div>
    )

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => a.year - b.year)
    }, [data])

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover text-popover-foreground border shadow-md p-3 rounded-lg text-sm">
                    <p className="font-bold mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex items-center gap-2 mt-1">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium">{formatLargeNumber(entry.value, currency)}</span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                        dataKey="year"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                        tickFormatter={(value) => formatLargeNumber(value)}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        width={80}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                    />
                    <Bar
                        dataKey="net_income"
                        name="Net Income"
                        fill="hsl(var(--secondary))"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                    />
                    <Bar
                        dataKey="free_cash_flow"
                        name="Free Cash Flow"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
