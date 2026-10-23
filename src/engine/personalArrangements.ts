import type { GameState, Player, TrainingFocus, DevelopmentApproach } from '../models/game'
import type { ArrangementGain, ArrangementPurchaseRequest, ArrangementWindowReceipt, PersonalArrangement, PersonalArrangementCategory, PersonalArrangementOffer, PersonalArrangementTier } from '../models/personalArrangements'
import { careerWindowLabel, playerAgeAtWindow } from './careerTime'
import { prepareArrangementQuotePlayer } from './simulationPreparation'
import { getEligibleLivingCityMove } from './livingCity'

export const ARRANGEMENT_CAP = 85
export const personalArrangementCapContribution = (planned: number, current: number, cap: number = 85) => Math.floor(Math.max(0, Math.min(planned, cap - current)) * 10 + 1e-8) / 10
const cappedGain = personalArrangementCapContribution
export const ARRANGEMENT_CATEGORIES = ['BODY', 'MENTAL', 'SETTLE'] as const
export const ARRANGEMENT_CATEGORY_LABELS = { BODY: '身体养护', MENTAL: '心理支持', SETTLE: '安顿生活' } as const
export const ARRANGEMENT_TIERS = ['BASIC', 'PLUS', 'PREMIUM'] as const
const stableJSON = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)) : item)
const gain = (fitness = 0, morale = 0, squadRelation = 0): ArrangementGain => ({ fitness, morale, squadRelation })
export const PERSONAL_ARRANGEMENT_RULES_V1: readonly PersonalArrangementOffer[] = ARRANGEMENT_CATEGORIES.flatMap(category => ARRANGEMENT_TIERS.map((tier, index): PersonalArrangementOffer => ({
  category, tier,
  title: `${ARRANGEMENT_CATEGORY_LABELS[category]} · ${['基础', '进阶', '高阶'][index]}`,
  description: category === 'BODY' ? '专业体能教练指导，改善身体状态，不增加身体能力。' : category === 'MENTAL' ? '私人心理咨询，连续两个半年支持心理状态。' : '在新城市租赁住所并配置生活设施，连续三个半年支持心理状态与队内关系。',
  priceEuro: (category === 'SETTLE' ? [10_000, 20_000, 60_000] : [2_000, 10_000, 40_000])[index]!,
  periods: category === 'BODY' ? 1 : category === 'MENTAL' ? 2 : 3,
  gain: category === 'BODY' ? gain([2, 4, 8][index]) : category === 'MENTAL' ? gain(0, [1, 2, 4][index]) : gain(0, [1, 2, 4][index], [1, 2, 3][index]),
}))).map(offer => Object.freeze({...offer, gain: Object.freeze({...offer.gain})}))
Object.freeze(PERSONAL_ARRANGEMENT_RULES_V1)
export const PERSONAL_ARRANGEMENT_OFFERS = PERSONAL_ARRANGEMENT_RULES_V1
export function gameYearAtWindow(startYear: number, windowIndex: number): number { return startYear + Math.floor(windowIndex / 2) }
export function entertainmentV3Active(state: GameState): boolean { return Boolean(state.entertainmentV3 && state.windowIndex >= state.entertainmentV3.activationWindowIndex) }
export function remainingArrangementPeriods(arrangement: PersonalArrangement): number { return arrangement.periods.filter(p => p.status === 'PENDING').length }
export function activePersonalArrangements(state: GameState): PersonalArrangement[] { return (state.entertainmentV3?.arrangements ?? []).filter(a => remainingArrangementPeriods(a) > 0) }
export function currentArrangementMove(state: GameState) {
  const city = state.entertainmentV3?.livingCity
  return getEligibleLivingCityMove(city, state.windowIndex)
}
export function arrangementEligibility(state: GameState, category?: PersonalArrangementCategory): string | null {
  if (!entertainmentV3Active(state)) return '完成当前已开始的半年后开放个人安排。'
  if (state.pendingCareerEvent || state.pendingKeyMatchMoment || state.retirementReason) return '当前事件或退休流程尚未完成，不能购买。'
  if (state.windowIndex >= 56) return '已没有可经历的职业半年，不出售。'
  if (state.phase !== 'HALF_YEAR_PLAN') return '只能在可编辑的半年计划中购买。'
  if (!state.player || playerAgeAtWindow(state.windowIndex) < 18 || !state.contract || state.contract.remainingHalfYears <= 0) return '年满18岁且持有有效职业合同后开放，成年职业青年队合同也可使用。'
  const year = gameYearAtWindow(state.startYear, state.windowIndex)
  if (state.entertainmentV3!.arrangements.some(a => a.purchaseYear === year && !a.quotaRestored)) return '本年度已使用购买名额；以后自动执行不占新年度名额。'
  if (category && activePersonalArrangements(state).some(a => a.category === category)) return '同类服务尚未结束，不能续购、升档或重置期数。'
  if (category === 'SETTLE' && !currentArrangementMove(state)) return '仅真实搬到新城市后的前两个计划窗口可购买；同城换队与旧档初始化不算搬城。'
  return null
}
export function arrangementGainText(value: ArrangementGain): string {
  const labels = { fitness: '身体状态', morale: '心理状态', squadRelation: '队内关系' }
  return (Object.keys(labels) as (keyof ArrangementGain)[]).filter(k => value[k] > 0).map(k => `${labels[k]} +${value[k]}`).join('；') || '实际 +0'
}
export function quotePersonalArrangement(state: GameState, category: PersonalArrangementCategory, tier: PersonalArrangementTier, selection?: {focus: TrainingFocus; approach: DevelopmentApproach | null}) {
  const offer = PERSONAL_ARRANGEMENT_OFFERS.find(o => o.category === category && o.tier === tier)!
  if (!offer) throw new Error('找不到这项个人安排。')
  let disabledReason = arrangementEligibility(state, category)
  if (!disabledReason && state.cashEuro < offer.priceEuro) disabledReason = '现金余额不足，不能透支。'
  // Only a one-period offer can be known to be entirely saturated now. Future
  // psychological/living periods are not rejected on today's saturation.
  const focus = selection?.focus ?? state.trainingFocus ?? 'BALANCED', approach = selection?.approach ?? state.developmentApproach
  const previewPlayer = state.player ? preparePersonalArrangementWindow(state, prepareArrangementQuotePlayer(state, focus, approach)).player : null
  if (!disabledReason && category === 'BODY' && cappedGain(offer.gain.fitness, previewPlayer!.fitness, ARRANGEMENT_CAP) === 0) disabledReason = '按当前训练与策略准备后，身体状态已达到安排上限85，本次身体养护无法受益，不出售。'
  const year = gameYearAtWindow(state.startYear, state.windowIndex)
  const context = stableJSON({stateTrainingFocus: state.trainingFocus, stateDevelopmentApproach: state.developmentApproach, cash: state.cashEuro, player: state.player, focus, approach, arrangements: state.entertainmentV3?.arrangements, city: state.entertainmentV3?.livingCity})
  let hash = 2166136261; for (let i=0;i<context.length;i++) hash=Math.imul(hash ^ context.charCodeAt(i),16777619)
  const quoteId = `${state.careerSeed}:${state.player?.id}:${state.windowIndex}:${year}:${category}:${tier}:${(hash>>>0).toString(16)}`
  const total = Object.fromEntries(Object.entries(offer.gain).map(([key, value]) => [key, value * offer.periods])) as ArrangementGain
  const currentPossible = Object.fromEntries(Object.entries(offer.gain).map(([key, value]) => [key, cappedGain(value, previewPlayer?.[key as keyof ArrangementGain] ?? ARRANGEMENT_CAP, ARRANGEMENT_CAP)])) as ArrangementGain
  return { offer, disabledReason, quoteId, year, cashBeforeEuro: state.cashEuro, cashAfterEuro: state.cashEuro - offer.priceEuro, total, currentPossible,
    startLabel: careerWindowLabel(state.startYear, state.windowIndex),
    availablePeriods: Math.min(offer.periods, Math.max(0, 56 - state.windowIndex)),
    request: { careerSeed: state.careerSeed, playerId: state.player?.id ?? '', windowIndex: state.windowIndex, purchaseYear: year, category, tier, quoteId, purchaseId: `${state.careerSeed}:${state.player?.id}:${year}:${state.windowIndex}:${category}:${tier}:${state.entertainmentV3?.arrangements.length ?? 0}`, trainingFocus: focus, developmentApproach: approach } satisfies ArrangementPurchaseRequest }
}
export function purchasePersonalArrangement(state: GameState, request: ArrangementPurchaseRequest): GameState {
  const existing = state.entertainmentV3?.arrangements.find(a => a.id === request.purchaseId)
  if (existing) return state
  if (request.careerSeed !== state.careerSeed || request.playerId !== state.player?.id || request.windowIndex !== state.windowIndex || request.purchaseYear !== gameYearAtWindow(state.startYear, state.windowIndex)) throw new Error('购买页面已过期，请返回当前半年计划。')
  const quote = quotePersonalArrangement(state, request.category, request.tier, {focus: request.trainingFocus, approach: request.developmentApproach})
  if (quote.quoteId !== request.quoteId || quote.request.purchaseId !== request.purchaseId) throw new Error('报价已变化，请重新确认。')
  if (quote.disabledReason) throw new Error(quote.disabledReason)
  const root = state.entertainmentV3!
  if (root.arrangements.length >= 64) throw new Error('个人安排记录已达到生涯上限。')
  const move = request.category === 'SETTLE' ? currentArrangementMove(state) : null
  const arrangement: PersonalArrangement = { id: request.purchaseId, rulesVersion: 1, cap: 85, careerSeed: state.careerSeed, category: request.category, tier: request.tier, title: quote.offer.title, priceEuro: quote.offer.priceEuro, purchaseYear: quote.year, purchaseWindowIndex: state.windowIndex, moveId: move?.id ?? null,
    periods: Array.from({ length: quote.offer.periods }, (_, i) => ({ windowIndex: state.windowIndex + i, status: 'PENDING', planned: { ...quote.offer.gain }, actual: null, reason: null })), refundEuro: 0, refundReceipts: [], quotaRestored: false, terminationCause: null }
  return { ...state, cashEuro: state.cashEuro - arrangement.priceEuro, entertainmentV3: { ...root, arrangements: [...root.arrangements, arrangement], ledger: [...root.ledger, {id: `${arrangement.id}:payment`, arrangementId: arrangement.id, windowIndex: state.windowIndex, kind: 'PAYMENT', amountEuro: arrangement.priceEuro, reason: arrangement.title}], livingCity: { ...root.livingCity, moves: root.livingCity.moves.map(m => m.id === move?.id ? { ...m, purchasedArrangementId: arrangement.id } : m) } } }
}
export function preparePersonalArrangementWindow(state: GameState, inputPlayer: Player): { player: Player; receipts: ArrangementWindowReceipt[] } {
  const player = structuredClone(inputPlayer), receipts: ArrangementWindowReceipt[] = []
  if (!entertainmentV3Active(state)) return { player, receipts }
  const arrangements = [...state.entertainmentV3!.arrangements].sort((a, b) => a.purchaseWindowIndex - b.purchaseWindowIndex || a.id.localeCompare(b.id))
  for (const a of arrangements) {
    const period = a.periods.find(p => p.windowIndex === state.windowIndex && p.status === 'PENDING')
    if (!period) continue
    const actual = gain()
    for (const key of Object.keys(actual) as (keyof ArrangementGain)[]) { actual[key] = cappedGain(period.planned[key], player[key], a.cap); player[key] = Number((player[key] + actual[key]).toFixed(10)) }
    const cut = Object.keys(actual).some(k => actual[k as keyof ArrangementGain] < period.planned[k as keyof ArrangementGain])
    receipts.push({ arrangementId: a.id, windowIndex: state.windowIndex, planned: { ...period.planned }, actual, reason: cut ? '状态上限85' : null })
  }
  return { player, receipts }
}
function finalizeRefund(a: PersonalArrangement, windowIndex: number, reason: string): PersonalArrangement {
  if (a.periods.some(p => p.status === 'PENDING')) return a
  const executed = a.periods.filter(p => p.status === 'EXECUTED')
  const zero = executed.every(p => p.actual && Object.values(p.actual).every(v => v === 0))
  const terminated = a.periods.filter(p => p.status === 'TERMINATED').length
  const target = zero ? a.priceEuro : Math.floor(a.priceEuro * terminated / a.periods.length)
  const amountEuro = Math.max(0, Math.min(a.priceEuro, target) - a.refundEuro)
  return { ...a, refundEuro: a.refundEuro + amountEuro, refundReceipts: amountEuro ? [...a.refundReceipts, { id: `${a.id}:refund:${windowIndex}:${target}`, windowIndex, amountEuro, reason: zero ? '全程实际收益为0，自动全额冲销' : reason }] : a.refundReceipts }
}
function refundLedger(state: GameState, arrangements: PersonalArrangement[]) {
  const old = state.entertainmentV3!.ledger
  const ids = new Set(old.map(l => l.id))
  return [...old, ...arrangements.flatMap(a => a.refundReceipts.filter(r => !ids.has(r.id)).map(r => ({...r, arrangementId: a.id, kind: 'REFUND' as const})))]
}
export function settlePersonalArrangementWindow(state: GameState, receipts: ArrangementWindowReceipt[]): GameState {
  if (!state.entertainmentV3) return state
  const due = state.entertainmentV3.arrangements.filter(a => a.periods.some(p => p.windowIndex === state.windowIndex && p.status === 'PENDING'))
  if (due.some(a => !receipts.some(r => r.arrangementId === a.id))) throw new Error('个人安排缺少本期结算凭据。')
  if (!receipts.length) return state
  if (new Set(receipts.map(r => r.arrangementId)).size !== receipts.length || receipts.some(r => r.windowIndex !== state.windowIndex || !state.entertainmentV3!.arrangements.some(a => a.id === r.arrangementId))) throw new Error('个人安排结算凭据重复或来源不明。')
  let refund = 0
  const arrangements = state.entertainmentV3.arrangements.map(a => {
    const receipt = receipts.find(r => r.arrangementId === a.id && r.windowIndex === state.windowIndex)
    if (!receipt) return a
    const period = a.periods.find(p => p.windowIndex === state.windowIndex)
    if (!period) throw new Error('本期没有这项安排。')
    if (JSON.stringify(receipt.planned) !== JSON.stringify(period.planned)) throw new Error('本期安排承诺不一致。')
    if (period.status !== 'PENDING') return a
    for (const key of ['fitness','morale','squadRelation'] as const) if (!Number.isFinite(receipt.actual[key]) || receipt.actual[key] < 0 || receipt.actual[key] > period.planned[key]) throw new Error('个人安排本期结算凭据不匹配。')
    const next = finalizeRefund({ ...a, periods: a.periods.map(p => p === period ? { ...p, status: 'EXECUTED', actual: { ...receipt.actual }, reason: receipt.reason } : p) }, state.windowIndex, '服务结束')
    refund += next.refundEuro - a.refundEuro
    return next
  })
  return { ...state, cashEuro: state.cashEuro + refund, entertainmentV3: { ...state.entertainmentV3, arrangements, ledger: refundLedger(state, arrangements) } }
}
export function terminatePersonalArrangements(state: GameState, cause: 'MOVE' | 'CITY_UNKNOWN' | 'RETIREMENT'): GameState {
  if (!state.entertainmentV3) return state
  let refund = 0
  const arrangements = state.entertainmentV3.arrangements.map(a => {
    if ((cause !== 'RETIREMENT' && a.category !== 'SETTLE') || !remainingArrangementPeriods(a)) return a
    let next = finalizeRefund({ ...a, terminationCause: cause, periods: a.periods.map(p => p.status === 'PENDING' ? { ...p, status: 'TERMINATED', reason: cause === 'MOVE' ? '再次搬城，未执行期终止' : cause === 'CITY_UNKNOWN' ? '居住城市无法核实，未执行期终止' : '退休，未执行期终止' } : p) }, state.windowIndex, cause === 'MOVE' ? '再次搬城，按未执行期比例退款' : cause === 'CITY_UNKNOWN' ? '居住城市无法核实，按未执行期比例退款' : '退休，按未执行期比例退款')
    if (a.purchaseYear === gameYearAtWindow(state.startYear, state.windowIndex) && !next.periods.some(p => p.status === 'EXECUTED') && next.refundEuro === next.priceEuro) next = { ...next, quotaRestored: true }
    refund += next.refundEuro - a.refundEuro
    return next
  })
  return { ...state, cashEuro: state.cashEuro + refund, entertainmentV3: { ...state.entertainmentV3, arrangements, ledger: refundLedger(state, arrangements) } }
}
