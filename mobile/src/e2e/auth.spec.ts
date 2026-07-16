import { test, expect } from '@playwright/test';

const TEST_EMAIL = `test-${Date.now()}@yeda.com`;
const TEST_PASSWORD = 'testpass123';

test.describe('Auth Flow', () => {
  test('signs in as admin', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Should see the sign-in screen with title and button
    await expect(page.getByText('Welcome back to Yeda').first()).toBeVisible();

    // Fill credentials — use first() since only one set of inputs is visible
    await page.getByPlaceholder('Email').first().fill('admin@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');

    // Click Sign In button (last match since title also says "Sign In")
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    // Should see the home screen with admin menu
    await expect(page.getByText('Welcome').last()).toBeVisible();
    await expect(page.getByText('Pending Approvals').last()).toBeVisible();
  });

  test('signs in as teacher', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    await expect(page.getByText('Welcome back to Yeda').first()).toBeVisible();

    await page.getByPlaceholder('Email').first().fill('teacher@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');

    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    // Should see the home screen with teacher menu
    await expect(page.getByText('Welcome').last()).toBeVisible();
    await expect(page.getByText('Pending Students').last()).toBeVisible();
  });

  test('blocks pending student from signing in', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    await expect(page.getByText('Welcome back to Yeda').first()).toBeVisible();

    await page.getByPlaceholder('Email').first().fill('student@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');

    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    // Should see the error about pending approval
    await expect(
      page.getByText('Your account is pending approval').first(),
    ).toBeVisible();
  });

  test('signs up as a new student and shows pending message', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Navigate to sign-up via the link
    await page.getByText('Create account').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Should see the sign-up screen
    await expect(page.getByText('Create Account').last()).toBeVisible();

    // Fill form.
    // After navigating from sign-in, the sign-in's inputs remain in DOM (hidden).
    // Use nth(1) for inputs that exist on both sign-in and sign-up screens.
    await page.getByPlaceholder('Full Name').first().fill('Test Student');
    await page.getByPlaceholder('Email').nth(1).fill(TEST_EMAIL);
    await page.getByPlaceholder('Password').nth(1).fill(TEST_PASSWORD);

    // Select Student role (default is student, but click to be sure)
    await page.getByText('Student').first().click({ delay: 50 });

    // Click Create Account
    await page.getByText('Create Account').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    // Should see the success message about pending approval
    await expect(
      page.getByText('Account created').first(),
    ).toBeVisible();
  });

  test('signs up as a new teacher and shows pending message', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Navigate to sign-up
    await page.getByText('Create account').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Should see the sign-up screen
    await expect(page.getByText('Create Account').last()).toBeVisible();

    // Fill form.
    // After navigating from sign-in, the sign-in's inputs remain in DOM (hidden).
    // Use nth(1) for inputs that exist on both sign-in and sign-up screens.
    await page.getByPlaceholder('Full Name').first().fill('Test Teacher');
    await page
      .getByPlaceholder('Email')
      .nth(1)
      .fill(`teacher-${Date.now()}@yeda.com`);
    await page.getByPlaceholder('Password').nth(1).fill(TEST_PASSWORD);

    // Select Teacher role
    await page.getByText('Teacher').last().click({ delay: 50 });

    // Click Create Account
    await page.getByText('Create Account').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    // Should see the success message about pending approval
    await expect(
      page.getByText('Account created').first(),
    ).toBeVisible();
  });

  test('admin can approve a pending student', async ({ page }) => {
    // First, sign up a new student via API
    const newStudentEmail = `approve-${Date.now()}@yeda.com`;
    const resp = await page.request.post(
      'http://127.0.0.1:54331/auth/v1/signup',
      {
        headers: {
          apikey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
          'Content-Type': 'application/json',
        },
        data: {
          email: newStudentEmail,
          password: TEST_PASSWORD,
          data: { display_name: 'Approvable Student', role: 'student' },
        },
      },
    );
    expect(resp.ok()).toBeTruthy();
    const signupBody = await resp.json();
    const newUserId: string = signupBody.user.id;

    // Sign in as admin
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill('admin@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    // Navigate to approvals
    await page.getByText('Pending Approvals').last().click({ delay: 50 });
    await page.waitForTimeout(1000);

    // Find the specific user by their UUID (shown as the email line in the card)
    // The UUID is displayed with monospace font as item.id
    await expect(page.getByText(newUserId).first()).toBeVisible();

    // Click Approve (will be the card for the new user since we navigated to it)
    // Use the card containing the user's UUID, then find Approve within it
    const card = page.getByText(newUserId).first().locator('..').locator('..');
    await card.getByText('Approve').click({ delay: 50 });
    await page.waitForTimeout(1000);

    // The approved user's UUID should no longer be in the list
    await expect(page.getByText(newUserId).first()).not.toBeVisible();
  });

  test('signs out successfully', async ({ page }) => {
    // Sign in as admin first
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Email').first().fill('admin@yeda.com');
    await page.getByPlaceholder('Password').first().fill('password123');
    await page.getByText('Sign In').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    // Should be on home screen
    await expect(page.getByText('Welcome').last()).toBeVisible();

    // Click Sign Out
    await page.getByText('Sign Out').last().click({ delay: 50 });
    await page.waitForTimeout(2000);

    // Should be back on sign-in screen
    await expect(page.getByText('Sign In').last()).toBeVisible();
  });
});
