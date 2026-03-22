import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { concept, level, question, answer } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "No API key" }, { status: 500 })
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `You are a depth judge for a learning game called Rabbit Hole. Players answer questions about a concept at increasing levels of depth.

Level 1 = surface definition. Level 5 = deep mechanistic insight and cross-domain connection.

Evaluate the player's answer. Be honest but encouraging. Return ONLY valid JSON:
{"score": <integer 1-10>, "class": <"good"|"ok"|"shallow">, "label": <2-4 word label>, "feedback": <1-2 sentence honest feedback>}

Score guide:
- 8-10: genuine insight, mechanistic understanding, goes beyond surface ("good")
- 5-7: correct but surface-level, could go deeper ("ok")
- 1-4: vague, restates the question, or wrong ("shallow")

Be strict. Only give 8+ for real understanding. Short or vague answers should score low.`,
      messages: [{
        role: "user",
        content: `Concept: ${concept}\nLevel: ${level}/5\nQuestion: ${question}\nAnswer: ${answer}`
      }]
    })
  })

  const data = await res.json()
  const raw = data.content?.[0]?.text || ""
  const clean = raw.replace(/```json|```/g, "").trim()

  try {
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ score: 5, class: "ok", label: "Noted", feedback: "Answer recorded." })
  }
}