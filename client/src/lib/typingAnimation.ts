// Typing Animation Utilities
// Matches System 1 settings from client/src/lib/typing.ts

/**
 * How long the dots indicator shows before the message appears.
 * Scaled by message length — longer messages feel like more thought.
 * Result: 1000–5000ms
 */
export function calculateTypingDelay(message: string): number {
  const baseSpeed = 60; // ms per character
  const minDelay = 1000;
  const maxDelay = 5000;

  const variance = 0.2;
  const randomFactor = 1 + (Math.random() * variance * 2 - variance);

  const baseTime = message.length * baseSpeed * randomFactor;
  return Math.min(Math.max(baseTime, minDelay), maxDelay);
}

/**
 * Pause between separate message bubbles in a multi-bubble response.
 * Result: 1500–2300ms
 */
export function calculatePauseBetweenMessages(): number {
  const basePause = 1500;
  const variance = 800;
  return basePause + Math.random() * variance;
}

/**
 * Sleep utility for async delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique ID for messages
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
