"use client"
import { useState, useEffect } from "react"

interface GameResult {
  date: string
  concept: string
  scores: number[]
  total: number
  pct: number
}

interface Stats {
  gamesPlayed: number
  streak: number
  bestScore: number
  lastPlayed: string | null
}

const DEFAULT_STATS: Stats = { gamesPlayed: 0, streak: 0, bestScore: 0, lastPlayed: null }

export function useGameStats() {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rabbit-hole-stats")
      if (raw) setStats(JSON.parse(raw))
    } catch {}
  }, [])

  function saveResult(result: GameResult) {
    try {
      const history: GameResult[] = JSON.parse(localStorage.getItem("rabbit-hole-history") || "[]")
      history.unshift(result)
      localStorage.setItem("rabbit-hole-history", JSON.stringify(history.slice(0, 30)))

      const today = new Date().toISOString().split("T")[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
      const prev = stats

      const newStreak = prev.lastPlayed === yesterday ? prev.streak + 1
        : prev.lastPlayed === today ? prev.streak
        : 1

      const newStats: Stats = {
        gamesPlayed: prev.gamesPlayed + 1,
        streak: newStreak,
        bestScore: Math.max(prev.bestScore, result.pct),
        lastPlayed: today
      }
      localStorage.setItem("rabbit-hole-stats", JSON.stringify(newStats))
      setStats(newStats)
    } catch {}
  }

  return { stats, saveResult }
}
