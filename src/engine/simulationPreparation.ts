import type { GameState, DevelopmentApproach, TrainingFocus } from '../models/game'
import { buildClubSimulationOffer } from './offers'
import { consumeCareerConsequences } from './careerEvents'
import { enforceAgeBasedFirstTeam } from './eligibility'
import { normalizePendingTraining, applyTrainingMaintenance } from './trainingPlan'
import { prepareProfessionalWindow } from './professionalApproach'
import { playerAgeAtWindow } from './careerTime'
import { preparePersonalArrangementWindow } from './personalArrangements'
import { prepareWindow } from './simulateHalfYear'

export function canonicalSimulationBase(input:GameState):GameState {
  return enforceAgeBasedFirstTeam(normalizePendingTraining(input))
}
export function prepareReadySimulation(input:GameState) {
  const state=normalizePendingTraining(input)
  const offer=state.academyOffers.find(x=>x.club.id===state.selectedClubId)??buildClubSimulationOffer(state.selectedClubId!,state.youthRole??'ROTATION')
  if(!offer)throw new Error('当前俱乐部信息不完整，这半年暂时无法模拟。')
  const consequences=consumeCareerConsequences(state)
  const simulationState:GameState={...state,player:consequences.player,pendingConsequences:consequences.pendingConsequences,trainingQualityBonus:state.trainingQualityBonus+consequences.trainingBonus}
  const currentEventRecord=[...state.careerEventHistory].reverse().find(x=>x.windowIndex===state.windowIndex)??null
  return {state,offer,consequences,simulationState,currentEventRecord}
}
export function prepareFirstTeamSimulation(state:GameState,focus:TrainingFocus,approach:DevelopmentApproach|null, includePersonal = true) {
  const startPlayer=structuredClone(state.player!)
  const preparation=prepareProfessionalWindow(startPlayer,approach)
  const workingPlayer=preparation.player
  const trainingExecution=applyTrainingMaintenance(startPlayer,workingPlayer,playerAgeAtWindow(state.windowIndex),focus)
  const personal = includePersonal ? preparePersonalArrangementWindow(state, workingPlayer) : {player: workingPlayer, receipts: []}
  return {startPlayer,preparation,workingPlayer: personal.player,trainingExecution,personalArrangementReceipts: personal.receipts}
}

export function prepareArrangementQuotePlayer(state: GameState, focus: TrainingFocus, approach: DevelopmentApproach | null) {
  const consequences = consumeCareerConsequences(state)
  const ready = canonicalSimulationBase({...state, player: consequences.player, trainingFocus: focus, developmentApproach: approach})
  if (ready.teamLevel === 'FIRST_TEAM') return prepareFirstTeamSimulation(ready, focus, approach, false).workingPlayer
  const start = structuredClone(ready.player!)
  const working = prepareWindow(start, null, ready.windowIndex, approach).player
  applyTrainingMaintenance(start, working, playerAgeAtWindow(ready.windowIndex), focus)
  return working
}
