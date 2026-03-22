"use client"
import { useState, useRef, useEffect } from "react"
import { getTodayConcept, getTomorrowConcept, getNextRefreshTime, LEVEL_LABELS, LEVEL_HINTS, Concept } from "@/lib/concepts"
import { useGameStats } from "@/lib/useGameStats"
import { supabase } from "@/lib/supabase"

interface FeedbackResult {
  score: number
  class: "good" | "ok" | "shallow"
  label: string
  feedback: string
  insight?: string
  nodeLabel: string
  nextQuestion?: string
}
type Screen = "onboarding" | "username" | "home" | "hook" | "game" | "transitioning" | "extend" | "results" | "leaderboard"

function isFirstVisit(): boolean {
  try { return !localStorage.getItem("rabbit-hole-visited") } catch { return true }
}
function markVisited() {
  try { localStorage.setItem("rabbit-hole-visited", "1") } catch {}
}
interface StoredUser { id: string; username: string }
function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("rabbit-hole-user")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.id === "string" && typeof parsed.username === "string" && parsed.id && parsed.username) {
      return parsed as StoredUser
    }
    return null
  } catch { return null }
}
function storeUser(id: string, username: string) {
  try { localStorage.setItem("rabbit-hole-user", JSON.stringify({ id, username })) } catch {}
}


export default function Game() {
  const [screen, setScreen] = useState<Screen | null>(null)
  const [concept, setConcept] = useState<Concept>(() => getTodayConcept())
  const [level, setLevel] = useState(0)
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null)
  const [scores, setScores] = useState<number[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackResult[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [nodeLabels, setNodeLabels] = useState<string[]>([])
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<(string | null)[]>([])
  const [story, setStory] = useState("")
  const [storyLoading, setStoryLoading] = useState(false)
  const [debrief, setDebrief] = useState<string>("")
  const [debriefLoading, setDebriefLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [extended, setExtended] = useState(false)
  const [username, setUsername] = useState("")
  const [rank, setRank] = useState<number | null>(null)
  const [trainingMode, setTrainingMode] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const { stats, saveResult } = useGameStats()
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const user = getStoredUser()
    console.log("[rabbit-hole] mount — localStorage rabbit-hole-user:", localStorage.getItem("rabbit-hole-user"), "→ parsed:", user)
    if (user) {
      setUsername(user.username)
      setScreen("home")
    } else if (isFirstVisit()) {
      setScreen("onboarding")
    } else {
      setScreen("username")
    }
  }, [])

  useEffect(() => {
    if (screen === "game" && textRef.current) setTimeout(() => textRef.current?.focus(), 150)
  }, [screen, level])

  async function submitAnswer() {
    if (!concept || answer.trim().length === 0) return
    const currentQuestion = adaptiveQuestions[level] ?? concept.questions[level]
    setLoading(true); setFeedback(null); setHint(null); setStory(""); setStoryLoading(false)
    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: concept.title,
          level: level + 1,
          question: currentQuestion,
          answer: answer.trim(),
          nextQuestionTemplate: level < 4 ? concept.questions[level + 1] : null
        })
      })
      const data: FeedbackResult = await res.json()
      data.score = Math.min(10, Math.max(1, Math.round(data.score)))
      const newAnswers = [...answers, answer.trim()]
      setFeedback(data)
      setScores(prev => [...prev, data.score])
      setFeedbacks(prev => [...prev, data])
      setAnswers(newAnswers)
      setNodeLabels(prev => [...prev, data.nodeLabel || data.label])
      if (data.nextQuestion && level < 4) {
        setAdaptiveQuestions(prev => { const next = [...prev]; next[level + 1] = data.nextQuestion as string; return next })
      }
      // Fetch hint if training mode is on
      if (trainingMode) {
        setHintLoading(true)
        fetch("/api/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept: concept.title, level: level + 1, question: currentQuestion, answer: answer.trim(), score: data.score })
        })
          .then(r => r.json())
          .then(d => { setHint(d.hint || null); setHintLoading(false) })
          .catch(() => setHintLoading(false))
      }
      // Fire story fetch asynchronously
      setStoryLoading(true)
      fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: concept.title, answers: newAnswers })
      })
        .then(r => r.json())
        .then(d => { setStory(d.story || ""); setStoryLoading(false) })
        .catch(() => setStoryLoading(false))
    } catch {
      const fallback: FeedbackResult = { score: 5, class: "ok", label: "Noted", feedback: "Answer recorded.", insight: "", nodeLabel: "Answer recorded" }
      setFeedback(fallback)
      setScores(prev => [...prev, 5])
      setFeedbacks(prev => [...prev, fallback])
      setAnswers(prev => [...prev, answer.trim()])
      setNodeLabels(prev => [...prev, "Answer recorded"])
    }
    setLoading(false)
  }

  async function nextLevel() {
    if (level === 2) {
      setScreen("extend")
    } else if (level >= 4) {
      finishGame()
    } else {
      setTransitioning(true)
      setTimeout(() => {
        setLevel(l => l + 1); setAnswer(""); setFeedback(null); setHint(null); setStory(""); setStoryLoading(false); setTransitioning(false)
      }, 600)
    }
  }

  async function finishGame() {
    const allScores = [...scores]
    const total = allScores.reduce((a, b) => a + b, 0)
    const levelsCompleted = allScores.length
    const maxScore = levelsCompleted * 10
    const pct = Math.round((total / maxScore) * 100)
    saveResult({ date: new Date().toISOString().split("T")[0], concept: concept.title, scores: allScores, total, pct })
    setScreen("results")
    setDebriefLoading(true)
    const user = getStoredUser()
    const today = new Date().toISOString().split("T")[0]
    const conceptTitle = concept.title
    const finalPct = pct
    if (user) {
      ;(async () => {
        try {
          const { data: existing } = await supabase
            .from("scores")
            .select("id, score")
            .eq("username", user.username)
            .eq("date", today)
            .single()

          if (existing) {
            if (finalPct > existing.score) {
              await supabase
                .from("scores")
                .update({ score: finalPct, answers, feedbacks })
                .eq("id", existing.id)
            }
          } else {
            await supabase
              .from("scores")
              .insert({ user_id: user.id, username: user.username, concept: conceptTitle, score: finalPct, date: today, answers, feedbacks })
          }

          const { count } = await supabase
            .from("scores")
            .select("id", { count: "exact", head: true })
            .eq("concept", conceptTitle)
            .eq("date", today)
            .gt("score", finalPct)
          setRank((count ?? 0) + 1)
        } catch {}
      })()
    }
    try {
      const res = await fetch("/api/debrief", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: concept.title, questions: concept.questions, answers, scores: allScores })
      })
      const data = await res.json()
      setDebrief(data.debrief || "")
    } catch { setDebrief("") }
    setDebriefLoading(false)
  }

  function handleConceptChange(newConcept: Concept) {
    setConcept(newConcept)
    setAdaptiveQuestions([])
    setScores([]); setFeedbacks([]); setAnswers([]); setNodeLabels([]); setDebrief(""); setStory("")
  }

const [pendingCustomConcept, setPendingCustomConcept] = useState("")

  function startOver(customConcept?: string) {
    setLevel(0); setAnswer(""); setFeedback(null)
    setScores([]); setFeedbacks([]); setAnswers([]); setNodeLabels([])
    setAdaptiveQuestions([]); setStory(""); setStoryLoading(false); setDebrief("")
    setExtended(false)
    setPendingCustomConcept(customConcept ?? "")
    setScreen("home")
  }

  const total = scores.reduce((a, b) => a + b, 0)
  const maxLevels = extended ? 5 : 3
  const pct = scores.length > 0 ? Math.round((total / (scores.length * 10)) * 100) : 0
  const depthPct = level === 0 && !feedback ? 0 : Math.round(((level + (feedback ? 1 : 0)) / maxLevels) * 100)
  const currentQuestion = adaptiveQuestions[level] ?? concept.questions[level]

  if (screen === null) return null

  if (screen === "onboarding") return (
    <OnboardingScreen onDone={() => { markVisited(); setScreen("username") }} />
  )
  if (screen === "username") return (
    <UsernameScreen onDone={(id: string, uname: string) => { storeUser(id, uname); setUsername(uname); setScreen("home") }} />
  )
  if (screen === "leaderboard") return (
    <LeaderboardScreen username={username} onBack={() => setScreen("home")} />
  )
  if (screen === "home") return <HomeScreen concept={concept} stats={stats} username={username} initialConcept={pendingCustomConcept} onStart={() => setScreen("hook")} onConceptChange={handleConceptChange} onLeaderboard={() => setScreen("leaderboard")} />
  if (screen === "extend") return (
    <ExtendScreen
      onFinish={finishGame}
      onExtend={() => { setScreen("game"); setLevel(3); setAnswer(""); setFeedback(null); setExtended(true) }}
    />
  )
  if (screen === "hook") return <HookScreen concept={concept} onReady={() => setScreen("game")} />
  if (screen === "results") return (
    <ResultsScreen concept={concept} pct={pct} total={total} feedbacks={feedbacks} scores={scores} answers={answers} nodeLabels={nodeLabels} debrief={debrief} debriefLoading={debriefLoading} rank={rank} onReset={startOver} onLeaderboard={() => setScreen("leaderboard")} />
  )

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1.25rem", minHeight: "100dvh", opacity: transitioning ? 0 : 1, transition: "opacity 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", letterSpacing: "0.05em" }}>{concept.title.toUpperCase()}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => setTrainingMode(m => !m)}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: trainingMode ? "var(--teal)" : "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.04em" }}
          >
            {trainingMode ? "Train: on" : "Train: off"}
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)" }}>{level + 1} / {maxLevels}</span>
        </div>
      </div>
      <div style={{ height: 2, background: "var(--border)", borderRadius: 2, marginBottom: "0.75rem", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${depthPct}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem" }}>
        {Array.from({ length: maxLevels }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < level ? "var(--accent)" : i === level ? "var(--border-strong)" : "var(--border)", transition: "background 0.4s ease" }} />
        ))}
      </div>
      <ConceptMap feedbacks={feedbacks} nodeLabels={nodeLabels} currentLevel={level} answers={answers} totalLevels={maxLevels} />

      {/* Previous answers + divider */}
      {level > 0 && answers.slice(0, level).length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          {answers.slice(0, level).map((ans, i) => (
            <PreviousAnswerCard key={i} answer={ans} label={LEVEL_LABELS[i].toLowerCase()} />
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>YOUR THINKING SO FAR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
        </div>
      )}

      <div className="fade-up" key={level}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
          {LEVEL_LABELS[level].toUpperCase()} · {LEVEL_HINTS[level]}
        </p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.4, color: "var(--text)", marginBottom: "1.5rem" }}>
          <QuestionText text={currentQuestion} />
        </p>
        {!feedback && (
          <>
            <textarea ref={textRef} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your answer here..." rows={5} disabled={loading} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>{answer.length > 0 && answer.trim().length < 20 ? "That's a start — say a bit more." : ""}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)" }}>{answer.length}</span>
            </div>
            {loading ? <ThinkingDots /> : <button className="btn btn-fill" onClick={submitAnswer}>Submit</button>}
            {!loading && level >= 3 && (
              <button onClick={finishGame} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "0.5rem 0 0", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
                Finish here →
              </button>
            )}
          </>
        )}
        {feedback && (
          <div className="fade-up">
            <FeedbackCard result={feedback} />
            {feedback.insight && (
              <div style={{ borderLeft: "2px solid var(--border-strong)", paddingLeft: "0.75rem", marginTop: "0.75rem" }}>
                <p style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.6 }}>{feedback.insight}</p>
              </div>
            )}
            {trainingMode && (hint || hintLoading) && (
              <div style={{ background: "var(--teal-light)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", marginTop: "0.75rem" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--teal)", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>HINT</p>
                {hintLoading ? (
                  <div style={{ display: "flex", gap: 4, paddingTop: "0.1rem" }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--teal)", animation: "shimmer 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--teal)", lineHeight: 1.6 }}>{hint}</p>
                )}
              </div>
            )}
            {(story || storyLoading) && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", marginTop: "0.75rem" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>YOUR STORY SO FAR</p>
                {storyLoading ? (
                  <div style={{ display: "flex", gap: 4, paddingTop: "0.1rem" }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", animation: "shimmer 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.6 }}>{story}</p>
                )}
              </div>
            )}
            <button className="btn" onClick={nextLevel} style={{ marginTop: "1rem" }}>
              {level >= 4 ? "See results" : level === 3 ? "One more level →" : "Go deeper →"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function OnboardingScreen({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div className="fade-up">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>RABBIT HOLE</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1.2, fontWeight: 400, marginBottom: "0.75rem" }}>A game that rewards depth, not recall.</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, marginBottom: "1.5rem" }}>One concept per day. Three questions. Each one goes deeper than the last.</p>
        <div style={{ marginBottom: "1.25rem" }}>
          {[
            "Write your answer in plain prose — no multiple choice, no hints",
            "An AI judges your depth honestly. Shallow answers get called out.",
            "Each question builds directly on what you just said"
          ].map((point, i) => (
            <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
              <span style={{ color: "var(--teal-mid)", flexShrink: 0, marginTop: "0.15rem" }}>✓</span>
              <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6 }}>{point}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6, fontStyle: "italic", borderLeft: "2px solid var(--border)", paddingLeft: "0.75rem", marginBottom: "1.5rem" }}>
          You build understanding — not retrieve facts.
        </p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>HOW YOU&apos;LL BE JUDGED</p>
          {[
            { range: "8–10", label: "Deep insight", desc: "You went beyond the surface and showed real understanding", color: "var(--teal)" },
            { range: "5–7", label: "Correct but surface", desc: "Right direction, but didn't dig into the why or how", color: "var(--amber)" },
            { range: "1–4", label: "Vague or shallow", desc: "Too general, or missed what the question was really asking", color: "var(--red)" },
          ].map(({ range, label, desc, color }) => (
            <div key={range} style={{ display: "flex", gap: "0.75rem", padding: "0.5rem 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color, flexShrink: 0, minWidth: "2.5rem", paddingTop: "0.1rem" }}>{range}</span>
              <div>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>{label}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.4 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <button className="btn btn-fill" onClick={onDone}>Continue →</button>
      </div>
    </div>
  )
}

function UsernameScreen({ onDone }: { onDone: (id: string, username: string) => void }) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      console.log("[rabbit-hole] UsernameScreen — found stored user, skipping:", user)
      onDone(user.id, user.username)
    }
  }, [])

  const valid = /^[a-zA-Z0-9_]{3,15}$/.test(name)

  async function handleSubmit() {
    if (!valid || loading) return
    setLoading(true); setError("")
    const { data, error: err } = await supabase
      .from("users")
      .insert({ username: name.trim() })
      .select("id, username")
      .single()
    if (err) {
      setError(err.code === "23505" ? "That one's taken — try another." : "Something went wrong. Try again.")
      setLoading(false)
      return
    }
    onDone(data.id, data.username)
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="fade-up">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>RABBIT HOLE</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1.2, fontWeight: 400, marginBottom: "0.5rem" }}>Pick a username.</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: "1.5rem" }}>3–15 characters. Letters, numbers, underscores.</p>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError("") }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="your_username"
          maxLength={15}
          autoFocus
          style={{ width: "100%", background: "var(--surface)", border: `1px solid ${error ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius)", color: "var(--text)", fontSize: 16, padding: "0.75rem 1rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.2s", marginBottom: "0.5rem" }}
          onFocus={e => !error && (e.currentTarget.style.borderColor = "var(--border-strong)")}
          onBlur={e => !error && (e.currentTarget.style.borderColor = "var(--border)")}
        />
        {error && <p style={{ fontSize: 12, color: "var(--red)", marginBottom: "0.75rem" }}>{error}</p>}
        <button
          className="btn btn-fill"
          onClick={handleSubmit}
          disabled={!valid || loading}
          style={{ opacity: valid && !loading ? 1 : 0.45, transition: "opacity 0.15s" }}
        >
          {loading ? "Saving..." : "Let's go"}
        </button>
      </div>
    </div>
  )
}

function HookScreen({ concept, onReady }: { concept: Concept; onReady: () => void }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="fade-up" style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1.5, fontWeight: 400, fontStyle: "italic", color: "var(--text)", textAlign: "center" }}>
          {(concept as any).hook ?? concept.teaser}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button className="btn btn-fill" onClick={onReady}>I&apos;m ready</button>
        <button className="btn" onClick={onReady} style={{ border: "none", color: "var(--text-3)", fontSize: 13 }}>skip</button>
      </div>
    </div>
  )
}

function TodayLeaderboardPreview({ username, onSeeAll }: { username: string; onSeeAll: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    supabase
      .from("scores")
      .select("username, score")
      .eq("date", today)
      .order("score", { ascending: false })
      .limit(3)
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
      .then(undefined, () => setLoading(false))
  }, [])

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em" }}>TODAY&apos;S TOP 3</span>
        <button onClick={onSeeAll} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: "var(--accent)", fontFamily: "inherit" }}>See all →</button>
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {[0,1,2].map(i => <div key={i} style={{ height: 20, borderRadius: "var(--radius)", background: "var(--border)", opacity: 0.5 }} />)}
        </div>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>No scores yet today — be the first</p>
      ) : (
        rows.map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.3rem 0.4rem", borderLeft: row.username === username ? "2px solid var(--teal-mid)" : "2px solid transparent", marginLeft: "-0.4rem", paddingLeft: row.username === username ? "0.6rem" : "0.4rem" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--accent)", minWidth: "1rem" }}>{i + 1}</span>
            <span style={{ fontSize: 13, color: row.username === username ? "var(--teal)" : "var(--text)", flex: 1 }}>{row.username}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text)" }}>{row.score}</span>
          </div>
        ))
      )}
    </div>
  )
}

function HomeScreen({ concept, stats, username, initialConcept, onStart, onConceptChange, onLeaderboard }: { concept: Concept; stats: any; username: string; initialConcept?: string; onStart: () => void; onConceptChange: (c: Concept) => void; onLeaderboard: () => void }) {
  const [customInput, setCustomInput] = useState(initialConcept || "")
  const [customLoading, setCustomLoading] = useState(false)
  const [customError, setCustomError] = useState("")
  const [timeLeft, setTimeLeft] = useState("")
  const tomorrow = getTomorrowConcept()

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

  async function handleCustomConcept(topic?: string) {
    const val = (topic ?? customInput).trim()
    if (val.length < 3 || customLoading) return
    setCustomLoading(true); setCustomError("")
    try {
      const res = await fetch("/api/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: val })
      })
      const data = await res.json()
      if (data.error) {
        setCustomError(data.error)
      } else {
        onConceptChange(data)
        setCustomInput("")
      }
    } catch {
      setCustomError("Couldn't generate that concept. Try a different topic.")
    }
    setCustomLoading(false)
  }

  useEffect(() => {
    if (initialConcept && initialConcept.trim().length >= 3) {
      handleCustomConcept(initialConcept)
    }
  }, [])

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <svg width="18" height="24" viewBox="0 0 18 24" fill="none" style={{ flexShrink: 0 }}>
              <rect x="1" y="2" width="6" height="16" rx="3" fill="var(--accent)" transform="rotate(-6 1 2)" />
              <rect x="11" y="2" width="6" height="16" rx="3" fill="var(--accent)" transform="rotate(6 11 2)" />
            </svg>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em" }}>RABBIT HOLE</span>
          </div>
          {username && <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.05em" }}>{username}</p>}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, lineHeight: 1.15, fontWeight: 400, marginBottom: "0.75rem" }}>Go deeper.<br /><em>Not wider.</em></h1>
        <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.7, marginBottom: "2.5rem", fontWeight: 300 }}>You read about ideas constantly. This tests whether any of them stuck. One concept. Three levels. Five minutes.</p>
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1rem", borderLeft: "2px solid var(--accent)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>TODAY&apos;S CONCEPT</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: "0.25rem" }}>{concept.title}</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>{concept.teaser}</p>
          {timeLeft && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", marginTop: "0.75rem", letterSpacing: "0.05em" }}>
              NEXT WORD IN {timeLeft.toUpperCase()}
            </p>
          )}
        </div>
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1rem", opacity: 0.6 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>TOMORROW</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: "0.25rem" }}>{tomorrow.title}</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>{tomorrow.teaser}</p>
        </div>
        <button className="btn btn-fill" onClick={onStart} style={{ marginBottom: "0.75rem" }}>Start</button>
        <TodayLeaderboardPreview username={username} onSeeAll={onLeaderboard} />
        <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: "0.4rem", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>WANT TO GO DEEP ON SOMETHING SPECIFIC?</p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <input
            type="text"
            value={customInput}
            onChange={e => { setCustomInput(e.target.value); setCustomError("") }}
            onKeyDown={e => e.key === "Enter" && handleCustomConcept()}
            placeholder="e.g. the French Revolution, black holes, stoicism..."
            style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontSize: 14, padding: "0.75rem 1rem", outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <button
            onClick={() => handleCustomConcept()}
            disabled={customLoading || customInput.trim().length < 3}
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", color: "var(--text-2)", fontSize: 13, padding: "0.75rem 1rem", cursor: customInput.trim().length >= 3 && !customLoading ? "pointer" : "not-allowed", whiteSpace: "nowrap", fontFamily: "inherit", opacity: customInput.trim().length < 3 ? 0.45 : 1, transition: "opacity 0.15s" }}
          >
            {customLoading ? "Generating..." : "Go deep on this"}
          </button>
        </div>
        {customError && <p style={{ fontSize: 12, color: "var(--red)", marginTop: "0.35rem" }}>{customError}</p>}
      </div>
      {stats.gamesPlayed > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "2rem" }}>
          {[{ label: "Streak", val: `${stats.streak}d` }, { label: "Best", val: `${stats.bestScore}` }, { label: "Played", val: `${stats.gamesPlayed}` }].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "0.75rem", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{s.val}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.05em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: "1.5rem" }}>made by @jarrishan</p>
    </div>
  )
}

function ExtendScreen({ onFinish, onExtend }: { onFinish: () => void; onExtend: () => void }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5rem" }}>
      <div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: "1rem" }}>LEVEL 3 COMPLETE</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, lineHeight: 1.2, marginBottom: "0.75rem" }}>You&apos;ve gone deep.</h2>
        <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.7, fontWeight: 300 }}>Want to go further? Two more levels await — edge cases and synthesis.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button className="btn btn-fill" onClick={onExtend}>Go deeper →</button>
        <button className="btn" onClick={onFinish}>See my results</button>
      </div>
    </div>
  )
}

function ResultsScreen({ concept, pct, total, feedbacks, scores, answers, nodeLabels, debrief, debriefLoading, rank, onReset, onLeaderboard }: any) {
  const [copied, setCopied] = useState(false)
  const [exploreInput, setExploreInput] = useState("")
  const [exploreError, setExploreError] = useState("")

  const medal = pct >= 80 ? "deep thinker" : pct >= 60 ? "going deep" : pct >= 40 ? "getting there" : "just started"

  const shareText = () => {
    return `Rabbit Hole — go beyond the surface.\nI got ${pct}/100 on today's concept 🐇\nTry it: rabbit-hole-rust.vercel.app`
  }

  function copy() {
    navigator.clipboard.writeText(shareText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>COMPLETE</p>
      <ConceptMap feedbacks={feedbacks} nodeLabels={nodeLabels} currentLevel={scores.length} answers={answers} totalLevels={scores.length >= 5 ? 5 : 3} />
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 72, lineHeight: 1, color: "var(--accent)" }}>{pct}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", marginTop: "0.25rem", letterSpacing: "0.06em" }}>
          DEPTH SCORE · {total} / {scores.length >= 5 ? 50 : 30} · {medal.toUpperCase()}
        </div>
        {rank !== null && rank !== undefined && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--teal)", marginTop: "0.35rem", letterSpacing: "0.06em" }}>
            {rank <= 10 ? `YOU RANKED #${rank} TODAY ON ${concept.title.toUpperCase()}` : "ONE OF THE FIRST TO PLAY TODAY"}
          </div>
        )}
        <button onClick={onLeaderboard} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", marginTop: "0.5rem", textDecoration: "underline" }}>
          SEE LEADERBOARD →
        </button>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1rem" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>WHAT YOU LEARNED</p>
        {debriefLoading ? (
          <div style={{ display: "flex", gap: 4, padding: "0.5rem 0" }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", animation: "shimmer 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{debrief || "Complete the game to see your debrief."}</p>
        )}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>BREAKDOWN</p>
        {feedbacks.map((f: FeedbackResult, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: i < feedbacks.length - 1 ? "1px solid var(--border)" : "none", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.05em" }}>{LEVEL_LABELS[i].toUpperCase()}</div>
              <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>{f.label}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 48, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(scores[i] / 10) * 100}%`, background: f.class === "good" ? "var(--teal-mid)" : f.class === "shallow" ? "var(--red)" : "var(--amber)", borderRadius: 2 }} />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: f.class === "good" ? "var(--teal)" : f.class === "shallow" ? "var(--red)" : "var(--text)", minWidth: 28, textAlign: "right" }}>{scores[i]}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-2)", lineHeight: 1.8, marginBottom: "0.5rem", whiteSpace: "pre-wrap" }}>{shareText()}</div>
      <p style={{ fontSize: 12, color: "var(--teal)", marginBottom: "1rem", textAlign: "center" }}>
        <a href="https://rabbit-hole-rust.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal)", textDecoration: "none" }}>Play at rabbit-hole-rust.vercel.app</a>
      </p>
      <button className="btn btn-fill" onClick={copy} style={{ marginBottom: "0.75rem" }}>{copied ? "Copied!" : "Copy result"}</button>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem", marginBottom: "0.75rem" }}>
        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
          Curious about something specific? Go deep on it.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <input
            type="text"
            value={exploreInput}
            onChange={e => { setExploreInput(e.target.value); setExploreError("") }}
            onKeyDown={e => e.key === "Enter" && exploreInput.trim().length >= 3 && onReset(exploreInput.trim())}
            placeholder="Type a concept..."
            style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontSize: 14, padding: "0.65rem 0.875rem", outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <button
            onClick={() => exploreInput.trim().length >= 3 && onReset(exploreInput.trim())}
            disabled={exploreInput.trim().length < 3}
            style={{ background: "var(--bg)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", color: "var(--text-2)", fontSize: 13, padding: "0.65rem 0.875rem", cursor: exploreInput.trim().length >= 3 ? "pointer" : "not-allowed", whiteSpace: "nowrap", fontFamily: "inherit", opacity: exploreInput.trim().length < 3 ? 0.45 : 1, transition: "opacity 0.15s" }}
          >
            Go deep on this
          </button>
        </div>
        {exploreError && <p style={{ fontSize: 12, color: "var(--red)", marginTop: "0.35rem" }}>{exploreError}</p>}
      </div>

      <button className="btn" onClick={() => onReset()} style={{ marginBottom: "1.5rem" }}>Back to home</button>
    </div>
  )
}

function LeaderboardScreen({ username, onBack }: { username: string; onBack: () => void }) {
  const [tab, setTab] = useState<"today" | "alltime">("today")
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    load()
  }, [tab])

  async function load() {
    setLoading(true)
    if (tab === "today") {
      const { data } = await supabase
        .from("scores")
        .select("username, concept, score")
        .eq("date", today)
        .order("score", { ascending: false })
        .limit(20)
      setRows(data ?? [])
    } else {
      const { data } = await supabase
        .from("scores")
        .select("username, concept, score")
        .order("score", { ascending: false })
        .limit(20)
      setRows(data ?? [])
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem", minHeight: "100dvh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em" }}>LEADERBOARD</p>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.05em" }}>← BACK</button>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {(["today", "alltime"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab === t ? "var(--surface)" : "none", border: `1px solid ${tab === t ? "var(--border-strong)" : "var(--border)"}`, borderRadius: "var(--radius)", color: tab === t ? "var(--text)" : "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 11, padding: "0.5rem", cursor: "pointer", letterSpacing: "0.06em", transition: "all 0.15s" }}>
            {t === "today" ? "TODAY" : "ALL TIME"}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "2rem 0" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", animation: "shimmer 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
        </div>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-3)", textAlign: "center", padding: "2rem 0" }}>No scores yet{tab === "today" ? " today" : ""}.</p>
      ) : (
        <div>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0.75rem", borderBottom: "1px solid var(--border)", borderLeft: row.username === username ? "2px solid var(--teal-mid)" : "2px solid transparent", background: row.username === username ? "var(--surface)" : "none" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", minWidth: "1.5rem" }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: row.username === username ? "var(--teal)" : "var(--text)", fontWeight: row.username === username ? 500 : 400 }}>{row.username}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "0.5rem" }}>{row.concept}</span>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text)" }}>{row.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionText({ text }: { text: string }) {
  const [activeTerm, setActiveTerm] = useState<string | null>(null)
  const [def, setDef] = useState("")
  const [defLoading, setDefLoading] = useState(false)
  const tooltipRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!activeTerm) return
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setActiveTerm(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [activeTerm])

  async function handleTermClick(e: React.MouseEvent, term: string) {
    e.stopPropagation()
    if (activeTerm === term) { setActiveTerm(null); return }
    setActiveTerm(term); setDef(""); setDefLoading(true)
    try {
      const res = await fetch("/api/define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term })
      })
      const data = await res.json()
      setDef(data.definition || "Definition unavailable.")
    } catch {
      setDef("Definition unavailable.")
    }
    setDefLoading(false)
  }

  // Parse [term] syntax
  const parts: { type: "text" | "term"; value: string }[] = []
  const regex = /\[([^\]]+)\]/g
  let last = 0, match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) })
    parts.push({ type: "term", value: match[1] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) })

  if (parts.length === 1 && parts[0].type === "text") {
    return <BoldFirstWord text={text} />
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return i === 0 ? <BoldFirstWord key={i} text={part.value} /> : <span key={i}>{part.value}</span>
        }
        return (
          <span key={i} style={{ position: "relative", display: "inline" }}>
            <button
              onClick={(e) => handleTermClick(e, part.value)}
              style={{ background: "none", border: "none", padding: 0, color: "var(--teal)", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "inherit", textDecoration: "underline dotted", textDecorationColor: "var(--teal-mid)", textUnderlineOffset: "3px" }}
            >
              {part.value}
            </button>
            {activeTerm === part.value && (
              <span ref={tooltipRef} style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 220, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem", fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, zIndex: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", display: "block" }}>
                {defLoading ? "…" : def}
              </span>
            )}
          </span>
        )
      })}
    </>
  )
}

function PreviousAnswerCard({ answer, label }: { answer: string; label: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.4rem" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", flexShrink: 0, paddingTop: "0.05rem" }}>{label.toUpperCase()}</span>
      <span style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.4, overflow: expanded ? "visible" : "hidden", whiteSpace: expanded ? "normal" : "nowrap", textOverflow: expanded ? "unset" : "ellipsis", flex: 1, minWidth: 0 }}>
        {answer}
      </span>
      <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "var(--font-mono)", flexShrink: 0, lineHeight: 1 }}>
        {expanded ? "↑" : "↓"}
      </button>
    </div>
  )
}

function BoldFirstWord({ text }: { text: string }) {
  const i = text.indexOf(" ")
  if (i === -1) return <>{text}</>
  return <><strong style={{ fontWeight: 600 }}>{text.slice(0, i)}</strong>{text.slice(i)}</>
}

function ConceptMap({ feedbacks, nodeLabels, currentLevel, answers, totalLevels = 3 }: {
  feedbacks: FeedbackResult[]
  nodeLabels: string[]
  currentLevel: number
  answers: string[]
  totalLevels?: number
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const VW = 480, VH = totalLevels >= 5 ? 220 : 140
  const NODE_W = 220, NODE_H = 32, NODE_RX = 6
  const CX = VW / 2
  const NODE_X = CX - NODE_W / 2
  const SPACING = 44
  const NY = Array.from({ length: totalLevels }, (_, i) => 8 + i * SPACING)

  function fills(fb: FeedbackResult | undefined, isCurrent: boolean) {
    if (!fb) return { fill: "var(--surface)", stroke: isCurrent ? "var(--border-strong)" : "var(--border)", textFill: "var(--text-3)", dash: isCurrent ? undefined : "4 3" }
    if (fb.class === "good") return { fill: "var(--teal-light)", stroke: "var(--teal-mid)", textFill: "var(--teal)", dash: undefined }
    if (fb.class === "ok") return { fill: "var(--amber-light)", stroke: "var(--amber)", textFill: "var(--amber)", dash: undefined }
    return { fill: "var(--red-light)", stroke: "var(--red)", textFill: "var(--red)", dash: undefined }
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", display: "block" }}>
        {Array.from({ length: totalLevels - 1 }, (_, i) => (
          <line key={i} x1={CX} y1={NY[i] + NODE_H} x2={CX} y2={NY[i + 1]}
            style={{ stroke: feedbacks.length > i + 1 ? "var(--teal-mid)" : "var(--border)", strokeWidth: 2, strokeDasharray: feedbacks.length > i + 1 ? undefined : "4 3", transition: "stroke 0.4s ease" }}
          />
        ))}
        {Array.from({ length: totalLevels }, (_, i) => {
          const fb = feedbacks[i]
          const answered = !!fb
          const isCurrent = i === currentLevel && !answered
          const f = fills(fb, isCurrent)
          const raw = answered ? (nodeLabels[i] || fb.label) : LEVEL_LABELS[i]
          const text = raw.length > 28 ? raw.substring(0, 26) + "…" : raw
          return (
            <g key={i} onClick={() => { if (answered) setExpanded(expanded === i ? null : i) }} style={{ cursor: answered ? "pointer" : "default" }}>
              <rect x={NODE_X} y={NY[i]} width={NODE_W} height={NODE_H} rx={NODE_RX}
                style={{ fill: f.fill, stroke: f.stroke, strokeWidth: 1.5, strokeDasharray: f.dash, transition: "fill 0.4s ease, stroke 0.4s ease" }}
              />
              <text x={CX} y={NY[i] + NODE_H / 2} textAnchor="middle" dominantBaseline="central"
                style={{ fill: f.textFill, fontSize: answered ? 11 : 10, fontFamily: "var(--font-mono)", letterSpacing: answered ? "0.02em" : "0.06em", pointerEvents: "none" }}>
                {text}
              </text>
            </g>
          )
        })}
      </svg>
      {expanded !== null && answers[expanded] && (
        <div className="fade-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", marginTop: "0.25rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>{LEVEL_LABELS[expanded].toUpperCase()}</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{answers[expanded]}</p>
        </div>
      )}
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
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: c.label, letterSpacing: "0.06em", marginBottom: "0.4rem" }}>{result.label.toUpperCase()} · {result.score} / 10</div>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.6 }}>{result.feedback}</div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "var(--text-3)", fontSize: 14 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", animation: "shimmer 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
      </div>
      Judging your depth...
    </div>
  )
}
