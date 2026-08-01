import { describe, expect, it } from 'vitest'
import {
  careerWindowLabel,
  playerAgeAtWindow,
  transferWindowNumber,
} from '../careerTime'

describe('career window time', () => {
  it('alternates summer and winter across calendar years', () => {
    expect(careerWindowLabel(2026, 0)).toBe('2026年夏季')
    expect(careerWindowLabel(2026, 1)).toBe('2026年冬季')
    expect(careerWindowLabel(2026, 2)).toBe('2027年夏季')
    expect(careerWindowLabel(2026, 3)).toBe('2027年冬季')
  })

  it('advances the displayed age after a full career year', () => {
    expect(playerAgeAtWindow(0)).toBe(13)
    expect(playerAgeAtWindow(1)).toBe(13)
    expect(playerAgeAtWindow(2)).toBe(14)
  })

  it('numbers recurring transfer windows after the first professional half-year', () => {
    expect(transferWindowNumber(5)).toBe(1)
    expect(transferWindowNumber(6)).toBe(2)
    expect(transferWindowNumber(10)).toBe(6)
  })
})
