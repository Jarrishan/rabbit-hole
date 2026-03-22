"use client"
import { useState, useEffect } from "react"

export interface DayResult {
  date: string
  concept: string
  scores: number[]
  total: number
  pct: number
}

export interface GameStats {
  streak: number
  bestScore: number
  gamesPlayed: number
  history: DayResult[]
}

const DEFAULT_STATS: GameStats = {
  streak: 0,
  bestScore: 0,
  gamesPlayed: 0,
  history: []
}

export function useGameStats() {
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rabbit-hole-stats")
      if (raw) setStats(JSON.parse(raw))
    } catch {}
  }, [])

  function saveResult(result: DayResult) {
    setStats(prev => {
      const history = [result, ...prev.history.filter(h => h.date !== result.date)].slice(0, 30)
      const lastDate = prev.history[0]?.date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split("T")[0]
      const streak = lastDate === yStr ? prev.streak + 1 : 1
      const next: GameStats = {
        streak,
        bestScore: Math.max(prev.bestScore, result.pct),
        gamesPlayed: prev.gamesPlayed + 1,
        history
      }
      try { localStorage.setItem("rabbit-hole-stats", JSON.stringify(next)) } catch {}
      return next
    })
  }

  return { stats, saveResult }
}