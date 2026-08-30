import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const desktopCss = readFileSync(new URL('../desktop.css', import.meta.url), 'utf8')
const mainCss = readFileSync(new URL('../main.css', import.meta.url), 'utf8')

const exercisedD2Selectors = [
  '.home-screen',
  '.home-actions',
  '.home-principles',
  '.setup-header',
  '.setup-paper',
  '.setup-form',
  '.position-builder',
  '.position-pitch',
  '.position-detail',
  '.reveal-layout',
  '.career-offers',
  '.offer-table',
  '.offer-column',
  '.offer-confirmation',
  '.career-decision',
  '.choice-list--arrival',
  '.choice-list--training-plan',
  '.special-event',
]

describe('PC-D2 desktop early-career layout layer', () => {
  it('retains the approved D2 surface selectors after later desktop phases are added', () => {
    for (const selector of exercisedD2Selectors) {
      expect(desktopCss).toContain(selector)
    }
  })

  it('keeps D2 production rules desktop-only and avoids prohibited layout escapes', () => {
    expect(desktopCss).toContain('/* PC-D2: home, setup and early-career decision pages only. */')
    expect(desktopCss).not.toMatch(/transform:\s*scale|\bzoom\s*:/)
    expect(desktopCss).not.toMatch(/overflow(?:-x|-y)?:\s*(auto|scroll|hidden)/)
    expect(desktopCss).not.toMatch(/\.tab|\.pagination|\.drawer|\.panel--/)
    expect(desktopCss).not.toMatch(/@media \(max-width:/)
  })

  it('uses the prescribed desktop grids for training, arrival, academy offers and event choices', () => {
    expect(desktopCss).toContain('.choice-list--training-plan {\n    grid-template-columns: repeat(3, minmax(0, 1fr));')
    expect(desktopCss).toContain('.choice-list--arrival {\n    grid-template-columns: repeat(2, minmax(0, 1fr));')
    expect(desktopCss).toContain('.career-offers .offer-table {\n    grid-template-columns: 118px repeat(3, minmax(0, 1fr));')
    expect(desktopCss).toContain('.special-event__choices button {\n    min-height: 128px;')
  })

  it('pins special-event copy to the full content columns instead of auto-placing it beside the arrow', () => {
    expect(desktopCss).toContain('.special-event__choices button > small {\n    grid-column: 2 / -1;\n    grid-row: 2;')
    expect(desktopCss).toContain('.special-event__choices button > em {\n    grid-column: 2 / -1;\n    grid-row: 3;')
    expect(desktopCss).toContain('.special-event__choices button > .special-event__odds {\n    grid-column: 2 / -1;\n    grid-row: 4;')
    expect(desktopCss).toContain('.special-event__choices button > svg {\n    grid-column: 3;\n    grid-row: 1;')
  })

  it('does not introduce effective information text below 12px in the D2 overrides', () => {
    expect(desktopCss).not.toMatch(/font-size:\s*(?:9|10|11)px/)
  })

  it('keeps mobile PlayerReveal preference metadata readable rather than ellipsizing it', () => {
    expect(mainCss).toContain('.reveal-meta div {\n    min-width: 0;\n    padding: 5px 6px;\n    border-right: 1px solid var(--line);\n    font-size: 12px;\n    line-height: 1.35;')
    expect(mainCss).toContain('.reveal-meta dt,\n  .reveal-meta dd {\n    min-width: 0;\n    overflow: visible;\n    text-overflow: clip;\n    white-space: normal;\n    overflow-wrap: normal;')
    expect(mainCss).not.toContain('.reveal-meta dt,\n  .reveal-meta dd {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;')
  })

  it('keeps the three PC-QA-R2 mobile information surfaces readable without clipping', () => {
    expect(mainCss).toContain('/* PC-QA-R2: mobile reading information must grow naturally rather than clip. */')
    expect(mainCss).toContain('.preference-editor .select-row small {\n    display: block;\n    -webkit-line-clamp: unset;')
    expect(mainCss).toContain('.career-ledger__club {\n    display: block;\n    max-width: none;\n    overflow: visible;\n    font-size: 12px;')
    expect(mainCss).toContain('.career-panel-lead {\n    display: block;\n    overflow: visible;\n    font-size: 12px;')
    expect(mainCss).toContain('.special-event .career-panel-lead {\n    font-size: 12px;\n    line-height: 1.35;')
    expect(mainCss).not.toMatch(/PC-QA-R2[\s\S]*?(?:\bzoom\s*:|transform:\s*scale|overflow-x:\s*(?:auto|scroll))/)
  })

  it('reflows the semantic nine-field CareerHub ledger into a readable mobile grid without a local scroller', () => {
    expect(mainCss).toContain('/* PC-QA-R3: keep the semantic nine-field career ledger readable on phones. */')
    expect(mainCss).toContain('.career-ledger thead tr,\n  .career-ledger tbody tr {\n    display: grid;\n    grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.7fr) minmax(0, 1.5fr);')
    expect(mainCss).toContain('.career-ledger th:nth-child(n),\n  .career-ledger td:nth-child(n) {\n    box-sizing: border-box;\n    width: auto;\n    height: auto;\n    min-height: 0;\n    min-width: 0;\n    padding: 5px 4px;\n    overflow: visible;\n    font-size: 12px;\n    line-height: 1.35;\n    text-overflow: clip;\n    white-space: normal;')
    expect(mainCss).toContain('.career-ledger__details.is-open .career-ledger__scroll {\n    max-height: none;\n    overflow: visible;')
    const r3Block = mainCss
      .split('/* PC-QA-R3: keep the semantic nine-field career ledger readable on phones. */')[1]
      ?.split('/* Read-only career history and local settings. */')[0]
    expect(r3Block).toBeDefined()
    expect(r3Block).not.toMatch(/\border\s*:/)
    expect(r3Block).not.toMatch(/overflow:\s*(?:auto|scroll|hidden)|overflow-x:\s*(?:auto|scroll|hidden)/)
    expect(r3Block).not.toMatch(/(?:\bzoom\s*:|transform:\s*scale|text-overflow:\s*ellipsis|white-space:\s*nowrap)/)
  })
})
