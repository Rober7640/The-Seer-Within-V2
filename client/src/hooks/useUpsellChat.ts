import { useState, useEffect, useCallback, useRef } from "react";
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
  UPSELL_CONFIRMATION,
  UPSELL_GAP,
  UPSELL_RISK,
  UPSELL_QUESTION_1,
  UPSELL_QUESTION_1_REPLIES,
  UPSELL_AFTER_Q1,
  UPSELL_SOLUTION,
  UPSELL_LAVA_INTRO,
  UPSELL_QUESTION_2,
  UPSELL_QUESTION_2_REPLIES,
  UPSELL_AFTER_Q2,
  UPSELL_RITUAL,
  UPSELL_FEEL,
  UPSELL_QUESTION_3,
  UPSELL_QUESTION_3_REPLIES,
  UPSELL_AFTER_Q3,
  UPSELL_BUCKET_MESSAGES,
  UPSELL_DELIVERY,
  UPSELL_OFFER,
  UPSELL_SOFT_DECLINE,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
  formatUpsellPrice,
} from "@/lib/upsellMessages";
import { getTrackdeskClickId } from "@/lib/facebook";
import { currentFunnel, getPostHogFunnel } from "@/lib/funnel";
import { track as trackPH } from "@/lib/posthog";

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
}

// ============================================
// HOOK
// ============================================

export function useUpsellChat({
  userData,
  sessionId,
  enabled,
  lavaStoneImage,
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

  const hasStartedRef = useRef(false);

  const upsellPriceLabel = formatUpsellPrice(userData?.upsell1PriceCents);

  // Personalize helper
  const p = useCallback(
    (msgs: string[]) =>
      personalizeMessages(
        msgs,
        userData?.firstName || "",
        userData?.personName || undefined,
        upsellPriceLabel,
      ),
    [userData, upsellPriceLabel],
  );

  const pMsg = useCallback(
    (msg: string) =>
      personalizeMessage(
        msg,
        userData?.firstName || "",
        userData?.personName || undefined,
        upsellPriceLabel,
      ),
    [userData, upsellPriceLabel],
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

      switch (targetStage) {
        case "CONFIRMATION":
          await sendBotMessages(p(UPSELL_CONFIRMATION));
          processStage("GAP");
          break;

        case "GAP":
          await sendBotMessages(p(UPSELL_GAP));
          processStage("RISK");
          break;

        case "RISK":
          await sendBotMessages(p(UPSELL_RISK));
          processStage("QUESTION_1");
          break;

        case "QUESTION_1":
          await sendBotMessage(pMsg(UPSELL_QUESTION_1));
          setQuickReplies(UPSELL_QUESTION_1_REPLIES);
          setShowQuickReplies(true);
          setInputEnabled(true);
          setStage("WAITING_Q1");
          break;

        case "AFTER_Q1":
          const q1Response =
            UPSELL_AFTER_Q1[responseKey || "default"] ||
            UPSELL_AFTER_Q1.default;
          await sendBotMessages(p(q1Response));
          processStage("SOLUTION");
          break;

        case "SOLUTION":
          await sendBotMessages(p(UPSELL_SOLUTION));
          processStage("LAVA_INTRO");
          break;

        case "LAVA_INTRO":
          await sendBotMessages(p(UPSELL_LAVA_INTRO));
          if (lavaStoneImage) {
            await sendImageMessage(lavaStoneImage);
          }
          processStage("QUESTION_2");
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
          processStage("RITUAL");
          break;

        case "RITUAL":
          await sendBotMessages(p(UPSELL_RITUAL));
          processStage("FEEL");
          break;

        case "FEEL":
          await sendBotMessages(p(UPSELL_FEEL));
          processStage("QUESTION_3");
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
          processStage("BUCKET");
          break;

        case "BUCKET":
          const bucketMsgs = UPSELL_BUCKET_MESSAGES[userData.bucket] || [];
          await sendBotMessages(p(bucketMsgs));
          processStage("DELIVERY");
          break;

        case "DELIVERY":
          await sendBotMessages(p(UPSELL_DELIVERY));
          processStage("OFFER");
          break;

        case "OFFER":
          await sendBotMessages(p(UPSELL_OFFER));
          await sleep(800);
          setShowCTA(true);
          setStage("CTA");
          break;

        case "DECLINED":
          await sendBotMessages(p(UPSELL_SOFT_DECLINE));
          setIsComplete(true);
          break;

        case "COMPLETE":
          await sendBotMessages(p(UPSELL_SHIPPING_CONFIRMED));
          setIsComplete(true);
          break;
      }
    },
    [
      userData,
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
    addUserMessage("Yes, protect what we clear");

    trackPH("upsell_accepted", {
      funnel: getPostHogFunnel() ?? "v1",
      step: "upsell1",
      product: "protection_ritual",
    });

    try {
      const response = await fetch("/api/upsell/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutSessionId: sessionId,
          email: userData.email,
          firstName: userData.firstName,
          funnel: currentFunnel(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUpsellPaymentId(result.paymentIntentId);
        await sendBotMessages(p(UPSELL_SUCCESS));
        setIsProcessing(false);
        setShowShippingForm(true);
        setStage("SHIPPING");
      } else if (result.fallback) {
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
  }, [sessionId, userData, addUserMessage, sendBotMessage, sendBotMessages, p]);

  // Handle CTA Decline
  const handleDecline = useCallback(async () => {
    setShowCTA(false);
    addUserMessage("Not right now");
    trackPH("upsell_declined", {
      funnel: getPostHogFunnel() ?? "v1",
      step: "upsell1",
      product: "protection_ritual",
    });
    await processStage("DECLINED");
  }, [addUserMessage, processStage]);

  // Handle Shipping Submit
  const handleShippingSubmit = useCallback(
    async (address: ShippingAddress) => {
      if (!sessionId || !userData) return;

      setShowShippingForm(false);

      try {
        const res = await fetch("/api/shipping/save", {
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
    [sessionId, userData, processStage, sendBotMessage],
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
