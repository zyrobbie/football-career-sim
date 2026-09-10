import type { GameState } from '../models/game'

export function completedWindow(game: GameState): number | undefined {
  return game.history.at(-1)?.windowIndex
}

/** Legacy report navigation persisted phase but left the market/decision facts intact. */
export function restoreMarketContext(game: GameState): GameState {
  if (!game.contract || !['HALF_YEAR_REPORT', 'PRO_STAGE_COMPLETE'].includes(game.phase)) return game
  const completed = completedWindow(game)
  if (completed === undefined || game.windowIndex !== completed + 1) return game
  if (game.selectedTransferChoiceId !== null) {
    const decision = game.transferDecision
    const phase = !decision ? 'TRANSFER_WINDOW'
      : decision.kind === 'TRANSFER' && decision.arrivalChoice === null ? 'TRANSFER_ARRIVAL'
      : 'TRANSFER_STAGE_COMPLETE'
    return { ...game, phase }
  }
  if (game.transferOffers.length === 0) return { ...game, phase: 'HALF_YEAR_PLAN' }
  return game
}

export function hasPendingMarket(game: GameState): boolean {
  return restoreMarketContext(game).phase === 'TRANSFER_WINDOW'
}

export function isUnopenedMarketWindow(game: GameState): boolean {
  const completed = completedWindow(game)
  return game.phase === 'PRO_STAGE_COMPLETE' && (completed === game.windowIndex ||
    (completed === undefined && game.transferOffers.length === 0 && game.selectedTransferChoiceId === null && game.transferDecision === null))
}
