import { cn, formatCurrency, formatPercent, formatLargeNumber } from "@/lib/utils";

export function KPIBadge({ label, value, type = "currency", currency = "USD", className, trend }) {
    let displayValue = "-";

    if (value !== null && value !== undefined) {
        if (type === "currency") displayValue = formatCurrency(value, currency);
        else if (type === "large_currency") displayValue = formatLargeNumber(value, currency);
        else if (type === "percent") displayValue = formatPercent(value);
        else if (type === "number") displayValue = Number(value).toLocaleString();
        else if (type === "large_number") displayValue = formatLargeNumber(value);
        else displayValue = value;
    }

    return (
        <div className={cn("flex flex-col space-y-1 p-4 border rounded-xl bg-card", className)}>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">{displayValue}</span>
                {trend && (
                    <span className={cn(
                        "text-sm font-medium",
                        trend > 0 ? "text-emerald-500" : trend < 0 ? "text-rose-500" : "text-muted-foreground"
                    )}>
                        {trend > 0 ? "+" : ""}{formatPercent(trend)}
                    </span>
                )}
            </div>
        </div>
    );
}
