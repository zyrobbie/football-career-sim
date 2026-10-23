import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import type { GameState } from '../../models/game'
import type { ArrangementGain, PersonalArrangementCategory, PersonalArrangementTier } from '../../models/personalArrangements'
import { createTrainingBaselineState } from './ceuTrainingBaselineFixture'
import { createEntertainmentV3State } from '../entertainmentV3'
import { createLivingCityState, syncLivingCity } from '../livingCity'
import {
  arrangementEligibility, gameYearAtWindow, PERSONAL_ARRANGEMENT_OFFERS,
  preparePersonalArrangementWindow, purchasePersonalArrangement, quotePersonalArrangement,
  settlePersonalArrangementWindow, terminatePersonalArrangements,
} from '../personalArrangements'
import { prepareArrangementQuotePlayer, prepareFirstTeamSimulation, prepareReadySimulation } from '../simulationPreparation'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import { simulateHalfYear } from '../simulateHalfYear'

function fixture(windowIndex = 10): GameState {
  const club = CLUBS.find(c => c.id === 'eng_liverpool')!
  const { state } = createTrainingBaselineState('V3-PERSONAL-RULES', club)
  state.phase = 'HALF_YEAR_PLAN'
  state.windowIndex = windowIndex
  state.cashEuro = 100_000
  state.player = { ...state.player!, form: 65, fitness: 65, morale: 65, squadRelation: 65 }
  state.entertainmentV3 = createEntertainmentV3State(state.selectedClubId)
  state.entertainmentV3.livingCity = syncLivingCity(createLivingCityState('eng_arsenal'), state.selectedClubId, windowIndex, state.careerSeed)
  state.contract = { ...state.contract!, remainingHalfYears: 6 }
  return state
}
function buy(state: GameState, category: PersonalArrangementCategory = 'BODY', tier: PersonalArrangementTier = 'BASIC') {
  return purchasePersonalArrangement(state, quotePersonalArrangement(state, category, tier).request)
}
function execute(state: GameState, values: Partial<ArrangementGain> = {}) {
  const prepared = preparePersonalArrangementWindow(state, { ...state.player!, ...values })
  return settlePersonalArrangementWindow(state, prepared.receipts)
}
const tiers = ['BASIC', 'PLUS', 'PREMIUM'] as const
const offers = (['BODY', 'MENTAL', 'SETTLE'] as const).flatMap(category => tiers.map((tier, i) => ({
  category, tier,
  price: (category === 'SETTLE' ? [10_000, 20_000, 60_000] : [2_000, 10_000, 40_000])[i]!,
  count: category === 'BODY' ? 1 : category === 'MENTAL' ? 2 : 3,
  gain: { fitness: category === 'BODY' ? [2, 4, 8][i]! : 0, morale: category !== 'BODY' ? [1, 2, 4][i]! : 0, squadRelation: category === 'SETTLE' ? [1, 2, 3][i]! : 0 },
})))

describe('V3 frozen personal arrangements', () => {
  it.each(offers)('$category $tier freezes its price and all $count periods without applying benefits at purchase', row => {
    const state = fixture()
    const before = structuredClone(state)
    const quoted = quotePersonalArrangement(state, row.category, row.tier)
    const next = purchasePersonalArrangement(state, quoted.request)
    expect(PERSONAL_ARRANGEMENT_OFFERS).toHaveLength(9)
    expect(quoted.offer).toMatchObject({ priceEuro: row.price, periods: row.count, gain: row.gain })
    expect(quoted.total).toEqual(Object.fromEntries(Object.entries(row.gain).map(([k, v]) => [k, v * row.count])))
    expect(next.cashEuro).toBe(100_000 - row.price)
    expect(next.player).toEqual(before.player)
    expect(state).toEqual(before)
    expect(next.entertainmentV3!.arrangements[0]).toMatchObject({ purchaseYear: 2031, purchaseWindowIndex: 10, rulesVersion: 1, cap: 85, refundEuro: 0 })
    expect(next.entertainmentV3!.arrangements[0]!.periods).toEqual(Array.from({ length: row.count }, (_, i) => ({ windowIndex: 10 + i, status: 'PENDING', planned: row.gain, actual: null, reason: null })))
    expect(next.entertainmentV3!.ledger).toHaveLength(1)
    expect(next.entertainmentV3!.ledger[0]).toMatchObject({ kind: 'PAYMENT', amountEuro: row.price, windowIndex: 10 })
    for (let i = 0; i < row.count; i++) {
      const current = { ...next, windowIndex: 10 + i }
      const preview = preparePersonalArrangementWindow(current, current.player!)
      expect(preview.receipts[0]!.actual).toEqual(row.gain)
    }
  })

  it('uses the same two-half-year calendar year for quota and allows the following year', () => {
    expect([0, 1, 2, 3, 10, 11].map(w => gameYearAtWindow(2026, w))).toEqual([2026, 2026, 2027, 2027, 2031, 2031])
    const purchased = execute(buy(fixture()))
    expect(arrangementEligibility({ ...purchased, windowIndex: 11 }, 'MENTAL')).not.toBeNull()
    expect(arrangementEligibility({ ...purchased, windowIndex: 12 }, 'MENTAL')).toBeNull()
  })

  it('does not consume cash, quota, periods or city eligibility when a quote is opened or abandoned', () => {
    const state = fixture()
    const before = JSON.stringify(state)
    for (let i = 0; i < 5; i++) quotePersonalArrangement(state, 'SETTLE', 'PREMIUM')
    expect(JSON.stringify(state)).toBe(before)
    expect(arrangementEligibility(state, 'SETTLE')).toBeNull()
  })

  it('requires 18+ and a live contract but permits an adult contracted youth player', () => {
    expect(arrangementEligibility(fixture(9), 'BODY')).not.toBeNull()
    const adult = fixture(10)
    expect(arrangementEligibility(adult, 'BODY')).toBeNull()
    expect(arrangementEligibility({ ...adult, contract: null }, 'BODY')).not.toBeNull()
    expect(arrangementEligibility({ ...adult, contract: { ...adult.contract!, remainingHalfYears: 0 } }, 'BODY')).not.toBeNull()
    expect(arrangementEligibility({ ...adult, teamLevel: 'YOUTH', youthRole: 'CORE', firstTeamRole: null, contract: { ...adult.contract!, promisedTeamLevel: 'YOUTH', promisedRole: 'CORE' } }, 'BODY')).toBeNull()
  })

  it.each(['SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT', 'SIMULATION_READY', 'KEY_MATCH_MOMENT', 'KEY_MATCH_MOMENT_RESULT', 'HALF_YEAR_REPORT', 'RETIREMENT_DECISION', 'CAREER_RETIRED'] as const)
  ('cannot purchase in %s', phase => expect(arrangementEligibility({ ...fixture(), phase }, 'BODY')).not.toBeNull())

  it('does not permit a HALF_YEAR_PLAN state with an in-flight event or key moment to purchase', () => {
    const state = fixture()
    expect(arrangementEligibility({ ...state, pendingCareerEvent: { eventId: 'FITNESS_WARNING', interactionKind: 'CHOICE', stepIndex: 0, selections: [], variantId: null } }, 'BODY')).not.toBeNull()
    expect(arrangementEligibility({ ...state, pendingKeyMatchMoment: {} as NonNullable<GameState['pendingKeyMatchMoment']> }, 'BODY')).not.toBeNull()
  })

  it('does not activate paid benefits in a frozen legacy window', () => {
    const state = buy(fixture())
    state.entertainmentV3!.activationWindowIndex = 11
    const result = preparePersonalArrangementWindow(state, state.player!)
    expect(result.player).toEqual(state.player)
    expect(result.receipts).toEqual([])
    expect(arrangementEligibility(state)).not.toBeNull()
  })

  it('blocks active same-category renewals across years while allowing a different category', () => {
    const state = execute(buy(fixture(11), 'MENTAL', 'PREMIUM'))
    const nextYear = { ...state, windowIndex: 12 }
    expect(arrangementEligibility(nextYear, 'MENTAL')).not.toBeNull()
    expect(arrangementEligibility(nextYear, 'BODY')).toBeNull()
    expect(quotePersonalArrangement(nextYear, 'MENTAL', 'BASIC').disabledReason).not.toBeNull()
    expect(buy(nextYear, 'BODY').entertainmentV3!.arrangements).toHaveLength(2)
  })

  it('binds stale quotes to cash, player and current plan selection while keeping purchase identity stable', () => {
    const state = fixture()
    const q = quotePersonalArrangement(state, 'BODY', 'BASIC')
    const cashChanged = { ...state, cashEuro: state.cashEuro - 1 }
    expect(quotePersonalArrangement(cashChanged, 'BODY', 'BASIC').request.purchaseId).toBe(q.request.purchaseId)
    expect(quotePersonalArrangement(cashChanged, 'BODY', 'BASIC').quoteId).not.toBe(q.quoteId)
    expect(() => purchasePersonalArrangement(cashChanged, q.request)).toThrow()
    expect(() => purchasePersonalArrangement({ ...state, player: { ...state.player!, morale: 60 } }, q.request)).toThrow()
    expect(() => purchasePersonalArrangement({ ...state, trainingFocus: 'physical', developmentApproach: 'PUSH' }, q.request)).toThrow()
  })

  it('never overdrafts and purchasing the same ID twice is an exact no-op', () => {
    const state = fixture()
    expect(() => buy({ ...state, cashEuro: 1_999 })).toThrow()
    const request = quotePersonalArrangement(state, 'BODY', 'BASIC').request
    const first = purchasePersonalArrangement(state, request)
    expect(purchasePersonalArrangement(first, request)).toBe(first)
    expect(first.cashEuro).toBe(98_000)
    expect(first.entertainmentV3!.ledger.filter(l => l.kind === 'PAYMENT')).toHaveLength(1)
  })

  it('uses strategy and age-normalized maintenance for body-sale eligibility rather than raw fitness', () => {
    const state = fixture()
    state.player!.fitness = 85
    expect(quotePersonalArrangement(state, 'BODY', 'BASIC', { focus: 'BALANCED', approach: 'PUSH' }).disabledReason).toBeNull()
    expect(quotePersonalArrangement(state, 'BODY', 'BASIC', { focus: 'BALANCED', approach: 'STEADY' }).disabledReason).not.toBeNull()
    const older = { ...state, windowIndex: 36, player: { ...state.player!, fitness: 80 } }
    expect(quotePersonalArrangement(older, 'BODY', 'BASIC', { focus: 'BODY_CARE', approach: 'STEADY' }).disabledReason).not.toBeNull()
    state.player!.morale = 90
    state.player!.squadRelation = 90
    expect(quotePersonalArrangement(state, 'MENTAL', 'PREMIUM').disabledReason).toBeNull()
    expect(quotePersonalArrangement(state, 'SETTLE', 'PREMIUM').disabledReason).toBeNull()
  })

  it('shows one remaining playable period at W55, freezes all promised periods, and rejects no playable window', () => {
    const state = fixture(55)
    expect(quotePersonalArrangement(state, 'SETTLE', 'PREMIUM').availablePeriods).toBe(1)
    expect(buy(state, 'SETTLE', 'PREMIUM').entertainmentV3!.arrangements[0]!.periods.map(p => p.windowIndex)).toEqual([55, 56, 57])
    expect(quotePersonalArrangement(fixture(56), 'MENTAL', 'PREMIUM').disabledReason).not.toBeNull()
  })

  it('caps chronologically across year/category overlap, independently per target, with fractional actual gains', () => {
    const first = execute(buy(fixture(11), 'SETTLE', 'PREMIUM'))
    const second = buy({ ...first, windowIndex: 12 }, 'MENTAL', 'PREMIUM')
    second.entertainmentV3!.arrangements.reverse()
    const prepared = preparePersonalArrangementWindow(second, { ...second.player!, morale: 80.5, squadRelation: 84.5, fitness: 90 })
    expect(prepared.receipts.map(r => r.arrangementId)).toEqual([...second.entertainmentV3!.arrangements].reverse().map(a => a.id))
    expect(prepared.receipts.map(r => r.actual)).toEqual([{ fitness: 0, morale: 4, squadRelation: 0.5 }, { fitness: 0, morale: 0.5, squadRelation: 0 }])
    expect(prepared.player).toMatchObject({ morale: 85, squadRelation: 85, fitness: 90 })
    expect(prepared.receipts.every(r => r.reason !== null)).toBe(true)
  })

  it('quotes current possible gain after earlier pending commitments have their chronological allocation', () => {
    const old = execute(buy(fixture(11), 'SETTLE', 'PREMIUM'))
    const state = { ...old, windowIndex: 12, player: { ...old.player!, morale: 80 } }
    const quote = quotePersonalArrangement(state, 'MENTAL', 'PREMIUM')
    expect(quote.disabledReason).toBeNull()
    expect(quote.currentPossible.morale).toBe(1)
    expect(quote.total.morale).toBe(8)
    expect(preparePersonalArrangementWindow(state, prepareArrangementQuotePlayer(state, 'BALANCED', 'STEADY')).receipts[0]!.actual.morale).toBe(4)
  })

  it.each([80, 85, 90])('uses cap 85 without lowering an existing value of %s', value => {
    const state = buy(fixture(), 'MENTAL', 'PREMIUM')
    const prepared = preparePersonalArrangementWindow(state, { ...state.player!, morale: value })
    expect(prepared.player.morale).toBe(value === 80 ? 84 : value)
    expect(prepared.receipts[0]!.actual.morale).toBe(value === 80 ? 4 : 0)
  })

  it('preserves the engine tenth-point precision when a cap leaves a decimal fractional gain', () => {
    const state = buy(fixture(), 'MENTAL', 'PREMIUM')
    const prepared = preparePersonalArrangementWindow(state, { ...state.player!, morale: 84.9 })
    expect(prepared.receipts[0]!.actual.morale).toBe(0.1)
    expect(prepared.player.morale).toBe(85)
  })

  it('all previews are pure and repeated settlement cannot execute or refund twice', () => {
    const purchased = buy(fixture(), 'MENTAL', 'PREMIUM')
    const before = JSON.stringify(purchased)
    const a = preparePersonalArrangementWindow(purchased, purchased.player!)
    const b = preparePersonalArrangementWindow(purchased, purchased.player!)
    expect(a).toEqual(b)
    expect(JSON.stringify(purchased)).toBe(before)
    const settled = settlePersonalArrangementWindow(purchased, a.receipts)
    expect(settled.entertainmentV3!.arrangements[0]!.periods.map(p => p.status)).toEqual(['EXECUTED', 'PENDING'])
    expect(settlePersonalArrangementWindow(settled, a.receipts)).toEqual(settled)
    expect(preparePersonalArrangementWindow(settled, settled.player!).receipts).toEqual([])
  })

  it('does not let paid recovery cancel the previously decided recovery priority or re-enable PUSH', () => {
    const state = fixture(36)
    state.player = { ...state.player!, fitness: 44, form: 70, morale: 70 }
    const paid = buy(state, 'BODY', 'PREMIUM')
    const before = JSON.stringify(paid)
    const prepared = prepareFirstTeamSimulation(paid, 'BODY_CARE', 'PUSH')
    expect(prepared.preparation.recovery).toBe(true)
    expect(prepared.preparation.effectiveApproach).toBeNull()
    expect(prepared.preparation.trainingBonus).toBe(0)
    expect(prepared.trainingExecution).toMatchObject({ recovery: true, gains: { form: 0, fitness: 0, morale: 0 }, costs: { form: 0, fitness: 0, morale: 0 } })
    expect(prepared.workingPlayer.fitness).toBe(62)
    expect(prepared.workingPlayer.coachRelation).toBe(paid.player!.coachRelation)
    expect(prepared.personalArrangementReceipts[0]!.actual.fitness).toBe(8)
    expect(JSON.stringify(paid)).toBe(before)
  })

  it('applies due event consequences before recovery, original strategy and paid preparation', () => {
    const state = fixture()
    state.player!.fitness = 48
    state.pendingConsequences = [{ id: 'V3-PREPARATION-CONSEQUENCE', sourceEventId: 'FITNESS_WARNING', applyAtWindow: 10, playerDelta: { fitness: -4 }, trainingBonus: 0, summary: '本期身体负担。' }]
    const paid = buy(state, 'BODY', 'PREMIUM')
    const ready = prepareReadySimulation(paid)
    const prepared = prepareFirstTeamSimulation(ready.simulationState, 'BALANCED', 'PUSH')
    expect(ready.simulationState.pendingConsequences).toEqual([])
    expect(prepared.startPlayer.fitness).toBe(44)
    expect(prepared.preparation.recovery).toBe(true)
    expect(prepared.workingPlayer.fitness).toBe(62)
    expect(prepareArrangementQuotePlayer(state, 'BALANCED', 'PUSH').fitness).toBe(54)
  })

  it('records exactly one preparation receipt in both first-team and adult contracted youth simulations', () => {
    const first = buy(fixture(), 'MENTAL', 'PREMIUM')
    const offer = first.academyOffers.find(o => o.club.id === first.selectedClubId)!
    const firstResult = simulateProfessionalHalfYear({ state: first, offer })
    expect(firstResult.report.personalArrangements?.receipts).toHaveLength(1)
    const youth = { ...first, teamLevel: 'YOUTH' as const, youthRole: 'CORE' as const, firstTeamRole: null, contract: { ...first.contract!, promisedTeamLevel: 'YOUTH' as const, promisedRole: 'CORE' as const } }
    const result = simulateHalfYear({ player: youth.player!, offer, role: 'CORE', arrivalChoice: null, startYear: youth.startYear, windowIndex: youth.windowIndex, cashBeforeEuro: youth.cashEuro, careerSeed: youth.careerSeed, trainingFocus: 'BALANCED', developmentApproach: 'STEADY', teamLevel: 'YOUTH', firstTeamProgress: youth.firstTeamProgress, personalArrangementState: youth })
    expect(result.report.personalArrangements?.receipts).toHaveLength(1)
    expect(first.entertainmentV3!.arrangements[0]!.periods.every(p => p.status === 'PENDING')).toBe(true)
  })

  it.each(['MOVE', 'CITY_UNKNOWN', 'RETIREMENT'] as const)('refunds unused periods once on %s, preserving benefits already received', cause => {
    const purchased = buy(fixture(), 'SETTLE', 'PREMIUM')
    const afterOne = execute(purchased)
    const stopped = terminatePersonalArrangements({ ...afterOne, windowIndex: 11 }, cause)
    expect(stopped.cashEuro).toBe(80_000)
    expect(stopped.entertainmentV3!.arrangements[0]).toMatchObject({ refundEuro: 40_000, quotaRestored: false, terminationCause: cause })
    expect(stopped.entertainmentV3!.arrangements[0]!.periods.map(p => p.status)).toEqual(['EXECUTED', 'TERMINATED', 'TERMINATED'])
    expect(terminatePersonalArrangements(stopped, cause)).toEqual(stopped)
    expect(stopped.entertainmentV3!.ledger.filter(l => l.kind === 'REFUND')).toHaveLength(1)
    expect(preparePersonalArrangementWindow(stopped, stopped.player!).receipts).toEqual([])
    if (cause === 'CITY_UNKNOWN') expect(stopped.entertainmentV3!.arrangements[0]!.periods[1]!.reason).toContain('无法核实')
  })

  it('uses floor for proportional refunds and never refunds already executed zero periods after some benefit', () => {
    let state = execute(buy(fixture(), 'SETTLE', 'BASIC'))
    state = execute({ ...state, windowIndex: 11 }, { morale: 90, squadRelation: 90 })
    const stopped = terminatePersonalArrangements(state, 'MOVE')
    expect(stopped.entertainmentV3!.arrangements[0]!.refundEuro).toBe(3_333)
    expect(stopped.cashEuro).toBe(93_333)
  })

  it('refunds exactly the full price after an executed zero period and termination, but never restores used quota', () => {
    const zero = execute(buy(fixture(), 'SETTLE', 'PREMIUM'), { morale: 90, squadRelation: 90 })
    const stopped = terminatePersonalArrangements(zero, 'MOVE')
    expect(stopped.entertainmentV3!.arrangements[0]).toMatchObject({ refundEuro: 60_000, quotaRestored: false })
    expect(stopped.cashEuro).toBe(100_000)
    expect(terminatePersonalArrangements(stopped, 'RETIREMENT')).toEqual(stopped)
    expect(arrangementEligibility(stopped, 'BODY')).not.toBeNull()
  })

  it('refunds an entirely saturated completed service once without restoring annual quota', () => {
    let state = buy(fixture(), 'MENTAL', 'PREMIUM')
    state = execute(state, { morale: 90 })
    state = execute({ ...state, windowIndex: 11 }, { morale: 90 })
    expect(state.cashEuro).toBe(100_000)
    expect(state.entertainmentV3!.arrangements[0]).toMatchObject({ refundEuro: 40_000, quotaRestored: false })
    expect(state.entertainmentV3!.ledger.filter(l => l.kind === 'REFUND')).toHaveLength(1)
    expect(terminatePersonalArrangements(state, 'RETIREMENT')).toEqual(state)
  })

  it('restores annual quota only for same-year zero-execution full cancellation', () => {
    const sameYear = terminatePersonalArrangements(buy(fixture(), 'MENTAL', 'PREMIUM'), 'RETIREMENT')
    expect(sameYear.entertainmentV3!.arrangements[0]!.quotaRestored).toBe(true)
    expect(arrangementEligibility(sameYear, 'BODY')).toBeNull()
    const purchased = buy(fixture(11), 'MENTAL', 'PREMIUM')
    const nextYear = terminatePersonalArrangements({ ...purchased, windowIndex: 12 }, 'RETIREMENT')
    expect(nextYear.entertainmentV3!.arrangements[0]!.quotaRestored).toBe(false)
    expect(nextYear.entertainmentV3!.arrangements[0]!.purchaseYear).toBe(2031)
    expect(arrangementEligibility(nextYear, 'BODY')).toBeNull()
  })

  it('moving or losing city certainty terminates only settling, not mental support', () => {
    const mental = buy(fixture(), 'MENTAL', 'PREMIUM')
    for (const cause of ['MOVE', 'CITY_UNKNOWN'] as const) {
      const stopped = terminatePersonalArrangements(mental, cause)
      expect(stopped.entertainmentV3!.arrangements).toEqual(mental.entertainmentV3!.arrangements)
      expect(stopped.cashEuro).toBe(mental.cashEuro)
    }
  })

  it('rejects duplicate, future, unknown and out-of-bound execution receipts', () => {
    const state = buy(fixture(), 'BODY', 'BASIC')
    const receipt = preparePersonalArrangementWindow(state, state.player!).receipts[0]!
    expect(() => settlePersonalArrangementWindow(state, [receipt, receipt])).toThrow()
    expect(() => settlePersonalArrangementWindow(state, [{ ...receipt, arrangementId: 'unknown' }])).toThrow()
    expect(() => settlePersonalArrangementWindow(state, [{ ...receipt, windowIndex: 11 }])).toThrow()
    expect(() => settlePersonalArrangementWindow(state, [{ ...receipt, actual: { ...receipt.actual, fitness: 3 } }])).toThrow()
    expect(() => settlePersonalArrangementWindow(state, [{ ...receipt, actual: { ...receipt.actual, fitness: -1 } }])).toThrow()
    expect(() => settlePersonalArrangementWindow(state, [{ ...receipt, actual: { ...receipt.actual, fitness: Number.NaN } }])).toThrow()
    expect(() => settlePersonalArrangementWindow(state, [{ ...receipt, actual: {} as ArrangementGain }])).toThrow()
  })
})
