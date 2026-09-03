import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Bucket } from "@shared/types";
import { calculateTypingDelay, sleep, generateId } from "@/lib/typing";
import {
  UpsellStage,
  QuickReply,
  personalizeMessages,
  personalizeMessage,
  detectQ1Intent,
  detectQ2Intent,
  detectQ3Intent,
  // Questions 2 and 3 are still V1-only constants: offer 02 asks nothing, so its
  // chain never routes into these stages. Everything else now comes from the
  // resolved copy (lib/backendOffers.ts).
  UPSELL_QUESTION_2,
  UPSELL_QUESTION_2_REPLIES,
  UPSELL_AFTER_Q2,
  UPSELL_QUESTION_3,
  UPSELL_QUESTION_3_REPLIES,
  UPSELL_AFTER_Q3,
  formatUpsellPrice,
} from "@/lib/upsellMessages";
import { getTrackdeskClickId } from "@/lib/facebook";
import {
  upsell1Copy,
  displayName,
  type Upsell1Chain,
  type Upsell1Copy,
} from "@/lib/backendOffers";
import { currentFunnel, getPostHogFunnel, isTwinFlameOffer } from "@/lib/funnel";
import { track as trackPH } from "@/lib/posthog";
import { tarotEventProps } from "@/lib/tarotAttribution";

// ============================================
// TYPES
// ============================================

export interface Message {
  id: string;
  role: "user" | "bot" | "image";
  content: string;
}

interface UserData {
  firstName: string;
  email: string;
  bucket: Bucket;
  personName: string | null;
  stripeCustomerId?: string | null;
  // Upsell 1 price (cents) for this user's price-test variant. Drives the
  // displayed price so it matches what /api/upsell/charge bills.
  upsell1PriceCents?: number;
}

interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

interface UseUpsellChatProps {
  userData: UserData | null;
  sessionId: string | null;
  enabled: boolean;
  lavaStoneImage?: string;
  // Injected copy/backend-mode for shared /offers/upsell/ pages. Both default to
  // undefined, which preserves today's URL-based resolution exactly (V1 + 02).
  copyOverride?: Upsell1Copy;
  backendOverride?: boolean;
}

// ============================================
// HOOK
// ============================================

export function useUpsellChat({
  userData,
  sessionId,
  enabled,
  lavaStoneImage,
  copyOverride,
  backendOverride,
}: UseUpsellChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<UpsellStage>("INIT");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [inputEnabled, setInputEnabled] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [upsellPaymentId, setUpsellPaymentId] = useState<string | null>(null);

  const [showContinue, setShowContinue] = useState(false);
  const [continueLabel, setContinueLabel] = useState("");
  const pendingStageRef = useRef<UpsellStage | null>(null);

  const hasStartedRef = useRef(false);

  // Which conversation this page is running — copy AND stage order. V1's
  // everywhere except the backend deck's offer 02, whose buyer bought a tarot
  // spread, never had an energy clearing, and is never asked a question.
  // Resolved once: the URL cannot change under a chat already in progress.
  const copy = useMemo(
    () => copyOverride ?? upsell1Copy(),
    [copyOverride],
  );

  const upsellPriceLabel = formatUpsellPrice(userData?.upsell1PriceCents);

  // "Friend" is what /api/upsell/user-data stamps when checkout carried no name,
  // which is every offer-02 order. Evelyn's own fallback ("dear") reads better.
  const firstName = displayName(userData?.firstName, copy.placeholderNames);

  // Personalize helper
  const p = useCallback(
    (msgs: string[]) =>
      personalizeMessages(
        msgs,
        firstName,
        userData?.personName || undefined,
        upsellPriceLabel,
      ),
    [firstName, userData, upsellPriceLabel],
  );

  const pMsg = useCallback(
    (msg: string) =>
      personalizeMessage(
        msg,
        firstName,
        userData?.personName || undefined,
        upsellPriceLabel,
      ),
    [firstName, userData, upsellPriceLabel],
  );

  // Add bot message with typing
  const sendBotMessage = useCallback(async (content: string) => {
    setIsTyping(true);
    await sleep(calculateTypingDelay(content));
    setIsTyping(false);

    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "bot", content },
    ]);
    await sleep(800 + Math.random() * 400);
  }, []);

  // Add multiple bot messages
  const sendBotMessages = useCallback(
    async (contents: string[]) => {
      for (const content of contents) {
        await sendBotMessage(content);
      }
    },
    [sendBotMessage],
  );

  // Add image message
  const sendImageMessage = useCallback(async (src: string) => {
    setIsTyping(true);
    await sleep(1200);
    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "image", content: src },
    ]);
    await sleep(800);
  }, []);

  // Add user message
  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", content },
    ]);
  }, []);

  // Reset UI state
  const resetUI = useCallback(() => {
    setShowContinue(false);
    setShowQuickReplies(false);
    setInputEnabled(false);
    setShowCTA(false);
    setShowShippingForm(false);
  }, []);

  // Process stage
  const processStage = useCallback(
    async (targetStage: UpsellStage, responseKey?: string) => {
      if (!userData) return;

      setStage(targetStage);
      resetUI();

      // Move on from `from` — unless the copy marks it as a pause, in which case
      // hold and show a one-button CONTINUE tap. It asks nothing and branches
      // nowhere; it exists so a ~50-message flow doesn't arrive as one broadcast.
      const advance = (from: keyof Upsell1Chain) => {
        const next = copy.chain[from];
        const pause = copy.pauses[from];
        if (pause) {
          pendingStageRef.current = next;
          setContinueLabel(pause);
          setShowContinue(true);
          return;
        }
        processStage(next);
      };

      switch (targetStage) {
        case "CONFIRMATION":
          await sendBotMessages(p(copy.CONFIRMATION));
          advance("CONFIRMATION");
          break;

        case "GAP":
          await sendBotMessages(p(copy.GAP));
          advance("GAP");
          break;

        // → QUESTION_1 on V1. Offer 02 goes straight to SOLUTION: its RISK block
        // already states what V1's question was fishing for.
        case "RISK":
          await sendBotMessages(p(copy.RISK));
          advance("RISK");
          break;

        case "QUESTION_1":
          await sendBotMessage(pMsg(copy.QUESTION_1));
          setQuickReplies(copy.QUESTION_1_REPLIES);
          setShowQuickReplies(true);
          setInputEnabled(true);
          setStage("WAITING_Q1");
          break;

        case "AFTER_Q1":
          const q1Response =
            copy.AFTER_Q1[responseKey || "default"] || copy.AFTER_Q1.default;
          await sendBotMessages(p(q1Response));
          advance("AFTER_Q1");
          break;

        case "SOLUTION":
          await sendBotMessages(p(copy.SOLUTION));
          advance("SOLUTION");
          break;

        case "LAVA_INTRO":
          await sendBotMessages(p(copy.LAVA_INTRO));
          if (lavaStoneImage) {
            await sendImageMessage(lavaStoneImage);
          }
          advance("LAVA_INTRO");
          break;

        case "QUESTION_2":
          await sendBotMessage(pMsg(UPSELL_QUESTION_2));
          setQuickReplies(UPSELL_QUESTION_2_REPLIES);
          setShowQuickReplies(true);
          setInputEnabled(true);
          setStage("WAITING_Q2");
          break;

        case "AFTER_Q2":
          const q2Response =
            UPSELL_AFTER_Q2[responseKey || "default"] ||
            UPSELL_AFTER_Q2.default;
          await sendBotMessages(p(q2Response));
          advance("AFTER_Q2");
          break;

        case "RITUAL":
          await sendBotMessages(p(copy.RITUAL));
          advance("RITUAL");
          break;

        case "FEEL":
          await sendBotMessages(p(copy.FEEL));
          advance("FEEL");
          break;

        case "QUESTION_3":
          await sendBotMessage(pMsg(UPSELL_QUESTION_3));
          setQuickReplies(UPSELL_QUESTION_3_REPLIES);
          setShowQuickReplies(true);
          setInputEnabled(true);
          setStage("WAITING_Q3");
          break;

        case "AFTER_Q3":
          const q3Response =
            UPSELL_AFTER_Q3[responseKey || "default"] ||
            UPSELL_AFTER_Q3.default;
          await sendBotMessages(p(q3Response));
          advance("AFTER_Q3");
          break;

        // Four bucket-keyed variants on V1. Offer 02 returns one universal block:
        // its spread is identical for every buyer, and no bucket was ever chosen.
        case "BUCKET":
          const bucketMsgs = copy.bucketMessages(userData.bucket, userData.personName);
          await sendBotMessages(p(bucketMsgs));
          advance("BUCKET");
          break;

        case "DELIVERY":
          await sendBotMessages(p(copy.DELIVERY));
          advance("DELIVERY");
          break;

        case "OFFER":
          await sendBotMessages(p(copy.OFFER));
          await sleep(800);
          setShowCTA(true);
          setStage("CTA");
          break;

        case "DECLINED":
          await sendBotMessages(p(copy.SOFT_DECLINE));
          setIsComplete(true);
          break;

        case "COMPLETE":
          await sendBotMessages(p(copy.SHIPPING_CONFIRMED));
          setIsComplete(true);
          break;
      }
    },
    [
      userData,
      copy,
      p,
      pMsg,
      sendBotMessage,
      sendBotMessages,
      sendImageMessage,
      resetUI,
      lavaStoneImage,
    ],
  );

  // Handle user input (free text or quick reply)
  const handleUserInput = useCallback(
    async (input: string) => {
      addUserMessage(input);
      resetUI();

      if (stage === "WAITING_Q1") {
        const intent = detectQ1Intent(input);
        await processStage("AFTER_Q1", intent);
      } else if (stage === "WAITING_Q2") {
        const intent = detectQ2Intent(input);
        await processStage("AFTER_Q2", intent);
      } else if (stage === "WAITING_Q3") {
        const intent = detectQ3Intent(input);
        await processStage("AFTER_Q3", intent);
      }
    },
    [stage, addUserMessage, resetUI, processStage],
  );

  // The CONTINUE tap. Posts her word as a bubble — the point is that the screen
  // feels like a conversation, not a slideshow — then resumes the flow.
  const handleContinue = useCallback(async () => {
    const next = pendingStageRef.current;
    if (!next) return;
    pendingStageRef.current = null;
    setShowContinue(false);
    addUserMessage(continueLabel);
    await processStage(next);
  }, [continueLabel, addUserMessage, processStage]);

  // Handle quick reply click
  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      handleUserInput(reply.text);
    },
    [handleUserInput],
  );

  // Handle CTA Accept
  const handleAccept = useCallback(async () => {
    if (!sessionId || !userData) return;

    setShowCTA(false);
    setIsProcessing(true);
    addUserMessage(copy.acceptLabel);

    // Tab-scoped tarot attribution, gated on the funnel so a palm/fb upsell in the
    // same tab can never pick up tarot properties. No-op for every other funnel.
    const tarot = getPostHogFunnel() === "tarot" ? tarotEventProps() : undefined;

    trackPH("upsell_accepted", {
      funnel: getPostHogFunnel() ?? "v1",
      step: "upsell1",
      product: "protection_ritual",
      sign: tarot?.deck,
      ...(tarot ?? {}),
    });

    // The backend funnel charges its OWN endpoint (the `be_` product → BE list, no
    // Facebook/Google/Trackdesk) and sends NO trackdeskClickId (⛔ never on a backend
    // sale). V1's path and body are byte-identical.
    const beFunnel = backendOverride ?? isTwinFlameOffer();

    try {
      const response = await fetch(
        beFunnel ? "/api/backend/upsell/charge" : "/api/upsell/charge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            beFunnel
              ? { checkoutSessionId: sessionId, email: userData.email }
              : {
                  checkoutSessionId: sessionId,
                  email: userData.email,
                  firstName: userData.firstName,
                  funnel: currentFunnel(),
                  trackdeskClickId: getTrackdeskClickId(),
                },
          ),
        },
      );

      const result = await response.json();

      if (result.success) {
        setUpsellPaymentId(result.paymentIntentId);
        await sendBotMessages(p(copy.SUCCESS));
        setIsProcessing(false);
        setShowShippingForm(true);
        setStage("SHIPPING");
      } else if (result.fallback && beFunnel) {
        // Backend, first build: the off-session charge on her saved card was declined
        // and there is no hosted BE upsell fallback yet (A7). Fail gracefully — let her
        // retry rather than redirect to an endpoint that does not exist.
        await sendBotMessage(
          "That didn't go through on your saved card, dear. Give it another moment and try once more.",
        );
        setIsProcessing(false);
        setShowCTA(true);
      } else if (result.fallback) {
        // The 1-click OFF-SESSION charge on the saved card was declined (Indian cards
        // reject off-session PIs outright), so she is bounced to a hosted Stripe
        // checkout. Previously invisible in PostHog: `upsell_accepted` fired and then
        // either a purchase appeared or it didn't, with no way to tell a payment
        // failure apart from an abandoned page. This is the drop-off point.
        trackPH("upsell_fallback_redirect", {
          funnel: getPostHogFunnel() ?? "v1",
          step: "upsell1",
          product: "protection_ritual",
          sign: tarot?.deck,
          ...(tarot ?? {}),
        });

        await sendBotMessage("Let me set up a secure payment page for you...");

        const fallbackResponse = await fetch("/api/upsell/fallback-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userData.email,
            firstName: userData.firstName,
            bucket: userData.bucket,
            originalSessionId: sessionId,
            trackdeskClickId: getTrackdeskClickId(),
            funnel: currentFunnel(),
          }),
        });

        const { url } = await fallbackResponse.json();
        if (url) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error("Upsell error:", error);
      await sendBotMessage("Something went wrong. Let me try another way...");
      setIsProcessing(false);
      setShowCTA(true);
    }
  }, [
    sessionId,
    userData,
    copy,
    addUserMessage,
    sendBotMessage,
    sendBotMessages,
    p,
    backendOverride,
  ]);

  // Handle CTA Decline
  const handleDecline = useCallback(async () => {
    setShowCTA(false);
    addUserMessage("Not right now");
    const tarot = getPostHogFunnel() === "tarot" ? tarotEventProps() : undefined;
    trackPH("upsell_declined", {
      funnel: getPostHogFunnel() ?? "v1",
      step: "upsell1",
      product: "protection_ritual",
      sign: tarot?.deck,
      ...(tarot ?? {}),
    });
    await processStage("DECLINED");
  }, [addUserMessage, processStage]);

  // Handle Shipping Submit
  const handleShippingSubmit = useCallback(
    async (address: ShippingAddress) => {
      if (!sessionId || !userData) return;

      setShowShippingForm(false);

      try {
        // Backend: stamp the address onto the upsell PaymentIntent (the manual shipper
        // reads it off Stripe). V1: its own DB save. Byte-identical for V1.
        const res = (backendOverride ?? isTwinFlameOffer())
          ? await fetch("/api/backend/upsell/shipping", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentIntentId: upsellPaymentId, address }),
            })
          : await fetch("/api/shipping/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, address }),
            });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("Shipping save failed:", res.status, errData);
        }

        await processStage("COMPLETE");
      } catch (error) {
        console.error("Shipping error:", error);
        await sendBotMessage("Address saved. We'll confirm details via email.");
        setIsComplete(true);
      }
    },
    [sessionId, userData, processStage, sendBotMessage, upsellPaymentId, backendOverride],
  );

  // Start on mount
  useEffect(() => {
    if (enabled && userData && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setTimeout(() => {
        processStage("CONFIRMATION");
      }, 500);
    }
  }, [enabled, userData, processStage]);

  return {
    messages,
    acceptLabel: copy.acceptLabel,
    showContinue,
    continueLabel,
    handleContinue,
    stage,
    isTyping,
    showQuickReplies,
    quickReplies,
    inputEnabled,
    showCTA,
    showShippingForm,
    isProcessing,
    isComplete,
    upsellPaymentId,
    upsellPriceLabel,
    handleUserInput,
    handleQuickReply,
    handleAccept,
    handleDecline,
    handleShippingSubmit,
  };
}
