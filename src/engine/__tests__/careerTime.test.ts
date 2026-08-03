import { describe, expect, it } from 'vitest'
import {
  canAdvanceBeyondWindow,
  canOpenTransferMarketAfterWindow,
  canSignNewContractAtWindow,
  careerWindowLabel,
  halfYearsUntilCareerEndAfterWindow,
  playerAgeAtWindow,
  retirementAvailabilityAfterWindow,
  shouldRetireAtContractExpiry,
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

  it('offers retirement on the agreed age cadence and forces it after age 40 season', () => {
    expect(retirementAvailabilityAfterWindow(33)).toBe('UNAVAILABLE')
    expect(retirementAvailabilityAfterWindow(34)).toBe('OPTIONAL')
    expect(retirementAvailabilityAfterWindow(40)).toBe('UNAVAILABLE')
    expect(retirementAvailabilityAfterWindow(41)).toBe('OPTIONAL')
    expect(retirementAvailabilityAfterWindow(48)).toBe('OPTIONAL')
    expect(retirementAvailabilityAfterWindow(54)).toBe('OPTIONAL')
    expect(retirementAvailabilityAfterWindow(55)).toBe('MANDATORY')
    expect(canAdvanceBeyondWindow(54)).toBe(true)
    expect(canAdvanceBeyondWindow(55)).toBe(false)
  })

  it('closes new contracts before the age-40 season and retires on a late expiry', () => {
    expect(halfYearsUntilCareerEndAfterWindow(53)).toBe(2)
    expect(shouldRetireAtContractExpiry(53)).toBe(true)
    expect(halfYearsUntilCareerEndAfterWindow(54)).toBe(1)
    expect(shouldRetireAtContractExpiry(54)).toBe(true)
    expect(shouldRetireAtContractExpiry(55)).toBe(false)
    expect(canSignNewContractAtWindow(53)).toBe(true)
    expect(canSignNewContractAtWindow(54)).toBe(false)
    expect(canOpenTransferMarketAfterWindow(52)).toBe(true)
    expect(canOpenTransferMarketAfterWindow(53)).toBe(false)
  })
})
