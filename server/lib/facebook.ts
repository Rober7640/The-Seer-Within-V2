import crypto from 'crypto';
import logger from './logger';

const FB_PIXEL_ID = process.env.FB_PIXEL_ID || '446814716830295';
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

interface UserData {
  email?: string;
  firstName?: string;
  userAgent?: string;
  clientIpAddress?: string;
}

interface EventData {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  userData?: UserData;
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export async function sendFacebookEvent(data: EventData): Promise<{ success: boolean; error?: string }> {
  if (!FB_ACCESS_TOKEN) {
    logger.warn('FB_ACCESS_TOKEN not configured - skipping server-side event');
    return { success: false, error: 'FB_ACCESS_TOKEN not configured' };
  }

  try {
    const userData: Record<string, string> = {};
    
    if (data.userData?.email) {
      userData.em = hashValue(data.userData.email);
    }
    if (data.userData?.firstName) {
      userData.fn = hashValue(data.userData.firstName);
    }
    if (data.userData?.userAgent) {
      userData.client_user_agent = data.userData.userAgent;
    }
    if (data.userData?.clientIpAddress) {
      userData.client_ip_address = data.userData.clientIpAddress;
    }

    const customData: Record<string, unknown> = {};
    if (data.value !== undefined) {
      customData.value = data.value;
    }
    if (data.currency) {
      customData.currency = data.currency;
    }
    if (data.contentName) {
      customData.content_name = data.contentName;
    }

    const eventPayload = {
      event_name: data.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: data.eventId,
      event_source_url: data.eventSourceUrl,
      action_source: 'website',
      user_data: userData,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [eventPayload],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Facebook Conversions API error', { error: errorText });
      return { success: false, error: errorText };
    }

    const result = await response.json();
    logger.debug('FB Event sent', { eventName: data.eventName, eventId: data.eventId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to send Facebook event', { error: String(error) });
    return { success: false, error: String(error) };
  }
}
