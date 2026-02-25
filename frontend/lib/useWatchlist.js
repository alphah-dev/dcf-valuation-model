"use client"
import { useState, useEffect, useCallback } from "react"

const KEY = "dcf_watchlist"

export function useWatchlist() {
    const [watchlist, setWatchlist] = useState([])

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(KEY) || "[]")
            setWatchlist(stored)
        } catch {
            setWatchlist([])
        }
    }, [])

    const save = (next) => {
        setWatchlist(next)
        localStorage.setItem(KEY, JSON.stringify(next))
    }

    const add = useCallback((ticker) => {
        setWatchlist(prev => {
            if (prev.includes(ticker)) return prev
            const next = [...prev, ticker]
            localStorage.setItem(KEY, JSON.stringify(next))
            return next
        })
    }, [])

    const remove = useCallback((ticker) => {
        setWatchlist(prev => {
            const next = prev.filter(t => t !== ticker)
            localStorage.setItem(KEY, JSON.stringify(next))
            return next
        })
    }, [])

    const toggle = useCallback((ticker) => {
        setWatchlist(prev => {
            const next = prev.includes(ticker)
                ? prev.filter(t => t !== ticker)
                : [...prev, ticker]
            localStorage.setItem(KEY, JSON.stringify(next))
            return next
        })
    }, [])

    const isWatched = useCallback((ticker) => watchlist.includes(ticker), [watchlist])

    return { watchlist, add, remove, toggle, isWatched }
}
