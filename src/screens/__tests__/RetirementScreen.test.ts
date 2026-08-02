import { describe, expect, it } from 'vitest'
import { retirementNarrative } from '../RetirementScreen'

describe('retirement player-facing copy', () => {
  it('uses a career-finale narrative instead of exposing system rules', () => {
    const copy = retirementNarrative({
      age: 40,
      isFinal: false,
      isAgeLimit: true,
    })
    const visibleCopy = Object.values(copy).join(' ')

    expect(copy.heading).toBe('是时候向球员生涯告别了。')
    expect(visibleCopy).not.toMatch(/职业日历|只读|本地存档|强制退役|必须退役/)
  })

  it('keeps voluntary retirement framed as a player decision', () => {
    const copy = retirementNarrative({
      age: 35,
      isFinal: false,
      isAgeLimit: false,
    })

    expect(copy.heading).toContain('35岁')
    expect(copy.summary).toContain('回到球场')
  })
})
