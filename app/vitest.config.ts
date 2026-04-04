import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    env: loadEnv('', process.cwd(), ''),
    fileParallelism: false,
  },
})
