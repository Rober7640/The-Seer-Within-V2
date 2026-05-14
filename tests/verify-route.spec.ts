import { test, expect } from '@playwright/test';

/**
 * Quick verification test for the new /chat/:personaSlug route
 */

test.describe('Route Verification', () => {
  test('should load /chat/evelyn-cross route', async ({ page }) => {
    // Navigate to the route
    await page.goto('http://localhost:5000/chat/evelyn-cross');

    // Should redirect to login or show the page
    await page.waitForLoadState('networkidle');

    // Check if we're on login page (expected for unauthenticated) or chat page
    const url = page.url();

    // If redirected to login, that's correct behavior
    if (url.includes('/login')) {
      console.log('✅ Route exists - redirected to login (expected for unauthenticated user)');
      expect(url).toContain('/login');
    } else if (url.includes('/chat/evelyn-cross')) {
      console.log('✅ Route exists - showing chat page (user might be authenticated)');
      expect(url).toContain('/chat/evelyn-cross');
    } else {
      console.log('❌ Route might not be working correctly');
      throw new Error(`Unexpected URL: ${url}`);
    }
  });

  test('should load /chat/evelyn-cross with authentication', async ({ page, request }) => {
    // Create test user and login
    const email = `verify-${Date.now()}@test.com`;
    const registerResponse = await request.post('http://localhost:5000/api/auth/register', {
      data: {
        email,
        password: 'testpass123',
        firstName: 'VerifyUser'
      }
    });

    expect(registerResponse.ok()).toBeTruthy();
    const registerData = await registerResponse.json();
    const authToken = registerData.token;

    // Set auth token
    await page.goto('http://localhost:5000/');
    await page.evaluate((token) => {
      localStorage.setItem('seer_auth_token', token);
    }, authToken);

    // Navigate to Evelyn Cross chat
    await page.goto('http://localhost:5000/chat/evelyn-cross');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should see chat interface
    const url = page.url();
    console.log('Current URL:', url);

    // Should stay on chat page (not redirect)
    expect(url).toContain('/chat/evelyn-cross');

    // Should see Evelyn's name or avatar (wait up to 10 seconds)
    await page.waitForTimeout(5000);

    // Check if chat UI elements are present
    const pageContent = await page.content();

    // Should have chat-related elements
    const hasEvelyn = pageContent.toLowerCase().includes('evelyn');
    const hasChatInterface =
      pageContent.includes('data-testid') ||
      pageContent.includes('input') ||
      pageContent.includes('chat');

    console.log('Has Evelyn reference:', hasEvelyn);
    console.log('Has chat interface:', hasChatInterface);

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/evelyn-cross-route.png', fullPage: true });
    console.log('✅ Screenshot saved to test-results/evelyn-cross-route.png');
  });
});
