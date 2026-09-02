import { useEffect, useRef, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { CosmicBackground } from "../../components/CosmicBackground";
import { BackgroundMusic } from "../../components/BackgroundMusic";
import { Upsell2CTA, Upsell2DownsellCTA, ShippingForm, QuickReplies } from "../../components/upsell";
import { useUpsell2Chat } from "../../hooks/useUpsell2Chat";
import { upsell2CopyForOffer } from "../../lib/backendOffers";
import { isBackendOfferKey, BACKEND_OFFER_CATALOG, type BackendOfferKey } from "@shared/backendOffers";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Bucket } from "@shared/types";

// The shared, session-driven /offers/upsell/welcome2 — the counterpart to
// Upsell2Page.tsx. Resolves BOTH the offer and its Upsell-2 pitch from the
// booking session, so one route serves every backend offer in the deck.
// Always backend-mode (`/api/backend/upsell/*`, `backendOverride: true`);
// fires no V1 tracking. On completion it does not go to a shared /success —
// it hands off to THIS offer's own success page from the catalog.

interface UserData {
  firstName: string;
  email: string;
  bucket: Bucket;
  concern: string;
  personName: string | null;
  upsellPurchased: boolean;
  hasShipping: boolean;
  shipping: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  } | null;
}

export default function OffersUpsell2() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [offer, setOffer] = useState<BackendOfferKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

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
        const userDataUrl = `/api/backend/upsell/user-data?session_id=${encodeURIComponent(sid as string)}`;

        let response = await fetch(userDataUrl);

        // Retry once after 2s if first attempt fails (handles brief server delays),
        // same as Upsell2Page.tsx.
        if (!response.ok) {
          await new Promise((r) => setTimeout(r, 2000));
          response = await fetch(userDataUrl);
        }

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

  const copy = offer ? upsell2CopyForOffer(offer) : null;

  const {
    messages,
    isTyping,
    showQuickReplies,
    quickReplies,
    inputEnabled,
    showCTA,
    showDownsellCTA,
    showShippingForm,
    isProcessing,
    isComplete,
    upsell2Bought,
    downsellDeclineLabel,
    showContinue,
    continueLabel,
    handleContinue,
    handleUserInput,
    handleQuickReply,
    handleAccept,
    handleDecline,
    handleDownsellAccept,
    handleDownsellDecline,
    handleShippingSubmit,
  } = useUpsell2Chat({
    userData,
    sessionId,
    enabled: !!userData && !!copy && !error,
    braceletImage: "/manifestation_bracelet.png",
    copyOverride: copy ?? undefined,
    backendOverride: true,
  });

  // Auto-scroll to bottom. Same footer-grower deps as Upsell2Page.tsx.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping, showQuickReplies, showContinue, showCTA, showDownsellCTA, showShippingForm]);

  // On completion (bought full/downsell + shipped, OR declined — the hook sets
  // isComplete for both, see useUpsell2Chat's DECLINED/COMPLETE stages), go to
  // THIS offer's own success page, not a shared one.
  useEffect(() => {
    if (isComplete && sessionId && offer) {
      const successPath = BACKEND_OFFER_CATALOG[offer].successPath;
      navigate(`${successPath}?s=${encodeURIComponent(sessionId)}`);
    }
  }, [isComplete, sessionId, offer, navigate]);

  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && inputEnabled) {
      handleUserInput(inputValue.trim());
      setInputValue("");
    }
  };

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
  // offer key. Mirrors Upsell2Page.tsx's error branch.
  if (error) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="text-purple-400 hover:text-purple-300 transition-colors"
            data-testid="link-return-home"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh relative flex flex-col" data-testid="page-upsell2">
      <CosmicBackground />
      <BackgroundMusic />

      <div className="relative z-10 p-4 text-center border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-sm text-white/60">
          <Volume2 className="w-4 h-4" data-testid="icon-volume-upsell2" />
          <span>Sound on for best experience</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
        data-testid="container-chat-upsell2"
      >
        <div className="max-w-lg mx-auto space-y-4">
          <div className="text-center text-xs text-gray-400 my-4">
            {new Date().toLocaleDateString(undefined, { weekday: "long", hour: "numeric", minute: "numeric" })}
          </div>

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
                    alt="Manifestation bracelet"
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

          {isTyping && (
            <div className="flex justify-start w-full animate-fade-in" data-testid="indicator-typing-upsell2">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showQuickReplies || showContinue || (inputEnabled && !showCTA && !showDownsellCTA && !showShippingForm) || showCTA || showDownsellCTA || showShippingForm) && (
      <div className="relative z-10 shrink-0 bg-black/30 backdrop-blur-sm border-t border-white/10">
        {/* Continue tap — one button, no branch, nothing captured. */}
        {showContinue && (
          <QuickReplies
            replies={[{ text: continueLabel, value: "continue" }]}
            onSelect={handleContinue}
            disabled={isTyping}
          />
        )}

        {showQuickReplies && (
          <QuickReplies
            replies={quickReplies}
            onSelect={handleQuickReply}
            disabled={isTyping}
          />
        )}

        {inputEnabled && !showCTA && !showDownsellCTA && !showShippingForm && (
          <form onSubmit={handleSubmitInput} className="p-4 pt-0" data-testid="form-chat-input-upsell2">
            <div className="flex gap-2 max-w-lg mx-auto">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Or type your response..."
                disabled={isTyping}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                data-testid="input-chat-upsell2"
              />
              <Button
                type="submit"
                disabled={isTyping || !inputValue.trim()}
                size="sm"
                data-testid="button-send-upsell2"
              >
                Send
              </Button>
            </div>
          </form>
        )}

        {showCTA && (
          <div className="max-w-lg mx-auto">
            <Upsell2CTA
              onAccept={handleAccept}
              onDecline={handleDecline}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {showDownsellCTA && (
          <div className="max-w-lg mx-auto">
            <Upsell2DownsellCTA
              onAccept={handleDownsellAccept}
              onDecline={handleDownsellDecline}
              isProcessing={isProcessing}
              declineLabel={downsellDeclineLabel}
            />
          </div>
        )}

        {showShippingForm && (
          <div className="max-w-lg mx-auto p-4">
            <ShippingForm
              defaultName={userData?.firstName || ""}
              productLabel="manifestation bracelet"
              onSubmit={handleShippingSubmit}
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
}
