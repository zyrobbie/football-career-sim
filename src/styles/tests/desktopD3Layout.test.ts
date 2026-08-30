import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const desktopCss = readFileSync(new URL('../desktop.css', import.meta.url), 'utf8')
const mainCss = readFileSync(new URL('../main.css', import.meta.url), 'utf8')

const d3Selectors = [
  '.career-report',
  '.report-grid',
  '.report-footer',
  '.contract-stage',
  '.contract-sheet',
  '.contract-counter-grid',
  '.contract-complete',
  '.transfer-window',
  '.transfer-offer-grid',
  '.transfer-arrival',
  '.transfer-complete',
  '.demo-complete--hub',
]

describe('PC-D3 desktop report, contract, transfer and completion layer', () => {
  it('retains the approved D3 production selectors after later desktop phases are added', () => {
    expect(desktopCss).toContain('/* PC-D3: report, contract, transfer and completion pages only. */')
    for (const selector of d3Selectors) expect(desktopCss).toContain(selector)
  })

  it('keeps readable desktop report, contract and transfer information without clipping or local scrolling', () => {
    expect(desktopCss).toContain('.report-grid {\n    grid-template-columns: minmax(0, 1.62fr) minmax(320px, 0.98fr);')
    expect(desktopCss).toContain('.season-honors-report__awards {\n    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));')
    expect(desktopCss).toContain('.contract-sheet dd {\n    overflow: visible;\n    text-overflow: clip;\n    white-space: normal;')
    expect(desktopCss).toContain('.transfer-offer-grid > button > small,\n  .transfer-offer-grid > button > em {\n    overflow: visible;\n    text-overflow: clip;\n    white-space: normal;')
    expect(desktopCss).not.toMatch(/overflow(?:-x|-y)?:\s*(auto|scroll|hidden)/)
    expect(desktopCss).not.toMatch(/text-overflow:\s*ellipsis/)
    expect(desktopCss).not.toMatch(/transform:\s*scale|\bzoom\s*:/)
    expect(desktopCss).not.toMatch(/position:\s*(?:fixed|sticky)/)
  })

  it('keeps all D3 effective information at 12px or above and leaves mobile rules untouched', () => {
    expect(desktopCss).not.toMatch(/font-size:\s*(?:9|10|11)px/)
    expect(desktopCss).not.toContain('@media (max-width:')
    expect(desktopCss).not.toMatch(/transition:\s*all/)
  })

  it('keeps every mobile half-year report information region readable without clipping', () => {
    const r4 = mainCss
      .split('/* PC-QA-R4 final cascade: report copy follows the reading rules after all legacy compact rules. */')
      .at(-1)
    expect(r4).toBeDefined()
    expect(r4).toContain('.career-report .report-side,')
    expect(r4).toContain('.career-report .report-footer ul { display: block;')
    expect(r4).toContain('.career-report .report-footer .event-summary { display: block;')
    expect(r4).toContain('.career-report .report-side__finance,')
    expect(r4).toMatch(/font-size:\s*12px;\s*line-height:\s*1\.35/)
    expect(r4).not.toMatch(/(?:font-size:\s*(?:7|8|9|10|11)px|text-overflow:\s*ellipsis|overflow:\s*hidden|white-space:\s*nowrap|-webkit-line-clamp:\s*[1-9]|display:\s*none|overflow(?:-x|-y)?:\s*(?:auto|scroll))/)
  })

  it('keeps desktop report event and contract information in the career-report scope', () => {
    const r5 = desktopCss
      .split('/* PC-QA-R5: report information stays readable; long reports grow as a page. */')
      .at(-1)
      ?.split('  .contract-stage .career-panel-lead,')[0]
    expect(r5).toBeDefined()
    expect(r5).toContain('.career-report .special-event-result strong,')
    expect(r5).toContain('.career-report .consequence-result p,')
    expect(r5).toContain('.career-report .contract-window-report dt,')
    expect(r5).toContain('.career-report .contract-window-report dd,')
    expect(r5).toMatch(/font-size:\s*12px;\s*line-height:\s*1\.35/)
    expect(r5).toContain('overflow: visible;')
    expect(r5).toContain('text-overflow: clip;')
    expect(r5).toContain('white-space: normal;')
    expect(r5).not.toMatch(/(?:font-size:\s*(?:7|8|9|10|11)px|text-overflow:\s*ellipsis|overflow:\s*hidden|white-space:\s*nowrap|-webkit-line-clamp:\s*[1-9]|display:\s*none|overflow(?:-x|-y)?:\s*(?:auto|scroll))/)
  })
})
