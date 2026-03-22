import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Cache by date so the concept stays consistent all day
const cache = new Map<string, object>()

export async function GET() {
  const today = new Date().toISOString().split("T")[0]

  if (cache.has(today)) {
    return NextResponse.json(cache.get(today))
  }

  const prompt = `Generate a daily concept for a depth-of-understanding game called Rabbit Hole.

The concept should be:
- A single idea, mental model, or phenomenon (not a person or place)
- Intellectually interesting and broadly applicable
- Something that rewards deep thinking (economics, psychology, physics, philosophy, biology, etc.)
- Different from: Compound Interest, Supply and Demand, Natural Selection, Sunk Cost Fallacy, Second-Order Effects, Opportunity Cost, Entropy

Generate 5 questions that progressively go deeper, one per level:
- Level 1 (Surface): Ask for a basic definition
- Level 2 (Mechanism): Ask how/why it actually works at a deeper level
- Level 3 (Paradox): Ask about something counterintuitive or surprising about it
- Level 4 (Transfer): Ask how it applies in a completely different domain
- Level 5 (Synthesis): Ask a big-picture question connecting it to broader ideas

Respond with ONLY valid JSON in this exact shape:
{
  "title": "Concept Name",
  "teaser": "A single evocative sentence about why this concept matters.",
  "questions": [
    "Level 1 question?",
    "Level 2 question?",
    "Level 3 question?",
    "Level 4 question?",
    "Level 5 question?"
  ]
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }]
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}")
    cache.set(today, json)
    return NextResponse.json(json)
  } catch (err) {
    console.error(err)
    // Fallback concept if generation fails
    const fallback = {
      title: "Feedback Loops",
      teaser: "The hidden mechanism that makes systems either stabilize or spiral.",
      questions: [
        "What is a feedback loop?",
        "What is the difference between a positive and negative feedback loop, and why are those names counterintuitive?",
        "Why do feedback loops make complex systems so hard to control, even when you understand them?",
        "How do feedback loops show up in social behavior, markets, or relationships?",
        "If most complex systems are governed by feedback loops, what does that imply about our ability to predict or steer them?"
      ]
    }
    cache.set(today, fallback)
    return NextResponse.json(fallback)
  }
}
