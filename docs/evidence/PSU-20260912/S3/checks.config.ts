import { defineConfig } from 'vitest/config'
export default defineConfig({test:{include:['docs/evidence/PSU-20260912/S3/*.runner.ts'],environment:'node',testTimeout:120000}})
