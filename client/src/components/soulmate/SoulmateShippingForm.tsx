import { useState } from 'react';

export interface SoulmateShippingAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string;
}

export interface SoulmateBillingAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

export interface ShippingFormSubmission {
  shipping: SoulmateShippingAddress;
  billing?: SoulmateBillingAddress;
  billingSameAsShipping: boolean;
}

interface Props {
  productLabel: string;
  defaultName?: string;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (payload: ShippingFormSubmission) => void;
}

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'IE', label: 'Ireland' },
  { value: 'SG', label: 'Singapore' },
];

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#414040',
  marginBottom: 4,
  fontFamily: 'sans-serif',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 16,
  border: '1px solid #ccc',
  borderRadius: 5,
  color: '#414040',
  background: '#fff',
  boxSizing: 'border-box',
  fontFamily: 'sans-serif',
};

const errorStyle: React.CSSProperties = {
  color: '#df1414',
  fontSize: 13,
  marginTop: 4,
  fontFamily: 'sans-serif',
};

export function SoulmateShippingForm({
  productLabel,
  defaultName = '',
  submitLabel,
  submitting = false,
  onSubmit,
}: Props) {
  const [shipping, setShipping] = useState<SoulmateShippingAddress>({
    name: defaultName,
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal: '',
    country: 'US',
    phone: '',
  });

  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);

  const [billing, setBilling] = useState<SoulmateBillingAddress>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal: '',
    country: 'US',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setShip = (k: keyof SoulmateShippingAddress) => (v: string) =>
    setShipping(prev => ({ ...prev, [k]: v }));

  const setBill = (k: keyof SoulmateBillingAddress) => (v: string) =>
    setBilling(prev => ({ ...prev, [k]: v }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!shipping.name.trim()) e.name = 'Full name is required';
    if (!shipping.line1.trim()) e.line1 = 'Street address is required';
    if (!shipping.city.trim()) e.city = 'City is required';
    if (!shipping.state.trim()) e.state = 'State / province is required';
    if (!shipping.postal.trim()) e.postal = 'Postal code is required';
    if (!shipping.country.trim()) e.country = 'Country is required';

    if (!billingSameAsShipping) {
      if (!billing.line1.trim()) e.bLine1 = 'Billing street is required';
      if (!billing.city.trim()) e.bCity = 'Billing city is required';
      if (!billing.state.trim()) e.bState = 'Billing state is required';
      if (!billing.postal.trim()) e.bPostal = 'Billing postal code is required';
      if (!billing.country.trim()) e.bCountry = 'Billing country is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      shipping,
      billing: billingSameAsShipping ? undefined : billing,
      billingSameAsShipping,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 540, margin: '0 auto', textAlign: 'left' }}>
      <h3 style={{
        fontFamily: 'Merriweather, serif',
        fontSize: 22,
        fontWeight: 700,
        color: '#1b1b1e',
        textAlign: 'center',
        marginBottom: 20,
      }}>
        Where should I send your {productLabel}?
      </h3>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Full Name</label>
        <input type="text" value={shipping.name} onChange={e => setShip('name')(e.target.value)} style={inputStyle} autoComplete="name" />
        {errors.name && <div style={errorStyle}>{errors.name}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Street Address</label>
        <input type="text" value={shipping.line1} onChange={e => setShip('line1')(e.target.value)} style={inputStyle} autoComplete="address-line1" />
        {errors.line1 && <div style={errorStyle}>{errors.line1}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Apt, Suite, etc. (optional)</label>
        <input type="text" value={shipping.line2} onChange={e => setShip('line2')(e.target.value)} style={inputStyle} autoComplete="address-line2" />
      </div>

      <div className="ssf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>City</label>
          <input type="text" value={shipping.city} onChange={e => setShip('city')(e.target.value)} style={inputStyle} autoComplete="address-level2" />
          {errors.city && <div style={errorStyle}>{errors.city}</div>}
        </div>
        <div>
          <label style={labelStyle}>State / Province</label>
          <input type="text" value={shipping.state} onChange={e => setShip('state')(e.target.value)} style={inputStyle} autoComplete="address-level1" />
          {errors.state && <div style={errorStyle}>{errors.state}</div>}
        </div>
      </div>

      <div className="ssf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Postal Code</label>
          <input type="text" value={shipping.postal} onChange={e => setShip('postal')(e.target.value)} style={inputStyle} autoComplete="postal-code" inputMode="numeric" />
          {errors.postal && <div style={errorStyle}>{errors.postal}</div>}
        </div>
        <div>
          <label style={labelStyle}>Country</label>
          <select value={shipping.country} onChange={e => setShip('country')(e.target.value)} style={inputStyle} autoComplete="country">
            {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {errors.country && <div style={errorStyle}>{errors.country}</div>}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Phone (optional)</label>
        <input type="tel" value={shipping.phone} onChange={e => setShip('phone')(e.target.value)} style={inputStyle} autoComplete="tel" inputMode="tel" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', color: '#414040', fontSize: 14, fontFamily: 'sans-serif' }}>
        <input
          type="checkbox"
          checked={billingSameAsShipping}
          onChange={e => setBillingSameAsShipping(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        Billing address is the same as shipping
      </label>

      {!billingSameAsShipping && (
        <div style={{ background: '#f8f4ec', padding: 14, borderRadius: 8, marginBottom: 14 }}>
          <div style={{ ...labelStyle, fontSize: 14, marginBottom: 10, fontWeight: 700 }}>Billing Address</div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Street Address</label>
            <input type="text" value={billing.line1} onChange={e => setBill('line1')(e.target.value)} style={inputStyle} />
            {errors.bLine1 && <div style={errorStyle}>{errors.bLine1}</div>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Apt, Suite, etc. (optional)</label>
            <input type="text" value={billing.line2} onChange={e => setBill('line2')(e.target.value)} style={inputStyle} />
          </div>

          <div className="ssf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input type="text" value={billing.city} onChange={e => setBill('city')(e.target.value)} style={inputStyle} />
              {errors.bCity && <div style={errorStyle}>{errors.bCity}</div>}
            </div>
            <div>
              <label style={labelStyle}>State / Province</label>
              <input type="text" value={billing.state} onChange={e => setBill('state')(e.target.value)} style={inputStyle} />
              {errors.bState && <div style={errorStyle}>{errors.bState}</div>}
            </div>
          </div>

          <div className="ssf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Postal Code</label>
              <input type="text" value={billing.postal} onChange={e => setBill('postal')(e.target.value)} style={inputStyle} inputMode="numeric" />
              {errors.bPostal && <div style={errorStyle}>{errors.bPostal}</div>}
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <select value={billing.country} onChange={e => setBill('country')(e.target.value)} style={inputStyle}>
                {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.bCountry && <div style={errorStyle}>{errors.bCountry}</div>}
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="upsell-btn"
        style={{ width: '100%', marginTop: 4 }}
      >
        {submitting ? 'Processing...' : submitLabel}
      </button>

      <style>{`
        @media (max-width: 480px) {
          .ssf-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </form>
  );
}
