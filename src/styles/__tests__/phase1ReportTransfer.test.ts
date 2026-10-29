import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../phase1-report-transfer.css', import.meta.url), 'utf8')
const report = readFileSync(new URL('../../screens/HalfYearReportScreen.tsx', import.meta.url), 'utf8')
const transfers = readFileSync(new URL('../../screens/TransferWindowScreen.tsx', import.meta.url), 'utf8')

describe('Phase 1 report and transfer presentation contract', () => {
  it('puts settled results and next actions before the full detail review', () => {
    expect(report.indexOf('本期关键表现')).toBeLessThan(report.indexOf('className="report-grid"'))
    expect(report.indexOf('className={`report-footer')).toBeLessThan(report.indexOf('className="report-grid"'))
    expect(report).toContain('<summary>能力变化 · 查看各项明细</summary>')
    expect(report).toContain('<summary>状态、关系与收支</summary>')
    expect(css).toContain('.report-footer ul { display: block;')
    expect(css).toContain('-webkit-line-clamp: unset;')
  })

  it('uses one mobile column for report sections and transfer offer comparisons', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 760px)'))
    expect(mobile).toContain('.report-side { grid-template-columns: 1fr; }')
    expect(mobile).toContain('.transfer-offer-grid { grid-template-columns: 1fr; }')
    expect(mobile).toContain('.transfer-offer-detail > dl { grid-template-columns: 1fr; }')
  })

  it('keeps quote amount, length and role visible before choosing a club', () => {
    const cards = transfers.slice(transfers.indexOf('{externalOffers.map'), transfers.indexOf('{selectedOffer ?'))
    expect(cards).toContain('offer.remainingHalfYears / 2')
    expect(cards).toContain('offer.annualSalaryEuro')
    expect(cards).toContain('offer.transferFeeEuro')
    expect(cards).toContain('roleText(offer)')
    expect(cards).not.toContain('<details')
    expect(cards).toContain('aria-pressed={selected}')
  })

  it('uses readable body/meta tokens and accessible expansion targets', () => {
    expect(css).toContain('font-size: var(--font-body, 1rem)')
    expect(css).toContain('font-size: var(--font-meta, .875rem)')
    expect(css).toContain('.transfer-preferences > summary { min-height: 48px;')
  })
})
