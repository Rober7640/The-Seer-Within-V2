import { test, expect } from '@playwright/test';

test.describe('Follow-Up Email System', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

  test.describe('Webhook Endpoint', () => {
    test('POST /api/webhooks/resend should accept valid webhook events', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/resend`, {
        data: {
          type: 'email.delivered',
          data: {
            email_id: 'test-nonexistent-id',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });

    test('POST /api/webhooks/resend should reject invalid payload', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/resend`, {
        data: {},
      });

      expect(response.status()).toBe(400);
    });

    test('POST /api/webhooks/resend should handle opened event', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/resend`, {
        data: {
          type: 'email.opened',
          data: {
            email_id: 'test-opened-id',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });

    test('POST /api/webhooks/resend should handle clicked event', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/resend`, {
        data: {
          type: 'email.clicked',
          data: {
            email_id: 'test-clicked-id',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });

    test('POST /api/webhooks/resend should handle bounced event', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/resend`, {
        data: {
          type: 'email.bounced',
          data: {
            email_id: 'test-bounced-id',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });

    test('POST /api/webhooks/resend should handle complained event', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/resend`, {
        data: {
          type: 'email.complained',
          data: {
            email_id: 'test-complained-id',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });

    test('POST /api/webhooks/resend should handle unknown event type gracefully', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/resend`, {
        data: {
          type: 'email.unknown_event',
          data: {
            email_id: 'test-unknown-id',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });
  });

  test.describe('Unsubscribe Endpoint', () => {
    test('GET /api/webhooks/unsubscribe should return error for missing token', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/webhooks/unsubscribe`);

      expect(response.status()).toBe(400);
      const body = await response.text();
      expect(body).toContain('Missing unsubscribe token');
    });

    test('GET /api/webhooks/unsubscribe should return error for invalid token', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/webhooks/unsubscribe?token=invalid-token-12345`,
      );

      expect(response.status()).toBe(404);
      const body = await response.text();
      expect(body).toContain('Invalid or expired');
    });

    test('POST /api/webhooks/unsubscribe should return error for missing token', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/unsubscribe`, {
        data: {},
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Missing token');
    });

    test('POST /api/webhooks/unsubscribe should return error for invalid token', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/webhooks/unsubscribe`, {
        data: { token: 'invalid-token-xyz' },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Invalid token');
    });
  });

  test.describe('Unsubscribe Page Rendering', () => {
    test('unsubscribe error page should have proper HTML structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/webhooks/unsubscribe`);

      // Should show an error page (missing token)
      await expect(page.locator('text=Missing unsubscribe token')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.status')).toContainText('Error');
    });

    test('unsubscribe invalid token page should render', async ({ page }) => {
      await page.goto(`${BASE_URL}/api/webhooks/unsubscribe?token=bad-token`);

      await expect(page.locator('text=Invalid or expired')).toBeVisible({ timeout: 5000 });
    });
  });
});
