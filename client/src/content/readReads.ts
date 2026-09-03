// Composed copy + param parsing for the /fb-read quiz-bridge funnel.
//
// The REGISTRY (devices, marks, readings, headlines, questions) lives in
// @shared/readDevices and the READINGS in @shared/readCopy, because the server
// needs both: the route validates against the same roster the lander renders
// from, and the Version-C prompt injects the same `mark` / `reading` strings the
// bridge shows. That is deliberate, and it is the one structural difference
// from /fb-palm and /fb-tarot — both of those keep parallel hand-maintained
// copies on the server, and both of their docs name the resulting drift as
// their number one bug.
//
// This module is the CLIENT half only: parsing the query string, and folding the
// seven bubbles into what each version actually says.
//
// Three versions, split by route:
//   Version A  (/fb-read)    → static result card on S3, then a brief greeting
//   Version B  (/fb-read/b)  → no card; the whole read plays as chat messages
//   Version C  (/fb-read/c)  → no card; interactive — the opening bubble plus one
//                              open question, then the LLM reads her answer
//                              (falls back to the rest of the written read)

import type { Bucket } from '@/types/chat'
import {
  DEFAULT_DEVICE,
  DEFAULT_HOOK,
  DEVICES,
  READ_QUESTION,
  getDevice,
  isReadDevice,
  isReadHook,
  isReadOption,
  openingBubble,
  readsFor,
  remainingBubbles,
  type ReadDevice,
  type ReadHook,
  type ReadOption,
  type ReadVersion,
} from '@shared/readDevices'
import { isReadWritten } from '@shared/readCopy'

export {
  DEFAULT_DEVICE,
  DEFAULT_HOOK,
  DEVICES,
  HEADLINES,
  getDevice,
  isReadDevice,
  isReadHook,
  isReadOption,
} from '@shared/readDevices'
export type { ReadDevice, ReadHook, ReadOption, ReadVersion } from '@shared/readDevices'

// Every hook on this funnel is love-themed, so the chat skips the topic picker.
export function hookToBucket(_hook: ReadHook): Bucket {
  return 'love'
}

// Parse + validate the bridge params. Returns null unless the whole combo is
// real AND finished, which is what keeps the chat from diverging for anyone who
// did not genuinely come through the bridge.
//
// The `isReadWritten` check is the load-bearing one: a device can be in the
// registry with its art in place while its reads are still at the review gate,
// and this is what stops a URL handed out early from serving placeholder copy.
export function parseReadParams(
  search: string,
): { device: ReadDevice; hook: ReadHook; option: ReadOption; version: ReadVersion } | null {
  const p = new URLSearchParams(search)

  const hookParam = p.get('hook')
  const optionParam = p.get('card')
  if (!isReadHook(hookParam) || !isReadOption(optionParam)) return null

  const deviceParam = p.get('device')
  const device: ReadDevice = isReadDevice(deviceParam) ? deviceParam : DEFAULT_DEVICE

  // The tapped option must be one this device actually offers.
  if (!DEVICES[device].options.includes(optionParam)) return null
  // …and the reading must be written. Never serve a sentinel.
  if (!isReadWritten(device, hookParam, optionParam)) return null

  const vParam = p.get('v')
  const version: ReadVersion = vParam === 'b' ? 'b' : vParam === 'c' ? 'c' : 'a'
  return { device, hook: hookParam, option: optionParam, version }
}

// ── Reveal art ──────────────────────────────────────────────────────────────

export interface ReadCardArt {
  url: string
  sizePct: number
  posPct: number
  aspect: number
  alt: string
  wide?: boolean
}

// The image attached to the FIRST chat bubble, cropped out of the device's strip.
//
// Falls back to the lander strip when a device has no revealStrip, which is the
// right default: a candle or a dream has nothing hidden to uncover, so showing the
// same picture again simply keeps it in front of her while Evelyn describes it.
// Tea overrides it, because on tea the traced version IS the payoff.
export function revealArtFor(device: ReadDevice, option: ReadOption): ReadCardArt {
  const cfg = getDevice(device)
  const strip = cfg.revealStrip ?? cfg.strip
  const count = cfg.options.length
  const i = Math.max(0, cfg.options.indexOf(option))
  return {
    url: strip.url,
    sizePct: count * 100,
    posPct: count > 1 ? (i / (count - 1)) * 100 : 0,
    aspect: strip.width / count / strip.height,
    alt: cfg.mark[option] || 'what you chose',
    // Always wide on this funnel: every read reveal is a zoom with a ring in it,
    // and a ring she cannot see is worse than no ring at all.
    wide: true,
  }
}

// ── Composed copy ───────────────────────────────────────────────────────────

// Version A — the static S3 result card: the seven bubbles as one paragraph.
export function cardRead(device: ReadDevice, hook: ReadHook, option: ReadOption): string {
  return readsFor(device, hook, option).join(' ')
}

// Version A — the brief chat greeting AFTER the card. Do not re-deliver the
// read she has just finished reading; acknowledge it and hand into name capture.
export function greetingA(device: ReadDevice, option: ReadOption): string {
  const d = getDevice(device)
  return `Mmm… ${d.reading[option]}. I felt it ${d.chooseMoment}. The connection only opens once I know who I'm speaking with, though… what's your first name, dear?`
}

// Version B — the whole read as a chat sequence, one bubble at a time, then the
// name. No model call is made on this version: the written copy IS the reading.
export function openerB(device: ReadDevice, hook: ReadHook, option: ReadOption): string[] {
  return [
    ...readsFor(device, hook, option),
    "Before I follow this thread any further, I need to know who I'm speaking with… what's your first name, dear?",
  ]
}

// Version C opener (static, instant): the opening bubble — the picture she is
// looking at — plus the open question. Then the LLM reads HER answer.
//
// These two lines are the entire conversation before she types, which is why
// buildReadReflectPrompt is given both of them verbatim: without that, the model
// re-describes the picture she was shown two bubbles earlier.
export function openerCStart(device: ReadDevice, hook: ReadHook, option: ReadOption): string[] {
  return [openingBubble(device, hook, option), READ_QUESTION[hook]]
}

// Version C fallback, used only when the reflect call fails: the rest of the
// written read, minus the opening bubble she has already been shown.
export function readReflectFallback(
  device: ReadDevice,
  hook: ReadHook,
  option: ReadOption,
): string[] {
  return remainingBubbles(device, hook, option)
}
