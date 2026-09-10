import { expect, it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import { simulateHalfYear } from '../simulateHalfYear'
import type { TrainingFocus } from '../../models/game'
const dir = 'docs/evidence/CEU-20260907/T-01/training-v11'
it('compares all 324 young outputs against the frozen 54 inputs, without regenerating inputs', () => {
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
    // Stronger than required: whole output, including Player/stats/summary, must match.
    expect(actual).toEqual(result.output)
    count++
  }
  expect(count).toBe(324)
  if (process.env.CEU_T02_EVIDENCE === '1') writeFileSync('docs/evidence/CEU-20260907/T-02/young-comparison.json', JSON.stringify({ inputs: rows.length, outputs: count, player: 'exact', stats: 'exact', otherFields: 'all exact; no differences', source: `${dir}/young-full.json` }, null, 2) + '\n', { flag: 'wx' })
})
