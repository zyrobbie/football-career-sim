import { isKnownLivingCityId, resolveClubCity } from '../data/clubCities'

export { resolveClubCity } from '../data/clubCities'

export const MAX_LIVING_CITY_MOVES = 64

export interface LivingCityMove {
  id: string
  fromCityId: string
  toCityId: string
  fromClubId: string | null
  toClubId: string
  windowIndex: number
  purchasedArrangementId: string | null
  source: 'TRANSFER_COMMIT'
}

export interface LivingCityState {
  cityId: string | null
  clubId: string | null
  moves: LivingCityMove[]
  /** Null after initialization or an unknown transition, even when history remains. */
  eligibilityMoveId: string | null
}

export interface LivingCityTransition {
  kind: 'INITIALIZED' | 'SAME_CITY' | 'MOVED' | 'UNKNOWN'
  state: LivingCityState
  move: LivingCityMove | null
}

function isWindowIndex(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

/** Initialization knows the current city, but is never evidence of a move. */
export function createLivingCityState(clubId?: string | null): LivingCityState {
  const city = resolveClubCity(clubId)
  return {
    cityId: city.cityId,
    clubId: city.canonicalClubId,
    moves: [],
    eligibilityMoveId: null,
  }
}

function moveId(
  careerSeed: string,
  windowIndex: number,
  previousMoveId: string | null,
  fromCityId: string,
  toCityId: string,
  fromClubId: string | null,
  toClubId: string,
): string {
  // A separate deterministic namespace does not consume any simulation random stream.
  // The previous receipt distinguishes multiple genuine moves in the same window.
  const key = JSON.stringify([
    'living-city-v1', careerSeed, windowIndex, previousMoveId,
    fromCityId, toCityId, fromClubId, toClubId,
  ])
  let hash = 14695981039346656037n
  for (let index = 0; index < key.length; index += 1) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(key.charCodeAt(index))) * 1099511628211n)
  }
  return `LC-${windowIndex}-${hash.toString(16).padStart(16, '0')}`
}

/**
 * Sync only at an authorized lifecycle boundary, never to rewrite frozen preparation.
 * Unknown endpoints break continuity. A later known endpoint initializes without
 * inventing the missing origin, and migration cannot manufacture a first move.
 */
export function transitionLivingCity(
  previous: LivingCityState | null | undefined,
  clubId: string | null | undefined,
  windowIndex: number,
  careerSeed: string,
): LivingCityTransition {
  const resolved = resolveClubCity(clubId)
  const moves = (previous?.moves ?? []).slice(-MAX_LIVING_CITY_MOVES)
  const currentCityId = resolved.cityId
  const currentClubId = resolved.canonicalClubId

  if (!currentCityId || !currentClubId) {
    return {
      kind: 'UNKNOWN',
      state: { cityId: null, clubId: currentClubId, moves, eligibilityMoveId: null },
      move: null,
    }
  }

  const previousClub = resolveClubCity(previous?.clubId)
  const recordedCityId = previous?.cityId
  const previousCityId = isKnownLivingCityId(recordedCityId)
    && (previous?.clubId == null || (previousClub.canonicalClubId !== null
      && previousClub.cityId === recordedCityId))
    ? recordedCityId : null
  if (!previousCityId) {
    return {
      kind: 'INITIALIZED',
      state: { cityId: currentCityId, clubId: currentClubId, moves, eligibilityMoveId: null },
      move: null,
    }
  }

  if (previousCityId === currentCityId) {
    return {
      kind: 'SAME_CITY',
      state: {
        cityId: currentCityId,
        clubId: currentClubId,
        moves,
        eligibilityMoveId: previous?.eligibilityMoveId ?? null,
      },
      move: null,
    }
  }

  // An invalid time cannot mint a purchase receipt. Keep the observed destination
  // but initialize it without eligibility, rather than guess a window or move.
  if (!isWindowIndex(windowIndex) || moves.some((move) => move.windowIndex > windowIndex)) {
    return {
      kind: 'INITIALIZED',
      state: { cityId: currentCityId, clubId: currentClubId, moves, eligibilityMoveId: null },
      move: null,
    }
  }

  const previousClubId = previousClub.canonicalClubId
  const move: LivingCityMove = {
    id: moveId(careerSeed, windowIndex, moves.at(-1)?.id ?? null,
      previousCityId, currentCityId, previousClubId, currentClubId),
    fromCityId: previousCityId,
    toCityId: currentCityId,
    fromClubId: previousClubId,
    toClubId: currentClubId,
    windowIndex,
    purchasedArrangementId: null,
    source: 'TRANSFER_COMMIT',
  }
  return {
    kind: 'MOVED',
    state: {
      cityId: currentCityId,
      clubId: currentClubId,
      moves: [...moves, move].slice(-MAX_LIVING_CITY_MOVES),
      eligibilityMoveId: move.id,
    },
    move,
  }
}

export function syncLivingCity(
  previous: LivingCityState | null | undefined,
  clubId: string | null | undefined,
  windowIndex: number,
  careerSeed: string,
): LivingCityState {
  return transitionLivingCity(previous, clubId, windowIndex, careerSeed).state
}

/** Most recent verifiable arrival, including one whose settling service was bought. */
export function getRecentLivingCityMove(
  state: LivingCityState | null | undefined,
  windowIndex: number,
  maxAgeWindows = 1,
): LivingCityMove | null {
  if (!state?.eligibilityMoveId || !isWindowIndex(windowIndex)
    || !Number.isSafeInteger(maxAgeWindows) || maxAgeWindows < 0) return null
  const move = state.moves.at(-1)
  if (!move || move.source !== 'TRANSFER_COMMIT'
    || move.id !== state.eligibilityMoveId || move.toCityId !== state.cityId
    || !isWindowIndex(move.windowIndex) || move.windowIndex > windowIndex
    || windowIndex - move.windowIndex > maxAgeWindows
    || move.fromCityId === move.toCityId
    || !isKnownLivingCityId(move.fromCityId) || !isKnownLivingCityId(move.toCityId)
    || resolveClubCity(state.clubId).cityId !== state.cityId
    || resolveClubCity(move.toClubId).cityId !== move.toCityId
    || (move.fromClubId !== null && resolveClubCity(move.fromClubId).cityId !== move.fromCityId)) return null
  return move
}

/** W and W+1 only, once per actual move; the caller also checks annual quota. */
export function getEligibleLivingCityMove(
  state: LivingCityState | null | undefined,
  windowIndex: number,
): LivingCityMove | null {
  const move = getRecentLivingCityMove(state, windowIndex)
  return move?.purchasedArrangementId === null ? move : null
}
