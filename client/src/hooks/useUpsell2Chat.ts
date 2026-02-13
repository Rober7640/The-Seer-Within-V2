import { useState, useEffect, useCallback, useRef } from "react";
import type { Bucket } from "@shared/types";
import { calculateTypingDelay, sleep, generateId } from "@/lib/typing";
import { trackUpsell2Purchase } from "@/lib/facebook";
import {
  Upsell2Stage,
  QuickReply,
  personalizeMessages,
  personalizeMessage,
  detectU2Q1Intent,
  detectU2Q2Intent,
  detectU2Q3Intent,
  UPSELL2_PATH_A_OPEN,
  UPSELL2_PATH_B_OPEN,
  UPSELL2_GAP,
  UPSELL2_QUESTION_1,
  UPSELL2_QUESTION_1_REPLIES,
  UPSELL2_AFTER_Q1,
  UPSELL2_INTRODUCE,
  UPSELL2_STONES,
  UPSELL2_QUESTION_2,
  UPSELL2_QUESTION_2_REPLIES,
  UPSELL2_AFTER_Q2,
  UPSELL2_RITUAL_INSTRUCTION,
  UPSELL2_RITUAL_PATH_A_EXTRA,
  UPSELL2_WHAT_RECEIVE,
  UPSELL2_QUESTION_3,
  UPSELL2_QUESTION_3_REPLIES,
  UPSELL2_AFTER_Q3,
  UPSELL2_SOCIAL_PROOF,
  UPSELL2_PRICE,
  UPSELL2_URGENCY,
  UPSELL2_DOWNSELL,
  UPSELL2_SUCCESS,
  UPSELL2_SUCCESS_HAS_SHIPPING,
  UPSELL2_SUCCESS_NEEDS_SHIPPING,
  UPSELL2_SHIPPING_CONFIRMED,
  UPSELL2_SOFT_DECLINE,
} from "@/lib/upsell2Messages";

export interface Message {
  id: string;
  role: "user" | "bot" | "image";
  content: string;
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

interface UserData {
  firstName: string;
  email: string;
  bucket: Bucket;
  concern: string;
  personName: string | null;
  upsellPurchased: boolean;
  hasShipping: boolean;
  shipping: ShippingAddress | null;
}

interface UseUpsell2ChatProps {
  userData: UserData | null;
  sessionId: string | null;
  enabled: boolean;
  braceletImage?: string;
}

export function useUpsell2Chat({
  userData,
  sessionId,
  enabled,
  braceletImage,
}: UseUpsell2ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<Upsell2Stage>("INIT");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [inputEnabled, setInputEnabled] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [showDownsellCTA, setShowDownsellCTA] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [objectionCount, setObjectionCount] = useState(0);

  const hasStartedRef = useRef(false);
  const isPathA = userData?.upsellPurchased === true;

  const p = useCallback(
    (msgs: string[]) =>
      personalizeMessages(
        msgs,
        userData?.firstName || "",
        userData?.personName || undefined,
      ),
    [userData],
  );

  const pMsg = useCallback(
    (msg: string) =>
      personalizeMessage(
        msg,
        userData?.firstName || "",
        userData?.personName || undefined,
      ),
    [userData],
  );

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

  const sendBotMessages = useCallback(
    async (contents: string[]) => {
      for (const content of contents) {
        await sendBotMessage(content);
      }
    },
    [sendBotMessage],
  );

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

  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", content },
    ]);
  }, []);

  const resetUI = useCallback(() => {
    setShowQuickReplies(false);
    setInputEnabled(false);
    setShowCTA(false);
    setShowDownsellCTA(false);
    setShowShippingForm(false);
  }, []);

  const fetchClaudeReading = useCallback(
    async (
      type: "manifest_reveal" | "manifest_personalize",
    ): Promise<string[]> => {
      if (!userData) return [];
      try {
        const response = await fetch("/api/upsell2/reading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            userData: {
              firstName: userData.firstName,
              bucket: userData.bucket,
              concern: userData.concern,
              personName: userData.personName,
            },
            concern: userData.concern,
          }),
        });
        const data = await response.json();
        return data.messages || [];
      } catch (error) {
        console.error("Claude reading error:", error);
        return [];
      }
    },
    [userData],
  );

  const processStage = useCallback(
    async (targetStage: Upsell2Stage, responseKey?: string) => {
      if (!userData) return;

      setStage(targetStage);
      resetUI();

      switch (targetStage) {
        case "PATH_A_OPEN":
          await sendBotMessages(p(UPSELL2_PATH_A_OPEN));
          processStage("MANIFEST_REVEAL");
          break;

        case "PATH_B_OPEN":
          await sendBotMessages(p(UPSELL2_PATH_B_OPEN));
          processStage("MANIFEST_REVEAL");
          break;

        case "MANIFEST_REVEAL": {
          setStage("WAITING_REVEAL");
          const revealMsgs = await fetchClaudeReading("manifest_reveal");
          if (revealMsgs.length > 0) {
            await sendBotMessages(p(revealMsgs));
          } else {
            await sendBotMessage(
              pMsg(
                "I see something beyond the block, {firstName}... something trying to reach you.",
              ),
            );
          }
          processStage("GAP");
          break;
        }

        case "GAP":
          await sendBotMessages(p(UPSELL2_GAP));
          processStage("QUESTION_1");
          break;

        case "QUESTION_1":
          await sendBotMessage(pMsg(UPSELL2_QUESTION_1));
          setQuickReplies(UPSELL2_QUESTION_1_REPLIES);
          setShowQuickReplies(true);
          setInputEnabled(true);
          setStage("WAITING_Q1");
          break;

        case "AFTER_Q1": {
          const q1Response =
            UPSELL2_AFTER_Q1[responseKey || "default"] ||
            UPSELL2_AFTER_Q1.default;
          await sendBotMessages(p(q1Response));
          processStage("INTRODUCE");
          break;
        }

        case "INTRODUCE":
          await sendBotMessages(p(UPSELL2_INTRODUCE));
          if (braceletImage) {
            await sendImageMessage(braceletImage);
          }
          processStage("STONES");
          break;

        case "STONES":
          await sendBotMessages(p(UPSELL2_STONES));
          processStage("QUESTION_2");
          break;

        case "QUESTION_2":
          await sendBotMessage(pMsg(UPSELL2_QUESTION_2));
          setQuickReplies(UPSELL2_QUESTION_2_REPLIES);
          setShowQuickReplies(true);
          setInputEnabled(true);
          setStage("WAITING_Q2");
          break;

        case "AFTER_Q2": {
          const q2Response =
            UPSELL2_AFTER_Q2[responseKey || "default"] ||
            UPSELL2_AFTER_Q2.default;
          await sendBotMessages(p(q2Response));
          processStage("MANIFEST_PERSONALIZE");
          break;
        }

        case "MANIFEST_PERSONALIZE": {
          setStage("WAITING_PERSONALIZE");
          const personalizeMsgs = await fetchClaudeReading(
            "manifest_personalize",
          );
          if (personalizeMsgs.length > 0) {
            await sendBotMessages(p(personalizeMsgs));
          } else {
            await sendBotMessage(
              pMsg(
                "The stones that speak loudest to your energy are calling, {firstName}.",
              ),
            );
          }
          processStage("RITUAL_INSTRUCTION");
          break;
        }

        case "RITUAL_INSTRUCTION":
          await sendBotMessages(p(UPSELL2_RITUAL_INSTRUCTION));
          if (isPathA) {
            await sendBotMessage(pMsg(UPSELL2_RITUAL_PATH_A_EXTRA));
          }
          processStage("WHAT_RECEIVE");
          break;

        case "WHAT_RECEIVE":
          await sendBotMessages(p(UPSELL2_WHAT_RECEIVE));
          processStage("QUESTION_3");
          break;

        case "QUESTION_3":
          await sendBotMessage(pMsg(UPSELL2_QUESTION_3));
          setQuickReplies(UPSELL2_QUESTION_3_REPLIES);
          setShowQuickReplies(true);
          setInputEnabled(true);
          setStage("WAITING_Q3");
          break;

        case "AFTER_Q3": {
          const q3Response =
            UPSELL2_AFTER_Q3[responseKey || "default"] ||
            UPSELL2_AFTER_Q3.default;
          await sendBotMessages(p(q3Response));
          processStage("SOCIAL_PROOF");
          break;
        }

        case "SOCIAL_PROOF":
          await sendBotMessages(p(UPSELL2_SOCIAL_PROOF));
          processStage("PRICE");
          break;

        case "PRICE":
          await sendBotMessages(p(UPSELL2_PRICE));
          processStage("URGENCY");
          break;

        case "URGENCY":
          await sendBotMessages(p(UPSELL2_URGENCY));
          await sleep(800);
          setShowCTA(true);
          setStage("CTA");
          break;

        case "OBJECTION_1":
          setObjectionCount(1);
          await sendBotMessages(p(UPSELL2_DOWNSELL));
          await sleep(800);
          setShowDownsellCTA(true);
          setStage("DOWNSELL_CTA");
          break;

        case "DECLINED":
          await sendBotMessages(p(UPSELL2_SOFT_DECLINE));
          setIsComplete(true);
          break;

        case "COMPLETE":
          await sendBotMessages(p(UPSELL2_SHIPPING_CONFIRMED));
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
      fetchClaudeReading,
      isPathA,
      braceletImage,
    ],
  );

  const handleUserInput = useCallback(
    async (input: string) => {
      addUserMessage(input);
      resetUI();

      if (stage === "WAITING_Q1") {
        const intent = detectU2Q1Intent(input);
        await processStage("AFTER_Q1", intent);
      } else if (stage === "WAITING_Q2") {
        const intent = detectU2Q2Intent(input);
        await processStage("AFTER_Q2", intent);
      } else if (stage === "WAITING_Q3") {
        const intent = detectU2Q3Intent(input);
        await processStage("AFTER_Q3", intent);
      }
    },
    [stage, addUserMessage, resetUI, processStage],
  );

  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      handleUserInput(reply.text);
    },
    [handleUserInput],
  );

  const handleAccept = useCallback(async () => {
    if (!sessionId || !userData) return;

    setShowCTA(false);
    setIsProcessing(true);
    addUserMessage("Yes, I want the Manifestation Bracelet");

    try {
      const response = await fetch("/api/upsell2/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutSessionId: sessionId,
          email: userData.email,
          firstName: userData.firstName,
          type: "full",
        }),
      });

      const result = await response.json();

      if (result.success) {
        trackUpsell2Purchase(
          47,
          "USD",
          userData.email,
          "Manifestation Bracelet (Attuned)",
        );
        if (isPathA && userData.hasShipping) {
          await sendBotMessages(p(UPSELL2_SUCCESS_HAS_SHIPPING));
          setIsProcessing(false);
          await processStage("COMPLETE");
        } else {
          await sendBotMessages(p(UPSELL2_SUCCESS_NEEDS_SHIPPING));
          setIsProcessing(false);
          setShowShippingForm(true);
          setStage("SHIPPING");
        }
      } else if (result.fallback) {
        await sendBotMessage("Let me set up a secure payment page for you...");

        const fallbackResponse = await fetch("/api/upsell2/fallback-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userData.email,
            firstName: userData.firstName,
            bucket: userData.bucket,
            originalSessionId: sessionId,
            type: "full",
          }),
        });

        const { url } = await fallbackResponse.json();
        if (url) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error("Upsell2 error:", error);
      await sendBotMessage("Something went wrong. Let me try another way...");
      setIsProcessing(false);
      setShowCTA(true);
    }
  }, [
    sessionId,
    userData,
    addUserMessage,
    sendBotMessage,
    sendBotMessages,
    p,
    processStage,
    isPathA,
  ]);

  const handleDecline = useCallback(async () => {
    setShowCTA(false);

    if (objectionCount === 0) {
      addUserMessage("Not right now");
      await processStage("OBJECTION_1");
    } else {
      addUserMessage("No thanks");
      await processStage("DECLINED");
    }
  }, [addUserMessage, processStage, objectionCount]);

  const handleDownsellAccept = useCallback(async () => {
    if (!sessionId || !userData) return;

    setShowDownsellCTA(false);
    setIsProcessing(true);
    addUserMessage("Yes, send me the bracelet for $30");

    try {
      const response = await fetch("/api/upsell2/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutSessionId: sessionId,
          email: userData.email,
          firstName: userData.firstName,
          type: "downsell",
        }),
      });

      const result = await response.json();

      if (result.success) {
        trackUpsell2Purchase(
          30,
          "USD",
          userData.email,
          "Manifestation Bracelet (Standard)",
        );
        if (isPathA && userData.hasShipping) {
          await sendBotMessages(p(UPSELL2_SUCCESS_HAS_SHIPPING));
          setIsProcessing(false);
          await processStage("COMPLETE");
        } else {
          await sendBotMessages(p(UPSELL2_SUCCESS_NEEDS_SHIPPING));
          setIsProcessing(false);
          setShowShippingForm(true);
          setStage("SHIPPING");
        }
      } else if (result.fallback) {
        await sendBotMessage("Let me set up a secure payment page for you...");

        const fallbackResponse = await fetch("/api/upsell2/fallback-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userData.email,
            firstName: userData.firstName,
            bucket: userData.bucket,
            originalSessionId: sessionId,
            type: "downsell",
          }),
        });

        const { url } = await fallbackResponse.json();
        if (url) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error("Upsell2 downsell error:", error);
      await sendBotMessage("Something went wrong. Let me try another way...");
      setIsProcessing(false);
      setShowDownsellCTA(true);
    }
  }, [
    sessionId,
    userData,
    addUserMessage,
    sendBotMessage,
    sendBotMessages,
    p,
    processStage,
    isPathA,
  ]);

  const handleDownsellDecline = useCallback(async () => {
    setShowDownsellCTA(false);
    addUserMessage("No thanks");
    await processStage("DECLINED");
  }, [addUserMessage, processStage]);

  const handleShippingSubmit = useCallback(
    async (address: ShippingAddress) => {
      if (!sessionId || !userData) return;

      setShowShippingForm(false);

      try {
        await fetch("/api/upsell2/shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, address }),
        });

        await processStage("COMPLETE");
      } catch (error) {
        console.error("Shipping error:", error);
        await sendBotMessage("Address saved. We'll confirm details via email.");
        setIsComplete(true);
      }
    },
    [sessionId, userData, processStage, sendBotMessage],
  );

  useEffect(() => {
    if (enabled && userData && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setTimeout(() => {
        if (userData.upsellPurchased) {
          processStage("PATH_A_OPEN");
        } else {
          processStage("PATH_B_OPEN");
        }
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
    showDownsellCTA,
    showShippingForm,
    isProcessing,
    isComplete,
    handleUserInput,
    handleQuickReply,
    handleAccept,
    handleDecline,
    handleDownsellAccept,
    handleDownsellDecline,
    handleShippingSubmit,
  };
}
