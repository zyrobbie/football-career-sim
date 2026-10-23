import { describe, expect, it } from 'vitest'
import type { CareerEventRecord, GameState } from '../../models/game'
import { DATA_VERSION, SAVE_VERSION } from '../../models/game'
import {
  activeStoryEventDefinitions, canMentorYoungTeammate, hasActualCommercialHistory,
  hasRecentActualCityMove, V3_FIRST_SIX_EVENT_IDS, V3_STORY_EVENTS,
} from '../../data/offPitchStories'
import {
  createOffPitchStoryState, offPitchStoryStateSchema, V3_STORY_CHAINS, V3_STORY_EVENT_IDS,
  type OffPitchStoryEventId,
} from '../../models/offPitchStories'
import {
  closeV3Story, getV3StoryEvent, isV3StoryEventId, offPitchStoryReportHighlight,
  publicImpressions, recordV3StoryChoice, representativeOffPitchStories,
  scheduleV3StoryFollowup, selectV3StoryEvent,
} from '../offPitchStories'
import { eligibleCareerEventChoices, resolveCareerEventChoice } from '../careerEvents'
import { createCareerStoryState } from '../careerStory'
import { createEntertainmentV3State } from '../entertainmentV3'
import { createFirstTeamProgress } from '../firstTeamPath'
import { createLivingCityState, syncLivingCity } from '../livingCity'
import { generatePlayer } from '../player'
import { createRandom } from '../random'
import { createDraft } from './testFixtures'

function stateAt(windowIndex = 30): GameState {
  const careerSeed = 'V3-STORY-DETERMINISTIC'
  const draft = createDraft()
  const player = generatePlayer(draft, careerSeed)
  const clubId = 'ita_inter'
  return {
    pendingKeyMatchMoment: null, saveVersion: SAVE_VERSION, dataVersion: DATA_VERSION,
    phase: 'HALF_YEAR_PLAN', careerSeed, startYear: 2026, windowIndex, draft, player,
    academyOffers: [], selectedClubId: clubId, teamLevel: 'FIRST_TEAM', youthRole: null,
    firstTeamRole: 'STARTER',
    contract: {
      type: 'RENEWAL', clubId, remainingHalfYears: 4, annualSalaryEuro: 30_000,
      promisedTeamLevel: 'FIRST_TEAM', promisedRole: 'STARTER', releaseClauseEuro: null,
      clubOptionYears: 0, parentClubId: null, brokenPromiseWindows: 0,
    },
    professionalOffer: null, transferOffers: [], selectedTransferChoiceId: null,
    transferDecision: null, arrivalChoice: null, transferArrivalChoice: null,
    pendingCareerEvent: null, careerEventHistory: [], pendingConsequences: [],
    careerStory: createCareerStoryState(clubId), trainingFocus: 'BALANCED',
    developmentApproach: 'STEADY', trainingQualityBonus: 0,
    firstTeamProgress: createFirstTeamProgress(clubId), cashEuro: 5_000,
    nationalTeam: { retired: false, currentRole: null, caps: 0, goals: 0, assists: 0,
      debutWindowIndex: null, history: [] }, retirementReason: null, lastReport: null,
    history: [windowIndex - 2, windowIndex - 1].map((window) => ({
      windowIndex: window, clubId, role: 'STARTER', teamLevel: 'FIRST_TEAM',
      stats: { appearances: 8, starts: 6, minutes: 600, goals: 0, assists: 1,
        yellowCards: 0, redCards: 0, averageRating: 6.6 },
      arrivalChoice: null, trainingFocus: 'BALANCED', developmentApproach: 'STEADY',
      endingAttributes: { ...player.attributes }, firstTeamAttention: 50,
    })), entertainmentV3: createEntertainmentV3State(clubId),
  }
}

function recordFor(state: GameState, id: OffPitchStoryEventId, choiceId?: string): CareerEventRecord {
  const event = getV3StoryEvent(state, id)
  const choice = event.choices.find((entry) => entry.id === choiceId) ?? event.choices[0]!
  return {
    eventId: id, choiceId: choice.id, windowIndex: state.windowIndex,
    choiceTitle: choice.title, outcomeSummary: choice.outcomeSummary,
    appliedDelta: choice.playerDelta, cashDeltaEuro: choice.cashDeltaEuro ?? 0,
    ...(choice.storyEffect ? { storyEffect: choice.storyEffect } : {}),
  }
}

function choose(state: GameState, id: OffPitchStoryEventId, choiceId?: string): GameState {
  const event = getV3StoryEvent(state, id)
  const selected = choiceId ?? event.choices[0]!.id
  const resolved = resolveCareerEventChoice({ state, eventId: id, choiceId: selected })
  const stories = recordV3StoryChoice(state, resolved.record)
  return {
    ...state, player: resolved.player, cashEuro: resolved.cashEuro, careerStory: resolved.careerStory,
    careerEventHistory: [...state.careerEventHistory, resolved.record],
    entertainmentV3: { ...state.entertainmentV3!, stories },
  }
}

function advance(state: GameState, amount = 1): GameState {
  return { ...state, windowIndex: state.windowIndex + amount }
}

function moveTo(state: GameState, clubId: string): GameState {
  return {
    ...state, selectedClubId: clubId,
    contract: state.contract ? { ...state.contract, clubId } : null,
    entertainmentV3: { ...state.entertainmentV3!, livingCity: syncLivingCity(
      state.entertainmentV3!.livingCity, clubId, state.windowIndex, state.careerSeed) },
  }
}

function supportedRecord(windowIndex: number, persona: 'LOW_KEY' | 'TEAM_FIRST' | 'OUTSPOKEN'): CareerEventRecord {
  return { eventId: 'INTERVIEW_MISQUOTE', choiceId: 'A', windowIndex, choiceTitle: `${persona}的选择`,
    outcomeSummary: '已保存的真实选择。', appliedDelta: {}, cashDeltaEuro: 0,
    storyEffect: { publicPersona: persona } }
}

describe('V3 off-pitch catalog and factual eligibility', () => {
  it('keeps exactly twelve independent nodes and four distinct two-node chains', () => {
    expect(V3_STORY_EVENTS).toHaveLength(20)
    expect(new Set(V3_STORY_EVENTS.map((event) => event.id)).size).toBe(20)
    expect(V3_STORY_EVENT_IDS.filter((id) => id.startsWith('V3_E'))).toHaveLength(12)
    expect(Object.keys(V3_STORY_CHAINS)).toHaveLength(4)
    expect(activeStoryEventDefinitions(false).map((event) => event.id)).toEqual(V3_FIRST_SIX_EVENT_IDS)
    expect(activeStoryEventDefinitions(true)).toHaveLength(20)
    expect(isV3StoryEventId('SPONSOR_APPEARANCE')).toBe(false)
    expect(() => getV3StoryEvent(stateAt(), 'SPONSOR_APPEARANCE')).toThrow()
  })

  it.each(V3_STORY_EVENT_IDS)('has reachable ordinary-player eligibility and free choices: %s', (id) => {
    let state = stateAt()
    if (id === 'V3_E02_AD_TEAMMATE') {
      state.careerEventHistory = [{ ...supportedRecord(29, 'LOW_KEY'), eventId: 'SPONSOR_APPEARANCE', choiceId: 'A' }]
    }
    if (id === 'V3_E07_LANGUAGE_MIXUP' || id === 'V3_E08_NEW_NEIGHBOR') state = moveTo(state, 'eng_arsenal')
    const chain = Object.values(V3_STORY_CHAINS).find((entry) => entry.followup === id)
    if (chain) state = advance(choose(state, chain.first))
    state.player!.reputation = 10
    state.player!.attributes = { attack: 45, defense: 45, physical: 45, mental: 45 }
    const event = getV3StoryEvent(state, id)
    expect(event.isEligible(state)).toBe(true)
    expect(event.choices.length).toBeGreaterThanOrEqual(2)
    expect(event.choices.length).toBeLessThanOrEqual(3)
    const poor = { ...state, cashEuro: 0 }
    expect(eligibleCareerEventChoices(poor, event).length).toBeGreaterThanOrEqual(2)
    for (const choice of event.choices) {
      expect(choice.playerDelta.attributes).toBeUndefined()
      expect(choice.trainingBonus).toBeUndefined()
      expect(choice.delayed).toBeUndefined()
      if ((choice.cashDeltaEuro ?? 0) < 0) {
        expect(choice.effectPreview).toContain(`€${-choice.cashDeltaEuro!}`)
        expect(choice.isEligible?.(poor)).toBe(false)
      }
    }
  })

  it('does not confuse a sponsor invitation or refusal with advertising history', () => {
    let state = stateAt()
    expect(hasActualCommercialHistory(state)).toBe(false)
    state.careerEventHistory = [{ ...supportedRecord(29, 'LOW_KEY'), eventId: 'SPONSOR_APPEARANCE', choiceId: 'C' }]
    expect(hasActualCommercialHistory(state)).toBe(false)
    state = choose(stateAt(), 'V3_C01A_LOCAL_CAR', 'DECLINE')
    expect(hasActualCommercialHistory(advance(state))).toBe(false)
    state = choose(stateAt(), 'V3_C01A_LOCAL_CAR', 'SHORT')
    expect(hasActualCommercialHistory(state)).toBe(false)
    expect(hasActualCommercialHistory(advance(state))).toBe(true)
  })

  it.each(V3_STORY_EVENT_IDS.filter((id) => id.startsWith('V3_E')))(
    'does not replay an independent node later in the same career: %s', (id) => {
      let state = stateAt()
      if (id === 'V3_E02_AD_TEAMMATE') state.careerEventHistory = [{
        ...supportedRecord(29, 'LOW_KEY'), eventId: 'SPONSOR_APPEARANCE', choiceId: 'A',
      }]
      if (id === 'V3_E07_LANGUAGE_MIXUP' || id === 'V3_E08_NEW_NEIGHBOR') state = moveTo(state, 'eng_arsenal')
      const recorded = choose(state, id)
      const later = advance(recorded, 10)
      expect(getV3StoryEvent(later, id).isEligible(later)).toBe(false)
      expect(recordV3StoryChoice(recorded, recorded.careerEventHistory.at(-1)!)).toBe(recorded.entertainmentV3!.stories)
    })

  it('requires reliable recent move evidence, and an overseas new environment for language', () => {
    const original = stateAt()
    expect(hasRecentActualCityMove(original)).toBe(false)
    expect(getV3StoryEvent(original, 'V3_E08_NEW_NEIGHBOR').isEligible(original)).toBe(false)
    const sameCity = moveTo(original, 'ita_milan')
    expect(hasRecentActualCityMove(sameCity)).toBe(false)
    const moved = moveTo(original, 'eng_arsenal')
    expect(hasRecentActualCityMove(moved)).toBe(true)
    expect(getV3StoryEvent(moved, 'V3_E07_LANGUAGE_MIXUP').isEligible(moved)).toBe(true)
    expect(hasRecentActualCityMove(advance(moved, 2))).toBe(false)
    expect(getV3StoryEvent(advance(moved, 3), 'V3_E07_LANGUAGE_MIXUP').isEligible(advance(moved, 3))).toBe(true)
    expect(getV3StoryEvent(advance(moved, 4), 'V3_E07_LANGUAGE_MIXUP').isEligible(advance(moved, 4))).toBe(false)
    const initialized = { ...moved, entertainmentV3: { ...moved.entertainmentV3!, livingCity: createLivingCityState('eng_arsenal') } }
    expect(hasRecentActualCityMove(initialized)).toBe(false)
    const domestic = moveTo(original, 'chn_shanghai_port')
    expect(getV3StoryEvent(domestic, 'V3_E07_LANGUAGE_MIXUP').isEligible(domestic)).toBe(false)
  })

  it('requires age25, genuine first-team tenure and a plausible senior role for mentorship', () => {
    const state = stateAt()
    expect(canMentorYoungTeammate(state)).toBe(true)
    expect(canMentorYoungTeammate({ ...state, windowIndex: 22 })).toBe(false)
    expect(canMentorYoungTeammate({ ...state, firstTeamRole: 'ROTATION' })).toBe(false)
    expect(canMentorYoungTeammate({ ...state, history: state.history.slice(1) })).toBe(false)
    expect(canMentorYoungTeammate({ ...state, teamLevel: 'YOUTH' })).toBe(false)
    const captain = { ...state, firstTeamRole: 'ROTATION' as const,
      careerStory: { ...state.careerStory, club: { ...state.careerStory.club, leadership: 'CAPTAIN' as const } } }
    expect(canMentorYoungTeammate(captain)).toBe(true)
  })

  it('requires actual professional/media history for the first press and interview nodes', () => {
    const state = { ...stateAt(), history: [] }
    expect(getV3StoryEvent(state, 'V3_E01_PRESS_DRINK').isEligible(state)).toBe(false)
    expect(getV3StoryEvent(state, 'V3_E03_INTERVIEW_CLIP').isEligible(state)).toBe(false)
    expect(getV3StoryEvent(state, 'V3_E04_FAN_SCHEDULE').isEligible(state)).toBe(true)
    const expired = { ...stateAt(), contract: { ...stateAt().contract!, remainingHalfYears: 0 } }
    expect(getV3StoryEvent(expired, 'V3_E04_FAN_SCHEDULE').isEligible(expired)).toBe(false)
  })
})

describe('V3 finite story scheduling, priority and stable snapshots', () => {
  it.each(Object.values(V3_STORY_CHAINS))('completes both nodes once without changing capabilities: $first', (chain) => {
    const initial = stateAt()
    const initialJson = JSON.stringify(initial)
    const first = choose(initial, chain.first)
    expect(JSON.stringify(initial)).toBe(initialJson)
    const active = first.entertainmentV3!.stories.activeChain!
    expect(active).toMatchObject({ firstWindowIndex: 30, availableFromWindowIndex: 31,
      expiresAfterWindowIndex: 33, clubId: 'ita_inter', sourceRole: 'STARTER' })
    expect(active.firstChoiceTitle).toBe(first.careerEventHistory.at(-1)!.choiceTitle)
    expect(offPitchStoryStateSchema.safeParse(first.entertainmentV3!.stories).success).toBe(true)
    const restored = JSON.parse(JSON.stringify(first)) as GameState
    expect(getV3StoryEvent(advance(restored), chain.followup)).toMatchObject({
      description: getV3StoryEvent(advance(first), chain.followup).description,
      choices: getV3StoryEvent(advance(first), chain.followup).choices.map((choice) => ({
        id: choice.id, effectPreview: choice.effectPreview, outcomeSummary: choice.outcomeSummary,
      })),
    })
    const later = advance(first)
    const second = choose(later, chain.followup)
    expect(second.entertainmentV3!.stories.activeChain).toBeNull()
    expect(second.entertainmentV3!.stories.closedChains[0]?.reason).toBe('COMPLETED')
    expect(second.careerEventHistory.at(-1)?.outcomeSummary).toContain(active.firstChoiceTitle)
    expect(second.player!.attributes).toEqual(initial.player!.attributes)
    expect(second.player!.potentials).toEqual(initial.player!.potentials)
    expect(offPitchStoryStateSchema.safeParse(second.entertainmentV3!.stories).success).toBe(true)
    expect(recordV3StoryChoice(second, second.careerEventHistory.at(-1)!)).toBe(second.entertainmentV3!.stories)
    expect(getV3StoryEvent(advance(second), chain.first).isEligible(advance(second))).toBe(false)
    expect(getV3StoryEvent(advance(second), chain.followup).isEligible(advance(second))).toBe(false)
  })

  it('keeps at most one active chain and rejects same-window followup recording', () => {
    const state = choose(stateAt(), 'V3_C01A_LOCAL_CAR', 'DECLINE')
    expect(getV3StoryEvent(state, 'V3_C02A_PUBLIC_RESPONSE').isEligible(state)).toBe(false)
    const attempted = scheduleV3StoryFollowup(state, recordFor(state, 'V3_C02A_PUBLIC_RESPONSE'))
    expect(attempted).toBe(state.entertainmentV3!.stories)
    expect(recordV3StoryChoice(state, recordFor(state, 'V3_C01B_LOCAL_CAR_RETURN'))).toBe(state.entertainmentV3!.stories)
    expect(getV3StoryEvent(state, 'V3_C01B_LOCAL_CAR_RETURN').isEligible(state)).toBe(false)
  })

  it('uses mandatory transitions/health before followup, then followup before ordinary, without opening a slot', () => {
    const state = advance(choose(stateAt(), 'V3_C01A_LOCAL_CAR'))
    expect(selectV3StoryEvent(state, { ordinaryOpportunity: false, ordinaryEventId: null })).toBeNull()
    expect(selectV3StoryEvent(state, { mandatoryEventId: 'FITNESS_WARNING', ordinaryOpportunity: true,
      ordinaryEventId: 'COACH_DEFENSIVE_TASK' })).toBe('FITNESS_WARNING')
    expect(selectV3StoryEvent(state, { mandatoryEventId: 'FIRST_SENIOR_GOAL_REACTION', ordinaryOpportunity: true,
      ordinaryEventId: 'COACH_DEFENSIVE_TASK' })).toBe('FIRST_SENIOR_GOAL_REACTION')
    expect(selectV3StoryEvent(state, { ordinaryOpportunity: true,
      ordinaryEventId: 'COACH_DEFENSIVE_TASK' })).toBe('V3_C01B_LOCAL_CAR_RETURN')
  })

  it('offers followup through W+3, then factually closes at that report without any reward', () => {
    const first = choose(stateAt(), 'V3_C01A_LOCAL_CAR', 'DECLINE')
    const finalWindow = advance(first, 3)
    expect(selectV3StoryEvent(finalWindow, { ordinaryOpportunity: true })).toBe('V3_C01B_LOCAL_CAR_RETURN')
    expect(closeV3Story(finalWindow)).toBe(finalWindow.entertainmentV3!.stories)
    const before = JSON.stringify(finalWindow)
    const closed = closeV3Story(finalWindow, { atReport: true })
    expect(closed.activeChain).toBeNull()
    expect(closed.closedChains[0]?.reason).toBe('EXPIRED')
    expect(closed.completedNodeIds).toEqual(['V3_C01A_LOCAL_CAR'])
    expect(JSON.stringify(finalWindow)).toBe(before)
    expect(offPitchStoryStateSchema.safeParse(closed).success).toBe(true)
    expect(closeV3Story({ ...finalWindow, entertainmentV3: { ...finalWindow.entertainmentV3!, stories: closed } },
      { atReport: true })).toBe(closed)
    expect(closeV3Story(advance(first, 4)).closedChains[0]?.reason).toBe('EXPIRED')
    expect(offPitchStoryReportHighlight({ ...finalWindow,
      entertainmentV3: { ...finalWindow.entertainmentV3!, stories: closed } })).toContain('三个半年')
  })

  it.each(['C01', 'C02', 'C04'] as const)('keeps %s portable with truthful remote context after a transfer', (id) => {
    const chain = V3_STORY_CHAINS[id]
    const original = choose(stateAt(), chain.first)
    const transferred = moveTo(advance(original), 'eng_arsenal')
    expect(closeV3Story(transferred).activeChain?.chainId).toBe(id)
    expect(getV3StoryEvent(transferred, chain.followup).isEligible(transferred)).toBe(true)
    const continuation = getV3StoryEvent(transferred, chain.followup)
    expect(continuation.description).toContain('已经换队')
    expect(continuation.description).toContain('远程')
    expect(continuation.description).toContain(original.entertainmentV3!.stories.activeChain!.firstChoiceTitle)
  })

  it('does not turn a declined first car invitation into a prior partnership after transfer', () => {
    const declined = choose(stateAt(), 'V3_C01A_LOCAL_CAR', 'DECLINE')
    const later = moveTo(advance(declined), 'eng_arsenal')
    const followup = getV3StoryEvent(later, 'V3_C01B_LOCAL_CAR_RETURN')
    expect(followup.description).toContain('礼貌婉拒这次合作')
    expect(followup.description).toContain('当时联系你的品牌')
    expect(followup.description).not.toContain('前合作方')
    expect(followup.description).not.toContain('上次提出的范围')
    expect(followup.choices.find((choice) => choice.id === 'FULL')).toMatchObject({
      cashDeltaEuro: 600, playerDelta: { fitness: -2, fanRelation: 1 },
    })
  })

  it.each(['TIME', 'NOTES', 'INTRO'])('does not invent weekly mentorship after source choice %s', (firstChoiceId) => {
    const first = choose(stateAt(), 'V3_C03A_YOUNG_TEAMMATE', firstChoiceId)
    const followup = getV3StoryEvent(advance(first), 'V3_C03B_YOUNG_TEAMMATE_RETURN')
    expect(followup.description).toContain(first.careerEventHistory.at(-1)!.choiceTitle)
    expect(followup.description).toContain('上次那次交流')
    expect(followup.description).not.toContain('上次你给他的建议')
    const boundary = followup.choices.find((choice) => choice.id === 'BOUNDARY')!
    expect(boundary.title).toBe('祝福他，调整这次交流')
    expect(boundary.description).not.toContain('固定')
    expect(boundary.outcomeSummary).not.toContain('不再需要固定占用每周时间')
    expect(boundary.playerDelta).toEqual({ morale: 1, squadRelation: 1 })
  })

  it('ends only the original-club mentorship after transfer, or an actual role change', () => {
    const first = choose(stateAt(), 'V3_C03A_YOUNG_TEAMMATE')
    const transferred = moveTo(advance(first), 'eng_arsenal')
    expect(closeV3Story(transferred).closedChains[0]?.reason).toBe('CLUB_CHANGED')
    expect(getV3StoryEvent(transferred, 'V3_C03B_YOUNG_TEAMMATE_RETURN').isEligible(transferred)).toBe(false)
    expect(closeV3Story({ ...advance(first), firstTeamRole: 'FRINGE' }).closedChains[0]?.reason).toBe('ROLE_CHANGED')
  })

  it.each(Object.values(V3_STORY_CHAINS))('does not consume $first on a proposed then canceled retirement', (chain) => {
    const active = choose(stateAt(), chain.first)
    const proposed: GameState = { ...active, phase: 'RETIREMENT_DECISION', retirementReason: 'VOLUNTARY' }
    expect(closeV3Story(proposed)).toBe(active.entertainmentV3!.stories)
    const canceled: GameState = { ...proposed, phase: 'HALF_YEAR_PLAN', retirementReason: null }
    expect(closeV3Story(canceled)).toBe(active.entertainmentV3!.stories)
    const retired: GameState = { ...proposed, phase: 'CAREER_RETIRED' }
    const closed = closeV3Story(retired)
    expect(closed.activeChain).toBeNull()
    expect(closed.closedChains[0]?.reason).toBe('RETIRED')
    expect(closed.completedNodeIds).toEqual([chain.first])
  })

  it('is deterministic, uses a separate random namespace and enforces six-window topic/category spacing', () => {
    const state = stateAt()
    const before = JSON.stringify(state)
    const random = createRandom(state.careerSeed, 'career-event', state.windowIndex)
    const expected = random.next()
    const input = { ordinaryOpportunity: true, ordinaryEventId: null, fullContent: true }
    const first = selectV3StoryEvent(state, input)
    for (let index = 0; index < 10; index += 1) expect(selectV3StoryEvent(state, input)).toBe(first)
    expect(createRandom(state.careerSeed, 'career-event', state.windowIndex).next()).toBe(expected)
    expect(JSON.stringify(state)).toBe(before)
    for (let index = 0; index < 100; index += 1) {
      const candidate = { ...state, careerSeed: `V3-SELECTION-${index}` }
      const selected = selectV3StoryEvent(candidate, { ...input, recentOrdinaryCategories: ['MEDIA', 'MEDIA'] })
      if (selected) expect(getV3StoryEvent(candidate, selected).category).not.toBe('MEDIA')
      candidate.careerEventHistory = [{ ...supportedRecord(29, 'LOW_KEY'), eventId: 'INTERVIEW_MISQUOTE' }]
      expect(selectV3StoryEvent(candidate, input)).not.toBe('V3_E03_INTERVIEW_CLIP')
    }
  })

  it('leaves inactive/legacy state and chosen ordinary IDs untouched', () => {
    const state = stateAt()
    state.entertainmentV3!.activationWindowIndex = 31
    expect(selectV3StoryEvent(state, { ordinaryOpportunity: true, ordinaryEventId: 'COACH_DEFENSIVE_TASK' })).toBe('COACH_DEFENSIVE_TASK')
    expect(recordV3StoryChoice(state, recordFor(state, 'V3_C01A_LOCAL_CAR'))).toBe(state.entertainmentV3!.stories)
    expect(publicImpressions(state)).toEqual([])
    expect(representativeOffPitchStories(state)).toEqual([])
  })
})

describe('V3 public impressions and representative memories', () => {
  it('needs two distinct settled windows, never just an enum or duplicate records in one window', () => {
    const state = stateAt()
    state.careerStory.publicPersona = 'LOW_KEY'
    expect(publicImpressions(state)).toEqual([])
    state.careerEventHistory = [supportedRecord(28, 'LOW_KEY'), supportedRecord(28, 'LOW_KEY')]
    expect(publicImpressions(state)).toEqual([])
    state.careerEventHistory.push(supportedRecord(29, 'LOW_KEY'))
    expect(publicImpressions(state).map((impression) => impression.id)).toEqual(['LOW_KEY'])
    expect(publicImpressions(state)[0]?.evidence).toHaveLength(3)
    state.careerEventHistory = [supportedRecord(29, 'LOW_KEY'), supportedRecord(30, 'LOW_KEY')]
    expect(publicImpressions(state)).toEqual([])
  })

  it('keeps at most two, ranks saved repeated evidence and changes only with repeated recent evidence', () => {
    const state = stateAt()
    state.careerEventHistory = [supportedRecord(23, 'LOW_KEY'), supportedRecord(24, 'LOW_KEY'),
      supportedRecord(25, 'TEAM_FIRST'), supportedRecord(26, 'TEAM_FIRST'),
      supportedRecord(27, 'OUTSPOKEN'), supportedRecord(28, 'OUTSPOKEN')]
    expect(publicImpressions(state).map((impression) => impression.id)).toEqual(['OUTSPOKEN', 'TEAM_FIRST'])
    state.careerEventHistory = [supportedRecord(23, 'LOW_KEY'), supportedRecord(24, 'LOW_KEY'), supportedRecord(29, 'OUTSPOKEN')]
    expect(publicImpressions(state).map((impression) => impression.id)).toEqual(['LOW_KEY'])
    state.careerEventHistory.push(supportedRecord(28, 'OUTSPOKEN'))
    expect(publicImpressions(state).map((impression) => impression.id)).toEqual(['OUTSPOKEN', 'LOW_KEY'])
    state.history.push({ ...state.history.at(-1)!, windowIndex: 33 })
    expect(publicImpressions(state).map((impression) => impression.id)).toEqual(['OUTSPOKEN'])
  })

  it('keeps at most three distinct chronological anecdotes and prioritizes completed chains over recent flavor', () => {
    let state = choose(stateAt(), 'V3_C01A_LOCAL_CAR', 'DECLINE')
    state = choose(advance(state), 'V3_C01B_LOCAL_CAR_RETURN', 'CLOSE')
    state = choose(advance(state), 'V3_E05_OLD_POST')
    state = choose(advance(state), 'V3_E09_LOCAL_RADIO')
    state = choose(advance(state), 'V3_E10_TEAM_PHOTO')
    const stories = representativeOffPitchStories(state)
    expect(stories).toHaveLength(3)
    expect(stories[0]).toMatchObject({ id: 'C01', windowIndex: 30, completed: true })
    expect(stories[0]?.originalChoiceTitle).toBe('礼貌婉拒这次合作')
    expect(stories[0]?.followupChoiceTitle).toBe('感谢邀请，这次不接')
    expect(stories[0]?.followupWindowIndex).toBe(31)
    expect(stories.map((story) => story.windowIndex)).toEqual([30, 33, 34])
    const incomplete = choose(stateAt(), 'V3_C04A_HOMETOWN_CAMP', 'DECLINE')
    expect(representativeOffPitchStories(incomplete)[0]).toMatchObject({ completed: false })
    expect(representativeOffPitchStories(incomplete)[0]?.summary).toContain('后续尚未发生')
  })

  it('uses frozen event-title snapshots for active and closed chains and standalone memories', () => {
    let state = choose(stateAt(), 'V3_C01A_LOCAL_CAR', 'DECLINE')
    state.careerEventHistory[0]!.eventTitle = '保存时的原始合作邀约标题'
    expect(representativeOffPitchStories(state)[0]?.title).toBe('保存时的原始合作邀约标题')
    state = choose(advance(state), 'V3_C01B_LOCAL_CAR_RETURN', 'CLOSE')
    state.careerEventHistory[1]!.eventTitle = '后续标题不应覆盖来源标题'
    expect(representativeOffPitchStories(state)[0]?.title).toBe('保存时的原始合作邀约标题')
    state = choose(advance(state), 'V3_E10_TEAM_PHOTO')
    state.careerEventHistory[2]!.eventTitle = '保存时的球队合照标题'
    const restored = JSON.parse(JSON.stringify(state)) as GameState
    expect(representativeOffPitchStories(restored).map((story) => story.title)).toEqual([
      '保存时的原始合作邀约标题', '保存时的球队合照标题',
    ])
  })

  it('falls back to the catalog title only for older records without a saved title', () => {
    const state = choose(stateAt(), 'V3_C04A_HOMETOWN_CAMP', 'DECLINE')
    const { eventTitle: _title, ...older } = state.careerEventHistory[0]!
    state.careerEventHistory = [older]
    expect(representativeOffPitchStories(state)[0]?.title).toBe(getV3StoryEvent(state, 'V3_C04A_HOMETOWN_CAMP').title)
    const standalone = choose(stateAt(), 'V3_E10_TEAM_PHOTO')
    const { eventTitle: _standaloneTitle, ...olderStandalone } = standalone.careerEventHistory[0]!
    standalone.careerEventHistory = [olderStandalone]
    expect(representativeOffPitchStories(standalone)[0]?.title).toBe(getV3StoryEvent(standalone, 'V3_E10_TEAM_PHOTO').title)
  })
})

describe('V3 bounded strict story persistence', () => {
  it('accepts empty state and rejects duplicate, oversized, unknown or unlinked nodes', () => {
    const empty = createOffPitchStoryState()
    expect(offPitchStoryStateSchema.safeParse(empty).success).toBe(true)
    expect(offPitchStoryStateSchema.safeParse({ ...empty, extra: true }).success).toBe(false)
    expect(offPitchStoryStateSchema.safeParse({ ...empty, completedNodeIds: ['V3_E01_PRESS_DRINK', 'V3_E01_PRESS_DRINK'] }).success).toBe(false)
    expect(offPitchStoryStateSchema.safeParse({ ...empty, completedNodeIds: ['NO_SUCH_NODE'] }).success).toBe(false)
    expect(offPitchStoryStateSchema.safeParse({ ...empty, completedNodeIds: ['V3_C01B_LOCAL_CAR_RETURN'] }).success).toBe(false)
    expect(offPitchStoryStateSchema.safeParse({ ...empty, completedNodeIds: ['V3_C01A_LOCAL_CAR'] }).success).toBe(false)
  })

  it('rejects wrong origin, same-window followup, moved expiry and duplicate chain receipts', () => {
    const state = choose(stateAt(), 'V3_C01A_LOCAL_CAR')
    const stories = state.entertainmentV3!.stories
    expect(offPitchStoryStateSchema.safeParse({ ...stories, activeChain: {
      ...stories.activeChain!, followupEventId: 'V3_C02B_PUBLIC_RESPONSE_RETURN',
    } }).success).toBe(false)
    expect(offPitchStoryStateSchema.safeParse({ ...stories, activeChain: {
      ...stories.activeChain!, availableFromWindowIndex: 30,
    } }).success).toBe(false)
    expect(offPitchStoryStateSchema.safeParse({ ...stories, activeChain: {
      ...stories.activeChain!, expiresAfterWindowIndex: 200,
    } }).success).toBe(false)
    const complete = choose(advance(state), 'V3_C01B_LOCAL_CAR_RETURN').entertainmentV3!.stories
    expect(offPitchStoryStateSchema.safeParse({ ...complete, closedChains: [...complete.closedChains, ...complete.closedChains] }).success).toBe(false)
    expect(offPitchStoryStateSchema.safeParse({ ...complete, closedChains: [{ ...complete.closedChains[0]!, closedAtWindowIndex: 30 }] }).success).toBe(false)
  })
})
