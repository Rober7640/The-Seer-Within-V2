import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UPSELL2_ACCEPT_BUTTON } from '@/lib/upsellCopy/upsell2Fields'

interface Upsell2CTAProps {
  onAccept: () => void
  onDecline: () => void
  isProcessing?: boolean
  // The /fb Upsell 2 copy test's arm B ("Yes, set my bracelet tonight"). Unset ⇒ today's text.
  acceptLabel?: string
}

export function Upsell2CTA({ onAccept, onDecline, isProcessing = false, acceptLabel = UPSELL2_ACCEPT_BUTTON }: Upsell2CTAProps) {
  return (
    <div className="p-4 space-y-4" data-testid="container-upsell2-cta">
      <p className="text-center text-sm text-muted-foreground italic">
        Eight stones. One intention. Your desire, amplified.
      </p>
      
      <Button
        onClick={onAccept}
        disabled={isProcessing}
        data-testid="button-upsell2-accept"
        className="w-full bg-gradient-to-r from-amber-600/90 to-yellow-600/90 border-amber-500/50"
        size="lg"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" data-testid="spinner-upsell2" />
            <span data-testid="text-processing-upsell2">Processing...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" data-testid="icon-sparkles" />
            <span data-testid="text-accept-upsell2">{acceptLabel}</span>
          </span>
        )}
      </Button>

      <div className="text-center">
        <span className="text-xs text-muted-foreground">$47 includes attuned bracelet + manifestation guide + free shipping</span>
      </div>

      <Button
        onClick={onDecline}
        disabled={isProcessing}
        variant="ghost"
        data-testid="button-upsell2-decline"
        className="w-full text-muted-foreground text-sm"
      >
        <span data-testid="text-decline-upsell2">Not right now</span>
      </Button>
    </div>
  )
}
