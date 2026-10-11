// Offer 04 — The Still Cup, the order bump's deliverable (TEA_READING_STILL_CUP_PATH).
//
// Copy source: improve-v1/v1-one-time-BEs/copy/04/04-C4-still-cup-instructional.md — the practice
// itself, never the build notes. Constants: lib/stillCup.ts (checked against the doc by test).
//
// Linked from the receipt's P.S. (bump buyers only) and from 04-T5. It is a fixed URL anyone can
// open, so it says nothing about her order and sells nothing. ⛔ noindex: it is a paid
// deliverable, not a page for search engines.
//
// The salutation is her first name when this tab carried one from the letter (?fn= →
// sessionStorage); with no name the line is cut — never "dear," on its own, never a blank.

import { useEffect, useMemo } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { bookingFirstName } from '@/lib/funnel'
import { STILL_CUP, inlineSegments, type StillCupBlock } from '@/lib/stillCup'
import { displayName } from '@/lib/upsellCopy/types'

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineSegments(text).map((seg, i) =>
        seg.strong ? (
          <strong key={i} className="font-semibold text-gray-900">
            {seg.text}
          </strong>
        ) : seg.em ? (
          <em key={i}>{seg.text}</em>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  )
}

function Block({ block }: { block: StillCupBlock }) {
  if (block.kind === 'step') {
    return (
      <div data-testid="still-cup-step">
        <p className="font-serif text-[18px] font-semibold leading-snug text-gray-900">{block.title}</p>
        {block.text && (
          <p className="mt-1.5">
            <Inline text={block.text} />
          </p>
        )}
      </div>
    )
  }
  return (
    <p>
      <Inline text={block.text} />
    </p>
  )
}

export default function StillCupPage() {
  const name = useMemo(() => displayName(bookingFirstName(), ['Friend']), [])

  useEffect(() => {
    document.title = STILL_CUP.tabTitle
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    meta.setAttribute('data-still-cup', '')
    document.head.appendChild(meta)
    return () => {
      meta.remove()
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <CosmicBackground />

      <div className="relative z-10 px-4 pb-12 pt-8 md:py-14">
        <article
          className="mx-auto max-w-xl rounded-2xl bg-white/97 px-5 py-7 shadow-2xl ring-1 ring-white/20 md:px-10 md:py-10"
          data-testid="still-cup"
        >
          <header className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-[0.35em] text-purple-700/80">Evelyn Cross</div>
            <h1 className="mt-2 font-serif text-[32px] leading-tight text-gray-900 md:text-[38px]">{STILL_CUP.title}</h1>
            <p className="mt-1 font-serif text-[17px] italic text-gray-600">{STILL_CUP.subtitle}</p>
          </header>

          <div className="mt-7 space-y-4 text-[16px] leading-relaxed text-gray-700">
            {name && <p data-testid="text-salutation">{name},</p>}

            {STILL_CUP.sections.map((section, s) => (
              <section key={section.heading ?? `s${s}`} className="space-y-4">
                {section.heading && (
                  <h2 className="border-t border-gray-200 pt-6 font-serif text-[22px] leading-snug text-gray-900">
                    {section.heading}
                  </h2>
                )}
                {section.blocks.map((block, b) => (
                  <Block key={b} block={block} />
                ))}
              </section>
            ))}

            <p className="pt-2 font-serif text-xl text-gray-900">{STILL_CUP.signOff}</p>
          </div>
        </article>
      </div>
    </div>
  )
}
