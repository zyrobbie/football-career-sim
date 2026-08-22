import { describe, expect, it } from 'vitest'
import { visibleCareerWindowIndex } from './careerView'

describe('visible career window', () => {
  it('matches the CareerHub presentation rule at reports and professional transitions', () => {
    expect(visibleCareerWindowIndex({ phase: 'HALF_YEAR_REPORT', windowIndex: 8 })).toBe(9)
    expect(visibleCareerWindowIndex({ phase: 'PRO_CONTRACT_OFFER', windowIndex: 12 })).toBe(13)
    expect(visibleCareerWindowIndex({ phase: 'PRO_STAGE_COMPLETE', windowIndex: 20 })).toBe(21)
  })

  it('keeps the active window during plans, events, transfer choices, and final limits', () => {
    expect(visibleCareerWindowIndex({ phase: 'HALF_YEAR_PLAN', windowIndex: 8 })).toBe(8)
    expect(visibleCareerWindowIndex({ phase: 'SPECIAL_EVENT', windowIndex: 12 })).toBe(12)
    expect(visibleCareerWindowIndex({ phase: 'TRANSFER_WINDOW', windowIndex: 20 })).toBe(20)
    expect(visibleCareerWindowIndex({ phase: 'HALF_YEAR_REPORT', windowIndex: 55 })).toBe(55)
  })
})
