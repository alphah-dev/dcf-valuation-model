"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Search, Moon, Sun, BarChart2, Briefcase, TrendingUp, Activity, Star, X, Menu } from "lucide-react"
import { api } from "@/lib/api"
import { useWatchlist } from "@/lib/useWatchlist"

export function Navbar() {
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [suggestions, setSuggestions] = useState([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [showWatchlist, setShowWatchlist] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mobileQuery, setMobileQuery] = useState("")
    const dropdownRef = useRef(null)
    const watchlistRef = useRef(null)
    const inputRef = useRef(null)
    const { watchlist, remove } = useWatchlist()

    useEffect(() => {
        if (query.trim().length < 1) {
            setSuggestions([])
            setShowDropdown(false)
            return
        }

        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const results = await api.searchStocks(query)
                setSuggestions((results || []).slice(0, 6))
                setShowDropdown(true)
            } catch {
                setSuggestions([])
            } finally {
                setIsSearching(false)
            }
        }, 250)

        return () => clearTimeout(timer)
    }, [query])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false)
            }
            if (watchlistRef.current && !watchlistRef.current.contains(e.target)) {
                setShowWatchlist(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => { document.body.style.overflow = "" }
    }, [mobileMenuOpen])

    const handleSelect = (ticker) => {
        setQuery("")
        setShowDropdown(false)
        setMobileMenuOpen(false)
        router.push(`/stock/${ticker}`)
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && query.trim()) {
            setShowDropdown(false)
            router.push(`/search?q=${encodeURIComponent(query.trim())}`)
        }
        if (e.key === "Escape") {
            setShowDropdown(false)
            inputRef.current?.blur()
        }
    }

    const handleMobileSearch = (e) => {
        if (e.key === "Enter" && mobileQuery.trim()) {
            setMobileMenuOpen(false)
            router.push(`/search?q=${encodeURIComponent(mobileQuery.trim())}`)
        }
    }

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 md:gap-10">
                        <Link href="/" className="flex items-center space-x-2.5 group" onClick={() => setMobileMenuOpen(false)}>
                            <div className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105 group-hover:rotate-3 duration-300">
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 sm:h-5 sm:w-5">
                                    <rect x="3" y="14" width="3.5" height="6" rx="1" fill="white" opacity="0.5" />
                                    <rect x="8.5" y="9" width="3.5" height="11" rx="1" fill="white" opacity="0.7" />
                                    <rect x="14" y="4" width="3.5" height="16" rx="1" fill="white" />
                                    <path d="M20.5 5.5L18 8l-1.5-1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="inline-block font-extrabold text-lg sm:text-xl tracking-wide bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">DCF Terminal</span>
                        </Link>
                        <nav className="hidden md:flex gap-6">
                            <Link
                                href="/market"
                                className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <BarChart2 className="mr-2 h-4 w-4" />
                                Markets
                            </Link>
                            <Link
                                href="/search"
                                className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <Briefcase className="mr-2 h-4 w-4" />
                                Screener
                            </Link>
                            <a
                                href="https://algoterm.vercel.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm font-bold text-amber-700 dark:text-yellow-400 transition-colors hover:text-amber-800 dark:hover:text-yellow-300 gap-1.5 bg-amber-50 dark:bg-yellow-500/10 px-3 py-1.5 rounded-full border border-amber-200 dark:border-yellow-500/20 hover:bg-amber-100 dark:hover:bg-yellow-500/20"
                            >
                                <Activity className="h-4 w-4" />
                                AlgoTerm
                                <span className="text-[10px] uppercase tracking-wider font-bold ml-1 bg-amber-100 dark:bg-yellow-500/20 text-amber-800 dark:text-yellow-300 px-1.5 py-0.5 rounded-sm">Paper Trade</span>
                            </a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="hidden sm:block relative" ref={dropdownRef}>
                            <div className="flex w-56 lg:w-64 items-center rounded-md border bg-muted/50 px-3 py-1.5 text-sm ring-offset-background focus-within:bg-background focus-within:ring-1 focus-within:ring-primary transition-all">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search tickers..."
                                    className="bg-transparent outline-none w-full placeholder:text-muted-foreground"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onFocus={() => { if (suggestions.length > 0) setShowDropdown(true) }}
                                    onKeyDown={handleKeyDown}
                                />
                                {isSearching && (
                                    <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                                )}
                            </div>

                            {showDropdown && suggestions.length > 0 && (
                                <div className="absolute top-full mt-1 w-80 bg-popover border rounded-lg shadow-lg z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                    {suggestions.map((stock) => (
                                        <button
                                            key={stock.ticker}
                                            onClick={() => handleSelect(stock.ticker)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/80 transition-colors text-left group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-sm font-bold text-primary whitespace-nowrap">{stock.ticker}</span>
                                                <span className="text-sm text-muted-foreground truncate">{stock.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <span className="text-xs text-muted-foreground/60">{stock.exchange}</span>
                                                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    ))}
                                    <Link
                                        href={`/search?q=${encodeURIComponent(query)}`}
                                        onClick={() => setShowDropdown(false)}
                                        className="block w-full text-center text-xs text-primary py-2 border-t hover:bg-muted/50 transition-colors font-medium"
                                    >
                                        View all results for &quot;{query}&quot;
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={watchlistRef}>
                            <button
                                onClick={() => setShowWatchlist(v => !v)}
                                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border bg-background hover:bg-muted transition-colors relative"
                                title="Watchlist"
                            >
                                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                {watchlist.length > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                        {watchlist.length}
                                    </span>
                                )}
                            </button>

                            {showWatchlist && (
                                <div className="absolute right-0 top-full mt-1 w-64 bg-popover border rounded-lg shadow-lg z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="px-4 py-2.5 border-b flex items-center justify-between">
                                        <span className="text-sm font-semibold">Watchlist</span>
                                        <span className="text-xs text-muted-foreground">{watchlist.length} stocks</span>
                                    </div>
                                    {watchlist.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                            No stocks watched yet.<br />
                                            <span className="text-xs">Click ★ on any stock page.</span>
                                        </div>
                                    ) : (
                                        <ul className="max-h-72 overflow-y-auto">
                                            {watchlist.map(t => (
                                                <li key={t} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors">
                                                    <Link
                                                        href={`/stock/${t}`}
                                                        onClick={() => setShowWatchlist(false)}
                                                        className="text-sm font-mono font-bold text-primary hover:underline flex-1"
                                                    >
                                                        {t}
                                                    </Link>
                                                    <button
                                                        onClick={() => remove(t)}
                                                        className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                                                        title="Remove"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border bg-background hover:bg-muted transition-colors"
                        >
                            <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </button>

                        <button
                            onClick={() => setMobileMenuOpen(v => !v)}
                            className="inline-flex md:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border bg-background hover:bg-muted transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen
                                ? <X className="h-4 w-4" />
                                : <Menu className="h-4 w-4" />
                            }
                        </button>
                    </div>
                </div>
            </header>

            {mobileMenuOpen && (
                <div className="fixed inset-0 top-[56px] sm:top-[64px] z-40 md:hidden">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <div className="relative bg-background border-b shadow-lg animate-in slide-in-from-top-2 duration-200">
                        <div className="container px-4 py-4 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search tickers or company name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={mobileQuery}
                                    onChange={(e) => setMobileQuery(e.target.value)}
                                    onKeyDown={handleMobileSearch}
                                    autoFocus
                                />
                            </div>

                            <nav className="space-y-1">
                                <Link
                                    href="/market"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                    Markets
                                </Link>
                                <Link
                                    href="/search"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    Screener
                                </Link>
                                <Link
                                    href="/market/heatmap"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                    Heatmap
                                </Link>
                                <a
                                    href="https://algoterm.vercel.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold text-amber-700 dark:text-yellow-400 hover:bg-amber-50 dark:hover:bg-yellow-500/10 transition-colors"
                                >
                                    <Activity className="h-4 w-4" />
                                    AlgoTerm
                                    <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 dark:bg-yellow-500/20 text-amber-800 dark:text-yellow-300 px-1.5 py-0.5 rounded-sm">Paper Trade</span>
                                </a>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
