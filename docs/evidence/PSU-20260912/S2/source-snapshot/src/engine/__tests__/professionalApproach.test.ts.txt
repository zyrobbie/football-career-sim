import { afterEach, expect, it, vi } from 'vitest'
import { createTrainingBaselineState } from './ceuTrainingBaselineFixture'
import { adjustedProfessionalRange, prepareProfessionalWindow, professionalInjuryRisk } from '../professionalApproach'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import * as rng from '../random'
const fixture = () => {
  const { state, academy } = createTrainingBaselineState('psu-unit')
  state.windowIndex = 22; state.firstTeamRole = 'FRINGE'
  Object.assign(state.player!, { form: 70, fitness: 70, morale: 70, squadRelation: 60, coachRelation: 60 })
  return { state, academy }
}
afterEach(() => vi.restoreAllMocks())
it('applies each approved preparation and resolves null as STEADY without mutating player', () => {
  const p=fixture().state.player!, original=structuredClone(p)
  const push=prepareProfessionalWindow(p,'PUSH'),steady=prepareProfessionalWindow(p,'STEADY'),team=prepareProfessionalWindow(p,'TEAM_FIRST')
  expect(push.preparationChanges).toEqual({coachRelation:3,squadRelation:0,form:0,fitness:-4,morale:0})
  expect(steady.preparationChanges).toEqual({coachRelation:0,squadRelation:0,form:3,fitness:2,morale:0})
  expect(team.preparationChanges).toEqual({coachRelation:0,squadRelation:5,form:0,fitness:0,morale:3})
  expect(prepareProfessionalWindow(p,null)).toEqual(steady);expect(p).toEqual(original)
})
it('checks support once at45, not46/47 or after PUSH cost; disables every strategy modifier',()=>{
  for(const key of ['form','fitness','morale'] as const) for(const n of [45,46,47]) {
    const p=fixture().state.player!;p[key]=n
    for(const a of ['PUSH','STEADY','TEAM_FIRST',null] as const){const r=prepareProfessionalWindow(p,a);expect(r.recovery).toBe(n===45);if(n===45){expect(r.effectiveApproach).toBeNull();expect(r.trainingBonus).toBe(0);expect(r.matchModifiers).toEqual({appearanceRateBonus:0,startRateBonus:0,injuryRiskDelta:0});expect(r.player[key]).toBe(n+({form:7,fitness:10,morale:8}[key]));expect(r.player.squadRelation).toBe(60)}}
  }
  const p=fixture().state.player!;p.fitness=46;const r=prepareProfessionalWindow(p,'PUSH');expect(r.player.fitness).toBe(42);expect(r.recovery).toBe(false)
})
it('uses actual capped preparation changes and keeps recovery injury range distinct',()=>{
  const p=fixture().state.player!;Object.assign(p,{form:100,fitness:100,morale:100,squadRelation:100,coachRelation:100});p.attributes.physical=100
  expect(prepareProfessionalWindow(p,'TEAM_FIRST').preparationChanges.squadRelation).toBe(0)
  const r=prepareProfessionalWindow(p,'STEADY');expect(r.preparationChanges.form).toBe(0);expect(professionalInjuryRisk(r.player,r.matchModifiers,false)).toBe(.015)
  expect(professionalInjuryRisk(r.player,r.matchModifiers,true)).toBe(.03)
  // Arithmetic clamp boundary only, not a legal saved player or observed probability.
  expect(professionalInjuryRisk({...p,fitness:-100},r.matchModifiers,true)).toBe(.12)
  expect(professionalInjuryRisk(p,{appearanceRateBonus:0,startRateBonus:0,injuryRiskDelta:1},false)).toBe(.16)
})
it('matches published normal probability example and ignores modifiers during recovery',()=>{
  const p=fixture().state.player!;p.fitness=50;p.attributes.physical=45
  const a=prepareProfessionalWindow(p,'PUSH'),b=prepareProfessionalWindow(p,'STEADY')
  expect(professionalInjuryRisk(a.player,a.matchModifiers,false)).toBeCloseTo(.069,12)
  expect(professionalInjuryRisk(b.player,b.matchModifiers,false)).toBeCloseTo(.023,12)
  expect(professionalInjuryRisk(a.player,a.matchModifiers,true)).toBeCloseTo(.044,12)
})
it('clamps both range ends, allows rounded18, and retains starts <= appearances',()=>{
  expect(adjustedProfessionalRange([.8,.95],.1,.98)).toEqual([.9,.98])
  const lowerStart=adjustedProfessionalRange([0,.1],-.06,1);expect(lowerStart[0]).toBe(0);expect(lowerStart[1]).toBeCloseTo(.04,12)
  const {state,academy}=fixture();state.firstTeamRole='CORE';state.developmentApproach='PUSH'
  const original=rng.createRandom;vi.spyOn(rng,'createRandom').mockImplementation((...parts)=>{const r=original(...parts);return parts.includes('professional-appearances')?{...r,float:(_min,max)=>max}:parts.includes('professional-injury')?{...r,next:()=>1}:r})
  const r=simulateProfessionalHalfYear({state,offer:academy});expect(r.report.stats.appearances).toBe(18);expect(r.report.stats.starts).toBe(18)
})
it('removes young recovery TEAM_FIRST residue but retains normal high-appearance reward',()=>{
  const {state,academy}=fixture();state.player!.form=45
  const results=['STEADY','PUSH','TEAM_FIRST'].map(developmentApproach=>simulateProfessionalHalfYear({state:{...state,developmentApproach:developmentApproach as 'STEADY'},offer:academy}))
  expect(results[1]).toEqual(results[0]);expect(results[2]).toEqual(results[0]);expect(results[0]!.player.squadRelation).toBe(60)
  state.firstTeamRole='CORE';const r=simulateProfessionalHalfYear({state:{...state,developmentApproach:'TEAM_FIRST'},offer:academy});expect(r.report.stats.appearances).toBeGreaterThanOrEqual(10);expect(r.player.squadRelation).toBe(62)
})
