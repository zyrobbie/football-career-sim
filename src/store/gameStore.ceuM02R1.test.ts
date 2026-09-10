import { afterAll, afterEach, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { GameState } from '../models/game'
const control = vi.hoisted(() => ({ ids: null as string[] | null }))
vi.mock('../data/balance', async original => {
  const actual = await original<typeof import('../data/balance')>()
  return { ...actual,
    get CLUBS() { return control.ids === null ? actual.CLUBS : actual.CLUBS.filter(c => control.ids!.includes(c.id)) },
    get DOMESTIC_CLUBS() { return control.ids === null ? actual.DOMESTIC_CLUBS : actual.DOMESTIC_CLUBS.filter(c => control.ids!.includes(c.id)) },
  }
})
import { CLUBS } from '../data/balance'
import { generateContractExpiryOffers } from '../engine/transfers'
import { loadGame, saveGame, validateGameState } from '../persistence/save'
import { useGameStore } from './gameStore'
const all = [...CLUBS]
const source = 'docs/evidence/CEU-20260907/M-01/generated-r4/fixtures/expiry.json'
const rawSource = readFileSync(source, 'utf8')
const sourceSha = createHash('sha256').update(rawSource).digest('hex')
const original: GameState = JSON.parse(rawSource).data
const rows: unknown[] = []
const store = () => useGameStore.getState()
function setup(count: number) {
  const game = structuredClone(original)
  const ids = [game.selectedClubId!, ...all.filter(c => c.id !== game.selectedClubId).slice(0, count).map(c => c.id)]
  control.ids = ids
  game.transferOffers = generateContractExpiryOffers({ player: game.player!, currentClubId: game.selectedClubId!, currentTeamLevel: game.teamLevel!, currentRole: game.firstTeamRole ?? game.youthRole!, currentContract: game.contract!, latestReport: game.lastReport!, careerSeed: game.careerSeed, windowIndex: game.windowIndex })
  control.ids = null
  expect(game.transferOffers).toHaveLength(count + 1)
  game.selectedTransferChoiceId = game.transferOffers[0]!.id
  const memory = new Map<string, string>()
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } })
  useGameStore.setState({ game, error: null, hasSave: false })
  expect(memory.size).toBe(0)
  return { game, memory, ids }
}
function roundtrip(memory: Map<string, string>) {
  const expected = structuredClone(store().game!)
  expect(store().error).toBeNull()
  const raw = memory.get('career_save_current')!
  expect(JSON.parse(raw).data).toEqual(expected)
  useGameStore.setState({ game: null, error: null, hasSave: false })
  // First read is the actual public-action envelope; no re-encoding or backup fallback.
  expect(loadGame()).toEqual(expected)
  store().continueCareer(); expect(store().error).toBeNull(); expect(store().game).toEqual(expected)
  saveGame(expected)
  for (let n = 0; n < 3; n++) {
    expect(loadGame()).toEqual(expected)
    store().continueCareer(); expect(store().game).toEqual(expected)
  }
  return { expected, raw }
}
afterEach(() => { control.ids = null; vi.unstubAllGlobals(); useGameStore.setState({ game: null, error: null, hasSave: false }) })
for (const count of [0, 1, 2, 3]) {
  for (const choice of count ? ['renewal', 'external'] : ['renewal']) {
    it(`preserves actual expiry output with ${count} external offers and signs ${choice}`, () => {
      const { game, memory, ids } = setup(count)
      const offer = game.transferOffers[choice === 'renewal' ? 0 : 1]!
      store().selectTransferChoice(offer.id)
      expect(memory.has('career_save_backup')).toBe(false)
      const { expected, raw } = roundtrip(memory)
      expect(expected).toEqual({ ...game, selectedTransferChoiceId: offer.id })
      store().confirmTransferChoice(); expect(store().error).toBeNull()
      if (choice === 'external') {
        expect(store().game!.phase).toBe('TRANSFER_ARRIVAL')
        store().chooseTransferArrival('NONE'); expect(store().error).toBeNull()
      }
      expect(store().game!.phase).toBe('TRANSFER_STAGE_COMPLETE')
      store().continueAfterTransfer(); expect(store().error).toBeNull()
      const final = structuredClone(store().game!)
      expect(final.phase).toBe('HALF_YEAR_PLAN')
      expect(final.selectedClubId).toBe(offer.clubId)
      expect(final.contract!.remainingHalfYears).toBe(offer.remainingHalfYears)
      for (const key of ['windowIndex', 'cashEuro', 'history', 'careerEventHistory', 'lastReport', 'draft'] as const) expect(final[key]).toEqual(game[key])
      roundtrip(memory)
      rows.push({ kind: 'quantity-and-successor', count, choice, source, sourceSha, constructed: true, modifications: ['transferOffers: real generateContractExpiryOffers under isolated catalog subset', 'selectedTransferChoiceId: public selectTransferChoice'], catalogIds: ids, initialNoBackup: true, input: game, memoryAfterChoice: expected, firstActualEnvelope: JSON.parse(raw), raw, final, repeatLoads: 3, result: 'passed' })
    })
  }
}
it('preserves public success/failure negotiations in a scarce market using a fixed finite input set', () => {
  const found = new Set<string>()
  for (let seed = 0; seed < 9; seed++) {
    for (const direction of ['SALARY', 'RELEASE_CLAUSE'] as const) {
      const { game, memory } = setup(2)
      // Same finite seed range as M-01 supplement; this is explicitly constructed input.
      game.careerSeed = `ceu-m01-capture-${seed}`
      game.contract!.brokenPromiseWindows = 2
      useGameStore.setState({ game })
      store().selectTransferChoice(game.transferOffers[1]!.id)
      store().counterTransferOffer(direction)
      expect(store().error).toBeNull()
      const negotiated = store().game!.transferOffers[1]!
      const outcome = negotiated.withdrawn ? 'withdrawn' : negotiated.negotiationSucceeded ? 'success' : 'failure'
      found.add(outcome)
      const { expected, raw } = roundtrip(memory)
      rows.push({ kind: 'negotiation', source, sourceSha, constructed: true, modifications: ['generated sparse offers', 'careerSeed', 'contract.brokenPromiseWindows=2'], seed: game.careerSeed, direction, outcome, publicActions: ['selectTransferChoice', 'counterTransferOffer'], expected, firstActualEnvelope: JSON.parse(raw), result: 'passed' })
    }
  }
  expect([...found].sort()).toEqual(['failure', 'success'])
})
it('preserves a constructed withdrawn record alongside a selected renewal in a scarce market', () => {
  const { game, memory } = setup(1)
  const withdrawnSource = 'docs/evidence/CEU-20260907/M-01/supplement/withdrawn.json'
  const withdrawnRaw = readFileSync(withdrawnSource, 'utf8')
  const old: GameState = JSON.parse(withdrawnRaw).data
  const offer = old.transferOffers.find(o => o.withdrawn)!
  expect(offer).toBeDefined()
  const fields = ['counterUsed', 'counterDirection', 'negotiationSucceeded', 'negotiationMessage', 'withdrawn'] as const
  const patch = Object.fromEntries(fields.map(k => [k, offer[k]]))
  game.transferOffers[1] = { ...game.transferOffers[1]!, ...patch }
  useGameStore.setState({ game })
  store().selectTransferChoice(game.transferOffers[0]!.id)
  expect(memory.has('career_save_backup')).toBe(false)
  const { expected, raw } = roundtrip(memory)
  expect(expected).toEqual(game)
  expect(expected.transferOffers[1]!.withdrawn).toBe(true)
  rows.push({ kind: 'constructed-withdrawal-persistence-only', source, sourceSha, withdrawnSource, withdrawnSha: createHash('sha256').update(withdrawnRaw).digest('hex'), modifications: { 'transferOffers[1]': patch }, explanation: '18 fixed public attempts produced no withdrawal; copied only frozen negotiation fields to a real generated sparse external offer. Selection and persistence are public; withdrawal here is constructed, not publicly produced.', expected, firstActualEnvelope: JSON.parse(raw), result: 'passed' })
})
const anomalies: Array<[string, (g: GameState) => void]> = [
  ['missing-renewal', g => { g.transferOffers.shift(); g.selectedTransferChoiceId = g.transferOffers[0]!.id }],
  ['duplicate-renewal', g => { g.transferOffers[2] = { ...g.transferOffers[0]!, id: 'duplicate-renewal' } }],
  ['duplicate-external-club', g => { g.transferOffers[2]!.clubId = g.transferOffers[1]!.clubId }],
  ['duplicate-offer-id', g => { g.transferOffers[2]!.id = g.transferOffers[1]!.id }],
  ['wrong-renewal-club', g => { g.transferOffers[0]!.clubId = g.transferOffers[1]!.clubId }],
  ['external-is-current', g => { g.transferOffers[1]!.clubId = g.selectedClubId! }],
  ['mixed-offer-type', g => { g.transferOffers[1]!.type = 'PERMANENT_TRANSFER' }],
  ['missing-selection', g => { g.selectedTransferChoiceId = 'absent-offer' }],
  ['expired-stay', g => { g.selectedTransferChoiceId = 'STAY' }],
  ['selected-withdrawn', g => { g.transferOffers[1]!.withdrawn = true; g.selectedTransferChoiceId = g.transferOffers[1]!.id }],
  ['too-many-external', g => { g.transferOffers.push({ ...g.transferOffers[1]!, id: 'fourth-external', clubId: all.find(c => !g.transferOffers.some(o => o.clubId === c.id))!.id }) }],
]
it.each(anomalies)('keeps damaged expiry protection: %s', (name, mutate) => {
  const { game, memory } = setup(3)
  mutate(game)
  if (name === 'too-many-external') {
    expect(() => validateGameState(game)).toThrow('Too big')
    expect(() => saveGame(game)).toThrow('Too big')
    expect(memory.size).toBe(0)
    rows.push({ kind: 'invalid-expiry', name, input: game, result: 'rejected by unchanged max-four schema; no write' })
    return
  }
  const repaired = validateGameState(game)
  expect(repaired).toEqual({ ...game, phase: 'PRO_STAGE_COMPLETE', windowIndex: game.history.at(-1)!.windowIndex, transferOffers: [], selectedTransferChoiceId: null })
  saveGame(game)
  expect(JSON.parse(memory.get('career_save_current')!).data).toEqual(repaired)
  expect(loadGame()).toEqual(repaired)
  rows.push({ kind: 'invalid-expiry', name, input: game, repaired, result: 'repaired using existing end-page fallback; not accepted as market' })
})
it('retains legal STAY in an empty market with an effective contract', () => {
  const { game, memory } = setup(0)
  game.contract!.remainingHalfYears = 2
  game.transferOffers = []
  game.selectedTransferChoiceId = 'STAY'
  useGameStore.setState({ game })
  store().selectTransferChoice('STAY')
  const result = roundtrip(memory)
  expect(result.expected).toEqual(game)
  rows.push({ kind: 'effective-contract-empty-stay', game, result: 'passed' })
})
afterAll(() => {
  if (process.env.CEU_M02_R1_EVIDENCE === '1') writeFileSync('docs/evidence/CEU-20260907/M-02-R1/results.json', JSON.stringify(rows, null, 2) + '\n', { flag: 'wx' })
})
