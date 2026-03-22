export interface Concept {
  title: string
  teaser: string
  hook: string
  questions: [string, string, string, string, string]
}

export const CONCEPTS: Concept[] = [
  {
    title: "Compound Interest",
    teaser: "Why small gains compounding silently become everything.",
    hook: "The most powerful force in finance is one most people understand perfectly and still fail to use.",
    questions: [
      "How does money grow on itself — what's actually happening?",
      "Why does the rate matter so much more than the starting amount?",
      "What's actually different about year 40 versus year 4?",
      "Why do most people end up paying it rather than earning it?",
      "Where else do you see this kind of snowballing outside of finance?"
    ]
  },
  {
    title: "Natural Selection",
    teaser: "The blind process that built every living thing you've ever seen.",
    hook: "Evolution doesn't care about your survival, your happiness, or how long you live — only about one very specific thing.",
    questions: [
      "How does evolution happen without anyone steering it?",
      "Why does random variation produce something that looks designed?",
      "Why did peacocks evolve tails that make them easier to catch?",
      "What problems can natural selection simply never fix?",
      "Where do you see selection pressure outside of biology?"
    ]
  },
  {
    title: "Supply and Demand",
    teaser: "The invisible force that sets every price you've ever paid.",
    hook: "Every price you've ever paid was set by people who had no idea what the thing was worth to you — and yet it was usually close enough that you paid it.",
    questions: [
      "Who actually sets prices — and how does that happen?",
      "What actually happens step by step when more people want the same thing?",
      "Why does [rent control] usually make housing harder to find?",
      "When do markets fail to price things correctly?",
      "Where do supply and demand dynamics show up outside of markets?"
    ]
  },
  {
    title: "The Placebo Effect",
    teaser: "The mind healing the body through belief alone — and why that's stranger than it sounds.",
    hook: "Your brain can produce measurable physical healing from a sugar pill — sometimes even when you know it's a sugar pill.",
    questions: [
      "How does a sugar pill produce real physical change?",
      "What's actually happening in the body when a placebo works?",
      "Why does a fancier treatment work better than a plain one?",
      "Does it still work if you know it's a placebo?",
      "Where else does expectation produce real, measurable change?"
    ]
  },
  {
    title: "Why Cities Exist",
    teaser: "Why do millions of people choose to live packed together on expensive land?",
    hook: "The most expensive square metre of land on earth is in Tokyo, where millions compete to live in tiny apartments — and they're not being irrational.",
    questions: [
      "Why do people crowd into expensive cities when remote work exists?",
      "Why does being around other skilled people make you better at your job?",
      "Why do film, finance, and tech still cluster in specific cities?",
      "Is unaffordable housing inevitable in productive cities, or is it fixable?",
      "Where do you see [agglomeration effects] outside physical cities?"
    ]
  },
  {
    title: "How Memory Works",
    teaser: "Your memory is not a recording. It's a story you keep rewriting.",
    hook: "Every time you access a memory, you change it — which means the memories you've revisited most are the least reliable.",
    questions: [
      "Is memory more like a recording, or something more fragile?",
      "Why do you reconstruct a memory rather than simply replay it?",
      "How can a vivid, certain memory be completely wrong?",
      "Why is eyewitness testimony so unreliable under stress?",
      "If memory is fallible, in what sense are you the same person you were?"
    ]
  },
  {
    title: "Why Laws Exist",
    teaser: "Rules that almost everyone follows, enforced by people who can't watch everyone.",
    hook: "Most people obey laws they disagree with, in situations where they'd never get caught breaking them. The interesting question isn't why people break the law — it's why almost everyone doesn't.",
    questions: [
      "What do laws actually do that social norms alone can't?",
      "How does law create trust between strangers who'll never meet again?",
      "What happens when laws exist but enforcement is corrupt or absent?",
      "When laws and moral beliefs conflict, which shapes behaviour more?",
      "Where do law-like structures appear outside formal legal systems?"
    ]
  },
  {
    title: "Inflation",
    teaser: "Why the money in your pocket is worth less every year — and who decides by how much.",
    hook: "Governments can transfer wealth from savers to borrowers without a vote, without a transaction, and without most people noticing it's happening.",
    questions: [
      "What is inflation — beyond just things getting more expensive?",
      "Why does printing more money make things cost more?",
      "Who actually wins and who loses when inflation is high?",
      "Why is controlling it so hard even with powerful central banks?",
      "Where do you see inflation-like dynamics outside of economics?"
    ]
  },
  {
    title: "Network Effects",
    teaser: "Why the most valuable things become more valuable the more people use them.",
    hook: "Fax machines were useless until enough people had them — and then suddenly, not having one was the problem.",
    questions: [
      "Why did WhatsApp become valuable only when millions joined?",
      "Why do [network effects] tend to produce one winner rather than many?",
      "Why is it so hard to launch a marketplace with no users on it?",
      "When can strong network effects prevent a product from improving?",
      "Where do you see value that scales with participation outside tech?"
    ]
  },
  {
    title: "Game Theory",
    teaser: "The mathematics of situations where what you should do depends on what others do.",
    hook: "You can find yourself in a situation where the individually rational choice produces the worst possible collective outcome — and knowing this doesn't help you escape it.",
    questions: [
      "What is game theory actually trying to model?",
      "Why do two rational people both end up choosing the worse outcome?",
      "Where is the [prisoner's dilemma] playing out in the real world right now?",
      "Why do real people cooperate far more than game theory predicts?",
      "Where do these dynamics appear outside economics or formal games?"
    ]
  },
  {
    title: "The Immune System",
    teaser: "A war inside your body that never stops, fought by cells that have to tell friend from foe.",
    hook: "Your immune system has to learn to distinguish your own tissue from dangerous invaders — with no teacher, no prior experience, and no room for error in either direction.",
    questions: [
      "How does your immune system tell friend from foe?",
      "How does it learn to recognise threats it has never seen?",
      "Walk me through what happens the week after a vaccination.",
      "What kind of mistake does the immune system make most consistently?",
      "Where do you see self/non-self recognition problems outside biology?"
    ]
  },
  {
    title: "Entropy",
    teaser: "Why everything tends toward disorder — and what that costs.",
    hook: "The laws of physics are almost entirely reversible — a video of most physical events could run backwards and still be valid. Entropy is the one exception that points only one way.",
    questions: [
      "Why does disorder always increase — what's the actual reason?",
      "Why can't a broken egg reassemble itself — what's stopping it?",
      "How does a living cell stay organised without breaking the laws of physics?",
      "You can create local order — what does that always cost?",
      "Where do you see entropy-like dynamics outside of physics?"
    ]
  },
  {
    title: "Opportunity Cost",
    teaser: "Every choice is also all the choices you didn't make.",
    hook: "Every decision is actually two decisions: the one you made, and the best one you gave up. Most people only ever account for one of them.",
    questions: [
      "What's the real cost of a decision beyond what you paid?",
      "Why is opportunity cost invisible in a way that cash costs aren't?",
      "Pick a real decision — show how accounting for it changes the analysis.",
      "When does opportunity cost stop being a useful concept?",
      "Where do you see this trade-off logic outside of money?"
    ]
  },
  {
    title: "Second-Order Effects",
    teaser: "The consequences of the consequences — what you didn't see coming.",
    hook: "Almost every major policy failure of the last century wasn't caused by doing the wrong thing — it was caused by doing the right thing and not thinking about what would happen next.",
    questions: [
      "What are second-order effects — can you give a quick example?",
      "Why do well-intentioned policies so often produce the opposite result?",
      "Give one historical case where ignoring them caused serious harm.",
      "Why is this so hard to apply consistently, even when you know about it?",
      "Where do you see these dynamics outside politics or economics?"
    ]
  }
]

export const LEVEL_LABELS = ["Surface", "Mechanism", "Synthesis", "Edge cases", "Connections"]
export const LEVEL_HINTS = [
  "Start with what it is",
  "Explain why it works",
  "Connect it to something bigger",
  "Find where it breaks",
  "Link it to another domain"
]

export function getTodayConcept(): Concept {
  const epoch = new Date("2024-01-01").getTime()
  const dayIndex = Math.floor((Date.now() - epoch) / 86400000)
  return CONCEPTS[dayIndex % CONCEPTS.length]
}

export function getTomorrowConcept(): Concept {
  const epoch = new Date("2024-01-01").getTime()
  const dayIndex = Math.floor((Date.now() - epoch) / 86400000)
  return CONCEPTS[(dayIndex + 1) % CONCEPTS.length]
}

export function getNextRefreshTime(): Date {
  const now = Date.now()
  const epoch = new Date("2024-01-01").getTime()
  const nextDay = Math.floor((now - epoch) / 86400000) + 1
  return new Date(epoch + nextDay * 86400000)
}
