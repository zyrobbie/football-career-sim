import { z } from 'zod'
import { MAX_CAREER_AGE } from '../data/ageCurve'
import {
  CAREER_EVENT_IDS,
  CAREER_EVENT_INTERACTION_KINDS,
} from '../data/careerEventIds'
import {
  canSignNewContractAtWindow,
  playerAgeAtWindow,
  shouldRetireAtContractExpiry,
} from '../engine/careerTime'
import { enforceAgeBasedFirstTeam } from '../engine/eligibility'
import { createCareerStoryState } from '../engine/careerStory'
import { getCareerEvent } from '../engine/careerEvents'
import {
  attributeKeys,
  DATA_VERSION,
  positions,
  SAVE_VERSION,
  type GameState,
} from '../models/game'

const CURRENT_KEY = 'career_save_current'
const BACKUP_KEY = 'career_save_backup'

const attributesSchema = z.object({
  attack: z.number().finite(),
  defense: z.number().finite(),
  physical: z.number().finite(),
  mental: z.number().finite(),
})

const clubSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortMark: z.string().min(1),
  country: z.string().min(1),
  leagueKey: z.string().min(1),
  leagueLabel: z.string().min(1),
  profile: z.enum(['ELITE', 'BALANCED', 'SMALL']),
  tier: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  facilityTier: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  academyTier: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  description: z.string(),
})

const draftSchema = z.object({
  name: z.string(),
  jerseyNumber: z.number().int().min(1).max(99),
  preferredFoot: z.enum(['LEFT', 'RIGHT']),
  primaryPosition: z.enum(positions),
  secondaryPosition: z.enum(positions),
  priorities: z.array(
    z.enum([
      'PLAYING_TIME',
      'COMPETITIVE_LEVEL',
      'SALARY',
      'STABILITY',
    ]),
  ),
  overseasIntent: z.enum(['STRONG', 'CONDITIONAL', 'DOMESTIC']),
  preferredLeagues: z.array(z.string()),
})

const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  nationality: z.literal('CHN'),
  jerseyNumber: z.number().int().min(1).max(99),
  preferredFoot: z.enum(['LEFT', 'RIGHT']),
  primaryPosition: z.enum(positions),
  secondaryPosition: z.enum(positions),
  positionFamiliarity: z.record(z.string(), z.number()),
  attributes: attributesSchema,
  potentials: attributesSchema,
  form: z.number().finite(),
  fitness: z.number().finite(),
  morale: z.number().finite(),
  coachRelation: z.number().finite(),
  squadRelation: z.number().finite(),
  agentRelation: z.number().finite(),
  fanRelation: z.number().finite(),
  mediaRelation: z.number().finite(),
  reputation: z.number().finite(),
  clubAttachment: z.number().finite(),
  priorities: z.array(
    z.enum([
      'PLAYING_TIME',
      'COMPETITIVE_LEVEL',
      'SALARY',
      'STABILITY',
    ]),
  ),
  priorityValues: z.record(z.string(), z.number()),
  overseasIntent: z.enum(['STRONG', 'CONDITIONAL', 'DOMESTIC']),
  preferredLeagues: z.array(z.string()),
})

const firstTeamProgressSchema = z.object({
  clubId: z.string().nullable(),
  attention: z.number().finite().min(0).max(100),
  readiness: z.number().finite().min(0).max(100),
  matchProof: z.number().finite().min(0).max(100),
  coachBacking: z.number().finite().min(0).max(100),
  status: z.enum([
    'DEVELOPING',
    'WATCHLIST',
    'TRAINING_CANDIDATE',
    'FIRST_TEAM_TRAINING',
    'PROMOTION_READY',
    'PROMOTED',
  ]),
})

const contractSchema = z.object({
  type: z.enum([
    'FIRST_PRO',
    'PERMANENT_TRANSFER',
    'LOAN',
    'FREE_TRANSFER',
    'RENEWAL',
    'DOMESTIC_ACADEMY_TRANSFER',
  ]),
  clubId: z.string().min(1),
  remainingHalfYears: z.number().int().nonnegative(),
  annualSalaryEuro: z.number().int().nonnegative(),
  promisedTeamLevel: z.enum(['YOUTH', 'FIRST_TEAM']),
  promisedRole: z
    .enum(['FRINGE', 'SUBSTITUTE', 'ROTATION', 'STARTER', 'CORE'])
    .nullable(),
  releaseClauseEuro: z.number().int().nonnegative().nullable(),
  clubOptionYears: z.number().int().min(0).max(2),
  parentClubId: z.string().nullable(),
  brokenPromiseWindows: z.number().int().nonnegative(),
})

const professionalOfferSchema = contractSchema.extend({
  id: z.string().min(1),
  counterUsed: z.boolean(),
  counterDirection: z
    .enum(['SALARY', 'ROLE', 'RELEASE_CLAUSE'])
    .nullable(),
  negotiationSucceeded: z.boolean().nullable(),
  negotiationMessage: z.string().nullable(),
})

const transferOfferSchema = contractSchema.extend({
  id: z.string().min(1),
  transferFeeEuro: z.number().int().nonnegative(),
  interestScore: z.number().int().min(0).max(100),
  estimatedPotential: z.number().int().min(0).max(100),
  counterUsed: z.boolean(),
  counterDirection: z
    .enum(['SALARY', 'ROLE', 'RELEASE_CLAUSE'])
    .nullable(),
  negotiationSucceeded: z.boolean().nullable(),
  negotiationMessage: z.string().nullable(),
  withdrawn: z.boolean(),
})

const transferArrivalChoiceSchema = z.enum([
  'DINNER',
  'LEADERS',
  'FANS',
  'NONE',
])

const careerEventIdSchema = z.enum(CAREER_EVENT_IDS)
const careerEventInteractionKindSchema = z.enum(
  CAREER_EVENT_INTERACTION_KINDS,
)

const storyTendenciesSchema = z.object({
  leadership: z.number().int().min(0).max(5),
  diplomacy: z.number().int().min(0).max(5),
  professionalism: z.number().int().min(0).max(5),
  clutch: z.number().int().min(0).max(5),
})

const careerStoryEffectSchema = z.object({
  club: z
    .object({
      leadership: z.enum(['NONE', 'CANDIDATE', 'CAPTAIN']).optional(),
      rivalry: z.enum(['NONE', 'HEALTHY', 'HOSTILE']).optional(),
      mentorship: z.enum(['NONE', 'MENTEE', 'MENTOR']).optional(),
    })
    .optional(),
  publicPersona: z
    .enum(['NEUTRAL', 'LOW_KEY', 'TEAM_FIRST', 'OUTSPOKEN'])
    .optional(),
  tendencyDelta: storyTendenciesSchema.partial().optional(),
})

const careerStorySchema = z.object({
  club: z.object({
    clubId: z.string().min(1).nullable(),
    leadership: z.enum(['NONE', 'CANDIDATE', 'CAPTAIN']),
    rivalry: z.enum(['NONE', 'HEALTHY', 'HOSTILE']),
    mentorship: z.enum(['NONE', 'MENTEE', 'MENTOR']),
  }),
  publicPersona: z.enum(['NEUTRAL', 'LOW_KEY', 'TEAM_FIRST', 'OUTSPOKEN']),
  tendencies: storyTendenciesSchema,
})

const playerEventDeltaSchema = z.object({
  attributes: attributesSchema.partial().optional(),
  form: z.number().finite().optional(),
  fitness: z.number().finite().optional(),
  morale: z.number().finite().optional(),
  coachRelation: z.number().finite().optional(),
  squadRelation: z.number().finite().optional(),
  agentRelation: z.number().finite().optional(),
  fanRelation: z.number().finite().optional(),
  mediaRelation: z.number().finite().optional(),
  reputation: z.number().finite().optional(),
  clubAttachment: z.number().finite().optional(),
})

const careerEventRecordSchema = z.object({
  eventId: careerEventIdSchema,
  choiceId: z.string().min(1).max(32),
  windowIndex: z.number().int().nonnegative(),
  choiceTitle: z.string().min(1),
  outcomeSummary: z.string().min(1),
  outcomeLabel: z.string().min(1).optional(),
  appliedDelta: playerEventDeltaSchema,
  cashDeltaEuro: z.number().int(),
  storyEffect: careerStoryEffectSchema.optional(),
})

const careerConsequenceSchema = z.object({
  id: z.string().min(1),
  sourceEventId: careerEventIdSchema,
  applyAtWindow: z.number().int().nonnegative(),
  playerDelta: playerEventDeltaSchema,
  trainingBonus: z.number().finite(),
  summary: z.string().min(1),
})

const nationalTeamRoleSchema = z.enum([
  'FRINGE',
  'ROTATION',
  'STARTER',
  'CORE',
])

const nationalTeamWindowRecordSchema = z.object({
  windowIndex: z.number().int().nonnegative(),
  calledUp: z.boolean(),
  role: nationalTeamRoleSchema.nullable(),
  competition: z.enum([
    'INTERNATIONAL_WINDOW',
    'WORLD_CUP',
    'ASIAN_CUP',
  ]),
  stage: z
    .enum([
      'NOT_QUALIFIED',
      'GROUP_STAGE',
      'ROUND_OF_16',
      'QUARTER_FINAL',
      'SEMI_FINAL',
      'RUNNER_UP',
      'CHAMPION',
    ])
    .nullable(),
  appearances: z.number().int().nonnegative(),
  starts: z.number().int().nonnegative(),
  minutes: z.number().int().nonnegative(),
  goals: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  averageRating: z.number().finite().min(0).max(10).nullable(),
  selectionScore: z.number().finite(),
  selectionBenchmark: z.number().finite(),
  debut: z.boolean(),
  summary: z.string().min(1),
})

const nationalTeamStateSchema = z.object({
  retired: z.boolean(),
  currentRole: nationalTeamRoleSchema.nullable(),
  caps: z.number().int().nonnegative(),
  goals: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  debutWindowIndex: z.number().int().nonnegative().nullable(),
  history: z.array(nationalTeamWindowRecordSchema).max(60),
})

const stateSchema = z.object({
  saveVersion: z.literal(SAVE_VERSION),
  dataVersion: z.literal(DATA_VERSION),
  phase: z.enum([
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
  ]),
  careerSeed: z.string().min(8),
  startYear: z.number().int().min(2020).max(9999),
  windowIndex: z.number().int().min(0),
  draft: draftSchema,
  player: playerSchema.nullable(),
  academyOffers: z.array(
    z.object({
      club: clubSchema,
      expectedRole: z.enum(['ROTATION', 'STARTER', 'CORE']),
      firstTeamChance: z.enum(['HARD', 'NORMAL', 'FAST']),
      annualStipendEuro: z.number().int().nonnegative(),
    }),
  ),
  selectedClubId: z.string().nullable(),
  teamLevel: z.enum(['YOUTH', 'FIRST_TEAM']),
  youthRole: z.enum(['ROTATION', 'STARTER', 'CORE']).nullable(),
  firstTeamRole: z
    .enum(['FRINGE', 'SUBSTITUTE', 'ROTATION', 'STARTER', 'CORE'])
    .nullable(),
  contract: contractSchema.nullable(),
  professionalOffer: professionalOfferSchema.nullable(),
  transferOffers: z.array(transferOfferSchema).max(4),
  selectedTransferChoiceId: z.string().nullable(),
  transferDecision: z
    .object({
      kind: z.enum(['STAY', 'TRANSFER']),
      fromClubId: z.string().min(1),
      toClubId: z.string().min(1),
      arrivalChoice: transferArrivalChoiceSchema.nullable(),
      cashSpentEuro: z.number().int().nonnegative(),
    })
    .nullable(),
  arrivalChoice: z
    .enum(['COACH', 'TEAMMATES', 'OPEN_DAY', 'EXTRA_TRAINING'])
    .nullable(),
  trainingFocus: z
    .enum([
      'attack',
      'defense',
      'physical',
      'mental',
      'BALANCED',
      'ADAPTATION',
    ])
    .nullable(),
  transferArrivalChoice: transferArrivalChoiceSchema.nullable(),
  pendingCareerEvent: z
    .object({
      eventId: careerEventIdSchema,
      interactionKind: careerEventInteractionKindSchema,
      stepIndex: z.number().int().min(0).max(8),
      selections: z.array(z.string().min(1).max(32)).max(8),
      variantId: z.string().min(1).max(64).nullable(),
    })
    .nullable(),
  careerEventHistory: z.array(careerEventRecordSchema).max(80),
  pendingConsequences: z.array(careerConsequenceSchema).max(16),
  careerStory: careerStorySchema,
  developmentApproach: z
    .enum(['PUSH', 'STEADY', 'TEAM_FIRST'])
    .nullable(),
  trainingQualityBonus: z.number().finite(),
  firstTeamProgress: firstTeamProgressSchema,
  cashEuro: z.number().int().nonnegative(),
  nationalTeam: nationalTeamStateSchema,
  retirementReason: z.enum(['VOLUNTARY', 'AGE_LIMIT']).nullable(),
  lastReport: z.unknown().nullable(),
  history: z.array(z.unknown()),
})

interface SaveEnvelope {
  checksum: string
  data: GameState
}

function checksum(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function validateRating(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be between 0 and 100.`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function migratedPromiseFulfilled(
  contract: Record<string, unknown>,
  actualTeamLevel: string,
  actualRole: string,
): boolean {
  if (
    contract.promisedTeamLevel === 'YOUTH' &&
    actualTeamLevel === 'FIRST_TEAM'
  ) {
    return true
  }
  if (contract.promisedTeamLevel !== actualTeamLevel) return false
  if (typeof contract.promisedRole !== 'string') return true
  const order =
    actualTeamLevel === 'FIRST_TEAM'
      ? ['FRINGE', 'SUBSTITUTE', 'ROTATION', 'STARTER', 'CORE']
      : ['ROTATION', 'STARTER', 'CORE']
  return order.indexOf(actualRole) >= order.indexOf(contract.promisedRole)
}

function migrateLegacyState(value: unknown): unknown {
  if (!isRecord(value)) return value
  let migrated = value

  if (migrated.saveVersion === 1) {
    const draft = isRecord(migrated.draft)
      ? {
          ...migrated.draft,
          jerseyNumber: 10,
          preferredFoot: 'RIGHT',
        }
      : migrated.draft
    const player = isRecord(migrated.player)
      ? {
          ...migrated.player,
          jerseyNumber: 10,
          preferredFoot: 'RIGHT',
        }
      : migrated.player
    migrated = {
      ...migrated,
      saveVersion: 2,
      dataVersion: 2,
      draft,
      player,
    }
  }

  if (migrated.saveVersion === 2) {
    const clubId =
      typeof migrated.selectedClubId === 'string'
        ? migrated.selectedClubId
        : null
    const history = Array.isArray(migrated.history)
      ? migrated.history.map((entry, index) =>
          isRecord(entry)
            ? {
                ...entry,
                developmentApproach: null,
                firstTeamAttention: clubId
                  ? Math.min(45, 18 + (index + 1) * 8)
                  : 0,
                teamLevel: 'YOUTH',
              }
            : entry,
        )
      : migrated.history
    const attention =
      Array.isArray(history) && history.length > 0
        ? Number(
            (history[history.length - 1] as Record<string, unknown>)
              .firstTeamAttention ?? 18,
          )
        : clubId
          ? 18
          : 0
    const firstTeamProgress = {
      clubId,
      attention,
      readiness: 0,
      matchProof: 0,
      coachBacking: 0,
      status: attention >= 35 ? 'WATCHLIST' : 'DEVELOPING',
    }
    const lastReport = isRecord(migrated.lastReport)
      ? {
          ...migrated.lastReport,
          firstTeam: {
            attention: {
              before: Math.max(0, attention - 8),
              after: attention,
              delta: Math.min(8, attention),
            },
            readiness: { before: 0, after: 0, delta: 0 },
            matchProof: { before: 0, after: 0, delta: 0 },
            coachBacking: { before: 0, after: 0, delta: 0 },
            statusBefore: 'DEVELOPING',
            statusAfter: firstTeamProgress.status,
            outcomeSummary: '一线队通道数据已从旧存档安全接续。',
          },
        }
      : migrated.lastReport
    const shouldContinueOldDemo =
      migrated.phase === 'CAREER_DASHBOARD' &&
      Array.isArray(history) &&
      history.length < 4

    migrated = {
      ...migrated,
      saveVersion: 3,
      dataVersion: 3,
      phase: shouldContinueOldDemo ? 'HALF_YEAR_PLAN' : migrated.phase,
      windowIndex: shouldContinueOldDemo
        ? history.length
        : migrated.windowIndex,
      teamLevel: 'YOUTH',
      trainingFocus: shouldContinueOldDemo
        ? null
        : migrated.trainingFocus,
      developmentApproach: null,
      firstTeamProgress,
      lastReport,
      history,
    }
  }

  if (migrated.saveVersion === 3) {
    migrated = {
      ...migrated,
      saveVersion: 4,
      dataVersion: 4,
      firstTeamRole: null,
      contract: null,
      professionalOffer: null,
    }
  }

  if (migrated.saveVersion === 4) {
    migrated = {
      ...migrated,
      saveVersion: 5,
      dataVersion: 5,
      transferOffers: [],
      selectedTransferChoiceId: null,
      transferDecision: null,
      transferArrivalChoice: null,
    }
  }

  if (migrated.saveVersion === 5) {
    migrated = {
      ...migrated,
      saveVersion: 6,
      dataVersion: 6,
      pendingCareerEventId: null,
      careerEventHistory: [],
      pendingConsequences: [],
    }
  }

  if (migrated.saveVersion === 6) {
    const lastReport = isRecord(migrated.lastReport)
      ? migrated.lastReport
      : null
    const reportContract =
      lastReport && isRecord(lastReport.contract)
        ? lastReport.contract
        : null
    const roleBefore =
      lastReport && typeof lastReport.roleBefore === 'string'
        ? lastReport.roleBefore
        : null
    const firstTeam =
      lastReport && isRecord(lastReport.firstTeam)
        ? lastReport.firstTeam
        : null
    const savedActualTeamLevel =
      reportContract && typeof reportContract.actualTeamLevel === 'string'
        ? reportContract.actualTeamLevel
        : null
    const actualTeamLevel =
      savedActualTeamLevel === 'FIRST_TEAM' &&
      firstTeam?.statusBefore !== 'PROMOTED'
        ? 'YOUTH'
        : savedActualTeamLevel

    if (lastReport && reportContract && roleBefore && actualTeamLevel) {
      const fulfilled = migratedPromiseFulfilled(
        reportContract,
        actualTeamLevel,
        roleBefore,
      )
      const brokenPromiseWindows = fulfilled
        ? 0
        : Math.max(
            1,
            typeof reportContract.brokenPromiseWindows === 'number'
              ? reportContract.brokenPromiseWindows
              : 0,
          )
      const repairedContractReport = {
        ...reportContract,
        actualTeamLevel,
        actualRole: roleBefore,
        promiseFulfilled: fulfilled,
        brokenPromiseWindows,
      }
      const history = Array.isArray(migrated.history)
        ? migrated.history.map((entry, index, entries) =>
            index === entries.length - 1 && isRecord(entry)
              ? {
                  ...entry,
                  role: roleBefore,
                  teamLevel: actualTeamLevel,
                }
              : entry,
          )
        : migrated.history
      const contract = isRecord(migrated.contract)
        ? {
            ...migrated.contract,
            brokenPromiseWindows,
          }
        : migrated.contract
      migrated = {
        ...migrated,
        saveVersion: 7,
        dataVersion: 7,
        contract,
        lastReport: {
          ...lastReport,
          contract: repairedContractReport,
        },
        history,
      }
    } else {
      migrated = {
        ...migrated,
        saveVersion: 7,
        dataVersion: 7,
      }
    }
  }

  if (
    [7, 8, 9, 10, 11].includes(Number(migrated.saveVersion)) &&
    isRecord(migrated.contract) &&
    migrated.contract.remainingHalfYears === 0 &&
    ['HALF_YEAR_PLAN', 'SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT', 'SIMULATION_READY'].includes(
      String(migrated.phase),
    ) &&
    isRecord(migrated.lastReport)
  ) {
    const history = Array.isArray(migrated.history)
      ? migrated.history
      : []
    const lastHistory = history[history.length - 1]
    const completedWindowIndex =
      isRecord(lastHistory) &&
      typeof lastHistory.windowIndex === 'number'
        ? lastHistory.windowIndex
        : Math.max(0, Number(migrated.windowIndex) - 1)
    migrated = {
      ...migrated,
      phase: 'PRO_STAGE_COMPLETE',
      windowIndex: completedWindowIndex,
      pendingCareerEventId: null,
      pendingCareerEvent: null,
      trainingFocus: null,
      developmentApproach: null,
      trainingQualityBonus: 0,
    }
  }

  if (migrated.saveVersion === 7) {
    migrated = {
      ...migrated,
      saveVersion: 8,
      dataVersion: 8,
      retirementReason: null,
    }
  }

  if (migrated.saveVersion === 8) {
    const academyOffers = Array.isArray(migrated.academyOffers)
      ? migrated.academyOffers.map((offer) => {
          if (!isRecord(offer) || !isRecord(offer.club)) return offer
          return {
            ...offer,
            club: {
              ...offer.club,
              country:
                typeof offer.club.country === 'string'
                  ? offer.club.country
                  : '中国',
              leagueKey:
                typeof offer.club.leagueKey === 'string'
                  ? offer.club.leagueKey
                  : '中国',
            },
          }
        })
      : migrated.academyOffers
    migrated = {
      ...migrated,
      saveVersion: 9,
      dataVersion: 9,
      academyOffers,
    }
  }

  if (migrated.saveVersion === 9) {
    migrated = {
      ...migrated,
      saveVersion: 10,
      dataVersion: 10,
      nationalTeam: {
        retired: false,
        currentRole: null,
        caps: 0,
        goals: 0,
        assists: 0,
        debutWindowIndex: null,
        history: [],
      },
    }
  }

  if (migrated.saveVersion === 10) {
    const pendingCareerEventId =
      typeof migrated.pendingCareerEventId === 'string'
        ? migrated.pendingCareerEventId
        : null
    const selectedClubId =
      typeof migrated.selectedClubId === 'string'
        ? migrated.selectedClubId
        : null
    migrated = {
      ...migrated,
      saveVersion: SAVE_VERSION,
      dataVersion: DATA_VERSION,
      pendingCareerEvent: pendingCareerEventId
        ? {
            eventId: pendingCareerEventId,
            interactionKind: 'CHOICE',
            stepIndex: 0,
            selections: [],
            variantId: null,
          }
        : null,
      careerStory: createCareerStoryState(selectedClubId),
    }
  }

  return migrated
}

export function validateGameState(value: unknown): GameState {
  const parsed = enforceAgeBasedFirstTeam(
    stateSchema.parse(migrateLegacyState(value)) as GameState,
  )
  if (parsed.draft.priorities.length !== 4) {
    throw new Error('Career priority ranking must contain four items.')
  }
  if (new Set(parsed.draft.priorities).size !== 4) {
    throw new Error('Career priorities must be unique.')
  }
  if (parsed.careerStory.club.clubId !== parsed.selectedClubId) {
    throw new Error('Club story state does not match the current club.')
  }
  const isCareerEventPhase = [
    'SPECIAL_EVENT',
    'SPECIAL_EVENT_RESULT',
  ].includes(parsed.phase)
  if (isCareerEventPhase !== Boolean(parsed.pendingCareerEvent)) {
    throw new Error('Game phase does not match its pending career event.')
  }
  if (
    parsed.pendingCareerEvent &&
    getCareerEvent(parsed.pendingCareerEvent.eventId).interactionKind !==
      parsed.pendingCareerEvent.interactionKind
  ) {
    throw new Error('Pending career-event interaction type is invalid.')
  }

  const nationalTotals = parsed.nationalTeam.history.reduce(
    (total, record) => ({
      caps: total.caps + record.appearances,
      goals: total.goals + record.goals,
      assists: total.assists + record.assists,
    }),
    { caps: 0, goals: 0, assists: 0 },
  )
  if (
    nationalTotals.caps !== parsed.nationalTeam.caps ||
    nationalTotals.goals !== parsed.nationalTeam.goals ||
    nationalTotals.assists !== parsed.nationalTeam.assists
  ) {
    throw new Error('National-team career totals do not match its history.')
  }
  if (parsed.nationalTeam.retired && parsed.nationalTeam.currentRole) {
    throw new Error('A retired international cannot keep an active role.')
  }
  const debut = parsed.nationalTeam.history.find((record) => record.debut)
  if (
    (debut?.windowIndex ?? null) !== parsed.nationalTeam.debutWindowIndex
  ) {
    throw new Error('National-team debut does not match its history.')
  }
  if (parsed.draft.preferredLeagues.length > 3) {
    throw new Error('No more than three preferred leagues are allowed.')
  }

  if (parsed.player) {
    const player = parsed.player
    for (const key of attributeKeys) {
      validateRating(`attributes.${key}`, player.attributes[key])
      validateRating(`potentials.${key}`, player.potentials[key])
      if (player.potentials[key] < player.attributes[key]) {
        throw new Error(`Potential cannot be lower than ${key}.`)
      }
    }
    for (const [label, rating] of [
      ['form', player.form],
      ['fitness', player.fitness],
      ['morale', player.morale],
      ['coachRelation', player.coachRelation],
      ['squadRelation', player.squadRelation],
      ['agentRelation', player.agentRelation],
      ['fanRelation', player.fanRelation],
      ['mediaRelation', player.mediaRelation],
      ['reputation', player.reputation],
      ['clubAttachment', player.clubAttachment],
    ] as const) {
      validateRating(label, rating)
    }
    if (player.positionFamiliarity[player.primaryPosition] !== 100) {
      throw new Error('Primary position familiarity must be 100.')
    }
    if (player.positionFamiliarity[player.secondaryPosition] !== 92) {
      throw new Error('Secondary position familiarity must be 92.')
    }
  }

  const requiresPlayer = ![
    'HOME',
    'CREATE_IDENTITY',
    'CREATE_POSITION',
    'CREATE_PRIORITIES',
    'CREATE_PREFERENCES',
  ].includes(parsed.phase)
  if (requiresPlayer && !parsed.player) {
    throw new Error(`Phase ${parsed.phase} requires a player.`)
  }

  if (
    ['ACADEMY_OFFERS', 'ARRIVAL_EVENT', 'HALF_YEAR_PLAN', 'SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT', 'SIMULATION_READY', 'HALF_YEAR_REPORT', 'CAREER_DASHBOARD', 'PRO_CONTRACT_OFFER', 'PRO_CONTRACT_COMPLETE', 'PRO_STAGE_COMPLETE', 'TRANSFER_WINDOW', 'TRANSFER_ARRIVAL', 'TRANSFER_STAGE_COMPLETE', 'RETIREMENT_DECISION', 'CAREER_RETIRED'].includes(
      parsed.phase,
    ) &&
    parsed.academyOffers.length !== 3
  ) {
    throw new Error(`Phase ${parsed.phase} requires exactly three offers.`)
  }

  if (
    ['ARRIVAL_EVENT', 'HALF_YEAR_PLAN', 'SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT', 'SIMULATION_READY', 'HALF_YEAR_REPORT', 'CAREER_DASHBOARD', 'PRO_CONTRACT_OFFER', 'PRO_CONTRACT_COMPLETE', 'PRO_STAGE_COMPLETE', 'TRANSFER_WINDOW', 'TRANSFER_ARRIVAL', 'TRANSFER_STAGE_COMPLETE', 'RETIREMENT_DECISION', 'CAREER_RETIRED'].includes(
      parsed.phase,
    ) &&
    (!parsed.selectedClubId ||
      (parsed.teamLevel === 'YOUTH' && !parsed.youthRole))
  ) {
    throw new Error(`Phase ${parsed.phase} requires a selected club and role.`)
  }

  if (
    parsed.phase === 'SIMULATION_READY' &&
    (!parsed.arrivalChoice || !parsed.trainingFocus)
  ) {
    throw new Error('Simulation-ready state is missing player choices.')
  }

  if (
    ['SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT'].includes(parsed.phase) &&
    (!parsed.trainingFocus || !parsed.pendingCareerEvent)
  ) {
    throw new Error('Special-event state is missing its event or training choice.')
  }

  if (
    parsed.phase === 'PRO_CONTRACT_OFFER' &&
    !parsed.professionalOffer
  ) {
    throw new Error('Professional-contract phase requires an offer.')
  }

  if (
    ['PRO_CONTRACT_COMPLETE', 'PRO_STAGE_COMPLETE', 'TRANSFER_WINDOW', 'TRANSFER_ARRIVAL', 'TRANSFER_STAGE_COMPLETE', 'RETIREMENT_DECISION', 'CAREER_RETIRED'].includes(parsed.phase) &&
    !parsed.contract
  ) {
    throw new Error('Professional-contract completion requires a contract.')
  }

  if (
    parsed.phase === 'TRANSFER_WINDOW' &&
    parsed.selectedTransferChoiceId === null
  ) {
    throw new Error('Transfer-window phase requires a selected option.')
  }

  if (
    parsed.phase === 'TRANSFER_ARRIVAL' &&
    parsed.transferDecision?.kind !== 'TRANSFER'
  ) {
    throw new Error('Transfer-arrival phase requires a completed transfer.')
  }

  if (
    parsed.phase === 'TRANSFER_STAGE_COMPLETE' &&
    !parsed.transferDecision
  ) {
    throw new Error('Transfer completion requires a decision.')
  }

  if (
    ['RETIREMENT_DECISION', 'CAREER_RETIRED'].includes(parsed.phase) &&
    !parsed.retirementReason
  ) {
    throw new Error('Retirement phase requires a retirement reason.')
  }

  if (
    !['RETIREMENT_DECISION', 'CAREER_RETIRED'].includes(parsed.phase) &&
    parsed.retirementReason
  ) {
    throw new Error('Retirement reason is only valid during retirement.')
  }

  if (
    playerAgeAtWindow(parsed.windowIndex) > MAX_CAREER_AGE &&
    !['RETIREMENT_DECISION', 'CAREER_RETIRED'].includes(parsed.phase)
  ) {
    return {
      ...parsed,
      phase: 'RETIREMENT_DECISION',
      retirementReason: 'AGE_LIMIT',
      pendingCareerEvent: null,
      trainingFocus: null,
      developmentApproach: null,
      trainingQualityBonus: 0,
      transferOffers: [],
      selectedTransferChoiceId: null,
    }
  }

  if (
    parsed.phase === 'PRO_STAGE_COMPLETE' &&
    parsed.contract?.remainingHalfYears === 0 &&
    shouldRetireAtContractExpiry(parsed.windowIndex)
  ) {
    return {
      ...parsed,
      phase: 'RETIREMENT_DECISION',
      retirementReason: 'AGE_LIMIT',
      transferOffers: [],
      selectedTransferChoiceId: null,
    }
  }

  if (
    parsed.phase === 'TRANSFER_WINDOW' &&
    !canSignNewContractAtWindow(parsed.windowIndex)
  ) {
    const lastHistory = parsed.history[parsed.history.length - 1]
    const completedWindowIndex =
      lastHistory?.windowIndex ?? Math.max(0, parsed.windowIndex - 1)
    if (
      parsed.contract?.remainingHalfYears === 0 &&
      shouldRetireAtContractExpiry(completedWindowIndex)
    ) {
      return {
        ...parsed,
        phase: 'RETIREMENT_DECISION',
        windowIndex: completedWindowIndex,
        retirementReason: 'AGE_LIMIT',
        transferOffers: [],
        selectedTransferChoiceId: null,
      }
    }
    return {
      ...parsed,
      phase: 'PRO_STAGE_COMPLETE',
      windowIndex: completedWindowIndex,
      transferOffers: [],
      selectedTransferChoiceId: null,
    }
  }

  if (
    parsed.phase === 'TRANSFER_WINDOW' &&
    parsed.contract?.remainingHalfYears === 0
  ) {
    const renewals = parsed.transferOffers.filter(
      (offer) => offer.type === 'RENEWAL',
    )
    const externalOffers = parsed.transferOffers.filter(
      (offer) => offer.type === 'FREE_TRANSFER',
    )
    const uniqueExternalClubs = new Set(
      externalOffers.map((offer) => offer.clubId),
    )
    const validExpiryMarket =
      renewals.length === 1 &&
      externalOffers.length === 3 &&
      uniqueExternalClubs.size === 3

    if (!validExpiryMarket) {
      const lastHistory = parsed.history[parsed.history.length - 1]
      return {
        ...parsed,
        phase: 'PRO_STAGE_COMPLETE',
        windowIndex:
          lastHistory?.windowIndex ?? Math.max(0, parsed.windowIndex - 1),
        transferOffers: [],
        selectedTransferChoiceId: null,
      }
    }
  }

  return parsed
}

function encode(state: GameState): string {
  const safeState = validateGameState(state)
  const payload = JSON.stringify(safeState)
  const envelope: SaveEnvelope = {
    checksum: checksum(payload),
    data: safeState,
  }
  return JSON.stringify(envelope)
}

function decode(raw: string): GameState {
  const envelope = JSON.parse(raw) as Partial<SaveEnvelope>
  if (!envelope.data || typeof envelope.checksum !== 'string') {
    throw new Error('Invalid save envelope.')
  }
  const payload = JSON.stringify(envelope.data)
  if (checksum(payload) !== envelope.checksum) {
    throw new Error('Save checksum mismatch.')
  }
  return validateGameState(envelope.data)
}

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function saveGame(state: GameState): void {
  if (!storageAvailable()) return
  const encoded = encode(state)
  const current = window.localStorage.getItem(CURRENT_KEY)
  if (current) {
    try {
      decode(current)
      window.localStorage.setItem(BACKUP_KEY, current)
    } catch {
      // Keep the last known valid backup when the current value is corrupt.
    }
  }
  window.localStorage.setItem(CURRENT_KEY, encoded)
  decode(window.localStorage.getItem(CURRENT_KEY) ?? '')
}

export function loadGame(): GameState | null {
  if (!storageAvailable()) return null
  const current = window.localStorage.getItem(CURRENT_KEY)
  if (current) {
    try {
      const decoded = decode(current)
      const normalized = encode(decoded)
      if (normalized !== current) {
        window.localStorage.setItem(BACKUP_KEY, current)
        window.localStorage.setItem(CURRENT_KEY, normalized)
      }
      return decoded
    } catch {
      // Fall through to the internal backup.
    }
  }
  const backup = window.localStorage.getItem(BACKUP_KEY)
  if (!backup) return null
  const recovered = decode(backup)
  window.localStorage.setItem(CURRENT_KEY, encode(recovered))
  return recovered
}

export function hasSavedCareer(): boolean {
  if (!storageAvailable()) return false
  return Boolean(
    window.localStorage.getItem(CURRENT_KEY) ||
      window.localStorage.getItem(BACKUP_KEY),
  )
}

export function deleteSavedCareer(): void {
  if (!storageAvailable()) return
  window.localStorage.removeItem(CURRENT_KEY)
  window.localStorage.removeItem(BACKUP_KEY)
}
