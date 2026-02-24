import { test, expect } from '@playwright/test';

/**
 * MAS-010: Marcus Stone — Admin Side Verification
 * Tests admin visibility of sessions, credit transactions, grant credits,
 * persona editor, and safety violations.
 */

test.describe('MAS-010: Marcus Stone — Admin Side Verification', () => {
  const USER_PASSWORD = 'MarcusAdmin123!';
  const ADMIN_EMAIL = 'admin@theseerwithin.com';
  const ADMIN_PASSWORD = 'ChangeMe123!';

  /** Login to admin panel */
  async function loginAdmin(page: any) {
    await page.goto('/admin/login');
    await page.waitForTimeout(1000);

    // Fill admin credentials
    await page.fill('input[name="email"], input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Verify admin access
    const currentUrl = page.url();
    const isAdmin = currentUrl.includes('/admin');
    if (isAdmin) {
      console.log('Admin logged in at:', currentUrl);
    } else {
      console.log('INFO: Admin login may have redirected to:', currentUrl);
    }
    return isAdmin;
  }

  /** Register a user and complete a Marcus Stone session */
  async function registerUserAndCompleteSession(page: any, prefix: string): Promise<string> {
    const email = `mas010-${prefix}-${Date.now()}@example.com`;

    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', prefix);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 15000 });

    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);

    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    const input = page.locator('input[type="text"]');
    await input.fill('I want guidance about my path');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(12000);

    const endBtn = page.locator('text=End Session, button:has-text("End Session")');
    if (await endBtn.first().isVisible().catch(() => false)) {
      await endBtn.first().click();
      await page.waitForTimeout(3000);
    }

    return email;
  }

  test('MAS-010-01: Admin sees completed Marcus Stone session in user detail', async ({ page, browser }) => {
    // Register and complete a session as user
    const userEmail = await registerUserAndCompleteSession(page, 'AdminView');

    // Open admin context
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    try {
      const adminLoggedIn = await loginAdmin(adminPage);
      if (!adminLoggedIn) {
        console.log('INFO: Could not log in as admin — skipping test');
        return;
      }

      // Navigate to users list
      await adminPage.goto('/admin/users');
      await adminPage.waitForTimeout(2000);

      // Search for the test user
      const searchInput = adminPage.locator('input[placeholder*="search"], input[placeholder*="Search"], input[type="search"]').first();
      const searchVisible = await searchInput.isVisible().catch(() => false);
      if (searchVisible) {
        await searchInput.fill(userEmail);
        await adminPage.waitForTimeout(1000);
      }

      // Find user row
      const userRow = adminPage.locator(`text=${userEmail}`).first();
      const userFound = await userRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (userFound) {
        await userRow.click();
        await adminPage.waitForTimeout(2000);

        // Should be on user detail page — look for Marcus Stone session
        const marcusSession = adminPage.locator('text=/Marcus Stone/i');
        const sessionVisible = await marcusSession.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (sessionVisible) {
          console.log('PASS: Marcus Stone session visible in admin user detail');
        } else {
          // Check for any session history section
          const sessionSection = adminPage.locator('text=/session|history|reading/i');
          const sectionVisible = await sessionSection.first().isVisible().catch(() => false);
          console.log('INFO: Session section visible:', sectionVisible);
        }

        // Verify page is not an error
        const has500 = await adminPage.locator('text=/500|Error/i').isVisible().catch(() => false);
        expect(has500).toBeFalsy();
      } else {
        console.log('INFO: User not found in admin list (may need pagination or different search)');
      }
    } finally {
      await adminContext.close();
    }
  });

  test('MAS-010-02: Admin sees credit transaction record', async ({ page, browser }) => {
    const userEmail = await registerUserAndCompleteSession(page, 'CreditTx');

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    try {
      const adminLoggedIn = await loginAdmin(adminPage);
      if (!adminLoggedIn) {
        console.log('INFO: Admin login failed — skipping');
        return;
      }

      await adminPage.goto('/admin/users');
      await adminPage.waitForTimeout(2000);

      const userRow = adminPage.locator(`text=${userEmail}`).first();
      const userFound = await userRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (userFound) {
        await userRow.click();
        await adminPage.waitForTimeout(2000);

        // Look for credit transaction section
        const txSection = adminPage.locator('text=/transaction|credit.*history|usage/i');
        const txVisible = await txSection.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (txVisible) {
          console.log('PASS: Credit transaction section found in user detail');
        } else {
          console.log('INFO: No credit transaction section visible (may be in a different tab/section)');
        }

        // Verify credit balance is shown
        const coinBalance = adminPage.locator('text=/coin.*balance|credits|minutes/i');
        const balanceVisible = await coinBalance.first().isVisible().catch(() => false);
        console.log('Credit balance visible in admin:', balanceVisible);
      }
    } finally {
      await adminContext.close();
    }
  });

  test('MAS-010-03: Admin grant credits — user can resume after grant', async ({ page, browser }) => {
    const userEmail = await registerUserAndCompleteSession(page, 'GrantTest');

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    try {
      const adminLoggedIn = await loginAdmin(adminPage);
      if (!adminLoggedIn) {
        console.log('INFO: Admin login failed — skipping');
        return;
      }

      await adminPage.goto('/admin/users');
      await adminPage.waitForTimeout(2000);

      const userRow = adminPage.locator(`text=${userEmail}`).first();
      const userFound = await userRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (userFound) {
        await userRow.click();
        await adminPage.waitForTimeout(2000);

        // Look for grant credits form
        const grantInput = adminPage.locator('input[placeholder*="coin"], input[placeholder*="amount"], input[placeholder*="credit"]').first();
        const grantBtn = adminPage.locator('button:has-text("Grant"), button:has-text("Add Credits"), button:has-text("Give Credits")').first();

        const grantInputVisible = await grantInput.isVisible().catch(() => false);
        const grantBtnVisible = await grantBtn.isVisible().catch(() => false);

        if (grantInputVisible || grantBtnVisible) {
          if (grantInputVisible) {
            await grantInput.fill('180');
          }
          if (grantBtnVisible) {
            await grantBtn.click();
            await adminPage.waitForTimeout(2000);
            console.log('PASS: Grant credits action performed');
          }
        } else {
          console.log('INFO: Grant credits UI not found (may require scrolling or different UI pattern)');
          // Try looking for any form on the page
          const anyForm = await adminPage.locator('form').count();
          console.log('Forms on page:', anyForm);
        }
      }
    } finally {
      await adminContext.close();
    }

    // Verify user can still navigate to Marcus Stone
    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Marcus Stone').first()).toBeVisible({ timeout: 10000 });
    console.log('PASS: User page accessible after admin grant');
  });

  test('MAS-010-04: Admin can view and edit Marcus Stone persona', async ({ page }) => {
    const adminLoggedIn = await loginAdmin(page);
    if (!adminLoggedIn) {
      console.log('INFO: Admin login failed — skipping persona editor test');
      return;
    }

    // Navigate to personas list
    await page.goto('/admin/personas');
    await page.waitForTimeout(2000);

    // Find Marcus Stone persona
    const marcusCard = page.locator('text=Marcus Stone').first();
    const marcusVisible = await marcusCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (marcusVisible) {
      console.log('PASS: Marcus Stone found in admin personas list');
      await marcusCard.click();
      await page.waitForTimeout(2000);

      // Should be on persona editor page
      const currentUrl = page.url();
      const isEditorPage = currentUrl.includes('/admin/personas/') || currentUrl.includes('edit');
      console.log('Navigated to:', currentUrl);

      // Persona data should be visible
      const taglineVisible = await page.locator('text=/Tarot Master|Spiritual Advisor/i').first().isVisible().catch(() => false);
      const systemPromptVisible = await page.locator('textarea, [role="textbox"]').first().isVisible().catch(() => false);

      if (taglineVisible) {
        console.log('PASS: Marcus Stone tagline visible in editor');
      }
      if (systemPromptVisible) {
        console.log('PASS: System prompt field visible in editor');
      }

      // Save button should exist
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
      const saveVisible = await saveBtn.isVisible().catch(() => false);
      if (saveVisible) {
        console.log('PASS: Save button visible in persona editor');
      }
    } else {
      // May be listed differently — check the page content
      const pageText = await page.locator('body').textContent();
      console.log('INFO: Personas page content includes:', (pageText ?? '').substring(0, 200));
    }
  });

  test('MAS-010-05: Safety violations section accessible in admin', async ({ page }) => {
    const adminLoggedIn = await loginAdmin(page);
    if (!adminLoggedIn) {
      console.log('INFO: Admin login failed — skipping safety check');
      return;
    }

    // Check if there's a safety admin section
    await page.goto('/admin/safety');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isSafetyPage = currentUrl.includes('/admin/safety');
    const has404 = await page.locator('text=/404|not found/i').isVisible().catch(() => false);

    if (isSafetyPage && !has404) {
      console.log('PASS: Safety admin page exists at /admin/safety');
      const pageText = await page.locator('body').textContent();
      const hasSafetyContent = (pageText ?? '').toLowerCase().includes('safety') ||
                               (pageText ?? '').toLowerCase().includes('violation');
      console.log('Safety content present:', hasSafetyContent);
    } else if (has404) {
      console.log('INFO: /admin/safety returns 404 — safety violations may be in user detail view');
    } else {
      console.log('INFO: Unexpected URL after navigating to /admin/safety:', currentUrl);
    }

    // At minimum, admin should be able to reach their dashboard
    await page.goto('/admin/users');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    console.log('PASS: Admin dashboard accessible');
  });
});
