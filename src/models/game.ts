export const positions = [
  'ST',
  'LW',
  'RW',
  'CAM',
  'LM',
  'RM',
  'CM',
  'CDM',
  'LB',
  'RB',
  'CB',
] as const

export type Position = (typeof positions)[number]

export const attributeKeys = [
  'attack',
  'defense',
  'physical',
  'mental',
] as const

export type AttributeKey = (typeof attributeKeys)[number]

export type Attributes = Record<AttributeKey, number>

export type YouthRole = 'ROTATION' | 'STARTER' | 'CORE'

export type FirstTeamRole =
  | 'FRINGE'
  | 'SUBSTITUTE'
  | 'ROTATION'
  | 'STARTER'
  | 'CORE'

export type SquadRole = YouthRole | FirstTeamRole

export type TeamLevel = 'YOUTH' | 'FIRST_TEAM'

export type ContractType =
  | 'FIRST_PRO'
  | 'PERMANENT_TRANSFER'
  | 'LOAN'
  | 'FREE_TRANSFER'
  | 'RENEWAL'
  | 'DOMESTIC_ACADEMY_TRANSFER'

export type CounterOfferDirection =
  | 'SALARY'
  | 'ROLE'
  | 'RELEASE_CLAUSE'

export type FirstTeamStatus =
  | 'DEVELOPING'
  | 'WATCHLIST'
  | 'TRAINING_CANDIDATE'
  | 'FIRST_TEAM_TRAINING'
  | 'PROMOTION_READY'
  | 'PROMOTED'

export type DevelopmentApproach = 'PUSH' | 'STEADY' | 'TEAM_FIRST'

export type CareerPriority =
  | 'PLAYING_TIME'
  | 'COMPETITIVE_LEVEL'
  | 'SALARY'
  | 'STABILITY'

export type OverseasIntent = 'STRONG' | 'CONDITIONAL' | 'DOMESTIC'

export type PreferredFoot = 'LEFT' | 'RIGHT'

export type TrainingFocus =
  | AttributeKey
  | 'BALANCED'
  | 'ADAPTATION'

export type ArrivalChoice =
  | 'COACH'
  | 'TEAMMATES'
  | 'OPEN_DAY'
  | 'EXTRA_TRAINING'

export type TransferArrivalChoice =
  | 'DINNER'
  | 'LEADERS'
  | 'FANS'
  | 'NONE'

export type GamePhase =
  | 'HOME'
  | 'CREATE_IDENTITY'
  | 'CREATE_POSITION'
  | 'CREATE_PRIORITIES'
  | 'CREATE_PREFERENCES'
  | 'PLAYER_REVEAL'
  | 'ACADEMY_OFFERS'
  | 'ARRIVAL_EVENT'
  | 'HALF_YEAR_PLAN'
  | 'SIMULATION_READY'
  | 'HALF_YEAR_REPORT'
  | 'CAREER_DASHBOARD'
  | 'PRO_CONTRACT_OFFER'
  | 'PRO_CONTRACT_COMPLETE'
  | 'PRO_STAGE_COMPLETE'
  | 'TRANSFER_WINDOW'
  | 'TRANSFER_ARRIVAL'
  | 'TRANSFER_STAGE_COMPLETE'

export interface CreationDraft {
  name: string
  jerseyNumber: number
  preferredFoot: PreferredFoot
  primaryPosition: Position
  secondaryPosition: Position
  priorities: CareerPriority[]
  overseasIntent: OverseasIntent
  preferredLeagues: string[]
}

export interface Player {
  id: string
  name: string
  nationality: 'CHN'
  jerseyNumber: number
  preferredFoot: PreferredFoot
  primaryPosition: Position
  secondaryPosition: Position
  positionFamiliarity: Partial<Record<Position, number>>
  attributes: Attributes
  potentials: Attributes
  form: number
  fitness: number
  morale: number
  coachRelation: number
  squadRelation: number
  agentRelation: number
  fanRelation: number
  mediaRelation: number
  reputation: number
  clubAttachment: number
  priorities: CareerPriority[]
  priorityValues: Record<CareerPriority, 85 | 70 | 55 | 40>
  overseasIntent: OverseasIntent
  preferredLeagues: string[]
}

export interface Club {
  id: string
  name: string
  shortMark: string
  leagueLabel: string
  profile: 'ELITE' | 'BALANCED' | 'SMALL'
  tier: 1 | 2 | 3 | 4 | 5 | 6
  facilityTier: 1 | 2 | 3 | 4 | 5 | 6
  academyTier: 1 | 2 | 3 | 4 | 5 | 6
  description: string
}

export interface AcademyOffer {
  club: Club
  expectedRole: YouthRole
  firstTeamChance: 'HARD' | 'NORMAL' | 'FAST'
  annualStipendEuro: number
}

export interface InjurySummary {
  category: 'MUSCLE' | 'ANKLE' | 'FOOT' | 'OTHER'
  weeks: number
}

export interface HalfYearStats {
  appearances: number
  starts: number
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  averageRating: number
}

export interface NumericChange {
  before: number
  after: number
  delta: number
}

export interface FirstTeamProgress {
  clubId: string | null
  attention: number
  readiness: number
  matchProof: number
  coachBacking: number
  status: FirstTeamStatus
}

export interface ContractState {
  type: ContractType
  clubId: string
  remainingHalfYears: number
  annualSalaryEuro: number
  promisedTeamLevel: TeamLevel
  promisedRole: YouthRole | FirstTeamRole | null
  releaseClauseEuro: number | null
  clubOptionYears: number
  parentClubId: string | null
  brokenPromiseWindows: number
}

export interface ProfessionalContractOffer extends ContractState {
  id: string
  counterUsed: boolean
  counterDirection: CounterOfferDirection | null
  negotiationSucceeded: boolean | null
  negotiationMessage: string | null
}

export interface TransferOffer extends ContractState {
  id: string
  transferFeeEuro: number
  interestScore: number
  estimatedPotential: number
  counterUsed: boolean
  counterDirection: CounterOfferDirection | null
  negotiationSucceeded: boolean | null
  negotiationMessage: string | null
  withdrawn: boolean
}

export interface TransferDecision {
  kind: 'STAY' | 'TRANSFER'
  fromClubId: string
  toClubId: string
  arrivalChoice: TransferArrivalChoice | null
  cashSpentEuro: number
}

export interface HalfYearReport {
  fromLabel: string
  toLabel: string
  clubId: string
  clubName: string
  roleBefore: SquadRole
  roleAfter: SquadRole
  stats: HalfYearStats
  attributes: Record<AttributeKey, NumericChange>
  states: {
    form: NumericChange
    fitness: NumericChange
    morale: NumericChange
  }
  relations: {
    coach: NumericChange
    squad: NumericChange
    fans: NumericChange
  }
  firstTeam: {
    attention: NumericChange
    readiness: NumericChange
    matchProof: NumericChange
    coachBacking: NumericChange
    statusBefore: FirstTeamStatus
    statusAfter: FirstTeamStatus
    outcomeSummary: string
  }
  stipendEuro: number
  incomeLabel?: string
  expenseEuro: number
  cashAfterEuro: number
  contract?: {
    annualSalaryEuro: number
    remainingHalfYears: number
    promisedTeamLevel: TeamLevel
    promisedRole: SquadRole | null
    actualTeamLevel: TeamLevel
    actualRole: SquadRole
    promiseFulfilled: boolean
    brokenPromiseWindows: number
  }
  injury: InjurySummary | null
  eventSummary: string
  hints: string[]
}

export interface CareerHistoryEntry {
  windowIndex: number
  clubId: string
  clubName?: string
  role: SquadRole
  stats: HalfYearStats
  arrivalChoice: ArrivalChoice | null
  trainingFocus: TrainingFocus
  developmentApproach: DevelopmentApproach | null
  endingAttributes: Attributes
  firstTeamAttention: number
  teamLevel: TeamLevel
}

export interface GameState {
  saveVersion: 5
  dataVersion: 5
  phase: GamePhase
  careerSeed: string
  startYear: number
  windowIndex: number
  draft: CreationDraft
  player: Player | null
  academyOffers: AcademyOffer[]
  selectedClubId: string | null
  teamLevel: TeamLevel
  youthRole: YouthRole | null
  firstTeamRole: FirstTeamRole | null
  contract: ContractState | null
  professionalOffer: ProfessionalContractOffer | null
  transferOffers: TransferOffer[]
  selectedTransferChoiceId: 'STAY' | string | null
  transferDecision: TransferDecision | null
  arrivalChoice: ArrivalChoice | null
  transferArrivalChoice: TransferArrivalChoice | null
  trainingFocus: TrainingFocus | null
  developmentApproach: DevelopmentApproach | null
  trainingQualityBonus: number
  firstTeamProgress: FirstTeamProgress
  cashEuro: number
  lastReport: HalfYearReport | null
  history: CareerHistoryEntry[]
}
