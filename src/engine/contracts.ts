import { FIRST_TEAM_BENCHMARKS } from '../data/balance'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import type {
  Club,
  ContractState,
  CounterOfferDirection,
  FirstTeamProgress,
  FirstTeamRole,
  Player,
  ProfessionalContractOffer,
  TeamLevel,
  YouthRole,
} from '../models/game'
import { calculateOverall } from './player'
import { createRandom } from './random'

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

const ROLE_WAGE_MULTIPLIER: Record<
  FirstTeamRole | YouthRole,
  number
> = {
  FRINGE: 0.4,
  SUBSTITUTE: 0.65,
  ROTATION: 1,
  STARTER: 1.5,
  CORE: 2.3,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value: number, unit: number): number {
  return Math.max(unit, Math.round(value / unit) * unit)
}

function baseSalaryForOverall(overall: number): number {
  if (overall >= 90) return 4_000_000
  if (overall >= 80) return 2_000_000
  if (overall >= 70) return 900_000
  if (overall >= 60) return 400_000
  if (overall >= 50) return 180_000
  if (overall >= 40) return 80_000
  return 30_000
}

export function evaluateFirstTeamRole(
  player: Player,
  club: Club,
): FirstTeamRole {
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const selectionScore =
    overall +
    (player.form - 50) * 0.06 +
    (player.coachRelation - 50) * 0.04 +
    (player.morale - 50) * 0.02
  const threshold = getClubParametersByCompatibleId(club.id)?.firstTeamThreshold ?? FIRST_TEAM_BENCHMARKS[club.tier]
  const difference = selectionScore - threshold

  if (difference >= 7) return 'CORE'
  if (difference >= 3) return 'STARTER'
  if (difference >= -1) return 'ROTATION'
  if (difference >= -5) return 'SUBSTITUTE'
  return 'FRINGE'
}

export function salaryForOffer(input: {
  player: Player
  role: YouthRole | FirstTeamRole
  teamLevel: TeamLevel
  careerSeed: string
  clubId: string
  seedNamespace?: string
}): number {
  const {
    player,
    role,
    teamLevel,
    careerSeed,
    clubId,
    seedNamespace = 'first-professional-salary',
  } = input
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const reputationMultiplier = 0.75 + player.reputation * 0.005
  const seedMultiplier = createRandom(
    careerSeed,
    seedNamespace,
    clubId,
  ).float(0.9, 1.1)
  const youthMultiplier =
    teamLevel === 'YOUTH'
      ? role === 'CORE'
        ? 0.45
        : role === 'STARTER'
          ? 0.32
          : 0.22
      : 1
  const wage = getClubParametersByCompatibleId(clubId)?.wage
  const clubWageMultiplier = wage === undefined ? 1 : 0.62 + wage * 0.008
  const salary =
    baseSalaryForOverall(overall) *
    ROLE_WAGE_MULTIPLIER[role] *
    reputationMultiplier *
    seedMultiplier *
    youthMultiplier * clubWageMultiplier

  return roundTo(salary, salary >= 100_000 ? 5_000 : 1_000)
}

export function generateFirstProfessionalOffer(input: {
  player: Player
  club: Club
  youthRole: YouthRole
  teamLevel: TeamLevel
  firstTeamProgress: FirstTeamProgress
  careerSeed: string
}): ProfessionalContractOffer {
  const {
    player,
    club,
    youthRole,
    teamLevel,
    firstTeamProgress,
    careerSeed,
  } = input
  const promisedTeamLevel =
    teamLevel === 'FIRST_TEAM' ||
    firstTeamProgress.status === 'PROMOTED'
      ? 'FIRST_TEAM'
      : 'YOUTH'
  const promisedRole =
    promisedTeamLevel === 'FIRST_TEAM'
      ? evaluateFirstTeamRole(player, club)
      : youthRole
  const annualSalaryEuro = salaryForOffer({
    player,
    role: promisedRole,
    teamLevel: promisedTeamLevel,
    careerSeed,
    clubId: club.id,
  })
  const random = createRandom(
    careerSeed,
    'first-professional-contract',
    club.id,
  )
  const years = random.int(3, 5)
  const releaseClauseEuro = roundTo(
    annualSalaryEuro * random.int(22, 30),
    10_000,
  )

  return {
    id: `first-pro-${careerSeed.slice(0, 10)}-${club.id}`,
    type: 'FIRST_PRO',
    clubId: club.id,
    remainingHalfYears: years * 2,
    annualSalaryEuro,
    promisedTeamLevel,
    promisedRole,
    releaseClauseEuro,
    clubOptionYears: club.tier <= 3 ? 1 : 0,
    parentClubId: null,
    brokenPromiseWindows: 0,
    counterUsed: false,
    counterDirection: null,
    negotiationSucceeded: null,
    negotiationMessage: null,
  }
}

function promoteRole(
  offer: ProfessionalContractOffer,
): YouthRole | FirstTeamRole {
  const order =
    offer.promisedTeamLevel === 'FIRST_TEAM'
      ? FIRST_TEAM_ROLE_ORDER
      : YOUTH_ROLE_ORDER
  const currentIndex = order.indexOf(offer.promisedRole as never)
  return order[Math.min(order.length - 1, currentIndex + 1)]!
}

export function canRequestHigherRole(
  offer: ProfessionalContractOffer,
): boolean {
  const highest =
    offer.promisedTeamLevel === 'FIRST_TEAM' ? 'CORE' : 'CORE'
  return offer.promisedRole !== highest
}

export function resolveFirstContractCounter(input: {
  offer: ProfessionalContractOffer
  direction: CounterOfferDirection
  player: Player
  careerSeed: string
}): ProfessionalContractOffer {
  const { offer, direction, player, careerSeed } = input
  if (offer.counterUsed) {
    throw new Error('这份报价已经完成过一次反报价。')
  }
  if (direction === 'ROLE' && !canRequestHigherRole(offer)) {
    throw new Error('当前角色承诺已经达到这个层级的上限。')
  }

  const difficulty = {
    SALARY: 20,
    ROLE: 25,
    RELEASE_CLAUSE: 16,
  }[direction]
  const clubInterest = clamp(
    62 +
      player.reputation * 0.35 +
      (player.coachRelation - 50) * 0.18,
    45,
    82,
  )
  const successChance = clamp(
    clubInterest + (player.agentRelation - 50) * 0.3 - difficulty,
    20,
    90,
  )
  const roll =
    createRandom(
      careerSeed,
      'first-professional-counter',
      offer.id,
      direction,
    ).next() * 100
  const succeeded = roll < successChance

  if (!succeeded) {
    return {
      ...offer,
      counterUsed: true,
      counterDirection: direction,
      negotiationSucceeded: false,
      negotiationMessage:
        '俱乐部没有接受你的条件，但原报价仍然有效。',
    }
  }

  const updated: ProfessionalContractOffer = {
    ...offer,
    counterUsed: true,
    counterDirection: direction,
    negotiationSucceeded: true,
    negotiationMessage: {
      SALARY: '俱乐部接受了加薪要求，并送来了更新后的合同。',
      ROLE: '教练组同意提高角色承诺，但你的竞争压力也会更大。',
      RELEASE_CLAUSE: '俱乐部同意降低解约金，给未来转会留出了更多空间。',
    }[direction],
  }

  if (direction === 'SALARY') {
    updated.annualSalaryEuro = roundTo(
      offer.annualSalaryEuro * 1.18,
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

export function contractFromOffer(
  offer: ProfessionalContractOffer,
): ContractState {
  const {
    id: _id,
    counterUsed: _counterUsed,
    counterDirection: _counterDirection,
    negotiationSucceeded: _negotiationSucceeded,
    negotiationMessage: _negotiationMessage,
    ...contract
  } = offer
  return contract
}
