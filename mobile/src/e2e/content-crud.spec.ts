import { test, expect } from '@playwright/test';

const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const AUTH_URL = 'http://127.0.0.1:54331';
const REST_URL = 'http://127.0.0.1:54331/rest/v1';

test.describe('Content CRUD', () => {
  // Clean up any grades created by tests
  test.afterAll(async ({ request }) => {
    // Sign in as admin via API
    const loginResp = await request.post(
      `${AUTH_URL}/auth/v1/token?grant_type=password`,
      {
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        data: { email: 'admin@yeda.com', password: 'password123' },
      },
    );
    const body = await loginResp.json();
    const token: string = body.access_token;
    if (!token) return;

    // Delete grades created by tests (name starts with 'E2E-Grade')
    await request.delete(
      `${REST_URL}/grades?name=like.E2E-Grade-%`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
    );
  });
  test('admin can add a grade via prompt dialog', async ({ page }) => {
    const gradeName = `E2E-Grade-${Date.now()}`;

    // Sign in as admin
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill('admin@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Welcome').last()).toBeVisible();

    // Navigate to grades via Browse Content
    await page.getByText('Browse Content').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await expect(page.getByText('Select Grade').last()).toBeVisible();

    // Click "Add Grade" — this triggers window.prompt
    // Set up the dialog handler BEFORE clicking
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByText('+ Add Grade').last().click({ delay: 50 });

    // Accept the prompt with our unique grade name
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('prompt');
    expect(dialog.message()).toContain('Add Grade');
    await dialog.accept(gradeName);
    await page.waitForTimeout(1000);

    // Verify the new grade appears in the list
    await expect(page.getByText(gradeName).last()).toBeVisible();
  });

  test('cancelling add grade prompt leaves screen unchanged', async ({
    page,
  }) => {
    // Sign in as admin
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill('admin@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);
    await page.getByText('Browse Content').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await expect(page.getByText('Select Grade').last()).toBeVisible();

    // Click Add Grade, verify prompt opens, then dismiss it
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByText('+ Add Grade').last().click({ delay: 50 });
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('prompt');
    await dialog.dismiss();
    await page.waitForTimeout(500);

    // After dismiss, still on grades screen with "Select Grade" visible
    await expect(page.getByText('Select Grade').last()).toBeVisible();
  });
});
