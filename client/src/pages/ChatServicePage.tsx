import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch, useLocation, useRoute, Link } from "wouter";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { calculateTypingDelay, sleep } from "@/lib/typingAnimation";
import { PreReadingWelcome } from "@/components/PreReadingWelcome";
import { GuideSidebar } from "@/components/GuideSidebar";
import TarotCardDraw from "@/components/TarotCardDraw";
import { drawCards, type TarotCard } from "@/lib/tarotCards";
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
  Coins,
  Brain,
  Menu,
  HelpCircle,
  Lock,
  MessageCircle,
  Bookmark,
} from "lucide-react";
import NatalChartWheel, { type NatalChartData } from "@/components/NatalChartWheel";
import CityAutocomplete from "@/components/CityAutocomplete";
import BuyCreditsModal from "@/components/BuyCreditsModal";
import OutOfCreditsModal from "@/components/OutOfCreditsModal";
import TeaserCreditModal from "@/components/TeaserCreditModal";
import SessionFeedbackModal from "@/components/SessionFeedbackModal";
import { COINS_PER_MINUTE, type PricingTier } from "@shared/types";

// Status indicator type
type Status = 'busy-slow' | 'busy-fast' | 'connecting' | 'online';

// Status Indicator Component
function StatusIndicator({ status, text }: { status: Status; text: string }) {
  const getStatusClass = (s: Status) => {
    switch (s) {
      case 'busy-slow': return 'animate-pulse-slow bg-status-busy';
      case 'busy-fast': return 'animate-pulse-fast bg-status-busy';
      case 'connecting': return 'animate-flicker';
      case 'online': return 'animate-glow bg-status-online';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${getStatusClass(status)}`} />
      <span className={`text-xs font-medium ${status === 'online' ? 'text-green-400' : 'text-white/70'}`}>
        {text}
      </span>
    </div>
  );
}

// Pricing data from backend (coin-based)
interface SessionPricing {
  freeCoins: number;
  tiers: PricingTier[];
}

interface Persona {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  description: string | null;
  categories: string | null;
  isActive: boolean;
  customPricing?: string | null;
  personality?: string | null; // JSON: { tone, style, specialties, suggestedQuestions?: string[] }
}

interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  sentAt: string;
  tarotDraw?: boolean;          // show card picker after this message
  isCardReveal?: boolean;       // standalone card reveal display (not a normal bubble)
  tarotCardName?: string;       // card name for reveal display
  tarotCardImageUrl?: string;   // card image for reveal display
  chartData?: NatalChartData;   // renders natal chart wheel when present
}

interface SessionData {
  id: string;
  personaId: string;
  status: string;
  startedAt: string;
  durationSeconds: number;
  coinsCharged: number;
}

interface MemoryContext {
  hasPriorMemory: boolean;
  lastTopic?: string;
  sessionCount: number;
  summary?: string;
  recentTopics?: string[];
}

export default function ChatServicePage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();

  // Get persona slug from path params (e.g., /chat/evelyn-cross)
  const [match, routeParams] = useRoute("/chat/:personaSlug");

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
  // Pre-session greeting: shown before session is created (free, no billing)
  const [preSessionGreeting, setPreSessionGreeting] = useState<string | null>(null);

  // Coin state (60 coins = 1 minute)
  const [coinBalance, setCoinBalance] = useState(0);
  const [freeTrialCoins, setFreeTrialCoins] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [sessionPricing, setSessionPricing] = useState<SessionPricing | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRefillBanner, setShowRefillBanner] = useState(false);
  const [refillBannerDismissed, setRefillBannerDismissed] = useState(false);
  const [teaserMessage, setTeaserMessage] = useState<string | null>(null);
  const [showTeaserModal, setShowTeaserModal] = useState(false);

  // Persona status state
  const [personaStatus, setPersonaStatus] = useState<Status>('busy-slow');
  const [personaStatusText, setPersonaStatusText] = useState('Busy');
  const [isPersonaOffline, setIsPersonaOffline] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [switchingToPersonaSlug, setSwitchingToPersonaSlug] = useState<string | null>(null);
  const [queuedQuestion, setQueuedQuestion] = useState<string | null>(null);

  // Saved messages (bookmarks)
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());

  // Tracks persona IDs where the user has started a real session (sent ≥1 message).
  // Persisted to localStorage so it survives page refreshes and new sessions.
  // Used to suppress the teaser greeting and badge for guides already spoken to.
  const [chattedGuideIds, setChattedGuideIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("seer-chatted-guide-ids");
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set();
  });

  // Idle protection state
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);

  // Feedback modal — shown once after 5 minutes of active session time
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const feedbackTriggeredRef = useRef(false);

  // Birth data form (for astrology personas like Luna Voss)
  // null = checking, true = chart exists (skip form), false = no chart (show form)
  const [birthChartExists, setBirthChartExists] = useState<boolean | null>(null);
  const [birthDataForm, setBirthDataForm] = useState({
    birthDate: '', birthTime: '', birthCity: '', unknownTime: false,
  });
  const [birthDataSubmitting, setBirthDataSubmitting] = useState(false);
  const [birthDataError, setBirthDataError] = useState<string | null>(null);
  const [birthChartSummary, setBirthChartSummary] = useState<{ sun?: string; moon?: string; rising?: string } | null>(null);
  const [storedChartData, setStoredChartData]   = useState<NatalChartData | null>(null);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUserMessageAt = useRef<number | null>(null);
  // Stores a queued question from the instructions screen to auto-send once greeting appears
  const pendingQuestionAfterGreeting = useRef<string | null>(null);
  // Tracks the last persona ID that triggered an auto-fetch, to prevent double-fetching
  const lastAutoFetchedPersonaId = useRef<string | null>(null);

  // Parse persona from URL - check path params first, then query params
  const pathPersonaSlug = routeParams?.personaSlug;
  const queryParams = new URLSearchParams(searchString);
  const queryPersonaSlug = queryParams.get("persona");
  const urlPersonaSlug = pathPersonaSlug || queryPersonaSlug;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Set coin balance from user auth data
  useEffect(() => {
    if (user) {
      const coins = (user as any).coinBalance ?? 0;
      setCoinBalance(coins);
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

  // After confirmSwitch → fetchGreeting resolves, auto-send the queued question
  useEffect(() => {
    if (preSessionGreeting && pendingQuestionAfterGreeting.current) {
      const q = pendingQuestionAfterGreeting.current;
      pendingQuestionAfterGreeting.current = null;
      sendMessage(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSessionGreeting]);

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

  // Persona status transitions (only when no active session)
  useEffect(() => {
    if (session) return; // Don't run status animation during active session

    // Random timer between 5-37 seconds before going online
    const randomDelay = Math.floor(Math.random() * (37000 - 5000 + 1)) + 5000;

    // Phase 1: Busy slow (initial state - already set)
    // Phase 2: Fast pulse at 70% of random time
    const t1 = setTimeout(() => setPersonaStatus('busy-fast'), randomDelay * 0.7);

    // Phase 3: Connecting at 85% of random time
    const t2 = setTimeout(() => {
      setPersonaStatus('connecting');
      setPersonaStatusText('Connecting...');
    }, randomDelay * 0.85);

    // Phase 4: Online at full random time
    const t3 = setTimeout(() => {
      setPersonaStatus('online');
      setPersonaStatusText('Online');
    }, randomDelay);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [session]);

  // Credit countdown timer + refill banner trigger
  useEffect(() => {
    if (session && session.status === "active") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          const coinsPerSecond = 1; // 60 coins/min = 1 coin/sec
          const coinsUsed = next * coinsPerSecond;

          // Show refill banner 30 seconds before free trial ends
          // Only show if user's balance is at/below the free trial amount (not a paying user)
          if (freeTrialCoins > 0 && !refillBannerDismissed && coinBalance <= freeTrialCoins) {
            const freeTrialSeconds = freeTrialCoins / coinsPerSecond;
            if (next >= freeTrialSeconds - 30 && next < freeTrialSeconds) {
              setShowRefillBanner(true);
            }
          }

          // Show feedback modal once after 5 minutes of active session time
          if (next >= 300 && !feedbackTriggeredRef.current) {
            feedbackTriggeredRef.current = true;
            setShowFeedbackModal(true);
          }

          // Check if out of coins every 60 seconds
          if (next % 60 === 0 && coinsUsed >= coinBalance) {
            setShowOutOfCredits(true);
            endSession();
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
  }, [session, coinBalance, freeTrialCoins, refillBannerDismissed]);

  // Idle detection: warn after 2 min of no message sent, auto-end after 3 min
  useEffect(() => {
    if (!session || session.status !== "active") {
      // Clear idle state when session ends
      if (idleCheckRef.current) { clearInterval(idleCheckRef.current); idleCheckRef.current = null; }
      if (idleCountdownRef.current) { clearInterval(idleCountdownRef.current); idleCountdownRef.current = null; }
      setIdleWarning(false);
      setIdleCountdown(60);
      return;
    }

    const IDLE_WARN_MS = 2 * 60 * 1000;  // 2 minutes → show warning
    const IDLE_END_COUNTDOWN = 60;         // 60 seconds countdown then auto-end

    idleCheckRef.current = setInterval(() => {
      const lastMsg = lastUserMessageAt.current;
      if (!lastMsg) return;
      const idleMs = Date.now() - lastMsg;
      if (idleMs >= IDLE_WARN_MS && !idleCountdownRef.current) {
        setIdleWarning(true);
        setIdleCountdown(IDLE_END_COUNTDOWN);
        let remaining = IDLE_END_COUNTDOWN;
        idleCountdownRef.current = setInterval(() => {
          remaining -= 1;
          setIdleCountdown(remaining);
          if (remaining <= 0) {
            if (idleCountdownRef.current) { clearInterval(idleCountdownRef.current); idleCountdownRef.current = null; }
            setIdleWarning(false);
            endSession();
            toast({ title: "Session paused", description: "Your session was paused to protect your credits." });
          }
        }, 1000);
      }
    }, 15000); // check every 15 seconds

    return () => {
      if (idleCheckRef.current) { clearInterval(idleCheckRef.current); idleCheckRef.current = null; }
      if (idleCountdownRef.current) { clearInterval(idleCountdownRef.current); idleCountdownRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);

  // Reset offline state when persona selection changes
  useEffect(() => {
    setIsPersonaOffline(false);
  }, [selectedPersonaId]);

  // Auto-fetch greeting on initial load or when persona changes (only when no active session).
  // For astrology personas we wait for the birth-chart check to resolve before fetching.
  useEffect(() => {
    if (!selectedPersona || personasLoading || session || isStarting || preSessionGreeting || switchingToPersonaSlug) return;
    if (lastAutoFetchedPersonaId.current === selectedPersona.id) return;
    const personality = selectedPersona.personality ? (() => {
      try { return JSON.parse(selectedPersona.personality!); } catch { return {}; }
    })() : {};
    // Block until the birth-chart existence check has resolved
    if (personality?.requiresBirthData && birthChartExists === null) return;
    // If chart is missing, show the form — don't fetch a greeting yet
    if (personality?.requiresBirthData && birthChartExists === false) return;
    lastAutoFetchedPersonaId.current = selectedPersona.id;
    const chartToInject = (personality?.requiresBirthData && birthChartExists === true)
      ? storedChartData
      : null;
    fetchGreeting(undefined, false, chartToInject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona?.id, personasLoading, birthChartExists, storedChartData]);

  // Fetch teaser message when persona changes (for low-credit users)
  // Placed AFTER selectedPersona declaration to avoid temporal dead zone
  useEffect(() => {
    if (!selectedPersona || session) return;
    setTeaserMessage(null);

    const slug = selectedPersona.slug;
    async function fetchTeaser() {
      try {
        const res = await authFetch(`/api/chat-service/teaser/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.locked && data.message) {
            setTeaserMessage(data.message);
          }
        }
      } catch {
        // silently ignore teaser errors
      }
    }
    fetchTeaser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona?.id, session]);

  // Check if a natal chart already exists for astrology personas (e.g. Luna Voss)
  useEffect(() => {
    if (!selectedPersona || session) return;
    const personality = selectedPersona.personality ? (() => {
      try { return JSON.parse(selectedPersona.personality!); } catch { return {}; }
    })() : {};
    if (!personality?.requiresBirthData) {
      setBirthChartExists(null); // not applicable
      return;
    }
    setBirthChartExists(null); // reset while loading
    setBirthChartSummary(null);
    setStoredChartData(null);
    authFetch(`/api/astrology/natal-chart/${selectedPersona.id}`)
      .then(r => r.json())
      .then(data => {
        // Treat legacy charts (exists but no raw chartData) as missing —
        // re-collecting birth info upgrades them to the new format with the visual wheel.
        const hasUsableChart = data.exists && data.chartData != null;
        setBirthChartExists(hasUsableChart);
        if (hasUsableChart) setStoredChartData(data.chartData);
      })
      .catch(() => setBirthChartExists(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona?.id, session]);

  // Parse persona custom pricing when selection changes
  useEffect(() => {
    if (!selectedPersona?.customPricing) {
      setSessionPricing(null);
      return;
    }
    try {
      const parsed =
        typeof selectedPersona.customPricing === "string"
          ? JSON.parse(selectedPersona.customPricing)
          : selectedPersona.customPricing;
      if (parsed.tiers && Array.isArray(parsed.tiers)) {
        setSessionPricing({
          freeCoins: parsed.freeCoins ?? 0,
          tiers: parsed.tiers,
        });
      }
    } catch {
      setSessionPricing(null);
    }
  }, [selectedPersona?.customPricing]);

  // Fetch a free greeting for the selected persona — does NOT create a session or charge credits.
  // Call this when the user clicks "Begin Reading". Session is only created when they send the first message.
  const fetchGreeting = useCallback(async (overrideSlug?: string, appendMode?: boolean, injectChartData?: NatalChartData | null, teaserContent?: string) => {
    const slug = overrideSlug || selectedPersona?.slug;
    if (!slug) return;
    setSwitchingToPersonaSlug(null); // Clear any switching overlay when greeting starts loading
    setIsStarting(true);
    setIsPersonaOffline(false);
    if (!appendMode) {
      setMessages([]);
      setPreSessionGreeting(null);
    }

    const addMsg = (msg: ChatMessageData) => {
      setMessages(prev => [...prev, msg]);
    };

    // If the user clicked through from a sidebar teaser, deliver that message directly
    // without an API round-trip — the guide "says" exactly what was previewed.
    if (teaserContent) {
      setIsTyping(true);
      await sleep(calculateTypingDelay(teaserContent));
      addMsg({
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: teaserContent,
        sentAt: new Date().toISOString(),
      });
      setPreSessionGreeting(teaserContent);
      setPersonaStatus('connecting');
      setPersonaStatusText('Connecting...');
      setTimeout(() => {
        setPersonaStatus('online');
        setPersonaStatusText('Online');
      }, 800);
      setIsStarting(false);
      setIsTyping(false);
      return;
    }

    try {
      const res = await authFetch(`/api/chat-service/greeting/${slug}`);

      if (res.status === 503) {
        // Persona is offline — show offline state, do not fall back to a local greeting
        setIsPersonaOffline(true);
        setIsStarting(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();

        // For returning astrology users: human-feeling chart retrieval sequence
        if (injectChartData) {
          const firstName = (user as any)?.firstName;

          // Step 1: Warm welcome back
          const welcomeText = firstName
            ? `Welcome back, ${firstName}. Good to see you again.`
            : `Welcome back. Good to see you again.`;
          setIsTyping(true);
          await sleep(calculateTypingDelay(welcomeText));
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: `welcome-back-${Date.now()}`,
            role: 'assistant' as const,
            content: welcomeText,
            sentAt: new Date().toISOString(),
          }]);
          await sleep(500);

          // Step 2: Simulate checking for the chart
          const searchText = `Let me check if I still have your chart...`;
          setIsTyping(true);
          await sleep(calculateTypingDelay(searchText) + 1000);
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: `chart-search-${Date.now()}`,
            role: 'assistant' as const,
            content: searchText,
            sentAt: new Date().toISOString(),
          }]);
          await sleep(1400);

          // Step 3: Found it
          const foundText = `I found it. Pulling it out now.`;
          setIsTyping(true);
          await sleep(calculateTypingDelay(foundText));
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: `chart-found-${Date.now()}`,
            role: 'assistant' as const,
            content: foundText,
            sentAt: new Date().toISOString(),
          }]);
          await sleep(700);

          // Step 4: Chart renders
          setMessages(prev => [...prev, {
            id: `chart-wheel-${Date.now()}`,
            role: 'assistant' as const,
            content: '',
            chartData: injectChartData,
            sentAt: new Date().toISOString(),
          }]);
          await sleep(600);
        }

        // Show typing indicator then reveal greeting
        setIsTyping(true);
        const typingDelay = calculateTypingDelay(data.greeting);
        await sleep(typingDelay);

        const greetingMsg: ChatMessageData = {
          id: `greeting-${Date.now()}`,
          role: "assistant",
          content: data.greeting,
          sentAt: new Date().toISOString(),
        };
        addMsg(greetingMsg);
        setPreSessionGreeting(data.greeting);
        setIsTyping(false);


        if (data.pricing) {
          setSessionPricing(data.pricing);
          setFreeTrialCoins(data.pricing.freeCoins ?? 0);
        }

        // Animate status to Online
        setPersonaStatus('connecting');
        setPersonaStatusText('Connecting...');
        setTimeout(() => {
          setPersonaStatus('online');
          setPersonaStatusText('Online');
        }, 800);
      } else if (res.status === 402) {
        setShowOutOfCredits(true);
      } else {
        // API error (e.g. 404/500) — fall back to a local greeting so the user can still chat
        const fallbackGreeting = `Hello! I'm here to help guide you. What's on your mind today?`;
        setIsTyping(true);
        await sleep(1000);
        const greetingMsg: ChatMessageData = {
          id: `greeting-${Date.now()}`,
          role: "assistant",
          content: fallbackGreeting,
          sentAt: new Date().toISOString(),
        };
        addMsg(greetingMsg);
        setPreSessionGreeting(fallbackGreeting);
        setIsTyping(false);
        setPersonaStatus('connecting');
        setPersonaStatusText('Connecting...');
        setTimeout(() => {
          setPersonaStatus('online');
          setPersonaStatusText('Online');
        }, 800);
      }
    } catch (err) {
      console.error("Failed to fetch greeting:", err);
      // Network error — same fallback so the button never silently does nothing
      const fallbackGreeting = `Hello! I'm here to help guide you. What's on your mind today?`;
      setIsTyping(true);
      await sleep(1000);
      const greetingMsg: ChatMessageData = {
        id: `greeting-${Date.now()}`,
        role: "assistant",
        content: fallbackGreeting,
        sentAt: new Date().toISOString(),
      };
      addMsg(greetingMsg);
      setPreSessionGreeting(fallbackGreeting);
      setIsTyping(false);
      setPersonaStatus('online');
      setPersonaStatusText('Online');
    } finally {
      setIsStarting(false);
      setIsTyping(false);
    }
  }, [selectedPersona?.slug, user]);

  // Submit birth data for astrology personas — calculates natal chart and then fetches greeting
  const handleBirthDataSubmit = useCallback(async () => {
    if (!selectedPersona) return;
    setBirthDataError(null);
    setBirthDataSubmitting(true);

    const time = birthDataForm.unknownTime ? '12:00' : birthDataForm.birthTime;

    try {
      const res = await authFetch('/api/astrology/natal-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: birthDataForm.birthDate,
          birthTime: time,
          birthCity: birthDataForm.birthCity,
          personaId: selectedPersona.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBirthDataError(data.error || data.message || 'Something went wrong. Please try again.');
        return;
      }
      // Block the auto-fetch effect from firing a second greeting when birthChartExists flips to true
      lastAutoFetchedPersonaId.current = selectedPersona.id;
      setBirthChartExists(true);
      setBirthChartSummary({ sun: data.sunSign, moon: data.moonSign, rising: data.risingSign });

      // Format birth date for display e.g. "June 15, 1990"
      const [year, month, day] = birthDataForm.birthDate.split('-').map(Number);
      const formattedDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      const firstName = user?.firstName || 'there';
      const city = birthDataForm.birthCity;
      const sun  = data.sunSign  || '';
      const moon = data.moonSign || '';
      const rising = data.risingSign || '';

      // Build-up sequence — paced messages that bring the chart to life
      const sequence = [
        { text: `Thank you, ${firstName}. Give me a moment — I want to do this properly.`, pause: 800 },
        { text: `I'm mapping the sky over ${city} on ${formattedDate}...`, pause: 700 },
        { text: `Placing each planet in the exact position it held the moment you took your first breath.`, pause: 900 },
        { text: `${sun} Sun... ${moon} Moon... ${rising} Rising. Your chart is coming into focus.`, pause: 800 },
        { text: `I'm reading the aspects now — the angles between your planets. This is where things get interesting.`, pause: 900 },
        { text: `All right. I have you.`, pause: 600 },
      ];

      setIsStarting(true);
      setMessages([]);
      setPreSessionGreeting(null);

      for (const step of sequence) {
        setIsTyping(true);
        await sleep(calculateTypingDelay(step.text));
        setMessages(prev => [...prev, {
          id: `chart-reveal-${Date.now()}-${Math.random()}`,
          role: 'assistant' as const,
          content: step.text,
          sentAt: new Date().toISOString(),
        }]);
        setIsTyping(false);
        await sleep(step.pause);
      }

      // Inject the chart wheel as a special message
      if (data.chartData) {
        setMessages(prev => [...prev, {
          id: `chart-wheel-${Date.now()}`,
          role: 'assistant' as const,
          content: '',
          chartData: data.chartData as NatalChartData,
          sentAt: new Date().toISOString(),
        }]);
        await sleep(600);
      }

      setIsStarting(false);
      // Fetch personalized AI greeting and append it after the sequence
      await fetchGreeting(undefined, true);
    } catch {
      setBirthDataError('Network error. Please check your connection and try again.');
    } finally {
      setBirthDataSubmitting(false);
    }
  }, [selectedPersona, birthDataForm, fetchGreeting, user]);

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
        setCoinBalance(data.remainingCoins ?? coinBalance);
      }
    } catch (err) {
      console.error("Failed to end session:", err);
    } finally {
      setSession(null);
      setMessages([]);
      setElapsedSeconds(0);
      setShowRefillBanner(false);
      feedbackTriggeredRef.current = false;
    }
  }, [session, coinBalance]);

  // Switch to a different guide: always fetch greeting immediately without any intermediate screen.
  // If there was an active billing session, end it silently and show a toast.
  const switchGuide = useCallback((slug: string, teaserFull?: string) => {
    const targetPersona = personas.find((p) => p.slug === slug);
    if (!targetPersona) return;

    setSelectedPersonaId(targetPersona.id);
    navigate(`/chat/${slug}`);

    if (session) {
      // Stop the local timer immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Notify user the old session ended
      const oldPersona = personas.find((p) => p.id === session.personaId);
      toast({
        title: `Session with ${oldPersona?.displayName ?? "your guide"} ended`,
        description: "Loading your new guide...",
      });

      // Fire-and-forget old session end — don't await, don't block new session start
      const oldSessionId = session.id;
      authFetch(`/api/chat-service/session/${oldSessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.remainingCoins !== undefined) setCoinBalance(data.remainingCoins); })
        .catch(() => {});

      setSession(null);
      setElapsedSeconds(0);
      setShowRefillBanner(false);
      feedbackTriggeredRef.current = false;
    }

    // Always fetch greeting immediately — no instructions screen.
    // Only use the teaser for first-time visitors; returning visitors get
    // the normal AI greeting so the conversation picks up naturally.
    setMessages([]);
    setPreSessionGreeting(null);
    lastAutoFetchedPersonaId.current = targetPersona.id; // Prevent auto-fetch effect from double-triggering
    const isReturning = chattedGuideIds.has(targetPersona.id);
    fetchGreeting(slug, false, null, isReturning ? undefined : teaserFull);
  }, [session, personas, navigate, fetchGreeting, chattedGuideIds]);

  // Confirm transition from instructions screen — fetch greeting for the new guide
  const confirmSwitch = useCallback(() => {
    setSwitchingToPersonaSlug(null);
    fetchGreeting();
  }, [fetchGreeting]);


  // Send a message. On first message (pre-session), creates the billing session first.
  const sendMessage = useCallback(
    async (content: string) => {
      if (isSending || !content.trim()) return;
      // Must have either an active session or a pre-session greeting to send into
      if (!session && !preSessionGreeting) return;

      const userMessage: ChatMessageData = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: content.trim(),
        sentAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setIsTyping(true);

      // For astrology personas: show a brief loading message while the chart is retrieved
      const isChartRequest = (() => {
        try {
          const personality = selectedPersona?.personality ? JSON.parse(selectedPersona.personality!) : {};
          return !!personality?.requiresBirthData &&
            /\b(show|display|see|view|give me|let me see|pull up)\b.{0,25}\bchart\b/i.test(content.trim());
        } catch { return false; }
      })();
      const chartLoadingMsgId = `chart-loading-${Date.now()}`;
      if (isChartRequest) {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: chartLoadingMsgId,
          role: 'assistant' as const,
          content: "Give me a minute to pull your chart out...",
          sentAt: new Date().toISOString(),
        }]);
      }

      // Reset idle timer on every user message
      lastUserMessageAt.current = Date.now();
      if (idleWarning) {
        setIdleWarning(false);
        setIdleCountdown(60);
        if (idleCountdownRef.current) { clearInterval(idleCountdownRef.current); idleCountdownRef.current = null; }
      }

      try {
        // First message: create session now (billing starts here)
        let activeSession = session;
        if (!activeSession) {
          const startRes = await authFetch("/api/chat-service/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personaId: selectedPersonaId,
              greeting: preSessionGreeting ?? undefined,
            }),
          });

          if (startRes.ok) {
            const startData = await startRes.json();
            activeSession = {
              id: startData.sessionId,
              personaId: startData.personaId,
              status: "active",
              startedAt: new Date().toISOString(),
              durationSeconds: 0,
              coinsCharged: 0,
            };
            setSession(activeSession);
            // Mark this guide as chatted — suppresses teaser + badge on all future visits
            if (selectedPersonaId) {
              setChattedGuideIds(prev => {
                if (prev.has(selectedPersonaId)) return prev;
                const next = new Set(prev);
                next.add(selectedPersonaId);
                try { localStorage.setItem("seer-chatted-guide-ids", JSON.stringify([...next])); } catch {}
                return next;
              });
            }
            setPreSessionGreeting(null);
            setElapsedSeconds(0);
            setShowRefillBanner(false);
            setRefillBannerDismissed(false);
            lastUserMessageAt.current = Date.now();
            if (startData.remainingCoins !== undefined) setCoinBalance(startData.remainingCoins);
            if (startData.pricing) {
              setSessionPricing(startData.pricing);
              setFreeTrialCoins(startData.pricing.freeCoins ?? 0);
            }
          } else if (startRes.status === 402) {
            setShowOutOfCredits(true);
            setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
            setIsTyping(false);
            setIsSending(false);
            return;
          } else {
            setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
            setIsTyping(false);
            setIsSending(false);
            return;
          }
        }

        const res = await authFetch(
          `/api/chat-service/session/${activeSession.id}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content.trim() }),
          },
        );

        if (res.ok) {
          const data = await res.json();

          // Remove chart loading placeholder now that the real response is ready
          if (isChartRequest) {
            setMessages(prev => prev.filter(m => m.id !== chartLoadingMsgId));
            setIsTyping(true);
          }

          // Replace temp user message ID with real DB ID
          if (data.userMessageId) {
            setMessages(prev => prev.map(m =>
              m.id === userMessage.id ? { ...m, id: data.userMessageId } : m
            ));
          }

          const typingDelay = calculateTypingDelay(data.message);
          await sleep(typingDelay);

          // If the AI triggered [SHOW_CHART], inject the chart wheel first
          if (data.chartData) {
            setMessages(prev => [...prev, {
              id: `chart-wheel-${Date.now()}`,
              role: 'assistant' as const,
              content: '',
              chartData: data.chartData,
              sentAt: new Date().toISOString(),
            }]);
            await sleep(400);
          }

          const assistantMsg: ChatMessageData = {
            id: data.assistantMessageId || `assistant-${Date.now()}`,
            role: "assistant",
            content: data.message,
            sentAt: new Date().toISOString(),
            tarotDraw: data.tarotDraw || false,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          if (data.remainingCoins !== undefined) {
            setCoinBalance(data.remainingCoins);
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
    [session, preSessionGreeting, selectedPersonaId, isSending, endSession],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue(""); // Clear input state
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleSaveMessage = useCallback(async (messageId: string) => {
    const isCurrentlySaved = savedMessageIds.has(messageId);
    // Optimistic update
    setSavedMessageIds(prev => {
      const next = new Set(prev);
      if (isCurrentlySaved) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
    try {
      await authFetch(`/api/user/messages/${messageId}/save`, {
        method: isCurrentlySaved ? 'DELETE' : 'POST',
      });
    } catch {
      // Revert on error
      setSavedMessageIds(prev => {
        const next = new Set(prev);
        if (isCurrentlySaved) next.add(messageId);
        else next.delete(messageId);
        return next;
      });
    }
  }, [savedMessageIds]);

  // Parse persona suggested questions from personality JSON
  const suggestedQuestions: string[] = (() => {
    try {
      const raw = selectedPersona?.personality;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const qs = parsed?.suggestedQuestions;
      return Array.isArray(qs) ? qs : [];
    } catch {
      return [];
    }
  })();
  // Show bubbles once greeting loads, during active session, OR while still loading (so user can pre-select)
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showQuestionBubbles =
    (session || !!preSessionGreeting || isStarting) &&
    suggestedQuestions.length > 0 &&
    userMessageCount === 0;

  // Loading states
  // Layout handles auth and background - just show loading if needed
  if (authLoading || personasLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-center z-10 space-y-6">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/80 text-lg font-medium">Preparing your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      {/* Guide Sidebar — visible once guide has greeted user, during active session, switching, or while loading */}
      {(session || !!preSessionGreeting || !!switchingToPersonaSlug || isStarting) && (
        <GuideSidebar
          guides={personas}
          selectedPersonaId={selectedPersonaId}
          chattedGuideIds={chattedGuideIds}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          onSwitchGuide={(slug, teaserFull) => switchGuide(slug, teaserFull)}
        />
      )}

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-0 md:p-4 overflow-hidden">
      <div className={`w-full max-w-lg h-full md:h-[90vh] flex flex-col backdrop-blur-md md:rounded-2xl shadow-2xl overflow-hidden relative z-10 ${
        (session || !!preSessionGreeting || !!switchingToPersonaSlug || isStarting)
          ? 'bg-white/95 border border-white/20'
          : 'bg-[#0f1729]/95 border border-white/10'
      }`}>
        {/* Header */}
        <header className="bg-bg-mid text-white p-4 flex items-center justify-between gap-2 shadow-md shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle — once guide has greeted or session is active */}
            {(session || !!preSessionGreeting || !!switchingToPersonaSlug || isStarting) && (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white shrink-0"
                aria-label="Browse guides"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {selectedPersona && (
              <>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary bg-purple-500">
                    <img
                      src={selectedPersona.avatarUrl && selectedPersona.avatarUrl.trim() !== '' ? selectedPersona.avatarUrl : "/evelyn-avatar-new.png"}
                      alt={selectedPersona.displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/evelyn-avatar-new.png";
                      }}
                    />
                  </div>
                  {session && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-mid animate-pulse" />
                  )}
                </div>
                <div>
                  <h1 className="font-serif font-bold text-lg leading-none">
                    {selectedPersona.displayName}
                  </h1>
                  <StatusIndicator status={personaStatus} text={personaStatusText} />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-white/70 hover:text-white text-sm"
              aria-label="Exit to Dashboard"
            >
              Exit
            </button>
          </div>
        </header>

        {/* Refill Banner - appears 30s before free trial ends */}
        {session && showRefillBanner && !refillBannerDismissed && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 animate-slide-down">
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <Coins className="w-4 h-4 shrink-0" />
              <span>Your free trial is ending soon!</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowRefillBanner(false);
                  setShowBuyCredits(true);
                }}
                className="px-3 py-1 bg-white text-amber-700 text-xs font-bold rounded-full hover:bg-amber-50 transition-colors shadow-sm"
              >
                Refill
              </button>
              <button
                onClick={() => {
                  setShowRefillBanner(false);
                  setRefillBannerDismissed(true);
                }}
                className="text-white/70 hover:text-white text-xs"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}


        {/* Idle warning banner */}
        {session && idleWarning && (
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <Coins className="w-4 h-4 shrink-0" />
              <span>Are you still there? Session pausing in {idleCountdown}s to protect your credits.</span>
            </div>
            <button
              onClick={() => {
                setIdleWarning(false);
                setIdleCountdown(60);
                if (idleCountdownRef.current) { clearInterval(idleCountdownRef.current); idleCountdownRef.current = null; }
                lastUserMessageAt.current = Date.now();
              }}
              className="px-3 py-1 bg-white text-red-600 text-xs font-bold rounded-full hover:bg-red-50 transition-colors shadow-sm shrink-0"
            >
              I'm here
            </button>
          </div>
        )}

        {/* Persona selector (when no active session and no persona selected) */}
        {!session && personas.length > 1 && !selectedPersona && (
          <div className="p-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
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
          className={`flex-1 overflow-y-auto scroll-smooth ${
            (session || !!preSessionGreeting || !!switchingToPersonaSlug || isStarting)
              ? 'p-4 space-y-4 bg-gray-50/50'
              : 'p-5 bg-gradient-to-b from-[#0f1729] to-[#1a2744]'
          }`}
        >
          {/* Instructions screen while switching to a new guide */}
          {!session && switchingToPersonaSlug && selectedPersona && (
            <div className="flex flex-col items-center justify-center min-h-full py-6 px-4">
              <div className="w-full max-w-sm">
                <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
                  Ready? Start the chat with {selectedPersona.displayName}
                </h2>

                <ul className="space-y-4 mb-6">
                  <li className="flex items-start gap-3 text-gray-600 text-sm">
                    <HelpCircle className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>You can ask the advisor anything on your mind and get an answer.</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600 text-sm">
                    <Lock className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>The chat is 100% private and confidential.</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600 text-sm">
                    <MessageCircle className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Type your first message or tap a suggested question once the chat opens.</span>
                  </li>
                </ul>

                <button
                  onClick={confirmSwitch}
                  className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
                >
                  Start Chat
                </button>

                <p className="text-center text-[10px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Private & Confidential Reading
                </p>
              </div>
            </div>
          )}

          {/* Loading greeting — show persona info while waiting instead of a spinner */}
          {!session && !preSessionGreeting && !switchingToPersonaSlug && isStarting && !isTyping && messages.length === 0 && selectedPersona && (
            <div className="flex flex-col items-center flex-1 py-8 px-6 gap-5">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-200 shadow-md">
                <img
                  src={selectedPersona.avatarUrl?.trim() || "/evelyn-avatar-new.png"}
                  alt={selectedPersona.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/evelyn-avatar-new.png"; }}
                />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">{selectedPersona.displayName}</p>
                {selectedPersona.tagline && (
                  <p className="text-base text-gray-500 mt-1">{selectedPersona.tagline}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" />
              </div>
              <div className="w-full space-y-5">
                <p className="text-center text-lg font-bold text-gray-700">Ready? Start the live chat</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-base text-gray-600">
                    <HelpCircle className="w-6 h-6 text-purple-500 shrink-0 mt-0.5" />
                    <span>You can ask the advisor anything on your mind and get an answer.</span>
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-600">
                    <Lock className="w-6 h-6 text-purple-500 shrink-0 mt-0.5" />
                    <span>The chat is 100% private and confidential.</span>
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-600">
                    <MessageCircle className="w-6 h-6 text-purple-500 shrink-0 mt-0.5" />
                    <span>You can use questions in bubble to start.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Birth data form — shown for astrology personas (e.g. Luna Voss) before first session */}
          {!session && !preSessionGreeting && !isStarting && !switchingToPersonaSlug && selectedPersona && (() => {
            const personality = selectedPersona.personality ? (() => {
              try { return JSON.parse(selectedPersona.personality!); } catch { return {}; }
            })() : {};
            return personality?.requiresBirthData && birthChartExists === false;
          })() && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
              <div className="w-full max-w-sm bg-[#0d0824]/80 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="text-3xl mb-2">♈♌♎</div>
                  <h2 className="text-white font-serif text-xl font-semibold mb-1">
                    Your Birth Chart
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {selectedPersona.displayName} reads your actual natal chart — not generic horoscopes. Enter your birth details to begin.
                  </p>
                </div>

                {/* Birth Date */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-1 font-medium">
                    Date of Birth <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white/10 border border-purple-500/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400 placeholder-gray-500"
                    value={birthDataForm.birthDate}
                    onChange={e => setBirthDataForm(f => ({ ...f, birthDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    min="1900-01-01"
                  />
                </div>

                {/* Birth Time */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-1 font-medium">
                    Time of Birth{' '}
                    <span className="text-gray-400 font-normal">(affects Rising sign & houses)</span>
                  </label>
                  <input
                    type="time"
                    className="w-full bg-white/10 border border-purple-500/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400 disabled:opacity-40"
                    value={birthDataForm.birthTime}
                    disabled={birthDataForm.unknownTime}
                    onChange={e => setBirthDataForm(f => ({ ...f, birthTime: e.target.value }))}
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-purple-500 w-4 h-4"
                      checked={birthDataForm.unknownTime}
                      onChange={e => setBirthDataForm(f => ({ ...f, unknownTime: e.target.checked, birthTime: '' }))}
                    />
                    <span className="text-xs text-gray-400">I don't know my birth time (noon will be used)</span>
                  </label>
                </div>

                {/* Birth City */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-300 mb-1 font-medium">
                    City of Birth <span className="text-purple-400">*</span>
                  </label>
                  <CityAutocomplete
                    value={birthDataForm.birthCity}
                    onChange={v => setBirthDataForm(f => ({ ...f, birthCity: v }))}
                    placeholder="Start typing a city..."
                    className="w-full bg-white/10 border border-purple-500/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400 placeholder-gray-500"
                    required
                  />
                </div>

                {/* Error */}
                {birthDataError && (
                  <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {birthDataError}
                  </div>
                )}

                {/* Submit */}
                <button
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all"
                  disabled={
                    birthDataSubmitting ||
                    !birthDataForm.birthDate ||
                    !birthDataForm.birthCity ||
                    (!birthDataForm.birthTime && !birthDataForm.unknownTime)
                  }
                  onClick={handleBirthDataSubmit}
                >
                  {birthDataSubmitting ? 'Calculating your chart...' : 'Calculate My Birth Chart'}
                </button>

                <p className="text-center text-xs text-gray-500 mt-3">
                  Your birth data is private and only used for your reading.
                </p>
              </div>
            </div>
          )}

          {/* Pre-reading welcome — shown when guide hasn't greeted yet */}
          {!session && !preSessionGreeting && !isStarting && !switchingToPersonaSlug && selectedPersona && (() => {
            const personality = selectedPersona.personality ? (() => {
              try { return JSON.parse(selectedPersona.personality!); } catch { return {}; }
            })() : {};
            // For astrology personas: only show PreReadingWelcome once chart is confirmed to exist
            if (personality?.requiresBirthData && birthChartExists !== true) return false;
            return true;
          })() && (
            <PreReadingWelcome
              persona={selectedPersona}
              memoryContext={memoryContext}
              coinBalance={coinBalance}
              freeCoinsAvailable={
                sessionPricing && coinBalance <= 0
                  ? sessionPricing.freeCoins
                  : 0
              }
              personaStatus={personaStatus}
              isStarting={isStarting}
              isOffline={isPersonaOffline}
              teaserMessage={teaserMessage}
              onStartSession={fetchGreeting}
              onBuyCredits={() => setShowBuyCredits(true)}
              onRefillToSeeTeaser={() => setShowTeaserModal(true)}
            />
          )}

          {/* Pre-session or active session messages */}
          {(session || !!preSessionGreeting || (isStarting && (isTyping || messages.length > 0))) && (
            <>
              {session && (
                <div className="text-center text-xs text-gray-400 my-4">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </div>
              )}

              {memoryContext && memoryContext.hasPriorMemory && (
                <div className="text-center text-xs text-purple-500 my-2 flex items-center justify-center gap-1">
                  <Brain className="w-3 h-3" />
                  {selectedPersona?.displayName} remembers your previous
                  sessions
                </div>
              )}

              {/* Privacy blurb — shown above the guide's greeting, before session starts */}
              {!!preSessionGreeting && !session && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-1">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Private & Confidential · Ask anything · Free to start</span>
                </div>
              )}

              {messages.map((msg, index) => {
                const isLastMsg = index === messages.length - 1;

                // Natal chart wheel — rendered inline as a Luna message
                if (msg.chartData) {
                  return (
                    <div key={msg.id} className="flex flex-col items-start w-full py-2 animate-fade-in">
                      <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-[#0d0824]/80 border border-purple-500/20 shadow-lg shadow-purple-900/20 p-3">
                        <NatalChartWheel data={msg.chartData} />
                      </div>
                      <button
                        onClick={async () => {
                          if (session) await endSession();
                          setBirthChartExists(false);
                          setStoredChartData(null);
                          setMessages([]);
                          setPreSessionGreeting(null);
                          lastAutoFetchedPersonaId.current = null;
                        }}
                        className="mt-1.5 ml-1 text-xs text-white/30 hover:text-purple-400 transition-colors"
                      >
                        Wrong details? Re-enter birth info
                      </button>
                    </div>
                  );
                }

                // Standalone card reveal — not a normal chat bubble
                if (msg.isCardReveal) {
                  return (
                    <div key={msg.id} className="flex flex-col items-center w-full py-3 animate-fade-in">
                      <div className="flex flex-col items-center gap-3 px-4 py-4 rounded-2xl bg-[#0d0824]/70 border border-purple-500/30 shadow-lg shadow-purple-900/20">
                        {msg.tarotCardImageUrl ? (
                          <img
                            src={msg.tarotCardImageUrl}
                            alt={msg.tarotCardName}
                            className="w-32 h-[213px] object-cover rounded-lg border border-purple-400/50 shadow-xl shadow-purple-900/40"
                          />
                        ) : (
                          <div className="w-32 h-[213px] rounded-lg border border-purple-400/50 bg-gradient-to-b from-[#1a1040] to-[#0d0824] flex items-center justify-center">
                            <span className="text-purple-300 text-sm font-serif text-center px-3">{msg.tarotCardName}</span>
                          </div>
                        )}
                        <p className="text-sm text-purple-300 font-serif italic tracking-wide">{msg.tarotCardName}</p>
                      </div>
                    </div>
                  );
                }

                // A "real" DB message ID is a UUID — not a temp- or assistant- prefixed local ID
                const isRealId = !msg.id.startsWith('temp-') && !msg.id.startsWith('assistant-') && !msg.id.startsWith('reveal-');
                const isSaved = savedMessageIds.has(msg.id);

                return (
                  <div key={msg.id} className={`flex flex-col w-full ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    {/* Message bubble */}
                    <div
                      data-testid={msg.role === "assistant" ? (index === 0 ? "chat-greeting" : "assistant-message") : "user-message"}
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm md:text-base leading-relaxed ${
                        msg.role === "user"
                          ? "bg-purple-600 text-white rounded-br-none"
                          : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Save button — only for messages with real DB IDs */}
                    {isRealId && (
                      <button
                        onClick={() => handleSaveMessage(msg.id)}
                        className={`mt-1 flex items-center gap-1 transition-colors ${
                          isSaved
                            ? "text-purple-500"
                            : "text-gray-300 hover:text-gray-500"
                        }`}
                        title={isSaved ? "Remove from saved" : "Save this message"}
                      >
                        <Bookmark className={`w-3 h-3 ${isSaved ? "fill-current" : ""}`} />
                        {isSaved && <span className="text-[10px]">Saved</span>}
                      </button>
                    )}

                    {/* Tarot card draw UI — only on the last assistant message that requested it */}
                    {msg.tarotDraw && msg.role === "assistant" && isLastMsg && !isSending && (
                      <div className="w-full max-w-[90%] mt-1">
                        <TarotCardDraw
                          cards={drawCards(7)}
                          disabled={isSending}
                          onCardSelected={(card: TarotCard) => {
                            // Clear the draw UI from the triggering message
                            setMessages((prev) => prev.map((m) =>
                              m.id === msg.id ? { ...m, tarotDraw: false } : m
                            ));
                            // Inject a standalone card reveal message
                            const revealMsg: ChatMessageData = {
                              id: `reveal-${Date.now()}`,
                              role: 'assistant',
                              content: '',
                              sentAt: new Date().toISOString(),
                              isCardReveal: true,
                              tarotCardName: card.name,
                              tarotCardImageUrl: card.imageUrl,
                            };
                            setMessages((prev) => [...prev, revealMsg]);
                            // Send the user's card selection message
                            sendMessage(`I drew ${card.name}.`);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

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

        {/* Suggested Question Bubbles */}
        {showQuestionBubbles && (
          <div className="bg-white border-t border-gray-100 px-4 py-2 shrink-0">
            <p className="text-[10px] text-gray-400 mb-1.5 font-medium">Tap a question to get started</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (isStarting) {
                      // Queue the question — sent automatically once the greeting arrives
                      pendingQuestionAfterGreeting.current = q;
                    } else {
                      sendMessage(q);
                    }
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area — once guide has greeted (pre-session) or session is active */}
        {(session || !!preSessionGreeting) && (
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <form
              onSubmit={onSubmit}
              className="relative flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                data-testid="chat-input"
                className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all border border-transparent focus:bg-white disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                data-testid="send-button"
                className="absolute right-1.5 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Bottom bar — only on the pre-reading welcome screen */}
        {!session && !preSessionGreeting && !switchingToPersonaSlug && !isStarting && (
          <div className="p-4 bg-[#0b1120] border-t border-white/10 shrink-0">
            <div className="flex items-center justify-center gap-6 text-xs text-white/40">
              <Link href="/personas" className="hover:text-emerald-400 transition-colors">
                Browse All Guides
              </Link>
              <span className="text-white/20">|</span>
              <Link
                href={
                  selectedPersonaId
                    ? `/credits?personaId=${selectedPersonaId}`
                    : "/credits"
                }
                className="hover:text-emerald-400 transition-colors"
              >
                Get More Coins
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Out of Credits Modal */}
      <OutOfCreditsModal
        open={showOutOfCredits}
        onOpenChange={setShowOutOfCredits}
        personaId={selectedPersonaId}
        personaName={selectedPersona?.displayName}
        personaAvatarUrl={selectedPersona?.avatarUrl}
        pricingTiers={sessionPricing?.tiers}
      />

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
        personaId={selectedPersonaId}
        personaName={selectedPersona?.displayName}
      />

      {/* Teaser Credit Modal (Nebula-style) */}
      <TeaserCreditModal
        open={showTeaserModal}
        onOpenChange={setShowTeaserModal}
        personaId={selectedPersonaId}
      />

      {/* Session Feedback Modal — shown after 5 minutes of active chat */}
      <SessionFeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
        sessionId={session?.id ?? null}
        personaName={selectedPersona?.displayName ?? "your guide"}
        personaAvatarUrl={selectedPersona?.avatarUrl}
      />
      </div>{/* end main chat panel wrapper */}
    </div>
  );
}
