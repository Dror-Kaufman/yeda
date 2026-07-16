import { defineConfig } from '@playwright/test';

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
