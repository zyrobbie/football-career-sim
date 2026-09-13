import { currentSchemaExpected } from '../testing/keyMatchMomentTestSupport'
import { afterEach, afterAll, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { GameState } from '../models/game'
import { useGameStore } from './gameStore'
import { loadGame, saveGame } from '../persistence/save'
const E = 'docs/evidence/CEU-20260907/M-01'
const G = `${E}/generated-r4`
const O = 'docs/evidence/CEU-20260907/M-02'
// Archived M-01 source/JSON are immutable. New rules must never recapture them.
if (process.env.CEU_M01_CAPTURE || process.env.CEU_M01_SUPPLEMENT) throw new Error('M-01 capture permanently disabled in current tests; frozen baseline is read-only')
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const sha = (raw: string) => createHash('sha256').update(raw).digest('hex')
const store = () => useGameStore.getState()
const rows: unknown[] = [], risks: unknown[] = []
function installRaw(raw: string) {
  const memory = new Map<string, string>([['career_save_current', raw]])
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } })
  useGameStore.setState({ game: null, error: null, hasSave: false })
  expect(memory.has('career_save_backup')).toBe(false)
  return memory
}
function run(action: string, args: unknown[] = []) {
  ;(store()[action as keyof ReturnType<typeof store>] as (...args: unknown[]) => void)(...args)
}
afterEach(() => { vi.unstubAllGlobals(); useGameStore.setState({ game: null, error: null, hasSave: false }) })
const fixtures = [...json(`${G}/manifest.json`).map((e: { name: string; file: string; sha256: string; bytes: number }) => ({ ...e, file: `${G}/${e.file}` })), { name: 'withdrawn', file: `${E}/supplement/withdrawn.json`, sha256: json(`${E}/supplement/search.json`).captures[0].sha256, bytes: json(`${E}/supplement/search.json`).captures[0].bytes }]
it.each(fixtures)('directly loads original envelope $name then legally continues without resettlement', entry => {
  const raw = readFileSync(entry.file, 'utf8')
  expect(sha(raw)).toBe(entry.sha256); expect(Buffer.byteLength(raw)).toBe(entry.bytes)
  const original: GameState = JSON.parse(raw).data
  const memory = installRaw(raw)
  expect(loadGame()).toEqual(currentSchemaExpected(original))
  store().continueCareer(); expect(store().error).toBeNull(); expect(store().game).toEqual(currentSchemaExpected(original))
  const offer = original.transferOffers.find(o => o.id === original.selectedTransferChoiceId && !o.withdrawn) ?? original.transferOffers.find(o => o.type === 'RENEWAL' && !o.withdrawn) ?? original.transferOffers.find(o => !o.withdrawn)
  const choice = offer?.id ?? (original.contract!.remainingHalfYears > 0 ? 'STAY' : null)
  expect(choice).not.toBeNull()
  const actions: string[] = []
  const act = (name: string, args: unknown[] = []) => { run(name, args); expect(store().error).toBeNull(); actions.push(name) }
  act('selectTransferChoice', [choice]); act('confirmTransferChoice')
  if (store().game!.phase === 'TRANSFER_ARRIVAL') act('chooseTransferArrival', ['NONE'])
  if (store().game!.phase === 'TRANSFER_STAGE_COMPLETE') act('continueAfterTransfer')
  const final = structuredClone(store().game!)
  expect(final.phase).toBe('HALF_YEAR_PLAN')
  for (const key of ['history', 'careerEventHistory', 'lastReport', 'windowIndex', 'cashEuro', 'draft'] as const) expect(final[key]).toEqual(original[key])
  expect(final.player!.overseasIntent).toBe(original.player!.overseasIntent)
  expect(final.player!.preferredLeagues).toEqual(original.player!.preferredLeagues)
  saveGame(final); expect(loadGame()).toEqual(final)
  for (let i = 0; i < 3; i++) { store().continueCareer(); expect(store().game).toEqual(final) }
  rows.push({ name: entry.name, source: entry.file, sha256: entry.sha256, initialNoBackup: true, initialEntireStateExact: true, actions, choice, before: original, after: final, repeatLoad: true })
  if (process.env.CEU_M02_EVIDENCE === '1') writeFileSync(`${O}/restore-${entry.name}.json`, memory.get('career_save_current')! + '\n', { flag: 'wx' })
})
it.each(['regular-reentry', 'expiry-reentry', 'empty-reentry', 'empty-forced-reentry'])('preserves the existing market across M-03 reentry: %s', kind => {
  const row = json(`${G}/reentry.json`).find((r: { kind: string }) => r.kind === kind)
  const before: GameState = row.before
  // Explicit in-memory reconstruction of a frozen defect setup, separate from the eight raw-envelope tests.
  installRaw(''); saveGame(before); store().continueCareer(); expect(store().game).toEqual(currentSchemaExpected(before))
  run('reviewReport'); run('advanceAfterReport'); run('openTransferWindow', kind === 'empty-forced-reentry' ? [true] : [])
  const after = structuredClone(store().game!)
  expect(store().error).toBeNull()
  expect(after).toEqual(currentSchemaExpected(before))
  store().closeReportReview()
  for (const key of ['cashEuro', 'history', 'careerEventHistory', 'lastReport'] as const) expect(after[key]).toEqual(before[key])
  risks.push({ kind, before, after, error: store().error, status: 'M-03 target: no regeneration, rejection or window advance' })
})
afterAll(() => {
  if (process.env.CEU_M02_EVIDENCE === '1') {
    writeFileSync(`${O}/restore-results.json`, JSON.stringify(rows, null, 2) + '\n', { flag: 'wx' })
    writeFileSync(`${O}/m03-reentry.json`, JSON.stringify(risks, null, 2) + '\n', { flag: 'wx' })
  }
})
