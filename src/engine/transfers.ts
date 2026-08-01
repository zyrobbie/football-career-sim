import {
  CLUBS,
  FIRST_TEAM_BENCHMARKS,
  YOUTH_BENCHMARKS,
} from '../data/balance'
import type {
  Club,
  ContractState,
  CounterOfferDirection,
  FirstTeamRole,
  HalfYearReport,
  Player,
  TeamLevel,
  TransferArrivalChoice,
  TransferOffer,
  YouthRole,
} from '../models/game'
import {
  evaluateFirstTeamRole,
  salaryForOffer,
} from './contracts'
import {
  calculateYouthSelectionScore,
  youthRoleFromDifference,
} from './offers'
import { calculateOverall } from './player'
import { createRandom } from './random'
import { DEMO_WINDOW_COUNT } from './careerTime'

const FIRST_TEAM_ROLE_ORDER: FirstTeamRole[] = [
  'FRINGE',
  'SUBSTITUTE',
  'ROTATION',
  'STARTER',
  'CORE',
]

const YOUTH_ROLE_ORDER: YouthRole[] = [
  'ROTATION',
  'STARTER',
  'CORE',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value: number, unit: number): number {
  return Math.max(unit, Math.round(value / unit) * unit)
}

export interface TransferOpportunityAssessment {
  available: boolean
  cadenceQualified: boolean
  performanceQualified: boolean
  nextReviewInWindows: number
  summary: string
}

function isMarketReviewWindow(completedProfessionalWindows: number): boolean {
  if (completedProfessionalWindows < 2) return false
  const cyclePosition = completedProfessionalWindows % 5
  return cyclePosition === 0 || cyclePosition === 2
}

function windowsUntilNextMarketReview(
  completedProfessionalWindows: number,
): number {
  for (let distance = 1; distance <= 3; distance += 1) {
    if (isMarketReviewWindow(completedProfessionalWindows + distance)) {
      return distance
    }
  }
  return 3
}

export function assessDomesticTransferOpportunity(input: {
  player: Player
  latestReport: Pick<HalfYearReport, 'stats'> | null
  windowIndex: number
}): TransferOpportunityAssessment {
  const { player, latestReport, windowIndex } = input
  const completedProfessionalWindows = Math.max(
    0,
    windowIndex - DEMO_WINDOW_COUNT + 1,
  )
  const cadenceQualified = isMarketReviewWindow(
    completedProfessionalWindows,
  )
  const stats = latestReport?.stats
  const performanceQualified = Boolean(
    stats &&
      ((stats.appearances >= 8 && stats.averageRating >= 6.8) ||
        (stats.appearances >= 5 && stats.averageRating >= 7.2) ||
        (player.reputation >= 60 && stats.averageRating >= 6.7)),
  )
  const available = cadenceQualified && performanceQualified
  const nextReviewInWindows = windowsUntilNextMarketReview(
    completedProfessionalWindows,
  )

  return {
    available,
    cadenceQualified,
    performanceQualified,
    nextReviewInWindows,
    summary: available
      ? '你最近的稳定表现吸引了外部关注，经纪团队已经筛出值得推进的正式报价。'
      : cadenceQualified
        ? `本阶段表现尚未吸引到合适报价。保持出场和评分，市场将在${nextReviewInWindows}个窗口后再次集中评估。`
        : `经纪团队正在持续观察市场。转会机会不会每半年出现，下一次集中评估约在${nextReviewInWindows}个窗口后。`,
  }
}

function estimatedPotentialForClub(input: {
  player: Player
  club: Club
  careerSeed: string
  windowIndex: number
}): number {
  const { player, club, careerSeed, windowIndex } = input
  const actual = calculateOverall(
    player.potentials,
    player.primaryPosition,
  )
  const errorRange = club.tier <= 2 ? 3 : club.tier <= 4 ? 5 : 8
  const error = createRandom(
    careerSeed,
    'transfer-scouting',
    windowIndex,
    club.id,
  ).float(-errorRange, errorRange)
  return Math.round(clamp(actual + error, 50, 99))
}

function interestForClub(input: {
  player: Player
  club: Club
  estimatedPotential: number
  latestReport: HalfYearReport | null
  careerSeed: string
  windowIndex: number
}): number {
  const {
    player,
    club,
    estimatedPotential,
    latestReport,
    careerSeed,
    windowIndex,
  } = input
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const random = createRandom(
    careerSeed,
    'transfer-interest',
    windowIndex,
    club.id,
  )
  const abilityFit = clamp(
    23 + (overall - YOUTH_BENCHMARKS[club.tier]) * 1.2,
    12,
    30,
  )
  const positionNeed = random.float(11, 20)
  const potential = clamp((estimatedPotential - 52) * 0.45, 7, 15)
  const recentPerformance = clamp(
    ((latestReport?.stats.averageRating ?? 6.5) - 5.6) * 11,
    6,
    15,
  )
  const reputation = clamp(player.reputation * 0.1, 3, 10)
  const budget = 11 - club.tier

  return Math.round(
    clamp(
      abilityFit +
        positionNeed +
        potential +
        recentPerformance +
        reputation +
        budget,
      0,
      100,
    ),
  )
}

function marketValueEuro(input: {
  player: Player
  estimatedPotential: number
  careerSeed: string
  windowIndex: number
  clubId: string
}): number {
  const {
    player,
    estimatedPotential,
    careerSeed,
    windowIndex,
    clubId,
  } = input
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const abilityBase = Math.max(45_000, (overall - 28) ** 2 * 850)
  const potentialMultiplier = clamp(
    0.85 + (estimatedPotential - overall) * 0.035,
    1,
    2.8,
  )
  const reputationMultiplier = 0.8 + player.reputation * 0.008
  const seedMultiplier = createRandom(
    careerSeed,
    'transfer-fee',
    windowIndex,
    clubId,
  ).float(0.9, 1.16)
  return roundTo(
    abilityBase *
      potentialMultiplier *
      reputationMultiplier *
      seedMultiplier,
    10_000,
  )
}

function promisedTeamAndRole(input: {
  player: Player
  club: Club
  currentTeamLevel: TeamLevel
  interestScore: number
}): {
  teamLevel: TeamLevel
  role: YouthRole | FirstTeamRole
} {
  const { player, club, currentTeamLevel, interestScore } = input
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const firstTeamRole = evaluateFirstTeamRole(player, club)
  const canOfferFirstTeam =
    (currentTeamLevel === 'FIRST_TEAM' ||
      overall >= FIRST_TEAM_BENCHMARKS[club.tier] - 3) &&
    interestScore >= 74 &&
    firstTeamRole !== 'FRINGE'

  if (canOfferFirstTeam) {
    return { teamLevel: 'FIRST_TEAM', role: firstTeamRole }
  }

  return {
    teamLevel: 'YOUTH',
    role: youthRoleFromDifference(
      calculateYouthSelectionScore(player) -
        YOUTH_BENCHMARKS[club.tier],
    ),
  }
}

export function generateDomesticTransferOffers(input: {
  player: Player
  currentClubId: string
  currentTeamLevel: TeamLevel
  latestReport: HalfYearReport | null
  careerSeed: string
  windowIndex: number
}): TransferOffer[] {
  const {
    player,
    currentClubId,
    currentTeamLevel,
    latestReport,
    careerSeed,
    windowIndex,
  } = input

  const candidates = CLUBS.filter(
    (club) => club.id !== currentClubId,
  )
    .map((club) => {
      const estimatedPotential = estimatedPotentialForClub({
        player,
        club,
        careerSeed,
        windowIndex,
      })
      const interestScore = interestForClub({
        player,
        club,
        estimatedPotential,
        latestReport,
        careerSeed,
        windowIndex,
      })
      return { club, estimatedPotential, interestScore }
    })
    .filter((candidate) => candidate.interestScore >= 50)
    .sort(
      (left, right) =>
        right.interestScore - left.interestScore ||
        left.club.tier - right.club.tier,
    )
    .slice(0, 3)

  return candidates.map(
    ({ club, estimatedPotential, interestScore }) => {
      const promise = promisedTeamAndRole({
        player,
        club,
        currentTeamLevel,
        interestScore,
      })
      const random = createRandom(
        careerSeed,
        'transfer-contract',
        windowIndex,
        club.id,
      )
      const annualSalaryEuro = salaryForOffer({
        player,
        role: promise.role,
        teamLevel: promise.teamLevel,
        careerSeed,
        clubId: club.id,
        seedNamespace: `transfer-salary-${windowIndex}`,
      })
      const transferFeeEuro = marketValueEuro({
        player,
        estimatedPotential,
        careerSeed,
        windowIndex,
        clubId: club.id,
      })

      return {
        id: `transfer-${windowIndex}-${club.id}`,
        type: 'DOMESTIC_ACADEMY_TRANSFER',
        clubId: club.id,
        remainingHalfYears: random.int(3, 5) * 2,
        annualSalaryEuro,
        promisedTeamLevel: promise.teamLevel,
        promisedRole: promise.role,
        releaseClauseEuro: roundTo(
          Math.max(transferFeeEuro * 2.4, annualSalaryEuro * 22),
          10_000,
        ),
        clubOptionYears: club.tier <= 3 ? 1 : 0,
        parentClubId: null,
        brokenPromiseWindows: 0,
        transferFeeEuro,
        interestScore,
        estimatedPotential,
        counterUsed: false,
        counterDirection: null,
        negotiationSucceeded: null,
        negotiationMessage: null,
        withdrawn: false,
      } satisfies TransferOffer
    },
  )
}

function promoteRole(
  offer: TransferOffer,
): YouthRole | FirstTeamRole {
  const order =
    offer.promisedTeamLevel === 'FIRST_TEAM'
      ? FIRST_TEAM_ROLE_ORDER
      : YOUTH_ROLE_ORDER
  const currentIndex = order.indexOf(offer.promisedRole as never)
  return order[Math.min(order.length - 1, currentIndex + 1)]!
}

export function canRequestHigherTransferRole(
  offer: TransferOffer,
): boolean {
  return offer.promisedRole !== 'CORE'
}

export function resolveTransferCounter(input: {
  offer: TransferOffer
  direction: CounterOfferDirection
  player: Player
  careerSeed: string
  windowIndex: number
}): TransferOffer {
  const { offer, direction, player, careerSeed, windowIndex } = input
  if (offer.counterUsed) {
    throw new Error('这份报价已经完成过一次反报价。')
  }
  if (offer.withdrawn) {
    throw new Error('这家俱乐部已经撤回报价。')
  }
  if (
    direction === 'ROLE' &&
    !canRequestHigherTransferRole(offer)
  ) {
    throw new Error('当前角色承诺已经达到这个层级的上限。')
  }

  const difficulty = {
    SALARY: 22,
    ROLE: 27,
    RELEASE_CLAUSE: 18,
  }[direction]
  const successChance = clamp(
    offer.interestScore +
      (player.agentRelation - 50) * 0.3 -
      difficulty,
    18,
    88,
  )
  const random = createRandom(
    careerSeed,
    'transfer-counter',
    windowIndex,
    offer.id,
    direction,
  )
  const succeeded = random.next() * 100 < successChance

  if (!succeeded) {
    const withdrawn = random.next() < 0.3
    return {
      ...offer,
      counterUsed: true,
      counterDirection: direction,
      negotiationSucceeded: false,
      negotiationMessage: withdrawn
        ? '俱乐部拒绝条件，并撤回了这份报价。'
        : '俱乐部拒绝条件，但原报价仍然有效。',
      withdrawn,
    }
  }

  const updated: TransferOffer = {
    ...offer,
    counterUsed: true,
    counterDirection: direction,
    negotiationSucceeded: true,
    negotiationMessage: {
      SALARY: '俱乐部接受了加薪要求，并送来最终合同。',
      ROLE: '教练组接受了更高的角色承诺。',
      RELEASE_CLAUSE: '俱乐部同意下调解约金。',
    }[direction],
  }

  if (direction === 'SALARY') {
    updated.annualSalaryEuro = roundTo(
      offer.annualSalaryEuro * 1.16,
      offer.annualSalaryEuro >= 100_000 ? 5_000 : 1_000,
    )
  } else if (direction === 'ROLE') {
    updated.promisedRole = promoteRole(offer)
  } else if (offer.releaseClauseEuro !== null) {
    updated.releaseClauseEuro = roundTo(
      offer.releaseClauseEuro * 0.72,
      10_000,
    )
  }

  return updated
}

export function contractFromTransferOffer(
  offer: TransferOffer,
): ContractState {
  return {
    type: offer.type,
    clubId: offer.clubId,
    remainingHalfYears: offer.remainingHalfYears,
    annualSalaryEuro: offer.annualSalaryEuro,
    promisedTeamLevel: offer.promisedTeamLevel,
    promisedRole: offer.promisedRole,
    releaseClauseEuro: offer.releaseClauseEuro,
    clubOptionYears: offer.clubOptionYears,
    parentClubId: offer.parentClubId,
    brokenPromiseWindows: 0,
  }
}

export function integrationBaseForTransfer(
  player: Player,
): Pick<
  Player,
  'coachRelation' | 'squadRelation' | 'fanRelation' | 'clubAttachment'
> {
  return {
    coachRelation: Math.round(clamp(38 + player.reputation * 0.18, 38, 58)),
    squadRelation: Math.round(clamp(34 + player.reputation * 0.28, 34, 64)),
    fanRelation: Math.round(clamp(30 + player.reputation * 0.34, 30, 66)),
    clubAttachment: 28,
  }
}

export function transferDinnerCost(cashEuro: number): number {
  return Math.min(
    cashEuro,
    roundTo(Math.max(2_000, cashEuro * 0.28), 500),
  )
}

export function applyTransferArrivalChoice(input: {
  player: Player
  choice: TransferArrivalChoice
  cashEuro: number
}): {
  player: Player
  cashEuro: number
  cashSpentEuro: number
} {
  const { player, choice, cashEuro } = input
  const cashSpentEuro =
    choice === 'DINNER' ? transferDinnerCost(cashEuro) : 0
  const next = { ...player }

  if (choice === 'DINNER') {
    next.squadRelation = clamp(next.squadRelation + 12, 0, 100)
    next.morale = clamp(next.morale + 2, 0, 100)
  } else if (choice === 'LEADERS') {
    next.coachRelation = clamp(next.coachRelation + 8, 0, 100)
    next.squadRelation = clamp(next.squadRelation + 4, 0, 100)
  } else if (choice === 'FANS') {
    next.fanRelation = clamp(next.fanRelation + 11, 0, 100)
    next.reputation = clamp(next.reputation + 2, 0, 100)
  } else {
    next.coachRelation = clamp(next.coachRelation - 2, 0, 100)
    next.squadRelation = clamp(next.squadRelation - 2, 0, 100)
  }

  return {
    player: next,
    cashEuro: cashEuro - cashSpentEuro,
    cashSpentEuro,
  }
}
