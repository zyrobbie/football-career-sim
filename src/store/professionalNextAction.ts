import { CLUBS } from '../data/balance'
import { canAdvanceBeyondWindow, canOpenTransferMarketAfterWindow, playerAgeAtWindow, retirementAvailabilityAfterWindow, shouldRetireAtContractExpiry } from '../engine/careerTime'
import { assessDomesticTransferOpportunity } from '../engine/transfers'
import type { GameState } from '../models/game'
import { completedWindow, restoreMarketContext } from './marketContext'

export type ProfessionalAction = 'RESTORE' | 'AGE_LIMIT' | 'MARKET' | 'REQUEST_TRANSFER' | 'PLAN' | 'STAY' | 'VOLUNTARY' | 'NATIONAL'
export interface ProfessionalActionItem { action: ProfessionalAction; label: string }
export interface ProfessionalNextAction {
  primary: ProfessionalActionItem | null
  secondary: ProfessionalActionItem[]
  summary: string
  stayOpensMarket: boolean
}
export interface CareerWindowContext { careerSeed: string; windowIndex: number }
export interface VoluntaryRetirementConfirmation extends CareerWindowContext { phase: 'HALF_YEAR_REPORT' }

/** A settled report decision, separate from an already generated market's W=H+1. */
export function professionalNextAction(game: GameState): ProfessionalNextAction {
  const result: ProfessionalNextAction = { primary: null, secondary: [], summary: '请先完成当前进度。', stayOpensMarket: false }
  if (restoreMarketContext(game) !== game) return { ...result, primary: { action: 'RESTORE', label: '返回当前进度' } }
  if (!['HALF_YEAR_REPORT', 'PRO_STAGE_COMPLETE'].includes(game.phase) || !game.player || !game.contract ||
    game.windowIndex < 4 || game.contract.clubId !== game.selectedClubId ||
    !CLUBS.some(club => club.id === game.selectedClubId) || game.pendingCareerEvent || completedWindow(game) !== game.windowIndex) return result
  const expired = game.contract.remainingHalfYears === 0
  if (!canAdvanceBeyondWindow(game.windowIndex) || (expired && shouldRetireAtContractExpiry(game.windowIndex))) {
    return { ...result, primary: { action: 'AGE_LIMIT', label: '走向退役时刻' }, summary: '最后一段职业旅程已经结束。为这段球员生涯写下结尾。' }
  }
  const marketOpen = canOpenTransferMarketAfterWindow(game.windowIndex)
  const opportunity = assessDomesticTransferOpportunity({ player: game.player, latestReport: game.lastReport, windowIndex: game.windowIndex })
  if (expired) {
    if (!marketOpen) return result
    result.primary = { action: 'MARKET', label: '处理合同到期' }
    result.summary = '合同已经到期。先续约或接受新的自由身合同，再开始下一个半年。'
  } else if (marketOpen && game.contract.brokenPromiseWindows >= 2) {
    result.primary = { action: 'REQUEST_TRANSFER', label: '提出转会申请' }
    result.secondary.push({ action: 'STAY', label: '继续留队半年' })
    result.stayOpensMarket = opportunity.available
    result.summary = opportunity.available
      ? '球队连续失约。你可以申请转会；选择留队将进入本次报价，仍需确认去留。'
      : '球队连续失约。你可以申请转会，也可以再留下半年看看。'
  } else if (marketOpen && opportunity.available) {
    result.primary = { action: 'MARKET', label: '查看转会报价' }
    result.summary = opportunity.summary
  } else {
    result.primary = { action: 'PLAN', label: '进入下一职业半年' }
    result.summary = marketOpen ? opportunity.summary : '继续现有合同，准备下一个职业半年。'
  }
  if (retirementAvailabilityAfterWindow(game.windowIndex) === 'OPTIONAL') result.secondary.push({ action: 'VOLUNTARY', label: '踢完这半年后退役' })
  if (playerAgeAtWindow(game.windowIndex) >= 30 && game.nationalTeam.caps > 0 && !game.nationalTeam.retired) result.secondary.push({ action: 'NATIONAL', label: '退出中国国家队' })
  return result
}

export function allowsProfessionalAction(game: GameState, action: ProfessionalAction): boolean {
  const model = professionalNextAction(game)
  return model.primary?.action === action || model.secondary.some(item => item.action === action)
}
