// /client/src/lib/typing.ts

export function calculateTypingDelay(message: string): number {
  const baseSpeed = 60 // ms per character
  const minDelay = 1000
  const maxDelay = 5000

  // Add variance +/-20%
  const variance = 0.2
  const randomFactor = 1 + (Math.random() * variance * 2 - variance)

  const baseTime = message.length * baseSpeed * randomFactor
  return Math.min(Math.max(baseTime, minDelay), maxDelay)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}
