"use client"

import Link from "next/link"
import { ArrowRight, BarChart2 } from "lucide-react"
import { formatCurrency, formatLargeNumber, formatPercent, cn } from "@/lib/utils"

export function StockCard({ stock }) {
    if (!stock) return null

    const isPositive = stock.fifty_two_week_high && stock.current_price
        ? (stock.current_price / stock.fifty_two_week_high) > 0.8 : true

    return (
        <div className="group flex flex-col justify-between p-5 border rounded-xl bg-card hover:bg-muted/50 transition-all hover:border-primary/50 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <Link href={`/stock/${stock.ticker}`} className="hover:underline">
                        <h3 className="text-xl font-bold tracking-tight text-primary flex items-center gap-1">
                            {stock.ticker}
                        </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground truncate max-w-[180px]" title={stock.name}>
                        {stock.name}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold font-mono">
                        {formatCurrency(stock.current_price, stock.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase mt-1">
                        {stock.currency}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                    <span className="text-xs text-muted-foreground block">Market Cap</span>
                    <span className="text-sm font-medium">{formatLargeNumber(stock.market_cap, stock.currency)}</span>
                </div>
                <div>
                    <span className="text-xs text-muted-foreground block">P/E Ratio</span>
                    <span className="text-sm font-medium">{stock.pe_ratio ? stock.pe_ratio.toFixed(1) : "-"}</span>
                </div>
                <div className="col-span-2 pt-2 border-t flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{stock.sector || "Unknown Sector"}</span>
                    <Link href={`/stock/${stock.ticker}`} className="text-xs font-medium text-primary flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        Analyze <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                </div>
            </div>

            <div className={cn(
                "absolute bottom-0 left-0 h-1 w-full opacity-50",
                isPositive ? "bg-emerald-500" : "bg-rose-500"
            )} />
        </div>
    )
}
