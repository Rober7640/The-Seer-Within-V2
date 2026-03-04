// Model Configuration for Cost Optimization
// Allows different Claude models for different operations
// System 1 uses Sonnet 4 - proven to work well for spiritual readings

export type ClaudeModel =
  | 'claude-sonnet-4-5-20250929'
  | 'claude-haiku-4-5-20251001';

export interface ModelConfig {
  // Greeting generation (simpler task, less critical)
  greeting: ClaudeModel;

  // Main conversation responses (high quality needed)
  conversation: ClaudeModel;

  // Memory summarization (background task)
  summarization: ClaudeModel;
}

// ============================================================
// Cost Analysis (Approximate pricing per million tokens)
// ============================================================
// Sonnet 4: Input $3    | Output $15   (Proven quality for spiritual readings)
// Haiku 4:  Input $0.25 | Output $1.25 (Fast & cheap)
//
// For 1000 conversations with 500 tokens each:
// - All Sonnet: ~$9 output + ~$1.50 input = $10.50
// - Hybrid (Haiku greetings, Sonnet conversation): ~$8 output + ~$1 input = $9
// - All Haiku: ~$0.75 output + ~$0.125 input = $0.875
//
// Hybrid saves ~15% while maintaining conversation quality
// ============================================================

// Default configuration: Balanced approach (Recommended)
// Saves 15% vs all-Sonnet while maintaining quality
const DEFAULT_CONFIG: ModelConfig = {
  greeting: 'claude-haiku-4-5-20251001',      // Simple, fast greetings
  conversation: 'claude-sonnet-4-5-20250929', // High-quality responses (System 1 proven)
  summarization: 'claude-haiku-4-5-20251001', // Background task, simpler
};

// High-quality configuration: Same as System 1
// All Sonnet for maximum consistency
const HIGH_QUALITY_CONFIG: ModelConfig = {
  greeting: 'claude-sonnet-4-5-20250929',
  conversation: 'claude-sonnet-4-5-20250929',
  summarization: 'claude-sonnet-4-5-20250929',
};

// Economy configuration: Maximum savings
// Use for testing/development to save API costs
const ECONOMY_CONFIG: ModelConfig = {
  greeting: 'claude-haiku-4-5-20251001',
  conversation: 'claude-haiku-4-5-20251001',
  summarization: 'claude-haiku-4-5-20251001',
};

// ============================================================
// Configuration Selection
// ============================================================

function getConfigFromEnv(): ModelConfig {
  const mode = process.env.MODEL_MODE?.toLowerCase() || 'default';

  switch (mode) {
    case 'economy':
      return ECONOMY_CONFIG;
    case 'high-quality':
      return HIGH_QUALITY_CONFIG;
    case 'default':
    default:
      return DEFAULT_CONFIG;
  }
}

// Export the active configuration
export const MODEL_CONFIG = getConfigFromEnv();

// ============================================================
// Helper: Get model for specific operation
// ============================================================

export function getModelForOperation(
  operation: keyof ModelConfig,
): ClaudeModel {
  return MODEL_CONFIG[operation];
}

// ============================================================
// Quality Guidelines
// ============================================================

/**
 * When to use each model:
 *
 * **Haiku 4** - Use for:
 * - Simple greetings (templated, low variation)
 * - Background summarization (not user-facing)
 * - Testing/development (save API costs)
 *
 * **Sonnet 4** - Use for:
 * - Main conversation responses (emotional intelligence needed)
 * - Persona-specific responses (character consistency)
 * - Complex spiritual readings (creativity required)
 * - Empathetic guidance (nuanced understanding)
 * - PROVEN in System 1 to work well for spiritual readings
 *
 * Note: We don't use Opus 4 since System 1 proves Sonnet 4 is sufficient
 * for high-quality spiritual readings. No need to add cost/complexity.
 */

// ============================================================
// Testing Configuration Override
// ============================================================

let testOverride: ModelConfig | null = null;

export function setTestModelConfig(config: ModelConfig): void {
  testOverride = config;
}

export function clearTestModelConfig(): void {
  testOverride = null;
}

export function getActiveModelConfig(): ModelConfig {
  return testOverride || MODEL_CONFIG;
}
