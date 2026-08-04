import { describe, expect, it } from 'vitest'
import type { GameState } from '../../models/game'
import {
  consumeCareerConsequences,
  getCareerEvent,
  resolveCareerEventChoice,
  selectCareerEvent,
  validateCareerEventDefinitions,
} from '../careerEvents'
import { createCareerStoryState } from '../careerStory'
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
    saveVersion: 11,
    dataVersion: 11,
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
    pendingCareerEvent: null,
    careerEventHistory: [],
    pendingConsequences: [],
    careerStory: createCareerStoryState(offer.club.id),
    trainingFocus: 'BALANCED',
    developmentApproach: null,
    trainingQualityBonus: 0,
    firstTeamProgress: createFirstTeamProgress(offer.club.id),
    cashEuro: 1_000,
    nationalTeam: {
      retired: false,
      currentRole: null,
      caps: 0,
      goals: 0,
      assists: 0,
      debutWindowIndex: null,
      history: [],
    },
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

  it('keeps every registered event definition structurally valid', () => {
    expect(validateCareerEventDefinitions()).toEqual([])
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

  it('restores the same pending event from a version 11 save', () => {
    const state = createState(1)
    const pendingCareerEventId = selectCareerEvent(state)!
    const restored = validateGameState({
      ...state,
      phase: 'SPECIAL_EVENT',
      pendingCareerEvent: {
        eventId: pendingCareerEventId,
        interactionKind: 'CHOICE',
        stepIndex: 0,
        selections: [],
        variantId: null,
      },
    })

    expect(restored.phase).toBe('SPECIAL_EVENT')
    expect(restored.pendingCareerEvent?.eventId).toBe(pendingCareerEventId)
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
      eventId: 'COACH_DEFENSIVE_TASK',
      choiceId: 'A',
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
    expect(consumed.appliedDelta.coachRelation).toBeGreaterThan(0)
    expect(consumed.trainingBonus).toBe(1)
    expect(consumed.summaries).toHaveLength(1)
  })

  it('keeps random outcomes deterministic for the same save and choice', () => {
    const state = createState(6)
    const first = resolveCareerEventChoice({
      state,
      eventId: 'MEDIA_BREAKTHROUGH',
      choiceId: 'B',
    })
    const second = resolveCareerEventChoice({
      state,
      eventId: 'MEDIA_BREAKTHROUGH',
      choiceId: 'B',
    })

    expect(first.record.outcomeLabel).toBeTruthy()
    expect(first.record).toEqual(second.record)
    expect(first.consequences).toEqual(second.consequences)
  })

  it('records compact story tendencies without changing the visible event flow', () => {
    const result = resolveCareerEventChoice({
      state: createState(4),
      eventId: 'CAPTAIN_VIDEO_REVIEW',
      choiceId: 'A',
    })

    expect(result.careerStory.tendencies.leadership).toBe(1)
    expect(result.careerStory.tendencies.professionalism).toBe(1)
    expect(result.record.storyEffect).toBeDefined()
  })

  it('does not let a negative event push a relationship below 35', () => {
    const state = createState(4)
    state.player!.squadRelation = 36
    const result = resolveCareerEventChoice({
      state,
      eventId: 'CAPTAIN_VIDEO_REVIEW',
      choiceId: 'C',
    })

    expect(result.player.squadRelation).toBe(35)
    expect(result.record.appliedDelta.squadRelation).toBe(-1)
  })

  it('keeps injury events as informed three-way decisions', () => {
    const event = getCareerEvent('KEY_MATCH_PAIN')
    expect(event.choices).toHaveLength(3)
    expect(event.choices.map((choice) => choice.title)).toEqual([
      '立即报告队医',
      '申请限制出场时间',
      '咬牙踢满全场',
    ])

    const result = resolveCareerEventChoice({
      state: createState(4),
      eventId: 'KEY_MATCH_PAIN',
      choiceId: 'B',
    })
    expect(result.record.outcomeLabel).toBeTruthy()
    expect(event.choices.every((choice) => !choice.delayed)).toBe(true)
    expect(
      event.choices.every((choice) =>
        choice.outcomes?.every((outcome) => !outcome.delayed) ?? true,
      ),
    ).toBe(true)
  })

  it('keeps the full-career ordinary-event rate close to 70 percent', () => {
    let eligibleWindows = 0
    let eventWindows = 0

    for (let career = 0; career < 500; career += 1) {
      let state = {
        ...createState(1),
        careerSeed: `event-frequency-${career}`,
      }
      for (let windowIndex = 1; windowIndex <= 53; windowIndex += 1) {
        state = {
          ...state,
          windowIndex,
          transferDecision:
            windowIndex % 6 === 0
              ? {
                  kind: 'STAY' as const,
                  fromClubId: state.selectedClubId!,
                  toClubId: state.selectedClubId!,
                  arrivalChoice: null,
                  cashSpentEuro: 0,
                }
              : null,
        }
        eligibleWindows += 1
        const eventId = selectCareerEvent(state)
        if (!eventId) continue
        eventWindows += 1
        state = {
          ...state,
          careerEventHistory: [
            ...state.careerEventHistory,
            {
              eventId,
              choiceId: 'A',
              windowIndex,
              choiceTitle: '频率测试',
              outcomeSummary: '频率测试',
              appliedDelta: {},
              cashDeltaEuro: 0,
            },
          ],
        }
      }
    }

    const rate = eventWindows / eligibleWindows
    expect(rate).toBeGreaterThan(0.68)
    expect(rate).toBeLessThan(0.72)
  })

  it('keeps a full event history comfortably below the 200KB save budget', () => {
    const state = createState(53)
    const eventId = 'CAPTAIN_VIDEO_REVIEW' as const
    const careerEventHistory = Array.from({ length: 54 }, (_, windowIndex) => ({
      eventId,
      choiceId: 'A',
      windowIndex,
      choiceTitle: '主动承担分析',
      outcomeSummary: '你完成了这次职业选择，结果已经写入本窗口档案。',
      appliedDelta: { squadRelation: 3, morale: 1 },
      cashDeltaEuro: 0,
      storyEffect: { tendencyDelta: { leadership: 1 } },
    }))

    const bytes = new TextEncoder().encode(
      JSON.stringify({ ...state, careerEventHistory }),
    ).byteLength
    expect(bytes).toBeLessThan(200 * 1024)
  })
})
