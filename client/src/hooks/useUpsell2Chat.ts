import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Bucket } from "@shared/types";
import { calculateTypingDelay, sleep, generateId } from "@/lib/typing";

import {
  Upsell2Stage,
  QuickReply,
  personalizeMessages,
  personalizeMessage,
  detectU2Q1Intent,
  detectU2Q2Intent,
  detectU2Q3Intent,
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
import {
  upsell2Copy,
  displayName,
  type Upsell2Chain,
  type Upsell2Copy,
} from "@/lib/backendOffers";
import { currentFunnel, getPostHogFunnel, isTwinFlameOffer } from "@/lib/funnel";
import { track as trackPH } from "@/lib/posthog";
import { tarotEventProps } from "@/lib/tarotAttribution";
import { getTrackdeskClickId } from "@/lib/facebook";

// Fire the Trackdesk upsell-2 affiliate conversion from the browser. Backup to
// the server-side fire in /api/upsell2/charge — same externalId so Trackdesk
// dedups the pair down to one conversion.
function fireTrackdeskUpsell2(sessionId: string, dollars: number, email?: string) {
  if (typeof window.trackdesk !== "function") return;
  window.trackdesk("the-seer-within", "conversion", {
    conversionType: "upsell2",
    amount: { value: String(dollars) },
    externalId: `${sessionId}_upsell2`,
    customerId: email,
    currencyCode: "USD",
  });
}

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
  // Injected copy/backend-mode for shared /offers/upsell/ pages. Both default to
  // undefined, which preserves today's URL-based resolution exactly (V1 + 02).
  copyOverride?: Upsell2Copy;
  backendOverride?: boolean;
}

export function useUpsell2Chat({
  userData,
  sessionId,
  enabled,
  braceletImage,
  copyOverride,
  backendOverride,
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
  const [upsell2Bought, setUpsell2Bought] = useState(false);
  // The backend charge's PaymentIntent id, so the BE shipping call can stamp the
  // address onto it. Null on the V1 path (V1 saves shipping by session id instead).
  const [upsell2PaymentId, setUpsell2PaymentId] = useState<string | null>(null);
  const [objectionCount, setObjectionCount] = useState(0);

  const [showContinue, setShowContinue] = useState(false);
  const [continueLabel, setContinueLabel] = useState("");
  const pendingStageRef = useRef<Upsell2Stage | null>(null);

  const hasStartedRef = useRef(false);

  // Which funnel's path opens this page is running — V1's everywhere except the
  // backend deck's offer 02. Everything from UPSELL2_GAP onward is V1's in both
  // cases. Resolved once; the URL cannot change mid-chat.
  const copy = useMemo(
    () => copyOverride ?? upsell2Copy(),
    [copyOverride],
  );
  const isPathA = userData?.upsellPurchased === true;

  // "Friend" is the placeholder /api/upsell/user-data stamps when checkout
  // carried no name — every offer-02 order. "dear" is the better fallback.
  const firstName = displayName(userData?.firstName, copy.placeholderNames);

  const p = useCallback(
    (msgs: string[]) =>
      personalizeMessages(
        msgs,
        firstName,
        userData?.personName || undefined,
      ),
    [firstName, userData],
  );

  const pMsg = useCallback(
    (msg: string) =>
      personalizeMessage(
        msg,
        firstName,
        userData?.personName || undefined,
      ),
    [firstName, userData],
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
    setShowContinue(false);
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

      // Move on from `from` — unless the copy marks it as a pause, in which case
      // hold and show a one-button CONTINUE tap. It asks nothing and branches
      // nowhere; it exists so a ~50-message flow doesn't arrive as one broadcast.
      const advance = (from: keyof Upsell2Chain) => {
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
        case "PATH_A_OPEN":
          await sendBotMessages(p(copy.PATH_A_OPEN));
          advance("PATH_A_OPEN");
          break;

        case "PATH_B_OPEN":
          await sendBotMessages(p(copy.PATH_B_OPEN));
          advance("PATH_B_OPEN");
          break;

        // ⚠ Offer 02 ships STATIC copy here instead of calling Claude. The
        // prompt interpolates her stated desire, a field 02 never collects — it
        // would go out as an empty string with the model left to invent one, and
        // the prompt's own framing ("the clearing ritual she purchased") is
        // wrong for a tarot buyer. Its reveal comes from the fixed spread.
        case "MANIFEST_REVEAL": {
          setStage("WAITING_REVEAL");
          if (copy.REVEAL) {
            await sendBotMessages(p(copy.REVEAL));
          } else {
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
          }
          advance("MANIFEST_REVEAL");
          break;
        }

        case "GAP":
          await sendBotMessages(p(copy.GAP));
          advance("GAP");
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
          advance("AFTER_Q1");
          break;
        }

        case "INTRODUCE":
          await sendBotMessages(p(copy.INTRODUCE));
          if (braceletImage) {
            await sendImageMessage(braceletImage);
          }
          advance("INTRODUCE");
          break;

        case "STONES":
          await sendBotMessages(p(copy.STONES));
          advance("STONES");
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
          advance("AFTER_Q2");
          break;
        }

        case "MANIFEST_PERSONALIZE": {
          setStage("WAITING_PERSONALIZE");
          if (copy.PERSONALIZE) {
            await sendBotMessages(p(copy.PERSONALIZE));
          } else {
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
          }
          advance("MANIFEST_PERSONALIZE");
          break;
        }

        case "RITUAL_INSTRUCTION":
          await sendBotMessages(p(copy.RITUAL_INSTRUCTION));
          if (isPathA) {
            await sendBotMessage(pMsg(copy.RITUAL_PATH_A_EXTRA));
          }
          advance("RITUAL_INSTRUCTION");
          break;

        case "WHAT_RECEIVE":
          await sendBotMessages(p(copy.WHAT_RECEIVE));
          advance("WHAT_RECEIVE");
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
          advance("AFTER_Q3");
          break;
        }

        case "SOCIAL_PROOF":
          await sendBotMessages(p(copy.SOCIAL_PROOF));
          advance("SOCIAL_PROOF");
          break;

        case "PRICE":
          await sendBotMessages(p(copy.PRICE));
          advance("PRICE");
          break;

        case "URGENCY":
          await sendBotMessages(p(copy.URGENCY));
          await sleep(800);
          setShowCTA(true);
          setStage("CTA");
          break;

        case "OBJECTION_1":
          setObjectionCount(1);
          await sendBotMessages(p(copy.DOWNSELL));
          await sleep(800);
          setShowDownsellCTA(true);
          setStage("DOWNSELL_CTA");
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

  // The CONTINUE tap — see useUpsellChat. Asks nothing, branches nowhere.
  const handleContinue = useCallback(async () => {
    const next = pendingStageRef.current;
    if (!next) return;
    pendingStageRef.current = null;
    setShowContinue(false);
    addUserMessage(continueLabel);
    await processStage(next);
  }, [continueLabel, addUserMessage, processStage]);

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

    // Tab-scoped tarot attribution, gated on the funnel so a palm/fb upsell in the
    // same tab can never pick up tarot properties. No-op for every other funnel.
    const tarot = getPostHogFunnel() === "tarot" ? tarotEventProps() : undefined;

    trackPH("upsell_accepted", {
      funnel: getPostHogFunnel() ?? "v1",
      step: "upsell2",
      product: "manifestation_bracelet",
      // U2 has two prices ($47 full / $30 downsell) that were previously
      // indistinguishable on this event. The downsell accept fired nothing at all.
      price_tier: "full",
      sign: tarot?.deck,
      ...(tarot ?? {}),
    });

    // Backend charges its OWN endpoint (be_bracelet → list 6972556, no tracking),
    // NO trackdeskClickId. V1's path/body is byte-identical.
    const beFunnel = backendOverride ?? isTwinFlameOffer();

    try {
      const response = await fetch(
        beFunnel ? "/api/backend/upsell/charge" : "/api/upsell2/charge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            beFunnel
              ? {
                  checkoutSessionId: sessionId,
                  email: userData.email,
                  product: "be_bracelet",
                  tier: "full",
                }
              : {
                  checkoutSessionId: sessionId,
                  email: userData.email,
                  firstName: userData.firstName,
                  type: "full",
                  funnel: currentFunnel(),
                  trackdeskClickId: getTrackdeskClickId(),
                },
          ),
        },
      );

      const result = await response.json();

      if (result.success) {
        setUpsell2Bought(true);
        setUpsell2PaymentId(result.paymentIntentId ?? null);
        if (!beFunnel) fireTrackdeskUpsell2(sessionId, 47, userData.email);
        if (isPathA && userData.hasShipping) {
          // Backend Path A: she reused her Upsell 1 address, so no form showed —
          // stamp it on THIS (bracelet) PaymentIntent too, so the shipper reads it
          // off both payments. V1 keeps shipping in its DB, so it needs nothing here.
          // Non-fatal: she has paid, and Upsell 1 already carries the address.
          if (beFunnel && userData.shipping && result.paymentIntentId) {
            await fetch("/api/backend/upsell/shipping", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentIntentId: result.paymentIntentId,
                address: userData.shipping,
              }),
            }).catch(() => {});
          }
          await sendBotMessages(p(copy.SUCCESS_HAS_SHIPPING));
          setIsProcessing(false);
          await processStage("COMPLETE");
        } else {
          await sendBotMessages(p(copy.SUCCESS_NEEDS_SHIPPING));
          setIsProcessing(false);
          setShowShippingForm(true);
          setStage("SHIPPING");
        }
      } else if (result.fallback && beFunnel) {
        // Backend, first build: no hosted BE fallback yet — let her retry.
        await sendBotMessage(
          "That didn't go through on your saved card, dear. Give it a moment and try once more.",
        );
        setIsProcessing(false);
        setShowCTA(true);
      } else if (result.fallback) {
        // 1-click off-session charge declined → hosted Stripe checkout. See the
        // matching event in useUpsellChat: this is where a payment failure becomes
        // distinguishable from an abandoned page.
        trackPH("upsell_fallback_redirect", {
          funnel: getPostHogFunnel() ?? "v1",
          step: "upsell2",
          product: "manifestation_bracelet",
          price_tier: "full",
          sign: tarot?.deck,
          ...(tarot ?? {}),
        });

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
            funnel: currentFunnel(),
            trackdeskClickId: getTrackdeskClickId(),
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
    copy,
    backendOverride,
  ]);

  const handleDecline = useCallback(async () => {
    setShowCTA(false);

    if (objectionCount === 0) {
      addUserMessage("Not right now");
      await processStage("OBJECTION_1");
    } else {
      addUserMessage("No thanks");
      const tarot = getPostHogFunnel() === "tarot" ? tarotEventProps() : undefined;
      trackPH("upsell_declined", {
        funnel: getPostHogFunnel() ?? "v1",
        step: "upsell2",
        product: "manifestation_bracelet",
        price_tier: "full",
        sign: tarot?.deck,
        ...(tarot ?? {}),
      });
      await processStage("DECLINED");
    }
  }, [addUserMessage, processStage, objectionCount]);

  const handleDownsellAccept = useCallback(async () => {
    if (!sessionId || !userData) return;

    setShowDownsellCTA(false);
    setIsProcessing(true);
    addUserMessage("Yes, send me the bracelet for $30");

    // The $30 downsell accept previously fired NOTHING — the buyer vanished from the
    // client funnel and only reappeared on the server-side purchase_completed, so the
    // full-vs-downsell take-rate was not measurable before the charge.
    const tarot = getPostHogFunnel() === "tarot" ? tarotEventProps() : undefined;
    trackPH("upsell_accepted", {
      funnel: getPostHogFunnel() ?? "v1",
      step: "upsell2",
      product: "manifestation_bracelet",
      price_tier: "downsell",
      sign: tarot?.deck,
      ...(tarot ?? {}),
    });

    // Backend: downsell charge on be_bracelet at $30, no tracking / no trackdesk id.
    const beFunnel = backendOverride ?? isTwinFlameOffer();

    try {
      const response = await fetch(
        beFunnel ? "/api/backend/upsell/charge" : "/api/upsell2/charge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            beFunnel
              ? {
                  checkoutSessionId: sessionId,
                  email: userData.email,
                  product: "be_bracelet",
                  tier: "downsell",
                }
              : {
                  checkoutSessionId: sessionId,
                  email: userData.email,
                  firstName: userData.firstName,
                  type: "downsell",
                  funnel: currentFunnel(),
                  trackdeskClickId: getTrackdeskClickId(),
                },
          ),
        },
      );

      const result = await response.json();

      if (result.success) {
        setUpsell2Bought(true);
        setUpsell2PaymentId(result.paymentIntentId ?? null);
        if (!beFunnel) fireTrackdeskUpsell2(sessionId, 30, userData.email);
        if (isPathA && userData.hasShipping) {
          // Backend Path A: she reused her Upsell 1 address, so no form showed —
          // stamp it on THIS (bracelet) PaymentIntent too, so the shipper reads it
          // off both payments. V1 keeps shipping in its DB, so it needs nothing here.
          // Non-fatal: she has paid, and Upsell 1 already carries the address.
          if (beFunnel && userData.shipping && result.paymentIntentId) {
            await fetch("/api/backend/upsell/shipping", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentIntentId: result.paymentIntentId,
                address: userData.shipping,
              }),
            }).catch(() => {});
          }
          await sendBotMessages(p(copy.SUCCESS_HAS_SHIPPING));
          setIsProcessing(false);
          await processStage("COMPLETE");
        } else {
          await sendBotMessages(p(copy.SUCCESS_NEEDS_SHIPPING));
          setIsProcessing(false);
          setShowShippingForm(true);
          setStage("SHIPPING");
        }
      } else if (result.fallback && beFunnel) {
        // Backend, first build: no hosted BE fallback yet — let her retry.
        await sendBotMessage(
          "That didn't go through on your saved card, dear. Give it a moment and try once more.",
        );
        setIsProcessing(false);
        setShowCTA(true);
      } else if (result.fallback) {
        trackPH("upsell_fallback_redirect", {
          funnel: getPostHogFunnel() ?? "v1",
          step: "upsell2",
          product: "manifestation_bracelet",
          price_tier: "downsell",
          sign: tarot?.deck,
          ...(tarot ?? {}),
        });

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
            funnel: currentFunnel(),
            trackdeskClickId: getTrackdeskClickId(),
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
    copy,
    backendOverride,
  ]);

  const handleDownsellDecline = useCallback(async () => {
    setShowDownsellCTA(false);
    addUserMessage("No thanks");
    // Final refusal of the funnel's last offer — the terminal node. Also previously
    // untracked, so the funnel just ended with no event.
    const tarot = getPostHogFunnel() === "tarot" ? tarotEventProps() : undefined;
    trackPH("upsell_declined", {
      funnel: getPostHogFunnel() ?? "v1",
      step: "upsell2",
      product: "manifestation_bracelet",
      price_tier: "downsell",
      sign: tarot?.deck,
      ...(tarot ?? {}),
    });
    await processStage("DECLINED");
  }, [addUserMessage, processStage]);

  const handleShippingSubmit = useCallback(
    async (address: ShippingAddress) => {
      if (!sessionId || !userData) return;

      setShowShippingForm(false);

      try {
        // Backend stamps the address onto the upsell PaymentIntent (manual shipper
        // reads it off Stripe); V1 saves by session id. Byte-identical for V1.
        if (backendOverride ?? isTwinFlameOffer()) {
          await fetch("/api/backend/upsell/shipping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId: upsell2PaymentId, address }),
          });
        } else {
          await fetch("/api/upsell2/shipping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, address }),
          });
        }

        await processStage("COMPLETE");
      } catch (error) {
        console.error("Shipping error:", error);
        await sendBotMessage("Address saved. We'll confirm details via email.");
        setIsComplete(true);
      }
    },
    [sessionId, userData, processStage, sendBotMessage, upsell2PaymentId, backendOverride],
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
    downsellDeclineLabel: copy.downsellDeclineLabel,
    showContinue,
    continueLabel,
    handleContinue,
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
    upsell2Bought,
    handleUserInput,
    handleQuickReply,
    handleAccept,
    handleDecline,
    handleDownsellAccept,
    handleDownsellDecline,
    handleShippingSubmit,
  };
}
