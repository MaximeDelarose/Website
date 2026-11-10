import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const exe = process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'off', permissions: ['microphone'] },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium', launchOptions: { executablePath: exe, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, defaultBrowserType: 'chromium' } },
  ],
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 60_000 },
})
