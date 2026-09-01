import { useEffect, useState } from 'react'
import { useLocation, Link } from 'wouter'
import { Sparkles, Lock } from 'lucide-react'
import { CosmicBackground } from '../components/CosmicBackground'
import { funnelPath } from '../lib/funnel'
import { track } from '../lib/posthog'
import {
  DEFAULT_DEVICE,
  DEFAULT_HOOK,
  HEADLINES,
  cardRead,
  getDevice,
  isReadDevice,
  isReadHook,
  type ReadDevice,
  type ReadHook,
  type ReadOption,
  type ReadVersion,
} from '../content/readReads'

// The /fb-read quiz-bridge lander. One component for EVERY device — the whole
// page is rendered from the registry in @shared/readDevices, read by URL param.
//   pick    → Screen 1: the strip art from the ad, now tappable
//   reading → Screen 2: 1.5s "reading your {beatNoun}…" beat (Evelyn appears)
//   result  → Screen 3 (Version A only): the reveal + CTA into /fb-read/chat
//
// Two axes from the URL, plus the version from the route:
//   device  — ?device=  which instrument the ad quizzed (default 'tea')
//   hook    — ?hook=    the question the ad asked (default 'love-again')
//   version — /b → B, /c → C, anything else → A
//
// 🔴 NO SHUFFLE HERE, deliberately, and it is not an omission. /fb-tarot
// shuffles its cards because a face-DOWN deck shows three identical backs — she
// is picking a position, not a card, and with three options people overwhelmingly
// tap the middle. Every /fb-read device shows three visibly DIFFERENT panels, so
// she is genuinely choosing. Rotating here would hand her a reading for a panel
// she did not pick, and "the flame you chose" would be a lie.

type Phase = 'pick' | 'reading' | 'result'

const OPTION_LABEL: Record<ReadOption, string> = { a: 'A', b: 'B', c: 'C' }

export default function ReadBridge() {
  const [location, navigate] = useLocation()

  // Version from the route: /fb-read/b → B, /fb-read/c → C, else A.
  const path = location.replace(/\/+$/, '')
  const version: ReadVersion = path.endsWith('/b') ? 'b' : path.endsWith('/c') ? 'c' : 'a'

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const deviceParam = params.get('device')
  const device: ReadDevice = isReadDevice(deviceParam) ? deviceParam : DEFAULT_DEVICE
  const hookParam = params.get('hook')
  const hook: ReadHook = isReadHook(hookParam) ? hookParam : DEFAULT_HOOK
  const seg = params.get('seg') || undefined
  const utmContent = params.get('utm_content') || undefined

  const cfg = getDevice(device)
  const count = cfg.options.length

  // Crop the N-up strip down to one panel via background-position. The strip is
  // `count` EQUAL panels; aspectRatio keeps a single panel undistorted.
  //
  // 🔴 WHICH strip depends on WHEN. Before she taps she sees the plain one; after
  // the reading she sees the reveal, where the device has one.
  //
  // Only tea does. Its cups are deliberately unreadable — tea-leaf reading is a
  // Rorschach, so a cup with an obvious heart in it is a logo, not a reading, and
  // she would not need a seer to spot it. She therefore taps on instinct, and the
  // traced cup is what Evelyn hands back. Showing the plain cup beside the words
  // "there's a bird in yours" would put the copy next to a picture that does not
  // visibly contain it — which is the one failure the whole art brief exists to
  // prevent. See improve-v1/fb-read/tea-leaf-reading-findings.md.
  const optionStyle = (opt: ReadOption, revealed = false): React.CSSProperties => {
    const strip = (revealed && cfg.revealStrip) || cfg.strip
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

  const [phase, setPhase] = useState<Phase>('pick')
  const [card, setCard] = useState<ReadOption | null>(null)

  // Hand the chosen panel into the chat, where the reading is delivered.
  const goToChat = (opt: ReadOption) => {
    track('read_continue', { device, hook, card: opt, version })
    const v = version === 'a' ? '' : `&v=${version}`
    navigate(`${funnelPath('/chat')}?hook=${hook}&card=${opt}&device=${device}${v}`)
  }

  // Landing on the bridge = a fresh quiz. Drop any prior chat session so the
  // tapped version's opener runs cleanly — otherwise a leftover session restores
  // the old conversation and this version's opener never fires. Key mirrors
  // useConversation's STORAGE_KEY.
  useEffect(() => {
    try { localStorage.removeItem('seer_conversation') } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    track('read_bridge_view', { device, hook, seg, utm_content: utmContent, version })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reading beat → Version A shows the result card; B and C go straight to chat.
  useEffect(() => {
    if (phase !== 'reading' || !card) return
    const t = setTimeout(() => {
      if (version === 'a') setPhase('result')
      else goToChat(card)
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, card, version])

  const onPick = (opt: ReadOption) => {
    setCard(opt)
    track('read_select', { device, hook, card: opt, version })
    setPhase('reading')
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      <div className="mb-6 flex items-center gap-3 text-center">
        <Sparkles className="w-8 h-8 text-purple-300 drop-shadow-lg" />
        <h1 className="font-serif text-2xl md:text-3xl text-secondary drop-shadow-md">The Seer Within</h1>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full mx-auto relative z-10 border border-white/20">
        {phase === 'pick' && (
          <>
            {/* Eyebrow — device-level, names the instrument */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="h-px w-8 bg-purple-300/60" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-purple-500 font-semibold whitespace-nowrap">
                {cfg.eyebrow}
              </span>
              <span className="h-px w-8 bg-purple-300/60" />
            </div>

            {/* Headline — HOOK-level, the ad question verbatim. Identical across
                every device, which is what makes a device test readable. */}
            <h2 className="font-serif text-2xl md:text-3xl text-gray-900 text-center mb-2 leading-tight">
              {HEADLINES[hook]}
            </h2>
            <p className="text-gray-500 text-center text-sm mb-6">{cfg.instruction}</p>

            {/* Two ways of choosing, from cfg.pick.

                'symbol' (arm B) — ONE photograph and three NAMES. She is not
                picking a picture, she is picking what she sees in it, which is
                what tasseography actually is. The cup deliberately contains
                nothing nameable, so the names carry the whole choice and the
                picture cannot give the answer away.

                'panel' (arm A) — three visibly different photographs sliced out
                of one strip; the picture she taps IS the reading she gets. */}
            {cfg.pick === 'symbol' ? (
              <>
                <div
                  className="w-full rounded-xl overflow-hidden border border-gray-200 mb-5 bg-gray-50"
                  style={{
                    aspectRatio: `${(cfg.cupImage ?? cfg.strip).width} / ${(cfg.cupImage ?? cfg.strip).height}`,
                    backgroundImage: `url('${(cfg.cupImage ?? cfg.strip).url}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  role="img"
                  aria-label={cfg.cupAlt}
                  data-testid="read-cup"
                />
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {cfg.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onPick(opt)}
                      className="rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50/60 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] bg-white py-4 px-2 font-serif text-base md:text-lg text-gray-800"
                      data-testid={`read-card-${opt}`}
                    >
                      {/* Letter derived from the option key, name from the
                          registry — the ad composes its options row the same
                          way, so the two can never disagree. */}
                      <span className="text-purple-500 font-sans text-sm mr-1.5">{OPTION_LABEL[opt]}.</span>
                      {cfg.optionLabel?.[opt] ?? OPTION_LABEL[opt]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {cfg.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => onPick(opt)}
                    className="group rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] overflow-hidden bg-white"
                    data-testid={`read-card-${opt}`}
                    aria-label={`Option ${OPTION_LABEL[opt]}`}
                  >
                    <div className="w-full" style={optionStyle(opt)} />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>100% Private · 2,400+ readings</span>
            </div>
          </>
        )}

        {phase === 'reading' && (
          <div className="flex flex-col items-center py-8 animate-fade-in">
            <Avatar />
            <p className="text-gray-700 text-center mt-4 mb-3 font-serif text-lg">
              Evelyn is reading your {cfg.beatNoun}…
            </p>
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
              className="mt-4 mb-4 w-40 md:w-48 rounded-lg overflow-hidden border border-gray-200"
              style={optionStyle(card, true)}
            />
            <p className="text-gray-700 text-center text-sm md:text-base leading-relaxed mb-6">
              {cardRead(device, hook, card)}
            </p>
            <button
              onClick={() => goToChat(card)}
              className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              data-testid="read-continue"
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
