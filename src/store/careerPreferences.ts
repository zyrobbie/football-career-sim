import { PREFERRED_LEAGUES } from '../data/balance'
import type { GamePhase, GameState, OverseasIntent } from '../models/game'

const editablePhases = new Set<GamePhase>([
  'HALF_YEAR_PLAN', 'HALF_YEAR_REPORT', 'CAREER_DASHBOARD',
  'PRO_CONTRACT_OFFER', 'PRO_CONTRACT_COMPLETE', 'PRO_STAGE_COMPLETE',
  'TRANSFER_WINDOW', 'TRANSFER_ARRIVAL', 'TRANSFER_STAGE_COMPLETE',
])
export function canEditCareerPreferences(game: GameState): boolean {
  return Boolean(game.player && game.contract && !game.pendingCareerEvent && editablePhases.has(game.phase))
}
export function normalizeCareerPreferences(intent: unknown, leagues: unknown): {
  intent: OverseasIntent; leagues: string[]
} {
  if (!['STRONG', 'CONDITIONAL', 'DOMESTIC'].includes(intent as string)) throw new Error('请选择有效的求职方向。')
  if (!Array.isArray(leagues) || leagues.some(l => !(PREFERRED_LEAGUES as readonly unknown[]).includes(l))) throw new Error('请选择列表中的联赛。')
  const unique = [...new Set(leagues)] as string[]
  if (unique.length > 3) throw new Error('最多选择三个偏好联赛。')
  return { intent: intent as OverseasIntent, leagues: intent === 'DOMESTIC' ? [] : unique }
}
