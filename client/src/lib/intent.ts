// /client/src/lib/intent.ts

// Sanitize user input to prevent prompt injection
export function sanitizeInput(input: string): string {
  // Remove potential prompt injection patterns
  let sanitized = input
    // Remove system-like instructions
    .replace(/\b(system|assistant|user|human|ignore|disregard|forget|override|bypass|instead|pretend|act as|you are|your instructions|new instructions)\b:?/gi, '')
    // Remove markdown code blocks that might contain injection
    .replace(/```[\s\S]*?```/g, '')
    // Remove XML-like tags
    .replace(/<[^>]+>/g, '')
    // Remove excessive special characters
    .replace(/[{}[\]\\|]/g, '')
    // Trim and limit length
    .trim()
    .slice(0, 1000)

  return sanitized || input.slice(0, 1000) // Fallback to truncated original if sanitized is empty
}

export type Intent =
  | 'positive'
  | 'objection_price'
  | 'objection_skepticism'
  | 'objection_info'
  | 'explicit_decline'
  | 'wants_more_free'
  | 'ai_question'
  | 'gibberish'
  | 'inappropriate'
  | 'clarification'
  | 'crisis_safety'
  | 'too_short'
  | 'price_question'
  | 'unknown'

function isGibberish(text: string): boolean {
  const lower = text.toLowerCase().trim()

  // Too short to analyze
  if (lower.length < 4) return false

  // Check for repeated characters (aaaa, sssss)
  if (/(.)\1{3,}/.test(lower)) return true

  // Check for repeated short patterns (asdasdasd, abcabcabc)
  if (/^(.{2,4})\1{2,}/.test(lower)) return true

  // Check for keyboard row mashing (asdf, qwer, zxcv patterns)
  const keyboardPatterns = /^[asdfjkl;]+$|^[qwertyuiop]+$|^[zxcvbnm]+$|^[asdfghjkl]+$/i
  if (lower.length >= 6 && keyboardPatterns.test(lower)) return true

  // Check for alternating patterns that look like mashing (ababab, xyxyxy)
  if (/^(.)(.)(\1\2){2,}/.test(lower)) return true

  // Check for random character sequences with no spaces in long text
  if (lower.length > 10 && !lower.includes(' ')) {
    const vowelRatio = (lower.match(/[aeiou]/g) || []).length / lower.length
    if (vowelRatio < 0.2) return true
  }

  return false
}

export function detectIntent(message: string): Intent {
  const lower = message.toLowerCase().trim()

  // CRITICAL: Check for self-harm/crisis signals FIRST
  if (lower.match(/kill (myself|me)|want to die|suicide|end (my|it all)|hurt myself|self.?harm|don'?t want to (live|be alive)|better off dead/)) {
    return 'crisis_safety'
  }

  // Check for inappropriate/sexual content DIRECTED AT EVELYN or clearly trolling
  // Allow legitimate relationship discussions (wanting passion/intimacy in marriage is valid)
  const directedAtEvelyn = /\b(i want to |let me |can i |show me |send me ).*(fuck|sex|naked|nude|tits|boobs|pussy|dick|cock)|you'?re (hot|sexy)|horny|cum (on|in|for)|blowjob|handjob|masturbat|porn|slut|whore|bitch/i
  if (directedAtEvelyn.test(lower)) {
    return 'inappropriate'
  }

  // Check for gibberish
  if (isGibberish(lower)) {
    return 'gibberish'
  }

  // Check for too-short responses (need context for meaningful Claude responses)
  // Allow simple affirmatives, "don't know" responses, and time-based answers
  const validShortResponses = /^(yes|no|ok|okay|sure|maybe|idk|fine|yeah|yep|nope|nah|no idea|no clue|not sure|i don'?t know|don'?t know|unsure|i'?m not sure|beats me|who knows|hard to say|can'?t say|couldn'?t say)$/i

  // Allow time-based responses (answers to "how long" questions)
  const timeBasedResponse = /^(\d+\s*(years?|months?|weeks?|days?|forever|always|never|a while|long time|my (whole |entire )?life|since|recently|lately|ages|eternity))|\d+$/i

  if (!validShortResponses.test(lower) && !timeBasedResponse.test(lower)) {
    // Single word responses that aren't valid need more detail
    if (lower.length < 15 && !lower.includes(' ')) {
      return 'too_short'
    }
    // Very short multi-word but still thin
    if (lower.length < 8) {
      return 'too_short'
    }
  }

  // Positive intent
  if (lower.match(/^(yes|ok|okay|sure|let'?s do it|i'?m ready|help me|ready|please|absolutely)/)) {
    return 'positive'
  }

  // Clarification request
  if (lower.match(/what do (you|u) mean|i don'?t (understand|get it)|huh\??|what\??$|\?\s*$|explain|confused|clarify|not sure what/)) {
    return 'clarification'
  }

  // AI question - check before other intents
  if (lower.match(/are you (a |an )?(ai|bot|robot|machine|computer|program|real)|chatgpt|artificial|gpt|language model/)) {
    return 'ai_question'
  }

  // Price question - specific handling
  if (lower.match(/how much|what('?s| is) the (price|cost)|pricing|what do(es)? (it|this) cost|expensive/)) {
    return 'price_question'
  }

  // Explicit decline
  if (lower.match(/^no$|^no thanks|^not interested|^don'?t want|^goodbye|^no way|^pass$|^nope$/)) {
    return 'explicit_decline'
  }

  // Price objection
  if (lower.match(/can'?t afford|too expensive|too much|no money|broke|expensive|cost/)) {
    return 'objection_price'
  }

  // Skepticism
  if (lower.match(/scam|fake|don'?t believe|bullshit|bs|fraud|trick/)) {
    return 'objection_skepticism'
  }

  // Wants more info
  if (lower.match(/tell me more|what happens|how does it work|explain|what do i get|more info/)) {
    return 'objection_info'
  }

  // Wants more free reading
  if (lower.match(/what else|tell me about|when will|who is|can you see|more about|keep going/)) {
    return 'wants_more_free'
  }

  return 'unknown'
}

export function getGibberishResponse(firstName: string): string[] {
  const responses = [
    [
      "I sense confusion in your energy, dear...",
      "Take a breath. Center yourself.",
      `Tell me clearly, ${firstName}... what's truly on your mind?`
    ],
    [
      "The connection is unclear...",
      "Your thoughts seem scattered right now.",
      `Focus, ${firstName}. What do you truly want to share with me?`
    ],
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

export function getAIDeflectionResponse(firstName: string): string[] {
  const responses = [
    [
      "I understand your doubt, dear...",
      "In this digital age, it's natural to question what's real.",
      `But tell me, ${firstName}... would a machine have sensed your location? Your hesitation?`,
      "The question isn't whether I'm real. The question is whether you're ready to hear the truth."
    ],
    [
      `${firstName}, I've been asked that before...`,
      "What I can tell you is this - I see what others cannot.",
      "I felt your presence before you even typed a word.",
      "Whether you believe is up to you... but your being here is not a coincidence."
    ],
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

export function getInappropriateResponse(): string[] {
  return [
    "I'm going to stop you right there.",
    "This is a sacred space for spiritual guidance, not that kind of conversation.",
    "If you're not here for genuine help, I'll have to end our session.",
    "Take a moment to reflect on what you truly need... then we can continue."
  ]
}

export function getClarificationResponse(firstName: string, context: string): string[] {
  const responses: Record<string, string[]> = {
    future_validation: [
      `Let me put it another way, ${firstName}...`,
      "When you imagine having exactly what you desire... close your eyes for a moment.",
      "What EMOTION fills your chest? Joy? Peace? Relief? Tell me what you feel."
    ],
    crisis_reveal: [
      `I'm asking about the root, ${firstName}...`,
      "This pattern didn't start with you. Think back to your family, your upbringing.",
      "Where do you sense this limitation first took hold?"
    ],
    crisis_cost: [
      `It's a simple question, dear...`,
      "Are you ready to let go of what's been holding you back?",
      "Yes or no - trust your gut."
    ],
    default: [
      `Let me rephrase, ${firstName}...`,
      "Just speak from the heart. There's no wrong answer here.",
      "What comes to mind when you sit with that question?"
    ]
  }
  return responses[context] || responses.default
}

export function getCrisisSafetyResponse(): string[] {
  return [
    "I need to pause our session here.",
    "What you're sharing sounds very serious, and I'm concerned about you.",
    "Please reach out to someone who can truly help right now:",
    "National Suicide Prevention Lifeline: 988 (call or text)",
    "Crisis Text Line: Text HOME to 741741",
    "You matter. Please reach out to them."
  ]
}

export function getTooShortResponse(firstName: string, context?: string): string[] {
  if (context === 'emotional') {
    return [
      `${firstName}... I can feel that emotion, but I need you to go deeper.`,
      "Don't just name the feeling. Let yourself FEEL it.",
      "What changes in your body? Your breath? Your heart? Tell me more..."
    ]
  }

  if (context === 'vision') {
    return [
      `${firstName}, paint me a fuller picture, dear...`,
      "I need details to see your vision clearly.",
      "What does this future look like? Who's there with you? What's different?"
    ]
  }

  return [
    `${firstName}, I need a bit more to work with, dear...`,
    "The spirits require clear intention.",
    "Open your heart and tell me more..."
  ]
}

export function getPriceQuestionResponse(firstName: string): string[] {
  return [
    `${firstName}, let's not get ahead of ourselves...`,
    "We haven't even uncovered what's blocking you yet.",
    "First, let me understand your situation fully.",
    "The investment means nothing if we don't address the root cause."
  ]
}
