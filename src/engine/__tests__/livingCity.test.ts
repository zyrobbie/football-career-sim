import { describe, expect, it } from 'vitest'
import {
  createLivingCityState,
  getEligibleLivingCityMove,
  getRecentLivingCityMove,
  MAX_LIVING_CITY_MOVES,
  syncLivingCity,
  transitionLivingCity,
  type LivingCityState,
} from '../livingCity'

const seed = 'V3-CITY-TEST'
const london = 'eng_arsenal'
const liverpool = 'eng_liverpool'
const milan = 'ita_inter'

function arrival(windowIndex = 10): LivingCityState {
  return syncLivingCity(createLivingCityState(london), liverpool, windowIndex, seed)
}

describe('living city lifecycle', () => {
  it('does not turn first join or legacy initialization into settling eligibility', () => {
    for (const initial of [undefined, null, createLivingCityState()]) {
      const result = transitionLivingCity(initial, london, 10, seed)
      expect(result.kind).toBe('INITIALIZED')
      expect(result.state.cityId).toBe('gb_london')
      expect(result.state.clubId).toBe(london)
      expect(result.state.moves).toEqual([])
      expect(result.state.eligibilityMoveId).toBeNull()
      expect(getEligibleLivingCityMove(result.state, 10)).toBeNull()
    }
    expect(getRecentLivingCityMove(createLivingCityState(london), 10)).toBeNull()
  })

  it('accepts an explicit known previous living-city record without inventing a previous club', () => {
    const previous: LivingCityState = {
      cityId: 'gb_london', clubId: null, moves: [], eligibilityMoveId: null,
    }
    const result = transitionLivingCity(previous, milan, 10, seed)
    expect(result.kind).toBe('MOVED')
    expect(result.move?.fromClubId).toBeNull()
    expect(result.move?.fromCityId).toBe('gb_london')
    expect(getEligibleLivingCityMove(result.state, 10)?.toCityId).toBe('it_milano')
  })

  it('creates exactly one deterministic known move with W and W+1 eligibility', () => {
    const original = createLivingCityState(london)
    const result = transitionLivingCity(original, 'eng1_liverpool', 10, seed)
    expect(result.kind).toBe('MOVED')
    expect(result.move).toMatchObject({
      fromCityId: 'gb_london', toCityId: 'gb_liverpool',
      fromClubId: london, toClubId: liverpool, windowIndex: 10,
      purchasedArrangementId: null, source: 'TRANSFER_COMMIT',
    })
    expect(transitionLivingCity(original, liverpool, 10, seed)).toEqual(result)
    expect(getEligibleLivingCityMove(result.state, 9)).toBeNull()
    expect(getEligibleLivingCityMove(result.state, 10)?.id).toBe(result.move?.id)
    expect(getEligibleLivingCityMove(result.state, 11)?.id).toBe(result.move?.id)
    expect(getEligibleLivingCityMove(result.state, 12)).toBeNull()
    expect(getRecentLivingCityMove(result.state, 13, 3)?.id).toBe(result.move?.id)
    expect(syncLivingCity(result.state, liverpool, 10, seed)).toEqual(result.state)
    expect(syncLivingCity(result.state, 'eng1_liverpool', 11, seed)).toEqual(result.state)
    expect(original.moves).toEqual([])
  })

  it('does not grant a move for a same-city club change or alias', () => {
    const initial = createLivingCityState('eng1_arsenal')
    for (const target of ['eng_arsenal', 'eng1_chelsea', 'eng_fulham']) {
      const result = transitionLivingCity(initial, target, 10, seed)
      expect(result.kind).toBe('SAME_CITY')
      expect(result.move).toBeNull()
      expect(result.state.moves).toEqual([])
      expect(getEligibleLivingCityMove(result.state, 10)).toBeNull()
    }
    const moved = arrival()
    const sameCity = syncLivingCity(moved, 'eng1_everton', 11, seed)
    expect(sameCity.moves).toEqual(moved.moves)
    expect(getEligibleLivingCityMove(sameCity, 11)?.id).toBe(moved.moves[0]?.id)
  })

  it('keeps purchased arrival history but never offers a second settling purchase', () => {
    const moved = arrival()
    const move = moved.moves[0]!
    const purchased: LivingCityState = {
      ...moved, moves: [{ ...move, purchasedArrangementId: 'PA-10' }],
    }
    const synced = syncLivingCity(purchased, 'eng1_everton', 11, seed)
    expect(getRecentLivingCityMove(synced, 11)?.purchasedArrangementId).toBe('PA-10')
    expect(getEligibleLivingCityMove(synced, 11)).toBeNull()
    expect(synced.moves).toEqual(purchased.moves)
  })

  it('breaks unknown continuity and never revives an old move on initialization', () => {
    const moved = arrival()
    const unknown = transitionLivingCity(moved, 'unrecognized-club', 10, seed)
    expect(unknown.kind).toBe('UNKNOWN')
    expect(unknown.state.cityId).toBeNull()
    expect(unknown.state.clubId).toBeNull()
    expect(unknown.state.moves).toEqual(moved.moves)
    expect(getEligibleLivingCityMove(unknown.state, 10)).toBeNull()
    for (const known of [liverpool, london, milan]) {
      const next = transitionLivingCity(unknown.state, known, 11, seed)
      expect(next.kind).toBe('INITIALIZED')
      expect(next.state.moves).toEqual(moved.moves)
      expect(next.state.eligibilityMoveId).toBeNull()
      expect(getRecentLivingCityMove(next.state, 11)).toBeNull()
    }
    expect(transitionLivingCity(unknown.state, null, 11, seed).kind).toBe('UNKNOWN')
  })

  it('does not guess from arbitrary or inconsistent prior city data, including mapping revisions', () => {
    const previous = createLivingCityState(london)
    for (const cityId of ['unknown_city', 'it_milano']) {
      const result = transitionLivingCity({ ...previous, cityId }, liverpool, 10, seed)
      expect(result.kind).toBe('INITIALIZED')
      expect(result.move).toBeNull()
      expect(getRecentLivingCityMove(result.state, 10)).toBeNull()
    }
  })

  it('gives a later real move its own arrival and keeps prior receipts unchanged', () => {
    const first = arrival()
    const second = syncLivingCity(first, milan, 11, seed)
    expect(second.moves).toHaveLength(2)
    expect(second.moves[0]).toEqual(first.moves[0])
    expect(second.moves[1]?.id).not.toBe(first.moves[0]?.id)
    expect(getEligibleLivingCityMove(second, 11)?.toCityId).toBe('it_milano')
    expect(getEligibleLivingCityMove(second, 12)?.id).toBe(second.moves[1]?.id)
    expect(getEligibleLivingCityMove(second, 13)).toBeNull()
    const roundTrip = syncLivingCity(syncLivingCity(first, london, 10, seed), liverpool, 10, seed)
    expect(roundTrip.moves).toHaveLength(3)
    expect(new Set(roundTrip.moves.map((move) => move.id)).size).toBe(3)
  })

  it('is pure for frozen inputs and bounds a long move history to the latest 64 receipts', () => {
    let state = createLivingCityState(london)
    const allIds: string[] = []
    for (let window = 0; window < 90; window += 1) {
      Object.freeze(state)
      Object.freeze(state.moves)
      for (const move of state.moves) Object.freeze(move)
      const before = JSON.stringify(state)
      const next = syncLivingCity(state, window % 2 === 0 ? liverpool : london, window, seed)
      expect(JSON.stringify(state)).toBe(before)
      expect(next.moves.length).toBeLessThanOrEqual(MAX_LIVING_CITY_MOVES)
      allIds.push(next.moves.at(-1)!.id)
      state = next
    }
    expect(state.moves).toHaveLength(64)
    expect(state.moves[0]?.windowIndex).toBe(26)
    expect(state.moves.at(-1)?.windowIndex).toBe(89)
    expect(new Set(allIds).size).toBe(90)
    expect(getEligibleLivingCityMove(state, 89)?.id).toBe(state.eligibilityMoveId)
  })

  it.each([-1, 10.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])
  ('cannot mint an arrival receipt at invalid time %s', (window) => {
    const next = syncLivingCity(createLivingCityState(london), milan, window, seed)
    expect(next.moves).toEqual([])
    expect(next.cityId).toBe('it_milano')
    expect(next.eligibilityMoveId).toBeNull()
    expect(getRecentLivingCityMove(arrival(), window)).toBeNull()
  })

  it('never grants backdated or fabricated current eligibility', () => {
    const moved = arrival()
    const backdated = syncLivingCity(moved, milan, 9, seed)
    expect(backdated.moves).toEqual(moved.moves)
    expect(backdated.eligibilityMoveId).toBeNull()
    expect(getRecentLivingCityMove({ ...moved, cityId: 'it_milano' }, 10)).toBeNull()
    expect(getRecentLivingCityMove({ ...moved, eligibilityMoveId: 'absent' }, 10)).toBeNull()
    expect(getRecentLivingCityMove({ ...moved, clubId: milan }, 10)).toBeNull()
    expect(getRecentLivingCityMove(moved, 10, -1)).toBeNull()
    expect(getRecentLivingCityMove({ ...moved, moves: [{ ...moved.moves[0]!, fromClubId: milan }] }, 10)).toBeNull()
    expect(transitionLivingCity({ ...createLivingCityState(london), clubId: 'unknown-club' }, milan, 10, seed).kind).toBe('INITIALIZED')
  })
})
