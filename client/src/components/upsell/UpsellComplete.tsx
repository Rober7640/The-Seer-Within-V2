import { MapPin, Sparkles } from 'lucide-react'
import type { ShippingAddress } from './ShippingForm'

export interface UpsellCompleteProps {
  address?: ShippingAddress
  userName?: string
}

const countryNames: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  NZ: 'New Zealand',
  IE: 'Ireland',
  SG: 'Singapore',
}

export function UpsellComplete({ address, userName }: UpsellCompleteProps) {
  return (
    <div className="p-4 text-center" data-testid="card-upsell-complete">
      <div className="mb-3" data-testid="container-icon">
        <Sparkles className="w-12 h-12 text-purple-400 mx-auto" data-testid="icon-sparkles" />
      </div>
      
      <h3 className="text-foreground font-semibold text-xl mb-2" data-testid="heading-complete">
        Protection Complete
      </h3>
      
      <p className="text-muted-foreground mb-4" data-testid="text-complete-subtext">
        {userName ? `${userName}, your` : 'Your'} charged volcanic stone will ship within 48 hours.
      </p>
      
      {address && (
        <div className="bg-muted/30 rounded-lg p-4 text-left text-sm text-muted-foreground mb-4" data-testid="card-shipping-address">
          <div className="text-muted-foreground/60 text-xs mb-2 flex items-center gap-1" data-testid="label-shipping-to">
            <MapPin className="w-3 h-3" data-testid="icon-map-pin" />
            <span data-testid="text-shipping-to-label">Shipping to:</span>
          </div>
          <div className="text-foreground" data-testid="text-shipping-name">{address.name}</div>
          <div data-testid="text-shipping-line1">{address.line1}</div>
          {address.line2 && <div data-testid="text-shipping-line2">{address.line2}</div>}
          <div data-testid="text-shipping-location">
            {address.city}, {address.state} {address.postal}
          </div>
          <div data-testid="text-shipping-country">
            {countryNames[address.country] || address.country}
          </div>
        </div>
      )}
      
      <p className="text-muted-foreground/60 text-xs" data-testid="text-tracking-notice">
        Watch your inbox for tracking info.
      </p>
    </div>
  )
}
