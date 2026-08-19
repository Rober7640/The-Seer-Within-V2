import { useEffect, useState } from 'react'
import { useLocation, Link } from 'wouter'
import { Sparkles, Lock } from 'lucide-react'
import { CosmicBackground } from '../components/CosmicBackground'
import { funnelPath } from '../lib/funnel'
import { track } from '../lib/posthog'
import { rememberTarotDraw } from '../lib/tarotAttribution'
import {
  DEFAULT_HOOK,
  DEFAULT_DECK,
  HEADLINES,
  angleForHook,
  cardArtFor,
  cardReveal,
  getDeck,
  instructionFor,
  isTarotHook,
  isTarotDeck,
  type TarotHook,
  type TarotOption,
  type TarotDeck,
  type TarotVersion,
} from '../content/tarotReads'

// The /fb-tarot "decode-him card" quiz-bridge lander. Parallel to PalmBridge but
// a SEPARATE component reading the tarot registry (palm is never touched).
//   pick    → Screen 1: the A/B/C card art from the ad, now tappable
//   reading → Screen 2: 1.5s "reading your cards" beat (Evelyn appears)
//   result  → Screen 3 (Version A only): the reveal + CTA into /fb-tarot/chat
//
// Two axes (both from the URL, both default to the seeded deck):
//   deck    — ?deck= which card set the ad quizzed (default 'decode-him')
//   version — route /b → B, /c → C, else A
// Everything below the headline is driven by the deck config in tarotReads.ts, so
// adding a new card concept (via the fb-tarot-add-card skill) needs no change here.

type Phase = 'pick' | 'reading' | 'result'

const OPTION_LABEL: Record<TarotOption, string> = { a: 'A', b: 'B', c: 'C' }

/** Fisher-Yates. Returns a new array; never mutates the config. */
function shuffled<T>(input: readonly T[]): T[] {
  const a = [...input]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TarotBridge() {
  const [location, navigate] = useLocation()

  // Version from the route: /fb-tarot/b → B, /fb-tarot/c → C, anything else → A.
  const path = location.replace(/\/+$/, '')
  const version: TarotVersion = path.endsWith('/b') ? 'b' : path.endsWith('/c') ? 'c' : 'a'

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const deckParam = params.get('deck')
  const deck: TarotDeck = isTarotDeck(deckParam) ? deckParam : DEFAULT_DECK
  const hookParam = params.get('hook')
  const hookRaw: TarotHook = isTarotHook(hookParam) ? hookParam : DEFAULT_HOOK
  // A hook without reads for this deck falls back wholesale, so the headline and
  // the reveal always tell the same story.
  const hook: TarotHook = getDeck(deck).reads[hookRaw] ? hookRaw : DEFAULT_HOOK
  const seg = params.get('seg') || undefined
  const utmContent = params.get('utm_content') || undefined

  const cfg = getDeck(deck)
  const count = cfg.options.length

  const columns = cfg.columns ?? (count === 2 ? 2 : 3)
  const GRID_COLS: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  }

  // Crop an N-up strip down to a single option via background-position.
  const stripStyle = (
    opt: TarotOption,
    strip: { url: string; width: number; height: number },
  ): React.CSSProperties => {
    const i = cfg.options.indexOf(opt)
    const pos = count > 1 ? (i / (count - 1)) * 100 : 0
    return {
      aspectRatio: `${strip.width / count} / ${strip.height}`,
      backgroundImage: `url('${strip.url}')`,
      backgroundSize: `${count * 100}% 100%`,
      backgroundPosition: `${pos}% center`,
      backgroundRepeat: 'no-repeat',
    }
  }
  // Tap targets use the ad's strip (backs for a face-down deck); the reveal uses the
  // faces strip when the deck supplies one, so a turned face-down card shows its face.
  const optionStyle = (opt: TarotOption) => stripStyle(opt, cfg.strip)
  // The REVEAL uses the shared helper — the same one ChatPage renders the Version
  // B/C opener art from — so the lander and the chat can never crop to different
  // cards for the same draw.
  const revealStyle = (opt: TarotOption): React.CSSProperties => {
    const a = cardArtFor(deck, opt)
    return {
      aspectRatio: `${a.aspect}`,
      backgroundImage: `url('${a.url}')`,
      backgroundSize: `${a.sizePct}% 100%`,
      backgroundPosition: `${a.posPct}% center`,
      backgroundRepeat: 'no-repeat',
    }
  }

  const [phase, setPhase] = useState<Phase>('pick')
  const [card, setCard] = useState<TarotOption | null>(null)
  // The PANEL she tapped, kept separately from the CARD she drew (see below).
  const [panel, setPanel] = useState<TarotOption | null>(null)

  // ── The draw: which panel yields which card ────────────────────────────────
  // FACE-DOWN decks show three IDENTICAL backs, so she is not choosing a card —
  // she is choosing a position. Mapping position→card fixed (panel A always the
  // Magician, B always the Hanged Man, …) would make the draw deterministic, and
  // with three options people overwhelmingly tap the MIDDLE one — so one card
  // would dominate the traffic and one read would barely ever be seen.
  //
  // So for face-down decks we shuffle the three cards behind the three backs,
  // once per visit. It is a shuffle WITHOUT repeat (a permutation, not three
  // independent rolls), so all three cards stay available on every visit and the
  // split across visitors is even. Invisible to her — the backs are identical —
  // and it is what a real face-down draw actually is.
  //
  // FACE-UP decks are deliberately EXEMPT: there she can see the cards and truly
  // picks one, so the mapping must stay identity or the reveal would show a card
  // she didn't choose and "you chose the Magician" would be a lie.
  const [drawOrder] = useState<TarotOption[]>(() =>
    cfg.facing === 'down' ? shuffled(cfg.options) : [...cfg.options],
  )
  const cardForPanel = (p: TarotOption): TarotOption =>
    drawOrder[cfg.options.indexOf(p)] ?? p

  // Send the chosen card (+ deck + version) into the chat, where the reveal is
  // delivered. `deck` is only appended when it isn't the default, so the seeded
  // decode-him links stay short.
  const goToChat = (t: TarotOption) => {
    track('tarot_read_continue', { deck, facing: cfg.facing, hook, card: t, panel, version })
    const v = version === 'a' ? '' : `&v=${version}`
    const d = deck === DEFAULT_DECK ? '' : `&deck=${deck}`
    // Preserve the ?clearing= preview override across the bridge→chat navigation.
    const clr = new URLSearchParams(window.location.search).get('clearing')
    const c = clr === 'woven' || clr === 'control' ? `&clearing=${clr}` : ''
    navigate(`${funnelPath('/chat')}?hook=${hook}&card=${t}${d}${v}${c}`)
  }

  // Landing on the bridge = a fresh quiz. Drop any prior chat session so the
  // tapped version's greeting runs cleanly. Key mirrors useConversation's STORAGE_KEY.
  useEffect(() => {
    try { localStorage.removeItem('seer_conversation') } catch { /* ignore */ }
  }, [])

  // Screen 1 shown
  useEffect(() => {
    track('tarot_bridge_view', { deck, facing: cfg.facing, hook, angle: angleForHook(hook), seg, utm_content: utmContent, version })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reading beat → Version A shows the result card; B & C go straight to chat.
  useEffect(() => {
    if (phase !== 'reading' || !card) return
    const t = setTimeout(() => {
      if (version === 'a') setPhase('result')
      else goToChat(card)
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, card, version])

  const onPick = (p: TarotOption) => {
    const drawn = cardForPanel(p)
    setPanel(p)
    setCard(drawn)
    // `card` = what she DREW (drives the reveal, the read and the chat handoff).
    // `panel` = which position she TAPPED. Recorded separately so the tap-position
    // bias is measurable in its own right — on a face-down deck the two differ.
    track('tarot_card_select', { deck, facing: cfg.facing, hook, angle: angleForHook(hook), card: drawn, panel: p, version })
    // Carry the draw to every downstream event (lead → checkout → both upsells).
    // The upsell steps have no query string at all, so this is the only way the
    // per-card breakdown survives past the chat.
    rememberTarotDraw(drawn, p)
    setPhase('reading')
  }

  const onContinue = () => {
    if (card) goToChat(card)
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      {/* Logo */}
      <div className="mb-6 flex items-center gap-3 text-center">
        <Sparkles className="w-8 h-8 text-purple-300 drop-shadow-lg" />
        <h1 className="font-serif text-2xl md:text-3xl text-secondary drop-shadow-md">The Seer Within</h1>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full mx-auto relative z-10 border border-white/20">
        {phase === 'pick' && (
          <>
            {/* Eyebrow — matches the ad's framing */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="h-px w-8 bg-purple-300/60" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-purple-500 font-semibold whitespace-nowrap">
                {cfg.eyebrow}
              </span>
              <span className="h-px w-8 bg-purple-300/60" />
            </div>

            <h2 className="font-serif text-2xl md:text-3xl text-gray-900 text-center mb-2 leading-tight">
              {HEADLINES[hook]}
            </h2>
            {/* The deck's tap line, unless this hook overrides it — return-mhf says "Think of
                the man on your mind", which is the wrong sentence in front of a money hook. */}
            <p className="text-gray-500 text-center text-sm mb-6">{instructionFor(deck, hook)}</p>
            <div className={`grid ${GRID_COLS[columns]} gap-2 md:gap-3`}>
              {cfg.options.map((t) => (
                <button
                  key={t}
                  onClick={() => onPick(t)}
                  className="group rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] overflow-hidden bg-white"
                  data-testid={`tarot-card-${t}`}
                  aria-label={`Card ${OPTION_LABEL[t]}`}
                >
                  <div className="w-full" style={optionStyle(t)} />
                </button>
              ))}
            </div>

            {/* Trust / privacy reassurance */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>100% Private · 2,400+ readings</span>
            </div>
          </>
        )}

        {phase === 'reading' && (
          <div className="flex flex-col items-center py-8 animate-fade-in">
            <Avatar />
            <p className="text-gray-700 text-center mt-4 mb-3 font-serif text-lg">Evelyn is reading your {cfg.beatNoun}…</p>
            <div className="flex gap-1.5 mb-3">
              <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" />
            </div>
            <p className="text-gray-400 text-center text-sm italic">Hold still, dear.</p>
          </div>
        )}

        {phase === 'result' && card && (
          <div className="flex flex-col items-center animate-fade-in">
            <Avatar />
            <div
              className="mt-4 mb-4 w-32 rounded-lg overflow-hidden border border-gray-200 shadow-md"
              style={revealStyle(card)}
            />
            <p className="text-gray-700 text-center text-sm md:text-base leading-relaxed mb-6">
              {cardReveal(deck, hook, card)}
            </p>
            <button
              onClick={onContinue}
              className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              data-testid="tarot-continue"
            >
              {cfg.continueCta} ▸
            </button>
          </div>
        )}
      </div>

      <footer className="mt-8 text-white/40 text-xs text-center space-y-2">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/privacy">
            <span className="hover:text-white/70 cursor-pointer transition-colors" data-testid="link-privacy">Privacy Policy</span>
          </Link>
          <span>·</span>
          <Link href="/terms">
            <span className="hover:text-white/70 cursor-pointer transition-colors" data-testid="link-terms">Terms of Service</span>
          </Link>
          <span>·</span>
          <Link href="/refund">
            <span className="hover:text-white/70 cursor-pointer transition-colors" data-testid="link-refund">Refund Policy</span>
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Cosmo Numerology Pte Ltd. For Entertainment Purposes Only.</p>
      </footer>
    </div>
  )
}

function Avatar() {
  return (
    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl bg-purple-100">
      <img src="/evelyn-avatar.png" alt="Evelyn Cross" className="w-full h-full object-cover" />
    </div>
  )
}
