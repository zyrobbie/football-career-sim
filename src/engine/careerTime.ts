import { MAX_CAREER_AGE } from '../data/ageCurve'

export const DEMO_WINDOW_COUNT = 4

export function careerWindowLabel(
  startYear: number,
  windowIndex: number,
): string {
  const year = startYear + Math.floor(windowIndex / 2)
  const season = windowIndex % 2 === 0 ? '夏季' : '冬季'
  return `${year}年${season}`
}

export function playerAgeAtWindow(windowIndex: number): number {
  return 13 + Math.floor(windowIndex / 2)
}

export type RetirementAvailability =
  | 'UNAVAILABLE'
  | 'OPTIONAL'
  | 'MANDATORY'

export function retirementAvailabilityAfterWindow(
  windowIndex: number,
): RetirementAvailability {
  const age = playerAgeAtWindow(windowIndex)
  const seasonEnded = windowIndex % 2 === 1

  if (age > MAX_CAREER_AGE || (age === MAX_CAREER_AGE && seasonEnded)) {
    return 'MANDATORY'
  }
  if (age >= 37) return 'OPTIONAL'
  if (age >= 33) return seasonEnded ? 'OPTIONAL' : 'UNAVAILABLE'
  if (age >= 30) return 'OPTIONAL'
  return 'UNAVAILABLE'
}

export function canAdvanceBeyondWindow(windowIndex: number): boolean {
  return playerAgeAtWindow(windowIndex + 1) <= MAX_CAREER_AGE
}

export function canSignNewContractAtWindow(windowIndex: number): boolean {
  return playerAgeAtWindow(windowIndex) < MAX_CAREER_AGE
}

export function canOpenTransferMarketAfterWindow(
  completedWindowIndex: number,
): boolean {
  return canSignNewContractAtWindow(completedWindowIndex + 1)
}

export function halfYearsUntilCareerEndAfterWindow(
  windowIndex: number,
): number {
  const finalWindowIndex = (MAX_CAREER_AGE - 13) * 2 + 1
  return Math.max(0, finalWindowIndex - windowIndex)
}

export function shouldRetireAtContractExpiry(
  windowIndex: number,
): boolean {
  const remainingHalfYears = halfYearsUntilCareerEndAfterWindow(windowIndex)
  return remainingHalfYears > 0 && remainingHalfYears <= 2
}
