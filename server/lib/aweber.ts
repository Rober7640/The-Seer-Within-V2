import logger from './logger';
import {
  BACKEND_OFFERS,
  deliveredTag,
  purchaseTags,
  type BackendOfferKey,
} from './backendCustomerList';

const AWEBER_API_BASE = 'https://api.aweber.com/1.0';

interface AWeberTokens {
  accessToken: string;
  refreshToken: string;
}

interface AddSubscriberParams {
  email: string;
  name?: string;
  tags?: string[];
  // Optional per-lander list override. Falls back to AWEBER_LIST_ID when unset,
  // so existing callers are unaffected.
  listId?: string;
  // Optional AWeber custom fields (e.g. `resume_url`). Only ever sent when
  // non-empty — see the wipe guard in addSubscriberToList. The field must
  // already exist ON THAT LIST; custom fields are per-list, not per-account.
  customFields?: Record<string, string>;
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
  const listId = params.listId || process.env.AWEBER_LIST_ID;

  if (!accountId || !listId) {
    logger.warn('AWeber account/list not configured');
    return { success: false, error: 'AWeber not configured' };
  }
  
  if (!process.env.AWEBER_ACCESS_TOKEN || !process.env.AWEBER_REFRESH_TOKEN) {
    logger.warn('AWeber tokens not configured');
    return { success: false, error: 'AWeber tokens not configured' };
  }
  
  const customFields = params.customFields ?? {};
  const hasCustomFields = Object.keys(customFields).length > 0;

  try {
    const postSubscriber = (withCustomFields: boolean) => {
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

      // Only include custom_fields when there's at least one to set. AWeber
      // treats `custom_fields: {}` with update_existing as "clear all custom
      // fields" — which silently wipes values set by earlier API calls on the
      // same subscriber/list. Same trap already guarded in
      // writeSoulmateSubscriber, where a decline-tag call with no custom
      // fields wiped three populated values ~11s after a purchase.
      if (withCustomFields && hasCustomFields) {
        subscriberData.custom_fields = customFields;
      }

      return makeAWeberRequest(
        `/accounts/${accountId}/lists/${listId}/subscribers`,
        {
          method: 'POST',
          body: JSON.stringify(subscriberData),
        }
      );
    };

    const isAlreadySubscribed = (body: string): boolean => {
      try {
        return !!JSON.parse(body).error?.message?.includes('already subscribed');
      } catch {
        return false;
      }
    };

    let response = await postSubscriber(true);

    if (response.ok || response.status === 201) {
      logger.info(`AWeber: Successfully added subscriber ${params.email}`);
      return { success: true };
    }

    let errorText = await response.text();
    logger.error(`AWeber add subscriber failed: status=${response.status} body=${errorText}`);

    if (response.status === 400) {
      if (isAlreadySubscribed(errorText)) {
        logger.info(`AWeber: Subscriber ${params.email} already exists`);
        return { success: true };
      }

      // A custom field the list doesn't define is rejected for the WHOLE
      // request, so an unknown/misnamed field would cost us the SUBSCRIBER and
      // not just the field. Custom fields are per-list, so standing up a new
      // per-lander list (AWEBER_LIST_ID_<FUNNEL>) without creating `resume_url`
      // on it would otherwise silently stop that funnel's leads reaching
      // AWeber at all. Retry once without them: the lead always lands, and the
      // warning below is what tells us the field is missing or misnamed.
      if (hasCustomFields) {
        logger.warn(
          `AWeber: retrying ${params.email} without custom fields (${Object.keys(customFields).join(', ')}) — list ${listId} may not define them`
        );
        response = await postSubscriber(false);

        if (response.ok || response.status === 201) {
          logger.info(`AWeber: Added subscriber ${params.email} WITHOUT custom fields`);
          return { success: true };
        }

        errorText = await response.text();
        logger.error(`AWeber retry without custom fields failed: status=${response.status} body=${errorText}`);

        if (response.status === 400 && isAlreadySubscribed(errorText)) {
          logger.info(`AWeber: Subscriber ${params.email} already exists`);
          return { success: true };
        }
      }
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

interface AddBumpSubscriberParams {
  email: string;
  name?: string;
  /** The Stripe CHECKOUT SESSION id (`cs_…`), not the PaymentIntent. See below. */
  stripeOrderId: string;
  tags?: string[];
}

/**
 * ORDER-BUMP paid list (`theseerwithin_money_ob_paid`, 6969209).
 *
 * Written IN ADDITION to the normal paid list, never instead of it: an order-bump
 * buyer bought the main offer too (both are line items on one session), so she
 * belongs on both. The two lists are separate AWeber subscriber records, so this
 * write cannot touch her entry on the main paid list.
 *
 * 🔴 WHY THE SESSION ID AND NOT THE PAYMENT INTENT: the main paid list stores the
 * `pi_…` id. This list stores `cs_…` because that is what Mike's n8n flow sees —
 * his filter reads `body.data.object.*` where data.object IS the checkout session,
 * so `cs_…` is the id that can be joined against his side. Requested by Lewis
 * 2026-08-04. Do not "fix" this to match the other list.
 *
 * 🔴 NEVER send an empty `custom_fields` object here. AWeber treats
 * `custom_fields: {}` together with `update_existing` as "clear all custom fields",
 * so a bump buyer who is written twice (Stripe retries this webhook) would have her
 * `stripe_order_id` WIPED by the second call. The field is always populated below,
 * and `stripeOrderId` is required by the type so it cannot silently go missing.
 *
 * Idempotent by construction: `update_existing: true` upserts, and AWeber's
 * "already subscribed" 400 is treated as success — both matter because Stripe
 * retries `checkout.session.completed`.
 */
export async function addBumpPaidSubscriber(
  params: AddBumpSubscriberParams,
): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.AWEBER_ACCOUNT_ID;
  const bumpListId = process.env.AWEBER_BUMP_PAID_LIST_ID || '6969209';

  if (!accountId) {
    logger.warn('AWeber account not configured');
    return { success: false, error: 'AWeber not configured' };
  }

  if (!process.env.AWEBER_ACCESS_TOKEN || !process.env.AWEBER_REFRESH_TOKEN) {
    logger.warn('AWeber tokens not configured');
    return { success: false, error: 'AWeber tokens not configured' };
  }

  // Guard the one thing that would silently corrupt the list. Better to skip the
  // write and log loudly than to upsert a row whose custom field gets cleared.
  if (!params.stripeOrderId) {
    logger.error('AWeber bump list: refusing to write without a stripe_order_id', {
      email: params.email,
    });
    return { success: false, error: 'missing stripeOrderId' };
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
      `/accounts/${accountId}/lists/${bumpListId}/subscribers`,
      {
        method: 'POST',
        body: JSON.stringify(subscriberData),
      }
    );

    if (response.ok || response.status === 201) {
      logger.info(
        `AWeber Bump Paid List: Added ${params.email} with order ${params.stripeOrderId}`,
      );
      return { success: true };
    }

    const errorText = await response.text();
    logger.error(`AWeber bump list add subscriber failed: status=${response.status} body=${errorText}`);

    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message?.includes('already subscribed')) {
          logger.info(`AWeber Bump Paid List: Subscriber ${params.email} already exists`);
          return { success: true };
        }
      } catch {}
    }

    return { success: false, error: `AWeber API error: ${response.status} - ${errorText}` };

  } catch (error) {
    logger.error('AWeber bump list error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// THE BACKEND DECK'S CUSTOMER LIST
// ============================================================================

interface BackendCustomerParams {
  email: string;
  /** From `?fn=` → Stripe metadata. Absent is normal; AWeber falls back to "dear". */
  firstName?: string;
  offer: BackendOfferKey;
  stripeOrderId: string;
  bumpPurchased?: boolean;
  /** 03 only — her Entry form, for the woman who leaves the thank-you page without filling it. */
  entryUrl?: string;
}

interface BackendDeliveredParams {
  email: string;
  offer: BackendOfferKey;
  stripeOrderId: string;
  /** Where her finished PDF lives. Merged into the delivery email by AWeber. */
  readingUrl: string;
}

/** One write path for the backend customer list, so auth, the "already
 *  subscribed" 400 and the custom-fields landmine are handled in one place. */
async function writeBackendCustomer(opts: {
  label: string;
  email: string;
  name?: string;
  customFields: Record<string, string>;
  tags: string[];
}): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.AWEBER_ACCOUNT_ID;
  const listId = process.env.AWEBER_BE_CUSTOMER_LIST_ID;

  if (!accountId) {
    logger.warn(`AWeber ${opts.label}: account not configured`);
    return { success: false, error: 'AWeber not configured' };
  }
  if (!process.env.AWEBER_ACCESS_TOKEN || !process.env.AWEBER_REFRESH_TOKEN) {
    logger.warn(`AWeber ${opts.label}: tokens not configured`);
    return { success: false, error: 'AWeber tokens not configured' };
  }
  if (!listId) {
    logger.warn(`AWeber ${opts.label}: AWEBER_BE_CUSTOMER_LIST_ID not set`);
    return { success: false, error: 'List ID not configured' };
  }

  try {
    const subscriberData: Record<string, unknown> = {
      email: opts.email,
      update_existing: true,
      custom_fields: opts.customFields,
    };
    if (opts.name) subscriberData.name = opts.name;
    if (opts.tags.length > 0) subscriberData.tags = opts.tags;

    const response = await makeAWeberRequest(
      `/accounts/${accountId}/lists/${listId}/subscribers`,
      { method: 'POST', body: JSON.stringify(subscriberData) },
    );

    if (response.ok || response.status === 201) {
      logger.info(`AWeber ${opts.label}: added/updated ${opts.email}`);
      return { success: true };
    }

    const errorText = await response.text();
    logger.error(`AWeber ${opts.label} failed: status=${response.status} body=${errorText}`);

    // She bought a second backend offer, so she is already on the list. That is
    // the normal case for a repeat buyer, and the tags still applied.
    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message?.includes('already subscribed')) {
          logger.info(`AWeber ${opts.label}: ${opts.email} already on the list`);
          return { success: true };
        }
      } catch {}
    }

    return { success: false, error: `AWeber API error: ${response.status} - ${errorText}` };
  } catch (error) {
    logger.error(`AWeber ${opts.label} error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Put a backend buyer on the customer list at the moment she pays.
 *
 * The offer tag is what SENDS her thank-you: an AWeber Campaign is triggered by
 * it. So this call is not bookkeeping — it is the send. If it fails, a woman who
 * paid gets no email at all, which is why the caller must log the failure
 * loudly rather than swallowing it.
 *
 * 🔴 NEVER let `custom_fields` go out empty. AWeber reads `custom_fields: {}`
 * with `update_existing` as "clear every custom field", so a second write would
 * wipe the first one's values — that is how a soulmate buyer lost her
 * `stripe_order_id` 11 seconds after paying. `stripe_order_id` and `offer` are
 * always populated below, and the type makes `stripeOrderId` mandatory so it
 * cannot go missing quietly.
 *
 * Idempotent by construction: `update_existing: true` upserts and AWeber's
 * "already subscribed" 400 counts as success — both matter because Stripe
 * retries `checkout.session.completed`.
 */
export async function addBackendCustomer(
  params: BackendCustomerParams,
): Promise<{ success: boolean; error?: string }> {
  const listing = BACKEND_OFFERS[params.offer];
  if (!listing) {
    logger.error('AWeber BE customer list: unknown offer', { offer: params.offer });
    return { success: false, error: `unknown offer: ${params.offer}` };
  }

  if (!params.stripeOrderId) {
    logger.error('AWeber BE customer list: refusing to write without a stripe_order_id', {
      email: params.email,
      offer: params.offer,
    });
    return { success: false, error: 'missing stripeOrderId' };
  }

  const customFields: Record<string, string> = {
    stripe_order_id: params.stripeOrderId,
    offer: params.offer,
  };
  if (params.entryUrl) customFields.entry_url = params.entryUrl;

  return writeBackendCustomer({
    label: `BE customer (${listing.number})`,
    email: params.email,
    name: params.firstName,
    customFields,
    tags: purchaseTags(params.offer, params.bumpPurchased),
  });
}

/**
 * Hand AWeber the finished reading and let it send the delivery email.
 *
 * `reading_url` is a custom field on her subscriber record; the delivery email
 * merges it. This is the only way one AWeber email can carry a different PDF to
 * each buyer — the alternative is one PDF for everybody (decision D7).
 *
 * 🔴 `stripe_order_id` and `offer` are re-sent here on purpose, even though they
 * have not changed. A `custom_fields` object is treated as the subscriber's
 * whole custom-field state on write, so sending `{ reading_url }` alone risks
 * clearing the other two. Re-sending costs nothing and cannot corrupt.
 */
export async function markBackendReadingDelivered(
  params: BackendDeliveredParams,
): Promise<{ success: boolean; error?: string }> {
  const listing = BACKEND_OFFERS[params.offer];
  if (!listing) {
    logger.error('AWeber BE delivery: unknown offer', { offer: params.offer });
    return { success: false, error: `unknown offer: ${params.offer}` };
  }

  if (!params.readingUrl) {
    logger.error('AWeber BE delivery: refusing to tag a delivery with no reading URL', {
      email: params.email,
      offer: params.offer,
    });
    return { success: false, error: 'missing readingUrl' };
  }
  if (!params.stripeOrderId) {
    logger.error('AWeber BE delivery: refusing to write without a stripe_order_id', {
      email: params.email,
      offer: params.offer,
    });
    return { success: false, error: 'missing stripeOrderId' };
  }

  return writeBackendCustomer({
    label: `BE delivery (${listing.number})`,
    email: params.email,
    customFields: {
      stripe_order_id: params.stripeOrderId,
      offer: params.offer,
      reading_url: params.readingUrl,
    },
    tags: [deliveredTag(params.offer)],
  });
}
