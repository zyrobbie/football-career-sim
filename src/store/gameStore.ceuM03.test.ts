import { afterAll, afterEach, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { GamePhase, GameState } from '../models/game'
import { useGameStore } from './gameStore'
import { canEditCareerPreferences, normalizeCareerPreferences } from './careerPreferences'
import { restoreMarketContext, isUnopenedMarketWindow } from './marketContext'
import { loadGame, saveGame } from '../persistence/save'
import * as transfers from '../engine/transfers'
import * as random from '../engine/random'
import { getCareerEvent } from '../engine/careerEvents'
const B = 'docs/evidence/CEU-20260907'
const O = `${B}/M-03`
const json = (f: string) => JSON.parse(readFileSync(f, 'utf8'))
const sha = (raw: string) => createHash('sha256').update(raw).digest('hex')
const store = () => useGameStore.getState()
const rows: unknown[] = []
function install(raw?: string) {
  const memory = new Map<string, string>(raw ? [['career_save_current', raw]] : [])
  const writes = vi.fn((k: string, v: string) => memory.set(k, v))
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: writes, removeItem: (k: string) => memory.delete(k) } })
  useGameStore.setState({ game: null, error: null, hasSave: false, isReviewingReport: false })
  expect(memory.has('career_save_backup')).toBe(false)
  return { memory, writes }
}
function editAndAssert(intent: string, leagues: string[]) {
  const before = structuredClone(store().game!)
  const spy = vi.spyOn(transfers, 'generateTransferOffers')
  const expiry = vi.spyOn(transfers, 'generateContractExpiryOffers')
  const rng = vi.spyOn(random, 'createRandom')
  store().updateCareerPreferences(intent, leagues)
  expect(store().error).toBeNull()
  expect(spy).not.toHaveBeenCalled(); expect(expiry).not.toHaveBeenCalled(); expect(rng).not.toHaveBeenCalled()
  const n = normalizeCareerPreferences(intent, leagues)
  expect(store().game).toEqual({ ...before, player: { ...before.player!, overseasIntent: n.intent, preferredLeagues: n.leagues } })
  vi.restoreAllMocks()
}
function unchangedActions() {
  const before = structuredClone(store().game!)
  const rng = vi.spyOn(random, 'createRandom')
  store().reviewReport(); expect(store().isReviewingReport).toBe(true)
  store().advanceAfterReport(); store().goToPhase('PRO_STAGE_COMPLETE'); store().goToPhase('HALF_YEAR_REPORT')
  store().openTransferWindow(); store().openTransferWindow(true)
  expect(store().game).toEqual(before); expect(store().error).toBeNull()
  store().closeReportReview(); expect(store().isReviewingReport).toBe(false)
  expect(rng).not.toHaveBeenCalled(); vi.restoreAllMocks()
  saveGame(store().game!); expect(loadGame()).toEqual(before)
  store().continueCareer(); expect(store().game).toEqual(before)
}
const originals = json(`${B}/M-01/generated-r4/manifest.json`).map((r: { name: string; file: string; sha256: string }) => ({ name: r.name, source: `${B}/M-01/generated-r4/${r.file}`, raw: readFileSync(`${B}/M-01/generated-r4/${r.file}`, 'utf8'), hash: r.sha256 }))
const withdrawnRaw = readFileSync(`${B}/M-01/supplement/withdrawn.json`, 'utf8')
originals.push({ name: 'withdrawn', source: `${B}/M-01/supplement/withdrawn.json`, raw: withdrawnRaw, hash: json(`${B}/M-01/supplement/search.json`).captures[0].sha256 })
const sparse = json(`${B}/M-02-R1/results.json`).filter((r: { kind: string }) => r.kind === 'quantity-and-successor').map((r: { count: number; choice: string; raw: string }) => ({ name: `sparse-${r.count}-${r.choice}`, source: `${B}/M-02-R1/results.json`, raw: r.raw, hash: sha(r.raw) }))
it.each([...originals, ...sparse])('preserves original raw $name through editing/review/reentry and legal signing', entry => {
  expect(sha(entry.raw)).toBe(entry.hash)
  const before: GameState = JSON.parse(entry.raw).data
  const { memory, writes } = install(entry.raw)
  expect(loadGame()).toEqual(before); store().continueCareer(); expect(store().game).toEqual(before)
  // loadGame may canonicalize envelope formatting; complete data equality above is required.
  writes.mockClear()
  const edits: GameState[] = []
  for (const [intent, leagues] of [['DOMESTIC', ['意大利']], ['STRONG', ['意大利', '德国', '意大利']], ['CONDITIONAL', ['英格兰']]] as const) {
    editAndAssert(intent, [...leagues]); edits.push(structuredClone(store().game!)); unchangedActions()
  }
  const current = store().game!
  const negotiated = current.transferOffers.find(o => o.id === current.selectedTransferChoiceId && o.counterUsed)
  if (negotiated) {
    store().counterTransferOffer('SALARY')
    expect(store().game).toBe(current)
    expect(store().error).not.toBeNull()
    store().clearError()
  }
  writes.mockClear(); editAndAssert('CONDITIONAL', ['英格兰', '英格兰']); expect(writes).not.toHaveBeenCalled()
  const offer = current.transferOffers.find(o => o.id === current.selectedTransferChoiceId && !o.withdrawn) ?? current.transferOffers.find(o => !o.withdrawn)
  store().selectTransferChoice(offer?.id ?? 'STAY'); store().confirmTransferChoice(); expect(store().error).toBeNull()
  const signed = structuredClone(store().game!)
  store().confirmTransferChoice(); store().counterTransferOffer('SALARY'); store().openTransferWindow(); store().advanceAfterReport(); store().goToPhase('PRO_STAGE_COMPLETE')
  expect(store().game).toEqual(signed)
  if (store().game!.phase === 'TRANSFER_ARRIVAL') store().chooseTransferArrival('NONE')
  expect(store().game!.phase).toBe('TRANSFER_STAGE_COMPLETE')
  const arrived = structuredClone(store().game!)
  store().chooseTransferArrival('DINNER'); expect(store().game).toEqual(arrived)
  store().continueAfterTransfer(); expect(store().error).toBeNull()
  const final = structuredClone(store().game!)
  expect(final.phase).toBe('HALF_YEAR_PLAN'); expect(final.transferOffers).toEqual([])
  for (const key of ['windowIndex', 'cashEuro', 'history', 'careerEventHistory', 'lastReport', 'draft'] as const) expect(final[key]).toEqual(before[key])
  store().continueAfterTransfer(); store().openTransferWindow(); store().advanceAfterReport(); expect(store().game).toEqual(final)
  store().continueCareer(); expect(store().game).toEqual(final); expect(store().isReviewingReport).toBe(false)
  rows.push({ kind: 'raw-restore-and-successor', name: entry.name, source: entry.source, sourceSha: entry.hash, raw: entry.raw, before, edits, signed, arrived, final, finalEnvelope: JSON.parse(memory.get('career_save_current')!), result: 'passed' })
})
const base: GameState = JSON.parse(originals[0].raw).data
const allowed: GamePhase[] = ['HALF_YEAR_PLAN', 'HALF_YEAR_REPORT', 'CAREER_DASHBOARD', 'PRO_CONTRACT_OFFER', 'PRO_CONTRACT_COMPLETE', 'PRO_STAGE_COMPLETE', 'TRANSFER_WINDOW', 'TRANSFER_ARRIVAL', 'TRANSFER_STAGE_COMPLETE']
const denied: GamePhase[] = ['HOME', 'CREATE_IDENTITY', 'CREATE_POSITION', 'CREATE_PRIORITIES', 'CREATE_PREFERENCES', 'PLAYER_REVEAL', 'ACADEMY_OFFERS', 'ARRIVAL_EVENT', 'SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT', 'SIMULATION_READY', 'RETIREMENT_DECISION', 'CAREER_RETIRED']
it('shares the explicit phase table and requires a contract with no pending event', () => {
  for (const phase of [...allowed, ...denied]) {
    const g = { ...base, phase }
    expect(canEditCareerPreferences(g)).toBe(allowed.includes(phase))
    if (denied.includes(phase)) {
      const { writes } = install(); useGameStore.setState({ game: g })
      store().updateCareerPreferences('DOMESTIC', [])
      expect(store().game).toBe(g); expect(writes).not.toHaveBeenCalled(); expect(store().error).not.toBeNull()
    }
  }
  expect(canEditCareerPreferences({ ...base, contract: null })).toBe(false)
  expect(canEditCareerPreferences({ ...base, pendingCareerEvent: { eventId: 'pending' } as unknown as GameState['pendingCareerEvent'] })).toBe(false)
  rows.push({ kind: 'edit-phase-table', allowed, denied, result: 'passed' })
})
it.each([
  ['UNKNOWN', []], ['STRONG', ['未知联赛']], ['CONDITIONAL', ['英格兰', '德国', '法国', '意大利']], ['DOMESTIC', ['未知联赛']], ['STRONG', null],
])('rejects invalid preferences atomically: %s %j', (intent, leagues) => {
  const { writes } = install(originals[0].raw); store().continueCareer()
  const before = store().game
  writes.mockClear()
  store().updateCareerPreferences(intent, leagues)
  expect(store().game).toBe(before); expect(writes).not.toHaveBeenCalled(); expect(store().error).not.toBeNull()
})
it.each((json(`${B}/M-02/m03-reentry.json`) as Array<{ kind: string; before: GameState }>).map(r => ({ name: r.kind, game: r.before })))('restores the legacy report/end-page context for $name before opportunity gating', ({ name, game }) => {
  for (const phase of ['HALF_YEAR_REPORT', 'PRO_STAGE_COMPLETE'] as const) {
    const { memory } = install()
    // Explicit constructed intermediate old navigation state; original raw cases above are never re-encoded first.
    const legacy = { ...game, phase }; saveGame(legacy)
    const raw = memory.get('career_save_current')!; memory.delete('career_save_backup')
    expect(loadGame()).toEqual(legacy)
    store().continueCareer(); expect(store().game).toEqual(game)
    unchangedActions()
    rows.push({ kind: 'legacy-phase-recovery', name, source: `${B}/M-02/m03-reentry.json`, changes: { phase }, raw, before: legacy, after: store().game, result: 'passed' })
  }
})
it('distinguishes legacy signed, arrived and next-plan contexts from an unopened market', () => {
  const row = json(`${B}/M-02-R1/results.json`).find((r: { choice: string }) => r.choice === 'external')
  const g: GameState = row.final
  const nextPlan = { ...g, phase: 'HALF_YEAR_REPORT' as const }
  expect(restoreMarketContext(nextPlan)).toEqual(g)
  const selected = row.memoryAfterChoice.selectedTransferChoiceId
  const arrived = { ...g, phase: 'PRO_STAGE_COMPLETE' as const, selectedTransferChoiceId: selected }
  expect(restoreMarketContext(arrived).phase).toBe('TRANSFER_STAGE_COMPLETE')
  const signed = { ...arrived, transferDecision: { ...arrived.transferDecision!, arrivalChoice: null } }
  expect(restoreMarketContext(signed).phase).toBe('TRANSFER_ARRIVAL')
  expect(isUnopenedMarketWindow(arrived)).toBe(false)
})
it('uses the latest saved direction at the next true market exactly once and settles the next half-year', () => {
  install()
  const game: GameState = { ...structuredClone(base), phase: 'PRO_STAGE_COMPLETE', windowIndex: base.history.at(-1)!.windowIndex, transferOffers: [], selectedTransferChoiceId: null, transferDecision: null, contract: { ...base.contract!, brokenPromiseWindows: 2 } }
  useGameStore.setState({ game })
  for (const intent of ['STRONG', 'CONDITIONAL', 'DOMESTIC']) editAndAssert(intent, ['意大利'])
  const before = structuredClone(store().game!)
  const args = { player: before.player!, currentClubId: before.selectedClubId!, currentTeamLevel: before.teamLevel, latestReport: before.lastReport, careerSeed: before.careerSeed, windowIndex: before.windowIndex + 1 }
  const expected = transfers.generateTransferOffers(args)
  const generate = vi.spyOn(transfers, 'generateTransferOffers')
  store().openTransferWindow(true); expect(store().error).toBeNull()
  const market = structuredClone(store().game!)
  expect(market.transferOffers).toEqual(expected); expect(market.windowIndex).toBe(before.windowIndex + 1)
  expect(generate).toHaveBeenCalledExactlyOnceWith(args)
  store().openTransferWindow(true); store().openTransferWindow(); expect(store().game).toEqual(market)
  expect(generate).toHaveBeenCalledTimes(1); vi.restoreAllMocks()
  store().selectTransferChoice('STAY'); store().confirmTransferChoice(); store().continueAfterTransfer()
  store().chooseTraining('BALANCED', 'STEADY')
  for (let step = 0; step < 4 && ['SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT'].includes(store().game!.phase); step++) {
    if (store().game!.phase === 'SPECIAL_EVENT_RESULT') store().continueAfterCareerEvent()
    else {
      const pending = store().game!.pendingCareerEvent!
      const event = getCareerEvent(pending.eventId)!
      store().chooseCareerEvent(event.setup && pending.stepIndex === 0 ? event.setup.options[0]!.id : event.choices[0]!.id)
    }
  }
  const settled = store().game!
  expect(settled.phase).toBe('HALF_YEAR_REPORT'); expect(settled.history).toHaveLength(before.history.length + 1)
  expect(settled.player!.overseasIntent).toBe('DOMESTIC')
  rows.push({ kind: 'next-market-effect', constructed: true, source: originals[0].source, changes: ['phase', 'windowIndex=lastHistory.windowIndex', 'clear market/selection/decision', 'contract.brokenPromiseWindows=2'], before, args, expected, market, settled, result: 'passed' })
})
it('does not remove new-market cadence or promise-breach requirements', () => {
  install()
  // Move back to an actually settled window without market markers; cadence deliberately unavailable.
  const input: GameState = { ...structuredClone(base), phase: 'PRO_STAGE_COMPLETE', windowIndex: 4, history: [], lastReport: null, transferOffers: [], selectedTransferChoiceId: null, transferDecision: null, contract: { ...base.contract!, remainingHalfYears: 4, brokenPromiseWindows: 0 } }
  useGameStore.setState({ game: input })
  const spy = vi.spyOn(transfers, 'generateTransferOffers')
  store().openTransferWindow(); expect(store().game).toBe(input); expect(store().error).not.toBeNull()
  store().openTransferWindow(true); expect(store().game).toBe(input); expect(store().error).not.toBeNull()
  expect(spy).not.toHaveBeenCalled()
})
it('loads constructed legacy report/end phases after actual signing, arrival and next-plan actions', () => {
  const row = sparse.find((r: { name: string }) => r.name === 'sparse-1-external')!
  const { memory } = install(row.raw)
  store().continueCareer()
  store().confirmTransferChoice()
  expect(store().game!.phase).toBe('TRANSFER_ARRIVAL')
  const stages = [structuredClone(store().game!)]
  store().chooseTransferArrival('NONE'); stages.push(structuredClone(store().game!))
  store().continueAfterTransfer(); stages.push(structuredClone(store().game!))
  const evidence: unknown[] = []
  for (const expected of stages) for (const phase of ['HALF_YEAR_REPORT', 'PRO_STAGE_COMPLETE'] as const) {
    const legacy = { ...expected, phase }
    saveGame(legacy)
    const raw = memory.get('career_save_current')!
    memory.delete('career_save_backup')
    useGameStore.setState({ game: null, error: null, isReviewingReport: false })
    expect(loadGame()).toEqual(legacy)
    store().continueCareer(); expect(store().game).toEqual(expected)
    store().openTransferWindow(); store().advanceAfterReport(); expect(store().game).toEqual(expected)
    store().continueCareer(); expect(store().game).toEqual(expected)
    evidence.push({ source: row.source, sourceRawSha: row.hash, publicOrigin: ['confirmTransferChoice', 'chooseTransferArrival NONE', 'continueAfterTransfer'], constructedChange: { phase }, raw, expected, result: 'passed' })
  }
  if (process.env.CEU_M03_EXTRA_EVIDENCE === '1') writeFileSync(`${O}/legacy-successors.json`, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); useGameStore.setState({ game: null, error: null, isReviewingReport: false }) })
afterAll(() => { if (process.env.CEU_M03_EVIDENCE === '1') writeFileSync(`${O}/store-results.json`, JSON.stringify(rows, null, 2) + '\n', { flag: 'wx' }) })
