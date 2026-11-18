import type { BeliefLane } from '@shared/beliefLanes';
import { CTAButton } from './CTAButton';

// The copy under the /fb card for a belief lane (/fb?lane=<id>). Rendered ONLY when
// LandingPage has a valid lane, so plain /fb never mounts it. Every string comes from
// the lane registry (shared/beliefLanes.ts); nothing here is copy.
//
// Same white card as the one above it, so the page reads as one piece. The FAQ is
// shown open (question, then answer), not as a collapsed accordion: nothing on a lane
// page is hidden, which is also what the server HTML Meta reads shows.
export function LaneSections({ lane }: { lane: BeliefLane }) {
  return (
    <section
      className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full mx-auto mt-6 relative z-10 border border-white/20 text-left text-gray-700"
      data-testid="lane-sections"
      data-lane={lane.id}
    >
      {lane.body.map((b, i) => {
        if (b.t === 'h') {
          return (
            <h3 key={i} className="font-serif text-xl md:text-2xl font-bold text-gray-900 leading-snug mt-7 first:mt-0 mb-3">
              {b.text}
            </h3>
          );
        }
        if (b.t === 'p') {
          return (
            <p key={i} className="text-base leading-relaxed mb-3">
              {b.text}
            </p>
          );
        }
        if (b.t === 'list') {
          return (
            <div key={i} className="bg-amber-50 rounded-xl px-4 py-3.5 my-3">
              <p className="text-base leading-relaxed mb-2">{b.lead}</p>
              <ul className="space-y-1.5 mb-2">
                {b.items.map((it, j) => (
                  <li key={j} className="relative pl-6 text-base leading-snug">
                    <span aria-hidden="true" className="absolute left-0.5 top-0 text-amber-700 font-semibold">✓</span>
                    {it}
                  </li>
                ))}
              </ul>
              {b.closer && <p className="text-base leading-relaxed">{b.closer}</p>}
            </div>
          );
        }
        if (b.t === 'faq') {
          return (
            <div key={i} className="border-y border-gray-200 divide-y divide-gray-200" data-testid="lane-faq">
              {b.items.map((it, j) => (
                <div key={j} className="py-3">
                  <h4 className="font-sans font-semibold text-base text-gray-900 mb-1">{it.q}</h4>
                  <p className="text-[15px] leading-relaxed">{it.a}</p>
                </div>
              ))}
            </div>
          );
        }
        // 'ask' — the card's button and the line under it, again.
        return (
          <div key={i} className="mt-6">
            <CTAButton label={lane.card.b} lane={lane.id} />
            <p className="text-center text-xs text-gray-400 mt-4 italic">{lane.card.sc}</p>
          </div>
        );
      })}
    </section>
  );
}
