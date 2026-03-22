"use client"
import { useState, useRef, useEffect } from "react"
import { getTodayConcept, getNextRefreshTime, LEVEL_LABELS, LEVEL_HINTS, Concept } from "@/lib/concepts"
import { useGameStats } from "@/lib/useGameStats"

interface FeedbackResult {
  score: number
  class: "good" | "ok" | "shallow"
  label: string
  feedback: string
}

type Screen = "home" | "game" | "results"

export default function Game() {
  const [screen, setScreen] = useState<Screen>("home")
  const [concept] = useState<Concept>(getTodayConcept)
  const [level, setLevel] = useState(0)
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null)
  const [scores, setScores] = useState<number[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackResult[]>([])
  const { stats, saveResult } = useGameStats()
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (screen === "game" && textRef.current) {
      setTimeout(() => textRef.current?.focus(), 100)
    }
  }, [screen, level])

  async function submitAnswer() {
    if (answer.trim().length < 20) return
    setLoading(true)
    setFeedback(null)

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: concept.title,
          level: level + 1,
          question: concept.questions[level],
          answer: answer.trim()
        })
      })
      const data: FeedbackResult = await res.json()
      data.score = Math.min(10, Math.max(1, Math.round(data.score)))
      setFeedback(data)
      setScores(prev => [...prev, data.score])
      setFeedbacks(prev => [...prev, data])
    } catch {
      const fallback: FeedbackResult = { score: 5, class: "ok", label: "Noted", feedback: "Answer recorded." }
      setFeedback(fallback)
      setScores(prev => [...prev, 5])
      setFeedbacks(prev => [...prev, fallback])
    }
    setLoading(false)
  }

  function nextLevel() {
    if (level >= 4) {
      finishGame()
    } else {
      setLevel(l => l + 1)
      setAnswer("")
      setFeedback(null)
    }
  }

  function finishGame() {
    const total = scores.reduce((a, b) => a + b, 0)
    const pct = Math.round((total / 50) * 100)
    const today = new Date().toISOString().split("T")[0]
    saveResult({ date: today, concept: concept.title, scores, total, pct })
    setScreen("results")
  }

  function startOver() {
    setLevel(0)
    setAnswer("")
    setFeedback(null)
    setScores([])
    setFeedbacks([])
    setScreen("home")
  }

  const total = scores.reduce((a, b) => a + b, 0)
  const pct = Math.round((total / 50) * 100)

  const shareText = () => {
    const blocks = scores.map(s => s >= 8 ? "█" : s >= 5 ? "▓" : "░").join("")
    const medal = pct >= 80 ? "deep thinker" : pct >= 60 ? "going deeper" : pct >= 40 ? "surface level" : "start digging"
    return `Rabbit Hole — ${concept.title}\n${pct}/100 · ${medal}\n${blocks}`
  }

  const depthPct = level === 0 && !feedback ? 0 : Math.round(((level + (feedback ? 1 : 0)) / 5) * 100)

  if (screen === "home") return <HomeScreen concept={concept} stats={stats} onStart={() => setScreen("game")} />
  if (screen === "results") return <ResultsScreen concept={concept} pct={pct} total={total} feedbacks={feedbacks} scores={scores} shareText={shareText()} onReset={startOver} />

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1.25rem", minHeight: "100dvh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", letterSpacing: "0.05em" }}>
          {concept.title.toUpperCase()}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)" }}>
          {level + 1} / 5
        </span>
      </div>

      <div style={{ height: 2, background: "var(--border)", borderRadius: 2, marginBottom: "0.75rem", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${depthPct}%`, background: "var(--teal-mid)", borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: "2rem" }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < level ? "var(--teal-mid)" : i === level ? "var(--border-strong)" : "var(--border)"
          }} />
        ))}
      </div>

      <div className="fade-up" key={level}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
          {LEVEL_LABELS[level].toUpperCase()} · {LEVEL_HINTS[level]}
        </p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.4, color: "var(--text)", marginBottom: "1.5rem" }}>
          {concept.questions[level]}
        </p>

        {!feedback && (
          <>
            <textarea
              ref={textRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Write your answer here..."
              rows={5}
              disabled={loading}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                {answer.length < 20 ? `${20 - answer.length} more chars to submit` : ""}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)" }}>
                {answer.length}
              </span>
            </div>

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "var(--text-3)", fontSize: 14 }}>
                <ThinkingDots />
                Judging your depth...
              </div>
            ) : (
              <button className="btn btn-fill" onClick={submitAnswer} disabled={answer.trim().length < 20}>
                Submit
              </button>
            )}
          </>
        )}

        {feedback && (
          <div className="fade-up">
            <FeedbackCard result={feedback} />
            <button className="btn" onClick={nextLevel} style={{ marginTop: "1rem" }}>
              {level >= 4 ? "See results" : "Next level →"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function HomeScreen({ concept, stats, onStart }: { concept: Concept; stats: any; onStart: () => void }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    function update() {
      const diff = getNextRefreshTime().getTime() - Date.now()
      if (diff <= 0) { setTimeLeft("now"); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m`)
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
          RABBIT HOLE
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, lineHeight: 1.15, fontWeight: 400, marginBottom: "0.75rem" }}>
          Go deeper.<br /><em>Not wider.</em>
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.7, marginBottom: "2.5rem", fontWeight: 300 }}>
          One concept. Five levels. Each level you must explain <em>why</em>, not just <em>what</em>. The AI judges your depth honestly.
        </p>

        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "2rem", border: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            TODAY'S CONCEPT
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: "0.25rem" }}>{concept.title}</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>{concept.teaser}</p>
          {timeLeft && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", marginTop: "0.75rem", letterSpacing: "0.05em" }}>
              NEXT WORD IN {timeLeft.toUpperCase()}
            </p>
          )}
        </div>

        <button className="btn btn-fill" onClick={onStart}>Start</button>
      </div>

      {stats.gamesPlayed > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "2rem" }}>
          {[
            { label: "Streak", val: `${stats.streak}d` },
            { label: "Best", val: `${stats.bestScore}` },
            { label: "Played", val: `${stats.gamesPlayed}` }
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "0.75rem", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{s.val}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.05em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultsScreen({ concept, pct, total, feedbacks, scores, shareText, onReset }: any) {
  const [copied, setCopied] = useState(false)
  const medal = pct >= 80 ? "Deep thinker" : pct >= 60 ? "Going deeper" : pct >= 40 ? "Surface level" : "Start digging"

  function copy() {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
        COMPLETE
      </p>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 72, lineHeight: 1 }}>{pct}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", marginTop: "0.25rem", letterSpacing: "0.06em" }}>
          DEPTH SCORE · {total} / 50 · {medal.toUpperCase()}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
        {feedbacks.map((f: FeedbackResult, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.05em" }}>{LEVEL_LABELS[i].toUpperCase()}</div>
              <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>{f.label}</div>
            </div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              color: f.class === "good" ? "var(--teal)" : f.class === "shallow" ? "var(--red)" : "var(--text)",
              minWidth: 36,
              textAlign: "right"
            }}>
              {scores[i]}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1rem",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--text-2)",
        lineHeight: 1.8,
        marginBottom: "1rem",
        whiteSpace: "pre"
      }}>
        {shareText}
      </div>

      <button className="btn btn-fill" onClick={copy} style={{ marginBottom: "0.75rem" }}>
        {copied ? "Copied!" : "Copy result"}
      </button>
      <button className="btn" onClick={onReset}>Back to home</button>
    </div>
  )
}

function FeedbackCard({ result }: { result: FeedbackResult }) {
  const colors = {
    good: { bg: "var(--teal-light)", border: "var(--teal-mid)", label: "var(--teal)", text: "var(--teal)" },
    ok: { bg: "var(--amber-light)", border: "var(--amber)", label: "var(--amber)", text: "var(--amber)" },
    shallow: { bg: "var(--red-light)", border: "var(--red)", label: "var(--red)", text: "var(--red)" }
  }
  const c = colors[result.class]

  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "var(--radius)", padding: "1rem 1.25rem" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: c.label, letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
        {result.label.toUpperCase()} · {result.score} / 10
      </div>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.6 }}>{result.feedback}</div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: "var(--text-3)",
          animation: "shimmer 1.2s infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  )
}