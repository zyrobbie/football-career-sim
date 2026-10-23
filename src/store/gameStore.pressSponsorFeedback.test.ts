import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import type { GameState } from '../models/game'
import { useGameStore } from './gameStore'
import { getCareerEvent, eligibleCareerEventChoices } from '../engine/careerEvents'
import { createOffPitchStoryState } from '../models/offPitchStories'
import { LEGACY_PRESS_DRINK_EVENT } from '../data/offPitchStories'
import { installTestStorage, completePendingMoment } from '../testing/keyMatchMomentTestSupport'
import { loadGame, saveGame } from '../persistence/save'
const store = () => useGameStore.getState()
function pending(cashEuro: number): GameState {
  // A persisted real public flow, with only the tested event and cash explicitly constructed.
  const flow = JSON.parse(readFileSync('docs/evidence/FUN-V3-20261023/public-flows/first-loop-public-flow.json', 'utf8'))
  const raw = flow.steps.find((step: {after: {phase: string; W: number}}) => step.after.phase === 'HALF_YEAR_PLAN' && step.after.W === 42).raw
  const game: GameState = JSON.parse(raw).data
  return {...game, phase: 'SPECIAL_EVENT', cashEuro, trainingFocus: 'BALANCED', developmentApproach: 'STEADY',
    pendingKeyMatchMoment: null,
    pendingCareerEvent: {eventId:'V3_E01_PRESS_DRINK',interactionKind:'CHOICE',stepIndex:0,selections:[],variantId:null},
    careerEventHistory: game.careerEventHistory.filter(r => !r.eventId.startsWith('V3_')),
    entertainmentV3: {...game.entertainmentV3!, stories:createOffPitchStoryState()}}
}
function install(game: GameState) {
  installTestStorage()
  useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})
  saveGame(game)
  store().continueCareer()
  expect(store().error).toBeNull()
}
afterEach(() => vi.unstubAllGlobals())
describe('press bottle sponsor correction and old-save compatibility', () => {
  it.each([
    ['IGNORE', '无视这个矿泉水', 1, -200],
    ['TURN', '把矿泉水 logo 转向背面', -1, 400],
    ['DRINK', '拿起来喝一口', 2, -400],
  ] as const)('settles %s as media versus one-time sponsor income, persists, and never repeats', (id, title, media, cash) => {
    const game = pending(5_000)
    install(game)
    const event = getCareerEvent('V3_E01_PRESS_DRINK', game)
    expect(event.description).toContain('刚签下个人矿泉水赞助合作')
    expect(event.description).toContain('竞品')
    expect(eligibleCareerEventChoices(game,event)).toHaveLength(3)
    store().chooseCareerEvent(id)
    expect(store().error).toBeNull()
    const result = structuredClone(store().game!)
    const record = result.careerEventHistory.at(-1)!
    expect(record).toMatchObject({choiceId:id,choiceTitle:title,eventTitle:'发布会的矿泉水瓶',appliedDelta:{mediaRelation:media},cashDeltaEuro:cash})
    expect(result.cashEuro).toBe(game.cashEuro + cash)
    expect(result.contract).toEqual(game.contract)
    expect(result.player!.attributes).toEqual(game.player!.attributes)
    expect(loadGame()).toEqual(result)
    store().chooseCareerEvent(id)
    expect(store().game).toEqual(result)
    useGameStore.setState({game:null,error:null})
    store().continueCareer()
    expect(store().game).toEqual(result)
    store().continueAfterCareerEvent()
    expect(store().error).toBeNull()
    completePendingMoment(store)
    expect(store().game!.phase).toBe('HALF_YEAR_REPORT')
    expect(store().game!.careerEventHistory.at(-1)).toEqual(record)
    expect(loadGame()).toEqual(store().game)
  })
  it('does not schedule the sponsor tradeoff without sufficient cash for all three choices', () => {
    const game = pending(399)
    const unscheduled = {...game, pendingCareerEvent:null, phase:'HALF_YEAR_PLAN' as const}
    expect(getCareerEvent('V3_E01_PRESS_DRINK',unscheduled).isEligible(unscheduled)).toBe(false)
    const funded = {...unscheduled,cashEuro:400}
    expect(getCareerEvent('V3_E01_PRESS_DRINK',funded).isEligible(funded)).toBe(true)
  })
  it.each(['MOVE','JOKE','STAFF'])('finishes legacy low-cash pending %s without trapping or charging the save', id => {
    const game = pending(0)
    install(game)
    expect(getCareerEvent('V3_E01_PRESS_DRINK',game).title).toBe(LEGACY_PRESS_DRINK_EVENT.title)
    expect(eligibleCareerEventChoices(game,getCareerEvent('V3_E01_PRESS_DRINK',game))).toHaveLength(3)
    store().chooseCareerEvent(id)
    expect(store().error).toBeNull()
    const record = structuredClone(store().game!.careerEventHistory.at(-1)!)
    expect(record.eventTitle).toBe(LEGACY_PRESS_DRINK_EVENT.title)
    expect(record.cashDeltaEuro).toBe(0)
    expect(record.appliedDelta).toEqual(id === 'JOKE' ? {mediaRelation:1} : {})
    expect(store().game!.entertainmentV3!.stories.completedNodeIds).toContain('V3_E01_PRESS_DRINK')
    expect(loadGame()).toEqual(store().game)
    useGameStore.setState({game:null,error:null})
    store().continueCareer()
    expect(store().game!.careerEventHistory.at(-1)).toEqual(record)
    store().continueAfterCareerEvent()
    expect(store().error).toBeNull()
    completePendingMoment(store)
    expect(store().game!.phase).toBe('HALF_YEAR_REPORT')
    expect(store().game!.careerEventHistory.at(-1)).toEqual(record)
    expect(loadGame()).toEqual(store().game)
  })
})
