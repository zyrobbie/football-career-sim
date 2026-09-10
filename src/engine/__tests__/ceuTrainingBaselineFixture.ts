import { SAVE_VERSION, DATA_VERSION, type Club, type GameState, type Position } from '../../models/game'
import {
  contractFromOffer,
  generateFirstProfessionalOffer,
} from '../contracts'
import { createFirstTeamProgress } from '../firstTeamPath'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import { createCareerStoryState } from '../careerStory'
import { createDraft } from './testFixtures'

export function createTrainingBaselineState(
  careerSeed: string,
  clubOverride?: Club,
  position: Position = 'CAM',
) {
  const draft = createDraft(position)
  const player = generatePlayer(draft, careerSeed)
  const generatedOffers = generateAcademyOffers(player, careerSeed)
  const generatedAcademy = generatedOffers[1]!
  const academy = clubOverride
    ? { ...generatedAcademy, club: clubOverride }
    : generatedAcademy
  const academyOffers = clubOverride ? [academy] : generatedOffers
  const firstTeamProgress = {
    ...createFirstTeamProgress(academy.club.id),
    attention: 100,
    readiness: 100,
    matchProof: 100,
    coachBacking: 100,
    status: 'PROMOTED' as const,
  }
  const professionalOffer = generateFirstProfessionalOffer({
    player,
    club: academy.club,
    youthRole: academy.expectedRole,
    teamLevel: 'FIRST_TEAM',
    firstTeamProgress,
    careerSeed,
  })
  const contract = contractFromOffer(professionalOffer)
  const state: GameState = {
    saveVersion: SAVE_VERSION,
    dataVersion: DATA_VERSION,
    phase: 'SIMULATION_READY',
    careerSeed,
    startYear: 2026,
    windowIndex: 4,
    draft,
    player,
    academyOffers,
    selectedClubId: academy.club.id,
    teamLevel: 'FIRST_TEAM',
    youthRole: null,
    firstTeamRole: professionalOffer.promisedRole as GameState['firstTeamRole'],
    contract,
    professionalOffer,
    transferOffers: [],
    selectedTransferChoiceId: null,
    transferDecision: null,
    arrivalChoice: 'COACH',
    transferArrivalChoice: null,
    pendingCareerEvent: null,
    careerEventHistory: [],
    pendingConsequences: [],
    careerStory: createCareerStoryState(academy.club.id),
    trainingFocus: 'BALANCED',
    developmentApproach: 'STEADY',
    trainingQualityBonus: 0,
    firstTeamProgress,
    cashEuro: 7_000,
    nationalTeam: {
      retired: false,
      currentRole: null,
      caps: 0,
      goals: 0,
      assists: 0,
      debutWindowIndex: null,
      history: [],
    },
    retirementReason: null,
    lastReport: null,
    history: [],
  }
  return { state, academy }
}

