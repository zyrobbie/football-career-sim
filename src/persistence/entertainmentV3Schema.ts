import { playerAgeAtWindow } from '../engine/careerTime'
import { isKnownLivingCityId, resolveClubCity } from '../data/clubCities'
import { z } from 'zod'
import { offPitchStoryStateSchema } from '../models/offPitchStories'
import type { GameState } from '../models/game'
import { gameYearAtWindow, PERSONAL_ARRANGEMENT_OFFERS } from '../engine/personalArrangements'
const id = z.string().min(1).max(512)
const windowIndex = z.number().int().min(0).max(57)
const gain = z.object({ fitness: z.number().int().min(0).max(8), morale: z.number().int().min(0).max(4), squadRelation: z.number().int().min(0).max(3) }).strict()
const period = z.object({ windowIndex, status: z.enum(['PENDING', 'EXECUTED', 'TERMINATED']), planned: gain, actual: gain.partial().required().extend({fitness:z.number().finite().min(0).max(8),morale:z.number().finite().min(0).max(4),squadRelation:z.number().finite().min(0).max(3)}).nullable(), reason: z.string().min(1).max(200).nullable() }).strict()
const arrangement = z.object({ id, rulesVersion: z.literal(1), cap: z.literal(85), careerSeed: id, category: z.enum(['BODY', 'MENTAL', 'SETTLE']), tier: z.enum(['BASIC', 'PLUS', 'PREMIUM']), title: z.string().min(1).max(80), priceEuro: z.number().int().positive().max(60_000), purchaseYear: z.number().int().min(2020).max(10030), purchaseWindowIndex: windowIndex, moveId: id.nullable(), periods: z.array(period).min(1).max(3), refundEuro: z.number().int().nonnegative().max(60_000), refundReceipts: z.array(z.object({ id, windowIndex, amountEuro: z.number().int().positive().max(60_000), reason: z.string().min(1).max(200) }).strict()).max(2), quotaRestored: z.boolean(), terminationCause: z.enum(['MOVE', 'CITY_UNKNOWN', 'RETIREMENT']).nullable() }).strict()
const move = z.object({ id, source: z.literal('TRANSFER_COMMIT'), fromCityId: id, toCityId: id, fromClubId: id.nullable(), toClubId: id, windowIndex, purchasedArrangementId: id.nullable() }).strict()
export const entertainmentV3Schema = z.object({ rulesVersion: z.literal(1), activationWindowIndex: windowIndex, cashPolicy: z.enum(['UNCAPPED', 'LEGACY_CAP']), arrangements: z.array(arrangement).max(64), ledger: z.array(z.object({id,arrangementId:id,windowIndex,kind:z.enum(['PAYMENT','REFUND']),amountEuro:z.number().int().positive().max(60000),reason:z.string().min(1).max(200)}).strict()).max(192), livingCity: z.object({ cityId: id.nullable(), clubId: id.nullable(), eligibilityMoveId: id.nullable(), moves: z.array(move).max(64) }).strict(), stories: offPitchStoryStateSchema }).strict()
export function validateEntertainmentV3(state: GameState): void {
  const root = state.entertainmentV3
  if (!root) return
  const fail = () => { throw new Error('个人安排或城市故事记录不一致，原始存档已保留。') }
  if (state.windowIndex >= root.activationWindowIndex) {
    const currentClub = resolveClubCity(state.selectedClubId)
    if (root.livingCity.clubId !== currentClub.canonicalClubId || root.livingCity.cityId !== currentClub.cityId) fail()
  }
  const ids = new Set<string>(), years = new Set<number>()
  for (const a of root.arrangements) {
    const offer = PERSONAL_ARRANGEMENT_OFFERS.find(o => o.category === a.category && o.tier === a.tier)
    if (!offer || ids.has(a.id) || a.careerSeed !== state.careerSeed || a.purchaseWindowIndex > state.windowIndex || a.purchaseWindowIndex < root.activationWindowIndex || playerAgeAtWindow(a.purchaseWindowIndex) < 18 || a.purchaseYear !== gameYearAtWindow(state.startYear, a.purchaseWindowIndex) || a.priceEuro !== offer.priceEuro || a.periods.length !== offer.periods || a.refundEuro > a.priceEuro) fail()
    ids.add(a.id)
    if (!a.quotaRestored) { if (years.has(a.purchaseYear)) fail(); years.add(a.purchaseYear) }
    for (const [i, p] of a.periods.entries()) {
      if (p.windowIndex !== a.purchaseWindowIndex + i || JSON.stringify(p.planned) !== JSON.stringify(offer!.gain)) fail()
      if (p.status === 'PENDING' && (p.windowIndex < state.windowIndex || (state.lastReport && state.history.at(-1) && p.windowIndex <= state.history.at(-1)!.windowIndex))) fail()
      if ((p.status === 'EXECUTED') !== Boolean(p.actual)) fail()
      if (p.status === 'EXECUTED' && p.windowIndex > state.windowIndex) fail()
      for (const key of ['fitness', 'morale', 'squadRelation'] as const) if (p.actual && p.actual[key] > p.planned[key]) fail()
    }
    const terminated = a.periods.filter(p => p.status === 'TERMINATED').length
    if (Boolean(terminated) !== Boolean(a.terminationCause)) fail()
    if (a.refundReceipts.reduce((sum, r) => sum + r.amountEuro, 0) !== a.refundEuro || new Set(a.refundReceipts.map(r => r.id)).size !== a.refundReceipts.length || a.refundReceipts.some(r => r.windowIndex > state.windowIndex || r.windowIndex < a.purchaseWindowIndex)) fail()
    if (a.periods.some(p => p.status === 'PENDING') && a.refundEuro) fail()
    const executed = a.periods.filter(p => p.status === 'EXECUTED')
    const fullyClosed = !a.periods.some(p => p.status === 'PENDING')
    const allZero = executed.every(p => Object.values(p.actual!).every(v => v === 0))
    const expectedRefund = fullyClosed ? allZero ? a.priceEuro : Math.floor(a.priceEuro * terminated / a.periods.length) : 0
    if (a.refundEuro !== expectedRefund || (a.quotaRestored && (executed.length !== 0 || a.refundEuro !== a.priceEuro || !a.terminationCause || a.refundReceipts.length === 0 || a.refundReceipts.some(r => gameYearAtWindow(state.startYear, r.windowIndex) !== a.purchaseYear)))) fail()
    if ((a.category === 'SETTLE') !== Boolean(a.moveId)) fail()
    if (a.moveId && !root.livingCity.moves.some(m => m.id === a.moveId && (m.purchasedArrangementId === a.id || (a.quotaRestored && a.terminationCause && !remainingPending(a))) && m.windowIndex <= a.purchaseWindowIndex && a.purchaseWindowIndex <= m.windowIndex + 1)) fail()
  }
  if (new Set(root.ledger.map(l => l.id)).size !== root.ledger.length || root.ledger.some(l => !ids.has(l.arrangementId) || l.windowIndex > state.windowIndex)) fail()
  for (const a of root.arrangements) {
    const entries = root.ledger.filter(l => l.arrangementId === a.id)
    const payments = entries.filter(l => l.kind === 'PAYMENT')
    if (payments.length !== 1 || payments[0]!.amountEuro !== a.priceEuro || payments[0]!.windowIndex !== a.purchaseWindowIndex || payments[0]!.id !== `${a.id}:payment` || payments[0]!.reason !== a.title || entries.filter(l => l.kind === 'REFUND').reduce((sum,l) => sum+l.amountEuro,0) !== a.refundEuro) fail()
    for (const r of a.refundReceipts) { const l = entries.find(l => l.id === r.id && l.kind === 'REFUND'); if (!l || l.amountEuro !== r.amountEuro || l.windowIndex !== r.windowIndex || l.reason !== r.reason) fail() }
  }
  const moves = root.livingCity.moves
  if (new Set(moves.map(m => m.id)).size !== moves.length || moves.some((m,i) => m.fromCityId === m.toCityId || m.windowIndex > state.windowIndex || !isKnownLivingCityId(m.fromCityId) || !isKnownLivingCityId(m.toCityId) || (i > 0 && m.windowIndex < moves[i-1]!.windowIndex) || resolveClubCity(m.toClubId).cityId !== m.toCityId || (m.fromClubId !== null && resolveClubCity(m.fromClubId).cityId !== m.fromCityId))) fail()
  if (root.livingCity.eligibilityMoveId && !moves.some(m => m.id === root.livingCity.eligibilityMoveId && m.toCityId === root.livingCity.cityId)) fail()
  if (root.livingCity.cityId !== null && !isKnownLivingCityId(root.livingCity.cityId)) fail()
  if (moves.some(m => m.purchasedArrangementId && !ids.has(m.purchasedArrangementId))) fail()
  if (state.careerEventHistory.some(r => r.eventId.startsWith('V3_') && (r.definitionRevision !== 1 || !r.eventTitle))) fail()
  const stories = root.stories
  if (state.careerEventHistory.some(r => r.eventId.startsWith('V3_') && !stories.completedNodeIds.includes(r.eventId as typeof stories.completedNodeIds[number]))) fail()
  for (const nodeId of stories.completedNodeIds) if (!state.careerEventHistory.some(r => r.eventId === nodeId && r.windowIndex <= state.windowIndex)) fail()
  for (const chain of [...stories.closedChains, ...(stories.activeChain ? [stories.activeChain] : [])]) {
    const first = state.careerEventHistory.find(r => r.eventId === chain.firstEventId && r.windowIndex === chain.firstWindowIndex)
    if (!first || first.choiceId !== chain.firstChoiceId || first.choiceTitle !== chain.firstChoiceTitle || first.outcomeSummary !== chain.firstOutcomeSummary) fail()
  }
  for (const chain of stories.closedChains) {
    if (chain.reason === 'COMPLETED') {
      const last = state.careerEventHistory.find(r => r.eventId === chain.followupEventId && r.windowIndex === chain.closedAtWindowIndex)
      if (!last || last.choiceId !== chain.followupChoiceId || last.choiceTitle !== chain.followupChoiceTitle || last.outcomeSummary !== chain.followupOutcomeSummary) fail()
    }
  }
  const personal = state.lastReport?.personalArrangements
  const completedWindow = state.lastReport ? state.history.at(-1)?.windowIndex : undefined
  const expectedReportPeriods = root.arrangements.flatMap(a => a.periods.filter(p => p.status === 'EXECUTED' && p.windowIndex === completedWindow).map(p => ({a,p})))
  if (expectedReportPeriods.length && (!personal || personal.receipts.length !== expectedReportPeriods.length || expectedReportPeriods.some(({a}) => !personal.receipts.some(r => r.arrangementId === a.id)))) fail()
  if (personal) {
    const reportWindow = state.history.at(-1)?.windowIndex
    if (typeof reportWindow !== 'number' || !Array.isArray(personal.receipts) || new Set(personal.receipts.map(r => r.arrangementId)).size !== personal.receipts.length) fail()
    for (const r of personal.receipts) {
      const a = root.arrangements.find(a => a.id === r.arrangementId)
      const p = a?.periods.find(p => p.windowIndex === r.windowIndex)
      if (!p || p.status !== 'EXECUTED' || r.windowIndex !== reportWindow || r.reason !== p.reason) fail()
      for (const key of ['fitness','morale','squadRelation'] as const) if (r.planned?.[key] !== p!.planned[key] || r.actual?.[key] !== p!.actual?.[key]) fail()
    }
    const reportLedger = personal.ledgerEntryIds
    if (!reportLedger || new Set(reportLedger).size !== reportLedger.length || reportLedger.some(id => !root.ledger.some(l => l.id === id && l.windowIndex === reportWindow))) fail()
    const current = root.ledger.filter(l => reportLedger?.includes(l.id))
    if (personal.purchaseEuro !== current.filter(l => l.kind === 'PAYMENT').reduce((s,l) => s+l.amountEuro,0) || personal.refundEuro !== current.filter(l => l.kind === 'REFUND').reduce((s,l) => s+l.amountEuro,0)) fail()
  }
}
function remainingPending(a: {periods: {status: string}[]}) { return a.periods.some(p => p.status === 'PENDING') }
