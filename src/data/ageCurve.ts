import type { AttributeKey } from '../models/game'

export const MAX_CAREER_AGE = 40

export const AGE_GROWTH_POOLS = [
  { minAge: 13, maxAge: 15, pool: 7 },
  { minAge: 16, maxAge: 18, pool: 6 },
  { minAge: 19, maxAge: 21, pool: 5 },
  { minAge: 22, maxAge: 24, pool: 4 },
  { minAge: 25, maxAge: 27, pool: 2.5 },
  { minAge: 28, maxAge: 30, pool: 1.2 },
  { minAge: 31, maxAge: 33, pool: 0.8 },
] as const

export const AGE_DECLINE_PROFILES: Array<{
  minAge: number
  maxAge: number
  decline: Record<AttributeKey, number>
}> = [
  {
    minAge: 31,
    maxAge: 33,
    decline: { attack: 0, defense: 0, physical: 0.4, mental: 0 },
  },
  {
    minAge: 34,
    maxAge: 36,
    decline: { attack: 0.15, defense: 0.1, physical: 0.7, mental: 0 },
  },
  {
    minAge: 37,
    maxAge: MAX_CAREER_AGE,
    decline: { attack: 0.4, defense: 0.3, physical: 1.1, mental: 0.1 },
  },
]

export function growthPoolAtAge(age: number): number {
  return (
    AGE_GROWTH_POOLS.find(
      (band) => age >= band.minAge && age <= band.maxAge,
    )?.pool ?? 0
  )
}

export function declineProfileAtAge(
  age: number,
): Record<AttributeKey, number> {
  return (
    AGE_DECLINE_PROFILES.find(
      (band) => age >= band.minAge && age <= band.maxAge,
    )?.decline ?? { attack: 0, defense: 0, physical: 0, mental: 0 }
  )
}

export function declineManagementFactor(fitness: number): number {
  return Math.min(1.5, Math.max(0.8, 1.5 - fitness * 0.007))
}
