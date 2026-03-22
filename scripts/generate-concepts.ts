import Anthropic from "@anthropic-ai/sdk"
import fs from "fs"
import path from "path"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Concept {
  title: string
  teaser: string
  hook: string
  questions: [string, string, string]
  related: string[]
}

const EXISTING_CONCEPTS = [
  "Compound interest", "Natural selection", "Supply and demand",
  "The placebo effect", "Why cities exist", "How memory works",
  "Why laws exist", "Inflation", "Network effects", "Game theory",
  "The immune system", "Entropy", "Opportunity cost", "Second-order effects"
]

const SYSTEM_PROMPT = `You are generating content for a daily learning game called Rabbit Hole. Players go deep on one concept per day across 3 levels.

Rules for concepts:
- Must be genuinely interesting to a curious adult — not too academic, not too trivial
- Should span a wide range of domains: economics, psychology, biology, physics, history, philosophy, technology, sociology, mathematics
- Never repeat a concept already in this list: ${EXISTING_CONCEPTS.join(", ")}
- The hook must be surprising or slightly uncomfortable — not a fun fact, a genuine provocation
- Questions must be short and conversational — max 12 words each, no jargon
- Level 3 question must ask the player to connect the concept to a completely different domain

Return ONLY a valid JSON array of 10 concept objects. No markdown, no preamble, no explanation.`

async function generateBatch(batchNumber: number, previousTitles: string[]): Promise<Concept[]> {
  const avoidList = [...EXISTING_CONCEPTS, ...previousTitles]
  const userPrompt = `Generate 10 new concepts. Do not repeat any of these: ${avoidList.join(", ")}.

Each concept must follow this exact JSON structure:
{
  "title": "Concept name",
  "teaser": "One intriguing line that makes someone want to know more",
  "hook": "One surprising or counterintuitive observation that creates curiosity without giving away the answer",
  "questions": [
    "Level 1 — conversational, 10 words max, asks what it is",
    "Level 2 — asks why it works, references the mechanism",
    "Level 3 — asks where it connects to something outside itself"
  ],
  "related": ["Related concept 1", "Related concept 2"]
}

Return a JSON array of exactly 10 objects.`

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }]
  })

  const text = message.content[0].type === "text" ? message.content[0].text : ""
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error(`Batch ${batchNumber}: no JSON array found in response`)
  return JSON.parse(match[0]) as Concept[]
}

async function main() {
  const allConcepts: Concept[] = []
  const seenTitles: string[] = []

  for (let batch = 1; batch <= 10; batch++) {
    console.log(`Generating batch ${batch}/10...`)
    try {
      const concepts = await generateBatch(batch, seenTitles)
      for (const c of concepts) {
        if (!seenTitles.includes(c.title)) {
          allConcepts.push(c)
          seenTitles.push(c.title)
        }
      }
    } catch (err) {
      console.error(`Batch ${batch} failed:`, err)
    }
  }

  const outputDir = path.join(__dirname, "output")
  fs.mkdirSync(outputDir, { recursive: true })

  // Write JSON
  const jsonPath = path.join(outputDir, "concepts-generated.json")
  fs.writeFileSync(jsonPath, JSON.stringify(allConcepts, null, 2))

  // Write formatted TS
  const tsLines = allConcepts.map(c => `  {
    title: ${JSON.stringify(c.title)},
    teaser: ${JSON.stringify(c.teaser)},
    hook: ${JSON.stringify(c.hook)},
    questions: [
      ${c.questions.map(q => JSON.stringify(q)).join(",\n      ")}
    ]
  }`)

  const tsContent = `import { Concept } from "../lib/concepts"

export const GENERATED_CONCEPTS: Concept[] = [
${tsLines.join(",\n")}
]
`
  const tsPath = path.join(outputDir, "concepts-formatted.ts")
  fs.writeFileSync(tsPath, tsContent)

  console.log(`\nDone. ${allConcepts.length} concepts written to scripts/output/concepts-generated.json`)
  console.log(`TypeScript export written to scripts/output/concepts-formatted.ts`)
}

main().catch(err => { console.error(err); process.exit(1) })
