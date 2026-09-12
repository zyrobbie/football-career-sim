import { defineConfig } from 'vitest/config'
export default defineConfig({test:{environment:'node',include:['docs/evidence/PSU-20260912/S2/*.runner.ts'],testTimeout:120000}})
