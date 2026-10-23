import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLUBS } from '../../data/balance'
import type { GameState } from '../../models/game'
import { createTrainingBaselineState } from '../../engine/__tests__/ceuTrainingBaselineFixture'
import { createEntertainmentV3State } from '../../engine/entertainmentV3'
import { generateAcademyOffers } from '../../engine/offers'
import { createLivingCityState, syncLivingCity } from '../../engine/livingCity'
import { preparePersonalArrangementWindow, purchasePersonalArrangement, quotePersonalArrangement, settlePersonalArrangementWindow, terminatePersonalArrangements } from '../../engine/personalArrangements'
import { runReadySimulation } from '../../store/gameStore'
import { loadGame, saveGame, validateGameState } from '../save'

function fixture(windowIndex = 10): GameState {
  const { state } = createTrainingBaselineState('V3-PERSISTENCE-STRICT', CLUBS.find(c => c.id === 'eng_liverpool')!)
  const result: GameState = {
    ...state, phase: 'HALF_YEAR_PLAN', windowIndex, cashEuro: 100_000,
    academyOffers: [...state.academyOffers, ...generateAcademyOffers(state.player!, state.careerSeed).slice(0, 2)],
    player: { ...state.player!, fitness: 65, morale: 65, form: 65, squadRelation: 65 },
    contract: { ...state.contract!, remainingHalfYears: 6 },
    entertainmentV3: createEntertainmentV3State(state.selectedClubId),
  }
  result.entertainmentV3!.livingCity = syncLivingCity(createLivingCityState('eng_arsenal'), state.selectedClubId, windowIndex, state.careerSeed)
  return result
}
function purchased(category: 'BODY' | 'MENTAL' | 'SETTLE' = 'SETTLE', windowIndex = 10) {
  const state = fixture(windowIndex)
  return purchasePersonalArrangement(state, quotePersonalArrangement(state, category, 'PREMIUM').request)
}
function executed(state: GameState, zero = false) {
  return settlePersonalArrangementWindow(state, preparePersonalArrangementWindow(state, { ...state.player!, ...(zero ? { morale: 90, squadRelation: 90, fitness: 90 } : {}) }).receipts)
}
function installStorage() {
  const memory = new Map<string, string>()
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value) },
    removeItem: (key: string) => memory.delete(key),
  } })
  return memory
}
function checksum(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}
function legacyEnvelope(state: GameState) {
  const { entertainmentV3: _v3, ...legacy } = state
  const data = { ...legacy, saveVersion: 13, dataVersion: 13 }
  return JSON.stringify({ checksum: checksum(JSON.stringify(data)), data })
}
type Mutator = (s: GameState) => void

describe('V3 strictly validated save commitments', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips an intact purchase and a fractional capped execution receipt without losing precision', () => {
    installStorage()
    const state = purchased('BODY')
    const receipt = preparePersonalArrangementWindow(state, { ...state.player!, fitness: 84.5 }).receipts
    const settled = settlePersonalArrangementWindow(state, receipt)
    expect(settled.entertainmentV3!.arrangements[0]!.periods[0]!.actual!.fitness).toBe(0.5)
    expect(validateGameState(settled)).toEqual(settled)
    saveGame(settled, { strict: true })
    expect(loadGame()).toEqual(settled)
  })

  it('requires the V3 root on current version saves rather than silently treating them as OFF', () => {
    const state = fixture()
    const { entertainmentV3: _v3, ...missing } = state
    expect(() => validateGameState(missing)).toThrow()
    expect(() => validateGameState({ ...state, entertainmentV3: null })).toThrow()
  })

  it.each([
    ['root', (s: GameState) => { Object.assign(s.entertainmentV3!, { hiddenCashEuro: 500 }) }],
    ['arrangement', (s: GameState) => { Object.assign(s.entertainmentV3!.arrangements[0]!, { instantBonus: 9 }) }],
    ['period', (s: GameState) => { Object.assign(s.entertainmentV3!.arrangements[0]!.periods[0]!, { bonus: 9 }) }],
    ['planned gain', (s: GameState) => { Object.assign(s.entertainmentV3!.arrangements[0]!.periods[0]!.planned, { ability: 9 }) }],
    ['ledger', (s: GameState) => { Object.assign(s.entertainmentV3!.ledger[0]!, { duplicateBalance: 9 }) }],
    ['living city', (s: GameState) => { Object.assign(s.entertainmentV3!.livingCity, { arbitraryMove: true }) }],
    ['move', (s: GameState) => { Object.assign(s.entertainmentV3!.livingCity.moves[0]!, { confirmedByGuess: true }) }],
  ] satisfies [string, Mutator][])('rejects unknown fields in %s', (_name, mutate) => {
    const state = purchased()
    mutate(state)
    expect(() => validateGameState(state)).toThrow()
  })

  it.each([
    ['wrong frozen price', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.priceEuro = 20_000 }],
    ['wrong frozen gain', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[0]!.planned.morale = 3 }],
    ['wrong category duration', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods.pop() }],
    ['duplicate period window', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[1]!.windowIndex = 10 }],
    ['non-contiguous period window', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[1]!.windowIndex = 12 }],
    ['wrong purchase year', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.purchaseYear++ }],
    ['wrong career identity', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.careerSeed = 'another-career' }],
    ['pending actual', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[0]!.actual = { fitness: 0, morale: 1, squadRelation: 1 } }],
    ['unpaid commitment', (s: GameState) => { s.entertainmentV3!.ledger = [] }],
    ['double payment', (s: GameState) => { s.entertainmentV3!.ledger.push({ ...s.entertainmentV3!.ledger[0]!, id: 'second-payment' }) }],
    ['wrong payment amount', (s: GameState) => { s.entertainmentV3!.ledger[0]!.amountEuro-- }],
    ['orphan ledger', (s: GameState) => { s.entertainmentV3!.ledger[0]!.arrangementId = 'missing' }],
    ['settling without move', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.moveId = null }],
    ['duplicate arrangement ID', (s: GameState) => { s.entertainmentV3!.arrangements.push(structuredClone(s.entertainmentV3!.arrangements[0]!)) }],
    ['negative cash', (s: GameState) => { s.cashEuro = -1 }],
  ] satisfies [string, Mutator][])('rejects %s', (_name, mutate) => {
    const state = purchased()
    mutate(state)
    expect(() => validateGameState(state)).toThrow()
  })

  it.each([
    ['missing executed receipt', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[0]!.actual = null }],
    ['actual larger than planned', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[0]!.actual!.squadRelation = 3.1 }],
    ['negative actual', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[0]!.actual!.morale = -0.1 }],
    ['nonfinite actual', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[0]!.actual!.morale = Number.POSITIVE_INFINITY }],
    ['unknown actual field', (s: GameState) => { Object.assign(s.entertainmentV3!.arrangements[0]!.periods[0]!.actual!, { ability: 1 }) }],
    ['future execution', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[1]!.status = 'EXECUTED'; s.entertainmentV3!.arrangements[0]!.periods[1]!.actual = { fitness: 0, morale: 1, squadRelation: 1 } }],
  ] satisfies [string, Mutator][])('rejects tampered execution: %s', (_name, mutate) => {
    const state = executed(purchased())
    mutate(state)
    expect(() => validateGameState(state)).toThrow()
  })

  it('rejects pending periods whose career window has already passed', () => {
    const state = purchased('MENTAL')
    state.windowIndex = 11
    expect(() => validateGameState(state)).toThrow()
  })

  it('rejects current-window pending periods after a report has already been finalized', () => {
    const state = purchased('MENTAL')
    const report = runReadySimulation({ ...state, phase: 'SIMULATION_READY' }, { keyMatchMoments: false })
    expect(validateGameState(report)).toEqual(report)
    report.entertainmentV3!.arrangements[0]!.periods[0] = structuredClone(state.entertainmentV3!.arrangements[0]!.periods[0]!)
    expect(() => validateGameState(report)).toThrow()
  })

  it('requires report receipts to agree exactly with the corresponding executed period', () => {
    const state = purchased('MENTAL')
    const report = runReadySimulation({ ...state, phase: 'SIMULATION_READY' }, { keyMatchMoments: false })
    expect(report.lastReport!.personalArrangements!.receipts).toHaveLength(1)
    report.lastReport!.personalArrangements!.receipts[0]!.actual.morale = 0
    expect(() => validateGameState(report)).toThrow()
  })

  it.each(['remove personal report', 'remove all receipts'] as const)('does not allow an executed paid contribution to disappear from its saved report: %s', mode => {
    const state = purchased('MENTAL')
    const report = runReadySimulation({ ...state, phase: 'SIMULATION_READY' }, { keyMatchMoments: false })
    expect(validateGameState(report)).toEqual(report)
    if (mode === 'remove personal report') delete report.lastReport!.personalArrangements
    else report.lastReport!.personalArrangements!.receipts = []
    expect(() => validateGameState(report)).toThrow()
  })

  it('rejects a pending current period after the same completed report enters the dashboard', () => {
    const state = purchased('MENTAL')
    const report = runReadySimulation({ ...state, phase: 'SIMULATION_READY' }, { keyMatchMoments: false })
    report.phase = 'CAREER_DASHBOARD'
    expect(validateGameState(report)).toEqual(report)
    delete report.lastReport!.personalArrangements
    report.entertainmentV3!.arrangements[0]!.periods[0] = structuredClone(state.entertainmentV3!.arrangements[0]!.periods[0]!)
    expect(() => validateGameState(report)).toThrow()
  })

  it.each([
    ['receipt total different from refund', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.refundReceipts[0]!.amountEuro-- }],
    ['refund ledger different from receipt ID', (s: GameState) => { s.entertainmentV3!.ledger.find(l => l.kind === 'REFUND')!.id = 'forged-refund-id' }],
    ['refund ledger different from receipt reason', (s: GameState) => { s.entertainmentV3!.ledger.find(l => l.kind === 'REFUND')!.reason = 'forged refund reason' }],
    ['refund before purchase', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.refundReceipts[0]!.windowIndex = 9; s.entertainmentV3!.ledger.find(l => l.kind === 'REFUND')!.windowIndex = 9 }],
    ['wrong proportional refund', (s: GameState) => { const a = s.entertainmentV3!.arrangements[0]!; a.refundEuro++; a.refundReceipts[0]!.amountEuro++; s.entertainmentV3!.ledger.find(l => l.kind === 'REFUND')!.amountEuro++ }],
    ['executed quota restored', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.quotaRestored = true }],
    ['terminated without cause', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.terminationCause = null }],
    ['refund above price', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.refundEuro = 60_001 }],
  ] satisfies [string, Mutator][])('rejects inconsistent refunds: %s', (_name, mutate) => {
    const state = terminatePersonalArrangements(executed(purchased()), 'MOVE')
    expect(validateGameState(state)).toEqual(state)
    mutate(state)
    expect(() => validateGameState(state)).toThrow()
  })

  it('does not accept forged cross-year quota restoration for a zero-execution full cancellation', () => {
    const state = purchased('MENTAL', 11)
    const cancelled = terminatePersonalArrangements({ ...state, windowIndex: 12 }, 'RETIREMENT')
    expect(cancelled.entertainmentV3!.arrangements[0]!.quotaRestored).toBe(false)
    expect(validateGameState(cancelled)).toEqual(cancelled)
    cancelled.entertainmentV3!.arrangements[0]!.quotaRestored = true
    expect(() => validateGameState(cancelled)).toThrow()
  })

  it('does not accept a service purchased before adulthood or before the V3 activation window', () => {
    const state = purchased('BODY')
    const a = state.entertainmentV3!.arrangements[0]!
    a.purchaseWindowIndex = 9
    a.purchaseYear = 2030
    a.periods[0]!.windowIndex = 9
    state.entertainmentV3!.ledger[0]!.windowIndex = 9
    expect(() => validateGameState(state)).toThrow()
    const beforeActivation = purchased('BODY')
    beforeActivation.entertainmentV3!.activationWindowIndex = 11
    expect(() => validateGameState(beforeActivation)).toThrow()
  })

  it('rejects two non-restored annual purchases even when their IDs and payment ledgers are distinct', () => {
    const state = purchased('MENTAL')
    const second = structuredClone(state.entertainmentV3!.arrangements[0]!)
    second.id = `${second.id}:second`
    state.entertainmentV3!.arrangements.push(second)
    state.entertainmentV3!.ledger.push({ ...state.entertainmentV3!.ledger[0]!, id: `${second.id}:payment`, arrangementId: second.id })
    expect(() => validateGameState(state)).toThrow()
  })

  it('compares individual refund ledger entries with receipts, not only their equal aggregate', () => {
    const state = terminatePersonalArrangements(executed(purchased()), 'MOVE')
    const a = state.entertainmentV3!.arrangements[0]!
    const original = a.refundReceipts[0]!
    a.refundReceipts = [{ ...original, amountEuro: 20_000 }, { ...original, id: `${original.id}:second`, amountEuro: 20_000 }]
    state.entertainmentV3!.ledger = state.entertainmentV3!.ledger.filter(l => l.kind === 'PAYMENT')
    state.entertainmentV3!.ledger.push(
      { ...a.refundReceipts[0]!, arrangementId: a.id, kind: 'REFUND', amountEuro: 19_999 },
      { ...a.refundReceipts[1]!, arrangementId: a.id, kind: 'REFUND', amountEuro: 20_001 },
    )
    expect(() => validateGameState(state)).toThrow()
  })

  it.each([
    ['nonfinite price', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.priceEuro = Number.POSITIVE_INFINITY }],
    ['fractional price', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.priceEuro = 59_999.5 }],
    ['negative payment', (s: GameState) => { s.entertainmentV3!.ledger[0]!.amountEuro = -1 }],
    ['fractional payment', (s: GameState) => { s.entertainmentV3!.ledger[0]!.amountEuro = 59_999.5 }],
    ['fractional planned gain', (s: GameState) => { s.entertainmentV3!.arrangements[0]!.periods[0]!.planned.morale = 3.5 }],
    ['unsupported rule version', (s: GameState) => { Object.assign(s.entertainmentV3!, { rulesVersion: 2 }) }],
    ['unsupported cash policy', (s: GameState) => { Object.assign(s.entertainmentV3!, { cashPolicy: 'INVENTED' }) }],
    ['too many purchases', (s: GameState) => { s.entertainmentV3!.arrangements = Array.from({ length: 65 }, () => structuredClone(s.entertainmentV3!.arrangements[0]!)) }],
    ['too many periods', (s: GameState) => { const a = s.entertainmentV3!.arrangements[0]!; a.periods.push(structuredClone(a.periods[2]!)) }],
    ['too many ledger entries', (s: GameState) => { s.entertainmentV3!.ledger = Array.from({ length: 193 }, () => structuredClone(s.entertainmentV3!.ledger[0]!)) }],
    ['too many moves', (s: GameState) => { s.entertainmentV3!.livingCity.moves = Array.from({ length: 65 }, () => structuredClone(s.entertainmentV3!.livingCity.moves[0]!)) }],
  ] satisfies [string, Mutator][])('rejects nonfinite, fractional or unbounded records: %s', (_name, mutate) => {
    const state = purchased()
    mutate(state)
    expect(() => validateGameState(state)).toThrow()
  })

  it('requires a move to be the actual current eligibility, not any historical matching city', () => {
    const state = fixture()
    state.entertainmentV3!.livingCity.eligibilityMoveId = null
    expect(quotePersonalArrangement(state, 'SETTLE', 'PREMIUM').disabledReason).not.toBeNull()
    expect(() => purchasePersonalArrangement(state, quotePersonalArrangement(state, 'SETTLE', 'PREMIUM').request)).toThrow()
  })

  it('preserves the exact original V13 envelope before migrating to V14', () => {
    const memory = installStorage()
    const raw = legacyEnvelope(fixture())
    memory.set('career_save_current', raw)
    const loaded = loadGame()!
    expect(loaded.saveVersion).toBe(14)
    expect(loaded.dataVersion).toBe(14)
    expect(loaded.entertainmentV3!.activationWindowIndex).toBe(10)
    expect(loaded.entertainmentV3!.arrangements).toEqual([])
    expect(loaded.entertainmentV3!.livingCity.moves).toEqual([])
    expect(memory.get('career_save_v13_backup')).toBe(raw)
    expect(memory.get('career_save_current')).not.toBe(raw)
    expect(loadGame()).toEqual(loaded)
    expect(memory.get('career_save_v13_backup')).toBe(raw)
  })

  it('defers V13 in-flight simulation activation until the following editable window', () => {
    const memory = installStorage()
    memory.set('career_save_current', legacyEnvelope({ ...fixture(), phase: 'SIMULATION_READY' }))
    const loaded = loadGame()!
    expect(loaded.entertainmentV3!.activationWindowIndex).toBe(11)
    expect(quotePersonalArrangement({ ...loaded, phase: 'HALF_YEAR_PLAN' }, 'BODY', 'BASIC').disabledReason).not.toBeNull()
    expect(quotePersonalArrangement({ ...loaded, phase: 'HALF_YEAR_PLAN', windowIndex: 11 }, 'BODY', 'BASIC').disabledReason).toBeNull()
  })

  it('does not overwrite current V13 bytes when the independent backup write cannot be confirmed', () => {
    const memory = installStorage()
    const raw = legacyEnvelope(fixture())
    memory.set('career_save_current', raw)
    const storage = window.localStorage
    const set = storage.setItem
    storage.setItem = (key: string, value: string) => { if (key !== 'career_save_v13_backup') set(key, value) }
    expect(() => loadGame()).toThrow()
    expect(memory.get('career_save_current')).toBe(raw)
    expect(memory.has('career_save_v13_backup')).toBe(false)
  })

  it('does not report migration success after an unconfirmed normalized-current write', () => {
    const memory = installStorage()
    const raw = legacyEnvelope(fixture())
    memory.set('career_save_current', raw)
    const storage = window.localStorage
    const set = storage.setItem
    storage.setItem = (key: string, value: string) => { if (key !== 'career_save_current') set(key, value) }
    expect(() => loadGame()).toThrow('未确认')
    expect(memory.get('career_save_current')).toBe(raw)
    expect(memory.get('career_save_v13_backup')).toBe(raw)
  })
})
