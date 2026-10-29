import { defineConfig } from 'vitest/config'
export default defineConfig({ esbuild: { jsx: 'automatic' }, test: { include: ['qa/visual-phase1/render.test.tsx'], environment: 'node' } })
