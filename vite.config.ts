/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { twilioInboxPlugin } from './vite.twilioPlugin.ts'

export default defineConfig(({ mode }) => {
  // Expose Twilio env to the Vite Node server (never to the client bundle).
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_NUMBER',
  ] as const) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key]
    }
  }

  return {
    plugins: [react(), twilioInboxPlugin()],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    },
  }
})
