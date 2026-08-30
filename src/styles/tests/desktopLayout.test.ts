import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const desktopCss = readFileSync(new URL('../desktop.css', import.meta.url), 'utf8')
const mainEntry = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8')

describe('PC-D1 desktop shared layout layer', () => {
  it('loads after the base stylesheet', () => {
    expect(mainEntry.indexOf("import './styles/desktop.css'")).toBeGreaterThan(
      mainEntry.indexOf("import './styles/main.css'"),
    )
  })

  it('keeps every production rule inside an explicit desktop media query', () => {
    expect(desktopCss.indexOf('@media (min-width: 821px)')).toBeLessThan(
      desktopCss.indexOf('.app-frame {'),
    )
    expect(desktopCss).toContain('@media (min-width: 821px) and (max-height: 800px)')
    expect(desktopCss).not.toMatch(/@media \(max-width:/)
  })

  it('does not use scaling, zooming, new scrolling containers, or prohibited navigation patterns', () => {
    expect(desktopCss).not.toMatch(/transform:\s*scale|\bzoom\s*:/)
    expect(desktopCss).not.toMatch(/overflow(?:-x|-y)?:\s*(auto|scroll|hidden)/)
    expect(desktopCss).not.toMatch(/\.tab|\.pagination|\.drawer|\.panel--/)
  })

  it('raises shared effective text to at least 12px and preserves the desktop ledger without a horizontal scrollbar', () => {
    expect(desktopCss).toContain('.career-ledger__scroll {\n    margin-top: 8px;\n    overflow-x: visible;')
    expect(desktopCss).toContain('.career-ledger th {\n    height: 30px;\n    font-size: 12px;')
    expect(desktopCss).toContain('.career-ledger td {\n    font-size: 12px;')
    expect(desktopCss).toContain('.career-meter strong,\n  .career-meter em {\n    font-size: 12px;')
  })
})
