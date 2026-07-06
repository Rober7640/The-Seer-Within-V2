import { useEffect, useState } from 'react'
import { useLocation, Link } from 'wouter'
import { Sparkles, Lock } from 'lucide-react'
import { CosmicBackground } from '../components/CosmicBackground'
import { funnelPath } from '../lib/funnel'
import { track } from '../lib/posthog'
import {
  DEFAULT_HOOK,
  DEFAULT_SIGN,
  HEADLINES,
  cardRead,
  getSign,
  isPalmHook,
  isPalmSign,
  type PalmHook,
  type PalmOption,
  type PalmSign,
  type PalmVersion,
} from '../content/palmReads'

// The /fb-palm "quiz bridge" lander. Continues the FB quiz so the click doesn't
// drop the user into a cold chat. See fb-palm/docs/PRD-quiz-bridge.md.
//   pick    → Screen 1: same A/B/C art from the ad, now tappable
//   reading → Screen 2: 1.5s "reading your {sign}" beat (Evelyn appears)
//   result  → Screen 3 (Version A only): the read card + CTA into /fb-palm/chat
//
// Two axes (both read from the URL, both default to the original behavior):
//   sign    — ?sign= which physical tell the ad quizzed (default 'thumb')
//   version — route /b → B, /c → C, else A
// Everything below the headline is driven by the sign config in palmReads.ts, so
// adding a new ad concept needs no change here.

type Phase = 'pick' | 'reading' | 'result'

const OPTION_LABEL: Record<PalmOption, string> = { a: 'A', b: 'B', c: 'C' }

export default function PalmBridge() {
  const [location, navigate] = useLocation()

  // Version from the route: /fb-palm/b → B, /fb-palm/c → C, anything else → A.
  const path = location.replace(/\/+$/, '')
  const version: PalmVersion = path.endsWith('/b') ? 'b' : path.endsWith('/c') ? 'c' : 'a'

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const hookParam = params.get('hook')
  const hook: PalmHook = isPalmHook(hookParam) ? hookParam : DEFAULT_HOOK
  const signParam = params.get('sign')
  const sign: PalmSign = isPalmSign(signParam) ? signParam : DEFAULT_SIGN
  const seg = params.get('seg') || undefined
  const utmContent = params.get('utm_content') || undefined

  const cfg = getSign(sign)
  const count = cfg.options.length

  // Crop the N-up strip down to a single option via background-position.
  // The strip is `count` equal panels; aspectRatio keeps one panel undistorted.
  const optionStyle = (opt: PalmOption): React.CSSProperties => {
    const i = cfg.options.indexOf(opt)
    const pos = count > 1 ? (i / (count - 1)) * 100 : 0
    return {
      aspectRatio: `${cfg.strip.width / count} / ${cfg.strip.height}`,
      backgroundImage: `url('${cfg.strip.url}')`,
      backgroundSize: `${count * 100}% 100%`,
      backgroundPosition: `${pos}% center`,
      backgroundRepeat: 'no-repeat',
    }
  }

  const [phase, setPhase] = useState<Phase>('pick')
  const [thumb, setThumb] = useState<PalmOption | null>(null)

  // Send the chosen option (+ sign + version) into the chat, where the read is
  // delivered. `sign` is only appended when it isn't the default, so original
  // thumb links stay byte-identical.
  const goToChat = (t: PalmOption) => {
    track('palm_read_continue', { sign, hook, thumb: t, version })
    const v = version === 'a' ? '' : `&v=${version}`
    const s = sign === DEFAULT_SIGN ? '' : `&sign=${sign}`
    // Preserve the ?clearing= preview override (dev/QA self-test of the prompt
    // A/B) across the bridge→chat navigation. Real enrollment resolves via the
    // ab_vid cookie (survives navigation) and is unaffected by this.
    const clr = new URLSearchParams(window.location.search).get('clearing')
    const c = clr === 'woven' || clr === 'control' ? `&clearing=${clr}` : ''
    navigate(`${funnelPath('/chat')}?hook=${hook}&thumb=${t}${s}${v}${c}`)
  }

  // Landing on the bridge = a fresh quiz. Drop any prior chat session so the
  // tapped version's greeting runs cleanly — otherwise a leftover session (e.g.
  // from testing another version, or a returning visitor) restores the old
  // conversation and the version's opener never fires. Key mirrors
  // useConversation's STORAGE_KEY ('seer_conversation').
  useEffect(() => {
    try { localStorage.removeItem('seer_conversation') } catch { /* ignore */ }
  }, [])

  // Screen 1 shown
  useEffect(() => {
    track('palm_bridge_view', { sign, hook, seg, utm_content: utmContent, version })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reading beat → Version A shows the result card; B & C go straight to chat.
  useEffect(() => {
    if (phase !== 'reading' || !thumb) return
    const t = setTimeout(() => {
      if (version === 'a') setPhase('result')
      else goToChat(thumb)
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, thumb, version])

  const onPick = (t: PalmOption) => {
    setThumb(t)
    track('palm_thumb_select', { sign, hook, thumb: t, version })
    setPhase('reading')
  }

  const onContinue = () => {
    if (thumb) goToChat(thumb)
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
            {/* Eyebrow — matches the ad's "According to Your …" framing */}
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
            <p className="text-gray-500 text-center text-sm mb-6">{cfg.instruction}</p>
            <div className={`grid ${count === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 md:gap-3`}>
              {cfg.options.map((t) => (
                <button
                  key={t}
                  onClick={() => onPick(t)}
                  className="group rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] overflow-hidden bg-white"
                  data-testid={`palm-thumb-${t}`}
                  aria-label={`Option ${OPTION_LABEL[t]}`}
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

        {phase === 'result' && thumb && (
          <div className="flex flex-col items-center animate-fade-in">
            <Avatar />
            <div
              className="mt-4 mb-4 w-24 rounded-lg overflow-hidden border border-gray-200"
              style={optionStyle(thumb)}
            />
            <p className="text-gray-700 text-center text-sm md:text-base leading-relaxed mb-6">
              {cardRead(sign, hook, thumb)}
            </p>
            <button
              onClick={onContinue}
              className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              data-testid="palm-continue"
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
