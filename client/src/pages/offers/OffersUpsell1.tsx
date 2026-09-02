import { useEffect, useRef, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { CosmicBackground } from "../../components/CosmicBackground";
import { BackgroundMusic } from "../../components/BackgroundMusic";
import { UpsellCTA, ShippingForm, QuickReplies } from "../../components/upsell";
import { useUpsellChat } from "../../hooks/useUpsellChat";
import { upsell1CopyForOffer } from "../../lib/backendOffers";
import { isBackendOfferKey, type BackendOfferKey } from "@shared/backendOffers";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Bucket } from "@shared/types";
import lavaStoneImage from "../../assets/images/lava-stone.jpg";

// The shared, session-driven /offers/upsell/welcome1 — the counterpart to
// UpsellPage.tsx (which resolves its copy from the URL prefix). This page
// resolves BOTH the offer and its Upsell-1 pitch from the booking session
// itself, so one route serves every backend offer in the deck (02, 03, …)
// without a per-offer prefix mount. It therefore ALWAYS runs backend-mode
// (`/api/backend/upsell/*`, `backendOverride: true`) and fires no V1 tracking —
// mirroring the beFunnel branch UpsellPage takes for a twin-flame URL, just
// without the URL telling it which offer that is.

interface UserData {
  firstName: string;
  email: string;
  bucket: Bucket;
  personName: string | null;
  stripeCustomerId?: string | null;
  upsell1PriceCents?: number;
  bumpAmountCents?: number;
}

export default function OffersUpsell1() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [offer, setOffer] = useState<BackendOfferKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Parse URL params + fetch the booking session.
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const sid = params.get("session_id");

    if (!sid) {
      setError("Missing session");
      setIsLoading(false);
      return;
    }

    setSessionId(sid);

    async function fetchUserData() {
      try {
        const response = await fetch(
          `/api/backend/upsell/user-data?session_id=${encodeURIComponent(sid as string)}`,
        );

        if (!response.ok) {
          throw new Error("Order not found");
        }

        const data = await response.json();

        if (!isBackendOfferKey(data.offer)) {
          throw new Error("Unknown offer");
        }

        setOffer(data.offer);
        setUserData(data);
      } catch (err) {
        setError("Could not load your session");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [searchString]);

  const copy = offer ? upsell1CopyForOffer(offer) : null;

  // Use the upsell chat hook — pinned to backend-mode + this offer's pitch, so
  // it always hits /api/backend/upsell/* and never the V1 endpoints.
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
    enabled: !!userData && !!copy && !error,
    lavaStoneImage,
    copyOverride: copy ?? undefined,
    backendOverride: true,
  });

  // Auto-scroll to bottom. Same footer-grower deps as UpsellPage.tsx.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping, showQuickReplies, showContinue, showCTA, showShippingForm]);

  // On completion (accept-and-shipped OR decline, the hook sets isComplete for
  // both — see useUpsellChat's DECLINED/COMPLETE stages), carry the session
  // into Upsell 2's shared page. The offer travels implicitly: welcome2 re-reads
  // it from the same booking session.
  useEffect(() => {
    if (isComplete && sessionId) {
      navigate(`/offers/upsell/welcome2?session_id=${encodeURIComponent(sessionId)}`);
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

  // Error state — missing/invalid session, unpaid order, or an unrecognised
  // offer key. Mirrors UpsellPage.tsx's error branch.
  if (error) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh relative flex flex-col" data-testid="page-upsell">
      <CosmicBackground />
      <BackgroundMusic />

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
        {/* Continue tap — one button, no branch, nothing captured. */}
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
