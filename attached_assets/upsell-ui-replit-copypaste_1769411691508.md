# Upsell UI Components — Copy-Paste for Replit

## Instructions

1. Create the folder structure
2. Copy each file's code exactly
3. Test with the harness

---

## Folder Structure

```
/components
  /upsell
    UpsellCTA.tsx
    ShippingForm.tsx
    index.ts
```

---

## File 1: `/components/upsell/UpsellCTA.tsx`

```tsx
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
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
          </svg>
          Secure 1-Click
        </span>
        <span>•</span>
        <span>Same card as clearing</span>
      </div>
    </div>
  )
}
```

---

## File 2: `/components/upsell/ShippingForm.tsx`

```tsx
import { useState } from 'react'

interface ShippingAddress {
  name: string
  line1: string
  line2: string
  city: string
  state: string
  postal: string
  country: string
}

interface ShippingFormProps {
  defaultName?: string
  onSubmit: (address: ShippingAddress) => void
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

---

## File 3: `/components/upsell/index.ts`

```ts
export { UpsellCTA } from './UpsellCTA'
export { ShippingForm } from './ShippingForm'
```

---

## File 4: Test Harness (Add to existing page or create new)

Add this temporarily to test the components visually:

```tsx
import { useState } from 'react'
import { UpsellCTA, ShippingForm } from './components/upsell'

export function UpsellTestHarness() {
  const [showCTA, setShowCTA] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAccept = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setShowCTA(false)
      setShowForm(true)
    }, 2000)
  }

  const handleDecline = () => {
    setShowCTA(false)
    alert('Declined - would show soft exit messages')
  }

  const handleShipping = (address: any) => {
    console.log('Shipping address:', address)
    setShowForm(false)
    alert('Complete! Address saved.')
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-white text-xl mb-4">Upsell Component Test</h1>
        
        {/* Reset Button */}
        <button 
          onClick={() => { setShowCTA(true); setShowForm(false); setIsProcessing(false) }}
          className="mb-4 px-4 py-2 bg-white/10 text-white rounded"
        >
          Reset Test
        </button>

        {/* Toggle Processing State */}
        <button 
          onClick={() => setIsProcessing(!isProcessing)}
          className="mb-4 ml-2 px-4 py-2 bg-white/10 text-white rounded"
        >
          Toggle Processing: {isProcessing ? 'ON' : 'OFF'}
        </button>

        {/* Components */}
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
          {showCTA && (
            <UpsellCTA
              onAccept={handleAccept}
              onDecline={handleDecline}
              isProcessing={isProcessing}
            />
          )}

          {showForm && (
            <ShippingForm
              defaultName="Jo"
              onSubmit={handleShipping}
            />
          )}

          {!showCTA && !showForm && (
            <div className="p-4 text-white/50 text-center">
              ✅ Flow complete - click Reset to test again
            </div>
          )}
        </div>

        {/* State Display */}
        <div className="mt-4 p-4 bg-black/30 rounded-lg text-xs text-white/50 font-mono">
          <div>showCTA: {showCTA.toString()}</div>
          <div>showForm: {showForm.toString()}</div>
          <div>isProcessing: {isProcessing.toString()}</div>
        </div>
      </div>
    </div>
  )
}
```

---

## Quick Integration (Into Existing Chat)

Once components work, add to your chat page:

```tsx
// In your Chat component, add imports:
import { UpsellCTA, ShippingForm } from './components/upsell'

// In your JSX, after other conditionals:
{showUpsellCTA && (
  <UpsellCTA
    onAccept={handleUpsellAccept}
    onDecline={handleUpsellDecline}
    isProcessing={isUpsellProcessing}
  />
)}

{showShippingForm && (
  <ShippingForm
    defaultName={userData.firstName || ''}
    onSubmit={handleShippingSubmit}
  />
)}
```

---

## Checklist

### UpsellCTA
- [ ] File created
- [ ] Purple gradient button shows
- [ ] Spinner appears when isProcessing=true
- [ ] Decline button is muted/subtle
- [ ] Trust badges visible
- [ ] Hover brightens button

### ShippingForm
- [ ] File created
- [ ] All 7 inputs render
- [ ] Placeholders visible
- [ ] Focus shows purple border
- [ ] Country dropdown works
- [ ] Submit shows "Saving..." when clicked

### Integration
- [ ] index.ts exports both
- [ ] Test harness runs
- [ ] Can toggle between states
- [ ] Matches dark theme

---

## Next

When UI is working, tell me and we'll wire up Phase 3:
- Stripe 1-click payment
- Shipping API
- Full flow integration
