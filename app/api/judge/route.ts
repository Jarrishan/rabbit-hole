import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { concept, level, question, answer, nextQuestionTemplate } = await req.json()

  const nextQSection = level < 3 && nextQuestionTemplate
    ? `\n\nAlso generate a personalized version of the next question that builds directly on what the player just said. The template is:\n"${nextQuestionTemplate}"\nRewrite it to reference something specific from their answer while targeting the same depth level. Store it in the "nextQuestion" field.`
    : ""

  const prompt = `You are a warm, encouraging mentor judging a player's answer in a depth-of-understanding game called Rabbit Hole.

Concept: ${concept}
Level: ${level} of 3 (level 1 = surface definition, level 3 = deep synthesis)
Question: ${question}
Player's answer: ${answer}

Score the answer from 1–10 based on depth, accuracy, and insight for this level. Keep the scoring strict, but your language warm and encouraging.

Tone rules:
- Always acknowledge what the player got right before noting what's missing
- Never say an answer is wrong — say "you're close" or "you've got the surface, now go one level deeper"
- For scores of 8+, be genuinely enthusiastic — tell them they've nailed something real
- For scores of 4 and below, be gentle: find the grain of truth in what they said before pushing further

Score guide:
- 8–10: Shows genuine understanding, not just pattern-matching
- 5–7: Adequate but surface-level or missing key insight
- 1–4: Shallow, vague, or just restating the question
${nextQSection}

Respond with ONLY valid JSON in this exact shape:
{
  "score": <number 1-10>,
  "class": <"good" if score>=8, "ok" if score>=5, "shallow" if score<5>,
  "label": <a 2-4 word warm verdict, e.g. "Sharp thinking" or "Almost there">,
  "feedback": <1-2 sentences: acknowledge what they got right, then gently note what's missing>,
  "insight": <one sentence starting with "The key insight here is..." — what a deeper answer would have included. Encouraging, like a mentor revealing something, not a teacher marking you wrong.>,
  "nodeLabel": <a 3-5 word phrase in the player's own words that captures their core insight>${level < 3 && nextQuestionTemplate ? `,
  "nextQuestion": <personalized version of the next question referencing something specific from the player's answer>` : ""}
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }]
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}")
    return NextResponse.json(json)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ score: 5, class: "ok", label: "Noted", feedback: "Answer recorded.", insight: "", nodeLabel: "Answer recorded" })
  }
}
