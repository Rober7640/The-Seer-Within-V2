import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'wouter'
import { CosmicBackground } from '@/components/CosmicBackground'
import { bookingFirstName } from '@/lib/funnel'

// Offer 12 — Lucky Numbers: the ESL (improve-v1/v1-one-time-BEs/docs/12/sales-emails/12-E2-esl-A.md,
// arm A — "small miracles") rendered as a standalone long-form web sales page.
//
// Its ONLY job is to show Evelyn's letter and send the reader to the EXISTING booking page
// (/numerology/lucky-numbers), carrying ?fn= (first name) and ?c= (letter code) — plus any utm_* —
// STRAIGHT THROUGH, so booking → checkout → Stripe metadata + PostHog attribution all keep working
// unchanged. There is NO checkout logic here; every CTA is a link to the booking page.
//
// ⚠ ARM A ONLY (operator, 2026-11-16): arm B ("the hand-over list") has never been mailed, so the
// page serves the arm that actually sells. If arm B is ever broadcast, this page would branch on ?c=
// (1–5 → A, 11–15 → B); until then it is the single arm, and the reader's own ?c= still rides through
// to the booking page unchanged. Copy source: 12-E2-esl-A.md, kept whole (incl. the "work out your
// first number" taste). Arm A promises small miracles flatly — no sums, no jackpot.
//
// Tracking: lander_view fires AUTOMATICALLY from App.tsx because this route sits under the
// /numerology/lucky-numbers prefix (getPostHogFunnel → 'luckynumbers'), so a mailed link to this page
// reports clicks + revenue via the same funnel the booking page uses. No per-page event here.
//
// Visual language mirrors this offer's BookingPage.tsx and 11's SalesPage.tsx: CosmicBackground
// starfield, a white "sheet" for the letter, Playfair (font-serif) headings, purple-gradient CTAs,
// Evelyn's avatar. No tarot cards — 12 is a numbers reading — and no hero photo (IMG-1 not shot yet).

// AWeber's `| capitalize` filter, matched: only the first letter.
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[16.5px] leading-[1.72] text-gray-800 md:text-[17px]">{children}</p>
}

function H({ children }: { children: ReactNode }) {
  // Section subheadlines — bold Playfair so each lands harder than the body (as 11, Joel 2026-11-16).
  return <h2 className="mb-3 mt-9 font-serif text-[21px] font-bold leading-tight text-gray-900 md:text-[25px]">{children}</h2>
}

function Sum({ children }: { children: ReactNode }) {
  // The worked-example lines (IMG-2 is optional, so the maths reads as styled text, not a picture).
  return <p className="my-3 text-center font-serif text-[21px] font-semibold tracking-wide text-gray-900">{children}</p>
}

function CTA({ href, label }: { href: string; label: string }) {
  return (
    <div className="my-7 text-center">
      <Link
        href={href}
        className="inline-block w-full max-w-md rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 font-serif text-[17px] font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl md:text-[19px]"
        data-testid="cta-sales"
      >
        {label} &nbsp;→
      </Link>
    </div>
  )
}

// The 1–9 "what your first number says" lines, in the letter's words.
const LUCK_LINES: [string, string][] = [
  ['1', 'Your luck comes when you go first. A new job, a first visit, the first to put a hand up. It comes on the days you start something, and never while you wait for someone else to move.'],
  ['2', 'Your luck comes through another person. An introduction, a phone call, a second chance. It comes on the second try, so don’t stop after the first.'],
  ['3', 'Your luck comes through talk. A chance remark, a word from a neighbour, a chat you nearly skipped. It finds you out among people, not at home with the door shut.'],
  ['4', 'Your luck comes slowly, and on paper. Forms, contracts, a deed, a letter about a pension or a house. It comes after the work’s done, never in a rush.'],
  ['5', 'Your luck comes with change. A trip, a move, a stranger, a plan that falls through and makes room for a better one. It comes fast and it doesn’t wait for you.'],
  ['6', 'Your luck comes through home and family. A house, a gift, a quarrel that finally mends. It comes at your own table, or through the people who sit at it.'],
  ['7', 'Your luck comes when you’re on your own. A hunch, something you find, an answer that turns up in the quiet. It comes after you’ve stopped looking.'],
  ['8', 'Your luck comes through work and business. An offer, a deal, a better role. It comes after you’ve asked for it out loud, and not before.'],
  ['9', 'Your luck comes at endings. You let something go, and something good comes back to you. It comes as one thing closes, like a job, a lease or a long wait.'],
]

// "What your numbers are for" — the uses list (arm A's lottery bullet: small miracles, not a win).
const USES: [string, string][] = [
  ['Raffles, lottery and sweepstakes.', 'Play your six numbers, and buy on an open day. This is where small miracles turn up most: the raffle at the fair, a scratch card that pays back, a draw that finally goes your way. Not the jackpot, dear. The small ones. And you made me a promise up there.'],
  ['Your PIN.', 'Change it to the four digits in your reading. You type it in every week, so let it be a number that works for you.'],
  ['Your twelve open days.', 'One in every month of 2027. Do the things that matter on them: ask for the yes, send the form, make the call.'],
  ['Your home.', 'Choose a house or flat whose number carries one of yours. If you’re moving in 2027, sign on an open day.'],
  ['Your phone.', 'Next time you change your number, pick one that holds yours.'],
  ['A wedding date.', 'Your own, or one you’ve got a say in.'],
  ['A job interview.', 'Ask for it on an open day, at an hour that carries one of your numbers. And if an offer comes, say yes on an open day too.'],
  ['A business.', 'Open the doors on an open day, not on whatever day the sign man can come.'],
  ['Travel.', 'Book your trips around your open days. Where you get a choice, pick the flight and the hotel room that carry your numbers.'],
]

// The "within 24 hours" delivery list.
const WHAT_YOU_GET = [
  'your three lucky numbers, and what each one means for you',
  'six numbers to play on any ticket or raffle, built from your three',
  'a four-digit PIN, built from your numbers',
  'your twelve open days in 2027, one in every month, with the date of each',
  'the one number to stop using, and where to look for it',
  'every use above, with your own numbers filled in',
]

export default function LuckyNumbersSalesPage() {
  // ?fn= — read once (it also persists to sessionStorage for the booking page). Nothing is
  // displayed unless she arrived with a name; the letter reads to "dear" otherwise.
  const firstName = useMemo(() => bookingFirstName(), [])
  const name = firstName ? cap(firstName) : null
  const comma = name ? `, ${name}` : ''

  // The CTA target: the EXISTING booking page, carrying this page's whole query string
  // (fn + c, and any utm_*) straight through so attribution + Stripe metadata survive.
  const bookingHref = useMemo(() => {
    const search = typeof window !== 'undefined' ? window.location.search : ''
    return `/numerology/lucky-numbers${search}`
  }, [])

  const sentinel = useRef<HTMLDivElement>(null)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    document.title = 'Lucky Numbers — a reading by Evelyn Cross'
  }, [])

  // Sticky CTA appears once the masthead has scrolled away.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <CosmicBackground />

      {/* ── Sticky CTA bar (after the masthead) ── */}
      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-amber-300/70 bg-[#1b1430]/95 px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-center">
            <Link
              href={bookingHref}
              className="inline-block w-full max-w-md rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-center font-serif text-[16px] font-bold text-white shadow-lg transition-all hover:shadow-xl"
              data-testid="cta-sticky"
            >
              Get my lucky numbers &nbsp;→
            </Link>
          </div>
        </div>
      )}

      <div className="relative z-10 px-4 pb-16 pt-6 md:py-14">
        <div className="mx-auto max-w-2xl">
          {/* ── Masthead on the starfield ── */}
          <header className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-[0.35em] text-secondary">
              A reading by Evelyn Cross
            </div>
            <h1 className="mx-auto mt-2 font-serif text-[26px] leading-[1.18] text-white md:mt-3 md:text-[38px]">
              {name ? `${name}, give` : 'Give'} me one evening and I&rsquo;ll reveal the lucky numbers that bring you
              small miracles in 2027:
            </h1>
            {/* The three small miracles as their own bullets (operator, 2026-11-16) — the payoff of
                the headline, read one at a time rather than a run-on after the colon. */}
            <ul className="mx-auto mt-4 flex max-w-xs flex-col gap-2 text-left md:mt-5">
              {['a raffle that goes your way', 'a cheque you weren’t expecting', 'a yes you’d stopped waiting for'].map(
                (miracle) => (
                  <li key={miracle} className="flex items-start gap-2.5 text-[16px] leading-snug text-purple-100/90 md:text-[18px]">
                    <span aria-hidden="true" className="mt-[3px] shrink-0 text-amber-300">✦</span>
                    <span>{miracle}</span>
                  </li>
                ),
              )}
            </ul>
            <p className="mx-auto mt-3 max-w-xl text-[15px] italic leading-snug text-purple-100/85 md:text-[17px]">
              Small ones, dear. Not the jackpot. Your three lucky numbers, six to play, a new PIN, and twelve dates in
              2027 to use them on. All from your birth name and your birth date.
            </p>
          </header>

          <div ref={sentinel} aria-hidden="true" className="h-px" />

          {/* ── The letter, on a white sheet ── */}
          <article className="mt-6 rounded-2xl bg-white/97 p-5 shadow-2xl ring-1 ring-white/20 md:mt-8 md:p-10">
            <div className="mx-auto max-w-xl">
              {/* Salutation + who's writing */}
              <div className="mb-5 flex items-center gap-3">
                <img
                  src="/evelyn-avatar.png"
                  alt="Evelyn Cross"
                  className="h-12 w-12 shrink-0 rounded-full border-2 border-amber-300/70 object-cover"
                />
                <div className="text-left">
                  {name && <P>{`${name} —`}</P>}
                  <p className="text-[16.5px] leading-snug text-gray-800">Evelyn here.</p>
                </div>
              </div>

              <P><strong>Your lucky numbers are going to bring you small miracles in 2027.</strong></P>
              <P>The raffle at the church fair, the one you always buy a strip for. A refund you&rsquo;d given up on. A letter that finally says yes, about the flat or the job or the thing you asked for months ago.</P>
              <P>I read numbers as well as cards, dear. The cards show me what&rsquo;s coming. For the when and the which, I go to the numbers, and they&rsquo;re the most exact thing I do.</P>
              <P>Give me one evening with your birth name and your birth date, and I&rsquo;ll hand you the numbers that bring those small miracles in.</P>

              <H>What a small miracle is</H>
              <P>A small miracle isn&rsquo;t the jackpot. I won&rsquo;t tell you it is, and you&rsquo;d be right to close this if I did.</P>
              <P>A small miracle is the thing that goes your way when it had no reason to. The raffle. The cheque from somewhere you&rsquo;d forgotten about. The phone call on the very day you needed it.</P>
              <P>{`You've had them before${comma}. You called them chance. They weren't chance. They came on days when your numbers and the calendar lined up.`}</P>

              <H>How your numbers work</H>
              <P>Your numbers come from two things: the day you were born and the name you were given.</P>
              <P>The calendar has numbers too. Every month carries one, and so does every single day. On most days, the calendar&rsquo;s numbers and yours don&rsquo;t line up. On a few days they do. I call those your open days. You get twelve in 2027, one in every month.</P>
              <P>On an open day, small miracles find you easily. The rest of the year, your numbers still work for you wherever you put them: on a ticket, in your PIN, on your front door.</P>
              <P>Most women never get told any of this. So their open days go by like any other day. They stay in. They put the call off till Monday. And luck comes round, finds nobody home, and moves on.</P>
              <P>Here&rsquo;s why nobody tells you. A newspaper horoscope is written for millions of people at once. Your numbers are yours alone. Somebody has to sit down and work them out, and almost nobody does.</P>

              <H>Before you read on, promise me one thing</H>
              <P>Some of you thought of a ticket the second you read my first line. I&rsquo;m not cross. I&rsquo;d have thought of it too.</P>
              <P>So here&rsquo;s my condition, and I mean it.</P>
              <P>You won&rsquo;t chase it. You won&rsquo;t spend money you need on tickets because a day is marked. You won&rsquo;t buy ten where you&rsquo;d have bought one. An open day is a day to turn up. You don&rsquo;t bet the house on it.</P>
              <P>If you can promise me that, read on. If you can&rsquo;t, close this now, and I&rsquo;ll think no less of you.</P>
              <P>Promised? Good. Let&rsquo;s find your first number.</P>

              <H>Work out your first number. It takes a minute.</H>
              <P>Find a pen and the back of an envelope.</P>
              <P>Write your birth date as numbers: the month, the day and the full year.</P>
              <P>Here&rsquo;s a made-up date, so you can see how it goes. Say someone was born on March 14, 1961. March is the 3rd month. So you write 3, then 14, then 1961.</P>
              <P>Now add up every digit, one at a time:</P>
              <Sum>3 + 1 + 4 + 1 + 9 + 6 + 1 = 25</Sum>
              <P>You&rsquo;ve still got two digits, so add those as well:</P>
              <Sum>2 + 5 = 7</Sum>
              <P>When there&rsquo;s one digit left, you stop. That date gives a 7.</P>
              <P>Now do yours. If you land on a two-digit number, keep adding. A 10 becomes 1 + 0, which is 1. You&rsquo;ll always finish on a number from 1 to 9.</P>
              <P>Got it? Here&rsquo;s what yours says.</P>

              <H>What your first number says about your luck</H>
              <ul className="mb-4 space-y-2.5">
                {LUCK_LINES.map(([n, text]) => (
                  <li key={n} className="flex gap-3 text-[16.5px] leading-[1.6] text-gray-800 md:text-[17px]">
                    <span className="font-serif text-[19px] font-bold text-purple-700">{n}.</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <P>{`Read yours twice${comma}. Then think about the last time luck really found you. I'd bet it came the way your number says.`}</P>

              <H>Your first number on a ticket</H>
              <P>Here&rsquo;s something you can use tonight.</P>
              <P>Every number that adds back down to yours carries it. Say you&rsquo;re a 7. Then 7, 16, 25, 34 and 43 all carry your 7, because 1 + 6 is 7, 2 + 5 is 7, and so on up.</P>
              <P>Those five make one family, and it&rsquo;s yours. Write it down.</P>
              <P>Your six ticket numbers come from three families like that one, one for each of your lucky numbers. You&rsquo;ve just found the first family. The other two need your birth name.</P>

              <H>What your first number can&rsquo;t tell you</H>
              <P>Your first number shows you how luck reaches you. For the when, and for the full six, you need more than one number.</P>
              <P>You&rsquo;ve got three lucky numbers, not one. Your second and third come from your full birth name. That means the name on your birth certificate, not the one you go by now. Every letter in that name carries a number. They have to be counted a certain way.</P>
              <P>And your dates need all three. I lay your three numbers against 2027, day by day, and mark the one day in each month where they line up.</P>
              <P>There&rsquo;s one more thing in there, and I&rsquo;d be wrong to leave it out.</P>

              <H>The number you need to stop using</H>
              <P>There&rsquo;s a number working against you, dear.</P>
              <P>Not one of your three. A different one, and it clashes with them. You&rsquo;ve been carrying it around every day without knowing.</P>
              <P>Look in the places you use most. Your house number. Your phone number. The PIN you punch in at the shop. That number sits in one of them, or close to it.</P>
              <P>Every time you use it, you&rsquo;re leaning on the wrong number. You won&rsquo;t notice much on an ordinary day. On an open day it gets in the way of the luck that&rsquo;s trying to reach you.</P>
              <P>I&rsquo;ll name the number in your reading and tell you where to look for it. Most of the time it&rsquo;s easy to fix. A new PIN takes you two minutes at the bank, and your reading gives you the four digits to change it to.</P>

              <CTA href={bookingHref} label="I want my lucky numbers for 2027" />

              <H>What your numbers are for</H>
              <P>Once you&rsquo;ve got your numbers, here&rsquo;s what you do with them.</P>
              <ul className="mb-4 list-disc space-y-2 pl-5 text-[16.5px] leading-[1.6] text-gray-800 marker:text-purple-400 md:text-[17px]">
                {USES.map(([lead, rest]) => (
                  <li key={lead}><strong>{lead}</strong> {rest}</li>
                ))}
              </ul>
              <P>Each of these comes in your reading with your own numbers filled in.</P>

              <CTA href={bookingHref} label="Fill these in with my numbers" />

              <H>In plain terms, what do you do now?</H>
              <P>One thing.</P>
              <P>You put your birth name and date on this page. That&rsquo;s your full birth name, the one on your certificate, and your date of birth. That&rsquo;s all I need from you.</P>
              <P>Please don&rsquo;t send them to me by email. Put them on the page, so nothing goes astray.</P>
              <P>I&rsquo;ll sit with yours one evening. Within 24 hours, your reading is in your inbox:</P>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[16.5px] leading-[1.6] text-gray-800 marker:text-purple-400 md:text-[17px]">
                {WHAT_YOU_GET.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <CTA href={bookingHref} label="Put my details on the page" />

              <H>Why I&rsquo;d do it before the year turns</H>
              <P>{`Your first open day is in January${comma}. That's closer than it feels.`}</P>
              <P>If you&rsquo;ve got your numbers before New Year, you can plan around them. You can change the PIN, book the trip, and put January&rsquo;s date in your diary with a ring round it.</P>
              <P>If you don&rsquo;t, January&rsquo;s day comes and goes like every open day you&rsquo;ve ever had. You won&rsquo;t even know it was there.</P>

              <P>You&rsquo;ve had good days you couldn&rsquo;t explain. You&rsquo;ve had runs of bad ones you couldn&rsquo;t explain either.</P>
              <P>Neither was your fault. You weren&rsquo;t doing it wrong. Nobody ever gave you your numbers.</P>

              <CTA href={bookingHref} label="Let me reveal your lucky numbers" />

              <P>Here&rsquo;s how it goes.</P>
              <P>A day from now your reading is in your inbox. You see your three numbers. You copy your six onto the back of the raffle book. You change your PIN. You find out which number&rsquo;s been working against you, and where it&rsquo;s been hiding.</P>
              <P>You put the twelve dates in your diary. Then 2027 starts, and the small miracles start coming your way. The raffle. The cheque you&rsquo;d forgotten about. The yes. And when one comes, you&rsquo;ll know it was no accident.</P>
              <P>Give me one evening with your birth name and date, dear.</P>

              <CTA href={bookingHref} label="Work out my numbers for me" />

              <P>Your friend, with a pen ready for your calendar,</P>
              <p className="mt-4 font-serif text-[18px] text-gray-900">&mdash; Evelyn</p>
            </div>
          </article>

          {/* ── Footer ── */}
          <footer className="mx-auto mt-8 max-w-2xl px-2 text-center">
            <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-purple-200/60">
              <Link href="/privacy"><span className="cursor-pointer hover:text-white/80">Privacy Policy</span></Link>
              <span>|</span>
              <Link href="/terms"><span className="cursor-pointer hover:text-white/80">Terms of Service</span></Link>
              <span>|</span>
              <Link href="/refund"><span className="cursor-pointer hover:text-white/80">Refund Policy</span></Link>
            </div>
            <p className="text-[11px] italic leading-relaxed text-purple-200/40">
              For entertainment purposes only. A reading is not a substitute for professional advice.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
