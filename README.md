# Rabbit Hole 🐇

> Go beyond the surface.

A daily learning game that rewards genuine thinking over shallow recall. One concept per day. Three levels of questions, each pushing you deeper. An AI judge scores your depth honestly.

Live at [rabbit-hole-rust.vercel.app](https://rabbit-hole-rust.vercel.app)

---

## What it is

Most apps reward showing up. Rabbit Hole rewards going deeper.

Every day you get one concept — compound interest, natural selection, game theory. You answer three questions about it, each one harder than the last. The AI doesn't just mark you right or wrong — it judges how deeply you actually understand the *why* behind the concept.

You get a score out of 100. You can share it. You can check the leaderboard. You can come back tomorrow.

---

## How it works

1. Pick a username on first visit
2. Read the hook — one provocative observation about today's concept
3. Answer three questions at increasing depth:
   - **Surface** — what is it?
   - **Mechanism** — why does it work?
   - **Synthesis** — where does it connect to something else?
4. Get scored 1-10 per level by an AI judge
5. See your debrief, share your result, check the leaderboard
6. Optional: extend to 5 levels for edge cases and deeper synthesis

New concept every day at 9:30am UK time.

---

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Supabase** — scores, usernames, leaderboard
- **Anthropic Claude API** — AI judging, hints, debrief, concept generation
- **Vercel** — hosting and deployment

---

## Local setup
```bash
