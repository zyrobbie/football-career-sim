import {
  YOUTH_BENCHMARKS,
  youthCompetitionTierForClub,
} from '../data/balance'
import type {
  AcademyOffer,
  DevelopmentApproach,
  FirstTeamProgress,
  FirstTeamStatus,
  HalfYearStats,
  Player,
  TeamLevel,
  YouthRole,
} from '../models/game'
import { calculateOverall } from './player'

const ROLE_SCORE: Record<YouthRole, number> = {
  ROTATION: 38,
  STARTER: 67,
  CORE: 88,
}

const PATH_BONUS: Record<AcademyOffer['firstTeamChance'], number> = {
  HARD: -3,
  NORMAL: 3,
  FAST: 8,
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number): number {
  return Math.round(clamp(value))
}

function ratingScore(rating: number): number {
  return clamp(50 + (rating - 6.5) * 32, 20, 96)
}

export function createFirstTeamProgress(
  clubId: string | null = null,
): FirstTeamProgress {
  return {
    clubId,
    attention: clubId ? 18 : 0,
    readiness: 0,
    matchProof: 0,
    coachBacking: 0,
    status: 'DEVELOPING',
  }
}

export function firstTeamStatusFromAttention(
  attention: number,
): FirstTeamStatus {
  if (attention >= 74) return 'PROMOTION_READY'
  if (attention >= 64) return 'FIRST_TEAM_TRAINING'
  if (attention >= 52) return 'TRAINING_CANDIDATE'
  if (attention >= 35) return 'WATCHLIST'
  return 'DEVELOPING'
}

export function evaluateFirstTeamProgress(input: {
  previous: FirstTeamProgress
  player: Player
  offer: AcademyOffer
  role: YouthRole
  stats: HalfYearStats
  windowIndex: number
  approach: DevelopmentApproach | null
}): {
  progress: FirstTeamProgress
  teamLevel: TeamLevel
  outcomeSummary: string
} {
  const {
    previous,
    player,
    offer,
    role,
    stats,
    windowIndex,
    approach,
  } = input
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const readiness = round(
    38 +
      (overall -
        YOUTH_BENCHMARKS[youthCompetitionTierForClub(offer.club)]) *
        4 +
      (role === 'CORE' ? 10 : role === 'STARTER' ? 5 : 0) +
      Math.min(6, windowIndex * 2),
  )
  const appearanceProof = clamp((stats.appearances / 18) * 100)
  const matchProof = round(
    ratingScore(stats.averageRating) * 0.65 +
      appearanceProof * 0.2 +
      ROLE_SCORE[role] * 0.15 +
      (approach === 'TEAM_FIRST' ? 5 : 0),
  )
  const coachBacking = round(
    player.coachRelation * 0.72 +
      ROLE_SCORE[role] * 0.28 +
      (approach === 'PUSH' ? 5 : 0),
  )
  const targetAttention = clamp(
    readiness * 0.4 +
      matchProof * 0.35 +
      coachBacking * 0.25 +
      PATH_BONUS[offer.firstTeamChance],
  )
  const baseAttention =
    previous.clubId === offer.club.id ? previous.attention : 18
  const rawAttention = baseAttention * 0.45 + targetAttention * 0.55
  const attention = round(
    clamp(rawAttention, baseAttention - 6, baseAttention + 16),
  )
  let status = firstTeamStatusFromAttention(attention)
  let teamLevel: TeamLevel = 'YOUTH'

  const canPromote =
    windowIndex >= 3 &&
    attention >= 74 &&
    readiness >= 58 &&
    matchProof >= 55 &&
    coachBacking >= 58 &&
    role === 'CORE' &&
    overall >=
      YOUTH_BENCHMARKS[youthCompetitionTierForClub(offer.club)] + 14 &&
    stats.averageRating >= 7

  if (canPromote) {
    status = 'PROMOTED'
    teamLevel = 'FIRST_TEAM'
  }

  return {
    progress: {
      clubId: offer.club.id,
      attention,
      readiness,
      matchProof,
      coachBacking,
      status,
    },
    teamLevel,
    outcomeSummary: outcomeForStatus(status, offer.club.name),
  }
}

function outcomeForStatus(
  status: FirstTeamStatus,
  clubName: string,
): string {
  if (status === 'PROMOTED') {
    return `${clubName}决定将你正式提拔到一线队，职业合同将在下一阶段处理。`
  }
  if (status === 'PROMOTION_READY') {
    return '你已经进入一线队晋升讨论，下一次稳定表现可能成为决定因素。'
  }
  if (status === 'FIRST_TEAM_TRAINING') {
    return '你获得了阶段性随一线队训练的机会，但仍以青年队比赛为主。'
  }
  if (status === 'TRAINING_CANDIDATE') {
    return '教练组把你列入一线队跟训候选名单，正在等待合适时机。'
  }
  if (status === 'WATCHLIST') {
    return '一线队教练组已经开始定期查看你的青年队报告。'
  }
  return '你仍处于青年队培养阶段，需要用持续表现进入一线队视野。'
}
