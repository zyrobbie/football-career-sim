import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import { simulateHalfYear } from '../simulateHalfYear'
import type { TrainingFocus } from '../../models/game'
const dir = 'docs/evidence/CEU-20260907/T-01/training-v11'
it('protects frozen youth outputs and limits authorized professional changes across all324 old outputs', () => {
  if (process.env.CEU_T01_TRAINING) throw new Error('Historical generation disabled; see T-02/historical-v11')
  const hashes = JSON.parse(readFileSync(`${dir}/artifact-hashes.json`, 'utf8'))
  const raw = readFileSync(`${dir}/young-full.json`)
  const expected = hashes[`${dir}/young-full.json`] ?? hashes['young-full.json']
  expect(createHash('sha256').update(raw).digest('hex')).toBe(typeof expected === 'string' ? expected : expected.sha256)
  type YouthInput = Omit<Parameters<typeof simulateHalfYear>[0], 'trainingFocus'>
  type ProInput = { state: Parameters<typeof simulateProfessionalHalfYear>[0]['state']; academy: Parameters<typeof simulateProfessionalHalfYear>[0]['offer'] }
  type Row = { kind: string; input: YouthInput & ProInput; results: { focus: TrainingFocus; output: unknown }[] }
  const rows = JSON.parse(raw.toString()) as Row[]
  expect(rows).toHaveLength(54)
  let count = 0
  for (const row of rows) for (const result of row.results) {
    const input = structuredClone(row.input)
    const actual = row.kind === 'youth' ? simulateHalfYear({ ...input, trainingFocus: result.focus }) : simulateProfessionalHalfYear({ state: { ...input.state, trainingFocus: result.focus }, offer: input.academy })
    if (row.kind === 'youth') {
      expect(actual).toEqual(result.output)
    } else {
      // PSU intentionally changes all48 normal STEADY professional inputs. Keep
      // old bytes and compare every field outside the explicitly causal outputs.
      // S3 separately proves all1562 S2 numeric outputs; new eventSummary is authorized.
      const old = result.output as typeof actual
      const oldProjection = structuredClone(old), newProjection = structuredClone(actual)
      for (const projection of [oldProjection, newProjection]) {
        for (const key of ['attributes', 'form', 'fitness', 'morale', 'coachRelation', 'squadRelation', 'fanRelation', 'reputation'] as const) delete (projection.player as Partial<typeof projection.player>)[key]
        for (const key of ['stats', 'attributes', 'states', 'relations', 'injury', 'roleAfter', 'firstTeam', 'hints', 'eventSummary'] as const) delete (projection.report as Partial<typeof projection.report>)[key]
        delete (projection as { firstTeamRole?: unknown }).firstTeamRole
      }
      expect(newProjection).toEqual(oldProjection)
      const stats = actual.report.stats
      expect(stats.starts).toBeGreaterThanOrEqual(0)
      expect(stats.starts).toBeLessThanOrEqual(stats.appearances)
      expect(stats.appearances).toBeLessThanOrEqual(18)
      // STEADY reduces risk and leaves ranges untouched; a healthy old result
      // cannot acquire an injury at the same injury draw, and retains both counts.
      if (!old.report.injury) {
        expect(actual.report.injury).toBeNull()
        expect(stats.appearances).toBe(old.report.stats.appearances)
        expect(stats.starts).toBe(old.report.stats.starts)
      }
      const fitness = Math.min(100, input.state.player!.fitness + 2)
      expect(stats.minutes).toBe(Math.round(stats.starts * (65 + fitness * .25) + (stats.appearances - stats.starts) * (10 + fitness * .25)))
      const workload = stats.appearances >= 15 ? -5 : stats.appearances >= 11 ? -2 : 2
      expect(actual.player.fitness).toBe(actual.report.injury ? Math.min(70, fitness + workload) : Math.min(100, Math.max(0, fitness + workload)))
      expect(actual).toEqual(simulateProfessionalHalfYear({ state: { ...structuredClone(input.state), trainingFocus: result.focus }, offer: input.academy }))
    }
    count++
  }
  expect(count).toBe(324)
  if (process.env.CEU_T02_EVIDENCE) throw new Error('Frozen T-02 evidence cannot be regenerated after PSU.')
})
