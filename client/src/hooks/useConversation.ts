// /client/src/hooks/useConversation.ts

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatState, Message, Bucket, UserData } from '@/types/chat'
import { BUCKET_LABELS } from '@/types/chat'
import { calculateTypingDelay, sleep, generateId } from '@/lib/typing'
import { getGeoData, getTimeMessage } from '@/lib/geolocation'
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
import { currentFunnel, getPostHogFunnel } from '@/lib/funnel'
import { track as trackPH, identifyUser as identifyPH } from '@/lib/posthog'
import { trackGAdsLead, trackGAdsCheckout, getGclid } from '@/lib/gtm'

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

  // Initialize from saved session if available
  const [chat, setChat] = useState<ChatState>(() => {
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

  const addMessage = useCallback((type: Message['type'], content: string) => {
    setChat(prev => ({
      ...prev,
      messages: [...prev.messages, { id: generateId(), type, content }],
    }))
  }, [])

  const sendBotMessage = useCallback(async (content: string) => {
    setChat(prev => ({ ...prev, isTyping: true }))
    await sleep(calculateTypingDelay(content))
    setChat(prev => ({ ...prev, isTyping: false }))
    addMessage('bot', content)
    await sleep(400)
  }, [addMessage])

  const sendBotMessages = useCallback(async (messages: string[]) => {
    for (const msg of messages) {
      await sendBotMessage(msg)
    }
  }, [sendBotMessage])

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
  }, [isRestored, addMessage, sendBotMessage, sendBotMessages, updateState])

  // === GREETING SEQUENCE (for new sessions) ===

  useEffect(() => {
    // Skip if we have a saved session or already started
    if (savedSession.current || chat.state !== 'INIT' || hasStarted.current) return
    hasStarted.current = true

    async function startGreeting() {
      const geo = await getGeoData()
      updateUserData({ location: geo.location, timeOfDay: geo.timeOfDay })
      updateState({ state: 'GREETING' })

      addMessage('system', 'Evelyn has joined the chat')
      await sleep(800)

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
  }, [chat.state, addMessage, sendBotMessage, sendBotMessages, updateState, updateUserData])

  // === STATE HANDLERS ===

  const handleNameCapture = useCallback(async (input: string) => {
    const firstName = input.trim().split(' ')[0]
    const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
    updateUserData({ firstName: capitalized })

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

  const handlePersonNameCapture = useCallback(async (input: string) => {
    const personName = input.trim().split(' ')[0]
    const capitalized = personName.charAt(0).toUpperCase() + personName.slice(1).toLowerCase()
    updateUserData({ personName: capitalized })

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
          fbp: fbpMatch ? decodeURIComponent(fbpMatch[1]) : undefined,
          fbc: fbcMatch ? decodeURIComponent(fbcMatch[1]) : undefined,
        }),
      })

      // V1 price split test — server returns the variant assigned to this email.
      // Capture into chat state so pitch copy + buttons + FB Pixel use it.
      try {
        const leadData = await leadRes.json()
        if (leadData?.priceDollars && leadData?.downsellDollars) {
          updateUserData({
            priceDollars: leadData.priceDollars,
            downsellDollars: leadData.downsellDollars,
          })
        }
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
        const phFunnel = getPostHogFunnel() ?? 'v1'
        identifyPH(input.trim(), {
          funnel: phFunnel,
          first_name: currentChat.userData.firstName || undefined,
        })
        trackPH('lead_captured', { funnel: phFunnel, step: 'chat' })
      }
    } catch (e) {
      console.error('Failed to save lead:', e)
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
  }, [sendBotMessage, sendBotMessages, updateState, updateUserData])

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
    updateUserData({ concern: sanitized })
    updateState({ inputEnabled: false })

    // Call Claude API for READING_1
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reading1',
        userData: { ...currentChat.userData, concern: sanitized },
        input: sanitized,
      }),
    })
    const { messages, needsClarification, subBucket } = await response.json()

    // Store detected sub-bucket for use in later prompts
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
      // Reading ends with follow-up question - wait for DEEPENING_2 response
      updateState({
        state: 'DEEPENING_2',
        inputEnabled: true,
        inputPlaceholder: 'Take your time...',
      })
    }
  }, [sendBotMessages, updateState, updateUserData])

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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reading2',
        userData: { ...currentChat.userData, deeperResponse: sanitized },
        input: sanitized,
      }),
    })
    const { messages } = await response.json()
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'futureValidation',
        userData: { ...currentChat.userData, desires: sanitized },
        input: sanitized,
      }),
    })
    const { messages } = await response.json()
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'crisisReveal',
        userData: { ...currentChat.userData, emotionalResponse: sanitized },
        input: sanitized,
      }),
    })
    const { messages } = await response.json()
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

    // After 3 objections, offer downsell
    if (newCount >= 3) {
      await sendBotMessages([
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

    // Step 2: Call Claude API to summarize the SPECIFIC shadow we detected
    const shadowResponse = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'shadowSummary',
        userData: chat.userData,
        input: '',
      }),
    })
    const shadowResult = await shadowResponse.json()
    await sendBotMessages(shadowResult.messages)

    // Step 3: Explain the ritual with SENSORY SPECIFICITY
    await sendBotMessages([
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
    const pitchPrice = chat.userData.priceDollars ?? 35
    await sendBotMessages([
      `The sacred offering is $${pitchPrice} — a declaration to the universe that you're ready for this change.`,
      "It comes with my 30-day guarantee. If you feel nothing has shifted, every penny returned.",
      `I've done this work for hundreds of seekers, ${firstName}. Most feel a shift within the first week.`,
    ])

    // Step 6: Call Claude API for personalized mystical close (references their specific vision)
    const closeResponse = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'valueExplain',
        userData: chat.userData,
        input: '',
      }),
    })
    const closeResult = await closeResponse.json()
    await sendBotMessages(closeResult.messages)

    updateState({
      state: 'PITCH',
      showPurchaseCTA: true,
      inputEnabled: true,
      inputPlaceholder: 'Or type a message...',
    })
  }, [chat.userData, addMessage, sendBotMessages, updateState])

  // === PURCHASE HANDLER ===

  const handlePurchase = useCallback(async (type: 'main' | 'downsell' = 'main') => {
    try {
      // Track InitiateCheckout event with Facebook (variant-aware)
      const mainPrice = chat.userData.priceDollars ?? 35
      const downsellPrice = chat.userData.downsellDollars ?? 25
      const price = type === 'downsell' ? downsellPrice : mainPrice
      trackInitiateCheckout(price, 'USD')
      trackGAdsCheckout(price)

      // PostHog Phase 2: V1/fb checkout initiated
      trackPH('checkout_initiated', {
        funnel: getPostHogFunnel() ?? 'v1',
        step: 'sales',
        product: type === 'downsell' ? 'energy_clearing_ritual_downsell' : 'energy_clearing_ritual',
        price_cents: price * 100,
      })

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
        }),
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
    }
  }, [chat.userData])

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
    startFresh,
    // Exposed for upsell hook
    sendBotMessages,
    sendBotMessage,
    updateState,
    addMessage,
  }
}
