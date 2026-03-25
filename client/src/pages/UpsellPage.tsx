import { useEffect, useRef, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { BackgroundMusic } from "../components/BackgroundMusic";
import { UpsellCTA, ShippingForm, QuickReplies } from "../components/upsell";
import { useUpsellChat, Message } from "../hooks/useUpsellChat";
import { trackPurchase } from "../lib/facebook";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Bucket } from "@shared/types";
import lavaStoneImage from "../assets/images/lava-stone.jpg";

interface UserData {
  firstName: string;
  email: string;
  bucket: Bucket;
  personName: string | null;
  stripeCustomerId?: string | null;
}

const PURCHASE_TRACKED_KEY = "seer_purchase_tracked";

export default function UpsellPage() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

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

    // Fetch user data from database
    async function fetchUserData() {
      try {
        const response = await fetch(`/api/upsell/user-data?session_id=${sid}`);

        if (!response.ok) {
          throw new Error("Order not found");
        }

        const data = await response.json();
        setUserData(data);

        // Track Purchase event for initial $35 payment (user arrived at upsell page)
        // Only fire once per session to avoid duplicates on page refreshes
        const purchaseKey = `${PURCHASE_TRACKED_KEY}_${sid}`;
        if (!sessionStorage.getItem(purchaseKey)) {
          trackPurchase(35, "USD", data.email);
          sessionStorage.setItem(purchaseKey, "true");
        }

        // If coming back from declined fallback
        if (declined === "true") {
          setError("declined");
        }
      } catch (err) {
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  // Redirect to upsell2 immediately when complete
  useEffect(() => {
    if (isComplete && sessionId) {
      navigate(`/welcome2?session_id=${sessionId}`);
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
    <div
      className="min-h-screen relative flex flex-col"
      data-testid="page-upsell"
    >
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
        className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
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
      {(showQuickReplies || (inputEnabled && !showCTA && !showShippingForm) || showCTA || showShippingForm) && (
      <div className="relative z-10 shrink-0 bg-black/30 backdrop-blur-sm border-t border-white/10">
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
