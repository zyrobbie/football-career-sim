import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../main.css', import.meta.url), 'utf8')

function mobileSeasonHonorsRule() {
  const start = css.indexOf('@media (max-width: 760px) {\n  .career-report .season-honors-report')
  const end = css.indexOf('\n}\n', start) + 2
  return css.slice(start, end)
}

describe('V3.0.1 visual CSS fixes', () => {
  it('uses the higher-contrast paper-ink token for strategy effect text', () => {
    expect(css).toContain('.app-frame .path-choice button em {\n  color: var(--club-paper-ink);')
    expect(css).not.toContain('.app-frame .path-choice button em {\n  color: var(--gold-dark);')
  })

  it('keeps the desktop honor report base layout intact', () => {
    expect(css).toContain('.season-honors-report__awards {\n  display: flex;')
    expect(css).toContain('.season-honors-report__results {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));')
  })

  it('uses two mobile rows so awards cannot compress seasonal results', () => {
    const rule = mobileSeasonHonorsRule()

    expect(rule).toContain('grid-template-columns: auto minmax(0, 1fr);')
    expect(rule).toContain('grid-column: 2;\n    grid-row: 1;\n    min-width: 0;')
    expect(rule).toContain('grid-column: 1 / -1;\n    grid-row: 2;')
    expect(rule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));')
  })

  it('allows long awards to wrap and empty or single award states to span both columns', () => {
    const rule = mobileSeasonHonorsRule()

    expect(rule).toContain('min-width: 0;\n    overflow-wrap: anywhere;')
    expect(rule).toContain('.season-honors-report__awards > span,\n  .career-report .season-honors-report__awards > strong:only-child {\n    grid-column: 1 / -1;')
  })
})
