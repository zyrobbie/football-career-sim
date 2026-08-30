import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const desktopCss = readFileSync(new URL('../desktop.css', import.meta.url), 'utf8')
const mainCss = readFileSync(new URL('../main.css', import.meta.url), 'utf8')

describe('PC-D4 desktop read-only and retirement browser layer', () => {
  it('keeps production rules desktop-only and constrained to the approved D4 surfaces', () => {
    expect(desktopCss).toContain('/* PC-D4: read-only player, history, settings and retirement browser pages only. */')
    for (const selector of ['.player-screen', '.history-screen', '.settings-screen', '.retirement-panel', '.retirement-archive']) {
      expect(desktopCss).toContain(selector)
    }
    expect(desktopCss).not.toContain('@media (max-width:')
    expect(desktopCss).not.toMatch(/overflow(?:-x|-y)?:\s*(auto|scroll|hidden)/)
    expect(desktopCss).not.toMatch(/text-overflow:\s*ellipsis/)
    expect(desktopCss).not.toMatch(/transform:\s*scale|\bzoom\s*:/)
    expect(desktopCss).not.toMatch(/transition:\s*all/)
  })

  it('keeps season history readable and preserves natural page scrolling', () => {
    expect(desktopCss).toContain('grid-template-columns: 1.05fr 56px minmax(190px, 1.7fr) 92px 108px 52px 52px 52px 52px;')
    expect(desktopCss).toContain('.history-windows__row > strong:nth-child(3) {\n    overflow: visible;\n    text-overflow: clip;\n    white-space: normal;')
    expect(desktopCss).toContain('.history-windows__head,\n  .history-windows__row,\n  .history-clubs__spells span,\n  .history-honors__group li small {\n    font-size: 12px;')
  })

  it('does not target the retirement export sheet or its geometry boundary', () => {
    expect(desktopCss).not.toContain('.retirement-export-sheet')
    expect(desktopCss).not.toContain('data-retirement-export-end')
  })

  it('keeps every D4 archive label at a readable desktop size without changing export geometry', () => {
    expect(desktopCss).toContain('/* Archive labels are meaningful career information, including in the export clone. */')
    expect(desktopCss).toContain('.retirement-clubs__head,')
    expect(desktopCss).toContain('.retirement-archive__footer {\n    font-size: 12px;\n    line-height: 1.35;')
    expect(desktopCss).toContain('.retirement-export-target.is-exporting .retirement-clubs__row {\n    min-height: 62px !important;')
  })

  it('raises mobile retirement archive information instead of shrinking, clipping, or scaling it', () => {
    expect(mainCss).toContain('/* Retirement archive information must remain readable at its actual mobile size. */')
    expect(mainCss).toContain('.retirement-clubs__honor,\n  .retirement-evaluation__score small,')
    expect(mainCss).toContain('.retirement-archive__footer {\n    font-size: 12px;\n    line-height: 1.35;')
    expect(mainCss).toContain('.retirement-clubs__row {\n    min-height: 116px;')
    expect(mainCss).not.toMatch(/\.retirement-archive[^@]*\bzoom\s*:/)
    expect(mainCss).not.toMatch(/\.retirement-archive[^@]*transform:\s*scale/)
  })

  it('keeps the mobile retirement decision copy and its two actions readable', () => {
    expect(mainCss).toContain('/* Retirement is a reading-and-decision surface, not compact decoration. */')
    expect(mainCss).toContain('.retirement-panel.demo-complete--hub .decision-kicker,\n  .retirement-panel.demo-complete--hub > div > p:not(.decision-kicker),\n  .retirement-panel.demo-complete--hub .button {\n    font-size: 12px;\n    line-height: 1.35;')
  })
})
