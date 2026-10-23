import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLUBS } from '../data/balance'
import type { GameState } from '../models/game'
import { createTrainingBaselineState } from '../engine/__tests__/ceuTrainingBaselineFixture'
import { createEntertainmentV3State } from '../engine/entertainmentV3'
import { generateAcademyOffers } from '../engine/offers'
import { quotePersonalArrangement } from '../engine/personalArrangements'
import { saveGame, loadGame } from '../persistence/save'
import { completePendingMoment } from '../testing/keyMatchMomentTestSupport'
import { eligibleCareerEventChoices, getCareerEvent } from '../engine/careerEvents'
import { useGameStore } from './gameStore'

const currentKey = 'career_save_current'
function fixture(): GameState {
  const { state } = createTrainingBaselineState('V3-STORE-TRANSACTION', CLUBS.find(c => c.id === 'eng_liverpool')!)
  return {
    ...state, phase: 'HALF_YEAR_PLAN', windowIndex: 10, cashEuro: 100_000,
    academyOffers: [...state.academyOffers, ...generateAcademyOffers(state.player!, state.careerSeed).slice(0, 2)],
    player: { ...state.player!, fitness: 65, morale: 65, form: 65, squadRelation: 65 },
    contract: { ...state.contract!, remainingHalfYears: 6 },
    entertainmentV3: createEntertainmentV3State(state.selectedClubId),
  }
}
function storage() {
  const memory = new Map<string, string>()
  const control = { failWrite: false, loseWrite: false, uncertainRead: false, readFault: false, writes: 0 }
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => {
      if (key === currentKey && control.readFault) { control.readFault = false; throw new Error('READBACK_UNCERTAIN') }
      return memory.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      if (key === currentKey) {
        if (control.failWrite) throw new Error('WRITE_FAILED')
        control.writes++
        if (control.loseWrite) return
        memory.set(key, value)
        if (control.uncertainRead) { control.uncertainRead = false; control.readFault = true }
      } else memory.set(key, value)
    },
    removeItem: (key: string) => memory.delete(key),
  } })
  return { memory, control }
}
function install() {
  const installed = storage()
  saveGame(fixture(), { strict: true })
  const game = loadGame()!
  useGameStore.setState({ game, hasSave: true, error: null, isReviewingReport: false, voluntaryRetirementConfirmation: null })
  return { ...installed, game, request: quotePersonalArrangement(game, 'MENTAL', 'PREMIUM').request }
}

describe('V3 durable personal-arrangement store transactions', () => {
  beforeEach(() => useGameStore.setState({ game: null, hasSave: false, error: null, isReviewingReport: false, voluntaryRetirementConfirmation: null }))
  afterEach(() => vi.unstubAllGlobals())

  it('commits cash, annual purchase, frozen schedule and payment together to a readable save', () => {
    const { game, request } = install()
    useGameStore.getState().purchasePersonalArrangement(request)
    const store = useGameStore.getState()
    expect(store.error).toBeNull()
    expect(store.game!.cashEuro).toBe(60_000)
    expect(store.game!.player).toEqual(game.player)
    expect(store.game!.entertainmentV3!.arrangements[0]!.id).toBe(request.purchaseId)
    expect(store.game!.entertainmentV3!.arrangements[0]!.periods.map(p => p.status)).toEqual(['PENDING', 'PENDING'])
    expect(store.game!.entertainmentV3!.ledger).toHaveLength(1)
    expect(loadGame()).toEqual(store.game)
  })

  it('accepts a semantically identical in-memory quote even when schema parsing changes object property order', () => {
    storage()
    const game = fixture()
    saveGame(game, { strict: true })
    expect(loadGame()).toEqual(game)
    useGameStore.setState({ game, hasSave: true, error: null })
    const request = quotePersonalArrangement(game, 'MENTAL', 'PREMIUM').request
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().error).toBeNull()
    expect(useGameStore.getState().game!.cashEuro).toBe(60_000)
    expect(loadGame()!.entertainmentV3!.arrangements).toHaveLength(1)
  })

  it('double-clicks and an old action closure do not charge or append twice', () => {
    const { request, control } = install()
    const oldAction = useGameStore.getState().purchasePersonalArrangement
    oldAction(request)
    const writes = control.writes
    const first = structuredClone(useGameStore.getState().game)
    oldAction(request)
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().game).toEqual(first)
    expect(useGameStore.getState().game!.cashEuro).toBe(60_000)
    expect(useGameStore.getState().game!.entertainmentV3!.arrangements).toHaveLength(1)
    expect(useGameStore.getState().game!.entertainmentV3!.ledger).toHaveLength(1)
    expect(control.writes).toBe(writes)
  })

  it.each(['no window', 'no localStorage'] as const)('fails without durable storage: %s', mode => {
    const game = fixture()
    vi.stubGlobal('window', mode === 'no window' ? undefined : {})
    expect(() => saveGame(game, { strict: true })).toThrow()
    useGameStore.setState({ game, error: null })
    useGameStore.getState().purchasePersonalArrangement(quotePersonalArrangement(game, 'BODY', 'BASIC').request)
    expect(useGameStore.getState().game).toBe(game)
    expect(useGameStore.getState().game!.cashEuro).toBe(100_000)
    expect(useGameStore.getState().error).not.toBeNull()
  })

  it('does not mutate in-memory cash or schedule when the current-save write throws', () => {
    const { game, request, memory, control } = install()
    const raw = memory.get(currentKey)
    control.failWrite = true
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().error).toBe('WRITE_FAILED')
    expect(useGameStore.getState().game).toBe(game)
    expect(memory.get(currentKey)).toBe(raw)
    control.failWrite = false
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().game!.cashEuro).toBe(60_000)
    expect(loadGame()!.entertainmentV3!.ledger).toHaveLength(1)
  })

  it('detects a silent lost write and safely retries the same purchase ID', () => {
    const { game, request, control } = install()
    control.loseWrite = true
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().error).toContain('未确认')
    expect(useGameStore.getState().game).toBe(game)
    control.loseWrite = false
    expect(loadGame()!.cashEuro).toBe(100_000)
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().error).toBeNull()
    expect(loadGame()!.cashEuro).toBe(60_000)
    expect(loadGame()!.entertainmentV3!.ledger).toHaveLength(1)
  })

  it('recovers a successful-but-uncertain write by durable purchase ID without charging or writing again', () => {
    const { game, request, control, memory } = install()
    control.uncertainRead = true
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().error).toBe('READBACK_UNCERTAIN')
    expect(useGameStore.getState().game).toBe(game)
    const durable = JSON.parse(memory.get(currentKey)!).data as GameState
    expect(durable.cashEuro).toBe(60_000)
    expect(durable.entertainmentV3!.arrangements[0]!.id).toBe(request.purchaseId)
    const writes = control.writes
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().error).toBeNull()
    expect(useGameStore.getState().game).toEqual(durable)
    expect(control.writes).toBe(writes)
    expect(loadGame()!.entertainmentV3!.ledger).toHaveLength(1)
  })

  it('rejects an old confirmation after cash or tier changes without a durable mutation', () => {
    const { game, request, control } = install()
    const updated = { ...game, cashEuro: 99_999 }
    saveGame(updated, { strict: true })
    useGameStore.setState({ game: updated })
    const writes = control.writes
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().error).not.toBeNull()
    expect(useGameStore.getState().game).toBe(updated)
    expect(control.writes).toBe(writes)
    const newQuote = quotePersonalArrangement(updated, 'MENTAL', 'BASIC').request
    useGameStore.getState().purchasePersonalArrangement({ ...newQuote, tier: 'PREMIUM' })
    expect(useGameStore.getState().game).toBe(updated)
    expect(control.writes).toBe(writes)
  })

  it('rejects an old confirmation after plan selection changes', () => {
    const { game, request, control } = install()
    const updated = { ...game, trainingFocus: 'physical' as const, developmentApproach: 'PUSH' as const }
    saveGame(updated, { strict: true })
    useGameStore.setState({ game: updated })
    const writes = control.writes
    useGameStore.getState().purchasePersonalArrangement(request)
    expect(useGameStore.getState().error).not.toBeNull()
    expect(useGameStore.getState().game).toBe(updated)
    expect(control.writes).toBe(writes)
  })

  it('rejects old career/window closures and refuses payment while reviewing a report or confirming retirement', () => {
    const { game, request, control } = install()
    const action = useGameStore.getState().purchasePersonalArrangement
    const next = { ...game, careerSeed: 'V3-DIFFERENT-CAREER' }
    saveGame(next, { strict: true })
    useGameStore.setState({ game: next })
    const writes = control.writes
    action(request)
    expect(useGameStore.getState().game).toBe(next)
    expect(control.writes).toBe(writes)
    saveGame(game, { strict: true })
    useGameStore.setState({ game, error: null, isReviewingReport: true })
    action(request)
    expect(useGameStore.getState().game).toBe(game)
    useGameStore.setState({ isReviewingReport: false, voluntaryRetirementConfirmation: {} as NonNullable<ReturnType<typeof useGameStore.getState>['voluntaryRetirementConfirmation']> })
    action(request)
    expect(useGameStore.getState().game).toBe(game)
    const later = { ...game, windowIndex: 11 }
    saveGame(later, { strict: true })
    useGameStore.setState({ game: later, voluntaryRetirementConfirmation: null })
    action(request)
    expect(useGameStore.getState().game).toBe(later)
    expect(loadGame()!.cashEuro).toBe(100_000)
  })

  it('settles a paid period through public plan/event/key-moment actions and survives reload without consuming it again', () => {
    const { request } = install()
    useGameStore.getState().purchasePersonalArrangement(request)
    useGameStore.getState().chooseTraining('BALANCED', 'STEADY')
    for (let n = 0; n < 5 && useGameStore.getState().game!.phase === 'SPECIAL_EVENT'; n++) {
      const state = useGameStore.getState().game!
      const event = getCareerEvent(state.pendingCareerEvent!.eventId, state)
      const pending = state.pendingCareerEvent!
      const route = event.setup?.options.find(o => o.id === pending.variantId)
      const choice = event.setup && pending.stepIndex === 0 ? event.setup.options[0]!.id : route?.choiceIds[0] ?? eligibleCareerEventChoices(state, event)[0]!.id
      useGameStore.getState().chooseCareerEvent(choice)
    }
    if (useGameStore.getState().game!.phase === 'SPECIAL_EVENT_RESULT') useGameStore.getState().continueAfterCareerEvent()
    completePendingMoment(useGameStore.getState)
    const store = useGameStore.getState()
    expect(store.error).toBeNull()
    expect(store.game!.phase).toBe('HALF_YEAR_REPORT')
    expect(store.game!.lastReport!.personalArrangements!.receipts).toHaveLength(1)
    expect(store.game!.entertainmentV3!.arrangements[0]!.periods.map(p => p.status)).toEqual(['EXECUTED', 'PENDING'])
    const after = structuredClone(store.game)
    store.continueCareer()
    expect(useGameStore.getState().game).toEqual(after)
    expect(loadGame()).toEqual(after)
    expect(after!.entertainmentV3!.ledger.filter(l => l.kind === 'PAYMENT')).toHaveLength(1)
  })
})
