import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY not set — playwright.config.ts should have set it from supabase status',
  );
}
const AUTH_URL = 'http://127.0.0.1:54331';
const REST_URL = 'http://127.0.0.1:54331/rest/v1';

const TEST_EMAIL = `lm-student-${Date.now()}@yeda.com`;
const TEST_PASSWORD = 'password123';

test.describe('Learning Modes', () => {
  let topicId: string;
  let createdMaterialId: string | null = null;

  // ── Setup: create + approve a test student, fetch topic ID ──────

  test.beforeAll(async ({ request }) => {
    // Sign in as admin via API
    const adminLogin = await request.post(
      `${AUTH_URL}/auth/v1/token?grant_type=password`,
      {
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        data: { email: 'admin@yeda.com', password: 'password123' },
      },
    );
    const adminBody = await adminLogin.json();
    const adminToken: string = adminBody.access_token;
    const adminId: string = adminBody.user?.id;
    if (!adminToken) {
      throw new Error('Failed to get admin token');
    }

    // Fetch Quadratic Equations topic ID
    const topicsResp = await request.get(
      `${REST_URL}/topics?select=id,name&name=eq.Quadratic%20Equations`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const topics = await topicsResp.json();
    topicId = topics[0]?.id;
    if (!topicId) {
      throw new Error('Could not find Quadratic Equations topic — run seed.sql first');
    }

    // Create a study material if none exist for this topic
    const matsResp = await request.get(
      `${REST_URL}/study_materials?select=id&topic_id=eq.${topicId}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const existingMats = await matsResp.json();
    if (!existingMats || existingMats.length === 0) {
      const createResp = await request.post(
        `${REST_URL}/study_materials`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          data: {
            topic_id: topicId,
            title: 'E2E Quadratic Equations Study Guide',
            description: 'E2E test material for learning modes test.',
            google_docs_url: 'https://docs.google.com/document/d/e2e-test/edit',
            created_by: adminId,
          },
        },
      );
      if (createResp.ok()) {
        const created = await createResp.json();
        createdMaterialId = created[0]?.id ?? null;
      }
    }

    // Create a test student via signup API
    const signupResp = await request.post(
      `${AUTH_URL}/auth/v1/signup`,
      {
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        data: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          data: { display_name: 'LM Student', role: 'student' },
        },
      },
    );
    const signupBody = await signupResp.json();
    const studentId: string = signupBody.user?.id;
    if (!studentId) {
      throw new Error('Failed to create test student');
    }

    // Approve the student
    const approveResp = await request.patch(
      `${REST_URL}/profiles?id=eq.${studentId}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: { status: 'active' },
      },
    );
    expect(approveResp.ok()).toBeTruthy();
  });

  // ── Cleanup ────────────────────────────────────────────────────

  test.afterAll(async ({ request }) => {
    // Delete the E2E study material if we created one (use service_role to bypass RLS)
    if (createdMaterialId) {
      await request.delete(
        `${REST_URL}/study_materials?id=eq.${createdMaterialId}`,
        {
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        },
      );
    }

    // Clean up the test student from auth.users via direct DB access
    // (cannot be done via REST API since auth schema is not exposed)
    try {
      execSync(
        `docker exec -i supabase_db_yeda psql -U postgres -d postgres -c "DELETE FROM auth.users WHERE email = '${TEST_EMAIL}';"`,
        { timeout: 10000 },
      );
    } catch {
      // cleanup failure shouldn't fail the test suite
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // Test 1: Study Mode
  // ══════════════════════════════════════════════════════════════════

  test('Study Mode - shows materials list and opens viewer', async ({
    page,
  }) => {
    // Sign in as admin
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill('admin@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Welcome').last()).toBeVisible();

    // Navigate directly to the study page using the pre-fetched topicId
    await page.goto(`/topic/${topicId}/study`);
    await page.waitForTimeout(1500);

    // Verify study mode screen rendered
    await expect(page.getByText('Study Mode').last()).toBeVisible();
    await expect(page.getByText('Quadratic Equations').last()).toBeVisible();

    // Verify the E2E study material is listed
    await expect(
      page.getByText('E2E Quadratic Equations Study Guide').last(),
    ).toBeVisible({ timeout: 5000 });

    // Click the material to open the viewer
    await page
      .getByText('E2E Quadratic Equations Study Guide')
      .last()
      .click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Verify the viewer loaded with material title and iframe
    // Use .last() — previous screen's title remains hidden in DOM
    await expect(
      page.getByText('E2E Quadratic Equations Study Guide').last(),
    ).toBeVisible();
    const iframe = page.locator('iframe');
    await expect(iframe).toBeVisible();
    // Verify the iframe has a src attribute (the Google Docs URL)
    await expect(iframe).toHaveAttribute('src');
  });

  // ══════════════════════════════════════════════════════════════════
  // Test 2: Exercise Mode
  // ══════════════════════════════════════════════════════════════════

  test('Exercise Mode - complete question flow', async ({ page }) => {
    // Sign in as the approved test student
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').first().fill(TEST_PASSWORD);
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Welcome').last()).toBeVisible();

    // Navigate to the Quadratic Equations topic
    await page.getByText('Browse Content').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('10th Grade').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('Mathematics').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('Quadratic Equations').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Click "Exercise Mode" button
    await page.getByText('Exercise Mode').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Verify exercise intro screen — use .last() since the previous
    // screen's "Exercise Mode" button remains hidden in the DOM
    await expect(page.getByText('Exercise Mode').last()).toBeVisible();

    // Select "All questions"
    await page.getByText('All questions').last().click({ delay: 50 });
    await page.waitForTimeout(300);

    // Click "Start Exercise"
    await page.getByText('Start Exercise').click({ delay: 50 });
    await page.waitForURL(/\/exercise\/session/);
    await page.waitForTimeout(1500);

    // Derive question count from the session URL: ?count=N
    const sessionUrl = page.url();
    const questionCount = parseInt(
      new URL(sessionUrl).searchParams.get('count') || '5',
      10,
    );

    // Answer all questions
    for (let q = 0; q < questionCount; q++) {
      // Verify the question renders
      await expect(
        page.getByText(new RegExp(`Question ${q + 1} of ${questionCount}`)).last(),
      ).toBeVisible();

      // Select the first option (A)
      await page.getByText('A)').last().click({ delay: 50 });
      await page.waitForTimeout(200);

      // Verify feedback shows (Correct! or Incorrect)
      await expect(
        page.getByText(/Correct!|Incorrect/).last(),
      ).toBeVisible({ timeout: 3000 });

      // If explanation button is available, click it
      const explanationBtn = page.getByText('Show Explanation');
      if (
        await explanationBtn
          .isVisible({ timeout: 200 })
          .catch(() => false)
      ) {
        await explanationBtn.click({ delay: 50 });
        await page.waitForTimeout(200);
        await expect(page.getByText('Explanation:').last()).toBeVisible();
      }

      // Navigate to next question or finish
      if (q < questionCount - 1) {
        await page.getByText('Next Question').last().click({ delay: 50 });
        await page.waitForTimeout(500);
      } else {
        await page.getByText('Finish Exercise').last().click({ delay: 50 });
        await page.waitForTimeout(1500);
      }
    }

    // After finishing, should be back on the topic detail page
    await expect(page.getByText('Quadratic Equations').last()).toBeVisible();
  });

  // ══════════════════════════════════════════════════════════════════
  // Test 3: Exam Mode
  // ══════════════════════════════════════════════════════════════════

  test('Exam Mode - complete exam and submit', async ({ page }) => {
    // Sign in as the approved test student
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').first().fill(TEST_PASSWORD);
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Welcome').last()).toBeVisible();

    // Navigate to the Quadratic Equations topic
    await page.getByText('Browse Content').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('10th Grade').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('Mathematics').last().click({ delay: 50 });
    await page.waitForTimeout(1000);
    await page.getByText('Quadratic Equations').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Click "Exam Mode" button
    await page.getByText('Exam Mode').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Verify exam intro screen — use .last() due to stacked DOM
    await expect(page.getByText('Exam Mode').last()).toBeVisible();

    // Select "All questions"
    await page.getByText('All questions').last().click({ delay: 50 });
    await page.waitForTimeout(300);

    // Select "10 minutes" time limit
    await page.getByText('10 minutes').last().click({ delay: 50 });
    await page.waitForTimeout(300);

    // Click "Start Exam"
    await page.getByText('Start Exam').click({ delay: 50 });
    await page.waitForURL(/\/exam\/session/);
    await page.waitForTimeout(1500);

    // Derive question count from the session URL: ?count=N
    const sessionUrl = page.url();
    const questionCount = parseInt(
      new URL(sessionUrl).searchParams.get('count') || '5',
      10,
    );

    // Verify timer is visible
    await expect(page.getByText(/\d+:\d+/).last()).toBeVisible();

    // Answer all questions
    for (let q = 0; q < questionCount; q++) {
      // Verify we're on the right question
      await expect(
        page.getByText(`Question ${q + 1} of ${questionCount}`).last(),
      ).toBeVisible();

      // Select the first option (A)
      await page.getByText('A)').last().click({ delay: 50 });
      await page.waitForTimeout(300);

      // Navigate forward
      if (q < questionCount - 1) {
        await page.getByText('Next').last().click({ delay: 50 });
        await page.waitForTimeout(500);
      } else {
        // On the last question, click "Submit Exam"
        await page.getByText('Submit Exam').click({ delay: 50 });
        await page.waitForTimeout(2000);
      }
    }

    // ── Verify results screen ──

    // Title
    await expect(page.getByText('Exam Complete').last()).toBeVisible();

    // Score percentage (e.g. "67%")
    await expect(page.getByText(/\d+%/).last()).toBeVisible();

    // Score detail (e.g. "2 / 7 correct")
    await expect(page.getByText(/\/ \d+ correct/).last()).toBeVisible();

    // Review cards showing correct/incorrect labels
    await expect(page.getByText(/Question \d+/).first()).toBeVisible();
    await expect(page.getByText(/Correct|Incorrect/).first()).toBeVisible();

    // Review cards include explanation
    const explanationCount = await page.getByText('Explanation:').count();
    expect(explanationCount).toBeGreaterThan(0);

    // Back to Topic button exists
    await expect(page.getByText('Back to Topic').last()).toBeVisible();
  });
});
