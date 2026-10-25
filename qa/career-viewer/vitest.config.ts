import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['qa/career-viewer/generate-fixtures.test.ts'], environment: 'node' } })
