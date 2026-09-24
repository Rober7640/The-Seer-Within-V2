import { Package, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ShippingFormProps {
  defaultName?: string
  productLabel?: string
  /**
   * ISO alpha-2 codes to offer. Omitted = the seven the V1 funnel has always shipped to
   * (⛔ do not widen that default — V1 is live and its fulfilment is unchanged). Backend
   * offers pass the worldwide list (Joel, 2026-09-16), since 09 ships everywhere.
   */
  countries?: readonly string[]
  onSubmit: (address: ShippingAddress) => void
}

export interface ShippingAddress {
  name: string
  line1: string
  line2: string
  city: string
  state: string
  postal: string
  country: string
}

const shippingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  line1: z.string().min(1, 'Address is required'),
  line2: z.string(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
})

const DEFAULT_COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'IE', label: 'Ireland' },
  { value: 'SG', label: 'Singapore' },
]

/** Codes → {value,label}, alphabetical. Country names come from the browser (Intl), so no list
 *  of 200 names lives in this repo; a browser without Intl.DisplayNames shows the code. */
export function countryOptions(codes?: readonly string[]) {
  if (!codes) return DEFAULT_COUNTRY_OPTIONS
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames(['en'], { type: 'region' })
  } catch {
    names = null
  }
  return [...codes]
    .map((value) => ({ value, label: names?.of(value) ?? value }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function ShippingForm({ defaultName = '', productLabel = 'protection stone', countries, onSubmit }: ShippingFormProps) {
  const countryList = countryOptions(countries)
  const form = useForm<ShippingAddress>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      name: defaultName,
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal: '',
      country: 'US',
    },
  })

  const isSubmitting = form.formState.isSubmitting

  const handleFormSubmit = async (data: ShippingAddress) => {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="p-4" data-testid="form-shipping">
        <h3 className="text-foreground font-semibold text-lg mb-4 flex items-center gap-2" data-testid="heading-shipping">
          <Package className="w-5 h-5 text-purple-400" data-testid="icon-package" />
          <span data-testid="text-shipping-title">Where should I send your {productLabel}?</span>
        </h3>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Full Name"
                    {...field}
                    data-testid="input-shipping-name"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="line1"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Street Address"
                    {...field}
                    data-testid="input-shipping-line1"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="line2"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Apt, Suite, etc. (optional)"
                    {...field}
                    data-testid="input-shipping-line2"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="City"
                      {...field}
                      data-testid="input-shipping-city"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="State / Province"
                      {...field}
                      data-testid="input-shipping-state"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="postal"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Postal Code"
                      {...field}
                      data-testid="input-shipping-postal"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-shipping-country">
                        <SelectValue placeholder="Country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent data-testid="select-content-country">
                      {countryList.map((country) => (
                        <SelectItem 
                          key={country.value} 
                          value={country.value}
                          data-testid={`select-item-country-${country.value}`}
                        >
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="button-shipping-submit"
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-purple-700 border-purple-500"
          size="lg"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" data-testid="spinner-shipping" />
              <span data-testid="text-button-saving">Saving...</span>
            </span>
          ) : (
            <span data-testid="text-button-submit">Ship My {productLabel.charAt(0).toUpperCase() + productLabel.slice(1)} →</span>
          )}
        </Button>
      </form>
    </Form>
  )
}
