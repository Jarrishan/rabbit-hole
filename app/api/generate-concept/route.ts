import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { topic } = await req.json()

  if (!topic || topic.trim().length < 3) {
    return NextResponse.json({ error: "Topic is too short." })
  }

  const prompt = `Generate content for a depth-of-understanding game about: "${topic}"

First, decide if this is appropriate. It should be a real concept, idea, or phenomenon. Reject: people's names, fictional characters, places, harmful or offensive topics, or anything too vague to generate five meaningful depth questions about.

If inappropriate or too vague, respond with:
{"error": "<friendly one-sentence explanation of why this doesn't work>"}

If appropriate, generate:
- title: the concept name (clean, concise)
- teaser: one evocative sentence about why this concept matters
- hook: one slightly uncomfortable or surprising sentence that creates genuine curiosity — not a definition, not a fun fact, something that makes you feel the concept matters before you've started
- questions: five questions that progressively deepen understanding:
  - Level 1 (Surface): "How would you explain [concept] to someone who has never encountered it?"
  - Level 2 (Beneath): Ask for the mechanism or engine driving it — why does it actually work?
  - Level 3 (Mechanism): A specific concrete case — go one floor deeper, not sideways
  - Level 4 (Edge Cases): Where does this break down or surprise you? Find the crack in it.
  - Level 5 (Synthesis): Where do you see this exact pattern in a completely different domain?

Respond with ONLY valid JSON:
{
  "title": "...",
  "teaser": "...",
  "hook": "...",
  "questions": ["...", "...", "...", "...", "..."]
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }]
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}")

    if (json.error) {
      return NextResponse.json({ error: json.error })
    }

    if (!Array.isArray(json.questions) || json.questions.length !== 5 || !json.hook) {
      return NextResponse.json({ error: "Couldn't generate questions for that topic. Try something more specific." })
    }

    return NextResponse.json(json)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Something went wrong. Try again." })
  }
}
