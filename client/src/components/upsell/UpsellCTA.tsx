import { Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpsellCTAProps {
  onAccept: () => void
  onDecline: () => void
  isProcessing?: boolean
  priceLabel?: string
  // Offer 02's buyer bought a tarot spread, not a clearing — "what we clear" is
  // not a thing she did. Defaults to V1's exact label for every other funnel.
  acceptLabel?: string
}

export function UpsellCTA({ onAccept, onDecline, isProcessing = false, priceLabel = '$47', acceptLabel = 'Yes, protect what we clear' }: UpsellCTAProps) {
  return (
    <div className="p-4 space-y-4" data-testid="container-upsell-cta">
      <p className="text-center text-sm text-muted-foreground italic">
        Take your time. This is your journey.
      </p>
      
      <Button
        onClick={onAccept}
        disabled={isProcessing}
        data-testid="button-upsell-accept"
        className="w-full bg-gradient-to-r from-purple-600/90 to-purple-700/90 border-purple-500/50"
        size="lg"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" data-testid="spinner-upsell" />
            <span data-testid="text-processing">Processing...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5" data-testid="icon-shield" />
            <span data-testid="text-accept-button">{acceptLabel}</span>
          </span>
        )}
      </Button>

      <div className="text-center">
        <span className="text-xs text-muted-foreground">{priceLabel} includes charged stone + free shipping</span>
      </div>

      <Button
        onClick={onDecline}
        disabled={isProcessing}
        variant="ghost"
        data-testid="button-upsell-decline"
        className="w-full text-muted-foreground text-sm"
      >
        <span data-testid="text-decline-button">Not right now</span>
      </Button>
    </div>
  )
}
