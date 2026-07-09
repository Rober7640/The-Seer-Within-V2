/**
 * improve-v2 Playwright helpers.
 * Thin re-exports of the existing evelyn-cross API helpers plus a couple of
 * convenience wrappers so the V2 specs read cleanly. Everything drives the REAL
 * chat-service API (same path the browser uses → same server-side sendMessage
 * where the refund deflection + persona engine live).
 */
import { Page } from '@playwright/test';
import {
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  uniqueEmail,
  EVELYN_SLUG,
} from '../../tests/evelyn-cross/helpers';

export { apiRegister, apiStartSession, apiSendMessage, apiEndSession, uniqueEmail, EVELYN_SLUG };

export interface EvelynSession {
  token: string;
  userId: string;
  sessionId: string;
  startingCoins: number;
}

/** Register a fresh user and open an Evelyn session. Returns everything a test needs. */
export async function freshEvelynSession(page: Page, firstName = 'Tester'): Promise<EvelynSession> {
  const { token, user } = await apiRegister(page, uniqueEmail('v2pw'), undefined, firstName);
  const { sessionId, remainingCoins } = await apiStartSession(page, token, EVELYN_SLUG);
  return { token, userId: user.id, sessionId, startingCoins: remainingCoins };
}

/**
 * Send one message and return a NORMALIZED response.
 * The HTTP route (server/routes/chatService.ts) reshapes the engine result:
 * `remainingCoins` (not creditsRemaining) and `sessionStatus: 'active'|'ended'`
 * (not sessionActive). Normalize here so specs read cleanly.
 */
export async function say(page: Page, s: EvelynSession, content: string): Promise<{
  message: string;
  blocked: boolean;
  creditsRemaining: number;
  sessionActive: boolean;
  crisisDisclaimer: unknown;
}> {
  const res = await apiSendMessage(page, s.sessionId, s.token, content);
  if (!res.ok()) throw new Error(`sendMessage failed (${res.status()}): ${await res.text()}`);
  const body = await res.json();
  return {
    message: body.message,
    blocked: body.blocked ?? false,
    creditsRemaining: body.remainingCoins,
    sessionActive: body.sessionStatus === 'active',
    crisisDisclaimer: body.crisisDisclaimer ?? null,
  };
}
