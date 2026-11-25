import { useEffect, useRef, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { BackgroundMusic } from "../components/BackgroundMusic";
import { UpsellCTA, ShippingForm, QuickReplies } from "../components/upsell";
import { useUpsellChat, Message } from "../hooks/useUpsellChat";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Bucket } from "@shared/types";
import lavaStoneImage from "../assets/images/lava-stone.jpg";
import { funnelPath, isTwinFlameOffer } from "../lib/funnel";
import { claimMainPurchaseSlot, releaseMainPurchaseSlot, fireMainPurchaseEvents } from "../lib/mainPurchaseEvents";

interface UserData {
  firstName: string;
  email: string;
  bucket: Bucket;
  personName: string | null;
  stripeCustomerId?: string | null;
  upsell1PriceCents?: number;
  // Order-bump amount in cents; 0/absent on every non-bump order.
  bumpAmountCents?: number;
}

export default function UpsellPage() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  // ⚠ These chat pages never scroll INTERNALLY: the message list is
  // `flex-1 overflow-y-auto` inside a `min-h-screen` column, and a flex item's
  // default `min-height: auto` stops it shrinking — so it grows to fit its
  // content, `scrollHeight === clientHeight`, and the auto-scroll effect below
  // is dead code. The document grows instead, which puts every message past
  // roughly the eighth BELOW THE FOLD, along with the footer that holds the
  // quick replies and the CTA. Measured on this branch: 12 bubbles ⇒ document
  // 1188px against an 880px viewport, `window.scrollY` still 0.
  //
  // Offer 02 opts into the fix (`h-screen` + `min-h-0`) because its flow pauses
  // on a tap the buyer has to be able to see. The same one-line fix is pending
  // for V1 / fb / fb2 / fb-palm / fb-tarot / gdn — it changes what live buyers
  // see, so it is an operator decision, not a tidy-up.
  const pinnedShell = isTwinFlameOffer();

  // Parse URL params
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const sid = params.get("session_id");
    const demo = params.get("demo");
    const declined = params.get("declined");

    // Demo mode for testing
    if (demo === "true" || sid === "demo") {
      setSessionId("demo_session");
      setUserData({
        firstName: "Sarah",
        email: "demo@example.com",
        bucket: "love",
        personName: null,
        stripeCustomerId: null,
      });
      setIsLoading(false);
      return;
    }

    if (!sid) {
      setError("Missing session");
      setIsLoading(false);
      return;
    }

    setSessionId(sid);
    const orderId: string = sid;

    // Claim the dedup slot synchronously before any async work, so a parallel
    // re-mount can't fire trackPurchase twice with the same event_id. Mirrors
    // SoulmateUpsellPage.tsx pattern. On a funnel with the SMS in-between page
    // (<funnel>/preparing) that page normally claims + fires first, so this is
    // then the BACKUP and does nothing (same key — see lib/mainPurchaseEvents).
    const shouldTrack = claimMainPurchaseSlot(orderId);

    // Fetch user data from database
    async function fetchUserData() {
      try {
        // The backend funnel reads its own endpoint (Stripe-direct, no conversations)
        // and — crucially — fires NONE of the V1 ad/affiliate tracking below: backend
        // traffic is email, not Facebook, and its `be_` products are walled off from
        // Meta/Google/Trackdesk everywhere else too. V1's path is unchanged.
        const beFunnel = isTwinFlameOffer();
        const response = await fetch(
          beFunnel
            ? `/api/backend/upsell/user-data?session_id=${sid}`
            : `/api/upsell/user-data?session_id=${sid}`,
        );

        if (!response.ok) {
          throw new Error("Order not found");
        }

        const data = await response.json();
        setUserData(data);

        if (shouldTrack && !beFunnel) {
          // Main purchase events ($35 + order bump) — unchanged, moved to a shared
          // helper so the SMS in-between page can fire them first.
          fireMainPurchaseEvents(orderId, data);
        }

        // If coming back from declined fallback
        if (declined === "true") {
          setError("declined");
        }
      } catch (err) {
        // Release the dedup slot so a retry on remount can fire.
        if (shouldTrack) {
          releaseMainPurchaseSlot(orderId);
        }
        setError("Could not load your session");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [searchString]);

  // Use the upsell chat hook
  const {
    messages,
    isTyping,
    showQuickReplies,
    quickReplies,
    inputEnabled,
    showCTA,
    showShippingForm,
    isProcessing,
    isComplete,
    upsellPriceLabel,
    acceptLabel,
    showContinue,
    continueLabel,
    handleContinue,
    handleUserInput,
    handleQuickReply,
    handleAccept,
    handleDecline,
    handleShippingSubmit,
  } = useUpsellChat({
    userData,
    sessionId,
    enabled: !!userData && !error,
    lavaStoneImage,
  });

  // Auto-scroll to bottom. The footer flags are deps on purpose: when the quick
  // replies / continue tap, CTA or shipping form appear the footer grows and eats
  // height off the message list, which would otherwise clip the newest bubble.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    // showQuickReplies is V1's footer-grower; showContinue is twin-flame's — both
    // shrink the scroll container, so both re-scroll (merge of development + 447bf74).
  }, [messages, isTyping, showQuickReplies, showContinue, showCTA, showShippingForm]);

  // Redirect to upsell2 immediately when complete
  useEffect(() => {
    if (isComplete && sessionId) {
      navigate(`${funnelPath("/welcome2")}?session_id=${sessionId}`);
    }
  }, [isComplete, sessionId, navigate]);

  // Handle free text input
  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && inputEnabled) {
      handleUserInput(inputValue.trim());
      setInputValue("");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="text-white/60 animate-pulse flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your session...
        </div>
      </div>
    );
  }

  // Error state
  if (error && error !== "declined") {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={() => navigate(funnelPath("/"))}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-dvh relative flex flex-col"
      data-testid="page-upsell"
    >
      <CosmicBackground />
      <BackgroundMusic
        // Offer 02 moves the toggle to the TOP right, beside the "Sound on"
        // notice it belongs with. A bottom offset cannot work: the footer is
        // ~134px at the CTA and ~400px with the shipping form open, so no fixed
        // value clears both. Up here it can never steal a tap from the decline
        // button or the form's submit. Every other funnel keeps the
        // viewport-pinned default — the same pre-existing overlap they have
        // always had, which is not ours to change on live pages.
        positionClass={pinnedShell ? "absolute top-2 right-3" : undefined}
      />

      {/* Header */}
      <div className="relative z-10 p-4 text-center border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-sm text-white/60">
          <Volume2 className="w-4 h-4" data-testid="icon-volume" />
          <span>Sound on for best experience</span>
        </div>
      </div>

      {/* Chat Container */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
        data-testid="container-chat"
      >
        <div className="max-w-lg mx-auto space-y-4">
          {/* SMS opt-in moved OFF this page (Joel, 25 Nov 2026: "we can never put it
              there") — it now has its own in-between page, <funnel>/preparing,
              shown after payment and before Upsell 1 (SmsOptInStepPage). */}

          {/* Date */}
          <div className="text-center text-xs text-gray-400 my-4">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              hour: "numeric",
              minute: "numeric",
            })}
          </div>

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${msg.role}-${msg.id}`}
            >
              {msg.role === "image" ? (
                <div className="max-w-[70%] rounded-2xl overflow-hidden shadow-lg border border-purple-200/30">
                  <img
                    src={msg.content}
                    alt="Volcanic lava stone bracelet"
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm md:text-base leading-relaxed ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
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
      </div>

      {/* Interactive Elements — only render footer when something inside it is visible */}
      {(showQuickReplies || showContinue || (inputEnabled && !showCTA && !showShippingForm) || showCTA || showShippingForm) && (
      <div className="relative z-10 shrink-0 bg-black/30 backdrop-blur-sm border-t border-white/10">
        {/* Continue tap — offer 02 only. One button, no branch, nothing captured. */}
        {showContinue && (
          <QuickReplies
            replies={[{ text: continueLabel, value: "continue" }]}
            onSelect={handleContinue}
            disabled={isTyping}
          />
        )}

        {/* Quick Replies */}
        {showQuickReplies && (
          <QuickReplies
            replies={quickReplies}
            onSelect={handleQuickReply}
            disabled={isTyping}
          />
        )}

        {/* Free Text Input */}
        {inputEnabled && !showCTA && !showShippingForm && (
          <form
            onSubmit={handleSubmitInput}
            className="p-4 pt-0"
            data-testid="form-chat-input"
          >
            <div className="flex gap-2 max-w-lg mx-auto">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Or type your response..."
                disabled={isTyping}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                data-testid="input-chat"
              />
              <Button
                type="submit"
                disabled={isTyping || !inputValue.trim()}
                size="sm"
                data-testid="button-send"
              >
                Send
              </Button>
            </div>
          </form>
        )}

        {/* CTA Buttons */}
        {showCTA && (
          <div className="max-w-lg mx-auto">
            <UpsellCTA
              onAccept={handleAccept}
              onDecline={handleDecline}
              isProcessing={isProcessing}
              priceLabel={upsellPriceLabel}
              acceptLabel={acceptLabel}
            />
          </div>
        )}

        {/* Shipping Form */}
        {showShippingForm && (
          <div className="max-w-lg mx-auto p-4">
            <ShippingForm
              defaultName={userData?.firstName || ""}
              onSubmit={handleShippingSubmit}
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
}
