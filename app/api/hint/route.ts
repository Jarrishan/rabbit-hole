import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { concept, level, question, answer, score } = await req.json()

  const prompt = `Concept: ${concept}
Level: ${level} of 3
Question: ${question}
Player's answer: ${answer}
Score: ${score}/10

Give one hint — a single sentence pointing to the most important idea they haven't mentioned yet. Do not give the answer. Do not repeat what they already said. Frame it as "You haven't mentioned..." or "Consider thinking about...". Max 20 words.`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system: "You are a coach for a learning game. The player has just answered a question and received their score. Give them one hint — a single sentence pointing to the most important idea they haven't mentioned yet. Do not give the answer. Do not repeat what they already said. Frame it as \"You haven't mentioned...\" or \"Consider thinking about...\". Max 20 words.",
      messages: [{ role: "user", content: prompt }]
    })
    const hint = message.content[0].type === "text" ? message.content[0].text.trim() : ""
    return NextResponse.json({ hint })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ hint: "" })
  }
}
