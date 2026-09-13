import { completePendingMoment } from '../testing/keyMatchMomentTestSupport'
import { currentSchemaExpected } from '../testing/keyMatchMomentTestSupport'
import { professionalNextAction } from './professionalNextAction'
import { afterEach, afterAll, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { GameState, TrainingFocus } from '../models/game'
import { normalizePendingTraining } from '../engine/trainingPlan'
import { eligibleCareerEventChoices, getCareerEvent } from '../engine/careerEvents'
let useGameStore: typeof import('./gameStore').useGameStore
const store = () => useGameStore.getState()
const base = 'docs/evidence/CEU-20260907'
const sha = (raw: string) => createHash('sha256').update(raw).digest('hex')
if (process.env.CEU_T01_CAPTURE) throw new Error('Historical generation disabled; see T-02/historical-v11')
type Fixture = { name: string; file: string; sha256: string; bytes: number }
const originalHashes = JSON.parse(readFileSync(`${base}/S0/fixture-hashes.json`, 'utf8'))
const fixtures: Fixture[] = [
  ...JSON.parse(readFileSync(`${base}/S0/fixture-manifest.json`, 'utf8')).map((row: { name: string; file: string; bytes: number }) => ({ ...row, name: `S0/${row.name}`, file: `${base}/S0/${row.file}`, sha256: originalHashes[row.file].sha256 })),
  ...JSON.parse(readFileSync(`${base}/S0-v11-supplement/manifest.json`, 'utf8')).map((row: Fixture) => ({ ...row, file: `${base}/S0-v11-supplement/fixtures/${row.name}.json`, name: `real-veteran/${row.name}` })),
  ...JSON.parse(readFileSync(`${base}/T-02/constructed-v11/manifest.json`, 'utf8')).map((row: Fixture) => ({ ...row, name: `constructed/${row.file}`, file: `${base}/T-02/constructed-v11/${row.file}` })),
]
const verification: unknown[] = []
function nextAction(game: GameState, focus: TrainingFocus, run: (name: string, args: unknown[], fn: () => void) => void) {
  switch (game.phase) {
    case 'ACADEMY_OFFERS': { const id = game.academyOffers[1]!.club.id; run('selectAcademy', [id], () => store().selectAcademy(id)); break }
    case 'ARRIVAL_EVENT': run('chooseArrival', ['COACH'], () => store().chooseArrival('COACH')); break
    case 'HALF_YEAR_PLAN': run('chooseTraining', [focus, game.windowIndex >= 2 ? 'STEADY' : null], () => store().chooseTraining(focus, game.windowIndex >= 2 ? 'STEADY' : null)); break
    case 'SPECIAL_EVENT': {
      const pending = game.pendingCareerEvent!; const event = getCareerEvent(pending.eventId); const eligible = eligibleCareerEventChoices(game, event)
      const route = event.setup?.options.find(option => option.id === pending.variantId)
      const choices = event.setup && pending.stepIndex === 0 ? event.setup.options.filter(option => option.choiceIds.some(id => eligible.some(choice => choice.id === id))).map(option => option.id) : eligible.filter(choice => !route || route.choiceIds.includes(choice.id)).map(choice => choice.id)
      expect(choices.length).toBeGreaterThan(0)
      run('chooseCareerEvent', [choices[0]!], () => store().chooseCareerEvent(choices[0]!)); break
    }
    case 'SPECIAL_EVENT_RESULT': run('continueAfterCareerEvent', [], () => store().continueAfterCareerEvent()); break
    case 'KEY_MATCH_MOMENT': case 'KEY_MATCH_MOMENT_RESULT': completePendingMoment(store); break
    case 'HALF_YEAR_REPORT': run('advanceAfterReport', [], () => store().advanceAfterReport()); break
    case 'CAREER_DASHBOARD': run('openProfessionalContract', [], () => store().openProfessionalContract()); break
    case 'PRO_CONTRACT_OFFER': run('acceptProfessionalContract', [], () => store().acceptProfessionalContract()); break
    case 'PRO_CONTRACT_COMPLETE': run('startProfessionalCareer', [], () => store().startProfessionalCareer()); break
    case 'PRO_STAGE_COMPLETE': {
      const action = professionalNextAction(store().game!).primary!
      run('advanceProfessionalReport', [action.action, store().game!.windowIndex], () => store().advanceProfessionalReport(action.action, store().game!.windowIndex))
      break
    }
    case 'TRANSFER_WINDOW': {
      const choice = game.contract!.remainingHalfYears > 0 ? 'STAY' : (game.transferOffers.find(offer => offer.type === 'RENEWAL') ?? game.transferOffers[0])!.id
      run('selectTransferChoice', [choice], () => store().selectTransferChoice(choice)); run('confirmTransferChoice', [], () => store().confirmTransferChoice()); break
    }
    case 'TRANSFER_ARRIVAL': run('chooseTransferArrival', ['NONE'], () => store().chooseTransferArrival('NONE')); break
    case 'TRANSFER_STAGE_COMPLETE': run('continueAfterTransfer', [], () => store().continueAfterTransfer()); break
    default: throw new Error(`Unexpected ${game.phase}`)
  }
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); useGameStore?.setState({ game: null, error: null, hasSave: false }) })
it.each(fixtures)('migrates and resumes $name from its untouched v11 envelope', async item => {
  const raw = readFileSync(item.file, 'utf8')
  expect(sha(raw)).toBe(item.sha256); expect(Buffer.byteLength(raw)).toBe(item.bytes)
  const old = JSON.parse(raw).data
  expect([old.saveVersion, old.dataVersion]).toEqual([11, 11])
  const memory = new Map<string, string>([['career_save_current', raw.trim()]])
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } })
  vi.resetModules()
  useGameStore = (await import('./gameStore')).useGameStore
  const { loadGame, saveGame } = await import('../persistence/save')
  const planModule = await import('../engine/trainingPlan')
  const executionSpy = vi.spyOn(planModule, 'applyTrainingMaintenance')
  expect(store().game).toBeNull()
  const loaded = loadGame()!
  // The migration itself changes only version fields for these legal v11 inputs.
  expect(loaded).toEqual(currentSchemaExpected(old))
  const canonical = normalizePendingTraining(loaded)
  store().continueCareer(); completePendingMoment(store); expect(store().error).toBeNull()
  if (old.phase !== 'SIMULATION_READY') expect(store().game).toEqual(canonical)
  else {
    expect(store().game!.history).toHaveLength(old.history.length + 1)
    expect(store().game!.history.at(-1)!.trainingFocus).toBe(canonical.trainingFocus)
  }
  const first = structuredClone(store().game!)
  store().continueCareer(); expect(store().game).toEqual(first)
  const actions: { action: string; args: unknown[]; before: string; after: string }[] = []
  const run = (action: string, args: unknown[], fn: () => void) => {
    const before = store().game!.phase; fn(); actions.push({ action, args, before, after: store().game!.phase })
  }
  // Advance each phase legally to a NEW report (or retirement), allowing only the real action to mutate data.
  for (let step = 0; step < 20 && store().game!.history.length === old.history.length; step++) {
    if (store().game!.phase === 'CAREER_RETIRED') break
    if (store().game!.phase === 'RETIREMENT_DECISION') run('confirmRetirement', [], () => store().confirmRetirement())
    else nextAction(store().game!, canonical.trainingFocus ?? 'attack', run)
    expect(store().error).toBeNull()
    expect(store().game!.history.slice(0, old.history.length)).toEqual(old.history)
  }
  const final = structuredClone(store().game!)
  expect(['HALF_YEAR_REPORT', 'CAREER_RETIRED']).toContain(final.phase)
  expect(final.history.length - old.history.length).toBe(final.phase === 'CAREER_RETIRED' ? 0 : 1)
  expect(final.history.slice(0, old.history.length)).toEqual(old.history)
  expect(final.careerEventHistory.slice(0, old.careerEventHistory.length)).toEqual(old.careerEventHistory)
  expect(final.draft).toEqual(old.draft)
  expect(final.player!.overseasIntent).toBe(old.player.overseasIntent)
  expect(final.player!.preferredLeagues).toEqual(old.player.preferredLeagues)
  if (final.phase === 'HALF_YEAR_REPORT') {
    expect(final.history.at(-1)!.trainingFocus).toBe(final.trainingFocus)
    expect(final.trainingQualityBonus).toBe(0)
    if (final.windowIndex >= 36) expect(final.lastReport!.eventSummary).toContain('本期训练：')
  }
  const executionsBeforeReload=executionSpy.mock.calls.length
  saveGame(final)
  expect(JSON.parse(memory.get('career_save_current')!).data.saveVersion).toBe(13)
  expect(loadGame()).toEqual(final)
  for (let i = 0; i < 3; i++) { store().continueCareer(); expect(store().game).toEqual(final) }
  // Pure preparation may repeat for frozen-context validation; no application or new simulation on reload.
  expect(executionSpy).toHaveBeenCalledTimes(executionsBeforeReload)
  expect(executionsBeforeReload>0).toBe(final.phase === 'HALF_YEAR_REPORT')
  const execution = executionSpy.mock.results.at(-1)?.value
  if (item.name.startsWith('constructed/')) {
    expect(execution).not.toBeNull()
    const preparation = executionSpy.mock.calls.at(-1)![1]
    const target = canonical.trainingFocus === 'MATCH_SHARPNESS' ? 'form' : 'morale'
    // Recover pre-maintenance target from actual execution, not the final report net state.
    const targetBefore = preparation[target] - execution!.gains[target] + execution!.costs[target]
    expect(execution!.gains[target]).toBe(execution!.recovery ? 0 : Math.min(4, Math.max(0, 95 - targetBefore)))
  }
  if (process.env.CEU_T02_EVIDENCE === '1') {
    mkdirSync(`${base}/T-02/migration-v12`, { recursive: true })
    writeFileSync(`${base}/T-02/migration-v12/${item.name.replaceAll('/', '-')}.json`, memory.get('career_save_current')! + '\n', { flag: 'wx' })
  }
  verification.push({ name: item.name, execution, sha256: item.sha256, initialPhase: old.phase, focusBefore: old.trainingFocus, canonicalFocus: canonical.trainingFocus, actions, finalPhase: final.phase, historyBefore: old.history.length, historyAfter: final.history.length, eventCountBefore: old.careerEventHistory.length, eventCountAfter: final.careerEventHistory.length, summary: final.lastReport?.eventSummary, protectedOnLoad: 'all data except versions; pending focus only on continue', protectedAfterActions: 'old history/event prefixes, draft and player preferences', repeatLoad: 'whole final state exact after 3 continues' })
})
afterAll(() => {
  if (process.env.CEU_T02_EVIDENCE === '1') writeFileSync(`${base}/T-02/migration-results.json`, JSON.stringify(verification, null, 2) + '\n', { flag: 'wx' })
})
