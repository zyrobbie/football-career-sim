import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { AcademyOffer, GameState, TrainingFocus } from '../../models/game'
import { attributeKeys } from '../../models/game'
import * as plans from '../trainingPlan'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import { simulateHalfYear } from '../simulateHalfYear'
import { developAttributesByAge } from '../ageDevelopment'
import { createRandom } from '../random'
import { developmentMultiplierFromTraining } from '../trainingQuality'
const dir = 'docs/evidence/CEU-20260907/T-01/training-v11'
type Row = { age: number; position: string; seed: string; variant: string; input: { state: GameState; academy: AcademyOffer }; results: { focus: TrainingFocus; output: ReturnType<typeof simulateProfessionalHalfYear> }[] }
function frozen(name: string): Row[] {
  const raw = readFileSync(`${dir}/${name}.json`)
  const hashes = JSON.parse(readFileSync(`${dir}/artifact-hashes.json`, 'utf8'))
  expect(createHash('sha256').update(raw).digest('hex')).toBe(hashes[`${name}.json`].sha256)
  expect(raw.length).toBe(hashes[`${name}.json`].bytes)
  return JSON.parse(raw.toString())
}
const focuses = ['BODY_CARE', 'MATCH_SHARPNESS', 'MENTAL_RESET'] as const
const round = (x: number) => Math.round(x * 10) / 10
const bounded = (x: number) => Math.min(100, Math.max(0, x))
afterEach(() => vi.restoreAllMocks())

it('normalizes only pending windows, is idempotent, preserves null and historical contexts', () => {
  const row = frozen('representative-full')[0]!
  for (const age of [30, 31, 33, 34, 36, 37, 39]) for (const focus of [null, 'attack', 'defense', 'physical', 'mental', 'BALANCED', 'ADAPTATION', ...focuses] as const) {
    const expected = focus === null || age <= 30 ? focus : focus === 'physical' ? 'BODY_CARE' : focus === 'ADAPTATION' ? 'MENTAL_RESET' : age >= 34 && focus === 'mental' ? 'MENTAL_RESET' : age >= 34 && ['attack', 'defense', 'BALANCED'].includes(focus) ? 'MATCH_SHARPNESS' : focus
    for (const phase of ['HALF_YEAR_PLAN', 'SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT', 'SIMULATION_READY', 'HALF_YEAR_REPORT', 'PRO_STAGE_COMPLETE', 'TRANSFER_WINDOW', 'CAREER_RETIRED'] as const) {
      const state = { ...row.input.state, phase, windowIndex: (age - 13) * 2, trainingFocus: focus }
      const actual = plans.normalizePendingTraining(state)
      expect(actual.trainingFocus).toBe(['HALF_YEAR_PLAN', 'SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT', 'SIMULATION_READY'].includes(phase) ? expected : focus)
      expect(plans.normalizePendingTraining(actual)).toBe(actual)
      expect(actual.history).toBe(state.history)
    }
  }
})

it('executes age/state/potential boundaries with exact recovery, costs and decline in both engines', () => {
  const spy = vi.spyOn(plans, 'applyTrainingMaintenance')
  for (const row of frozen('boundary-full')) for (const focus of focuses) {
    const state = structuredClone(row.input.state)
    state.trainingFocus = focus
    for (const approach of ['STEADY', 'PUSH', 'TEAM_FIRST'] as const) {
      state.developmentApproach = approach
      const before = state.player!
      const recovery = Math.min(before.form, before.fitness, before.morale) < 46
      const result = simulateProfessionalHalfYear({ state, offer: row.input.academy })
      const execution = spy.mock.results.at(-1)!.value as plans.TrainingExecution | null
      if (row.age <= 30) { expect(execution).toBeNull(); continue }
      expect(execution!.recovery).toBe(recovery)
      const prepared = spy.mock.calls.at(-1)![1]
      const target = focus === 'BODY_CARE' ? 'fitness' : focus === 'MATCH_SHARPNESS' ? 'form' : 'morale'
      const costKey = focus === 'MATCH_SHARPNESS' ? 'fitness' : 'form'
      const expected = { form: before.form, fitness: before.fitness, morale: before.morale }
      if (recovery) {
        if (expected.form < 46) expected.form += 7
        if (expected.fitness < 46) expected.fitness += 10
        if (expected.morale < 46) expected.morale += 8
        expect(prepared.coachRelation).toBe(before.coachRelation)
        expect(prepared.squadRelation).toBe(before.squadRelation)
        expect(execution!.gains).toEqual({ form: 0, fitness: 0, morale: 0 })
        expect(execution!.costs).toEqual({ form: 0, fitness: 0, morale: 0 })
        expect(execution!.physicalDeclineMultiplier).toBe(1)
        expect(result.report.eventSummary).toContain('自动恢复优先')
      } else {
        if (approach === 'PUSH') expected.fitness -= 4
        if (approach === 'STEADY') { expected.fitness = bounded(expected.fitness + 2); expected.form = bounded(expected.form + 3) }
        if (approach === 'TEAM_FIRST') expected.morale = bounded(expected.morale + 3)
        expect(execution!.declineFitness).toBe(expected.fitness)
        const gain = Math.min(4, Math.max(0, 95 - expected[target]))
        const cost = Math.min(expected[costKey], costKey === 'fitness' ? 3 : 2)
        expect(execution!.gains[target]).toBe(gain)
        expect(execution!.costs[costKey]).toBe(cost)
        expected[target] += gain; expected[costKey] -= cost
        if (gain === 0) expect(result.report.eventSummary).toContain('准备收益为0')
      }
      for (const key of ['form', 'fitness', 'morale'] as const) {
        expect(prepared[key]).toBe(expected[key])
        expect(result.player[key]).toBeGreaterThanOrEqual(0); expect(result.player[key]).toBeLessThanOrEqual(100)
      }
      const decline = row.age <= 33 ? 0.4 : row.age <= 36 ? 0.7 : 1.1
      const management = Math.max(0.8, Math.min(1.5, 1.5 - execution!.declineFitness * 0.007))
      const factor = focus === 'BODY_CARE' && !recovery ? 0.8 : 1
      expect(result.player.attributes.physical).toBe(round(Math.max(20, before.attributes.physical - decline * management * factor)))
      expect(execution!.physicalDeclineSaved).toBeCloseTo(decline * management * (1 - factor), 12)
      for (const key of attributeKeys) { expect(result.player.attributes[key]).toBeLessThanOrEqual(before.potentials[key]); expect(result.player.attributes[key]).toBeGreaterThanOrEqual(20) }
      // Direct youth entry still shares maintenance interpretation (even though age eligibility normally promotes).
      const youth = simulateHalfYear({ player: before, offer: row.input.academy, role: 'STARTER', arrivalChoice: null, careerSeed: state.careerSeed, startYear: state.startYear, windowIndex: state.windowIndex, cashBeforeEuro: 0, developmentApproach: approach, trainingFocus: focus })
      const youthExecution = spy.mock.results.at(-1)!.value as plans.TrainingExecution
      // PSU changes professional preparation only. Youth retains its old +1/-3 fitness.
      const youthFitness = recovery ? (before.fitness < 46 ? before.fitness + 10 : before.fitness) : approach === 'STEADY' ? bounded(before.fitness + 1) : approach === 'PUSH' ? before.fitness - 3 : before.fitness
      expect(youthExecution.recovery).toBe(recovery)
      expect(youthExecution.declineFitness).toBe(youthFitness)
      expect(youthExecution.physicalDeclineMultiplier).toBe(factor)
      expect(youthExecution.costs).toEqual(execution!.costs)
      const youthManagement = Math.max(0.8, Math.min(1.5, 1.5 - youthFitness * 0.007))
      expect(youth.player.attributes.physical).toBe(round(Math.max(20, before.attributes.physical - decline * youthManagement * factor)))
      expect(youth.report.eventSummary).toContain(`本期训练：${plans.MAINTENANCE_LABELS[focus]}`)
    }
  }
})

it('uses positional shares and the existing 0.9 training multiplier for maintenance; respects the ability floor', () => {
  const state = frozen('representative-full')[0]!.input.state
  for (const focus of focuses) {
    expect(plans.resolveTrainingPlan('CM', focus).shares).toEqual(plans.resolveTrainingPlan('CM', 'ADAPTATION').shares)
    const input = { trainingQuality: 80, roleExposure: 70, squadRelation: 70, fitness: 80, morale: 80 }
    expect(developmentMultiplierFromTraining({ ...input, focus })).toBe(developmentMultiplierFromTraining({ ...input, focus: 'ADAPTATION' }))
  }
  const player = structuredClone(state.player!)
  player.attributes.physical = 20.01
  const prepared = structuredClone(player)
  const execution = plans.applyTrainingMaintenance(player, prepared, 39, 'BODY_CARE')!
  const attributes = developAttributesByAge({ player: prepared, age: 39, developmentMultiplier: 1, trainingShares: plans.resolveTrainingPlan('CM', 'BODY_CARE').shares, random: createRandom('floor'), trainingExecution: execution })
  expect(attributes.physical).toBe(20)
  expect(execution.physicalDeclineSaved).toBe(0)
})

it('pairs three maintenance plans with all 300 frozen representative inputs and publishes descriptive statistics', () => {
  const spy = vi.spyOn(plans, 'applyTrainingMaintenance')
  const samples = []
  for (const row of frozen('representative-full')) for (const focus of focuses) {
    const state = { ...structuredClone(row.input.state), trainingFocus: focus }
    const actual = simulateProfessionalHalfYear({ state, offer: row.input.academy })
    const execution = spy.mock.results.at(-1)!.value as plans.TrainingExecution
    const baseline = row.results.find(result => result.focus === 'BALANCED')!.output
    expect(execution.recovery).toBe(false)
    expect(execution.declineFitness).toBe(82)
    expect(execution.gains).toEqual({ form: focus === 'MATCH_SHARPNESS' ? 4 : 0, fitness: focus === 'BODY_CARE' ? 4 : 0, morale: focus === 'MENTAL_RESET' ? 4 : 0 })
    expect(execution.costs).toEqual({ form: focus === 'MATCH_SHARPNESS' ? 0 : 2, fitness: focus === 'MATCH_SHARPNESS' ? 3 : 0, morale: 0 })
    expect(execution.physicalDeclineSaved).toBeCloseTo(focus === 'BODY_CARE' ? 0.7 * (1.5 - 82 * 0.007) * 0.2 : 0, 12)
    expect(actual.player.attributes.physical).toBe(focus === 'BODY_CARE' ? 69.5 : 69.4)
    samples.push({ position: row.position, seed: row.seed, focus, execution, delta: { rating: actual.report.stats.averageRating - baseline.report.stats.averageRating, goals: actual.report.stats.goals - baseline.report.stats.goals, assists: actual.report.stats.assists - baseline.report.stats.assists, minutes: actual.report.stats.minutes - baseline.report.stats.minutes, physical: actual.player.attributes.physical - baseline.player.attributes.physical, form: actual.player.form - baseline.player.form, fitness: actual.player.fitness - baseline.player.fitness, morale: actual.player.morale - baseline.player.morale } })
  }
  expect(samples).toHaveLength(900)
  const summary = []
  for (const position of ['ST', 'CM', 'CB']) for (const focus of focuses) {
    const selected = samples.filter(row => row.position === position && row.focus === focus)
    const metrics = Object.fromEntries(Object.keys(selected[0]!.delta).map(key => {
      const values = selected.map(row => row.delta[key as keyof typeof row.delta])
      return [key, { mean: values.reduce((a, b) => a + b, 0) / values.length, min: Math.min(...values), max: Math.max(...values), higher: values.filter(v => v > 0).length, equal: values.filter(v => v === 0).length, lower: values.filter(v => v < 0).length }]
    }))
    summary.push({ position, focus, count: selected.length, metrics })
  }
  if (process.env.CEU_T02_EVIDENCE === '1') writeFileSync('docs/evidence/CEU-20260907/T-02/maintenance-pairs.json', JSON.stringify({ baseline: 'frozen v11 BALANCED output, same input/seed', note: 'HalfYearStats has no match win/loss field; higher/equal/lower describes paired metric differences, not actual match wins. No final balance approval.', summary, samples }, null, 2) + '\n', { flag: 'wx' })
})

it('suppresses post-match strategy relations and youth progress bonuses in an older recovery window', () => {
  const row = frozen('representative-full')[0]!
  const state = structuredClone(row.input.state)
  state.player!.fitness = 45
  state.firstTeamRole = 'FRINGE'
  state.trainingFocus = 'BODY_CARE'
  const professional = ['STEADY', 'PUSH', 'TEAM_FIRST'].map(approach => simulateProfessionalHalfYear({ state: { ...state, developmentApproach: approach as GameState['developmentApproach'] }, offer: row.input.academy }))
  for (const actual of professional) expect(actual).toEqual(professional[0])
  const youth = (['STEADY', 'PUSH', 'TEAM_FIRST'] as const).map(developmentApproach => simulateHalfYear({ player: state.player!, offer: row.input.academy, role: 'ROTATION', arrivalChoice: null, trainingFocus: 'BODY_CARE', careerSeed: state.careerSeed, startYear: state.startYear, windowIndex: state.windowIndex, cashBeforeEuro: 0, developmentApproach }))
  for (const actual of youth) expect(actual).toEqual(youth[0])
})
