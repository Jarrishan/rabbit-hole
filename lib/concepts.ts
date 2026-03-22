export interface Concept {
  title: string
  teaser: string
  hook?: string
  questions: string[]
}

export const CONCEPTS: Concept[] = [
  {
    title: "Compound interest",
    teaser: "Why patience is the most underrated financial strategy",
    questions: [
      "What is compound interest? Explain it in your own words.",
      "Why does compound interest grow faster than simple interest over time?",
      "What's the mathematical mechanism that makes compounding so powerful?",
      "Why do small differences in interest rate lead to massive differences in outcome over decades?",
      "How does compounding relate to exponential growth, and where else does this pattern appear in the world?"
    ]
  },
  {
    title: "Natural selection",
    teaser: "How life edits itself without a plan",
    questions: [
      "What is natural selection? Explain it in your own words.",
      "Why do traits that help survival get passed on more than others?",
      "What's the mechanism that connects a trait to whether it spreads through a population?",
      "Why doesn't natural selection produce perfect organisms?",
      "How does natural selection explain the existence of cooperation and altruism?"
    ]
  },
  {
    title: "Supply and demand",
    teaser: "The invisible force shaping every price you've ever paid",
    questions: [
      "What is supply and demand? Explain it in your own words.",
      "Why does price tend to move toward the point where supply and demand balance?",
      "What happens when something disrupts that balance — like a sudden shortage?",
      "Why do some goods behave differently — where higher prices don't reduce demand?",
      "How does supply and demand explain why identical goods cost different amounts in different places?"
    ]
  },
  {
    title: "The placebo effect",
    teaser: "When belief becomes biology",
    questions: [
      "What is the placebo effect? Explain it in your own words.",
      "Why would a fake treatment produce real physical changes in the body?",
      "What's happening neurologically when a placebo works?",
      "Why does knowing something is a placebo sometimes still work?",
      "What does the placebo effect tell us about the relationship between belief and biology?"
    ]
  },
  {
    title: "Why cities exist",
    teaser: "The oldest hack for making humans more productive",
    questions: [
      "Why do cities exist? What basic need do they serve?",
      "Why do people keep moving to cities even when they're expensive and crowded?",
      "What economic forces make cities more productive than rural areas per person?",
      "Why do certain cities become dominant in an industry while others don't?",
      "How does proximity of strangers produce innovation — and why is this hard to replicate online?"
    ]
  },
  {
    title: "How memory works",
    teaser: "Why your past is less reliable than you think",
    questions: [
      "How does memory work? Explain it in your own words.",
      "Why do we remember some things vividly and forget others completely?",
      "What's happening physically in the brain when a memory forms?",
      "Why is sleep so important for memory — what's actually happening?",
      "Why are memories reconstructive rather than recordings, and what does this mean for how much we can trust them?"
    ]
  },
  {
    title: "Why laws exist",
    teaser: "The social technology that makes strangers cooperate",
    questions: [
      "Why do laws exist? Explain it in your own words.",
      "Why can't societies just rely on people being naturally good — why do we need formal rules?",
      "What makes a law legitimate — why should anyone follow it?",
      "Why do laws differ so much between societies that share similar values?",
      "How does the existence of law change people's behaviour even when they're not being watched?"
    ]
  },
  {
    title: "Inflation",
    teaser: "How money quietly loses its meaning",
    questions: [
      "What is inflation? Explain it in your own words.",
      "Why does more money in circulation tend to push prices up?",
      "Why is a small amount of inflation generally considered healthy by economists?",
      "Why is inflation hard to control once it gets going?",
      "How does inflation redistribute wealth — who wins and who loses, and why?"
    ]
  },
  {
    title: "The immune system",
    teaser: "Your body's standing army that never sleeps",
    questions: [
      "What does the immune system actually do? Explain it simply.",
      "How does your body tell the difference between its own cells and foreign invaders?",
      "What's happening mechanically when your immune system mounts a response?",
      "Why does the immune system sometimes attack the body it's supposed to protect?",
      "How do vaccines exploit the immune system's logic — and why does that logic work?"
    ]
  },
  {
    title: "Entropy",
    teaser: "Why everything tends toward disorder",
    questions: [
      "What is entropy? Explain it in your own words.",
      "Why do things naturally move from order to disorder and not the other way?",
      "What's happening at the molecular level when entropy increases?",
      "Why does entropy have an arrow — why does time only move forward?",
      "How does entropy connect to information, and what does that reveal about the nature of order itself?"
    ]
  },
  {
    title: "Network effects",
    teaser: "Why the biggest platforms keep getting bigger",
    questions: [
      "What is a network effect? Explain it in your own words.",
      "Why does a product with network effects become more valuable as more people use it?",
      "What's the mechanism that makes it so hard to displace a product with strong network effects?",
      "Why do network effects tend to produce winner-take-all markets?",
      "How do network effects explain the rise and fall of social platforms over time?"
    ]
  },
  {
    title: "Game theory",
    teaser: "The math of decisions when others are deciding too",
    questions: [
      "What is game theory? Explain it in your own words.",
      "What is the Prisoner's Dilemma, and why does it matter?",
      "Why do rational individuals often produce collectively bad outcomes?",
      "How does repeated play change the incentives in a game — and why?",
      "Where does game theory break down, and what does that tell us about human behaviour?"
    ]
  }
]

function getUKDateAt930(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  }).formatToParts(now)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)!.value)
  let year = get('year'), month = get('month'), day = get('day')
  const hour = get('hour'), minute = get('minute')
  // Before 9:30 UK = still on yesterday's concept
  if (hour < 9 || (hour === 9 && minute < 30)) {
    const prev = new Date(Date.UTC(year, month - 1, day - 1))
    year = prev.getUTCFullYear(); month = prev.getUTCMonth() + 1; day = prev.getUTCDate()
  }
  return { year, month, day }
}

export function getTodayConcept(): Concept {
  const { year, month, day } = getUKDateAt930(new Date())
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000)
  return CONCEPTS[dayNumber % CONCEPTS.length]
}

export function getNextRefreshTime(): Date {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  }).formatToParts(now)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)!.value)
  const ukHour = get('hour'), ukMinute = get('minute')
  let year = get('year'), month = get('month'), day = get('day')
  // If already past 9:30, next refresh is tomorrow
  if (ukHour > 9 || (ukHour === 9 && ukMinute >= 30)) {
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    year = next.getUTCFullYear(); month = next.getUTCMonth() + 1; day = next.getUTCDate()
  }
  // Find UTC offset for target date by checking noon UTC on that day
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const ukNoonHour = parseInt(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', hour12: false
  }).format(noonUTC))
  const offsetHours = ukNoonHour - 12 // 0 for GMT, 1 for BST
  return new Date(Date.UTC(year, month - 1, day, 9 - offsetHours, 30, 0))
}

export const LEVEL_LABELS = ["Surface", "Beneath", "Mechanism", "Edge cases", "Synthesis"]

export const LEVEL_HINTS = [
  "Start with what it is",
  "Explain the why behind it",
  "Describe the actual mechanism",
  "Find where it breaks or surprises",
  "Connect it to something bigger"
]