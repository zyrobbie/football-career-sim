import { getCareerEvent } from '../engine/careerEvents'
import type { GamePhase, GameState, TransferOffer } from '../models/game'
import { validateGameState } from '../persistence/save'
import { useGameStore } from '../store/gameStore'
import { createRetirementVisualAuditGame } from './createRetirementVisualAuditGame'

export const COPY_AUDIT_PHASES: readonly GamePhase[] = [
  'HOME',
  'CREATE_IDENTITY',
  'CREATE_POSITION',
  'CREATE_PRIORITIES',
  'CREATE_PREFERENCES',
  'PLAYER_REVEAL',
  'ACADEMY_OFFERS',
  'ARRIVAL_EVENT',
  'HALF_YEAR_PLAN',
  'SPECIAL_EVENT',
  'SPECIAL_EVENT_RESULT',
  'SIMULATION_READY',
  'HALF_YEAR_REPORT',
  'CAREER_DASHBOARD',
  'PRO_CONTRACT_OFFER',
  'PRO_CONTRACT_COMPLETE',
  'PRO_STAGE_COMPLETE',
  'TRANSFER_WINDOW',
  'TRANSFER_ARRIVAL',
  'TRANSFER_STAGE_COMPLETE',
  'RETIREMENT_DECISION',
  'CAREER_RETIRED',
]

const auditIdentity = {
  name: '甲乙丙丁戊己庚辛壬癸子丑',
  jerseyNumber: 10,
  preferredFoot: 'RIGHT' as const,
}

function resetAndCreate() {
  useGameStore.setState({ game: null, hasSave: false, error: null })
  const store = useGameStore.getState()
  store.startNewCareer()
  store.submitIdentity(auditIdentity)
  store.submitPosition('ST', 'LW')
  store.submitPriorities([
    'PLAYING_TIME',
    'COMPETITIVE_LEVEL',
    'SALARY',
    'STABILITY',
  ])
  store.submitPreferences('CONDITIONAL', ['意大利', '英格兰', '中国'])
}

function resetAtIdentity() {
  useGameStore.setState({ game: null, hasSave: false, error: null })
  useGameStore.getState().startNewCareer()
}

function advanceToPosition() {
  useGameStore.getState().submitIdentity(auditIdentity)
}

function state(): GameState {
  const game = useGameStore.getState().game
  if (!game) throw new Error('Copy audit fixture unexpectedly lost its game.')
  return game
}

function academyPlan(): GameState {
  resetAndCreate()
  const store = useGameStore.getState()
  store.confirmPlayer()
  const offer = state().academyOffers[0]
  if (!offer) throw new Error('Copy audit fixture needs one academy offer.')
  store.selectAcademy(offer.club.id)
  store.chooseArrival('COACH')
  return state()
}

function resolveEventIfNeeded() {
  const store = useGameStore.getState()
  while (state().phase === 'SPECIAL_EVENT') {
    const pending = state().pendingCareerEvent
    if (!pending) throw new Error('Special-event phase has no pending event.')
    const event = getCareerEvent(pending.eventId)
    const option =
      event.setup && pending.stepIndex === 0
        ? event.setup.options[0]?.id
        : event.choices[0]?.id
    if (!option) throw new Error('Special event has no selectable audit option.')
    store.chooseCareerEvent(option)
  }
  if (state().phase === 'SPECIAL_EVENT_RESULT') store.continueAfterCareerEvent()
}

function reportGame(): GameState {
  academyPlan()
  useGameStore.getState().chooseTraining('BALANCED', 'STEADY')
  resolveEventIfNeeded()
  if (state().phase !== 'HALF_YEAR_REPORT') {
    throw new Error('Copy audit fixture did not reach the half-year report.')
  }
  return state()
}

function dashboardGame(): GameState {
  reportGame()
  useGameStore.getState().advanceAfterReport()
  if (state().phase !== 'HALF_YEAR_PLAN') {
    throw new Error('Copy audit fixture could not advance after its first report.')
  }
  for (let completed = 1; completed < 4; completed += 1) {
    useGameStore.getState().chooseTraining('BALANCED', 'STEADY')
    resolveEventIfNeeded()
    useGameStore.getState().advanceAfterReport()
  }
  if (state().phase !== 'CAREER_DASHBOARD') {
    throw new Error('Copy audit fixture did not reach the youth-career dashboard.')
  }
  return state()
}

function professionalOfferGame(): GameState {
  dashboardGame()
  useGameStore.getState().openProfessionalContract()
  if (state().phase !== 'PRO_CONTRACT_OFFER') {
    throw new Error('Copy audit fixture did not receive a professional offer.')
  }
  return state()
}

function professionalCompleteGame(): GameState {
  professionalOfferGame()
  useGameStore.getState().acceptProfessionalContract()
  if (state().phase !== 'PRO_CONTRACT_COMPLETE') {
    throw new Error('Copy audit fixture did not accept its professional offer.')
  }
  return state()
}

function professionalPlanGame(): GameState {
  professionalCompleteGame()
  useGameStore.getState().startProfessionalCareer()
  if (state().phase !== 'HALF_YEAR_PLAN') {
    throw new Error('Copy audit fixture did not start its professional career.')
  }
  return state()
}

function professionalStageGame(): GameState {
  professionalPlanGame()
  useGameStore.getState().chooseTraining('BALANCED', 'STEADY')
  resolveEventIfNeeded()
  useGameStore.getState().advanceAfterReport()
  if (state().phase !== 'PRO_STAGE_COMPLETE') {
    throw new Error('Copy audit fixture did not reach professional stage complete.')
  }
  return state()
}

function transferWindowGame(): GameState {
  const game = professionalStageGame()
  const offer: TransferOffer = {
    id: 'copy-audit-transfer-offer',
    type: 'PERMANENT_TRANSFER',
    clubId: 'eng_arsenal',
    remainingHalfYears: 6,
    annualSalaryEuro: 180_000,
    promisedTeamLevel: 'FIRST_TEAM',
    promisedRole: 'ROTATION',
    releaseClauseEuro: 3_000_000,
    clubOptionYears: 0,
    parentClubId: null,
    brokenPromiseWindows: 0,
    transferFeeEuro: 500_000,
    interestScore: 78,
    estimatedPotential: 79,
    counterUsed: false,
    counterDirection: null,
    negotiationSucceeded: null,
    negotiationMessage: null,
    withdrawn: false,
  }
  const market = validateFixture({
    ...game,
    phase: 'TRANSFER_WINDOW',
    transferOffers: [offer],
    selectedTransferChoiceId: offer.id,
    transferDecision: null,
    transferArrivalChoice: null,
  })
  useGameStore.setState({ game: market, error: null })
  return market
}

function transferArrivalGame(): GameState {
  transferWindowGame()
  const offer = state().transferOffers.find((candidate) => !candidate.withdrawn)
  if (!offer) throw new Error('Copy audit fixture has no active transfer offer.')
  useGameStore.getState().selectTransferChoice(offer.id)
  useGameStore.getState().confirmTransferChoice()
  if (state().phase !== 'TRANSFER_ARRIVAL') {
    throw new Error('Copy audit fixture did not accept a transfer offer.')
  }
  return state()
}

function transferStageGame(): GameState {
  transferArrivalGame()
  useGameStore.getState().chooseTransferArrival('LEADERS')
  if (state().phase !== 'TRANSFER_STAGE_COMPLETE') {
    throw new Error('Copy audit fixture did not complete transfer arrival.')
  }
  return state()
}

function validateFixture(game: GameState): GameState {
  return validateGameState(structuredClone(game))
}

/**
 * Produces a legal state for one visible production phase. HOME intentionally
 * returns null: production renders HomeScreen with no game rather than a fake
 * persisted HOME save.
 */
export function createCopyAuditGame(phase: GamePhase): GameState | null {
  if (phase === 'HOME') return null

  if (phase === 'CREATE_IDENTITY') {
    resetAtIdentity()
    return validateFixture(state())
  }

  resetAtIdentity()
  advanceToPosition()
  if (phase === 'CREATE_POSITION') return validateFixture(state())

  useGameStore.getState().submitPosition('ST', 'LW')
  if (phase === 'CREATE_PRIORITIES') return validateFixture(state())

  useGameStore.getState().submitPriorities([
    'PLAYING_TIME',
    'COMPETITIVE_LEVEL',
    'SALARY',
    'STABILITY',
  ])
  if (phase === 'CREATE_PREFERENCES') return validateFixture(state())

  useGameStore.getState().submitPreferences('CONDITIONAL', ['意大利', '英格兰', '中国'])
  if (phase === 'PLAYER_REVEAL') return validateFixture(state())

  useGameStore.getState().confirmPlayer()
  if (phase === 'ACADEMY_OFFERS') return validateFixture(state())

  const offer = state().academyOffers[0]
  if (!offer) throw new Error('Copy audit fixture needs one academy offer.')
  useGameStore.getState().selectAcademy(offer.club.id)
  if (phase === 'ARRIVAL_EVENT') return validateFixture(state())

  useGameStore.getState().chooseArrival('COACH')
  if (phase === 'HALF_YEAR_PLAN') return validateFixture(state())

  if (phase === 'SPECIAL_EVENT' || phase === 'SPECIAL_EVENT_RESULT') {
    const base = state()
    const event = getCareerEvent('COACH_TACTICAL_MEETING')
    const route = event.setup?.options[0]
    const choice = route?.choiceIds[0]
    if (!route || !choice) throw new Error('Copy audit event route is unavailable.')
    const eventState: GameState = {
      ...base,
      phase,
      trainingFocus: 'BALANCED',
      pendingCareerEvent: {
        eventId: 'COACH_TACTICAL_MEETING',
        interactionKind: event.interactionKind,
        stepIndex: phase === 'SPECIAL_EVENT' ? 0 : 1,
        selections: phase === 'SPECIAL_EVENT' ? [] : [route.id, choice],
        variantId: phase === 'SPECIAL_EVENT' ? null : route.id,
      },
    }
    return validateFixture(eventState)
  }

  if (phase === 'SIMULATION_READY') {
    return validateFixture({
      ...state(),
      phase,
      trainingFocus: 'BALANCED',
      developmentApproach: 'STEADY',
    })
  }

  if (phase === 'HALF_YEAR_REPORT') return validateFixture(reportGame())
  if (phase === 'CAREER_DASHBOARD') return validateFixture(dashboardGame())
  if (phase === 'PRO_CONTRACT_OFFER') return validateFixture(professionalOfferGame())
  if (phase === 'PRO_CONTRACT_COMPLETE') return validateFixture(professionalCompleteGame())
  if (phase === 'PRO_STAGE_COMPLETE') return validateFixture(professionalStageGame())
  if (phase === 'TRANSFER_WINDOW') return validateFixture(transferWindowGame())
  if (phase === 'TRANSFER_ARRIVAL') return validateFixture(transferArrivalGame())
  if (phase === 'TRANSFER_STAGE_COMPLETE') return validateFixture(transferStageGame())

  if (phase === 'RETIREMENT_DECISION') {
    const game = professionalStageGame()
    useGameStore.setState({ game: { ...game, windowIndex: 34 }, error: null })
    useGameStore.getState().requestRetirement()
    return validateFixture(state())
  }

  if (phase === 'CAREER_RETIRED') {
    return createRetirementVisualAuditGame(['ita_inter', 'ita1_ac_milan', 'eng_arsenal'])
  }

  throw new Error(`Unsupported copy-audit phase: ${phase}`)
}
