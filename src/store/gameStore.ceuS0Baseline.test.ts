import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { CLUBS } from '../data/balance'
import { generatePlayer } from '../engine/player'
import { createDraft } from '../engine/__tests__/testFixtures'
import { createTrainingBaselineState as createFirstTeamState } from '../engine/__tests__/ceuTrainingBaselineFixture'
import { generateTransferOffers } from '../engine/transfers'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import { validateGameState } from '../persistence/save'
import { useGameStore } from './gameStore'
const evidence = 'docs/evidence/CEU-20260907/S0'
if (process.env.CEU_GENERATE) throw new Error('Historical generation disabled; frozen S0 is read-only')
afterEach(() => { vi.unstubAllGlobals(); useGameStore.setState({ game: null, error: null, hasSave: false }) })
// These are CURRENT compatibility checks for the unchanged M/F scope, not T correctness.
it('guarantees both regions for the S0 CONDITIONAL input over 100 seeds', () => {
  const player = generatePlayer(createDraft('CM'), 'review-return-home')
  Object.assign(player, { overseasIntent: 'CONDITIONAL', preferredLeagues: ['意大利'], attributes: { attack: 82, defense: 82, physical: 82, mental: 82 }, potentials: { attack: 90, defense: 90, physical: 90, mental: 90 } })
  const club = CLUBS.find(club => club.country !== '中国' && club.tier === 3)!
  const samples = Array.from({ length: 100 }, (_, i) => {
    const seed = `review-return-${i}`
    const offers = generateTransferOffers({ player, currentClubId: club.id, currentTeamLevel: 'FIRST_TEAM', latestReport: null, careerSeed: seed, windowIndex: 40 })
    return { seed, offers: offers.map(offer => { const parameters = getClubParametersByCompatibleId(offer.clubId); expect(parameters).not.toBeNull(); return { ...offer, country: parameters!.country } }) }
  })
  const offers = samples.flatMap(sample => sample.offers)
  expect(offers).toHaveLength(300)
  for (const sample of samples) {
    expect(sample.offers.some(offer => offer.country === '中国')).toBe(true)
    expect(sample.offers.some(offer => offer.country !== '中国')).toBe(true)
  }
})

it('blocks stale report advancement and uses read-only review without changing progress', () => {
  const { state } = createFirstTeamState('ceu-flow-guard-baseline')
  state.phase = 'HALF_YEAR_PLAN'
  useGameStore.setState({ game: state, error: null })
  useGameStore.getState().advanceAfterReport()
  expect(useGameStore.getState().game).toEqual(state)
  // A stale report click cannot reopen a completed stage from a plan.
  const raw = JSON.parse(readFileSync(`${evidence}/fixtures/PRO_STAGE_COMPLETE.json`, 'utf8'))
  const game = validateGameState(raw.data)
  useGameStore.setState({ game, error: null })
  const before = { cash: game.cashEuro, history: game.history, windowIndex: game.windowIndex }
  useGameStore.getState().reviewReport()
  useGameStore.getState().advanceAfterReport()
  expect(useGameStore.getState().isReviewingReport).toBe(true)
  useGameStore.getState().closeReportReview()
  const after = useGameStore.getState().game!
  expect(after).toEqual(game)
  expect({ cash: after.cashEuro, history: after.history, windowIndex: after.windowIndex }).toEqual(before)
})
