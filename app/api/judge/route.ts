import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { concept, level, question, answer, nextQuestionTemplate } = await req.json()

  const nextQSection = level < 3 && nextQuestionTemplate
    ? `\n\nAlso generate a personalized version of the next question that builds directly on what the player just said. The template is:\n"${nextQuestionTemplate}"\nRewrite it to reference something specific from their answer while targeting the same depth level. Match the player's level of complexity — do not exceed it. If they answered simply, ask simply. If they answered mathematically, stay in that register but do not go deeper into mathematics than they demonstrated. The next question should feel like a natural extension of what they just said — make them think "oh yes, and what about..." not "I have no idea what this is asking." Store it in the "nextQuestion" field.`
    : ""

  const prompt = `You are judging a player's answer in a depth-of-understanding game called Rabbit Hole. Your tone is like a brilliant friend who happens to know a lot — not an examiner, not a teacher marking papers.

Concept: ${concept}
Level: ${level} of 3 (level 1 = surface definition, level 3 = deep synthesis)
Question: ${question}
Player's answer: ${answer}

Score the answer from 1–10 based on depth, accuracy, and insight for this level.

Important: reward unconventional but correct approaches. A mathematical answer, a metaphor, a real-world example, or an analogy can all demonstrate deep understanding — sometimes more than a textbook definition. Do not penalise players for approaching the concept from an unexpected angle if their reasoning is sound. Judge the depth of understanding, not the format of the answer.

Tone by score:
- 9–10: The player has demonstrated genuine insight. Be enthusiastic and specific about what they got right. Tell them exactly what made their answer strong.
- 7–8: Acknowledge what they got right first, then point to the one thing that would have pushed them higher. Make that ceiling feel reachable, not arbitrary.
- 5–6: Find the strongest part of their answer and build from there. Never make them feel stupid — make them feel close.
- 1–4: Be honest but kind. Find something valid in what they wrote, even if small, before noting what's missing.

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
