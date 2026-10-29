import {defineConfig} from 'vitest/config'
export default defineConfig({test:{include:['qa/phase2-art/*.test.ts'],environment:'node'}})
