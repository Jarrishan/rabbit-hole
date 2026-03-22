import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { concept, questions, answers, scores } = await req.json()

  const qa = questions.map((q: string, i: number) =>
    `Level ${i + 1}: ${q}\nAnswer: ${answers[i] ?? "(no answer)"}\nScore: ${scores[i] ?? 0}/10`
  ).join("\n\n")

  const total = scores.reduce((a: number, b: number) => a + b, 0)
  const pct = Math.round((total / 50) * 100)

  const prompt = `A player just completed a depth-of-understanding game about "${concept}". They scored ${pct}/100.

Here are their questions, answers, and scores:

${qa}

Write a short, sharp debrief (3–5 sentences) that:
1. Identifies what they genuinely understood
2. Points out where their thinking was shallow or missed something important
3. Leaves them with one insight they didn't get from their own answers

Be honest, not encouraging. Don't pad it. Write it as plain prose — no bullet points, no headers.`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }]
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    return NextResponse.json({ debrief: text.trim() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ debrief: "" })
  }
}
