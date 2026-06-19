import logger from './logger';

// Kit (formerly ConvertKit) v4 API integration.
//
// Runs ALONGSIDE AWeber — every V1 lead is written to both. This module mirrors
// the shape of aweber.ts: env-gated (no-op when unconfigured), fire-and-forget
// from the caller's perspective, and tolerant of "already subscribed".
//
// v4 auth is a single API key sent in the `X-Kit-Api-Key` header (no secret,
// unlike v3). Two env vars drive it:
//   KIT_API_KEY   — the v4 API key
//   KIT_FORM_ID   — the form new leads are subscribed to (triggers any Kit
//                   welcome sequence and respects the form's double-opt-in
//                   setting)
//
// Funnel segmentation is done with tags (one per funnel: v1/fb/fb2/gdn/palm).
// v4 only lets you tag by tag ID, so we resolve names → IDs once via GET /tags
// and cache the map for the process lifetime.

const KIT_API_BASE = 'https://api.kit.com/v4';

interface AddLeadParams {
  email: string;
  firstName?: string;
  // Tag names to apply (e.g. ["fb"]). Resolved to IDs internally; unknown
  // names are logged and skipped, never fatal.
  tags?: string[];
  // Optional form override. When omitted, falls back to KIT_FORM_ID. Lets the
  // soulmate funnel point at its own form (KIT_SOULMATE_FORM_ID) for a separate
  // sequence — or share the default form when unset.
  formId?: string;
}

function getApiKey(): string | null {
  return process.env.KIT_API_KEY || null;
}

// Normalize a form ID: tolerate a full form URL being pasted instead of the
// bare ID (e.g. https://app.kit.com/forms/designers/9585171/edit) by extracting
// the numeric form ID. A bare "9585171" passes through unchanged.
function normalizeFormId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const match = raw.match(/\d+/);
  return match ? match[0] : null;
}

function getFormId(): string | null {
  return normalizeFormId(process.env.KIT_FORM_ID);
}

async function makeKitRequest(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const apiKey = getApiKey();
  return fetch(`${KIT_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'X-Kit-Api-Key': apiKey || '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });
}

// Cache of tag-name → tag-id, populated lazily from GET /v4/tags. Kit returns
// all tags (paginated); we walk the pages once and keep the result for the
// process lifetime. Tags are created by hand in the Kit dashboard, so this
// rarely changes — a stale cache only matters if a brand-new tag is added,
// which a redeploy clears.
let tagIdCache: Map<string, number> | null = null;

async function getTagIdMap(): Promise<Map<string, number>> {
  if (tagIdCache) return tagIdCache;

  const map = new Map<string, number>();
  let after: string | null = null;

  do {
    const query = after ? `?after=${encodeURIComponent(after)}` : '';
    const response = await makeKitRequest(`/tags${query}`, { method: 'GET' });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Kit: failed to list tags: status=${response.status} body=${errorText}`);
      // Return whatever we have so far rather than throwing — tagging is
      // best-effort and must not block the form subscribe.
      break;
    }

    const data = await response.json();
    for (const tag of data.tags ?? []) {
      if (tag?.name && typeof tag.id === 'number') {
        map.set(tag.name.toLowerCase(), tag.id);
      }
    }
    after = data.pagination?.has_next_page ? data.pagination.end_cursor : null;
  } while (after);

  tagIdCache = map;
  return tagIdCache;
}

// Apply a single tag (by name) to a subscriber. Best-effort: a missing tag or
// API error is logged and swallowed so it never breaks the lead write.
async function applyTag(email: string, tagName: string): Promise<void> {
  const map = await getTagIdMap();
  const tagId = map.get(tagName.toLowerCase());

  if (!tagId) {
    logger.warn(`Kit: tag "${tagName}" not found in account — skipping (create it in the Kit dashboard)`);
    return;
  }

  const response = await makeKitRequest(`/tags/${tagId}/subscribers`, {
    method: 'POST',
    body: JSON.stringify({ email_address: email }),
  });

  if (response.ok || response.status === 201) {
    logger.info(`Kit: tagged ${email} with "${tagName}"`);
    return;
  }

  const errorText = await response.text();
  logger.warn(`Kit: failed to tag ${email} with "${tagName}": status=${response.status} body=${errorText}`);
}

// Subscribe a new lead to Kit: upsert the subscriber (to carry first_name),
// add them to the configured form, then apply funnel tags. Mirrors AWeber's
// addSubscriberToList — fully non-blocking from the caller and safe to call
// when Kit is unconfigured.
export async function addLeadToKit(params: AddLeadParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = getApiKey();
  const formId = normalizeFormId(params.formId) ?? getFormId();

  if (!apiKey || !formId) {
    logger.warn('Kit: KIT_API_KEY / form ID not configured — skipping');
    return { success: false, error: 'Kit not configured' };
  }

  try {
    // 1. Upsert the subscriber so first_name is stored. v4 POST /subscribers is
    //    idempotent on email — re-posting an existing subscriber updates them
    //    rather than erroring.
    const subscriberBody: Record<string, unknown> = {
      email_address: params.email,
    };
    if (params.firstName) subscriberBody.first_name = params.firstName;

    const subResponse = await makeKitRequest('/subscribers', {
      method: 'POST',
      body: JSON.stringify(subscriberBody),
    });

    if (!subResponse.ok && subResponse.status !== 201) {
      const errorText = await subResponse.text();
      // Not fatal — the form subscribe below also creates the subscriber if
      // needed. Log and continue.
      logger.warn(`Kit: upsert subscriber ${params.email} returned status=${subResponse.status} body=${errorText}`);
    }

    // 2. Add to the form (triggers the form's automations / welcome sequence
    //    and honours its double-opt-in setting).
    const formResponse = await makeKitRequest(`/forms/${formId}/subscribers`, {
      method: 'POST',
      body: JSON.stringify({ email_address: params.email }),
    });

    let formError: string | undefined;
    if (formResponse.ok || formResponse.status === 201) {
      logger.info(`Kit: subscribed ${params.email} to form ${formId}`);
    } else {
      const errorText = await formResponse.text();
      logger.error(`Kit: add ${params.email} to form ${formId} failed: status=${formResponse.status} body=${errorText}`);
      formError = `Kit form subscribe error: ${formResponse.status} - ${errorText}`;
    }

    // 3. Apply funnel tags regardless of the form result — the funnel tag is the
    //    primary segmentation signal, so don't let a form-subscribe failure
    //    block it. Best-effort, sequential (at most one tag per lead today).
    for (const tagName of params.tags ?? []) {
      await applyTag(params.email, tagName);
    }

    return formError ? { success: false, error: formError } : { success: true };
  } catch (error) {
    logger.error('Kit error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
