/** Synthetic local-only component QA; never reads or writes a career save. */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1]
for (const key of ['url', 'module', 'out']) if (!args[key]) throw Error(`Missing --${key}`)
const { chromium } = createRequire(import.meta.url)(args.module)
fs.mkdirSync(args.out, { recursive: true })
const report = { scope: 'Local synthetic component tests, no career saves; Chromium is not real iOS WeChat.', results: [] }
let browser
async function mount(page, id) {
  await page.evaluate(async id => {
    const reactModule = await import('/node_modules/.vite/deps/react.js')
    const React = reactModule.default ?? reactModule
    const clientModule = await import('/node_modules/.vite/deps/react-dom_client.js')
    const createRoot = clientModule.createRoot ?? clientModule.default?.createRoot
    if (typeof createRoot !== 'function' || typeof React.createElement !== 'function') throw Error('React QA module exports unavailable')
    const { SceneIllustration } = await import('/src/components/SceneIllustration.tsx')
    const { SCENE_ASSETS } = await import('/src/ui/sceneIllustrations.ts')
    if (!window.__sceneQaRoot) {
      document.getElementById('root').style.display = 'none'
      const host = document.createElement('div'); host.id = 'scene-qa'; host.style.width = '375px'; document.body.append(host)
      window.__sceneQaRoot = createRoot(host)
    }
    window.__sceneQaRoot.render(React.createElement(React.Fragment, null,
      id ? React.createElement(SceneIllustration, { illustration: SCENE_ASSETS[id] }) : null,
      React.createElement('button', { id: 'scene-choice', onClick: () => { window.__choiceClicks = (window.__choiceClicks || 0) + 1 } }, '选择')))
  }, id)
}
const assert = (condition, message) => { if (!condition) throw Error(message) }
const test = async (name, fn) => { try { await fn(); report.results.push({ name, passed: true }) } catch (error) { report.results.push({ name, passed: false, error: String(error) }) } }
try {
  browser = await chromium.launch({ headless: true, ...(args.browser ? { executablePath: args.browser } : {}), args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const pending = new Map()
  await page.route('**/assets/scenes/**', route => { pending.set(new URL(route.request().url()).pathname, route) })
  await page.goto(args.url)
  assert(pending.size === 0, 'Startup fetched full scene images')
  const fulfill = async id => {
    const pathname = `/assets/scenes/v3.1.5/${id.toLowerCase()}.webp`
    await page.waitForFunction(() => true)
    const deadline = Date.now() + 5000
    while (!pending.has(pathname) && Date.now() < deadline) await new Promise(r => setTimeout(r, 20))
    const route = pending.get(pathname); if (!route) throw Error(`No pending route: ${pathname}`)
    pending.delete(pathname)
    await route.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(path.join(process.cwd(), 'public', pathname)) })
  }
  await test('slow request keeps same-scene preview and choices usable, then accepts late full image', async () => {
    await mount(page, 'M-04')
    await page.locator('[data-scene-loading="loading"]').waitFor()
    const before = await page.locator('.scene-illustration').boundingBox()
    await page.waitForTimeout(3200)
    assert(await page.locator('[data-scene-loading="loading"]').count() === 1, 'Slow image prematurely discarded')
    const bg = await page.locator('.scene-illustration').evaluate(e => getComputedStyle(e).backgroundImage)
    assert(bg.includes('data:image/webp;base64,'), 'No inline preview while slow')
    await page.locator('#scene-choice').click()
    assert(await page.evaluate(() => window.__choiceClicks) === 1, 'Image blocks choices')
    await page.screenshot({ path: path.join(args.out, 'slow-preview.png') })
    await fulfill('M-04')
    await page.locator('[data-scene-loading="ready"]').waitFor()
    const after = await page.locator('.scene-illustration').boundingBox()
    assert(Math.abs(before.height - after.height) < 1, 'Layout shifted on load')
    await page.waitForTimeout(250)
    await page.screenshot({ path: path.join(args.out, 'full-image.png') })
  })
  await test('rapid A to B switch ignores late A completion', async () => {
    await mount(page, 'M-01'); await page.locator('[data-scene-illustration="M-01"]').waitFor()
    await mount(page, 'M-02'); await page.locator('[data-scene-illustration="M-02"]').waitFor()
    await fulfill('M-01')
    assert(await page.locator('[data-scene-illustration="M-02"][data-scene-loading="loading"]').count() === 1, 'Stale A marked B ready')
    await fulfill('M-02'); await page.locator('[data-scene-illustration="M-02"][data-scene-loading="ready"]').waitFor()
  })
  await test('failed full image does not block choice and can retry after remount', async () => {
    await mount(page, 'M-03'); await page.locator('[data-scene-illustration="M-03"]').waitFor()
    const before = await page.locator('.scene-illustration').boundingBox()
    const deadline = Date.now() + 5000
    while (!pending.has('/assets/scenes/v3.1.5/m-03.webp') && Date.now() < deadline) await page.waitForTimeout(20)
    assert(pending.has('/assets/scenes/v3.1.5/m-03.webp'), 'Failure case request missing')
    await pending.get('/assets/scenes/v3.1.5/m-03.webp').abort('failed'); pending.delete('/assets/scenes/v3.1.5/m-03.webp')
    await page.locator('[data-scene-loading="failed"]').waitFor()
    const after = await page.locator('.scene-illustration').boundingBox()
    assert(Math.abs(before.height - after.height) < 1, 'Failed image changed reserved layout')
    assert((await page.locator('.scene-illustration').evaluate(e => getComputedStyle(e).backgroundImage)).includes('data:image/webp;base64,'), 'Failure lost preview')
    await page.locator('#scene-choice').click()
    assert(await page.evaluate(() => window.__choiceClicks) === 2, 'Failure blocks choice')
    await mount(page, null); await page.locator('.scene-illustration').waitFor({ state: 'detached' })
    await mount(page, 'M-03'); await fulfill('M-03'); await page.locator('[data-scene-loading="ready"]').waitFor()
  })
  await context.close()
  const cachedContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const cachedPage = await cachedContext.newPage()
  await cachedPage.goto(args.url)
  await test('cached image survives leave and return with no blank final state', async () => {
    await mount(cachedPage, 'M-04'); await cachedPage.locator('[data-scene-loading="ready"]').waitFor()
    await mount(cachedPage, null); await cachedPage.locator('.scene-illustration').waitFor({ state: 'detached' })
    await mount(cachedPage, 'M-04'); await cachedPage.locator('[data-scene-loading="ready"]').waitFor()
    assert(await cachedPage.locator('.scene-illustration img').evaluate(e => e.complete && e.naturalWidth > 0), 'Cached full image not displayed')
  })
  await cachedContext.close()
} catch (error) {
  report.results.push({ name: 'browser runner', passed: false, error: String(error) })
} finally {
  if (browser) await browser.close()
  fs.writeFileSync(path.join(args.out, 'report.json'), JSON.stringify(report, null, 2))
}
console.log(JSON.stringify(report, null, 2))
if (report.results.some(result => !result.passed)) process.exitCode = 1
