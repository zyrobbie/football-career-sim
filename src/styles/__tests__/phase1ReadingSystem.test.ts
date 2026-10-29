import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const css = read('../phase1.css')
const hub = read('../../components/CareerHub.tsx')
describe('phase 1 mobile reading system', () => {
  it('puts current decisions ahead of the complete expandable reference', () => {
    expect(hub.indexOf('{children}')).toBeLessThan(hub.indexOf('<details className="career-reference"'))
    expect(hub).toContain('当前决策状态')
    expect(hub).toContain('formatEuro(game.cashEuro)')
    expect(hub).toContain('<CareerMeters game={game} />')
    expect(hub).toContain('<CareerLedger game={game} rows={ledgerRows} />')
  })
  it('uses one accessible type scale without overriding the approved poster', () => {
    expect(css).toContain('min-height: 48px')
    expect(css).toContain('font-size: var(--font-body)')
    expect(css).toContain('env(safe-area-inset-bottom)')
    expect(css).not.toMatch(/font-size:\s*(?:[6-9]|1[0-3])px/)
    expect(css).not.toContain('.career-poster-viewport')
    expect(css).not.toContain('.retirement-export')
  })
  it('loads the reading system after legacy styles, before report refinements', () => {
    const entry = read('../../main.tsx')
    expect(entry.indexOf('main.css')).toBeLessThan(entry.indexOf('phase1.css'))
    expect(entry.indexOf('phase1.css')).toBeLessThan(entry.indexOf('phase1-report-transfer.css'))
  })
})
