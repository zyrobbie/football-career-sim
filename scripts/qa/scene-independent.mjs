/** Independent A-B-A event/race and failure-layout checks. No saved careers touched. */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1]
for (const key of ['url', 'module', 'out']) if (!args[key]) throw Error(`Missing --${key}`)
const { chromium } = createRequire(import.meta.url)(args.module)
fs.mkdirSync(args.out, { recursive: true })
const result = { scope: 'Synthetic component-only Chromium QA, not physical iOS.', passed: false }
let browser
try {
  browser = await chromium.launch({ headless: true, ...(args.browser ? { executablePath: args.browser } : {}), args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.setDefaultTimeout(10000)
  let requests = 0
  await page.route('**/assets/scenes/**', () => { requests++ })
  await page.goto(args.url)
  const mount = async id => {
    await page.evaluate(async id => {
      const React = await import('/node_modules/.vite/deps/react.js')
      const { createRoot } = await import('/node_modules/.vite/deps/react-dom_client.js')
      const { SceneIllustration } = await import('/src/components/SceneIllustration.tsx')
      const { SCENE_ASSETS } = await import('/src/ui/sceneIllustrations.ts')
      if (!window.qroot) {
        document.getElementById('root').style.display = 'none'
        const host = document.createElement('div'); host.style.width = '375px'; document.body.append(host)
        window.qroot = createRoot(host)
      }
      window.qroot.render(React.createElement(SceneIllustration, { illustration: SCENE_ASSETS[id] }))
    }, id)
    await page.locator(`[data-scene-illustration="${id}"]`).waitFor()
  }
  if (requests) throw Error('Startup loaded scene')
  await mount('M-01')
  const old = await page.locator('.scene-illustration img').elementHandle()
  await mount('M-02')
  await old.evaluate(e => e.dispatchEvent(new Event('error')))
  if (await page.locator('.scene-illustration').getAttribute('data-scene-loading') !== 'loading') throw Error('Stale error affected B')
  await mount('M-01')
  await old.evaluate(e => { e.dispatchEvent(new Event('load')); e.dispatchEvent(new Event('error')) })
  if (await page.locator('.scene-illustration').getAttribute('data-scene-loading') !== 'loading') throw Error('ABA stale events affected A')
  await mount('E-01')
  const before = await page.locator('.scene-illustration').boundingBox()
  if (Math.abs(before.width / before.height - 3) > 0.01) throw Error('Event ratio incorrect')
  await page.locator('.scene-illustration img').dispatchEvent('error')
  await page.locator('[data-scene-loading="failed"]').waitFor()
  const after = await page.locator('.scene-illustration').boundingBox()
  if (Math.abs(before.height - after.height) > 0.1) throw Error('Failure layout shift')
  await page.screenshot({ path: path.join(args.out, 'event-failure.png') })
  Object.assign(result, { passed: true, startupNoFullImages: true, staleError: true, ABAStaleLoadError: true, eventRatio3: true, failureLayoutStable: true, requests })
} catch (error) { result.error = String(error) }
finally {
  if (browser) await browser.close()
  fs.writeFileSync(path.join(args.out, 'independent-report.json'), JSON.stringify(result, null, 2))
}
console.log(JSON.stringify(result, null, 2))
if (!result.passed) process.exitCode = 1
