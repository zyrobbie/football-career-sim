import { canAdvanceBeyondWindow } from '../engine/careerTime'
import type { GamePhase, GameState } from '../models/game'

const PHASES_SHOWING_NEXT_WINDOW = new Set<GamePhase>([
  'HALF_YEAR_REPORT',
  'CAREER_DASHBOARD',
  'PRO_CONTRACT_OFFER',
  'PRO_CONTRACT_COMPLETE',
  'PRO_STAGE_COMPLETE',
])

/** The window presented in read-only career chrome, shared by all career views. */
export function visibleCareerWindowIndex(
  game: Pick<GameState, 'phase' | 'windowIndex'>,
): number {
  if (!PHASES_SHOWING_NEXT_WINDOW.has(game.phase)) return game.windowIndex
  return canAdvanceBeyondWindow(game.windowIndex)
    ? game.windowIndex + 1
    : game.windowIndex
}
