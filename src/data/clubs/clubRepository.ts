import { CLUB_PARAMETERS_V1 } from './clubParametersV1'
import { WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID } from './legacyClubIdMap'
import type {
  ClubParametersV1,
  ClubPlatformTier,
  ClubTrainingQuality,
  ClubTrainingTeamLevel,
} from './types'

const EXPECTED_CLUB_COUNT = 366
const EXPECTED_LEAGUE_COUNT = 19
const MIN_PARAMETER = 0
const MAX_PARAMETER = 100

const COACH_BASE_BY_PLATFORM_TIER: Readonly<Record<ClubPlatformTier, number>> = {
  1: 94,
  2: 87,
  3: 79,
  4: 70,
  5: 60,
  6: 50,
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function indexBy<Key>(
  getKey: (club: Readonly<ClubParametersV1>) => Key,
): ReadonlyMap<Key, readonly Readonly<ClubParametersV1>[]> {
  const index = new Map<Key, Readonly<ClubParametersV1>[]>()
  for (const club of CLUB_PARAMETERS_V1) {
    const key = getKey(club)
    const clubs = index.get(key)
    if (clubs) clubs.push(club)
    else index.set(key, [club])
  }
  return new Map([...index].map(([key, clubs]) => [key, Object.freeze(clubs)]))
}

const clubsById = new Map(CLUB_PARAMETERS_V1.map((club) => [club.id, club]))
const clubsByWorkbookId = new Map(
  CLUB_PARAMETERS_V1.map((club) => [club.workbookId, club]),
)
const clubsByCountry = indexBy((club) => club.country)
const clubsByLeague = indexBy((club) => club.league)
const clubsByPlatformTier = indexBy((club) => club.platformTier)
const EMPTY_CLUBS: readonly Readonly<ClubParametersV1>[] = Object.freeze([])

function assertValidClubParameters(clubs: readonly Readonly<ClubParametersV1>[]): void {
  if (clubs.length !== EXPECTED_CLUB_COUNT) {
    throw new Error(`Expected ${EXPECTED_CLUB_COUNT} clubs, received ${clubs.length}.`)
  }
  if (clubsById.size !== clubs.length) throw new Error('Canonical runtime IDs must be unique.')
  if (clubsByWorkbookId.size !== clubs.length) throw new Error('Workbook IDs must be unique.')
  if (clubsByLeague.size !== EXPECTED_LEAGUE_COUNT) {
    throw new Error(`Expected ${EXPECTED_LEAGUE_COUNT} leagues, received ${clubsByLeague.size}.`)
  }

  for (const club of clubs) {
    for (const [key, value] of Object.entries({
      id: club.id,
      workbookId: club.workbookId,
      sourceId: club.sourceId,
      country: club.country,
      league: club.league,
      name: club.name,
    })) {
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Club ${club.id} has empty ${key}.`)
      }
    }
    if (club.divisionLevel !== 1 && club.divisionLevel !== 2) {
      throw new Error(`Invalid division level for ${club.id}.`)
    }
    if (!Number.isInteger(club.platformTier) || club.platformTier < 1 || club.platformTier > 6) {
      throw new Error(`Invalid platform tier for ${club.id}.`)
    }
    for (const [key, value] of Object.entries({
      facility: club.facility,
      academy: club.academy,
      wage: club.wage,
      exposure: club.exposure,
      firstTeamThreshold: club.firstTeamThreshold,
      youthPlayerPreference: club.youthPlayerPreference,
    })) {
      if (!Number.isFinite(value) || value < MIN_PARAMETER || value > MAX_PARAMETER) {
        throw new Error(`Invalid ${key} parameter for ${club.id}.`)
      }
    }
  }

  for (const [workbookId, runtimeId] of Object.entries(WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID)) {
    const club = clubsByWorkbookId.get(workbookId)
    if (!club || club.id !== runtimeId) {
      throw new Error(`Workbook ID ${workbookId} must resolve to canonical runtime ID ${runtimeId}.`)
    }
  }
}

assertValidClubParameters(CLUB_PARAMETERS_V1)

export function listClubParameters(): readonly Readonly<ClubParametersV1>[] {
  return CLUB_PARAMETERS_V1
}

/** Looks up only a canonical runtime ID. */
export function getClubParametersById(id: string): Readonly<ClubParametersV1> | null {
  return clubsById.get(id) ?? null
}

/** Looks up the immutable workbook ID while returning the canonical runtime record. */
export function getClubParametersByWorkbookId(
  workbookId: string,
): Readonly<ClubParametersV1> | null {
  return clubsByWorkbookId.get(workbookId) ?? null
}

/** Accepts either canonical runtime ID or workbook ID without scanning the database. */
export function getClubParametersByCompatibleId(
  id: string,
): Readonly<ClubParametersV1> | null {
  return clubsById.get(id) ?? clubsByWorkbookId.get(id) ?? null
}

export function resolveClubParametersId(id: string): string | null {
  return getClubParametersByCompatibleId(id)?.id ?? null
}

export function listClubParametersByCountry(
  country: string,
): readonly Readonly<ClubParametersV1>[] {
  return clubsByCountry.get(country) ?? EMPTY_CLUBS
}

export function listClubParametersByLeague(
  league: string,
): readonly Readonly<ClubParametersV1>[] {
  return clubsByLeague.get(league) ?? EMPTY_CLUBS
}

export function listClubParametersByPlatformTier(
  tier: ClubPlatformTier,
): readonly Readonly<ClubParametersV1>[] {
  return clubsByPlatformTier.get(tier) ?? EMPTY_CLUBS
}

export function trainingQualityForClubParameters(
  club: Readonly<ClubParametersV1>,
  teamLevel: ClubTrainingTeamLevel,
  coachRelation = 50,
): number {
  const coachBase = COACH_BASE_BY_PLATFORM_TIER[club.platformTier]
  const effectiveCoach = Math.min(
    100,
    coachBase * (0.85 + clamp(coachRelation, 0, 100) * 0.003),
  )
  const score = teamLevel === 'YOUTH'
    ? club.facility * 0.35 + club.academy * 0.45 + effectiveCoach * 0.2
    : club.facility * 0.45 + club.academy * 0.1 + effectiveCoach * 0.45

  return Math.round(clamp(score, 0, 100) * 10) / 10
}

export function trainingQualitiesForClubParameters(
  club: Readonly<ClubParametersV1>,
  coachRelation = 50,
): Readonly<ClubTrainingQuality> {
  return Object.freeze({
    youth: trainingQualityForClubParameters(club, 'YOUTH', coachRelation),
    firstTeam: trainingQualityForClubParameters(club, 'FIRST_TEAM', coachRelation),
  })
}
