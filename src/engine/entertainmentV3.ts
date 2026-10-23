import { closeV3Story } from './offPitchStories'
import type { GameState } from '../models/game'
import type { EntertainmentV3State } from '../models/personalArrangements'
import { createOffPitchStoryState } from '../models/offPitchStories'
import { createLivingCityState, transitionLivingCity } from './livingCity'
import { terminatePersonalArrangements, settlePersonalArrangementWindow, arrangementGainText, remainingArrangementPeriods } from './personalArrangements'
export function createEntertainmentV3State(clubId: string | null = null, activationWindowIndex = 0): EntertainmentV3State {
  return { rulesVersion: 1, activationWindowIndex, cashPolicy: 'UNCAPPED', arrangements: [], ledger: [], livingCity: createLivingCityState(clubId), stories: createOffPitchStoryState() }
}
export function migrationActivationWindow(state: Pick<GameState, 'phase' | 'windowIndex'>): number {
  return ['SPECIAL_EVENT','SPECIAL_EVENT_RESULT','SIMULATION_READY','KEY_MATCH_MOMENT','KEY_MATCH_MOMENT_RESULT','HALF_YEAR_REPORT','CAREER_DASHBOARD','RETIREMENT_DECISION','CAREER_RETIRED','PRO_STAGE_COMPLETE'].includes(state.phase) ? state.windowIndex + 1 : state.windowIndex
}
/** Called only at an actual selected-club commit, never to replay old transfers. */
export function syncEntertainmentCity(state: GameState): GameState {
  const root = state.entertainmentV3
  if (!root || root.livingCity.clubId === state.selectedClubId) return state
  const transition = transitionLivingCity(root.livingCity, state.selectedClubId, state.windowIndex, state.careerSeed)
  const terminate = transition.kind === 'MOVED' || (transition.kind === 'UNKNOWN' && root.livingCity.cityId !== null)
  const stopped = terminate ? terminatePersonalArrangements(state, transition.kind === 'UNKNOWN' ? 'CITY_UNKNOWN' : 'MOVE') : state
  return { ...stopped, entertainmentV3: { ...stopped.entertainmentV3!, livingCity: transition.state } }
}

export function finalizeEntertainmentWindow(state: GameState): GameState {
  if (!state.entertainmentV3 || state.windowIndex < state.entertainmentV3.activationWindowIndex || !state.lastReport) return state
  const receipts = state.lastReport.personalArrangements?.receipts ?? []
  const settled = settlePersonalArrangementWindow(state, receipts)
  const stories = closeV3Story(settled, {atReport: true})
  const root = {...settled.entertainmentV3!, stories}
  const event = [...settled.careerEventHistory].reverse().find(r => r.windowIndex === state.windowIndex && r.eventId.startsWith('V3_'))
  const closure = stories.closedChains.find(c => c.closedAtWindowIndex === state.windowIndex && c.reason !== 'COMPLETED')
  const offPitchSummary = closure?.summary ?? (event ? `${event.choiceTitle}：${event.outcomeSummary}` : undefined)
  const ledger = root.ledger.filter(l => l.windowIndex === state.windowIndex)
  const purchaseEuro = ledger.filter(l => l.kind === 'PAYMENT').reduce((s,l) => s+l.amountEuro,0)
  const refundEuro = ledger.filter(l => l.kind === 'REFUND').reduce((s,l) => s+l.amountEuro,0)
  const summaries = receipts.map(r => {
    const a = root.arrangements.find(a => a.id === r.arrangementId)!
    const number = a.periods.findIndex(p => p.windowIndex === state.windowIndex) + 1
    return `${a.title}：第${number}/${a.periods.length}期，计划${arrangementGainText(r.planned)}，本期${arrangementGainText(r.actual)}${r.reason ? `（${r.reason}）` : ''}，执行后剩余${remainingArrangementPeriods(a)}期。`
  })
  const personal = receipts.length || ledger.length ? {receipts, purchaseEuro, refundEuro, ledgerEntryIds: ledger.map(l => l.id), summaries} : undefined
  const report = {...settled.lastReport!, cashAfterEuro: settled.cashEuro, expenseEuro: settled.lastReport!.expenseEuro - (settled.lastReport!.personalArrangements?.purchaseEuro ?? 0) + purchaseEuro,
    ...(personal ? {personalArrangements: personal} : {}), ...(offPitchSummary ? {offPitchSummary} : {})}
  return {...settled, entertainmentV3: root, lastReport: report, history: settled.history.map((h,i) => i === settled.history.length - 1 ? {...h, ...(offPitchSummary ? {offPitchSummary} : {}), ...(summaries.length ? {personalArrangementSummary: summaries.join(' ')} : {})} : h)}
}
