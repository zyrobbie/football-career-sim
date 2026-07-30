import { describe, expect, it } from 'vitest'
import {
  annualDisposableIncome,
  cashReserveLimit,
  halfYearDisposableIncome,
} from '../finance'

describe('disposable income', () => {
  it.each([
    [30_000, 9_000],
    [80_000, 22_500],
    [180_000, 46_000],
    [400_000, 90_000],
    [900_000, 158_000],
    [4_000_000, 450_000],
    [10_000_000, 780_000],
  ])('maps €%i gross salary to €%i annual cash', (salary, expected) => {
    expect(annualDisposableIncome(salary)).toBe(expected)
  })

  it('is continuous and monotonic at bracket boundaries', () => {
    const boundaries = [50_000, 150_000, 500_000, 2_000_000, 5_000_000]
    for (const boundary of boundaries) {
      expect(annualDisposableIncome(boundary + 1)).toBeGreaterThanOrEqual(
        annualDisposableIncome(boundary),
      )
      expect(annualDisposableIncome(boundary)).toBeGreaterThanOrEqual(
        annualDisposableIncome(boundary - 1),
      )
    }
  })

  it('derives half-year income and reserve', () => {
    expect(halfYearDisposableIncome(900_000)).toBe(79_000)
    expect(cashReserveLimit(900_000)).toBe(237_000)
  })
})
