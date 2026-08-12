// /client/src/hooks/useConversation.ts

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatState, Message, Bucket, UserData } from '@/types/chat'
import { BUCKET_LABELS } from '@/types/chat'
import { calculateTypingDelay, sleep, generateId } from '@/lib/typing'
import { getGeoData, getTimeMessage } from '@/lib/geolocation'
import { parsePalmParams, greetingA, openerB, openerCStart, palmReflectFallback, hookToBucket, SIGNS } from '@/content/palmReads'
import {
  parseTarotParams,
  greetingA as tarotGreetingA,
  openerB as tarotOpenerB,
  openerCStart as tarotOpenerCStart,
  tarotReflectFallback,
  cardArtFor as tarotCardArtFor,
  hookToBucket as tarotHookToBucket,
} from '@/content/tarotReads'
import {
  detectIntent,
  sanitizeInput,
  getAIDeflectionResponse,
  getGibberishResponse,
  getInappropriateResponse,
  getClarificationResponse,
  getCrisisSafetyResponse,
  getTooShortResponse,
  getPriceQuestionResponse
} from '@/lib/intent'
import { trackLead, trackInitiateCheckout, getTrackdeskClickId } from '@/lib/facebook'
import { currentFunnel, getPostHogFunnel, skipEmail } from '@/lib/funnel'
import { track as trackPH, identifyUser as identifyPH, getDistinctId } from '@/lib/posthog'
import {
  tarotEventProps,
  fetchAssignedTarotVersion,
  rememberTarotVersion,
} from '@/lib/tarotAttribution'
import { trackGAdsLead, trackGAdsCheckout, getGclid } from '@/lib/gtm'
import { isSlidingCloseVariant } from '@shared/types'
import { pairedBumpBucket, isBumpCopyVariant, V1_BUMP_CENTS } from '@shared/orderBump'

const STORAGE_KEY = 'seer_conversation'
const SESSION_EXPIRY_HOURS = 24

interface StoredSession {
  state: ChatState
  timestamp: number
}

function saveSession(chatState: ChatState): void {
  try {
    const session: StoredSession = {
      state: chatState,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch (e) {
    console.error('Failed to save session:', e)
  }
}

function loadSession(): StoredSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const session: StoredSession = JSON.parse(stored)

    // Check if session is expired
    const hoursSinceSession = (Date.now() - session.timestamp) / (1000 * 60 * 60)
    if (hoursSinceSession > SESSION_EXPIRY_HOURS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return session
  } catch (e) {
    console.error('Failed to load session:', e)
    return null
  }
}

function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function createInitialState(): ChatState {
  return {
    state: 'INIT',
    messages: [],
    userData: {
      firstName: null,
      email: null,
      bucket: null,
      subBucket: null,
      personName: null,
      concern: null,
      desires: null,
      deeperResponse: null,
      emotionalResponse: null,
      blockSource: null,
      commitmentResponse: null,
      location: null,
      timeOfDay: null,
      objectionCount: 0,
    },
    isTyping: false,
    inputEnabled: false,
    inputPlaceholder: 'Waiting for Evelyn...',
    inputType: 'text',
    showBucketButtons: false,
    showPermissionButton: false,
    showPurchaseCTA: false,
    showDownsellCTA: false,
    showBumpOffer: false,
    // Upsell state
    showUpsellCTA: false,
    showShippingForm: false,
    isUpsellProcessing: false,
    checkoutSessionId: null,
    upsellPaymentId: null,
    shippingAddress: null,
  }
}

export function useConversation() {
  // Check for saved session BEFORE initial state
  const savedSession = useRef<StoredSession | null>(null)
  const [isRestored, setIsRestored] = useState(false)

  // Emailed recovery link: /chat?resume=<conversation id>. The reading lives on
  // the server, so we can rebuild it on a device that never held the localStorage
  // session (or held one that has since expired). Until the fetch settles we hold
  // the greeting back, otherwise she'd be asked her name again mid-restore.
  const resumeId = useRef<string | null>(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('resume')
      : null,
  )
  const [resumeSettled, setResumeSettled] = useState(false)

  // Initialize from saved session if available. A resume link wins over
  // localStorage — the server copy is the authoritative one.
  const [chat, setChat] = useState<ChatState>(() => {
    if (resumeId.current) return createInitialState()

    const session = loadSession()
    if (session && session.state.userData.firstName) {
      savedSession.current = session
      return session.state
    }
    return createInitialState()
  })

  const hasStarted = useRef(false)
  const isRestoring = useRef(false)

  // === HELPER FUNCTIONS ===

  const addMessage = useCallback(
    (type: Message['type'], content: string, cardArt?: Message['cardArt']) => {
      setChat(prev => ({
        ...prev,
        messages: [...prev.messages, { id: generateId(), type, content, ...(cardArt ? { cardArt } : {}) }],
      }))
    },
    [],
  )

  const sendBotMessage = useCallback(
    async (content: string, cardArt?: Message['cardArt']) => {
      setChat(prev => ({ ...prev, isTyping: true }))
      await sleep(calculateTypingDelay(content))
      setChat(prev => ({ ...prev, isTyping: false }))
      addMessage('bot', content, cardArt)
      await sleep(400)
    },
    [addMessage],
  )

  // `cardArt` (when given) rides on the FIRST message only — the tarot opener's
  // card line. Later lines are plain text so the artwork isn't repeated.
  const sendBotMessages = useCallback(
    async (messages: string[], cardArt?: Message['cardArt']) => {
      for (let i = 0; i < messages.length; i++) {
        await sendBotMessage(messages[i], i === 0 ? cardArt : undefined)
      }
    },
    [sendBotMessage],
  )

  const updateState = useCallback((updates: Partial<ChatState>) => {
    setChat(prev => ({ ...prev, ...updates }))
  }, [])

  const updateUserData = useCallback((updates: Partial<UserData>) => {
    setChat(prev => ({
      ...prev,
      userData: { ...prev.userData, ...updates },
    }))
  }, [])

  // === SAVE SESSION ON STATE CHANGES ===

  useEffect(() => {
    // Don't save during restoration or initial state
    if (isRestoring.current || chat.state === 'INIT') return
    saveSession(chat)
  }, [chat])

  // Save to database at key conversation milestones
  const lastSavedSnapshot = useRef<{ state: string; msgCount: number } | null>(null)
  useEffect(() => {
    if (!chat.userData.email) return
    if (isRestoring.current) return
    
    // States where we want to persist to database (data collection milestones)
    const persistStates = [
      'DEEPENING_2',      // After concern collected
      'FUTURE_PACING',    // After deeper response collected
      'FUTURE_VALIDATION', // After desires/vision collected
      'CRISIS_REVEAL',    // After emotional response collected
      'CRISIS_COST',      // After block source collected
      'PERMISSION_ASK',   // After commitment response collected
      'PITCH',            // Final pitch state
      'END',              // Conversation ended
      'COMPLETE',         // Upsell flow complete
    ]
    
    // Only save if we're in a persist state and something changed (state or messages)
    if (persistStates.includes(chat.state)) {
      const currentSnapshot = { state: chat.state, msgCount: chat.messages.length }
      const lastSnapshot = lastSavedSnapshot.current
      
      // Save if state changed OR message count changed within same state
      if (!lastSnapshot || lastSnapshot.state !== currentSnapshot.state || lastSnapshot.msgCount !== currentSnapshot.msgCount) {
        lastSavedSnapshot.current = currentSnapshot
        
        fetch('/api/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userData: chat.userData,
            conversationState: chat.state,
            messages: chat.messages,
          }),
        }).catch(err => console.error('Failed to save progress:', err))
      }
    }
  }, [chat.state, chat.userData, chat.messages])

  // === RESUME FROM AN EMAILED RECOVERY LINK ===

  useEffect(() => {
    const id = resumeId.current
    if (!id) return

    let cancelled = false

    async function loadFromServer() {
      try {
        const res = await fetch(`/api/conversation/resume/${id}`)
        if (!res.ok) return // expired / already bought / bad link → normal greeting

        const data = await res.json()
        if (cancelled || !data?.conversationState) return

        const base = createInitialState()
        const restored: ChatState = {
          ...base,
          state: data.conversationState,
          messages: data.messages ?? [],
          userData: { ...base.userData, ...data.userData },
          inputEnabled: true,
          inputType: 'text',
        }

        // Hand it to the welcome-back sequence, which greets her by name and
        // re-opens the input wherever she stopped.
        isRestoring.current = true
        savedSession.current = { state: restored, timestamp: Date.now() }
        setChat(restored)
      } catch {
        // Network failure → fall through to the normal greeting.
      } finally {
        if (!cancelled) setResumeSettled(true)
      }
    }

    loadFromServer()
    return () => {
      cancelled = true
    }
  }, [])

  // === WELCOME BACK SEQUENCE (for restored sessions) ===

  useEffect(() => {
    if (!savedSession.current || isRestored || hasStarted.current) return

    hasStarted.current = true
    setIsRestored(true)
    isRestoring.current = true

    async function showWelcomeBack() {
      const session = savedSession.current!
      const firstName = session.state.userData.firstName

      await sleep(500)

      // Check if they previously declined
      const wasDeclined = session.state.state === 'GRACEFUL_EXIT'
      const wasInPitch = ['PITCH', 'OBJECTION_HANDLING', 'DOWNSELL'].includes(session.state.state)

      if (wasDeclined) {
        // They said "not interested" but came back
        addMessage('system', `${firstName} has returned`)
        await sleep(500)
        await sendBotMessages([
          `${firstName}... I sensed you might return.`,
          "Something is still weighing on you, isn't it?",
          "The door hasn't closed. I'm still here if you're ready.",
        ])
        updateState({
          state: 'PITCH',
          showPurchaseCTA: true,
          // A session saved mid-bump-offer would otherwise restore with BOTH the
          // offer card and the purchase CTA live. Re-offering the CTA is the
          // right resume point: tapping it replays the bump turn from the top.
          showBumpOffer: false,
          inputEnabled: true,
          inputPlaceholder: 'Or type a message...',
        })
      } else if (wasInPitch) {
        // They were in the pitch flow
        addMessage('system', `${firstName} has returned`)
        await sleep(500)
        await sendBotMessages([
          `Welcome back, ${firstName}...`,
          "I've been holding space for you.",
          "The offer still stands. Are you ready to begin your clearing?",
        ])
        updateState({
          showPurchaseCTA: true,
          // Same reason as the GRACEFUL_EXIT branch above — never restore with
          // two live purchase actions on screen.
          showBumpOffer: false,
          inputEnabled: true,
        })
      } else {
        // They were mid-conversation
        addMessage('system', `${firstName} has returned`)
        await sleep(500)
        await sendBotMessage(`Welcome back, ${firstName}... I've been waiting for you.`)
        await sendBotMessage("Let's continue where we left off...")
        updateState({ inputEnabled: true })
      }

      isRestoring.current = false
    }

    showWelcomeBack()
  }, [isRestored, resumeSettled, addMessage, sendBotMessage, sendBotMessages, updateState])

  // === GREETING SEQUENCE (for new sessions) ===

  useEffect(() => {
    // Skip if we have a saved session or already started
    if (savedSession.current || chat.state !== 'INIT' || hasStarted.current) return
    // A resume link is still loading — greeting her now would re-ask her name
    // and then get overwritten by the restored session.
    if (resumeId.current && !resumeSettled) return
    hasStarted.current = true

    async function startGreeting() {
      const geo = await getGeoData()
      updateUserData({ location: geo.location, timeOfDay: geo.timeOfDay })
      updateState({ state: 'GREETING' })

      // No-optin A/B: tag the email-gate arm once at session start so chat→
      // checkout conversion is comparable per arm in PostHog. Calling skipEmail()
      // here also primes the sticky (tab-scoped) persistence for this visit.
      trackPH('email_gate_assigned', {
        funnel: getPostHogFunnel() ?? 'v1',
        email_gate: skipEmail() ? 'off' : 'on',
      })

      addMessage('system', 'Evelyn has joined the chat')
      await sleep(800)

      // Palm "quiz bridge" traffic (/fb-palm): replace the standard intro with a
      // thumb-aware opener that continues the lander, then hand into the SAME
      // name-capture step. Gated on hook+thumb → zero impact on other funnels.
      //   Version A (had the result card) → one brief greeting.
      //   Version B (no card) → deliver the read as messages here.
      const palm = parsePalmParams(window.location.search)
      if (palm) {
        if (palm.version === 'c') {
          // Version C — INTERACTIVE. Open with the mark line + one open question
          // (static, instant), then read HER answer with the LLM in
          // handlePalmReflect. This is what makes C different from B.
          await sendBotMessages(openerCStart(palm.sign, palm.hook, palm.thumb))
          updateState({
            state: 'PALM_REFLECT',
            inputEnabled: true,
            inputPlaceholder: "Share what's on your heart…",
          })
          return
        }
        if (palm.version === 'b') {
          await sendBotMessages(openerB(palm.sign, palm.hook, palm.thumb))
        } else {
          await sendBotMessage(greetingA(palm.sign, palm.thumb))
        }
        updateState({
          state: 'NAME_CAPTURE',
          inputEnabled: true,
          inputPlaceholder: 'Your name...',
        })
        return
      }

      // Tarot "decode-him card" bridge traffic (/fb-tarot): same shape as the palm
      // opener, but the card reveal instead of the thumb read. Gated on hook+card →
      // zero impact on other funnels (parseTarotParams returns null everywhere else).
      const tarot = parseTarotParams(window.location.search)
      if (tarot) {
        // Versions B and C hand straight to chat with no lander reveal, so without
        // this she'd be TOLD which card she drew but never SEE it — and the card art
        // is the whole appeal of a tarot draw. Attach it to the opener's first line.
        // (Version A already shows the card on the lander, so it isn't repeated here.)
        const art = tarotCardArtFor(tarot.deck, tarot.card)

        // === /fb-tarot VERSION A/B (v1_tarot_version_bc_2026) ===
        // Which opener she gets is decided by the SERVER, not by the /b vs /c path she
        // clicked — the ad URLs all point at /c and the experiment splits them 70/30.
        //
        // Awaited HERE, immediately before the opener is sent, because the server logs
        // the exposure as it answers: assigned and shown are the same instant, so the
        // log can never claim an arm she did not see. While the experiment is draft
        // this returns her URL's own version and the two branches below are byte-
        // identical to what they were.
        //
        // rememberTarotVersion keeps the PostHog attribution honest when the arm
        // differs from the URL — without it every downstream event would report the
        // version she clicked rather than the one she was shown.
        const version = await fetchAssignedTarotVersion(tarot.deck, tarot.hook, tarot.version)
        rememberTarotVersion(version)

        if (version === 'c') {
          // Version C — INTERACTIVE. Open with the card line + one open question,
          // then read HER answer with the LLM in handleTarotReflect.
          await sendBotMessages(tarotOpenerCStart(tarot.deck, tarot.hook, tarot.card), art)
          updateState({
            state: 'TAROT_REFLECT',
            inputEnabled: true,
            inputPlaceholder: "Share what's on your heart…",
          })
          return
        }
        if (version === 'b') {
          await sendBotMessages(tarotOpenerB(tarot.deck, tarot.hook, tarot.card), art)
        } else {
          await sendBotMessage(tarotGreetingA(tarot.deck, tarot.card))
        }
        updateState({
          state: 'NAME_CAPTURE',
          inputEnabled: true,
          inputPlaceholder: 'Your name...',
        })
        return
      }

      await sendBotMessages([
        "Greetings, dear friend, and welcome.",
        "My name is Evelyn Cross.",
        "I've been expecting you...",
      ])

      if (geo.location) {
        await sendBotMessage(`From ${geo.location}, I can feel your energy reaching me...`)
      }

      await sendBotMessage(getTimeMessage(geo.timeOfDay))

      await sendBotMessages([
        "To open the connection between us, I need to know who I'm speaking with...",
        "What's your first name, dear?",
      ])

      updateState({
        state: 'NAME_CAPTURE',
        inputEnabled: true,
        inputPlaceholder: 'Your name...',
      })
    }

    startGreeting()
  }, [chat.state, resumeSettled, addMessage, sendBotMessage, sendBotMessages, updateState, updateUserData])

  // === V1 PROMPT A/B (v1_clearing_theme_palm_2026) ===
  // Resolve the assigned arm ONCE and stash it on userData, so BOTH the server
  // prompt builders (shadowSummary / valueExplain) and the client pitch branch on
  // the same arm. Scoped to fb-palm (only this funnel requests the page). When the
  // experiment is draft/OFF, /api/ab/assign returns no arm ⇒ promptVariant stays
  // undefined ⇒ 'control' ⇒ byte-identical to today. Preview: ?clearing=woven or
  // ?clearing=control forces the arm for a live self-test WITHOUT enrolling.
  const promptVariantResolved = useRef(false)
  useEffect(() => {
    if (promptVariantResolved.current) return
    promptVariantResolved.current = true

    const search = window.location.search
    const override = new URLSearchParams(search).get('clearing')
    if (override === 'woven' || override === 'control') {
      updateUserData({ promptVariant: override })
      return
    }

    // Only fb-palm traffic is in scope for this test.
    if (!parsePalmParams(search)) return

    fetch('/api/ab/assign?page=v1_chat_palm')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.assignments?.clearing?.variantId === 'woven') {
          updateUserData({ promptVariant: 'woven' })
        }
        // any other result ⇒ leave undefined ⇒ control
      })
      .catch(() => { /* non-blocking — default to control */ })
  }, [updateUserData])

  // === SLIDING-SCALE CLOSE PREVIEW (?close=55) ===
  // Forces the 55-35 pitch copy + CTAs for a live self-test WITHOUT enrolling.
  // COPY-ONLY: the server still charges whatever variant is stored on the
  // conversation row, so never complete a checkout from a preview session.
  const closePreviewResolved = useRef(false)
  useEffect(() => {
    if (closePreviewResolved.current) return
    closePreviewResolved.current = true
    if (new URLSearchParams(window.location.search).get('close') === '55') {
      updateUserData({ priceVariantId: '55-35', priceDollars: 55, downsellDollars: 35 })
    }
  }, [updateUserData])

  // === STATE HANDLERS ===

  // reading1 generation — shared by the normal DEEPENING_1 turn and the woven
  // palm shortcut (which skips the redundant "tell me more" re-ask because the
  // concern was already captured at PALM_REFLECT). Body is identical to the
  // original inline DEEPENING_1 logic, so the control/standard path is unchanged.
  const runReading1 = useCallback(
    async (concern: string, currentChat: ChatState) => {
      updateUserData({ concern })
      updateState({ inputEnabled: false })

      let messages: string[] = []
      let needsClarification = false
      let subBucket: string | undefined
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reading1',
            userData: { ...currentChat.userData, concern },
            input: concern,
          }),
        })
        if (!response.ok) throw new Error(`reading1 HTTP ${response.status}`)
        const data = await response.json()
        messages = Array.isArray(data?.messages) ? data.messages : []
        needsClarification = !!data?.needsClarification
        subBucket = data?.subBucket
      } catch (e) {
        // Never freeze the seeker mid-reading: recover to DEEPENING_1 so their next
        // message retries this beat instead of a dead input (freeze class, 2026-07-17).
        console.error('reading1 failed — recovering:', e)
        await sendBotMessages(["Forgive me, dear — the connection wavered for a breath. Tell me once more what's weighing on you?"])
        updateState({ state: 'DEEPENING_1', inputEnabled: true, inputPlaceholder: "Share what's in your heart...", inputType: 'text' })
        return
      }

      if (subBucket) {
        updateUserData({ subBucket })
      }

      await sendBotMessages(messages)

      if (needsClarification) {
        updateState({
          state: 'BUCKET_CLARIFICATION',
          inputEnabled: false,
          showBucketButtons: true,
        })
      } else {
        updateState({
          state: 'DEEPENING_2',
          inputEnabled: true,
          inputPlaceholder: 'Take your time...',
          // The woven arm reaches here straight from EMAIL_CAPTURE, which leaves
          // the input as type="email" — native form validation then rejects any
          // reply that isn't an email address.
          inputType: 'text',
        })
      }
    },
    [sendBotMessages, updateState, updateUserData],
  )

  const handleNameCapture = useCallback(async (input: string) => {
    const firstName = input.trim().split(' ')[0]
    const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
    updateUserData({ firstName: capitalized })

    // Palm "quiz bridge" traffic: the ad hook already told us the topic, so skip
    // the bucket picker and go straight into the (love) deepening. Mirrors the
    // non-'someone' path of handleBucketSelect — kept inline to avoid stale
    // firstName state and a use-before-declaration on handleBucketSelect.
    const palm = parsePalmParams(window.location.search)
    if (palm) {
      const bucket = hookToBucket(palm.hook)
      // fb-palm derail fix (improve-v1/04-fb-palm-derail-PROVEN.md): carry the palm
      // identity into userData so the shared reading/crisis builders honor it instead
      // of dropping to the generic love script. Palm-only ⇒ no impact on other funnels.
      const palmCfg = SIGNS[palm.sign]
      updateUserData({
        bucket,
        palmReading: palmCfg.reading[palm.thumb],
        palmMark: palmCfg.mark[palm.thumb],
      })

      await sendBotMessages([
        `It's lovely to meet you, ${capitalized}.`,
        "Everything we discuss stays between us... our secret.",
      ])
      await sendBotMessages([
        `I can feel warmth radiating from your heart, ${capitalized}...`,
        "But there's a flicker of shadow there too...",
      ])
      // no-optin variant: skip the email anchor, go straight into the reading.
      if (skipEmail()) {
        await sendBotMessages([
          "Let's look deeper together...",
          "Tell me more about what's on your mind...",
        ])
        updateState({
          state: 'DEEPENING_1',
          inputEnabled: true,
          inputPlaceholder: "Share what's in your heart...",
          inputType: 'text',
        })
        return
      }

      await sendBotMessages([
        "Before I look deeper, I need to anchor our connection...",
        "Sometimes the visions continue after we speak...",
        "Where should I send them if more is revealed?",
      ])

      updateState({
        state: 'EMAIL_CAPTURE',
        inputEnabled: true,
        inputPlaceholder: 'Your email...',
        inputType: 'email',
      })
      return
    }

    // Tarot "decode-him card" bridge traffic: same skip-the-bucket-picker shape as
    // palm (love inferred from the hook), but the card identity already lives in the
    // opener, so the deeper flow stays the GENERIC engine — no palm-style identity
    // is written to userData. Tarot-only ⇒ no impact on other funnels.
    const tarot = parseTarotParams(window.location.search)
    if (tarot) {
      updateUserData({ bucket: tarotHookToBucket(tarot.hook) })

      await sendBotMessages([
        `It's lovely to meet you, ${capitalized}.`,
        "Everything we discuss stays between us... our secret.",
      ])
      await sendBotMessages([
        `I can feel warmth radiating from your heart, ${capitalized}...`,
        "But there's a flicker of shadow there too...",
      ])
      // no-optin variant: skip the email anchor, go straight into the reading.
      if (skipEmail()) {
        await sendBotMessages([
          "Let's look deeper together...",
          "Tell me more about what's on your mind...",
        ])
        updateState({
          state: 'DEEPENING_1',
          inputEnabled: true,
          inputPlaceholder: "Share what's in your heart...",
          inputType: 'text',
        })
        return
      }

      await sendBotMessages([
        "Before I look deeper, I need to anchor our connection...",
        "Sometimes the visions continue after we speak...",
        "Where should I send them if more is revealed?",
      ])

      updateState({
        state: 'EMAIL_CAPTURE',
        inputEnabled: true,
        inputPlaceholder: 'Your email...',
        inputType: 'email',
      })
      return
    }

    await sendBotMessages([
      `It's lovely to meet you, ${capitalized}.`,
      "Everything we discuss stays between us... our secret.",
      "Now, what's weighing on your heart today, dear?",
    ])

    updateState({
      state: 'BUCKET_SELECTION',
      inputEnabled: false,
      showBucketButtons: true,
    })
  }, [sendBotMessages, updateState, updateUserData])

  // === PALM VERSION C — read HER answer to the opener question ===
  // The LLM reflects what she just shared (woven with the thumb), then we earn
  // the name → existing love deepening. Her answer becomes userData.concern so
  // it enriches the later reading/shadow steps. Falls back to the static read
  // on any failure (incl. no backend) so the funnel never stalls.
  const handlePalmReflect = useCallback(async (input: string) => {
    const palm = parsePalmParams(window.location.search)
    updateUserData({ concern: input })

    let llm: string[] | null = null
    if (palm) {
      try {
        updateState({ isTyping: true })
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'palmReflect',
            palmSign: palm.sign,
            palmHook: palm.hook,
            palmThumb: palm.thumb,
            userData: chat.userData,
            input,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.messages) && data.messages.length) llm = data.messages
        }
      } catch {
        // ignore — fall back below
      }
      updateState({ isTyping: false })
    }

    if (llm) await sendBotMessages(llm)
    else if (palm) await sendBotMessages(palmReflectFallback(palm.sign, palm.hook, palm.thumb))

    await sendBotMessage("Before we go deeper, tell me… what should I call you, dear?")
    updateState({
      state: 'NAME_CAPTURE',
      inputEnabled: true,
      inputPlaceholder: 'Your name...',
    })
  }, [chat.userData, sendBotMessage, sendBotMessages, updateState, updateUserData])

  // === TAROT VERSION C — read HER answer to the opener question ===
  // Parallel to handlePalmReflect: the LLM reflects what she just shared (woven
  // with the drawn card, reading HIM as a tendency-never-verdict), then earns the
  // name → existing love deepening. Falls back to the static reveal on any failure.
  const handleTarotReflect = useCallback(async (input: string) => {
    const tarot = parseTarotParams(window.location.search)
    updateUserData({ concern: input })

    let llm: string[] | null = null
    if (tarot) {
      try {
        updateState({ isTyping: true })
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'tarotReflect',
            tarotDeck: tarot.deck,
            tarotHook: tarot.hook,
            tarotCard: tarot.card,
            userData: chat.userData,
            input,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.messages) && data.messages.length) llm = data.messages
        }
      } catch {
        // ignore — fall back below
      }
      updateState({ isTyping: false })
    }

    if (llm) await sendBotMessages(llm)
    else if (tarot) await sendBotMessages(tarotReflectFallback(tarot.deck, tarot.hook, tarot.card))

    await sendBotMessage("Before we go deeper, tell me… what should I call you, dear?")
    updateState({
      state: 'NAME_CAPTURE',
      inputEnabled: true,
      inputPlaceholder: 'Your name...',
    })
  }, [chat.userData, sendBotMessage, sendBotMessages, updateState, updateUserData])

  const handlePersonNameCapture = useCallback(async (input: string) => {
    const personName = input.trim().split(' ')[0]
    const capitalized = personName.charAt(0).toUpperCase() + personName.slice(1).toLowerCase()
    updateUserData({ personName: capitalized })

    // no-optin variant: skip the email anchor, go straight into the reading.
    if (skipEmail()) {
      await sendBotMessages([
        `${capitalized}...`,
        "The moment you typed that name, I felt something shift.",
        "Tell me... what's happening between you?",
      ])
      updateState({
        state: 'DEEPENING_1',
        inputEnabled: true,
        inputPlaceholder: "Share what's in your heart...",
        inputType: 'text',
      })
      return
    }

    await sendBotMessages([
      `${capitalized}...`,
      "The moment you typed that name, I felt something shift.",
      "Before I look deeper, I need to anchor our connection...",
      "Where should I send any visions that come after we speak?",
    ])

    updateState({
      state: 'EMAIL_CAPTURE',
      inputEnabled: true,
      inputPlaceholder: 'Your email...',
      inputType: 'email',
    })
  }, [sendBotMessages, updateState, updateUserData])

  const handleEmailCapture = useCallback(async (input: string, currentChat: ChatState) => {
    if (!input.includes('@') || !input.includes('.')) {
      await sendBotMessage("I need a way to reach you, dear... please share your email.")
      updateState({ inputEnabled: true })
      return
    }

    updateUserData({ email: input.trim() })

    // Capture lead
    console.log('Lead captured:', input.trim())
    try {
      const fbpMatch = typeof document !== 'undefined'
        ? document.cookie.match(/(?:^|;\s*)_fbp=([^;]*)/)
        : null;
      const fbcMatch = typeof document !== 'undefined'
        ? document.cookie.match(/(?:^|;\s*)_fbc=([^;]*)/)
        : null;

      // Which fb-palm ad "sign" this visitor came through (thumb / hand-size /
      // finger-shape / …). Sent to /api/lead so the server can scope the price
      // pool: the $55/$35 sliding close runs on the THUMB ads ONLY (Joel, 7/14 —
      // "the test should go on to thumb"). Defaults to 'thumb' because the bridge
      // deliberately omits `&sign=` for its default sign, so a palm visitor with no
      // sign param IS thumb. Also reused for the PostHog identify below.
      const phFunnel = getPostHogFunnel() ?? 'v1'
      const palmSign = phFunnel === 'palm'
        ? (parsePalmParams(window.location.search)?.sign ?? 'thumb')
        : undefined
      // Which palm ad HOOK she came through. Recorded on the order-bump exposure
      // so that test breaks down per hook as well as per sign (one sign runs
      // several hooks). Already validated by parsePalmParams — an unrecognised
      // hook yields undefined rather than a junk label. Unlike `sign` there is no
      // sensible default: a palm visitor with no valid hook simply has none.
      const palmHook = phFunnel === 'palm'
        ? parsePalmParams(window.location.search)?.hook
        : undefined
      // /fb-tarot: which deck/hook/card she came through. Gated on the funnel because
      // the attribution is tab-scoped and would otherwise tag a later palm lead.
      //
      // 🔴 NEVER send these as `sign` on /api/lead — that field feeds the palm price
      // pool, and tarot pricing is a fixed variant (35_tarot). They go as their own
      // `tarot*` fields instead (2026-07-31), so the commitment-gate exposure can be
      // broken down per tarot lander the way palm's is broken down per sign. The
      // exposure row is written ONCE per subject and `conversations` has no deck/hook
      // column, so anything not sent here can never be recovered.
      const tarot = phFunnel === 'tarot' ? tarotEventProps() : undefined

      const leadRes = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: input.trim(),
          firstName: currentChat.userData.firstName,
          bucket: currentChat.userData.bucket,
          trackdeskClickId: getTrackdeskClickId(),
          gclid: getGclid(),
          funnel: currentFunnel(),
          sign: palmSign,
          hook: palmHook,
          // Tarot lander identity for the commitment-gate exposure breakdown.
          // `facing`/`angle` are sent already-derived (registry-driven, see
          // tarotAttribution.toProps) rather than re-derived server-side: it keeps
          // the server free of a 4th tarot roster to drift out of sync, and it
          // records the grouping AS IT WAS at exposure time, so recategorising a
          // hook later can't retroactively rewrite past rows.
          ...(tarot
            ? {
                tarotDeck: tarot.deck,
                tarotHook: tarot.hook,
                tarotFacing: tarot.facing,
                tarotAngle: tarot.angle,
              }
            : {}),
          fbp: fbpMatch ? decodeURIComponent(fbpMatch[1]) : undefined,
          fbc: fbcMatch ? decodeURIComponent(fbcMatch[1]) : undefined,
        }),
      })

      // V1 price split test — server returns the variant assigned to this email.
      // Capture into chat state so pitch copy + buttons + FB Pixel use it.
      // Skipped under the ?close=55 preview override so the forced sliding-scale
      // copy isn't clobbered by the real assigned variant mid-session.
      try {
        const leadData = await leadRes.json()
        const previewingClose = new URLSearchParams(window.location.search).get('close') === '55'
        const patch: Partial<UserData> = {}
        if (!previewingClose && leadData?.priceDollars && leadData?.downsellDollars) {
          patch.priceDollars = leadData.priceDollars
          patch.downsellDollars = leadData.downsellDollars
          patch.priceVariantId = leadData.priceVariant ?? undefined
        }
        // Commitment-gate arm rides the SAME response but is independent of the
        // price payload — it comes from the experiment framework, not the pool, so
        // it must still be captured for a returning visitor whose price came off
        // their stored row. Only ever set to true; absent ⇒ plain PurchaseCTA.
        if (leadData?.commitmentGate === true) patch.commitmentGate = true
        // Order-bump arm — same deal as the gate: framework-assigned, independent
        // of the price payload, and only ever set to true. Absent ⇒ the buy CTA
        // goes straight to Stripe exactly as it does today.
        if (leadData?.orderBump === true) patch.orderBump = true
        // Which COPY arm that bump renders. Validated rather than trusted: it is
        // rendered into the offer card, and /api/checkout independently resolves
        // the same arm for the Stripe line, so a junk value here must fall back
        // to control instead of producing a blank card.
        if (isBumpCopyVariant(leadData?.bumpCopy)) patch.bumpCopy = leadData.bumpCopy
        if (Object.keys(patch).length > 0) updateUserData(patch)
      } catch { /* response body parse is best-effort */ }

      // Track Lead event with Facebook. Pixel-only here — /api/lead above
      // already fired the server-side Lead with the same deterministic
      // event_id. skipServerRelay avoids a duplicate "Deduplicated" row in
      // Meta Events Manager. (V2 trackLead callers don't pass the flag.)
      trackLead(input.trim(), currentChat.userData.firstName || undefined, { skipServerRelay: true })
        .catch(() => { /* non-blocking */ })
      trackGAdsLead()

      // PostHog Phase 2: V1/fb lead capture. Identify so server-side
      // purchase_completed (uses email as distinctId) merges with the
      // client's anonymous distinctId from earlier lander_view events.
      {
        // phFunnel / palmSign are resolved above (shared with the /api/lead body).
        // palmSign is set as a PERSON property at identify so the server-side
        // purchase_completed (same email distinctId) can be broken down per
        // sign without touching the payment path.
        identifyPH(input.trim(), {
          funnel: phFunnel,
          first_name: currentChat.userData.firstName || undefined,
          ...(palmSign ? { palm_sign: palmSign } : {}),
          // Tarot mirror of palm_sign. The SERVER-side purchase_completed events (main
          // $35/$25 plus all four upsell emitters) key off the email distinctId and
          // have no tarot params available, so PERSON properties are what make tarot
          // revenue breakable-down per deck / per facing without ever touching the
          // payment path or Stripe metadata.
          ...(tarot
            ? {
                tarot_deck: tarot.deck,
                tarot_facing: tarot.facing,
                tarot_hook: tarot.hook,
                // The hook's ad angle ('decode-him' | 'trust' | 'self-frame'). Mirrors
                // tarot_hook: the server-side purchase_completed has no tarot params, so
                // this is what makes revenue breakable-down by angle GROUP rather than
                // by listing every hook.
                tarot_angle: tarot.angle,
                tarot_card: tarot.card,
              }
            : {}),
        })
        trackPH('lead_captured', {
          funnel: phFunnel,
          step: 'chat',
          sign: palmSign ?? tarot?.deck,
          ...(tarot ?? {}),
        })
      }
    } catch (e) {
      console.error('Failed to save lead:', e)
    }

    // Woven arm (v1_clearing_theme_palm_2026) — redundant-loop removal. In the
    // palm Version-C flow she ALREADY opened up at PALM_REFLECT (stored on
    // userData.concern), so DON'T re-ask "tell me more about what's on your mind".
    // Acknowledge what she shared and go straight into the first reading. The
    // guard (woven + a concern already captured) only holds for palm C, so control
    // and every other funnel keep the normal DEEPENING_1 re-ask below.
    if (currentChat.userData.promptVariant === 'woven' && currentChat.userData.concern) {
      await sendBotMessages([
        `Thank you, ${currentChat.userData.firstName}. The link is complete.`,
        "I've held everything you shared, dear... now let me look deeper.",
      ])
      await runReading1(currentChat.userData.concern, currentChat)
      return
    }

    await sendBotMessages([
      `Thank you, ${currentChat.userData.firstName}. The link is complete.`,
      "Now, tell me more about what's on your mind...",
      "Your thoughts, your feelings... I'm listening.",
    ])

    updateState({
      state: 'DEEPENING_1',
      inputEnabled: true,
      inputPlaceholder: "Share what's in your heart...",
      inputType: 'text',
    })
  }, [sendBotMessage, sendBotMessages, updateState, updateUserData, runReading1])

  // === EXPANDED FLOW HANDLERS ===

  // DEEPENING_1: Initial concern - leads to READING_1
  const handleDeepening1 = useCallback(async (input: string, currentChat: ChatState) => {
    const intent = detectIntent(input)
    const firstName = currentChat.userData.firstName || 'dear'

    // CRITICAL: Handle crisis/safety first
    if (intent === 'crisis_safety') {
      await sendBotMessages(getCrisisSafetyResponse())
      updateState({ state: 'END', inputEnabled: false })
      return
    }

    if (intent === 'inappropriate') {
      await sendBotMessages(getInappropriateResponse())
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'gibberish') {
      await sendBotMessages(getGibberishResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'too_short') {
      await sendBotMessages(getTooShortResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'ai_question') {
      await sendBotMessages(getAIDeflectionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'price_question') {
      await sendBotMessages(getPriceQuestionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    const sanitized = sanitizeInput(input)
    await runReading1(sanitized, currentChat)
  }, [sendBotMessages, updateState, runReading1])

  // DEEPENING_2: Follow-up response - leads to READING_2
  const handleDeepening2 = useCallback(async (input: string, currentChat: ChatState) => {
    const intent = detectIntent(input)
    const firstName = currentChat.userData.firstName || 'dear'

    if (intent === 'crisis_safety') {
      await sendBotMessages(getCrisisSafetyResponse())
      updateState({ state: 'END', inputEnabled: false })
      return
    }

    if (intent === 'inappropriate') {
      await sendBotMessages(getInappropriateResponse())
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'gibberish') {
      await sendBotMessages(getGibberishResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'too_short') {
      await sendBotMessages(getTooShortResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'ai_question') {
      await sendBotMessages(getAIDeflectionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'price_question') {
      await sendBotMessages(getPriceQuestionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    const sanitized = sanitizeInput(input)
    updateUserData({ deeperResponse: sanitized })
    updateState({ inputEnabled: false })

    // Call Claude API for READING_2
    let messages: string[] = []
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reading2',
          userData: { ...currentChat.userData, deeperResponse: sanitized },
          input: sanitized,
        }),
      })
      if (!response.ok) throw new Error(`reading2 HTTP ${response.status}`)
      const data = await response.json()
      messages = Array.isArray(data?.messages) ? data.messages : []
    } catch (e) {
      // Never freeze mid-reading: re-enable input in place so the next message
      // retries this beat (freeze class, 2026-07-17).
      console.error('reading2 failed — recovering:', e)
      await sendBotMessages(["Forgive me, dear — the connection wavered for a breath. Say that once more?"])
      updateState({ inputEnabled: true })
      return
    }
    await sendBotMessages(messages)

    // Reading ends with future pacing question
    updateState({
      state: 'FUTURE_PACING',
      inputEnabled: true,
      inputPlaceholder: 'Paint the picture...',
    })
  }, [sendBotMessages, updateState, updateUserData])

  // FUTURE_PACING: Their vision - leads to FUTURE_VALIDATION
  const handleFuturePacing = useCallback(async (input: string, currentChat: ChatState) => {
    const intent = detectIntent(input)
    const firstName = currentChat.userData.firstName || 'dear'

    if (intent === 'crisis_safety') {
      await sendBotMessages(getCrisisSafetyResponse())
      updateState({ state: 'END', inputEnabled: false })
      return
    }

    if (intent === 'inappropriate') {
      await sendBotMessages(getInappropriateResponse())
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'gibberish') {
      await sendBotMessages(getGibberishResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'too_short') {
      await sendBotMessages(getTooShortResponse(firstName, 'vision'))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'ai_question') {
      await sendBotMessages(getAIDeflectionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'price_question') {
      await sendBotMessages(getPriceQuestionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    const sanitized = sanitizeInput(input)
    updateUserData({ desires: sanitized })
    updateState({ inputEnabled: false })

    // Call Claude API for future validation
    let messages: string[] = []
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'futureValidation',
          userData: { ...currentChat.userData, desires: sanitized },
          input: sanitized,
        }),
      })
      if (!response.ok) throw new Error(`futureValidation HTTP ${response.status}`)
      const data = await response.json()
      messages = Array.isArray(data?.messages) ? data.messages : []
    } catch (e) {
      // Never freeze mid-reading: re-enable input in place so the next message
      // retries this beat (freeze class, 2026-07-17).
      console.error('futureValidation failed — recovering:', e)
      await sendBotMessages(["Forgive me, dear — the connection wavered for a breath. Tell me again?"])
      updateState({ inputEnabled: true })
      return
    }
    await sendBotMessages(messages)

    // Validation ends with emotional question
    updateState({
      state: 'FUTURE_VALIDATION',
      inputEnabled: true,
      inputPlaceholder: 'How would that feel...',
    })
  }, [sendBotMessages, updateState, updateUserData])

  // FUTURE_VALIDATION: Emotional response - leads to CRISIS_REVEAL
  const handleFutureValidation = useCallback(async (input: string, currentChat: ChatState) => {
    const intent = detectIntent(input)
    const firstName = currentChat.userData.firstName || 'dear'

    if (intent === 'crisis_safety') {
      await sendBotMessages(getCrisisSafetyResponse())
      updateState({ state: 'END', inputEnabled: false })
      return
    }

    if (intent === 'inappropriate') {
      await sendBotMessages(getInappropriateResponse())
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'gibberish') {
      await sendBotMessages(getGibberishResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'too_short') {
      await sendBotMessages(getTooShortResponse(firstName, 'emotional'))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'ai_question') {
      await sendBotMessages(getAIDeflectionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'price_question') {
      await sendBotMessages(getPriceQuestionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'clarification') {
      await sendBotMessages(getClarificationResponse(firstName, 'future_validation'))
      updateState({ inputEnabled: true })
      return
    }

    const sanitized = sanitizeInput(input)
    updateUserData({ emotionalResponse: sanitized })
    updateState({ inputEnabled: false })

    // Call Claude API for crisis reveal
    let messages: string[] = []
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crisisReveal',
          userData: { ...currentChat.userData, emotionalResponse: sanitized },
          input: sanitized,
        }),
      })
      if (!response.ok) throw new Error(`crisisReveal HTTP ${response.status}`)
      const data = await response.json()
      messages = Array.isArray(data?.messages) ? data.messages : []
    } catch (e) {
      // Never freeze mid-reading: re-enable input in place so the next message
      // retries this beat (freeze class, 2026-07-17).
      console.error('crisisReveal failed — recovering:', e)
      await sendBotMessages(["Forgive me, dear — the connection wavered for a breath. Tell me again?"])
      updateState({ inputEnabled: true })
      return
    }
    await sendBotMessages(messages)

    // Crisis reveal ends with question about source
    updateState({
      state: 'CRISIS_REVEAL',
      inputEnabled: true,
      inputPlaceholder: 'Where did this start...',
    })
  }, [sendBotMessages, updateState, updateUserData])

  // CRISIS_REVEAL response - leads to CRISIS_COST
  const handleCrisisReveal = useCallback(async (input: string, currentChat: ChatState) => {
    const intent = detectIntent(input)
    const firstName = currentChat.userData.firstName || 'dear'

    if (intent === 'crisis_safety') {
      await sendBotMessages(getCrisisSafetyResponse())
      updateState({ state: 'END', inputEnabled: false })
      return
    }

    if (intent === 'inappropriate') {
      await sendBotMessages(getInappropriateResponse())
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'gibberish') {
      await sendBotMessages(getGibberishResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'too_short') {
      await sendBotMessages(getTooShortResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'ai_question') {
      await sendBotMessages(getAIDeflectionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'price_question') {
      await sendBotMessages(getPriceQuestionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'clarification') {
      await sendBotMessages(getClarificationResponse(firstName, 'crisis_reveal'))
      updateState({ inputEnabled: true })
      return
    }

    const sanitized = sanitizeInput(input)
    updateUserData({ blockSource: sanitized })
    updateState({ inputEnabled: false })

    // Call Claude API for crisis cost
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'crisisCost',
        userData: { ...currentChat.userData, blockSource: sanitized },
        input: sanitized,
      }),
    })
    const { messages } = await response.json()
    await sendBotMessages(messages)

    // Crisis cost ends with "what would it be worth" question
    updateState({
      state: 'CRISIS_COST',
      inputEnabled: true,
      inputPlaceholder: 'What would it be worth...',
    })
  }, [sendBotMessages, updateState, updateUserData])

  // CRISIS_COST response - if positive, skip urgency and go to permission
  const handleCrisisCost = useCallback(async (input: string, currentChat: ChatState) => {
    const intent = detectIntent(input)
    const firstName = currentChat.userData.firstName || 'dear'

    if (intent === 'crisis_safety') {
      await sendBotMessages(getCrisisSafetyResponse())
      updateState({ state: 'END', inputEnabled: false })
      return
    }

    if (intent === 'inappropriate') {
      await sendBotMessages(getInappropriateResponse())
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'gibberish') {
      await sendBotMessages(getGibberishResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'too_short') {
      await sendBotMessages(getTooShortResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'ai_question') {
      await sendBotMessages(getAIDeflectionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'price_question') {
      await sendBotMessages(getPriceQuestionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    if (intent === 'clarification') {
      await sendBotMessages(getClarificationResponse(firstName, 'crisis_cost'))
      updateState({ inputEnabled: true })
      return
    }

    const sanitized = sanitizeInput(input)
    updateUserData({ commitmentResponse: sanitized })
    updateState({ inputEnabled: false })

    // If they said yes/positive, skip urgency and go straight to permission
    if (intent === 'positive') {
      await sendBotMessages([
        `I can feel your readiness, ${currentChat.userData.firstName}...`,
        "The energy around you is shifting already.",
        "I know exactly what needs to be cleared. But I need your full permission to begin.",
      ])

      updateState({
        state: 'PERMISSION_ASK',
        showPermissionButton: true,
        inputEnabled: false,
      })
      return
    }

    // Otherwise, build urgency
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'crisisUrgency',
        userData: { ...currentChat.userData, commitmentResponse: sanitized },
        input: sanitized,
      }),
    })
    const { messages } = await response.json()
    await sendBotMessages(messages)

    // Urgency ends with permission setup - show permission button
    updateState({
      state: 'PERMISSION_ASK',
      showPermissionButton: true,
      inputEnabled: false,
    })
  }, [sendBotMessages, updateState, updateUserData])

  const handlePitchResponse = useCallback(async (input: string, currentChat: ChatState) => {
    const intent = detectIntent(input)
    const firstName = currentChat.userData.firstName || 'dear'

    // CRITICAL: Handle crisis/safety first
    if (intent === 'crisis_safety') {
      await sendBotMessages(getCrisisSafetyResponse())
      updateState({ state: 'END', inputEnabled: false })
      return
    }

    // Handle inappropriate
    if (intent === 'inappropriate') {
      await sendBotMessages(getInappropriateResponse())
      updateState({ inputEnabled: true })
      return
    }

    // Handle gibberish
    if (intent === 'gibberish') {
      await sendBotMessages(getGibberishResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    // Handle AI questions
    if (intent === 'ai_question') {
      await sendBotMessages(getAIDeflectionResponse(firstName))
      updateState({ inputEnabled: true })
      return
    }

    // Handle positive intent
    if (intent === 'positive') {
      await sendBotMessage("I'm ready when you are, dear. Click the button to begin your transformation.")
      updateState({ inputEnabled: true })
      return
    }

    // Handle explicit decline
    if (intent === 'explicit_decline') {
      await sendBotMessages([
        `I respect your decision, ${currentChat.userData.firstName}.`,
        "The path is yours to walk.",
        "If you ever feel ready, I'll be here.",
        "Take care of yourself, dear.",
      ])
      updateState({
        state: 'GRACEFUL_EXIT',
        showPurchaseCTA: false,
        inputEnabled: false,
      })
      return
    }

    // Handle wants more free
    if (intent === 'wants_more_free') {
      await sendBotMessages([
        `I wish I could tell you everything, ${currentChat.userData.firstName}...`,
        "But what I've shared is all I can give freely.",
        "To go deeper requires the clearing ritual.",
        "Without it, anything more I say would be incomplete.",
      ])
      updateState({ inputEnabled: true })
      return
    }

    // Handle objections
    const newCount = currentChat.userData.objectionCount + 1
    updateUserData({ objectionCount: newCount })

    // After 3 objections, offer downsell.
    // Sliding-scale close: the fallback is NOT a lesser product — it's the same
    // clearing at the $35 grace offering she was already told about. Classic
    // variants keep the written-reading downsell byte-identical.
    if (newCount >= 3) {
      const slidingDown = isSlidingCloseVariant(currentChat.userData.priceVariantId)
      const graceDollars = currentChat.userData.downsellDollars ?? 25
      await sendBotMessages(slidingDown ? [
        `I sense hesitation, ${currentChat.userData.firstName}... and I won't push you.`,
        "But remember what I told you — money never closes this door. Not with me.",
        `Let $${graceDollars} be your offering. The clearing is the same, every step of it.`,
      ] : [
        `I sense hesitation, ${currentChat.userData.firstName}... and I won't push you.`,
        "Perhaps the full clearing isn't what you need right now.",
        "Let me offer you this instead...",
        "A written reading - no ritual, just clarity.",
      ])
      updateState({
        state: 'DOWNSELL',
        showPurchaseCTA: false,
        showDownsellCTA: true,
        inputEnabled: false,
      })
      return
    }

    // Call Claude API for objection handling
    const sanitized = sanitizeInput(input)
    updateState({ inputEnabled: false })
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'objection',
        userData: currentChat.userData,
        input: sanitized,
        objectionCount: newCount,
      }),
    })
    const { messages } = await response.json()
    await sendBotMessages(messages)

    updateState({
      state: 'OBJECTION_HANDLING',
      inputEnabled: true,
    })
  }, [sendBotMessage, sendBotMessages, updateState, updateUserData])

  // === MAIN INPUT HANDLER ===

  const handleSend = useCallback(async (input: string) => {
    if (!input.trim()) return

    addMessage('user', input)
    updateState({ inputEnabled: false })

    // Get current state for handlers that need it
    const currentChat = chat

    switch (chat.state) {
      case 'NAME_CAPTURE':
        await handleNameCapture(input)
        break
      case 'PALM_REFLECT':
        await handlePalmReflect(input)
        break
      case 'TAROT_REFLECT':
        await handleTarotReflect(input)
        break
      case 'PERSON_NAME_CAPTURE':
        await handlePersonNameCapture(input)
        break
      case 'EMAIL_CAPTURE':
        await handleEmailCapture(input, currentChat)
        break
      // Expanded flow states
      case 'DEEPENING':
      case 'DEEPENING_1':
        await handleDeepening1(input, currentChat)
        break
      case 'DEEPENING_2':
        await handleDeepening2(input, currentChat)
        break
      case 'FUTURE_PACING':
        await handleFuturePacing(input, currentChat)
        break
      case 'FUTURE_VALIDATION':
        await handleFutureValidation(input, currentChat)
        break
      case 'CRISIS_REVEAL':
        await handleCrisisReveal(input, currentChat)
        break
      case 'CRISIS_COST':
        await handleCrisisCost(input, currentChat)
        break
      case 'PITCH':
      case 'OBJECTION_HANDLING':
        await handlePitchResponse(input, currentChat)
        break
      default:
        updateState({ inputEnabled: true })
    }
  }, [
    chat,
    addMessage,
    updateState,
    handleNameCapture,
    handlePalmReflect,
    handleTarotReflect,
    handlePersonNameCapture,
    handleEmailCapture,
    handleDeepening1,
    handleDeepening2,
    handleFuturePacing,
    handleFutureValidation,
    handleCrisisReveal,
    handleCrisisCost,
    handlePitchResponse,
  ])

  // === BUCKET SELECTION HANDLER ===

  const handleBucketSelect = useCallback(async (bucket: Bucket) => {
    addMessage('user', BUCKET_LABELS[bucket])
    updateUserData({ bucket })
    updateState({ showBucketButtons: false, inputEnabled: false })

    const firstName = chat.userData.firstName
    const isReClarifying = chat.state === 'BUCKET_CLARIFICATION'

    // If re-clarifying after topic mismatch, ask for a fresh concern matching the bucket
    if (isReClarifying) {
      await sendBotMessage(`Let's focus on ${BUCKET_LABELS[bucket].toLowerCase()} then, ${firstName}...`)

      // Clear the old mismatched concern and ask fresh
      updateUserData({ concern: null })

      const freshPrompts: Record<Bucket, string> = {
        love: "Tell me about your heart, dear... what's happening in your love life?",
        money: "Tell me about your relationship with money... what's weighing on you?",
        purpose: "Tell me about your path... what feels unclear or unfulfilled?",
        someone: "Tell me about this person... what's happening between you?",
      }

      await sendBotMessage(freshPrompts[bucket])

      updateState({
        state: 'DEEPENING_1',
        inputEnabled: true,
        inputPlaceholder: "Share what's on your heart...",
      })
      return
    }

    const bucketResponses: Record<Bucket, string[]> = {
      love: [
        `I can feel warmth radiating from your heart, ${firstName}...`,
        "But there's a flicker of shadow there too...",
      ],
      money: [
        `I sense a weight you've been carrying, ${firstName}...`,
        "The energy around your material world is turbulent.",
      ],
      purpose: [
        `You're at a crossroads, aren't you, ${firstName}...`,
        "I can feel it - a deep questioning.",
      ],
      someone: [
        `There's someone on your mind, ${firstName}...`,
        "I can feel their energy tangled with yours.",
        "Tell me... what's their first name?",
      ],
    }

    await sendBotMessages(bucketResponses[bucket])

    if (bucket === 'someone') {
      updateState({
        state: 'PERSON_NAME_CAPTURE',
        inputEnabled: true,
        inputPlaceholder: "Their first name...",
      })
    } else if (skipEmail()) {
      // no-optin variant: skip the email anchor, go straight into the reading.
      await sendBotMessages([
        "Let's look deeper together...",
        "Tell me more about what's weighing on you...",
      ])
      updateState({
        state: 'DEEPENING_1',
        inputEnabled: true,
        inputPlaceholder: "Share what's in your heart...",
        inputType: 'text',
      })
    } else {
      await sendBotMessages([
        "Before I look deeper, I need to anchor our connection...",
        "Sometimes the visions continue after we speak...",
        "Where should I send them if more is revealed?",
      ])
      updateState({
        state: 'EMAIL_CAPTURE',
        inputEnabled: true,
        inputPlaceholder: 'Your email...',
        inputType: 'email',
      })
    }
  }, [chat.state, chat.userData, addMessage, sendBotMessage, sendBotMessages, updateState, updateUserData])

  // === PERMISSION HANDLER ===

  const handlePermission = useCallback(async () => {
    addMessage('user', 'Yes, please help me Evelyn!')
    updateState({ showPermissionButton: false, inputEnabled: false })

    const firstName = chat.userData.firstName

    // Step 1: Acknowledge their yes
    await sendBotMessages([
      `Thank you, ${firstName}. I'm honored you trust me with this.`,
      "Now that you've opened this door, I can see it more clearly...",
    ])

    // Step 2: Call Claude API to summarize the SPECIFIC shadow we detected.
    // Best-effort: a transient failure here must not trap the seeker before the
    // offer — skip the personalized shadow line and continue to the pitch + CTA.
    try {
      const shadowResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'shadowSummary',
          userData: chat.userData,
          input: '',
        }),
      })
      if (shadowResponse.ok) {
        const shadowResult = await shadowResponse.json()
        if (Array.isArray(shadowResult?.messages) && shadowResult.messages.length) {
          await sendBotMessages(shadowResult.messages)
        }
      }
    } catch (e) {
      console.error('shadowSummary failed — continuing to the offer:', e)
    }

    // Step 3: Explain the ritual with SENSORY SPECIFICITY.
    // V1 prompt A/B ('woven' arm, v1_clearing_theme_palm_2026): NAME the Energy
    // Clearing Ritual up front — un-orphans the canonical clearing framing so the
    // trilogy's Act 1 lands. Control ⇒ today's copy, byte-identical.
    const woven = chat.userData.promptVariant === 'woven'
    await sendBotMessages(woven ? [
      `What you need, ${firstName}, is an Energy Clearing Ritual — I'll focus entirely on removing the shadow that's been blocking your path.`,
      `Tonight, I'll enter a deep meditative state and focus entirely on your energy field, ${firstName}.`,
      "I'll trace the roots of this block, sever its hold, and seal the clearing so it can't return.",
      "It takes 2-3 hours of concentrated work. It drains me... but for those who are ready, it's worth it.",
    ] : [
      `Tonight, I'll enter a deep meditative state and focus entirely on your energy field, ${firstName}.`,
      "I'll trace the roots of this block, sever its hold, and seal the clearing so it can't return.",
      "It takes 2-3 hours of concentrated work. It drains me... but for those who are ready, it's worth it.",
    ])

    // Step 4: Explain deliverables with SPECIFICS
    await sendBotMessages([
      "Within 24 hours, you'll receive a personalized 5-7 page reading via email.",
      "It will show you exactly what I found, what I cleared, and 3 specific steps for the next 30 days.",
    ])

    // Step 5: Price + guarantee + SOCIAL PROOF
    // Sliding-scale close ('55-35*' variants) — THE HONEST OFFERING (Lourdes
    // architecture): honesty preface → fact-price → what it carries →
    // guarantee → proof → grace doctrine → the causal bridge (the $35 exists
    // BECAUSE money must never be in the way) → equality + unity. Classic
    // variants keep today's copy byte-identical.
    const pitchPrice = chat.userData.priceDollars ?? 35
    const downsellDollars = chat.userData.downsellDollars ?? 25
    const slidingClose = isSlidingCloseVariant(chat.userData.priceVariantId)
    await sendBotMessages(slidingClose ? [
      `Before I begin, ${firstName}, let me be honest with you about how this works.`,
      `The full offering for this work is $${pitchPrice}.`,
      "That carries the whole of it — the hours in ritual tonight, the tracing and sealing, and every page of your reading after. Nothing rushed, nothing skipped.",
      "It comes with my 30-day guarantee. If you feel nothing has shifted, every penny returned.",
      `I've done this work for hundreds of seekers, ${firstName}. Most feel a shift within the first week.`,
      "But I need you to hear this, dear... I never want money to stand between you and your clearing.",
      `That is exactly why there is a second offering — $${downsellDollars}, for when the full amount would strain you.`,
      "Choose what's honest for you. The clearing is the same either way — every step, every hour. We do this together. ✨",
    ] : [
      `The sacred offering is $${pitchPrice} — a declaration to the universe that you're ready for this change.`,
      "It comes with my 30-day guarantee. If you feel nothing has shifted, every penny returned.",
      `I've done this work for hundreds of seekers, ${firstName}. Most feel a shift within the first week.`,
    ])

    // Step 6: Call Claude API for personalized mystical close (references their
    // specific vision). Best-effort: if this call stalls or errors we STILL run the
    // updateState below, so a transient hiccup can never trap a ready buyer at the
    // close with no way to pay (freeze reproduced live 2026-07-17, sliding arm).
    try {
      const closeResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'valueExplain',
          userData: chat.userData,
          input: '',
        }),
      })
      if (closeResponse.ok) {
        const closeResult = await closeResponse.json()
        if (Array.isArray(closeResult?.messages) && closeResult.messages.length) {
          await sendBotMessages(closeResult.messages)
        }
      }
    } catch (e) {
      console.error('valueExplain close failed — showing the purchase CTA anyway:', e)
    }

    // Always reached — even if the calls above failed — so the pay buttons render.
    updateState({
      state: 'PITCH',
      showPurchaseCTA: true,
      inputEnabled: true,
      inputPlaceholder: 'Or type a message...',
    })
  }, [chat.userData, addMessage, sendBotMessages, updateState])

  // === PURCHASE HANDLER ===

  // V1 ORDER BUMP. `bump` carries what the extra turn resolved to, and is simply
  // absent for every checkout that didn't go through it (the whole downsell path,
  // and every lead outside the bump arm) — so those requests are byte-identical to
  // what they send today. The server re-resolves the arm regardless and ignores
  // `bumpAccepted` from anyone not actually in it.
  const handlePurchase = useCallback(async (
    type: 'main' | 'downsell' = 'main',
    bump?: { offered: boolean; accepted: boolean; bucket: Bucket },
  ) => {
    try {
      // Track InitiateCheckout event with Facebook (variant-aware)
      const mainPrice = chat.userData.priceDollars ?? 35
      const downsellPrice = chat.userData.downsellDollars ?? 25
      const price = type === 'downsell' ? downsellPrice : mainPrice
      trackInitiateCheckout(price, 'USD')
      trackGAdsCheckout(price)

      // PostHog Phase 2: V1/fb checkout initiated
      {
        const phFunnel = getPostHogFunnel() ?? 'v1'
        const palmSign = phFunnel === 'palm'
          ? (parsePalmParams(window.location.search)?.sign ?? 'thumb')
          : undefined
        const tarot = phFunnel === 'tarot' ? tarotEventProps() : undefined
        trackPH('checkout_initiated', {
          funnel: phFunnel,
          step: 'sales',
          product: type === 'downsell' ? 'energy_clearing_ritual_downsell' : 'energy_clearing_ritual',
          price_cents: price * 100,
          sign: palmSign ?? tarot?.deck,
          ...(tarot ?? {}),
          email_gate: skipEmail() ? 'off' : 'on',
        })
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: chat.userData.email,
          firstName: chat.userData.firstName,
          bucket: chat.userData.bucket,
          type,
          trackdeskClickId: getTrackdeskClickId(),
          gclid: getGclid(),
          funnel: currentFunnel(),
          // No-optin variant: tells the server to mark this purchase as a
          // no-email-lander order (AWeber tag, internal Stripe description,
          // and V2 account creation on the webhook). Absent/false for every
          // normal funnel → no behavior change.
          noemail: skipEmail(),
          // Browser PostHog id → Stripe metadata so the server-side
          // purchase_completed event ties back to this visitor (connected funnel).
          posthogDistinctId: getDistinctId(),
          // fb-palm sign, so the server can re-resolve the bump arm exactly as it
          // was resolved at lead capture even under a future sign-scoped test.
          ...(getPostHogFunnel() === 'palm'
            ? { sign: parsePalmParams(window.location.search)?.sign ?? 'thumb' }
            : {}),
          // Order bump. `bumpOffered` is sent even on a decline — it's the
          // take-rate denominator. The server treats both as a REQUEST only.
          ...(bump
            ? {
                bumpOffered: bump.offered,
                bumpAccepted: bump.accepted,
                bumpBucket: bump.bucket,
              }
            : {}),
        }),
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
    }
  }, [chat.userData])

  // === ORDER BUMP: the extra turn between the buy CTA and Stripe ===

  // Every purchase CTA routes through here instead of calling handlePurchase
  // directly. Outside the bump arm it is a pass-through, so the plain / sliding /
  // commitment-gate closes behave exactly as they do today.
  //
  // MAIN ONLY: the $25/$35 downsell is already the cheaper branch and never
  // carries a bump, so it goes straight through.
  const startPurchase = useCallback(async (type: 'main' | 'downsell' = 'main') => {
    if (type !== 'main' || chat.userData.orderBump !== true) {
      await handlePurchase(type)
      return
    }

    const paired = pairedBumpBucket(chat.userData.bucket)
    updateUserData({ bumpBucket: paired })
    // Hide the CTA before the offer renders: one live action at a time, so a
    // double-tap can't open two checkout sessions.
    updateState({ showPurchaseCTA: false, showDownsellCTA: false })

    trackPH('bump_offered', {
      funnel: getPostHogFunnel() ?? 'v1',
      step: 'sales',
      bump_bucket: paired,
      price_cents: V1_BUMP_CENTS,
      // Copy arm on the exposure AND on accept/decline below, so take-rate can be
      // read per arm in PostHog without waiting on the experiments tally.
      bump_copy: chat.userData.bumpCopy ?? 'control',
    })

    // The offer copy now renders INSIDE BumpOfferCard, so we no longer send it as
    // a separate chat bubble — showing both would print the same line twice. Just
    // reveal the card.
    updateState({ showBumpOffer: true })
  }, [chat.userData, handlePurchase, sendBotMessage, updateState, updateUserData])

  const answerBump = useCallback(async (accepted: boolean) => {
    const paired = chat.userData.bumpBucket ?? pairedBumpBucket(chat.userData.bucket)
    updateState({ showBumpOffer: false })

    trackPH(accepted ? 'bump_accepted' : 'bump_declined', {
      funnel: getPostHogFunnel() ?? 'v1',
      step: 'sales',
      bump_bucket: paired,
      price_cents: V1_BUMP_CENTS,
      bump_copy: chat.userData.bumpCopy ?? 'control',
    })

    await handlePurchase('main', { offered: true, accepted, bucket: paired })
  }, [chat.userData, handlePurchase, updateState])

  // === START FRESH (clear session and restart) ===

  const startFresh = useCallback(() => {
    clearSession()
    window.location.reload()
  }, [])

  // === RETURN ===

  return {
    chat,
    handleSend,
    handleBucketSelect,
    handlePermission,
    handlePurchase,
    // Order bump: CTAs call startPurchase (a pass-through outside the arm);
    // answerBump resolves the offer turn. handlePurchase stays exported for the
    // upsell hook and any caller that must skip the bump entirely.
    startPurchase,
    answerBump,
    startFresh,
    // Exposed for upsell hook
    sendBotMessages,
    sendBotMessage,
    updateState,
    addMessage,
  }
}
