import { describe, expect, it } from 'vitest'
import type { GameState } from '../../models/game'
import {
  consumeCareerConsequences,
  getCareerEvent,
  resolveCareerEventChoice,
  selectCareerEvent,
} from '../careerEvents'
import { createFirstTeamProgress } from '../firstTeamPath'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import { validateGameState } from '../../persistence/save'
import { createDraft } from './testFixtures'

function createState(windowIndex = 1): GameState {
  const careerSeed = 'career-event-test-seed'
  const draft = createDraft('ST')
  const player = generatePlayer(draft, careerSeed)
  const academyOffers = generateAcademyOffers(player, careerSeed)
  const offer = academyOffers[0]!
  return {
    saveVersion: 8,
    dataVersion: 8,
    phase: 'HALF_YEAR_PLAN',
    careerSeed,
    startYear: 2026,
    windowIndex,
    draft,
    player,
    academyOffers,
    selectedClubId: offer.club.id,
    teamLevel: 'YOUTH',
    youthRole: offer.expectedRole,
    firstTeamRole: null,
    contract: null,
    professionalOffer: null,
    transferOffers: [],
    selectedTransferChoiceId: null,
    transferDecision: null,
    arrivalChoice: 'COACH',
    transferArrivalChoice: null,
    pendingCareerEventId: null,
    careerEventHistory: [],
    pendingConsequences: [],
    trainingFocus: 'BALANCED',
    developmentApproach: null,
    trainingQualityBonus: 0,
    firstTeamProgress: createFirstTeamProgress(offer.club.id),
    cashEuro: 1_000,
    retirementReason: null,
    lastReport: null,
    history: [],
  }
}

describe('career events', () => {
  it('skips the arrival window and deterministically selects the next event', () => {
    expect(selectCareerEvent(createState(0))).toBeNull()
    const first = selectCareerEvent(createState(1))
    const second = selectCareerEvent(createState(1))
    expect(first).not.toBeNull()
    expect(first).toBe(second)
  })

  it('applies an event choice and records the exact outcome', () => {
    const state = createState(1)
    const eventId = selectCareerEvent(state)!
    const event = getCareerEvent(eventId)
    const before = structuredClone(state.player!)
    const result = resolveCareerEventChoice({
      state,
      eventId,
      choiceId: 'A',
    })

    expect(result.record.eventId).toBe(eventId)
    expect(result.record.choiceTitle).toBe(event.choices[0]!.title)
    expect(result.player).not.toEqual(before)
    expect(result.cashEuro).toBeGreaterThanOrEqual(0)
  })

  it('restores the same pending event from a version 6 save', () => {
    const state = createState(1)
    const pendingCareerEventId = selectCareerEvent(state)!
    const restored = validateGameState({
      ...state,
      phase: 'SPECIAL_EVENT',
      pendingCareerEventId,
    })

    expect(restored.phase).toBe('SPECIAL_EVENT')
    expect(restored.pendingCareerEventId).toBe(pendingCareerEventId)
  })

  it('caps event spending at available cash', () => {
    const state = { ...createState(2), cashEuro: 500 }
    const result = resolveCareerEventChoice({
      state,
      eventId: 'DRESSING_ROOM_DISPUTE',
      choiceId: 'C',
    })

    expect(result.cashEuro).toBe(0)
    expect(result.record.cashDeltaEuro).toBe(-500)
  })

  it('persists and consumes a delayed consequence in the next window', () => {
    const state = createState(2)
    const result = resolveCareerEventChoice({
      state,
      eventId: 'FITNESS_WARNING',
      choiceId: 'C',
    })
    expect(result.consequence?.applyAtWindow).toBe(3)

    const nextState: GameState = {
      ...state,
      windowIndex: 3,
      player: result.player,
      pendingConsequences: [result.consequence!],
    }
    const consumed = consumeCareerConsequences(nextState)

    expect(consumed.pendingConsequences).toEqual([])
    expect(consumed.appliedDelta.fitness).toBeLessThan(0)
    expect(consumed.trainingBonus).toBe(-1)
    expect(consumed.summaries).toHaveLength(1)
  })
})
