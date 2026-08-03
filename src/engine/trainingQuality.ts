import {
  ACADEMY_SCORES,
  COACH_BASE_SCORES,
  FACILITY_SCORES,
} from '../data/balance'
import type { Club, TeamLevel, TrainingFocus } from '../models/game'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function effectiveCoachScore(
  club: Club,
  coachRelation: number,
): number {
  return Math.min(
    100,
    COACH_BASE_SCORES[club.tier] *
      (0.85 + clamp(coachRelation, 0, 100) * 0.003),
  )
}

export function trainingQualityScore(input: {
  club: Club
  coachRelation: number
  teamLevel: TeamLevel
  bonus?: number
}): number {
  const { club, coachRelation, teamLevel, bonus = 0 } = input
  const coach = effectiveCoachScore(club, coachRelation)
  const facility = FACILITY_SCORES[club.facilityTier]
  const academy = ACADEMY_SCORES[club.academyTier]

  const score =
    teamLevel === 'YOUTH'
      ? facility * 0.35 + academy * 0.45 + coach * 0.2
      : facility * 0.45 + academy * 0.1 + coach * 0.45

  return clamp(score + bonus, 0, 100)
}

export function developmentMultiplierFromTraining(input: {
  trainingQuality: number
  roleExposure: number
  squadRelation: number
  fitness: number
  morale: number
  focus: TrainingFocus
}): number {
  const {
    trainingQuality,
    roleExposure,
    squadRelation,
    fitness,
    morale,
    focus,
  } = input

  // Training environments compound rather than advance in coarse steps. This
  // keeps elite academies materially ahead while preserving the effect of role,
  // relationships and physical/mental readiness.
  const normalizedQuality = clamp(trainingQuality, 0, 100) / 100
  const environment = 0.52 + normalizedQuality ** 3 * 1.05
  const context =
    (roleExposure - 60) * 0.002 +
    (squadRelation - 50) * 0.0015 +
    (fitness - 60) * 0.0015 +
    (morale - 60) * 0.001
  const focusModifier = focus === 'ADAPTATION' ? 0.9 : 1

  return clamp((environment + context) * focusModifier, 0.65, 1.55)
}
