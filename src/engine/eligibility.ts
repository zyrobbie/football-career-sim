import { CLUBS } from '../data/balance'
import type { FirstTeamRole, GameState } from '../models/game'
import { playerAgeAtWindow } from './careerTime'
import { evaluateFirstTeamRole } from './contracts'

export const FIRST_TEAM_ONLY_AGE = 22

function currentClubForState(state: GameState) {
  if (!state.selectedClubId) return null
  return (
    state.academyOffers.find(
      (offer) => offer.club.id === state.selectedClubId,
    )?.club ??
    CLUBS.find((club) => club.id === state.selectedClubId) ??
    null
  )
}

/**
 * Players aged 22 or older can no longer be registered for a youth team.
 * This is an eligibility invariant rather than a transfer-market rule, so it
 * also repairs an active youth contract when the player chooses to stay.
 */
export function enforceAgeBasedFirstTeam(state: GameState): GameState {
  if (
    playerAgeAtWindow(state.windowIndex) < FIRST_TEAM_ONLY_AGE ||
    !state.player ||
    !state.contract
  ) {
    return state
  }

  const currentClub = currentClubForState(state)
  const evaluatedCurrentRole: FirstTeamRole = currentClub
    ? evaluateFirstTeamRole(state.player, currentClub)
    : state.firstTeamRole ?? 'FRINGE'
  const mustRepairCurrentTeam =
    state.teamLevel === 'YOUTH' ||
    state.contract.promisedTeamLevel === 'YOUTH'

  let repairedTransferOffer = false
  const transferOffers = state.transferOffers.map((offer) => {
    if (offer.promisedTeamLevel === 'FIRST_TEAM') return offer
    repairedTransferOffer = true
    const club = CLUBS.find((candidate) => candidate.id === offer.clubId)
    return {
      ...offer,
      promisedTeamLevel: 'FIRST_TEAM' as const,
      promisedRole: club
        ? evaluateFirstTeamRole(state.player!, club)
        : ('FRINGE' as const),
    }
  })

  if (!mustRepairCurrentTeam) {
    return repairedTransferOffer ? { ...state, transferOffers } : state
  }

  return {
    ...state,
    teamLevel: 'FIRST_TEAM',
    youthRole: null,
    firstTeamRole: evaluatedCurrentRole,
    contract: {
      ...state.contract,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: evaluatedCurrentRole,
    },
    transferOffers,
    firstTeamProgress: {
      clubId: state.selectedClubId,
      attention: 100,
      readiness: 100,
      matchProof: 100,
      coachBacking: 100,
      status: 'PROMOTED',
    },
  }
}
