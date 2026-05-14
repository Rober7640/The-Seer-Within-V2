# Replit Design Brief — Upsell Components

## Overview

Build the UI components for the 1-click upsell flow. **Design only — no backend logic.**

| Component | Purpose |
|-----------|---------|
| `UpsellCTA` | Accept/Decline buttons after pitch |
| `ShippingForm` | Collect address after successful charge |
| `ProcessingOverlay` | Loading state during payment |
| `UpsellSuccess` | Confirmation after shipping submitted |

---

## Design System (Same as Main Chat)

### Colors

```css
/* Backgrounds */
--bg-dark: #0f172a;
--bg-card: rgba(255, 255, 255, 0.05);
--bg-input: rgba(255, 255, 255, 0.1);

/* Purple (Primary) */
--purple-500: #8b5cf6;
--purple-600: #7c3aed;
--purple-700: #6d28d9;

/* Text */
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.7);
--text-muted: rgba(255, 255, 255, 0.5);

/* Status */
--success: #22c55e;
--error: #ef4444;

/* Border */
--border-light: rgba(255, 255, 255, 0.2);
--border-focus: #8b5cf6;
```

### Typography

```css
/* Same as main chat */
font-family: 'Inter', sans-serif;

/* Headings */
.heading { font-size: 1.25rem; font-weight: 600; }

/* Body */
.body { font-size: 1rem; }

/* Small */
.small { font-size: 0.875rem; }
.tiny { font-size: 0.75rem; }
```

---

## Component 1: UpsellCTA

### Purpose
Two buttons shown after upsell pitch completes.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         padding: 16px                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │         ✨ Yes, Protect My Clearing — $47             │  │
│  │                                                       │  │
│  │   (gradient button, full width, py-4, rounded-lg)     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│              No thanks, I'll take my chances                 │
│                (text button, muted, small)                   │
│                                                              │
│        🔒 Secure 1-Click  •  Same card as clearing           │
│                   (tiny, centered, muted)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### States

| State | Visual |
|-------|--------|
| Default | Purple gradient button, enabled |
| Hover | Brighter gradient, shadow-xl |
| Processing | Spinner + "Processing...", disabled |
| Disabled | opacity-50, cursor-not-allowed |

### Code

```tsx
// components/UpsellCTA.tsx

interface UpsellCTAProps {
  onAccept: () => void
  onDecline: () => void
  isProcessing?: boolean
}

export function UpsellCTA({ onAccept, onDecline, isProcessing = false }: UpsellCTAProps) {
  return (
    <div className="p-4 space-y-3">
      {/* Accept Button */}
      <button
        onClick={onAccept}
        disabled={isProcessing}
        className={`
          w-full py-4 px-6 rounded-lg
          bg-gradient-to-r from-purple-600 to-purple-700
          text-white font-bold text-lg
          shadow-lg hover:shadow-xl
          transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          ${!isProcessing && 'hover:from-purple-500 hover:to-purple-600'}
        `}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            Processing...
          </span>
        ) : (
          "✨ Yes, Protect My Clearing — $47"
        )}
      </button>

      {/* Decline Button */}
      <button
        onClick={onDecline}
        disabled={isProcessing}
        className="
          w-full py-2
          text-white/50 text-sm
          hover:text-white/70
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        No thanks, I'll take my chances
      </button>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-3 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <LockIcon className="w-3 h-3" />
          Secure 1-Click
        </span>
        <span>•</span>
        <span>Same card as clearing</span>
      </div>
    </div>
  )
}

// Spinner Component
function Spinner() {
  return (
    <svg 
      className="animate-spin h-5 w-5 text-white" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// Lock Icon (or use lucide-react)
function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
    </svg>
  )
}
```

### Mock States to Build

1. **Default** — Both buttons active
2. **Processing** — Spinner on accept button, both disabled
3. **Hover** — Brighter gradient on accept

---

## Component 2: ShippingForm

### Purpose
Collect shipping address after successful 1-click charge.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         padding: 16px                        │
│                                                              │
│   📦 Where should I send your protection stone?              │
│         (heading, white, semibold, mb-4)                     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Full Name                                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                          (mb-3)                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Street Address                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                          (mb-3)                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Apt, Suite, etc. (optional)                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                          (mb-3)                              │
│  ┌────────────────────┐  ┌────────────────────┐             │
│  │  City              │  │  State             │             │
│  └────────────────────┘  └────────────────────┘             │
│           (grid cols-2 gap-3, mb-3)                          │
│  ┌────────────────────┐  ┌────────────────────┐             │
│  │  Postal Code       │  │  Country      ▼    │             │
│  └────────────────────┘  └────────────────────┘             │
│           (grid cols-2 gap-3, mb-4)                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │            Ship My Protection Stone →                 │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Input Style

```css
/* All inputs share this style */
.input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1rem;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input:focus {
  outline: none;
  border-color: #8b5cf6;
  background: rgba(255, 255, 255, 0.15);
}
```

### States

| State | Visual |
|-------|--------|
| Default | Empty inputs with placeholders |
| Filled | White text in inputs |
| Focus | Purple border, slightly lighter bg |
| Submitting | Button shows "Saving...", disabled |
| Error | Red border on invalid field |

### Code

```tsx
// components/ShippingForm.tsx

import { useState } from 'react'

interface ShippingFormProps {
  defaultName?: string
  onSubmit: (address: ShippingAddress) => void
}

interface ShippingAddress {
  name: string
  line1: string
  line2: string
  city: string
  state: string
  postal: string
  country: string
}

export function ShippingForm({ defaultName = '', onSubmit }: ShippingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [address, setAddress] = useState<ShippingAddress>({
    name: defaultName,
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal: '',
    country: 'US',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await onSubmit(address)
  }

  const handleChange = (field: keyof ShippingAddress) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setAddress(prev => ({ ...prev, [field]: e.target.value }))
  }

  const inputClassName = `
    w-full px-4 py-3 rounded-lg
    bg-white/10 border border-white/20
    text-white placeholder-white/50
    focus:outline-none focus:border-purple-500 focus:bg-white/15
    transition-colors
  `

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {/* Header */}
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <span>📦</span>
        Where should I send your protection stone?
      </h3>

      <div className="space-y-3">
        {/* Full Name */}
        <input
          type="text"
          placeholder="Full Name"
          value={address.name}
          onChange={handleChange('name')}
          className={inputClassName}
          required
        />

        {/* Street Address */}
        <input
          type="text"
          placeholder="Street Address"
          value={address.line1}
          onChange={handleChange('line1')}
          className={inputClassName}
          required
        />

        {/* Apt/Suite (Optional) */}
        <input
          type="text"
          placeholder="Apt, Suite, etc. (optional)"
          value={address.line2}
          onChange={handleChange('line2')}
          className={inputClassName}
        />

        {/* City + State */}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="City"
            value={address.city}
            onChange={handleChange('city')}
            className={inputClassName}
            required
          />
          <input
            type="text"
            placeholder="State / Province"
            value={address.state}
            onChange={handleChange('state')}
            className={inputClassName}
            required
          />
        </div>

        {/* Postal + Country */}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Postal Code"
            value={address.postal}
            onChange={handleChange('postal')}
            className={inputClassName}
            required
          />
          <select
            value={address.country}
            onChange={handleChange('country')}
            className={inputClassName}
            required
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="NZ">New Zealand</option>
            <option value="IE">Ireland</option>
            <option value="SG">Singapore</option>
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`
          w-full mt-4 py-4 px-6 rounded-lg
          bg-gradient-to-r from-purple-600 to-purple-700
          text-white font-bold text-lg
          shadow-lg hover:shadow-xl
          transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          ${!isSubmitting && 'hover:from-purple-500 hover:to-purple-600'}
        `}
      >
        {isSubmitting ? 'Saving...' : 'Ship My Protection Stone →'}
      </button>
    </form>
  )
}
```

### Mock States to Build

1. **Empty** — All placeholders visible
2. **Partially Filled** — Some fields have values
3. **Focus State** — One input focused (purple border)
4. **Submitting** — Button shows "Saving...", disabled

---

## Component 3: ProcessingOverlay (Optional)

### Purpose
Full-screen or inline overlay during payment processing.

**Option A: Inline (Recommended)**
Just show spinner on the button (already in UpsellCTA).

**Option B: Full Overlay**
Dim the whole chat, show centered spinner.

### Layout (Option B)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  ████████████████████████                   │
│                  █                      █                   │
│                  █     (dim overlay)    █                   │
│                  █                      █                   │
│                  █    ┌──────────────┐  █                   │
│                  █    │   ◠ ◡ ◠     │  █                   │
│                  █    │  (spinner)   │  █                   │
│                  █    │              │  █                   │
│                  █    │ Processing   │  █                   │
│                  █    │ your         │  █                   │
│                  █    │ protection...│  █                   │
│                  █    └──────────────┘  █                   │
│                  █                      █                   │
│                  ████████████████████████                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Code (Option B)

```tsx
// components/ProcessingOverlay.tsx

export function ProcessingOverlay({ message = "Processing your protection..." }) {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800/90 rounded-2xl p-8 text-center shadow-2xl">
        {/* Spinner */}
        <div className="mb-4">
          <svg 
            className="animate-spin h-12 w-12 text-purple-500 mx-auto" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        
        {/* Message */}
        <p className="text-white/80 text-lg">{message}</p>
      </div>
    </div>
  )
}
```

**Recommendation:** Use inline spinner (Option A). Simpler, less jarring.

---

## Component 4: UpsellComplete (Optional)

### Purpose
Visual confirmation after shipping is submitted. 

**Note:** This might just be more chat messages, not a separate component.

### Layout (If Standalone)

```
┌─────────────────────────────────────────────────────────────┐
│                         padding: 16px                        │
│                                                              │
│                           ✨                                 │
│                     (large emoji, mb-3)                      │
│                                                              │
│                    Protection Complete                       │
│                  (heading, white, center)                    │
│                                                              │
│         Your charged volcanic stone will ship                │
│               within 48 hours.                               │
│               (text, muted, center)                          │
│                                                              │
│   ┌───────────────────────────────────────────────────────┐ │
│   │  📍 Shipping to:                                      │ │
│   │  Jo Smith                                             │ │
│   │  123 Main St                                          │ │
│   │  New York, NY 10001                                   │ │
│   │  United States                                        │ │
│   └───────────────────────────────────────────────────────┘ │
│         (card, bg-white/5, rounded, p-4, text-sm)           │
│                                                              │
│            Watch your inbox for tracking info.               │
│                    (tiny, muted, center)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Code

```tsx
// components/UpsellComplete.tsx

interface UpsellCompleteProps {
  address: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    postal: string
    country: string
  }
}

export function UpsellComplete({ address }: UpsellCompleteProps) {
  const countryNames: Record<string, string> = {
    US: 'United States',
    CA: 'Canada',
    GB: 'United Kingdom',
    AU: 'Australia',
    NZ: 'New Zealand',
    IE: 'Ireland',
    SG: 'Singapore',
  }

  return (
    <div className="p-4 text-center">
      {/* Icon */}
      <div className="text-5xl mb-3">✨</div>
      
      {/* Heading */}
      <h3 className="text-white font-semibold text-xl mb-2">
        Protection Complete
      </h3>
      
      {/* Subtext */}
      <p className="text-white/60 mb-4">
        Your charged volcanic stone will ship within 48 hours.
      </p>
      
      {/* Address Card */}
      <div className="bg-white/5 rounded-lg p-4 text-left text-sm text-white/70 mb-4">
        <div className="text-white/40 text-xs mb-2 flex items-center gap-1">
          <span>📍</span> Shipping to:
        </div>
        <div className="text-white">{address.name}</div>
        <div>{address.line1}</div>
        {address.line2 && <div>{address.line2}</div>}
        <div>{address.city}, {address.state} {address.postal}</div>
        <div>{countryNames[address.country] || address.country}</div>
      </div>
      
      {/* Footer */}
      <p className="text-white/40 text-xs">
        Watch your inbox for tracking info.
      </p>
    </div>
  )
}
```

**Recommendation:** Use chat messages instead. More consistent with the experience.

---

## Mock Data for Testing

### UpsellCTA States

```tsx
// In your test/demo page:

// State 1: Default
<UpsellCTA 
  onAccept={() => console.log('Accept')} 
  onDecline={() => console.log('Decline')} 
/>

// State 2: Processing
<UpsellCTA 
  onAccept={() => {}} 
  onDecline={() => {}} 
  isProcessing={true}
/>
```

### ShippingForm States

```tsx
// State 1: Empty
<ShippingForm onSubmit={(addr) => console.log(addr)} />

// State 2: Pre-filled name
<ShippingForm 
  defaultName="Jo Smith" 
  onSubmit={(addr) => console.log(addr)} 
/>
```

### UpsellComplete Mock

```tsx
<UpsellComplete 
  address={{
    name: 'Jo Smith',
    line1: '123 Main Street',
    line2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postal: '10001',
    country: 'US',
  }}
/>
```

---

## File Structure

```
/components
  /upsell
    UpsellCTA.tsx           ← Accept/Decline buttons
    ShippingForm.tsx        ← Address form
    ProcessingOverlay.tsx   ← Optional full overlay
    UpsellComplete.tsx      ← Optional completion card
    index.ts                ← Export all
```

### index.ts

```tsx
// components/upsell/index.ts

export { UpsellCTA } from './UpsellCTA'
export { ShippingForm } from './ShippingForm'
export { ProcessingOverlay } from './ProcessingOverlay'
export { UpsellComplete } from './UpsellComplete'
```

---

## Integration Points

### Where Components Appear

```tsx
// In your Chat component:

<ChatContainer>
  <ChatHeader />
  <ChatMessages messages={messages} />
  
  {isTyping && <TypingIndicator />}
  
  {/* Existing */}
  {showBucketButtons && <QuickReplyButtons />}
  {showPermissionButton && <PermissionButton />}
  {showPurchaseCTA && <PurchaseCTA />}
  
  {/* NEW: Upsell components */}
  {showUpsellCTA && (
    <UpsellCTA 
      onAccept={handleUpsellAccept}
      onDecline={handleUpsellDecline}
      isProcessing={isUpsellProcessing}
    />
  )}
  
  {showShippingForm && (
    <ShippingForm 
      defaultName={userData.firstName}
      onSubmit={handleShippingSubmit}
    />
  )}
  
  {/* Regular input */}
  {inputEnabled && !showUpsellCTA && !showShippingForm && (
    <ChatInput />
  )}
</ChatContainer>
```

---

## Build Checklist

### UpsellCTA
- [ ] Create component file
- [ ] Default state renders correctly
- [ ] Processing state shows spinner
- [ ] Hover state on accept button
- [ ] Decline button is subtle (muted)
- [ ] Trust badges appear below

### ShippingForm
- [ ] Create component file
- [ ] All 7 inputs render
- [ ] Placeholder text visible
- [ ] Focus state shows purple border
- [ ] Grid layout for City/State and Postal/Country
- [ ] Country dropdown works
- [ ] Submit button works
- [ ] Submitting state shows "Saving..."

### Integration
- [ ] Both components render inside ChatContainer
- [ ] Components match existing chat styling
- [ ] Mobile responsive (test narrow viewport)

---

## Responsive Notes

### Mobile (< 640px)

- Full-width inputs ✓
- Grid stays 2-column (inputs are short enough)
- Button text might wrap — test "$47" placement
- Trust badges might need to stack

### Tablet/Desktop

- Components should be constrained by ChatContainer max-width
- No changes needed

---

## Testing Checklist

Before handing off to logic phase:

- [ ] UpsellCTA default state
- [ ] UpsellCTA processing state
- [ ] UpsellCTA hover states
- [ ] ShippingForm empty state
- [ ] ShippingForm with pre-filled name
- [ ] ShippingForm focus states
- [ ] ShippingForm submitting state
- [ ] All components inside ChatContainer
- [ ] Mobile responsive
- [ ] Dark theme consistent

---

*Build these components in Replit. Export when visually complete. Then wire up logic.*
