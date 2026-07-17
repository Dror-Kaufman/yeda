import { defineConfig } from '@playwright/test';
import { execSync } from 'child_process';

// Fetch the Supabase service_role key from the running local instance
function getServiceRoleKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  try {
    const output = execSync('supabase status 2>&1', { encoding: 'utf-8' });
    const match = output.match(/sb_secret_\S+/);
    if (match) return match[0];
  } catch {
    // fall through to error
  }
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY not set and supabase status is not available. ' +
      'Set the env var or start supabase first.',
  );
}

// Expose service_role key to test files via env var
process.env.SUPABASE_SERVICE_ROLE_KEY = getServiceRoleKey();

export default defineConfig({
  testDir: './src/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
  },
  webServer: {
    command: 'npx expo start --web',
    port: 8081,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
