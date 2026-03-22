import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { concept, answers } = await req.json()

  const numbered = (answers as string[])
    .map((a, i) => `Level ${i + 1}: ${a}`)
    .join("\n")

  const prompt = `A player is working through a depth game about "${concept}". Here are their answers so far:\n\n${numbered}\n\nWrite ONE warm, specific sentence (max 20 words) summarising what they understand so far. Start with "So far you understand that..." or similar. Reference what they actually said, not just generic praise.`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }]
    })
    const text = message.content[0].type === "text" ? message.content[0].text : ""
    return NextResponse.json({ story: text.trim() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ story: "" })
  }
}
