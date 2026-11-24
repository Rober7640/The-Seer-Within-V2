// Home (base V1) chat-flow B (v1_home_chat_flow_2026): wiring + isolation guards.
//
// Arm B REUSES /fb's reading verbatim — the candle+number opener, the fbB1/2/3 steps and
// the diagnosis. Those lines are pinned by tests/fb-chat-flow-b.test.ts, so this file does
// NOT re-pin the copy; it pins what is NEW to the home test: the experiment key + funnel
// label match the create-row SQL, the home and /fb scopes never enrol each other's
// traffic, resolveHomeChatFlow fails safe to today's flow, and the home arm reuses the
// SAME copy functions (so the "verbatim reuse" contract can't silently drift).
import { describe, it, expect } from 'vitest'
import {
  resolveHomeChatFlow,
  matchesFunnelScope,
  V1_HOME_CHAT_FLOW_EXPERIMENT_KEY,
  V1_HOME_FUNNEL_SCOPE,
  V1_FB_CHAT_FLOW_EXPERIMENT_KEY,
} from '../server/lib/experiments'
import { fbBNameLines, fbBTopicLines } from '../client/src/content/fbChatFlowB'

describe('home chat-flow constants (must match the create-row SQL)', () => {
  it('uses its own key, separate from /fb, so exposures never collide', () => {
    expect(V1_HOME_CHAT_FLOW_EXPERIMENT_KEY).toBe('v1_home_chat_flow_2026')
    expect(V1_HOME_CHAT_FLOW_EXPERIMENT_KEY).not.toBe(V1_FB_CHAT_FLOW_EXPERIMENT_KEY)
  })
  it('scopes to the base-V1 funnel label the SQL + server tag with', () => {
    expect(V1_HOME_FUNNEL_SCOPE).toBe('v1-home')
  })
})

describe('home ↔ /fb cross-test isolation (scope.funnel)', () => {
  it('the home test enrols ONLY v1-home traffic', () => {
    expect(matchesFunnelScope(['v1-home'], 'v1-home')).toBe(true)
    expect(matchesFunnelScope(['v1-home'], 'v1-fb')).toBe(false)
    expect(matchesFunnelScope(['v1-home'], 'v1-fb2')).toBe(false)
    expect(matchesFunnelScope(['v1-home'], 'v1-gdn')).toBe(false)
  })
  it('the /fb test never enrols base-V1 (home) traffic', () => {
    expect(matchesFunnelScope(['v1-fb'], 'v1-home')).toBe(false)
  })
})

describe('resolveHomeChatFlow fail-safe (dark until started)', () => {
  it('returns today\'s flow with no visitor cookie — never touches the DB', async () => {
    for (const subject of [null, undefined, '']) {
      const r = await resolveHomeChatFlow(subject)
      expect(r).toEqual({ b: false, variant: null, enrolled: false })
    }
  })
})

describe('arm B reuses /fb\'s reading copy verbatim', () => {
  it('the home name step is /fb\'s candle + name-number opener', () => {
    const lines = fbBNameLines('Maria')
    expect(lines.join(' ')).toMatch(/candle beside me bent/)
    expect(lines).toContain('Your name carries a number too. Maria comes to a 6.')
  })
  it('the home topic step is /fb\'s smoke lines', () => {
    expect(fbBTopicLines('love', 'Maria')[0]).toMatch(/That's where the smoke was pulling, Maria\./)
  })
})
