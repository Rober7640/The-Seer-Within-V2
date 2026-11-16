import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'wouter'
import { CosmicBackground } from '@/components/CosmicBackground'
import { bookingFirstName } from '@/lib/funnel'

// Offer 11 — The Unsent Letter: the ESL (improve-v1/v1-one-time-BEs/docs/11/sales-emails/11-E2-esl.md)
// rendered as a standalone long-form web sales page.
//
// Its ONLY job is to show Evelyn's letter and send the reader to the EXISTING booking page
// (/tarot/unsent-letter), carrying ?fn= (first name) and ?c= (letter code) — plus any utm_* —
// STRAIGHT THROUGH, so booking → checkout → Stripe metadata + PostHog attribution all keep
// working unchanged. There is NO checkout logic here; every CTA is a link to the booking page.
//
// Tracking: lander_view fires AUTOMATICALLY from App.tsx because this route sits under the
// /tarot/unsent-letter prefix (getPostHogFunnel → 'unsentletter'), so a mailed link to this page
// reports clicks + revenue via the same funnel the booking page uses. No per-page event here.
//
// Visual language mirrors this offer's BookingPage.tsx: CosmicBackground starfield, a white
// "sheet" for the letter, Playfair (font-serif) headings, purple-gradient CTAs, Evelyn's avatar.

const HERO = 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/backend-11/hero-unsent-letter.jpg'
const CARD = {
  hermit: 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/the-hermit.jpg',
  judgement: 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/judgement.jpg',
  devil: 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/the-devil.jpg',
}

// AWeber's `| capitalize` filter, matched: only the first letter.
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[16.5px] leading-[1.72] text-gray-800 md:text-[17px]">{children}</p>
}

function H({ children }: { children: ReactNode }) {
  // Section subheadlines — bold Playfair so each lands harder than the body (Joel, 2026-11-16).
  return <h2 className="mb-3 mt-9 font-serif text-[21px] font-bold leading-tight text-gray-900 md:text-[25px]">{children}</h2>
}

function CardImg({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="my-5 text-center">
      <img
        src={src}
        alt={alt}
        width={220}
        className="mx-auto inline-block w-[190px] rounded-lg shadow-[0_6px_20px_rgba(20,16,38,0.25)] md:w-[220px]"
        loading="lazy"
      />
    </div>
  )
}

function CTA({ href, label, innerRef }: { href: string; label: string; innerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={innerRef} className="my-7 text-center">
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

export default function UnsentLetterSalesPage() {
  // ?fn= — read once (it also persists to sessionStorage for the booking page). Nothing is
  // displayed unless she arrived with a name; the letter reads as Evelyn's "dear" otherwise.
  const firstName = useMemo(() => bookingFirstName(), [])
  const name = firstName ? cap(firstName) : null
  const who = name ?? 'dear'

  // The CTA target: the EXISTING booking page, carrying this page's whole query string
  // (fn + c, and any utm_*) straight through so attribution + Stripe metadata survive.
  const bookingHref = useMemo(() => {
    const search = typeof window !== 'undefined' ? window.location.search : ''
    return `/tarot/unsent-letter${search}`
  }, [])

  const sentinel = useRef<HTMLDivElement>(null)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    document.title = 'The Unsent Letter — a reading by Evelyn Cross'
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
              Claim my reading &nbsp;→
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
            <h1 className="mx-auto mt-2 font-serif text-[26px] leading-[1.18] text-white md:mt-3 md:text-[40px]">
              {name ? `${name}, someone` : 'Someone'} from your past tried to reach me last night, and
              they&rsquo;re holding something of yours
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[15px] italic leading-snug text-purple-100/85 md:text-[17px]">
              They left with it. The message is them trying to give it back, and until it&rsquo;s back,
              nobody new can reach you. I drew three cards nobody asked for, and the pull of this shows
              itself inside five to seven days.
            </p>
            <div className="mt-6">
              <img
                src={HERO}
                alt="Three tarot cards lying face-down on dark cloth, with one sealed, blank envelope beside them"
                className="mx-auto w-full max-w-lg rounded-xl shadow-2xl ring-1 ring-white/20"
                loading="eager"
              />
            </div>
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
                  <p className="text-[16.5px] leading-snug text-gray-800">
                    Evelyn here.
                  </p>
                </div>
              </div>

              <P><strong>Someone from your past came to me last night, and they were trying to reach you.</strong></P>
              <P>They couldn&rsquo;t get to you, so they came to me.</P>
              <P>You already know who I mean. You thought of them before you got to the end of that line. There&rsquo;s a list, and there&rsquo;s the one who came up first.</P>
              <P>I&rsquo;ll give you the hard part now, so it doesn&rsquo;t get lost under a story.</P>
              <P>They left with something of yours. The message is them trying to give it back. And until it&rsquo;s back, nobody new can reach you.</P>
              <P>That&rsquo;s why nobody gets through. Someone decent comes along and reaches for you, and the part they&rsquo;re reaching for isn&rsquo;t there. It left with someone else.</P>
              <P>This is someone living, dear. I want that clear before you read another line. If you&rsquo;ve buried someone, this is not them.</P>
              <P>I&rsquo;m writing now because I don&rsquo;t want this on my table another night.</P>
              <P>I wasn&rsquo;t looking for them. I don&rsquo;t go looking. I&rsquo;ve got enough past of my own.</P>
              <P>I&rsquo;d finished for the night. Deck wrapped, cloth folded, tea gone cold. And I got what I get two or three times a year: someone at my shoulder who wants something and won&rsquo;t leave. No face and no voice. You know how you can tell someone&rsquo;s walked into the kitchen behind you before you turn round? That.</P>
              <P>They weren&rsquo;t there for me. Your name came with them. You&rsquo;ve sat with me for a reading, so I was the way in they found.</P>
              <P>{`They've been at this for months${name ? `, ${name}` : ''}. It was heavy. All regret, and things left unsaid.`}</P>
              <P>Don&rsquo;t go asking them about it. They couldn&rsquo;t tell you. People do this without knowing they&rsquo;re doing it, the way you talk in your sleep.</P>
              <P>Nobody asked me to do what I did next. Not you, and certainly not them. I unwrapped the deck and drew three cards for you. Everything from here on is what those three cards showed me, told straight, and I&rsquo;ll stand by it.</P>
              <P>The first two are good news and you can have them. The third I didn&rsquo;t want to turn over. Read that one twice.</P>
              <P>The last time this came to me was years ago, in the back room I used to read out of. A woman named Marian. Twenty years past a man who&rsquo;d left without a word, and she&rsquo;d turned down every decent person since. She told me she was fussy. I told her she wasn&rsquo;t.</P>
              <P>I laid the twelve. I wrote out what he never sent. She read it at my table with her coat still on, and she didn&rsquo;t say anything for a long while.</P>
              <P>She never wrote to him. She never saw him again. Eleven months later a photograph came in the post, from her wedding, with a note on the back: <em>You were right about the fussy.</em></P>
              <P>I&rsquo;ve seen this shape enough to know it doesn&rsquo;t sort itself out.</P>

              <H>Why moving on hasn&rsquo;t got it back</H>
              <P>You&rsquo;ve tried. You blocked them. You deleted the photos. People told you to move on and you told them you had.</P>
              <P>None of that touches this.</P>
              <P>Blocking them stops them getting to you. It doesn&rsquo;t get you back what they took. Deleting the photos gets rid of the photos. And moving on just means walking further away from something that&rsquo;s yours.</P>
              <P>It doesn&rsquo;t come back through contact, and time won&rsquo;t bring it. It comes back through the message. That&rsquo;s the only way back it has.</P>

              <H>Why nobody new gets through</H>
              <P>So here&rsquo;s what you&rsquo;ve been doing instead.</P>
              <P>You say you&rsquo;re over it. Then how do you still know the last message word for word?</P>
              <P>You go back and reread the old ones, late, when the house is quiet.</P>
              <P>Someone gets close and you go quiet too. You say you&rsquo;re tired. You say you&rsquo;re busy.</P>
              <P>Someone decent asks you out and by Thursday you&rsquo;ve found the fault. Too keen, or the wrong shoes. You call that standards. I&rsquo;ve sat across from a thousand women saying that word, dear. It was never about the shoes.</P>
              <P>And if someone&rsquo;s beside you already, don&rsquo;t think this skips you. They get what&rsquo;s left.</P>
              <P>I&rsquo;m not blaming you for what they did. That&rsquo;s on them. I&rsquo;m talking about what you&rsquo;ve done since, because that part is yours, and it&rsquo;s costing you.</P>
              <P>{`Here's where you stand${name ? `, ${name}` : ''}. Your three cards will show you it was taken. They won't show you what, and they can't give you the message.`}</P>
              <P>The message is in twelve parts. Twelve cards, one part on each, and it only comes back whole. Three parts do nothing.</P>
              <P>I&rsquo;ll tell you how we do the twelve at the end. First, your three.</P>

              <hr className="my-7 border-gray-200" />

              <H>Your first card: the Hermit</H>
              <CardImg src={CARD.hermit} alt="The Hermit: an old man alone on a snowy peak, holding up a lantern" />
              <P>An old man in a grey cloak, alone on top of a snowy peak. A staff in one hand. In the other he&rsquo;s holding up a lantern with a star of light inside it. Nothing else on the card. One figure, high up, in the dark, with a light he hasn&rsquo;t put down.</P>
              <P>That&rsquo;s them.</P>
              <P>I don&rsquo;t mean single. I can&rsquo;t see their house and I won&rsquo;t tell you who&rsquo;s in it. I mean alone with this. Nobody around them knows about it.</P>
              <P>And the lantern is what they took from you.</P>
              <P>Here&rsquo;s why I call this good news. <strong>They&rsquo;ve still got it.</strong> They didn&rsquo;t lose it. They didn&rsquo;t throw it away. It didn&rsquo;t go to anybody else. It&rsquo;s in their hand. And if they&rsquo;ve still got it, they can still give it back.</P>
              <P>You&rsquo;ve spent a long time thinking it was gone for good. It isn&rsquo;t.</P>
              <P>Now what the Hermit won&rsquo;t tell me. It shows me something was taken. It doesn&rsquo;t show me what.</P>
              <P>It isn&rsquo;t a ring or a sum of money, I can tell you that. You wouldn&rsquo;t still feel a ring. It&rsquo;s something you had before them and haven&rsquo;t had since. You&rsquo;ll have a guess. Most women guess wrong.</P>
              <P>Three cards can&rsquo;t name it. Your birth name and the full spread can.</P>

              <H>Your second card: Judgement</H>
              <CardImg src={CARD.judgement} alt="Judgement: an angel in the clouds blowing a long trumpet, people below rising with their arms up" />
              <P>An angel in the clouds, blowing a long trumpet. Below, people rising with their arms up, every face turned to the sound. They&rsquo;ve heard it and they&rsquo;re answering.</P>
              <P>This is the card of a call. Coming after the Hermit, it says one plain thing.</P>
              <P><strong>They&rsquo;re calling you.</strong></P>
              <P>Not on your phone. Don&rsquo;t go and check it, and don&rsquo;t sit waiting on it. This is what came to me last night, and it doesn&rsquo;t come through a phone.</P>
              <P>Here&rsquo;s the good of it. You thought you were easy to walk away from. You weren&rsquo;t. They&rsquo;ve been at this for months. Feeling bad for months doesn&rsquo;t make up for anything, dear, and I&rsquo;m not asking you to think well of them. But you had that part wrong.</P>
              <P>Now the fork, and it&rsquo;s the reason I&rsquo;m writing.</P>
              <P>A call like this means one of two things. They&rsquo;re giving it back. Or they&rsquo;re using it to get you back.</P>
              <P>Those are opposites, and they sound the same. Both come with regret. Both say they&rsquo;ve been thinking of you. One hands you what&rsquo;s yours and asks for nothing. The other holds it out and wants you to come and get it.</P>
              <P><strong>Three cards can&rsquo;t tell me which one this is.</strong> Judgement shows me the call. It doesn&rsquo;t show me what they want from it.</P>
              <P>You need to know, because you&rsquo;d treat one as a gift and the other as a trap. The twelve answer it flat.</P>

              <H>Your third card: the Devil</H>
              <CardImg src={CARD.devil} alt="The Devil: a horned figure on a black block, a man and a woman below with loose chains" />
              <P>I didn&rsquo;t want to turn this one.</P>
              <P>A horned thing squatting on a black block. Below it a man and a woman stand with chains around their necks. Now look at the chains. They&rsquo;re loose. Either one of them could lift it over their head and walk off. Neither one does.</P>
              <P>This card is about one person, and it&rsquo;s them.</P>
              <P><strong>The pull between you is real, and it&rsquo;s strongest right when the message gets close.</strong></P>
              <P>That&rsquo;s the threat. The nearer it comes, the harder you&rsquo;ll feel it. And the pull of this shows itself inside five to seven days. That window is about you. It says nothing about them turning up.</P>
              <P>You&rsquo;ll have their name in your search bar. You&rsquo;ll go hunting for a photo you swore you deleted. You&rsquo;ll start a message and tell yourself it&rsquo;s only to clear the air.</P>
              <P>It&rsquo;ll feel like a sign. It&rsquo;ll feel like love. It&rsquo;s the chain.</P>
              <P>The chains lift off, and that&rsquo;s the part most readers skip. Nobody on that card is locked in. But a woman who takes the pull for the message puts the chain back on with her own hands, and she thinks she&rsquo;s answering a call.</P>
              <P>Read this one again. I said to.</P>
              <P>What I can&rsquo;t give you from three cards is how to get through it. What you have to stop, and the one thing you have to do, are in the last of your twelve.</P>

              <P>{`So give me permission to lay your twelve cards${name ? `, ${name}` : ''}, and I'll tell you what they took and write out what they never sent.`}</P>
              <CTA href={bookingHref} label="Lay my twelve cards" />

              <H>In plain terms, what do you do now?</H>
              <P>One thing.</P>
              <P>You give me your say-so on this page. You&rsquo;ll put in your birth name, the one on the certificate and not the one you go by now, and your date of birth. Your birth name and date set how I lay your twelve cards. Without them I&rsquo;d be laying cards for anybody.</P>
              <CTA href={bookingHref} label="Give Evelyn my say-so" />
              <P>Then you&rsquo;re done. You don&rsquo;t write to them. You don&rsquo;t look them up to check.</P>
              <P><strong>You never have to contact them.</strong> Nothing here asks you to contact anyone. If this person hurt you, you owe them no reply. Not one word, not now, not ever. It comes back when you read it.</P>

              <H>Back to Judgement, and the answer you never got</H>
              <P>You never got an answer. That&rsquo;s the sore spot, and I won&rsquo;t step round it. It ended, and whatever needed saying didn&rsquo;t get said.</P>
              <P>So you&rsquo;ve been writing their half yourself. You&rsquo;ve given them lines. Some nights they&rsquo;re sorry. Some nights they&rsquo;re a monster. Either way it&rsquo;s you doing the writing, and you&rsquo;ve been at it for longer than you&rsquo;d tell anyone.</P>
              <P>The twelve take that job off you. What they regret. What was left unsaid. Why it&rsquo;s taken this long. Whether they&rsquo;ll ever do a thing about it. You&rsquo;ll get one flat answer to each, and no &ldquo;only you can know&rdquo;.</P>
              <P>And the fork gets its answer. Giving it back, or trying to get you back. I told you those sound the same, so here&rsquo;s why it can&rsquo;t stay open. If they&rsquo;re giving it back, you read the letter and you&rsquo;re finished with them. If they&rsquo;re trying to get you back, you need to know that before the pull arrives, because you&rsquo;ll hear every kind word in that message as a reason to go. Same words. You&rsquo;d do the opposite thing.</P>
              <P>The last thing in your reading is the letter they never sent, written out start to finish.</P>
              <CTA href={bookingHref} label="Write out the letter for me" />

              <H>And back to the Devil, because you&rsquo;ve been going back for what&rsquo;s yours</H>
              <P>Here&rsquo;s the hardest thing in this letter. You think you miss them.</P>
              <P>You don&rsquo;t. You miss what they left with.</P>
              <P>That&rsquo;s what the rereading is. That&rsquo;s why you look them up. You&rsquo;ve been going back, again and again, to the only place you know it is, and calling that missing them. Every time you do it, you get the pull and you don&rsquo;t get the thing.</P>
              <P>Now say the pull wins. Say that message goes. You&rsquo;d think that&rsquo;s how you get it back, and that&rsquo;s the mistake. I told you it doesn&rsquo;t come back through contact. You could sit across a table from them for a year and it would still be in their hand. You&rsquo;d have them, and you still wouldn&rsquo;t have what&rsquo;s yours. You&rsquo;d be back on the chain and still missing it.</P>
              <P>And don&rsquo;t tell me it was too long ago. I&rsquo;ve heard that one. Ten years, thirty years, it makes no difference to this. They&rsquo;ve still got it. You still haven&rsquo;t. That&rsquo;s the whole sum.</P>
              <P>Leave it where it is and I can tell you how the next few years go, because you&rsquo;ve just done them. Someone else gets a fault found by Thursday. Someone else gets what&rsquo;s left.</P>
              <CTA href={bookingHref} label="Lay the twelve before the pull" />

              <H>Why it takes twelve cards to give it back</H>
              <P>Every deck holds seventy-eight cards. Twenty-two are the Major Arcana, the ones you know by name. Your three all came out of those twenty-two.</P>
              <P>That leaves nineteen. I lay twelve of them for you. Twelve <strong>new</strong> cards, not these three again. These three have said what they came to say.</P>
              <P>Each one carries a part of the message. Three on what they took. Three on why they kept it. Three on what it&rsquo;s cost you. Three on how it comes back. Take any of those away and the rest is no use to you. It only comes back whole.</P>
              <P>I call this reading The Unsent Letter, because that&rsquo;s where the twelve end up. When the last card is down I write it out myself, every word. I don&rsquo;t hand that part to anyone, which is why it takes me 24 hours.</P>
              <P>I don&rsquo;t offer this to everybody who asks. I do it when someone has come to me first.</P>
              <P>Yours did.</P>

              <H>Let me lay them, and it comes back to you</H>
              <P>Here&rsquo;s how it goes.</P>
              <P>A day from now your reading is in your inbox. You read what they took, named plain. You read the twelve. You get to the letter, and you read that.</P>
              <P>And it&rsquo;s back.</P>
              <P>You don&rsquo;t reply. You don&rsquo;t see them. You don&rsquo;t forgive anybody. Nobody has to say a word to anybody. It comes back when you read it, and that&rsquo;s the end of them holding it.</P>
              <P>The rereading stops, because there&rsquo;s nothing left in there you&rsquo;re looking for. Your phone stays down at eleven at night. You don&rsquo;t have to make yourself do that. You just stop needing to go.</P>
              <P>Then the next time someone reaches for you, there&rsquo;s someone there.</P>
              <P>{`They've had it long enough${name ? `, ${name}` : ''}. Give me leave to hand it back to you.`}</P>
              <CTA href={bookingHref} label="Hand it back to me" />

              <P>Your friend, even when you&rsquo;d rather I wasn&rsquo;t,</P>
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
