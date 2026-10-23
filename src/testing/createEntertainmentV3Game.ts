import type { GameState } from '../models/game'
import { SAVE_VERSION, DATA_VERSION } from '../models/game'
import { createEntertainmentV3State } from '../engine/entertainmentV3'
import { createCareerStoryState } from '../engine/careerStory'
import { createFirstTeamProgress } from '../engine/firstTeamPath'
import { createNationalTeamState } from '../engine/nationalTeam'
import { generatePlayer } from '../engine/player'
import { buildClubSimulationOffer, generateAcademyOffers } from '../engine/offers'
import { generateFirstProfessionalOffer, contractFromOffer } from '../engine/contracts'
/** Anonymous synthetic starting point. No user browser save or claimed natural history. */
export function createEntertainmentV3Game(age = 31, clubId = 'eng_arsenal', seed = 'FUNV3-ANONYMOUS-QA'): GameState {
  const draft: GameState['draft'] = {name:'林知行',jerseyNumber:10,preferredFoot:'RIGHT',primaryPosition:'CAM',secondaryPosition:'CM',priorities:['PLAYING_TIME','COMPETITIVE_LEVEL','SALARY','STABILITY'],overseasIntent:'CONDITIONAL',preferredLeagues:['英格兰']}
  const player = generatePlayer(draft, seed)
  Object.assign(player, {form:65, fitness:60, morale:62, squadRelation:60, reputation:45})
  const academyOffers = generateAcademyOffers(player, seed)
  const offer = buildClubSimulationOffer(clubId, 'STARTER')!
  academyOffers[0] = offer
  const firstTeamProgress = {...createFirstTeamProgress(clubId),attention:100,readiness:100,matchProof:100,coachBacking:100,status:'PROMOTED' as const}
  const professionalOffer = generateFirstProfessionalOffer({player,club:offer.club,youthRole:'STARTER',teamLevel:'FIRST_TEAM',firstTeamProgress,careerSeed:seed})
  const contract = {...contractFromOffer(professionalOffer), annualSalaryEuro:240_000,remainingHalfYears:12,promisedTeamLevel:'FIRST_TEAM' as const,promisedRole:'STARTER' as const}
  return {saveVersion:SAVE_VERSION,dataVersion:DATA_VERSION,entertainmentV3:createEntertainmentV3State(clubId),phase:'HALF_YEAR_PLAN',careerSeed:seed,startYear:2026,windowIndex:(age-13)*2,draft,player,academyOffers,selectedClubId:clubId,teamLevel:'FIRST_TEAM',youthRole:null,firstTeamRole:'STARTER',contract,professionalOffer,transferOffers:[],selectedTransferChoiceId:null,transferDecision:null,arrivalChoice:'COACH',transferArrivalChoice:null,pendingCareerEvent:null,pendingKeyMatchMoment:null,careerEventHistory:[],pendingConsequences:[],careerStory:createCareerStoryState(clubId),trainingFocus:null,developmentApproach:null,trainingQualityBonus:0,firstTeamProgress,cashEuro:200_000,nationalTeam:createNationalTeamState(),retirementReason:null,lastReport:null,history:[]}
}
