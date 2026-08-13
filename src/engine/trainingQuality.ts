import {
  ACADEMY_SCORES,
  COACH_BASE_SCORES,
  FACILITY_SCORES,
} from '../data/balance'
import {
  getClubParametersByCompatibleId,
} from '../data/clubs/clubRepository'
import type { ClubParametersV1 } from '../data/clubs/types'
import type { Club, TeamLevel, TrainingFocus } from '../models/game'

const LEAGUE_EXPERIENCE_INTENSITIES: Readonly<Record<string, number>> = {
  'Premier League（20）': 1.15,
  'LaLiga EA Sports（20）': 1.15,
  'Serie A（20）': 1.15,
  'Bundesliga（18）': 1.15,
  'Ligue 1（18）': 1.15,
  'Eredivisie（18）': 1.08,
  'Liga Portugal（18）': 1.08,
  'Belgian Pro League（18）': 1.08,
  'EFL Championship（24）': 1,
  'LaLiga Hypermotion（22）': 1,
  'Serie B（20）': 1,
  '2. Bundesliga（18）': 1,
  'Ligue 2（18）': 1,
  'Campeonato Brasileiro Série A（20）': 1,
  'Liga Profesional（30）': 1,
  '中国顶级联赛（16）': 0.92,
  'J1 League（20）': 0.92,
  'K League 1（12）': 0.92,
  '中国次级联赛（16）': 0.85,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function clubParametersForTraining(club: Club): Readonly<ClubParametersV1> | null {
  return getClubParametersByCompatibleId(club.id)
}

/** True only for fixtures or non-database runtime IDs; all 40 live clubs use V1 data. */
export function usesLegacyTrainingFallback(club: Club): boolean {
  return clubParametersForTraining(club) === null
}

export function effectiveCoachScore(
  club: Club,
  coachRelation: number,
): number {
  const parameters = clubParametersForTraining(club)
  const base = parameters
    ? ({ 1: 94, 2: 87, 3: 79, 4: 70, 5: 60, 6: 50 } as const)[parameters.platformTier]
    : COACH_BASE_SCORES[club.tier]
  return Math.min(100, base * (0.85 + clamp(coachRelation, 0, 100) * 0.003))
}

export function trainingQualityScore(input: {
  club: Club
  coachRelation: number
  teamLevel: TeamLevel
  bonus?: number
}): number {
  const { club, coachRelation, teamLevel, bonus = 0 } = input
  const parameters = clubParametersForTraining(club)
  const facility = parameters
    ? parameters.facility
    : FACILITY_SCORES[club.facilityTier]
  const academy = parameters
    ? parameters.academy
    : ACADEMY_SCORES[club.academyTier]
  const coach = effectiveCoachScore(club, coachRelation)
  const score = teamLevel === 'YOUTH'
    ? facility * 0.35 + academy * 0.45 + coach * 0.2
    : facility * 0.45 + academy * 0.1 + coach * 0.45

  return roundTenth(clamp(score + bonus, 0, 100))
}

export function leagueExperienceIntensity(
  clubParameters: Readonly<ClubParametersV1>,
): number {
  const intensity = LEAGUE_EXPERIENCE_INTENSITIES[clubParameters.league]
  if (intensity === undefined) {
    throw new Error(`Missing league experience intensity for ${clubParameters.league}.`)
  }
  return intensity
}

export function firstTeamMatchExperienceBonus(input: {
  club: Readonly<ClubParametersV1>
  minutes: number
}): number {
  const { club, minutes } = input
  const base = minutes <= 0
    ? 0
    : minutes <= 270
      ? 0.03
      : minutes <= 630
        ? 0.1
        : minutes <= 990
          ? 0.23
          : 0.28
  return Math.round(base * leagueExperienceIntensity(club) * 10_000) / 10_000
}

export function firstTeamMatchExperienceBonusForRuntimeClub(input: {
  club: Club
  minutes: number
}): number {
  const parameters = clubParametersForTraining(input.club)
  return parameters
    ? firstTeamMatchExperienceBonus({ club: parameters, minutes: input.minutes })
    : 0
}

export function developmentMultiplierFromTraining(input: {
  trainingQuality: number
  roleExposure: number
  squadRelation: number
  fitness: number
  morale: number
  focus: TrainingFocus
}): number {
  const { trainingQuality, roleExposure, squadRelation, fitness, morale, focus } = input
  const normalizedQuality = clamp(trainingQuality, 0, 100) / 100
  const environment = 0.52 + normalizedQuality ** 3 * 1.05
  const context =
    (roleExposure - 60) * 0.002 +
    (squadRelation - 50) * 0.0015 +
    (fitness - 60) * 0.0015 +
    (morale - 60) * 0.001
  return clamp((environment + context) * (focus === 'ADAPTATION' ? 0.9 : 1), 0.65, 1.55)
}

/** Adds real first-team match experience after the existing training/context multiplier. */
export function developmentMultiplierWithMatchExperience(
  trainingMultiplier: number,
  matchExperienceBonus: number,
): number {
  return clamp(trainingMultiplier + matchExperienceBonus, 0.65, 1.55)
}
