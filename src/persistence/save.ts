import { z } from 'zod'
import {
  attributeKeys,
  positions,
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

const stateSchema = z.object({
  saveVersion: z.literal(3),
  dataVersion: z.literal(3),
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
    'SIMULATION_READY',
    'HALF_YEAR_REPORT',
    'CAREER_DASHBOARD',
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
  developmentApproach: z
    .enum(['PUSH', 'STEADY', 'TEAM_FIRST'])
    .nullable(),
  trainingQualityBonus: z.number().finite(),
  firstTeamProgress: firstTeamProgressSchema,
  cashEuro: z.number().int().nonnegative(),
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

  if (migrated.saveVersion !== 2) return migrated
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

  return {
    ...migrated,
    saveVersion: 3,
    dataVersion: 3,
    phase: shouldContinueOldDemo ? 'HALF_YEAR_PLAN' : migrated.phase,
    windowIndex: shouldContinueOldDemo ? history.length : migrated.windowIndex,
    teamLevel: 'YOUTH',
    trainingFocus: shouldContinueOldDemo ? null : migrated.trainingFocus,
    developmentApproach: null,
    firstTeamProgress,
    lastReport,
    history,
  }
}

export function validateGameState(value: unknown): GameState {
  const parsed = stateSchema.parse(migrateLegacyState(value)) as GameState
  if (parsed.draft.priorities.length !== 4) {
    throw new Error('Career priority ranking must contain four items.')
  }
  if (new Set(parsed.draft.priorities).size !== 4) {
    throw new Error('Career priorities must be unique.')
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
    ['ACADEMY_OFFERS', 'ARRIVAL_EVENT', 'HALF_YEAR_PLAN', 'SIMULATION_READY', 'HALF_YEAR_REPORT', 'CAREER_DASHBOARD'].includes(
      parsed.phase,
    ) &&
    parsed.academyOffers.length !== 3
  ) {
    throw new Error(`Phase ${parsed.phase} requires exactly three offers.`)
  }

  if (
    ['ARRIVAL_EVENT', 'HALF_YEAR_PLAN', 'SIMULATION_READY', 'HALF_YEAR_REPORT', 'CAREER_DASHBOARD'].includes(
      parsed.phase,
    ) &&
    (!parsed.selectedClubId || !parsed.youthRole)
  ) {
    throw new Error(`Phase ${parsed.phase} requires a selected club and role.`)
  }

  if (
    parsed.phase === 'SIMULATION_READY' &&
    (!parsed.arrivalChoice || !parsed.trainingFocus)
  ) {
    throw new Error('Simulation-ready state is missing player choices.')
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
      return decode(current)
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
