import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch, useLocation, Link } from "wouter";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Sparkles,
  Clock,
  LogOut,
  ChevronDown,
  Coins,
  Brain,
} from "lucide-react";

// Types matching the backend schema
interface PersonaPricing {
  freeMinutes: number;
  packages: Array<{
    id: string;
    label: string;
    minutes: number;
    priceUsd: number;
  }>;
}

interface Persona {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  categories: string | null;
  isActive: boolean;
  customPricing?: string | null;
}

interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  sentAt: string;
}

interface SessionData {
  id: string;
  personaId: string;
  status: string;
  startedAt: string;
  durationSeconds: number;
  minutesCharged: number;
}

interface MemoryContext {
  hasPriorMemory: boolean;
  lastTopic: string | null;
  sessionCount: number;
  summary: string | null;
}

export default function ChatServicePage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();

  // Persona state
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [personasLoading, setPersonasLoading] = useState(true);

  // Session state
  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Credit state
  const [creditMinutes, setCreditMinutes] = useState(0);
  const [freeMinutesRemaining, setFreeMinutesRemaining] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [personaPricing, setPersonaPricing] = useState<PersonaPricing | null>(null);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse persona from URL
  const params = new URLSearchParams(searchString);
  const urlPersonaSlug = params.get("persona");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Set credit minutes from user
  useEffect(() => {
    if (user) {
      setCreditMinutes(user.creditMinutes);
    }
  }, [user]);

  // Fetch available personas
  useEffect(() => {
    async function fetchPersonas() {
      try {
        const res = await fetch("/api/personas");
        if (res.ok) {
          const data = await res.json();
          setPersonas(data);

          // Select persona from URL or user default or first active
          if (urlPersonaSlug) {
            const match = data.find(
              (p: Persona) => p.slug === urlPersonaSlug,
            );
            if (match) setSelectedPersonaId(match.id);
          } else if (user?.defaultPersonaId) {
            setSelectedPersonaId(user.defaultPersonaId);
          } else if (data.length > 0) {
            setSelectedPersonaId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch personas:", err);
      } finally {
        setPersonasLoading(false);
      }
    }
    fetchPersonas();
  }, [urlPersonaSlug, user?.defaultPersonaId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when available
  useEffect(() => {
    if (session && !isSending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [session, isSending]);

  // Credit countdown timer
  useEffect(() => {
    if (session && session.status === "active") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          // Check credits every 60 seconds
          if (next % 60 === 0) {
            const minutesUsed = Math.ceil(next / 60);
            if (minutesUsed >= creditMinutes) {
              setShowOutOfCredits(true);
              endSession();
            }
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session, creditMinutes]);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);

  // Parse persona pricing when selection changes
  useEffect(() => {
    if (!selectedPersona?.customPricing) {
      setPersonaPricing(null);
      return;
    }
    try {
      const parsed =
        typeof selectedPersona.customPricing === "string"
          ? JSON.parse(selectedPersona.customPricing)
          : selectedPersona.customPricing;
      setPersonaPricing({
        freeMinutes: parsed.freeMinutes ?? 0,
        packages: Array.isArray(parsed.packages) ? parsed.packages : [],
      });
    } catch {
      setPersonaPricing(null);
    }
  }, [selectedPersona?.customPricing]);

  // Start a chat session
  const startSession = useCallback(async () => {
    if (!selectedPersonaId) return;

    try {
      const res = await authFetch("/api/chat-service/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: selectedPersonaId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Backend returns { sessionId, personaId, personaName, remainingMinutes, pricing }
        setSession({
          id: data.sessionId,
          personaId: data.personaId,
          status: "active",
          startedAt: new Date().toISOString(),
          durationSeconds: 0,
          minutesCharged: 0,
        });
        setMessages([]);
        setMemoryContext(data.memoryContext || null);
        setElapsedSeconds(0);
        if (data.remainingMinutes !== undefined) {
          setCreditMinutes(data.remainingMinutes);
        }
        if (data.freeMinutesRemaining !== undefined) {
          setFreeMinutesRemaining(data.freeMinutesRemaining);
        }
      } else if (res.status === 402) {
        setShowOutOfCredits(true);
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }, [selectedPersonaId]);

  // End the current session
  const endSession = useCallback(async () => {
    if (!session) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const res = await authFetch(
        `/api/chat-service/session/${session.id}/end`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setCreditMinutes(data.remainingMinutes ?? creditMinutes);
      }
    } catch (err) {
      console.error("Failed to end session:", err);
    } finally {
      setSession(null);
      setMessages([]);
      setElapsedSeconds(0);
    }
  }, [session, creditMinutes]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!session || isSending || !content.trim()) return;

      const userMessage: ChatMessageData = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: content.trim(),
        sentAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setIsTyping(true);

      try {
        const res = await authFetch(
          `/api/chat-service/session/${session.id}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content.trim() }),
          },
        );

        if (res.ok) {
          const data = await res.json();
          // Backend returns { message, remainingMinutes, sessionStatus }
          const assistantMsg: ChatMessageData = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.message,
            sentAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          if (data.remainingMinutes !== undefined) {
            setCreditMinutes(data.remainingMinutes);
          }
        } else if (res.status === 402) {
          setShowOutOfCredits(true);
          await endSession();
        }
      } catch (err) {
        console.error("Failed to send message:", err);
      } finally {
        setIsTyping(false);
        setIsSending(false);
      }
    },
    [session, isSending, endSession],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input && input.value.trim()) {
      sendMessage(input.value);
      input.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const minutesUsed = Math.ceil(elapsedSeconds / 60);
  const creditPercent = creditMinutes > 0
    ? Math.max(0, ((creditMinutes - minutesUsed) / creditMinutes) * 100)
    : 0;

  // Loading states
  if (authLoading || personasLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center z-10">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Preparing your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-0 md:p-4 overflow-hidden">
      <CosmicBackground />

      <div className="w-full max-w-lg h-full md:h-[90vh] flex flex-col bg-white/95 backdrop-blur-md md:rounded-2xl shadow-2xl overflow-hidden border border-white/20 relative z-10">
        {/* Header */}
        <header className="bg-bg-mid text-white p-4 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {selectedPersona && (
                <>
                  <div className="relative">
                    <Avatar className="w-10 h-10 border-2 border-secondary">
                      <AvatarImage
                        src={selectedPersona.avatarUrl || "/evelyn-avatar.png"}
                        alt={selectedPersona.displayName}
                      />
                      <AvatarFallback>
                        {selectedPersona.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {session && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-mid animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h1 className="font-serif font-bold text-lg leading-none">
                      {selectedPersona.displayName}
                    </h1>
                    {selectedPersona.tagline && (
                      <span className="text-xs text-white/60">
                        {selectedPersona.tagline}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {session && (
                <Badge
                  variant="outline"
                  className="text-white border-white/30 font-mono text-xs"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(elapsedSeconds)}
                </Badge>
              )}
              <button
                onClick={logout}
                className="text-white/70 hover:text-white text-sm"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Credit bar */}
          {session && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-white/60">
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {Math.max(0, creditMinutes - minutesUsed)} min remaining
                  {freeMinutesRemaining > 0 && (
                    <span className="text-green-400">
                      ({freeMinutesRemaining} free)
                    </span>
                  )}
                </span>
                <span>{creditMinutes} min total</span>
              </div>
              <Progress value={creditPercent} className="h-1.5" />
            </div>
          )}
        </header>

        {/* Persona selector (when no active session) */}
        {!session && personas.length > 1 && (
          <div className="p-4 border-b border-gray-100 bg-gray-50/80">
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">
              Choose your guide
            </label>
            <Select
              value={selectedPersonaId || ""}
              onValueChange={(val) => setSelectedPersonaId(val)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select a persona" />
              </SelectTrigger>
              <SelectContent>
                {personas
                  .filter((p) => p.isActive)
                  .map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      <div className="flex items-center gap-2">
                        <span>{persona.displayName}</span>
                        {persona.tagline && (
                          <span className="text-muted-foreground text-xs">
                            - {persona.tagline}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Memory context indicator */}
        {memoryContext && memoryContext.hasPriorMemory && !session && (
          <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 flex items-center gap-2 text-xs text-purple-700 shrink-0">
            <Brain className="w-3.5 h-3.5" />
            <span>
              {selectedPersona?.displayName} remembers your last conversation
              {memoryContext.lastTopic
                ? ` about ${memoryContext.lastTopic}`
                : ""}
              {memoryContext.sessionCount > 1
                ? ` (${memoryContext.sessionCount} sessions)`
                : ""}
            </span>
          </div>
        )}

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-smooth"
        >
          {/* No session - start prompt */}
          {!session && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-8">
              {selectedPersona && (
                <>
                  <Avatar className="w-20 h-20 border-4 border-purple-200">
                    <AvatarImage
                      src={
                        selectedPersona.avatarUrl || "/evelyn-avatar.png"
                      }
                      alt={selectedPersona.displayName}
                    />
                    <AvatarFallback className="text-2xl">
                      {selectedPersona.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-serif text-xl text-gray-900 mb-1">
                      {selectedPersona.displayName}
                    </h2>
                    {selectedPersona.tagline && (
                      <p className="text-sm text-gray-500">
                        {selectedPersona.tagline}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {personaPricing && personaPricing.freeMinutes > 0 && creditMinutes <= 0 && (
                      <p className="text-sm text-green-600 font-medium">
                        {personaPricing.freeMinutes} free minutes included
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      You have{" "}
                      <span className="font-semibold text-purple-600">
                        {creditMinutes} minutes
                      </span>{" "}
                      of reading time available.
                    </p>
                    {personaPricing && personaPricing.packages.length > 0 && (
                      <p className="text-xs text-gray-400">
                        Starting at $
                        {(
                          Math.min(
                            ...personaPricing.packages.map((p) => p.priceUsd),
                          ) / 100
                        ).toFixed(2)}{" "}
                        for {Math.min(...personaPricing.packages.map((p) => p.minutes))} min
                      </p>
                    )}
                    <Button
                      onClick={startSession}
                      disabled={
                        creditMinutes <= 0 &&
                        !(personaPricing && personaPricing.freeMinutes > 0)
                      }
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-full shadow-lg"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Begin Reading
                    </Button>
                    {creditMinutes <= 0 &&
                      !(personaPricing && personaPricing.freeMinutes > 0) && (
                        <p className="text-xs text-red-500 mt-2">
                          You need credits to start a session.{" "}
                          <Link
                            href={
                              selectedPersonaId
                                ? `/credits?personaId=${selectedPersonaId}`
                                : "/credits"
                            }
                            className="underline font-medium"
                          >
                            Purchase credits
                          </Link>
                        </p>
                      )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Active session messages */}
          {session && (
            <>
              <div className="text-center text-xs text-gray-400 my-4">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  hour: "numeric",
                  minute: "numeric",
                })}
              </div>

              {memoryContext && memoryContext.hasPriorMemory && (
                <div className="text-center text-xs text-purple-500 my-2 flex items-center justify-center gap-1">
                  <Brain className="w-3 h-3" />
                  {selectedPersona?.displayName} remembers your previous
                  sessions
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm md:text-base leading-relaxed ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start w-full animate-fade-in">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        {session && (
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <form
              onSubmit={onSubmit}
              className="relative flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Type your message..."
                onKeyDown={handleKeyDown}
                disabled={isSending}
                className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all border border-transparent focus:bg-white disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSending}
                className="absolute right-1.5 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Private & Confidential
              </span>
              <button
                onClick={endSession}
                className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        )}

        {/* Bottom bar when no session */}
        {!session && (
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <Link href="/personas" className="hover:text-purple-600 transition-colors">
                Browse All Guides
              </Link>
              <Link
                href={
                  selectedPersonaId
                    ? `/credits?personaId=${selectedPersonaId}`
                    : "/credits"
                }
                className="hover:text-purple-600 transition-colors flex items-center gap-1"
              >
                <Coins className="w-3 h-3" />
                Get More Credits
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Out of Credits Modal */}
      <Dialog open={showOutOfCredits} onOpenChange={setShowOutOfCredits}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Your Reading Time Has Ended
            </DialogTitle>
            <DialogDescription>
              You've used all your available credit minutes.
              {selectedPersona && (
                <span>
                  {" "}
                  {selectedPersona.displayName} will remember everything from
                  this session when you return.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Link
              href={
                selectedPersonaId
                  ? `/credits?personaId=${selectedPersonaId}`
                  : "/credits"
              }
            >
              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg hover:shadow-xl transition-all">
                <Coins className="w-4 h-4 mr-2" />
                Purchase More Credits
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowOutOfCredits(false);
                navigate("/personas");
              }}
            >
              Browse Other Guides
            </Button>
          </div>
          <DialogFooter>
            <p className="text-xs text-gray-400 text-center w-full">
              Your conversation is saved and your guide will remember you.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
