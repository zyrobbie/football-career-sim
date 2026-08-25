import { createCareerStoryState } from '../engine/careerStory'
import { generateAcademyOffers } from '../engine/offers'
import { generatePlayer } from '../engine/player'
import {
  DATA_VERSION,
  SAVE_VERSION,
  type CareerHistoryEntry,
  type CreationDraft,
  type GameState,
} from '../models/game'
import { validateGameState } from '../persistence/save'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'

const draft: CreationDraft = {
  name: '队徽验收球员',
  jerseyNumber: 10,
  preferredFoot: 'RIGHT',
  primaryPosition: 'ST',
  secondaryPosition: 'LW',
  priorities: ['PLAYING_TIME', 'COMPETITIVE_LEVEL', 'SALARY', 'STABILITY'],
  overseasIntent: 'DOMESTIC',
  preferredLeagues: ['中国'],
}

export function createRetirementVisualAuditGame(clubIds: readonly string[]): GameState {
  if (clubIds.length === 0 || clubIds.length > 32 || new Set(clubIds).size !== clubIds.length) {
    throw new Error('clubIds must contain 1–32 unique clubs.')
  }
  const resolved = clubIds.map((id) => {
    const club = getClubParametersByCompatibleId(id)
    if (!club) throw new Error('Every clubId must resolve through the runtime compatibility catalog.')
    return club
  })
  const player = generatePlayer(draft, 'retirement-visual-audit')
  const academyOffers = generateAcademyOffers(player, 'retirement-visual-audit')
  const finalClub = resolved.at(-1)!
  const history: CareerHistoryEntry[] = resolved.map((club, index) => ({
    windowIndex: 55 - resolved.length + index + 1,
    clubId: club.id,
    clubName: club.name,
    role: 'ROTATION',
    stats: { appearances: 12, starts: 9, minutes: 810, goals: 4, assists: 3, yellowCards: 0, redCards: 0, averageRating: 7.1 },
    arrivalChoice: null,
    trainingFocus: 'BALANCED',
    developmentApproach: 'STEADY',
    endingAttributes: { attack: 76, defense: 38, physical: 70, mental: 72 },
    firstTeamAttention: 80,
    teamLevel: 'FIRST_TEAM',
  }))
  const game: GameState = {
    saveVersion: SAVE_VERSION,
    dataVersion: DATA_VERSION,
    phase: 'CAREER_RETIRED',
    careerSeed: 'retirement-visual-audit',
    startYear: 2026,
    windowIndex: 55,
    draft,
    player: { ...player, attributes: { attack: 76, defense: 38, physical: 70, mental: 72 }, potentials: { attack: 82, defense: 48, physical: 78, mental: 78 } },
    academyOffers,
    selectedClubId: finalClub.id, teamLevel: 'FIRST_TEAM', youthRole: null, firstTeamRole: 'ROTATION',
    contract: { type: 'PERMANENT_TRANSFER', clubId: finalClub.id, remainingHalfYears: 0, annualSalaryEuro: 500000, promisedTeamLevel: 'FIRST_TEAM', promisedRole: 'ROTATION', releaseClauseEuro: null, clubOptionYears: 0, parentClubId: null, brokenPromiseWindows: 0 },
    professionalOffer: null, transferOffers: [], selectedTransferChoiceId: null, transferDecision: null, arrivalChoice: null, transferArrivalChoice: null, pendingCareerEvent: null, careerEventHistory: [], pendingConsequences: [], careerStory: createCareerStoryState(finalClub.id), trainingFocus: null, developmentApproach: null, trainingQualityBonus: 0,
    firstTeamProgress: { clubId: finalClub.id, attention: 80, readiness: 80, matchProof: 80, coachBacking: 80, status: 'PROMOTED' }, cashEuro: 200000,
    nationalTeam: { retired: true, currentRole: null, caps: 0, goals: 0, assists: 0, debutWindowIndex: null, history: [] }, retirementReason: 'AGE_LIMIT', lastReport: null, history,
  }
  return validateGameState(game)
}
