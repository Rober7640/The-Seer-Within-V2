const BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function createOrder(amountUsd: string, customId: string): Promise<string> {
  const accessToken = await getAccessToken();

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amountUsd,
        },
        custom_id: customId,
      }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal createOrder failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.id;
}

export async function captureOrder(orderId: string): Promise<{ captureId: string; status: string }> {
  const accessToken = await getAccessToken();

  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal captureOrder failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    captureId: capture?.id ?? data.id,
    status: data.status,
  };
}

export async function getOrder(orderId: string): Promise<{
  status: string;
  captureId?: string;
}> {
  const accessToken = await getAccessToken();

  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (res.status === 404) {
    return { status: 'NOT_FOUND' };
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal getOrder failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const cap = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    captureId: cap?.status === 'COMPLETED' ? cap.id : undefined,
  };
}
