import { useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { QuickReplyButtons } from "../components/QuickReplyButtons";
import { PermissionButton } from "../components/PermissionButton";
import { PurchaseCTA } from "../components/PurchaseCTA";
import { ClearingChoiceCard } from "../components/ClearingChoiceCard";
import { CommitmentGateCard } from "../components/CommitmentGateCard";
import { BumpOfferCard } from "../components/BumpOfferCard";
import { DownsellCTA } from "../components/DownsellCTA";
import { BackgroundMusic } from "../components/BackgroundMusic";
import { useConversation } from "../hooks/useConversation";
import { isSlidingCloseVariant } from "@shared/types";
import { resolveBumpCents, V1_BUMP_CENTS, pairedBumpBucket } from "@shared/orderBump";
import { Volume2, Send, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { funnelPath } from "../lib/funnel";

export default function ChatPage() {
  const {
    chat,
    handleSend,
    handleBucketSelect,
    handlePermission,
    startPurchase,
    answerBump,
  } = useConversation();

  const searchString = useSearch();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Stick-to-bottom: true while the user is at/near the bottom. If they scroll
  // up to read history, we stop yanking them down on new messages.
  const atBottomRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const redirected = useRef(false);

  // Detect return from Stripe checkout and redirect to upsell page
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const sessionId = params.get("session_id");
    const purchased = params.get("purchased");

    // After successful purchase, redirect to upsell page
    if (sessionId && purchased === "true" && !redirected.current) {
      redirected.current = true;
      navigate(`${funnelPath("/welcome1")}?session_id=${sessionId}`);
    }
  }, [searchString, navigate]);

  // Track whether the user is near the bottom (so we don't fight them if they
  // scroll up). Threshold gives a little slack for momentum scrolling.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distanceFromBottom < 80;
  };

  // Auto-scroll to follow new messages + the typing indicator — but only while
  // the user is stuck to the bottom. rAF waits for the new bubble to lay out so
  // scrollHeight is accurate; behavior:'auto' snaps instantly (no smooth-lag as
  // bubbles stream in).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      // Re-check at scroll time: the user may have scrolled up between this
      // effect running and the frame firing.
      if (!atBottomRef.current) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [chat.messages, chat.isTyping]);

  // Re-pin to bottom when the container itself resizes — e.g. the input footer
  // appearing/disappearing (which shrinks the list) or the mobile keyboard
  // opening. Without this the last message slips ~one input-bar below the fold.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (atBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Focus input when enabled. preventScroll: focusing an input at the bottom
  // would otherwise scroll it into view (yanking a scrolled-up user down) — let
  // the guarded auto-scroll effect own scroll position instead.
  useEffect(() => {
    if (chat.inputEnabled && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [chat.inputEnabled]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input && input.value.trim()) {
      // Sending always re-sticks to bottom — she should see her message + reply
      // even if she'd scrolled up to re-read.
      atBottomRef.current = true;
      handleSend(input.value);
      input.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-0 md:p-4 overflow-hidden">
      <CosmicBackground />
      <BackgroundMusic />

      <div className="w-full max-w-lg h-full md:h-[90vh] flex flex-col bg-white/95 backdrop-blur-md md:rounded-2xl shadow-2xl overflow-hidden border border-white/20 relative z-10">
        {/* Header */}
        <header className="bg-bg-mid text-white p-4 flex items-center justify-between gap-2 shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary">
                <img
                  src="/evelyn-avatar.png"
                  alt="Evelyn"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-mid animate-pulse"></div>
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg leading-none">
                Evelyn Cross
              </h1>
              <span className="text-xs text-green-400 font-medium">
                Online Now
              </span>
            </div>
          </div>
          <Link href="/">
            <button
              className="text-white/70 hover:text-white text-sm"
              data-testid="button-exit"
            >
              Exit
            </button>
          </Link>
        </header>

        {/* Volume Notice */}
        <div className="bg-purple-100 text-purple-900 px-4 py-2 text-xs flex items-center justify-center gap-2 font-medium shrink-0">
          <Volume2 className="w-3 h-3" />
          <span>Turn up your volume for the best experience.</span>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-smooth"
          data-testid="container-chat-messages"
        >
          {/* Welcome Date */}
          <div className="text-center text-xs text-gray-400 my-4">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              hour: "numeric",
              minute: "numeric",
            })}
          </div>

          {/* Messages */}
          {chat.messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <div
                  key={msg.id}
                  className="text-center text-xs text-gray-400 my-2"
                >
                  {msg.content}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex w-full ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${msg.type}-${msg.id}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm md:text-base leading-relaxed ${
                    msg.type === "user"
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  }`}
                >
                  {/* Drawn-card artwork (fb-tarot Version B/C opener only). The
                      strips are N-up sheets, so one card is shown by cropping via
                      background-position — the numbers come from
                      tarotReads.cardArtFor(), the same helper the lander reveal
                      uses, so chat and lander can never show different cards for
                      the same draw. */}
                  {msg.cardArt && (
                    <div
                      data-testid={`message-card-art-${msg.id}`}
                      role="img"
                      aria-label={msg.cardArt.alt}
                      className={`${msg.cardArt.wide ? "w-full" : "w-28 md:w-32"} mb-3 rounded-lg overflow-hidden border border-gray-200 shadow-sm`}
                      style={{
                        aspectRatio: `${msg.cardArt.aspect}`,
                        backgroundImage: `url('${msg.cardArt.url}')`,
                        backgroundSize: `${msg.cardArt.sizePct}% 100%`,
                        backgroundPosition: `${msg.cardArt.posPct}% center`,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  )}
                  {msg.content}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {chat.isTyping && (
            <div
              className="flex justify-start w-full animate-fade-in"
              data-testid="indicator-typing"
            >
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Elements */}
        <div className="shrink-0">
          {/* Bucket Selection */}
          {chat.showBucketButtons && (
            <QuickReplyButtons onSelect={handleBucketSelect} />
          )}

          {/* Permission Button */}
          {chat.showPermissionButton && (
            <PermissionButton onClick={handlePermission} />
          )}

          {/* Purchase CTA. Sliding-scale close ('55-35*' variants) swaps the
              single button for the two-tier choice card ($35 grace offering +
              $55 full offering — the grace charge rides the normal downsell
              checkout: same product + upsell path server-side). The fb-palm
              commitment-gate variant (35_palm_gate) swaps it for a 3-checkbox
              gate instead — same startPurchase("main") call, gated behind all
              3 boxes being checked. Classic variants keep today's PurchaseCTA
              byte-identical.

              All three route through startPurchase, which plays the order-bump
              turn first for leads in that arm and is a straight pass-through to
              handlePurchase for everyone else. */}
          {chat.showPurchaseCTA &&
            (isSlidingCloseVariant(chat.userData.priceVariantId) ? (
              <ClearingChoiceCard
                onFullOffering={() => startPurchase("main")}
                onGraceOffering={() => startPurchase("downsell")}
                fullDollars={chat.userData.priceDollars ?? 55}
                graceDollars={chat.userData.downsellDollars ?? 35}
              />
            ) : chat.userData.commitmentGate === true ? (
              <CommitmentGateCard
                firstName={chat.userData.firstName}
                onConfirm={() => startPurchase("main")}
                priceDollars={chat.userData.priceDollars ?? 35}
              />
            ) : (
              <PurchaseCTA
                onClick={() => startPurchase("main")}
                priceDollars={chat.userData.priceDollars ?? 35}
              />
            ))}

          {/* Order-bump offer. Renders in place of the CTA above (which
              startPurchase has already hidden), so the gate's confirm click
              lands here rather than going straight to Stripe. Outside the bump
              arm startPurchase is a pass-through and this never appears. */}
          {chat.showBumpOffer && (
            <BumpOfferCard
              paired={
                chat.userData.bumpBucket ?? pairedBumpBucket(chat.userData.bucket)
              }
              onAccept={() => answerBump(true)}
              onDecline={() => answerBump(false)}
              // The card must price from the SAME tier the checkout will charge on:
              // a downsell buyer sees $25 + $9.77, not $35 + $12.77.
              mainDollars={
                chat.userData.bumpTier === 'downsell'
                  ? (chat.userData.downsellDollars ?? 25)
                  : (chat.userData.priceDollars ?? 35)
              }
              bumpCents={
                chat.userData.bumpTier === 'downsell'
                  ? resolveBumpCents(chat.userData.bumpCentsDownsell, 'downsell')
                  : V1_BUMP_CENTS
              }
              // COPY SPLIT TEST (2026-08-11) — assigned at lead capture and
              // re-resolved server-side at checkout. Absent ⇒ today's copy.
              variant={chat.userData.bumpCopy ?? 'control'}
              // `?? undefined` because userData carries null for "not captured
              // yet" — variation A's copy branches on absence, and null would
              // otherwise be rendered into the greeting.
              firstName={chat.userData.firstName ?? undefined}
            />
          )}

          {/* Downsell CTA */}
          {chat.showDownsellCTA && (
            <DownsellCTA
              onClick={() => startPurchase("downsell")}
              priceDollars={chat.userData.downsellDollars ?? 25}
              label={
                isSlidingCloseVariant(chat.userData.priceVariantId)
                  ? `Begin My Energy Clearing - $${chat.userData.downsellDollars ?? 35}`
                  : undefined
              }
            />
          )}

          {/* Input Area */}
          {chat.inputEnabled &&
            !chat.showBucketButtons &&
            !chat.showPermissionButton && (
              <div className="p-4 bg-white border-t border-gray-100">
                <form
                  onSubmit={onSubmit}
                  className="relative flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type={chat.inputType}
                    placeholder={chat.inputPlaceholder}
                    onKeyDown={handleKeyDown}
                    disabled={!chat.inputEnabled}
                    className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all border border-transparent focus:bg-white disabled:opacity-50"
                    autoFocus
                    data-testid="input-chat-message"
                  />
                  <button
                    type="submit"
                    disabled={!chat.inputEnabled}
                    className="absolute right-1.5 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="text-center mt-2">
                  <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Private & Confidential Reading
                  </span>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
