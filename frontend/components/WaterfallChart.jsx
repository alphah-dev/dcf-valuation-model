"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { formatLargeNumber } from "@/lib/utils"

export function WaterfallChart({ data, currency }) {
    if (!data) return null;


    const formattedData = useMemo(() => {
        let currentTotal = 0;

        const pv_fcf = data.pv_fcf;
        const step1 = {
            name: "PV of FCF (1-5Y)",
            value: pv_fcf,
            start: 0,
            end: pv_fcf,
            fill: "hsl(var(--primary))",
        };
        currentTotal += pv_fcf;

        const pv_tv = data.pv_terminal;
        const step2 = {
            name: "PV of Terminal Val",
            value: pv_tv,
            start: currentTotal,
            end: currentTotal + pv_tv,
            fill: "hsl(var(--primary)/0.6)",
        };
        currentTotal += pv_tv;

        const step3 = {
            name: "Enterprise Value",
            value: currentTotal,
            start: 0,
            end: currentTotal,
            fill: "hsl(var(--muted-foreground))",
            isTotal: true
        };

        const debt = data.adjustments?.total_debt || 0;
        const step4 = {
            name: "Less: Total Debt",
            value: -debt,
            start: currentTotal - debt,
            end: currentTotal,
            fill: "hsl(var(--destructive))",
        };
        currentTotal -= debt;

        const cash = data.adjustments?.cash || 0;
        const step5 = {
            name: "Plus: Cash",
            value: cash,
            start: currentTotal,
            end: currentTotal + cash,
            fill: "#10b981",
        };
        currentTotal += cash;

        const step6 = {
            name: "Implied Equity Value",
            value: currentTotal,
            start: 0,
            end: currentTotal,
            fill: "hsl(var(--primary))",
            isTotal: true
        };

        return [step1, step2, step3, step4, step5, step6];
    }, [data]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const p = payload[0].payload;
            return (
                <div className="bg-popover text-popover-foreground border shadow-md p-3 rounded-lg text-sm">
                    <p className="font-bold mb-2">{p.name}</p>
                    <div className="flex items-center justify-between gap-4 mt-1">
                        <span className="text-muted-foreground">{p.isTotal ? "Total:" : "Amount:"}</span>
                        <span className={p.value < 0 ? "text-destructive font-medium" : "font-medium"}>
                            {p.value > 0 && !p.isTotal ? "+" : ""}{formatLargeNumber(p.value, currency)}
                        </span>
                    </div>
                    {p.isTotal && (
                        <div className="flex items-center justify-between gap-4 mt-1 pt-1 border-t">
                            <span className="text-muted-foreground">Per Share:</span>
                            <span className="font-bold text-primary">
                                {p.name === "Implied Equity Value"
                                    ? formatLargeNumber(data.fair_value_per_share, currency)
                                    : "-"}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={formattedData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        tickFormatter={(value) => formatLargeNumber(value)}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        width={80}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />

                    <Bar dataKey="end" isAnimationActive={false}>
                        {formattedData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.fill}
                                className={entry.isTotal ? "opacity-100" : "opacity-90"}
                                style={{
                                    transform: `translateY(${entry.start > 0 && !entry.isTotal ? entry.start : 0}px)`
                                }}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
