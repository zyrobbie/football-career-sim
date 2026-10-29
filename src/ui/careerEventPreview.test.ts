import { describe, expect, it } from 'vitest'
import { qualitativeEventPreview } from './careerEventPreview'
import { V3_STORY_EVENTS } from '../data/offPitchStories'

describe('neutral interaction previews', () => {
  it('shows affected metrics without direction or exact changes', () => {
    expect(qualitativeEventPreview('球迷关系+2 · 身体状态-1')).toBe('球迷关系 · 身体状态')
    expect(qualitativeEventPreview('现金+€800 · 心理状态+3')).toBe('现金 · 心理状态')
    expect(qualitativeEventPreview('花费€500 · 球迷关系+2')).toBe('现金 · 球迷关系')
    expect(qualitativeEventPreview('无费用 · 无数值影响')).toBe('无费用 · 不影响状态与收入')
  })
  it('removes legacy directional hints but retains meaningful risk probabilities', () => {
    expect(qualitativeEventPreview('媒体、职业倾向小幅上升')).toBe('媒体、职业倾向')
    expect(qualitativeEventPreview('50%获得认可 · 50%被视为越界')).toBe('50%获得认可 · 50%被视为越界')
  })
  it('removes legacy short directional forms and numeric ranges cleanly', () => {
    expect(qualitativeEventPreview('防守、教练关系上升 · 身体略降')).toBe('防守、教练关系 · 身体')
    expect(qualitativeEventPreview('支出€600 · 融入效果有波动（队内 +3～+10）')).toBe('现金 · 融入效果有波动（队内）')
    expect(qualitativeEventPreview('风险最低 · 关系基本稳定')).toBe('风险 · 关系')
  })
  it('covers every V3 option without leaking numbers through the description', () => {
    for (const event of V3_STORY_EVENTS) for (const choice of event.choices) {
      expect(qualitativeEventPreview(choice.effectPreview)).not.toMatch(/[+-]\d|€\d/)
      expect(choice.description).not.toMatch(/€\d|[+-]\d/)
    }
  })
})
