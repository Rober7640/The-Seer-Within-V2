// Runs the real tarot guard files against the PENDING DRAFTS. See wire-drafts-setup.mts.
import base from '../vitest.config'
import { defineConfig, mergeConfig } from 'vitest/config'
export default mergeConfig(base, defineConfig({
  test: { setupFiles: ['./scripts/wire-drafts-setup.mts'] },
}))
