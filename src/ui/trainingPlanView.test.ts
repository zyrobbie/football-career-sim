import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { GameState } from '../models/game'
import { trainingPlanView, trainingSubmission } from './trainingPlanView'
const base = JSON.parse(readFileSync('docs/evidence/CEU-20260907/S0-v11-supplement/fixtures/PLAN_35.json', 'utf8')).data as GameState
function game(age: number) { const state = structuredClone(base); state.windowIndex = (age - 13) * 2; state.player!.form = state.player!.fitness = state.player!.morale = 80; return state }
describe('training presentation contract', () => {
  it.each([30,31,33,34,36,37])('uses appropriate options/default at age %i without changing state', age => {
    const state = game(age); const before = structuredClone(state); const model = trainingPlanView(state)
    expect(model.options.map(option => option.id)).toEqual(age <= 30 ? ['attack','defense','physical','mental','BALANCED','ADAPTATION'] : age <= 33 ? ['attack','defense','mental','BALANCED','BODY_CARE','MENTAL_RESET'] : ['BODY_CARE','MATCH_SHARPNESS','MENTAL_RESET'])
    expect(model.initialFocus).toBe(age <= 30 ? 'physical' : 'BODY_CARE')
    if (age >= 37) expect(model.ageNote).toContain('衰退正在加快')
    expect(state).toEqual(before)
  })
  it.each(['fitness','form','morale'] as const)('previews recovery at %s45 but not46, overriding both choices only for veterans', key => {
    for (const age of [30,31,35]) for (const value of [45,46]) {
      const state=game(age);state.player![key]=value
      expect(trainingPlanView(state).recovery).toBe(age>=31 && value===45)
      const result=trainingSubmission(state,{focus: age<=30?'attack':'MENTAL_RESET',approach:'PUSH'})
      expect(result).toEqual(age>=31 && value===45 ? {focus:'BODY_CARE',approach:'STEADY'} : {focus:age<=30?'attack':'MENTAL_RESET',approach:'PUSH'})
    }
  })
  it.each([95,100])('blocks new saturated selections at %i, preserves saved choice and body maintenance', value => {
    const state=game(35);state.player!.form=state.player!.morale=state.player!.fitness=value
    const model=trainingPlanView(state)
    expect(model.options.map(option=>Boolean(option.disabledReason))).toEqual([false,true,true])
    expect(trainingSubmission(state,{focus:'MATCH_SHARPNESS',approach:'STEADY'})).toBeNull()
    state.trainingFocus='attack'
    expect(trainingPlanView(state).initialFocus).toBe('MATCH_SHARPNESS')
    expect(trainingSubmission(state,{focus:'MATCH_SHARPNESS',approach:'STEADY'})).toEqual({focus:'MATCH_SHARPNESS',approach:'STEADY'})
  })
  it('keys local selection by career, window and saved plan, not ordinary rerender or state values', () => {
    const state=game(35); const key=trainingPlanView(state).key
    state.player!.fitness=50;expect(trainingPlanView(state).key).toBe(key)
    state.windowIndex++;expect(trainingPlanView(state).key).not.toBe(key)
    expect(trainingPlanView(state).initialFocus).toBe('BODY_CARE')
    state.trainingFocus='mental';expect(trainingPlanView(state).initialFocus).toBe('MENTAL_RESET')
  })
})
