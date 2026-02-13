import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Upsell2DownsellCTAProps {
  onAccept: () => void
  onDecline: () => void
  isProcessing?: boolean
}

export function Upsell2DownsellCTA({ onAccept, onDecline, isProcessing = false }: Upsell2DownsellCTAProps) {
  return (
    <div className="p-4 space-y-4" data-testid="container-upsell2-downsell-cta">
      <p className="text-center text-sm text-muted-foreground italic">
        Same eight stones. Same manifestation energy.
      </p>
      
      <Button
        onClick={onAccept}
        disabled={isProcessing}
        data-testid="button-upsell2-downsell-accept"
        className="w-full bg-gradient-to-r from-amber-700/80 to-yellow-700/80 border-amber-600/50"
        size="lg"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" data-testid="spinner-upsell2-downsell" />
            <span data-testid="text-processing-downsell">Processing...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" data-testid="icon-sparkles-downsell" />
            <span data-testid="text-accept-downsell">Yes, send it to me for $30</span>
          </span>
        )}
      </Button>

      <div className="text-center">
        <span className="text-xs text-muted-foreground">$30 includes bracelet + free shipping</span>
      </div>

      <Button
        onClick={onDecline}
        disabled={isProcessing}
        variant="ghost"
        data-testid="button-upsell2-downsell-decline"
        className="w-full text-muted-foreground text-sm"
      >
        <span data-testid="text-decline-downsell">No thanks, just the clearing</span>
      </Button>
    </div>
  )
}
