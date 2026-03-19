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
