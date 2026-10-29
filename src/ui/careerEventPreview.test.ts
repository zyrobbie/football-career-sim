import { describe, expect, it } from 'vitest'
import { qualitativeEventPreview } from './careerEventPreview'
import { V3_STORY_EVENTS } from '../data/offPitchStories'

describe('directional interaction previews', () => {
  it('shows affected metrics and direction, never exact point or cash changes', () => {
    expect(qualitativeEventPreview('球迷关系+2 · 身体状态-1')).toBe('球迷关系小幅上升 · 身体状态小幅下降')
    expect(qualitativeEventPreview('现金+€800 · 心理状态+3')).toBe('现金上升 · 心理状态明显上升')
    expect(qualitativeEventPreview('花费€500 · 球迷关系+2')).toBe('现金减少 · 球迷关系小幅上升')
    expect(qualitativeEventPreview('无费用 · 无数值影响')).toBe('无费用 · 状态与收入不变')
  })
  it('retains qualitative legacy effects and meaningful risk probabilities', () => {
    expect(qualitativeEventPreview('媒体、职业倾向小幅上升')).toBe('媒体、职业倾向小幅上升')
    expect(qualitativeEventPreview('50%获得认可 · 50%被视为越界')).toBe('50%获得认可 · 50%被视为越界')
  })
  it('covers every V3 option without leaking numbers through the description', () => {
    for (const event of V3_STORY_EVENTS) for (const choice of event.choices) {
      expect(qualitativeEventPreview(choice.effectPreview)).not.toMatch(/[+-]\d|€\d/)
      expect(choice.description).not.toMatch(/€\d|[+-]\d/)
    }
  })
})
