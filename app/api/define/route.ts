import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { term } = await req.json()
  if (!term) return NextResponse.json({ definition: "" })

  const prompt = `Define "${term}" in one plain-English sentence. No jargon. Max 20 words. Write it like you're explaining to a curious non-expert.`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [{ role: "user", content: prompt }]
    })
    const text = message.content[0].type === "text" ? message.content[0].text : ""
    return NextResponse.json({ definition: text.trim() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ definition: "Definition unavailable." })
  }
}
