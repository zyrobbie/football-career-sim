import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import type { GameState } from '../models/game'
import { saveGame, loadGame, validateGameState } from '../persistence/save'
import { useGameStore } from './gameStore'
import * as plans from '../engine/trainingPlan'
import * as professional from '../engine/simulateProfessionalHalfYear'
import { eligibleCareerEventChoices, getCareerEvent } from '../engine/careerEvents'
const store = () => useGameStore.getState()
function input(name = 'RESULT_physical'): GameState {
  const data = JSON.parse(readFileSync(`docs/evidence/CEU-20260907/S0-v11-supplement/fixtures/${name}.json`, 'utf8')).data
  return validateGameState(data)
}
function install(state: GameState) {
  const memory = new Map<string, string>()
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } })
  useGameStore.setState({ game: null, error: null, hasSave: false })
  saveGame(state); store().continueCareer(); expect(store().error).toBeNull()
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); useGameStore.setState({ game: null, error: null, hasSave: false }) })

it.each([{ before: 46, delta: -1, recovery: true }, { before: 45, delta: 1, recovery: false }])('decides recovery AFTER due consequences ($before, $delta) and consumes bonuses once', ({ before, delta, recovery }) => {
  const state = input()
  state.player = { ...state.player!, fitness: before, form: 80, morale: 80 }
  state.developmentApproach = 'PUSH'
  state.trainingFocus = 'physical'
  state.trainingQualityBonus = 2
  const sourceEventId = state.pendingCareerEvent!.eventId
  const future = { id: 'future', sourceEventId, applyAtWindow: state.windowIndex + 1, playerDelta: { morale: 2 }, trainingBonus: 1, summary: '未来后果' }
  state.pendingConsequences = [{ id: 'due', sourceEventId, applyAtWindow: state.windowIndex, playerDelta: { fitness: delta }, trainingBonus: 3, summary: '构造到期后果阈值验证' }, future]
  const executionSpy = vi.spyOn(plans, 'applyTrainingMaintenance')
  const engineSpy = vi.spyOn(professional, 'simulateProfessionalHalfYear')
  install(state)
  const canonical = structuredClone(store().game!)
  store().continueCareer(); expect(store().game).toEqual(canonical)
  expect(engineSpy).not.toHaveBeenCalled()
  store().continueAfterCareerEvent(); expect(store().error).toBeNull()
  const engineInput = engineSpy.mock.calls[0]![0].state
  expect(engineInput.trainingQualityBonus).toBe(5)
  expect(engineInput.player!.fitness).toBe(before + delta)
  const execution = executionSpy.mock.results[0]!.value as plans.TrainingExecution
  expect(execution.recovery).toBe(recovery)
  expect(execution.declineFitness).toBe(recovery ? 55 : 42)
  expect(execution.gains.fitness).toBe(recovery ? 0 : 4)
  const final = structuredClone(store().game!)
  expect(final.pendingConsequences).toEqual([future])
  expect(final.trainingQualityBonus).toBe(0)
  expect(final.careerEventHistory).toEqual(state.careerEventHistory)
  expect(final.history.at(-1)!.trainingFocus).toBe('BODY_CARE')
  expect(final.lastReport!.consequenceSummaries).toContain('构造到期后果阈值验证')
  for (let i = 0; i < 3; i++) store().continueCareer()
  expect(engineSpy).toHaveBeenCalledTimes(1)
  expect(store().game).toEqual(final)
})

it('applies a real immediate event choice only once before the authority recovery check', () => {
  const state = input('EVENT_physical')
  state.player = { ...state.player!, form: 80, morale: 80, fitness: 46 }
  install(state)
  // Follow this actual saved event's route and a legal choice, never select another event.
  for (let i = 0; i < 2 && store().game!.phase === 'SPECIAL_EVENT'; i++) {
    const game = store().game!; const pending = game.pendingCareerEvent!; const event = getCareerEvent(pending.eventId)
    const eligible = eligibleCareerEventChoices(game, event)
    const route = event.setup?.options.find(option => option.id === pending.variantId)
    const choice = event.setup && pending.stepIndex === 0 ? event.setup.options.find(option => option.choiceIds.some(id => eligible.some(c => c.id === id)))!.id : eligible.find(c => !route || route.choiceIds.includes(c.id))!.id
    store().chooseCareerEvent(choice); expect(store().error).toBeNull()
  }
  expect(store().game!.phase).toBe('SPECIAL_EVENT_RESULT')
  const resolved = structuredClone(store().game!)
  expect(resolved.careerEventHistory).toHaveLength(state.careerEventHistory.length + 1)
  store().continueCareer(); expect(store().game).toEqual(resolved)
  const spy = vi.spyOn(plans, 'applyTrainingMaintenance')
  store().continueAfterCareerEvent()
  const execution = spy.mock.results[0]!.value as plans.TrainingExecution
  expect(execution.before.fitness).toBe(resolved.player!.fitness)
  expect(execution.recovery).toBe(Math.min(resolved.player!.form, resolved.player!.fitness, resolved.player!.morale) < 46)
  expect(store().game!.careerEventHistory).toEqual(resolved.careerEventHistory)
})

it.each([false, true])('persists actual training explanation through special event, cash cap, contract and national-team report assembly (recovery=%s)', recovery => {
  const state = input()
  state.player = { ...state.player!, attributes: { attack: 94, defense: 94, physical: 94, mental: 94 }, potentials: { attack: 94, defense: 94, physical: 94, mental: 94 }, form: 90, morale: 90, fitness: recovery ? 45 : 80, reputation: 95 }
  state.cashEuro = 1_000_000_000
  state.firstTeamRole = 'CORE'
  state.contract = { ...state.contract!, promisedRole: 'CORE' }
  state.trainingFocus = 'BODY_CARE'
  state.pendingConsequences = []
  install(state)
  store().continueAfterCareerEvent()
  expect(store().error).toBeNull()
  const final = structuredClone(store().game!)
  const report = final.lastReport!
  expect(report.specialEvent).toBeDefined()
  expect(report.contract).toBeDefined()
  expect(report.nationalTeam!.calledUp).toBe(true)
  expect(report.hints).toHaveLength(3)
  expect(report.hints.some(h => h.includes('现金储备'))).toBe(true)
  expect(report.hints.some(h => h.includes('合同'))).toBe(true)
  expect(report.hints).toContain(report.nationalTeam!.summary)
  expect(report.eventSummary).toContain('本期训练：身体维护')
  expect(report.eventSummary).toContain(recovery ? '自动恢复优先' : '训练准备身体+4、竞技−2')
  saveGame(final); expect(loadGame()).toEqual(final)
  store().continueCareer(); expect(store().game).toEqual(final)
})

it('canonicalizes a new legacy choice before event selection and both history/save writes', () => {
  const state = input('PLAN_35')
  install(state)
  store().chooseTraining('physical', 'STEADY')
  expect(store().error).toBeNull()
  expect(store().game!.trainingFocus).toBe('BODY_CARE')
  expect(loadGame()!.trainingFocus).toBe('BODY_CARE')
})

it.each([{ fitness: 46, choice: 'C', after: 45, recovery: true }, { fitness: 45, choice: 'A', after: 49, recovery: false }])('uses real immediate event fitness $fitness → $after before deciding recovery', ({ fitness, choice, after, recovery }) => {
  const state = input('EVENT_attack')
  state.player = { ...state.player!, fitness, form: 80, morale: 80 }
  state.pendingConsequences = []
  install(state)
  store().chooseCareerEvent(choice)
  expect(store().error).toBeNull()
  expect(store().game!.player!.fitness).toBe(after)
  const result = structuredClone(store().game!)
  store().continueCareer(); expect(store().game).toEqual(result)
  const spy = vi.spyOn(plans, 'applyTrainingMaintenance')
  store().continueAfterCareerEvent()
  const execution = spy.mock.results[0]!.value as plans.TrainingExecution
  expect(execution.before.fitness).toBe(after)
  expect(execution.recovery).toBe(recovery)
  expect(store().game!.careerEventHistory).toEqual(result.careerEventHistory)
})

it('validates save and data version independently without rewriting pending focus during migration', () => {
  const data = JSON.parse(readFileSync('docs/evidence/CEU-20260907/S0-v11-supplement/fixtures/READY_attack.json', 'utf8')).data
  expect(validateGameState(data)).toEqual({ ...data, saveVersion: 12, dataVersion: 12 })
  expect(() => validateGameState({ ...data, dataVersion: 12 })).toThrow()
  expect(() => validateGameState({ ...data, saveVersion: 12 })).toThrow()
})
