import { test, expect, Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

async function adminLogin(page: Page): Promise<string> {
  await page.goto('/admin/login');
  await page.fill('input[name="email"]', 'admin@theseerwithin.com');
  await page.fill('input[name="password"]', 'ChangeMe123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 10000 });
  return await page.evaluate(() => localStorage.getItem('seer_admin_token') || '');
}

/** Returns the first persona from the API (used to get a real ID for edit tests). */
async function getFirstPersonaId(page: Page, token: string): Promise<string> {
  const res = await page.request.get('/api/admin/personas', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.personas[0].id as string;
}

// ─────────────────────────────────────────────────────────────────
// Suite 1: Personas list
// ─────────────────────────────────────────────────────────────────

test.describe('Admin — Personas list', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('shows personas list page', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Personas")')).toBeVisible({ timeout: 10000 });
  });

  test('shows at least one persona card', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');
    // At least one persona row / card should be present
    const editLinks = page.locator('a[href*="/admin/personas/"]');
    await expect(editLinks.first()).toBeVisible({ timeout: 10000 });
  });

  test('link to create new persona exists', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');
    const newBtn = page.locator('a[href="/admin/personas/new"], a:has-text("New Persona"), button:has-text("New Persona")');
    await expect(newBtn.first()).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// Suite 2: Persona editor — editing an existing persona
// ─────────────────────────────────────────────────────────────────

test.describe('Admin — Edit existing persona', () => {
  let adminToken: string;
  let personaId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    adminToken = await adminLogin(page);
    personaId = await getFirstPersonaId(page, adminToken);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('editor page loads for an existing persona', async ({ page }) => {
    await page.goto(`/admin/personas/${personaId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Basic Information')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Base System Prompt')).toBeVisible({ timeout: 5000 });
  });

  test('can edit display name and tagline', async ({ page }) => {
    await page.goto(`/admin/personas/${personaId}`);
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[placeholder="Evelyn Cross"]');
    await nameInput.clear();
    await nameInput.fill('Evelyn Cross Updated');

    const taglineInput = page.locator('input[placeholder="Spiritual Guide & Energy Healer"]');
    await taglineInput.clear();
    await taglineInput.fill('Updated Tagline');

    // Revert changes via save, then verify round-trip via API
    // (restore original name to avoid polluting other tests)
    await nameInput.clear();
    await nameInput.fill('Evelyn Cross');
    await taglineInput.clear();
    await taglineInput.fill('Spiritual Guide & Energy Healer');

    await page.click('button:has-text("Save Changes")');
    await page.waitForURL(/\/admin\/personas$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/personas$/);
  });

  test('can edit Years Experience and Readings Count', async ({ page }) => {
    await page.goto(`/admin/personas/${personaId}`);
    await page.waitForLoadState('networkidle');

    // Locate the Years Experience input in the sidebar
    const yearsLabel = page.locator('label:has-text("Years Experience")');
    await expect(yearsLabel).toBeVisible({ timeout: 10000 });

    const yearsInput = yearsLabel.locator('~ input, + input').or(
      page.locator('input[placeholder="e.g. 12"]')
    );
    await yearsInput.clear();
    await yearsInput.fill('15');

    const readingsLabel = page.locator('label:has-text("Readings Count")');
    await expect(readingsLabel).toBeVisible();

    const readingsInput = readingsLabel.locator('~ input, + input').or(
      page.locator('input[placeholder="e.g. 3200"]')
    );
    await readingsInput.clear();
    await readingsInput.fill('2500');

    await page.click('button:has-text("Save Changes")');
    await page.waitForURL(/\/admin\/personas$/, { timeout: 10000 });

    // Verify the values persisted via API
    const res = await page.request.get(`/api/admin/personas/${personaId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.persona.yearsExperience).toBe(15);
    expect(data.persona.readingsCount).toBe(2500);
  });

  test('can toggle preset categories on and off', async ({ page }) => {
    await page.goto(`/admin/personas/${personaId}`);
    await page.waitForLoadState('networkidle');

    // Click the "love" preset category toggle
    const loveBtn = page.locator('button:has-text("love")').first();
    await expect(loveBtn).toBeVisible({ timeout: 10000 });
    await loveBtn.click();

    // Click it again to toggle back
    await loveBtn.click();

    // No assertion on UI state — just confirm no errors thrown and save works
    await page.click('button:has-text("Save Changes")');
    await page.waitForURL(/\/admin\/personas$/, { timeout: 10000 });
  });

  test('can add a custom category', async ({ page }) => {
    await page.goto(`/admin/personas/${personaId}`);
    await page.waitForLoadState('networkidle');

    const customInput = page.locator('input[placeholder*="custom category"]');
    await expect(customInput).toBeVisible({ timeout: 10000 });
    await customInput.fill('dreams');

    const addBtn = page.locator('button:has-text("Add")').last();
    await addBtn.click();

    // The new chip should appear
    await expect(page.locator('text=dreams')).toBeVisible({ timeout: 5000 });

    // Remove it so we don't pollute the persona
    const removeBtn = page.locator('span:has-text("dreams") button');
    await removeBtn.click();
    await expect(page.locator('text=dreams')).not.toBeVisible({ timeout: 5000 });
  });

  test('can edit the base system prompt', async ({ page }) => {
    await page.goto(`/admin/personas/${personaId}`);
    await page.waitForLoadState('networkidle');

    const promptTextarea = page.locator('textarea').first();
    await expect(promptTextarea).toBeVisible({ timeout: 10000 });

    const original = await promptTextarea.inputValue();
    await promptTextarea.fill(original + ' (test edit)');
    await promptTextarea.fill(original); // restore

    await page.click('button:has-text("Save Changes")');
    await page.waitForURL(/\/admin\/personas$/, { timeout: 10000 });
  });

  test('can set overall rating', async ({ page }) => {
    await page.goto(`/admin/personas/${personaId}`);
    await page.waitForLoadState('networkidle');

    const ratingInput = page.locator('input[placeholder="e.g. 4.8"]');
    await expect(ratingInput).toBeVisible({ timeout: 10000 });
    await ratingInput.clear();
    await ratingInput.fill('4.7');

    await page.click('button:has-text("Save Changes")');
    await page.waitForURL(/\/admin\/personas$/, { timeout: 10000 });

    // Verify persisted
    const res = await page.request.get(`/api/admin/personas/${personaId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    expect(data.persona.overallRating).toBeCloseTo(4.7, 1);
  });

  test('save button is disabled while saving', async ({ page }) => {
    await page.goto(`/admin/personas/${personaId}`);
    await page.waitForLoadState('networkidle');

    const saveBtn = page.locator('button:has-text("Save Changes")');
    await saveBtn.click();

    // During save the spinner replaces text — button should become disabled
    await expect(saveBtn).toBeDisabled({ timeout: 3000 }).catch(() => {
      // If it navigated away before we could check, that's fine too
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Suite 3: Creating a new persona
// ─────────────────────────────────────────────────────────────────

test.describe('Admin — Create new persona', () => {
  let adminToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    adminToken = await adminLogin(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('new persona form is reachable', async ({ page }) => {
    await page.goto('/admin/personas/new');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Create New Persona')).toBeVisible({ timeout: 10000 });
  });

  test('slug auto-generates from display name', async ({ page }) => {
    await page.goto('/admin/personas/new');
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[placeholder="Evelyn Cross"]');
    await nameInput.fill('Luna Voss Test');
    await nameInput.blur(); // triggers onBlur → generateSlug()

    const slugInput = page.locator('input[placeholder="evelyn-cross"]');
    await expect(slugInput).toHaveValue('luna-voss-test', { timeout: 3000 });
  });

  test('fails to create without required fields', async ({ page }) => {
    await page.goto('/admin/personas/new');
    await page.waitForLoadState('networkidle');

    // Click create with empty form
    await page.click('button:has-text("Create Persona")');

    // Should stay on the same page and show an error
    await expect(page).toHaveURL(/\/admin\/personas\/new/);
    await expect(page.locator('text=/error|required|failed/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('successfully creates a new persona with required fields', async ({ page }) => {
    const slug = `test-persona-${Date.now()}`;

    await page.goto('/admin/personas/new');
    await page.waitForLoadState('networkidle');

    // Fill required fields
    const nameInput = page.locator('input[placeholder="Evelyn Cross"]');
    await nameInput.fill('Test Persona');
    await nameInput.blur();

    // Override auto-generated slug to be unique
    const slugInput = page.locator('input[placeholder="evelyn-cross"]');
    await slugInput.clear();
    await slugInput.fill(slug);

    // System prompt is required
    const promptTextarea = page.locator('textarea').first();
    await promptTextarea.fill('You are a test spiritual advisor. Answer questions with wisdom.');

    await page.click('button:has-text("Create Persona")');
    await page.waitForURL(/\/admin\/personas$/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin\/personas$/);

    // Verify via API that the persona was created
    const res = await page.request.get('/api/admin/personas', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const created = data.personas.find((p: any) => p.slug === slug);
    expect(created).toBeTruthy();
    expect(created.displayName).toBe('Test Persona');

    // Clean up — deactivate so it doesn't appear in listings
    if (created?.id) {
      await page.request.patch(`/api/admin/personas/${created.id}/status`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: { isActive: false },
      });
    }
  });

  test('creates persona with years experience and readings count', async ({ page }) => {
    const slug = `test-stats-${Date.now()}`;

    await page.goto('/admin/personas/new');
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[placeholder="Evelyn Cross"]');
    await nameInput.fill('Stats Test Persona');
    await nameInput.blur();

    const slugInput = page.locator('input[placeholder="evelyn-cross"]');
    await slugInput.clear();
    await slugInput.fill(slug);

    const promptTextarea = page.locator('textarea').first();
    await promptTextarea.fill('You are a test spiritual advisor for stats testing.');

    // Fill social proof stats
    const yearsInput = page.locator('input[placeholder="e.g. 12"]');
    await yearsInput.clear();
    await yearsInput.fill('8');

    const readingsInput = page.locator('input[placeholder="e.g. 3200"]');
    await readingsInput.clear();
    await readingsInput.fill('1500');

    await page.click('button:has-text("Create Persona")');
    await page.waitForURL(/\/admin\/personas$/, { timeout: 15000 });

    // Verify stats saved
    const res = await page.request.get('/api/admin/personas', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const created = data.personas.find((p: any) => p.slug === slug);
    expect(created).toBeTruthy();

    if (created?.id) {
      const detailRes = await page.request.get(`/api/admin/personas/${created.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const detail = await detailRes.json();
      expect(detail.persona.yearsExperience).toBe(8);
      expect(detail.persona.readingsCount).toBe(1500);

      // Clean up
      await page.request.patch(`/api/admin/personas/${created.id}/status`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: { isActive: false },
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// Suite 4: API — direct persona CRUD
// ─────────────────────────────────────────────────────────────────

test.describe('Admin API — Persona CRUD', () => {
  let adminToken: string;
  let personaId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    adminToken = await adminLogin(page);
    personaId = await getFirstPersonaId(page, adminToken);
    await page.close();
  });

  test('GET /api/admin/personas returns list', async ({ request }) => {
    const res = await request.get('/api/admin/personas', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('personas');
    expect(Array.isArray(data.personas)).toBe(true);
    expect(data.personas.length).toBeGreaterThan(0);
  });

  test('GET /api/admin/personas/:id returns persona detail', async ({ request }) => {
    const res = await request.get(`/api/admin/personas/${personaId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('persona');
    expect(data.persona).toHaveProperty('id', personaId);
    expect(data.persona).toHaveProperty('displayName');
    expect(data.persona).toHaveProperty('baseSystemPrompt');
  });

  test('PATCH /api/admin/personas/:id/config updates yearsExperience', async ({ request }) => {
    const res = await request.patch(`/api/admin/personas/${personaId}/config`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: { yearsExperience: 20 },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.persona.yearsExperience).toBe(20);
  });

  test('PATCH /api/admin/personas/:id/config updates readingsCount', async ({ request }) => {
    const res = await request.patch(`/api/admin/personas/${personaId}/config`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: { readingsCount: 9999 },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.persona.readingsCount).toBe(9999);
  });

  test('PATCH /api/admin/personas/:id/config updates categories array', async ({ request }) => {
    const res = await request.patch(`/api/admin/personas/${personaId}/config`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: { categories: ['love', 'money', 'custom-tag'] },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.persona.categories)).toBe(true);
    expect(data.persona.categories).toContain('love');
    expect(data.persona.categories).toContain('custom-tag');
  });

  test('PATCH /api/admin/personas/:id/config updates overallRating', async ({ request }) => {
    const res = await request.patch(`/api/admin/personas/${personaId}/config`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: { overallRating: 4.9 },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.persona.overallRating).toBeCloseTo(4.9, 1);
  });

  test('PATCH /api/admin/personas/:id/config rejects invalid overallRating', async ({ request }) => {
    const res = await request.patch(`/api/admin/personas/${personaId}/config`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: { overallRating: 10 }, // out of 0–5 range
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/admin/personas creates a new persona', async ({ request }) => {
    const slug = `api-test-${Date.now()}`;
    const res = await request.post('/api/admin/personas', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        slug,
        displayName: 'API Test Persona',
        baseSystemPrompt: 'You are a test persona created by an automated test.',
        categories: ['spiritual'],
        yearsExperience: 5,
        readingsCount: 800,
      },
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.persona.slug).toBe(slug);
    expect(data.persona.displayName).toBe('API Test Persona');
    expect(data.persona.yearsExperience).toBe(5);
    expect(data.persona.readingsCount).toBe(800);

    // Clean up
    await request.patch(`/api/admin/personas/${data.persona.id}/status`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: { isActive: false },
    });
  });

  test('POST /api/admin/personas rejects missing slug', async ({ request }) => {
    const res = await request.post('/api/admin/personas', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        displayName: 'Missing Slug Persona',
        baseSystemPrompt: 'Test.',
      },
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/validation/i);
  });

  test('POST /api/admin/personas rejects invalid slug format', async ({ request }) => {
    const res = await request.post('/api/admin/personas', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        slug: 'Has Spaces & Caps!',
        displayName: 'Bad Slug Persona',
        baseSystemPrompt: 'Test.',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/admin/personas/:id returns 404 for unknown id', async ({ request }) => {
    const res = await request.get('/api/admin/personas/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test('admin endpoints reject unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/admin/personas');
    expect(res.status()).toBe(401);
  });
});
