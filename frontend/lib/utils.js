import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(value, currency = "USD") {
    if (value === undefined || value === null) return "-"
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

export function formatLargeNumber(value, currency = "") {
    if (value === undefined || value === null) return "-"

    const num = Math.abs(Number(value))
    let formatted = ""
    let suffix = ""

    if (num >= 1.0e+12) {
        formatted = (num / 1.0e+12).toFixed(2)
        suffix = "T"
    } else if (num >= 1.0e+9) {
        formatted = (num / 1.0e+9).toFixed(2)
        suffix = "B"
    } else if (num >= 1.0e+6) {
        formatted = (num / 1.0e+6).toFixed(2)
        suffix = "M"
    } else {
        formatted = num.toLocaleString("en-US", { maximumFractionDigits: 0 })
    }

    const prefix = value < 0 ? "-" : ""
    const currencyStr = currency ? currency + " " : ""
    return `${prefix}${currencyStr}${formatted}${suffix}`
}

export function formatPercent(value) {
    if (value === undefined || value === null) return "-"
    return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
    }).format(value)
}
