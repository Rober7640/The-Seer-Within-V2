import { useState } from 'react'
import { UpsellCTA, ShippingForm, UpsellComplete, ProcessingOverlay } from '@/components/upsell'
import type { ShippingAddress } from '@/components/upsell'
import { Button } from '@/components/ui/button'

export default function UpsellTestPage() {
  const [view, setView] = useState<'cta' | 'processing' | 'form' | 'complete'>('cta')
  const [isProcessing, setIsProcessing] = useState(false)
  const [savedAddress, setSavedAddress] = useState<ShippingAddress | null>(null)

  const handleAccept = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setView('form')
    }, 2000)
  }

  const handleDecline = () => {
    alert('Declined - would show soft exit messages')
  }

  const handleShipping = async (address: ShippingAddress) => {
    setSavedAddress(address)
    setView('complete')
  }

  return (
    <div className="min-h-screen bg-bg-deep p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-foreground text-xl font-semibold mb-4" data-testid="heading-test-page">
          Upsell Components Preview
        </h1>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            onClick={() => { setView('cta'); setIsProcessing(false) }}
            variant={view === 'cta' ? 'default' : 'outline'}
            size="sm"
            data-testid="button-view-cta"
          >
            CTA Buttons
          </Button>
          <Button 
            onClick={() => setView('form')}
            variant={view === 'form' ? 'default' : 'outline'}
            size="sm"
            data-testid="button-view-form"
          >
            Shipping Form
          </Button>
          <Button 
            onClick={() => setView('processing')}
            variant={view === 'processing' ? 'default' : 'outline'}
            size="sm"
            data-testid="button-view-processing"
          >
            Processing
          </Button>
          <Button 
            onClick={() => setView('complete')}
            variant={view === 'complete' ? 'default' : 'outline'}
            size="sm"
            data-testid="button-view-complete"
          >
            Complete
          </Button>
        </div>

        <div className="bg-muted/30 rounded-2xl overflow-hidden relative" data-testid="container-preview">
          {view === 'cta' && (
            <UpsellCTA
              onAccept={handleAccept}
              onDecline={handleDecline}
              isProcessing={isProcessing}
            />
          )}

          {view === 'form' && (
            <ShippingForm
              defaultName="Jo"
              onSubmit={handleShipping}
            />
          )}

          {view === 'processing' && (
            <div className="h-64 relative">
              <ProcessingOverlay message="Processing your protection..." />
            </div>
          )}

          {view === 'complete' && (
            <UpsellComplete
              address={savedAddress || {
                name: 'Jo Smith',
                line1: '123 Main Street',
                line2: 'Apt 4B',
                city: 'New York',
                state: 'NY',
                postal: '10001',
                country: 'US',
              }}
            />
          )}
        </div>

        <div className="mt-4 p-4 bg-muted/20 rounded-lg text-xs text-muted-foreground font-mono" data-testid="container-state">
          <div>Current View: {view}</div>
          <div>isProcessing: {isProcessing.toString()}</div>
        </div>
      </div>
    </div>
  )
}
