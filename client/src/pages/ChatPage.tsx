import { useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { QuickReplyButtons } from "../components/QuickReplyButtons";
import { PermissionButton } from "../components/PermissionButton";
import { PurchaseCTA } from "../components/PurchaseCTA";
import { DownsellCTA } from "../components/DownsellCTA";
import { BackgroundMusic } from "../components/BackgroundMusic";
import { useConversation } from "../hooks/useConversation";
import { Volume2, Send, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { funnelPath } from "../lib/funnel";

export default function ChatPage() {
  const {
    chat,
    handleSend,
    handleBucketSelect,
    handlePermission,
    handlePurchase,
  } = useConversation();

  const searchString = useSearch();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages, chat.isTyping]);

  // Focus input when enabled
  useEffect(() => {
    if (chat.inputEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chat.inputEnabled]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input && input.value.trim()) {
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

          {/* Purchase CTA */}
          {chat.showPurchaseCTA && (
            <PurchaseCTA
              onClick={() => handlePurchase("main")}
              priceDollars={chat.userData.priceDollars ?? 35}
            />
          )}

          {/* Downsell CTA */}
          {chat.showDownsellCTA && (
            <DownsellCTA
              onClick={() => handlePurchase("downsell")}
              priceDollars={chat.userData.downsellDollars ?? 25}
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
