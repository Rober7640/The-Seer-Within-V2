import logger from './logger';

const AWEBER_API_BASE = 'https://api.aweber.com/1.0';

interface AWeberTokens {
  accessToken: string;
  refreshToken: string;
}

interface AddSubscriberParams {
  email: string;
  name?: string;
  tags?: string[];
}

interface ShippingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
}

interface AddPaidSubscriberParams {
  email: string;
  name?: string;
  stripeOrderId: string;
  tags?: string[];
  shipping?: ShippingAddress;
}

let cachedTokens: AWeberTokens | null = null;

function getTokens(): AWeberTokens {
  if (cachedTokens) return cachedTokens;
  
  const accessToken = process.env.AWEBER_ACCESS_TOKEN;
  const refreshToken = process.env.AWEBER_REFRESH_TOKEN;
  
  if (!accessToken || !refreshToken) {
    throw new Error('AWeber tokens not configured');
  }
  
  cachedTokens = { accessToken, refreshToken };
  return cachedTokens;
}

async function refreshAccessToken(): Promise<string> {
  const tokens = getTokens();
  const clientId = process.env.AWEBER_CLIENT_ID;
  const clientSecret = process.env.AWEBER_CLIENT_SECRET;
  
  const bodyParams: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
  };
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  // AWeber requires client credentials for token refresh
  if (clientId && clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    logger.warn('AWeber client credentials not set - token refresh may fail');
  }
  
  const response = await fetch('https://auth.aweber.com/oauth2/token', {
    method: 'POST',
    headers,
    body: new URLSearchParams(bodyParams),
  });
  
  if (!response.ok) {
    const error = await response.text();
    logger.error('AWeber token refresh failed:', error);
    throw new Error('Failed to refresh AWeber token');
  }
  
  const data = await response.json();
  cachedTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
  };
  
  logger.info('AWeber token refreshed successfully');
  return cachedTokens.accessToken;
}

async function makeAWeberRequest(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const tokens = getTokens();
  
  const response = await fetch(`${AWEBER_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (response.status === 401 && retry) {
    logger.info('AWeber token expired, refreshing...');
    await refreshAccessToken();
    return makeAWeberRequest(endpoint, options, false);
  }
  
  return response;
}

export async function addSubscriberToList(params: AddSubscriberParams): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.AWEBER_ACCOUNT_ID;
  const listId = process.env.AWEBER_LIST_ID;
  
  if (!accountId || !listId) {
    logger.warn('AWeber account/list not configured');
    return { success: false, error: 'AWeber not configured' };
  }
  
  if (!process.env.AWEBER_ACCESS_TOKEN || !process.env.AWEBER_REFRESH_TOKEN) {
    logger.warn('AWeber tokens not configured');
    return { success: false, error: 'AWeber tokens not configured' };
  }
  
  try {
    const subscriberData: Record<string, unknown> = {
      email: params.email,
      update_existing: true,
    };
    
    if (params.name) {
      subscriberData.name = params.name;
    }
    
    if (params.tags && params.tags.length > 0) {
      subscriberData.tags = params.tags;
    }
    
    const response = await makeAWeberRequest(
      `/accounts/${accountId}/lists/${listId}/subscribers`,
      {
        method: 'POST',
        body: JSON.stringify(subscriberData),
      }
    );
    
    if (response.ok || response.status === 201) {
      logger.info(`AWeber: Successfully added subscriber ${params.email}`);
      return { success: true };
    }

    const errorText = await response.text();
    logger.error(`AWeber add subscriber failed: status=${response.status} body=${errorText}`);

    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message?.includes('already subscribed')) {
          logger.info(`AWeber: Subscriber ${params.email} already exists`);
          return { success: true };
        }
      } catch {}
    }

    return { success: false, error: `AWeber API error: ${response.status} - ${errorText}` };
    
  } catch (error) {
    logger.error('AWeber error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function addUpsellSubscriber(params: AddPaidSubscriberParams): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.AWEBER_ACCOUNT_ID;
  const upsellListId = '6937139';
  
  if (!accountId) {
    logger.warn('AWeber account not configured');
    return { success: false, error: 'AWeber not configured' };
  }
  
  if (!process.env.AWEBER_ACCESS_TOKEN || !process.env.AWEBER_REFRESH_TOKEN) {
    logger.warn('AWeber tokens not configured');
    return { success: false, error: 'AWeber tokens not configured' };
  }
  
  try {
    // Build custom fields with stripe order ID
    const customFields: Record<string, string> = {
      stripe_order_id: params.stripeOrderId,
    };
    
    // Add shipping fields if provided (these will only update if present, preserving existing data)
    if (params.shipping) {
      if (params.shipping.name) customFields.shipping_name = params.shipping.name;
      if (params.shipping.line1) customFields.shipping_line1 = params.shipping.line1;
      if (params.shipping.line2) customFields.shipping_line2 = params.shipping.line2;
      if (params.shipping.city) customFields.shipping_city = params.shipping.city;
      if (params.shipping.state) customFields.shipping_state = params.shipping.state;
      if (params.shipping.postal) customFields.shipping_postal = params.shipping.postal;
      if (params.shipping.country) customFields.shipping_country = params.shipping.country;
    }
    
    const subscriberData: Record<string, unknown> = {
      email: params.email,
      update_existing: true,
      custom_fields: customFields,
    };
    
    if (params.name) {
      subscriberData.name = params.name;
    }
    
    if (params.tags && params.tags.length > 0) {
      subscriberData.tags = params.tags;
    }
    
    const response = await makeAWeberRequest(
      `/accounts/${accountId}/lists/${upsellListId}/subscribers`,
      {
        method: 'POST',
        body: JSON.stringify(subscriberData),
      }
    );
    
    if (response.ok || response.status === 201) {
      logger.info(`AWeber Upsell List: Successfully added subscriber ${params.email} with order ${params.stripeOrderId}`);
      return { success: true };
    }

    const errorText = await response.text();
    logger.error(`AWeber upsell list add subscriber failed: status=${response.status} body=${errorText}`);

    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message?.includes('already subscribed')) {
          logger.info(`AWeber Upsell List: Subscriber ${params.email} already exists`);
          return { success: true };
        }
      } catch {}
    }

    return { success: false, error: `AWeber API error: ${response.status} - ${errorText}` };
    
  } catch (error) {
    logger.error('AWeber upsell list error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function addUpsell2Subscriber(params: AddPaidSubscriberParams): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.AWEBER_ACCOUNT_ID;
  const upsell2ListId = '6939683';
  
  if (!accountId) {
    logger.warn('AWeber account not configured');
    return { success: false, error: 'AWeber not configured' };
  }
  
  if (!process.env.AWEBER_ACCESS_TOKEN || !process.env.AWEBER_REFRESH_TOKEN) {
    logger.warn('AWeber tokens not configured');
    return { success: false, error: 'AWeber tokens not configured' };
  }
  
  try {
    const customFields: Record<string, string> = {
      stripe_order_id: params.stripeOrderId,
    };
    
    if (params.shipping) {
      if (params.shipping.name) customFields.shipping_name = params.shipping.name;
      if (params.shipping.line1) customFields.shipping_line1 = params.shipping.line1;
      if (params.shipping.line2) customFields.shipping_line2 = params.shipping.line2;
      if (params.shipping.city) customFields.shipping_city = params.shipping.city;
      if (params.shipping.state) customFields.shipping_state = params.shipping.state;
      if (params.shipping.postal) customFields.shipping_postal = params.shipping.postal;
      if (params.shipping.country) customFields.shipping_country = params.shipping.country;
    }
    
    const subscriberData: Record<string, unknown> = {
      email: params.email,
      update_existing: true,
      custom_fields: customFields,
    };
    
    if (params.name) {
      subscriberData.name = params.name;
    }
    
    if (params.tags && params.tags.length > 0) {
      subscriberData.tags = params.tags;
    }
    
    const response = await makeAWeberRequest(
      `/accounts/${accountId}/lists/${upsell2ListId}/subscribers`,
      {
        method: 'POST',
        body: JSON.stringify(subscriberData),
      }
    );
    
    if (response.ok || response.status === 201) {
      logger.info(`AWeber Upsell2 List (${upsell2ListId}): Successfully added subscriber ${params.email} with order ${params.stripeOrderId}`);
      return { success: true };
    }

    const errorText = await response.text();
    logger.error(`AWeber upsell2 list add subscriber failed: status=${response.status} body=${errorText}`);

    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message?.includes('already subscribed')) {
          logger.info(`AWeber Upsell2 List: Subscriber ${params.email} already exists`);
          return { success: true };
        }
      } catch {}
    }

    return { success: false, error: `AWeber API error: ${response.status} - ${errorText}` };
    
  } catch (error) {
    logger.error('AWeber upsell2 list error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ─── Soulmate Sketch funnel ──────────────────────────────────────────────────
// Independent of V1 — uses separate AWeber lists so the soulmate drip doesn't
// collide with the existing Evelyn-Cross psychic-reading drip. List IDs are
// env-driven (set on the secondary Railway service). All calls are
// fire-and-forget — never block the user flow.

interface SoulmateLeadParams {
  email: string;
  firstName: string;
  lastName?: string;
  preference?: string;
  ageRange?: string;
  ethnicity?: string;
  birthMonth?: string;
  birthDay?: string;
  birthYear?: string;
  landerPath?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  // Resume-purchase token referenced in AWeber drip CTAs via {!intake_token}.
  // Server mints + persists in soulmate_lander_sessions; AWeber renders it into
  // ?t=<token> URLs that hydrate the sales page.
  intakeToken?: string;
}

interface SoulmateSketchPaidParams {
  email: string;
  firstName: string;
  stripeOrderId: string;
  purchaseAmountCents: number;
}

interface SoulmateUpsellSubscriberParams {
  email: string;
  firstName: string;
  stripeOrderId: string;
  purchaseAmountCents: number;
  shipping: ShippingAddress;
}

interface SoulmateDeclinedParams {
  email: string;
  declinedProduct: 'soulmate_bracelet' | 'soulmate_love_tuner';
}

// Generic soulmate-list write — every soulmate AWeber call goes through here
// so we have one place to handle auth, retry-on-401, and "already subscribed"
// edge cases consistently.
async function writeSoulmateSubscriber(opts: {
  listId: string;
  listLabel: string;
  email: string;
  name?: string;
  customFields: Record<string, string>;
  tags: string[];
}): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.AWEBER_ACCOUNT_ID;
  if (!accountId) {
    logger.warn(`AWeber ${opts.listLabel}: account not configured`);
    return { success: false, error: 'AWeber not configured' };
  }
  if (!process.env.AWEBER_ACCESS_TOKEN || !process.env.AWEBER_REFRESH_TOKEN) {
    logger.warn(`AWeber ${opts.listLabel}: tokens not configured`);
    return { success: false, error: 'AWeber tokens not configured' };
  }
  if (!opts.listId) {
    logger.warn(`AWeber ${opts.listLabel}: list ID env var not set`);
    return { success: false, error: 'List ID not configured' };
  }

  try {
    const subscriberData: Record<string, unknown> = {
      email: opts.email,
      update_existing: true,
    };
    // Only include custom_fields when there's at least one to set. AWeber
    // treats `custom_fields: {}` with update_existing as "clear all custom
    // fields" — which silently wipes values set by earlier API calls on the
    // same subscriber/list. Surfaced when the decline-tag call (no custom
    // fields) ran ~11s after the sketch purchase populated 3 fields.
    if (Object.keys(opts.customFields).length > 0) {
      subscriberData.custom_fields = opts.customFields;
    }
    if (opts.name) subscriberData.name = opts.name;
    if (opts.tags.length > 0) subscriberData.tags = opts.tags;

    const response = await makeAWeberRequest(
      `/accounts/${accountId}/lists/${opts.listId}/subscribers`,
      { method: 'POST', body: JSON.stringify(subscriberData) },
    );

    if (response.ok || response.status === 201) {
      logger.info(`AWeber ${opts.listLabel}: added/updated ${opts.email}`);
      return { success: true };
    }

    const errorText = await response.text();
    logger.error(`AWeber ${opts.listLabel} failed: status=${response.status} body=${errorText}`);

    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message?.includes('already subscribed')) {
          logger.info(`AWeber ${opts.listLabel}: ${opts.email} already exists`);
          return { success: true };
        }
      } catch {}
    }

    return { success: false, error: `AWeber API error: ${response.status} - ${errorText}` };
  } catch (error) {
    logger.error(`AWeber ${opts.listLabel} error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function addSoulmateLeadSubscriber(params: SoulmateLeadParams) {
  const custom: Record<string, string> = {};
  if (params.lastName) custom.last_name = params.lastName;
  if (params.preference) custom.preference = params.preference;
  if (params.ageRange) custom.age_range = params.ageRange;
  if (params.ethnicity) custom.ethnicity = params.ethnicity;
  if (params.birthMonth) custom.birth_month = params.birthMonth;
  if (params.birthDay) custom.birth_day = params.birthDay;
  if (params.birthYear) custom.birth_year = params.birthYear;
  if (params.landerPath) custom.lander_path = params.landerPath;
  if (params.utmSource) custom.utm_source = params.utmSource;
  if (params.utmCampaign) custom.utm_campaign = params.utmCampaign;
  if (params.utmMedium) custom.utm_medium = params.utmMedium;
  if (params.intakeToken) custom.intake_token = params.intakeToken;

  return writeSoulmateSubscriber({
    listId: process.env.AWEBER_SOULMATE_LEADS_LIST_ID || '',
    listLabel: 'Soulmate Leads',
    email: params.email,
    name: params.firstName,
    customFields: custom,
    tags: ['soulmate-lead'],
  });
}

export async function addSoulmatePaidSubscriber(params: SoulmateSketchPaidParams) {
  return writeSoulmateSubscriber({
    listId: process.env.AWEBER_SOULMATE_PAID_LIST_ID || '',
    listLabel: 'Soulmate Sketch Buyers',
    email: params.email,
    name: params.firstName,
    customFields: {
      stripe_order_id: params.stripeOrderId,
      purchase_amount_usd: String(params.purchaseAmountCents / 100),
      product: 'soulmate_sketch',
    },
    tags: ['soulmate-sketch-buyer'],
  });
}

export async function addSoulmateUpsell1Subscriber(params: SoulmateUpsellSubscriberParams) {
  const custom: Record<string, string> = {
    stripe_order_id: params.stripeOrderId,
    purchase_amount_usd: String(params.purchaseAmountCents / 100),
    product: 'soulmate_bracelet',
  };
  // Shipping is mandatory upstream (charge endpoint rejects without it), so
  // these are always populated when this function runs. Conditional spread is
  // defensive only.
  const s = params.shipping;
  if (s.name) custom.shipping_name = s.name;
  if (s.line1) custom.shipping_line1 = s.line1;
  if (s.line2) custom.shipping_line2 = s.line2;
  if (s.city) custom.shipping_city = s.city;
  if (s.state) custom.shipping_state = s.state;
  if (s.postal) custom.shipping_postal = s.postal;
  if (s.country) custom.shipping_country = s.country;

  return writeSoulmateSubscriber({
    listId: process.env.AWEBER_SOULMATE_UPSELL1_LIST_ID || '',
    listLabel: 'Soulmate Bracelet Buyers',
    email: params.email,
    name: params.firstName,
    customFields: custom,
    tags: ['soulmate-bracelet-buyer'],
  });
}

export async function addSoulmateUpsell2Subscriber(params: SoulmateUpsellSubscriberParams) {
  const custom: Record<string, string> = {
    stripe_order_id: params.stripeOrderId,
    purchase_amount_usd: String(params.purchaseAmountCents / 100),
    product: 'soulmate_love_tuner',
  };
  const s = params.shipping;
  if (s.name) custom.shipping_name = s.name;
  if (s.line1) custom.shipping_line1 = s.line1;
  if (s.line2) custom.shipping_line2 = s.line2;
  if (s.city) custom.shipping_city = s.city;
  if (s.state) custom.shipping_state = s.state;
  if (s.postal) custom.shipping_postal = s.postal;
  if (s.country) custom.shipping_country = s.country;

  return writeSoulmateSubscriber({
    listId: process.env.AWEBER_SOULMATE_UPSELL2_LIST_ID || '',
    listLabel: 'Soulmate Love Tuner Buyers',
    email: params.email,
    name: params.firstName,
    customFields: custom,
    tags: ['soulmate-love-tuner-buyer'],
  });
}

// Tag an existing subscriber on the Sketch Buyers list as having declined an
// upsell — enables recovery-offer drips segmented by tag. AWeber merges tags
// with update_existing:true, so this won't overwrite existing tags.
export async function tagSoulmateDeclinedUpsell(params: SoulmateDeclinedParams) {
  const tag = params.declinedProduct === 'soulmate_bracelet'
    ? 'soulmate-declined-bracelet'
    : 'soulmate-declined-love-tuner';

  return writeSoulmateSubscriber({
    listId: process.env.AWEBER_SOULMATE_PAID_LIST_ID || '',
    listLabel: `Soulmate Declined (${params.declinedProduct})`,
    email: params.email,
    customFields: {},
    tags: [tag],
  });
}

export async function addPaidSubscriber(params: AddPaidSubscriberParams): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.AWEBER_ACCOUNT_ID;
  const paidListId = process.env.AWEBER_PAID_LIST_ID || '6936955';
  
  if (!accountId) {
    logger.warn('AWeber account not configured');
    return { success: false, error: 'AWeber not configured' };
  }
  
  if (!process.env.AWEBER_ACCESS_TOKEN || !process.env.AWEBER_REFRESH_TOKEN) {
    logger.warn('AWeber tokens not configured');
    return { success: false, error: 'AWeber tokens not configured' };
  }
  
  try {
    const subscriberData: Record<string, unknown> = {
      email: params.email,
      update_existing: true,
      custom_fields: {
        stripe_order_id: params.stripeOrderId,
      },
    };
    
    if (params.name) {
      subscriberData.name = params.name;
    }
    
    if (params.tags && params.tags.length > 0) {
      subscriberData.tags = params.tags;
    }
    
    const response = await makeAWeberRequest(
      `/accounts/${accountId}/lists/${paidListId}/subscribers`,
      {
        method: 'POST',
        body: JSON.stringify(subscriberData),
      }
    );
    
    if (response.ok || response.status === 201) {
      logger.info(`AWeber Paid List: Successfully added subscriber ${params.email} with order ${params.stripeOrderId}`);
      return { success: true };
    }

    const errorText = await response.text();
    logger.error(`AWeber paid list add subscriber failed: status=${response.status} body=${errorText}`);

    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message?.includes('already subscribed')) {
          logger.info(`AWeber Paid List: Subscriber ${params.email} already exists`);
          return { success: true };
        }
      } catch {}
    }

    return { success: false, error: `AWeber API error: ${response.status} - ${errorText}` };
    
  } catch (error) {
    logger.error('AWeber paid list error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
