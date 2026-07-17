import { test, expect } from '@playwright/test';

const ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const AUTH_URL = 'http://127.0.0.1:54331';
const REST_URL = 'http://127.0.0.1:54331/rest/v1';

const MCQ_JSON = JSON.stringify([
  {
    question: 'E2E What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
    hint: 'Think about basic addition',
    explanation: '2 + 2 = 4',
  },
  {
    question: 'E2E What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
  },
]);

test.describe('MCQ Paste → Publish', () => {
  // Clean up any E2E questions created by this test
  test.afterAll(async ({ request }) => {
    const loginResp = await request.post(
      `${AUTH_URL}/auth/v1/token?grant_type=password`,
      {
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        data: { email: 'teacher@yeda.com', password: 'password123' },
      },
    );
    const body = await loginResp.json();
    const token: string = body.access_token;
    if (!token) return;

    // Delete questions created by E2E tests
    await request.delete(
      `${REST_URL}/questions?question_text=like.E2E-%`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
    );
  });

  test('teacher can paste JSON, parse, and publish MCQ bank', async ({
    page,
  }) => {
    // ── Sign in as teacher ──
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill('teacher@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Welcome').last()).toBeVisible();

    // ── Navigate to a topic via Browse Content → grade → subject → topic ──
    await page.getByText('Browse Content').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await expect(page.getByText('Select Grade').last()).toBeVisible();

    // Click "10th Grade"
    await page.getByText('10th Grade').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Click "Mathematics"
    await page.getByText('Mathematics').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Click "Quadratic Equations"
    await page.getByText('Quadratic Equations').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // ── Click "Manage Questions" ──
    await page.getByText('Manage Questions').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Verify we're on the manage-questions screen
    await expect(page.getByText('Questions —').last()).toBeVisible();

    // ── Click "+ Add MCQ Bank" ──
    await page.getByText('+ Add MCQ Bank').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await expect(page.getByText('Add MCQ Bank').last()).toBeVisible();

    // ── Paste JSON into the textarea ──
    // The textarea has a placeholder that starts with '[{"question"'
    await page
      .getByPlaceholder(/What is 2\+2/)
      .last()
      .fill(MCQ_JSON);
    await page.waitForTimeout(300);

    // ── Click "Parse JSON" ──
    await page.getByText('Parse JSON').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // ── Verify parsed questions appear ──
    await expect(page.getByText('Parsed Questions (2)').last()).toBeVisible();
    await expect(page.getByText('E2E What is 2 + 2?').last()).toBeVisible();
    await expect(
      page.getByText('E2E What is the capital of France?').last(),
    ).toBeVisible();

    // Verify options appear
    await expect(page.getByText('B) 4 ✓').last()).toBeVisible();
    await expect(page.getByText('C) Paris ✓').last()).toBeVisible();

    // Verify hint appears for the first question
    await expect(page.getByText('Hint: Think about basic addition').last()).toBeVisible();

    // ── Click "Publish" ──
    await page.getByText(/^Publish 2 Questions/).last().click({ delay: 50 });

    // Wait for navigation back to manage-questions
    await page.waitForTimeout(3000);

    // ── Verify published questions appear in the manage-questions list ──
    await expect(page.getByText('E2E What is 2 + 2?').last()).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText('E2E What is the capital of France?').last(),
    ).toBeVisible();

    // Verify the status shows as "published"
    await expect(page.getByText('published').first()).toBeVisible();
  });

  test('shows validation errors for invalid JSON', async ({ page }) => {
    // Sign in and navigate to paste screen
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill('teacher@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    await page.getByText('Browse Content').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('10th Grade').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('Mathematics').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('Quadratic Equations').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('Manage Questions').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('+ Add MCQ Bank').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Paste invalid JSON (missing required fields)
    await page
      .getByPlaceholder(/What is 2\+2/)
      .last()
      .fill(JSON.stringify([{ question: 'Incomplete', correctIndex: 0 }]));
    await page.waitForTimeout(300);

    await page.getByText('Parse JSON').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Verify validation errors are shown
    await expect(page.getByText('Validation Errors').last()).toBeVisible();
  });
});
