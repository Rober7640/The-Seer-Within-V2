import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackendPurchaseEvent, dedupeUuid } from './backendPurchaseAnalytics';

// RFC 4122 UUID (any version). PostHog drops events whose uuid is not a real UUID.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('buildBackendPurchaseEvent', () => {
  it('booking sale → funnel twinflame, step sales, amount + utm on the event', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_twin_flame',
      offer: 'twin-flame',
      amountCents: 3500,
      email: 'her@example.com',
      distinctId: 'ph_abc',
      utm: { utm_campaign: 'twinflame_partnerA', utm_source: 'aweber' },
      dedupeId: 'cs_test_123',
      bumpProduct: undefined,
    });
    assert.equal(ev.event, 'purchase_completed');
    assert.equal(ev.distinctId, 'ph_abc');
    // uuid must be a REAL UUID (not the raw cs_/pi_ id), else PostHog drops the event.
    assert.match(ev.uuid, UUID_RE);
    assert.equal(ev.uuid, dedupeUuid('cs_test_123'));
    // raw Stripe id is preserved as a filterable property for reconciliation.
    assert.equal(ev.properties.dedupe_ref, 'cs_test_123');
    assert.equal(ev.properties.funnel, 'twinflame');
    assert.equal(ev.properties.step, 'sales');
    assert.equal(ev.properties.product, 'be_twin_flame');
    assert.equal(ev.properties.amount_cents, 3500);
    assert.equal(ev.properties.utm_campaign, 'twinflame_partnerA');
    assert.equal(ev.properties.utm_source, 'aweber');
    // The three Joel didn't use are still present as null (always filterable).
    assert.equal(ev.properties.utm_medium, null);
    assert.equal(ev.properties.utm_content, null);
    assert.equal(ev.properties.utm_term, null);
    assert.equal(ev.properties.is_backend, true);
    assert.equal(ev.properties.bump, false);
  });

  it('tag in ANY utm param lands on the event — here utm_source only', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_twin_flame', offer: 'twin-flame', amountCents: 3500,
      email: 'x@y.com', dedupeId: 'cs_3',
      utm: { utm_source: 'twinflame_partnerB' },
    });
    assert.equal(ev.properties.utm_source, 'twinflame_partnerB');
    assert.equal(ev.properties.utm_campaign, null);
    assert.equal(ev.properties.utm_content, null);
  });

  it('protection-ritual upsell → step upsell1', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_protection_ritual', offer: 'twin-flame',
      amountCents: 4700, email: 'x@y.com', dedupeId: 'pi_1',
    });
    assert.equal(ev.properties.step, 'upsell1');
    assert.equal(ev.properties.amount_cents, 4700);
  });

  it('bracelet upsell → step upsell2', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_bracelet', offer: 'twin-flame',
      amountCents: 3000, email: 'x@y.com', dedupeId: 'pi_2',
    });
    assert.equal(ev.properties.step, 'upsell2');
  });

  it('falls back to email as distinctId when none threaded', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_twin_flame', offer: 'twin-flame',
      amountCents: 3500, email: 'fallback@y.com', dedupeId: 'cs_1',
    });
    assert.equal(ev.distinctId, 'fallback@y.com');
    assert.equal(ev.properties.utm_campaign, null);
  });

  it('every dedupeId → a valid UUID on the event (raw cs_/pi_ ids would be dropped)', () => {
    for (const id of ['cs_test_123', 'cs_live_abc', 'pi_1', 'pi_3UBpHGDFsOnGQRvy0WdGmUoG']) {
      const ev = buildBackendPurchaseEvent({
        product: 'be_twin_flame', offer: 'twin-flame', amountCents: 3500,
        email: 'x@y.com', dedupeId: id,
      });
      assert.match(ev.uuid, UUID_RE, `uuid for ${id} is not a valid UUID`);
    }
  });

  it('bumpProduct present → bump true and bump_product set', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_twin_flame', offer: 'twin-flame', amountCents: 4477,
      email: 'x@y.com', dedupeId: 'cs_2', bumpProduct: 'be_astro_force',
    });
    assert.equal(ev.properties.bump, true);
    assert.equal(ev.properties.bump_product, 'be_astro_force');
  });
});

describe('dedupeUuid', () => {
  it('produces a valid RFC-4122 UUID from a Stripe id', () => {
    assert.match(dedupeUuid('cs_live_abc123'), UUID_RE);
    assert.match(dedupeUuid('pi_3UBpHGDFsOnGQRvy0WdGmUoG'), UUID_RE);
  });

  it('is deterministic — same id → same uuid (so Stripe retries dedupe)', () => {
    assert.equal(dedupeUuid('cs_live_abc123'), dedupeUuid('cs_live_abc123'));
  });

  it('is collision-safe — different ids → different uuids', () => {
    assert.notEqual(dedupeUuid('cs_live_a'), dedupeUuid('cs_live_b'));
  });
});
