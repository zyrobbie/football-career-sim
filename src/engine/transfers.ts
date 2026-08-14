import {
  CLUBS,
  DOMESTIC_CLUBS,
  FIRST_TEAM_BENCHMARKS,
  OVERSEAS_CLUBS,
  YOUTH_BENCHMARKS,
  isOverseasClub,
  youthCompetitionTierForClub,
} from '../data/balance'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import type {
  Club,
  ContractState,
  CounterOfferDirection,
  FirstTeamRole,
  HalfYearReport,
  Player,
  SquadRole,
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
import {
  canSignNewContractAtWindow,
  DEMO_WINDOW_COUNT,
  playerAgeAtWindow,
} from './careerTime'

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

const BIG_FIVE_COUNTRIES = new Set([
  '英格兰',
  '西班牙',
  '意大利',
  '德国',
  '法国',
])

const DEVELOPMENT_LEAGUE_COUNTRIES = new Set([
  '荷兰',
  '葡萄牙',
  '比利时',
  '巴西',
  '阿根廷',
  '日本',
  '韩国',
])

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

export interface OverseasInterestAssessment {
  visible: boolean
  club: Club | null
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

export function assessOverseasInterest(input: {
  player: Player
  careerSeed: string
  windowIndex: number
}): OverseasInterestAssessment {
  const { player, careerSeed, windowIndex } = input
  const age = playerAgeAtWindow(windowIndex)
  if (age < 16 || age >= 18 || player.overseasIntent === 'DOMESTIC') {
    return { visible: false, club: null, summary: '' }
  }

  const preferred = OVERSEAS_CLUBS.filter((club) =>
    player.preferredLeagues.includes(club.leagueKey),
  )
  const pool = preferred.length > 0 ? preferred : OVERSEAS_CLUBS
  const club = createRandom(
    careerSeed,
    'underage-overseas-interest',
    windowIndex,
  ).pick(pool)
  return {
    visible: true,
    club,
    summary: `${club.country}的${club.name}已安排球探持续观察你。未满18岁时这只是海外关注，不会生成可签署的国际转会合同。`,
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
    23 +
      (overall -
        YOUTH_BENCHMARKS[youthCompetitionTierForClub(club)]) *
        1.2,
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
  const parameters = getClubParametersByCompatibleId(club.id)
  const youthPreference = playerAgeAtWindow(windowIndex) <= 21
    ? ((parameters?.youthPlayerPreference ?? 50) - 50) * 0.16
    : 0
  const exposure = ((parameters?.exposure ?? 50) - 50) * 0.08

  return Math.round(
    clamp(
      abilityFit +
        positionNeed +
        potential +
        recentPerformance +
        reputation +
        budget + youthPreference + exposure,
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
  playerAge: number
}): {
  teamLevel: TeamLevel
  role: YouthRole | FirstTeamRole
} {
  const {
    player,
    club,
    currentTeamLevel,
    interestScore,
    playerAge,
  } = input
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const firstTeamRole = evaluateFirstTeamRole(player, club)
  if (playerAge >= 22) {
    return { teamLevel: 'FIRST_TEAM', role: firstTeamRole }
  }
  const firstTeamAbilityMargin: Record<Club['tier'], number> = {
    1: 3,
    2: 3,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
  }
  const firstTeamInterestFloor: Record<Club['tier'], number> = {
    1: 74,
    2: 74,
    3: 74,
    4: 68,
    5: 64,
    6: 60,
  }
  const canOfferFirstTeam =
    (currentTeamLevel === 'FIRST_TEAM' ||
      overall >=
        FIRST_TEAM_BENCHMARKS[club.tier] -
          firstTeamAbilityMargin[club.tier]) &&
    interestScore >= firstTeamInterestFloor[club.tier] &&
    firstTeamRole !== 'FRINGE'

  if (canOfferFirstTeam) {
    return { teamLevel: 'FIRST_TEAM', role: firstTeamRole }
  }

  return {
    teamLevel: 'YOUTH',
    role: youthRoleFromDifference(
      calculateYouthSelectionScore(player) -
        YOUTH_BENCHMARKS[youthCompetitionTierForClub(club)],
    ),
  }
}

interface GenerateTransferOffersInput {
  player: Player
  currentClubId: string
  currentTeamLevel: TeamLevel
  latestReport: HalfYearReport | null
  careerSeed: string
  windowIndex: number
}

function overseasInterestAdjustment(player: Player, club: Club): number {
  if (!isOverseasClub(club)) return 0
  const preferenceIndex = player.preferredLeagues.indexOf(club.leagueKey)
  const preferenceBonus =
    preferenceIndex === 0
      ? 12
      : preferenceIndex === 1
        ? 8
        : preferenceIndex === 2
          ? 5
          : -3
  const intentBonus =
    player.overseasIntent === 'STRONG'
      ? 8
      : player.overseasIntent === 'CONDITIONAL'
        ? 2
        : -14
  const eliteBarrier = club.tier <= 1 ? -6 : club.tier === 2 ? -3 : 0
  return preferenceBonus + intentBonus + eliteBarrier
}

function qualifiesForAdultMarket(player: Player, club: Club): boolean {
  const parameters = getClubParametersByCompatibleId(club.id)
  const tier = parameters?.platformTier ?? club.tier
  const divisionLevel = parameters?.divisionLevel ?? 1
  const overall = calculateOverall(player.attributes, player.primaryPosition)
  const domesticException = player.overseasIntent === 'DOMESTIC' && club.country === '中国' && divisionLevel === 1 && tier === 4
  if (overall >= 85) return (divisionLevel === 1 && tier <= 3 && club.country !== '中国') || domesticException
  if (overall >= 80) return divisionLevel === 1 && tier <= 4 && (club.country !== '中国' || player.overseasIntent === 'DOMESTIC')
  if (overall >= 74) return (divisionLevel === 1 && tier <= 5) || (divisionLevel === 2 && tier === 4)
  if (overall >= 66) return tier >= 3 && tier <= 6
  return true
}

export function careerPreferenceFit(input: {
  player: Player
  club: Club
  promisedTeamLevel: TeamLevel
  promisedRole: YouthRole | FirstTeamRole
}): number {
  const { player, club, promisedTeamLevel, promisedRole } = input
  const roleIndex =
    promisedTeamLevel === 'FIRST_TEAM'
      ? FIRST_TEAM_ROLE_ORDER.indexOf(promisedRole as FirstTeamRole)
      : YOUTH_ROLE_ORDER.indexOf(promisedRole as YouthRole)
  const roleMaximum = promisedTeamLevel === 'FIRST_TEAM' ? 4 : 2
  const playingTime = clamp(
    20 + (Math.max(0, roleIndex) / roleMaximum) * 80,
    20,
    100,
  )
  const competitiveLevel = clamp(105 - club.tier * 14, 20, 95)
  const salaryPotential = clamp(
    competitiveLevel * 0.72 + playingTime * 0.28,
    20,
    100,
  )
  const leaguePreferred = player.preferredLeagues.includes(club.leagueKey)
  const locationFit = isOverseasClub(club)
    ? player.overseasIntent === 'STRONG'
      ? 82
      : player.overseasIntent === 'CONDITIONAL'
        ? 68
        : 42
    : player.overseasIntent === 'DOMESTIC'
      ? 88
      : 66
  const stability = clamp(
    locationFit + (leaguePreferred ? 10 : 0) + (club.profile === 'ELITE' ? 3 : 0),
    25,
    100,
  )
  const factors = {
    PLAYING_TIME: playingTime,
    COMPETITIVE_LEVEL: competitiveLevel,
    SALARY: salaryPotential,
    STABILITY: stability,
  }
  const totalWeight = Object.values(player.priorityValues).reduce(
    (total, value) => total + value,
    0,
  )
  return Math.round(
    Object.entries(player.priorityValues).reduce(
      (total, [priority, weight]) =>
        total + factors[priority as keyof typeof factors] * weight,
      0,
    ) / totalWeight,
  )
}

function generateTransferOffersFromPool(
  input: GenerateTransferOffersInput,
  domesticOnly: boolean,
): TransferOffer[] {
  const {
    player,
    currentClubId,
    currentTeamLevel,
    latestReport,
    careerSeed,
    windowIndex,
  } = input

  if (!canSignNewContractAtWindow(windowIndex)) return []

  const playerAge = playerAgeAtWindow(windowIndex)
  const clubPool =
    domesticOnly || playerAge < 18 ? DOMESTIC_CLUBS : CLUBS
  const candidates = clubPool.filter(
    (club) => club.id !== currentClubId,
  )
    .map((club) => {
      const estimatedPotential = estimatedPotentialForClub({
        player,
        club,
        careerSeed,
        windowIndex,
      })
      const baseInterestScore = interestForClub({
        player,
        club,
        estimatedPotential,
        latestReport,
        careerSeed,
        windowIndex,
      })
      const interestScore = Math.round(
        clamp(
          baseInterestScore + overseasInterestAdjustment(player, club),
          0,
          100,
        ),
      )
      const promise = promisedTeamAndRole({
        player,
        club,
        currentTeamLevel,
        interestScore,
        playerAge,
      })
      return {
        club,
        estimatedPotential,
        interestScore,
        promise,
        preferenceFit: careerPreferenceFit({
          player,
          club,
          promisedTeamLevel: promise.teamLevel,
          promisedRole: promise.role,
        }),
      }
    })

  const selectedCandidates = (() => {
    const selected: typeof candidates = []
    const pickWeighted = (pool: typeof candidates, slot: string) => {
      const available = pool.filter((candidate) => !selected.some((item) => item.club.id === candidate.club.id))
      const weightFor = (candidate: (typeof candidates)[number]) => {
        const preference = player.preferredLeagues[0] === candidate.club.leagueKey ? 1.28 : 1
        const rotation = createRandom(careerSeed, 'transfer-market-rotation', windowIndex, candidate.club.id).float(0.65, 1.35)
        return Math.max(1, (candidate.interestScore * 0.65 + candidate.preferenceFit * 0.35) * preference * rotation)
      }
      const total = available.reduce((sum, candidate) => sum + weightFor(candidate), 0)
      if (total === 0) return undefined
      let cursor = createRandom(careerSeed, 'transfer-market-slot', windowIndex, slot).float(0, total)
      for (const candidate of available) {
        cursor -= weightFor(candidate)
        if (cursor <= 0) return candidate
      }
      return available[available.length - 1]
    }
    const addCandidate = (
      candidate: (typeof candidates)[number] | undefined,
    ) => {
      if (
        candidate &&
        !selected.some((item) => item.club.id === candidate.club.id)
      ) {
        selected.push(candidate)
      }
    }

    const currentClub = CLUBS.find(
      (club) => club.id === currentClubId,
    )
    const actualTeamLevel =
      latestReport?.contract?.actualTeamLevel ?? currentTeamLevel
    const actualRole =
      latestReport?.contract?.actualRole ?? latestReport?.roleAfter
    const currentFirstTeamRole =
      actualTeamLevel === 'FIRST_TEAM' &&
      actualRole &&
      FIRST_TEAM_ROLE_ORDER.includes(actualRole as FirstTeamRole)
        ? (actualRole as FirstTeamRole)
        : null
    const currentRoleIndex = currentFirstTeamRole
      ? FIRST_TEAM_ROLE_ORDER.indexOf(currentFirstTeamRole)
      : -1
    const improvesFirstTeamRole = (
      candidate: (typeof candidates)[number],
    ) =>
      candidate.promise.teamLevel === 'FIRST_TEAM' &&
      FIRST_TEAM_ROLE_ORDER.indexOf(
        candidate.promise.role as FirstTeamRole,
      ) > currentRoleIndex
    const strugglingAtEliteOverseas = Boolean(
      !domesticOnly &&
        currentClub &&
        isOverseasClub(currentClub) &&
        currentClub.tier <= 2 &&
        actualTeamLevel === 'FIRST_TEAM' &&
        (currentFirstTeamRole === 'FRINGE' ||
          (currentFirstTeamRole === 'SUBSTITUTE' &&
            (latestReport?.stats.appearances ?? 0) <= 5)),
    )

    if (strugglingAtEliteOverseas) {
      const roleImprovingCandidates = candidates.filter(
        improvesFirstTeamRole,
      )
      const firstTier = roleImprovingCandidates.filter(
        (candidate) => BIG_FIVE_COUNTRIES.has(candidate.club.country) && candidate.club.tier >= 3,
      )
      const secondTier = roleImprovingCandidates.filter(
        (candidate) => DEVELOPMENT_LEAGUE_COUNTRIES.has(candidate.club.country) && candidate.club.tier >= 3,
      )
      const thirdTier = roleImprovingCandidates.filter(
        (candidate) => candidate.club.country === '中国' && candidate.club.profile === 'ELITE',
      )
      addCandidate(pickWeighted(firstTier, 'recovery-big-five') ?? pickWeighted(roleImprovingCandidates, 'recovery-big-five-fallback'))
      addCandidate(pickWeighted(secondTier, 'recovery-development') ?? pickWeighted(roleImprovingCandidates, 'recovery-development-fallback'))
      addCandidate(pickWeighted(thirdTier, 'recovery-domestic') ?? pickWeighted(roleImprovingCandidates, 'recovery-domestic-fallback'))
      for (let slot = selected.length; slot < 3; slot += 1) {
        addCandidate(pickWeighted(roleImprovingCandidates, `recovery-fill-${slot}`))
      }
      return selected.slice(0, 3)
    }

    if (!domesticOnly && playerAge >= 18) {
      const eligible = candidates.filter((candidate) => qualifiesForAdultMarket(player, candidate.club))
      if (player.overseasIntent === 'DOMESTIC') {
        const domestic = eligible.filter((candidate) => candidate.club.country === '中国')
        const overseas = eligible.filter((candidate) => candidate.club.country !== '中国')
        addCandidate(pickWeighted(domestic, 'adult-domestic-one'))
        addCandidate(pickWeighted(domestic, 'adult-domestic-two'))
        addCandidate(pickWeighted(overseas, 'adult-domestic-overseas'))
        for (let slot = selected.length; slot < 3; slot += 1) addCandidate(pickWeighted(domestic.length > 0 ? domestic : overseas, `adult-domestic-fill-${slot}`))
        return selected.slice(0, 3)
      }
      const firstPreference = player.preferredLeagues[0]
      const preferred = eligible.filter((candidate) => candidate.club.leagueKey === firstPreference)
      const otherLeagues = eligible.filter((candidate) => candidate.club.leagueKey !== firstPreference)
      const worldClass = calculateOverall(player.attributes, player.primaryPosition) >= 85
      const highPlatform = eligible.filter((candidate) => candidate.club.tier <= 2)
      const preferredHigh = preferred.filter((candidate) => candidate.club.tier <= 2)
      const otherHigh = otherLeagues.filter((candidate) => candidate.club.tier <= 2)
      addCandidate(pickWeighted(worldClass && preferredHigh.length > 0 ? preferredHigh : preferred.length > 0 ? preferred : eligible, 'adult-preferred'))
      addCandidate(pickWeighted(worldClass && otherHigh.length > 0 ? otherHigh : otherLeagues.length > 0 ? otherLeagues : eligible, 'adult-other-league'))
      if (worldClass && selected.filter((candidate) => candidate.club.tier <= 2).length < 2) addCandidate(pickWeighted(highPlatform, 'adult-world-second-high'))
      addCandidate(pickWeighted(eligible, 'adult-open'))
      for (let slot = selected.length; slot < 3; slot += 1) addCandidate(pickWeighted(eligible, `adult-fill-${slot}`))
      return selected.slice(0, 3)
    }

    addCandidate(pickWeighted(candidates.filter((candidate) => !isOverseasClub(candidate.club)), 'domestic'))
    const marketMix = createRandom(
      careerSeed,
      'transfer-market-composition',
      windowIndex,
    ).float(0, 1)
    const strongAcademyYouth = pickWeighted(candidates.filter(
      (candidate) =>
        !isOverseasClub(candidate.club) &&
        candidate.club.academyTier <= 3 &&
        candidate.promise.teamLevel === 'YOUTH',
    ), 'academy')
    const lowerLeagueFirstTeam = pickWeighted(candidates.filter(
      (candidate) =>
        !isOverseasClub(candidate.club) &&
        candidate.club.tier >= 5 &&
        candidate.promise.teamLevel === 'FIRST_TEAM',
    ), 'first-team')

    if (marketMix < 0.65 && strongAcademyYouth) {
      addCandidate(strongAcademyYouth)
    }
    if (marketMix < 0.65 && lowerLeagueFirstTeam) {
      addCandidate(lowerLeagueFirstTeam)
    }

    for (let slot = selected.length; slot < 3; slot += 1) {
      if (selected.length >= 3) break
      addCandidate(pickWeighted(candidates, `fill-${slot}`))
    }

    return selected.slice(0, 3)
  })()

  return selectedCandidates.map(
    ({ club, estimatedPotential, interestScore, promise }) => {
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
        type: isOverseasClub(club)
          ? 'PERMANENT_TRANSFER'
          : 'DOMESTIC_ACADEMY_TRANSFER',
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

export function generateDomesticTransferOffers(
  input: GenerateTransferOffersInput,
): TransferOffer[] {
  return generateTransferOffersFromPool(input, true)
}

export function generateTransferOffers(
  input: GenerateTransferOffersInput,
): TransferOffer[] {
  return generateTransferOffersFromPool(input, false)
}

export function generateContractExpiryOffers(input: {
  player: Player
  currentClubId: string
  currentTeamLevel: TeamLevel
  currentRole: SquadRole
  currentContract: ContractState
  latestReport: HalfYearReport | null
  careerSeed: string
  windowIndex: number
}): TransferOffer[] {
  const {
    player,
    currentClubId,
    currentTeamLevel,
    currentRole,
    currentContract,
    latestReport,
    careerSeed,
    windowIndex,
  } = input
  if (!canSignNewContractAtWindow(windowIndex)) return []
  const currentClub = CLUBS.find((club) => club.id === currentClubId)
  if (!currentClub) return []

  const renewalPromise =
    playerAgeAtWindow(windowIndex) >= 22
      ? promisedTeamAndRole({
          player,
          club: currentClub,
          currentTeamLevel,
          interestScore: 100,
          playerAge: playerAgeAtWindow(windowIndex),
        })
      : { teamLevel: currentTeamLevel, role: currentRole }

  const random = createRandom(
    careerSeed,
    'contract-expiry-renewal',
    windowIndex,
    currentClubId,
  )
  const marketSalary = salaryForOffer({
    player,
    role: renewalPromise.role,
    teamLevel: renewalPromise.teamLevel,
    careerSeed,
    clubId: currentClubId,
    seedNamespace: `renewal-salary-${windowIndex}`,
  })
  const renewalSalary = roundTo(
    Math.max(
      currentContract.annualSalaryEuro,
      marketSalary,
    ) * random.float(1, 1.12),
    Math.max(currentContract.annualSalaryEuro, marketSalary) >= 100_000
      ? 5_000
      : 1_000,
  )
  const renewal: TransferOffer = {
    id: `renewal-${windowIndex}-${currentClubId}`,
    type: 'RENEWAL',
    clubId: currentClubId,
    remainingHalfYears: random.int(2, 4) * 2,
    annualSalaryEuro: renewalSalary,
    promisedTeamLevel: renewalPromise.teamLevel,
    promisedRole: renewalPromise.role,
    releaseClauseEuro: roundTo(renewalSalary * 24, 10_000),
    clubOptionYears: currentClub.tier <= 3 ? 1 : 0,
    parentClubId: null,
    brokenPromiseWindows: 0,
    transferFeeEuro: 0,
    interestScore: 100,
    estimatedPotential: Math.round(
      calculateOverall(player.potentials, player.primaryPosition),
    ),
    counterUsed: false,
    counterDirection: null,
    negotiationSucceeded: null,
    negotiationMessage: null,
    withdrawn: false,
  }
  const freeAgentOffers = generateTransferOffers({
    player,
    currentClubId,
    currentTeamLevel,
    latestReport,
    careerSeed,
    windowIndex,
  })
    .slice(0, 3)
    .map((offer) => ({
      ...offer,
      id: `free-${windowIndex}-${offer.clubId}`,
      type: 'FREE_TRANSFER' as const,
      transferFeeEuro: 0,
    }))

  return [renewal, ...freeAgentOffers]
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
    const withdrawn = offer.type !== 'RENEWAL' && random.next() < 0.3
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
  club: Club,
): Pick<
  Player,
  'coachRelation' | 'squadRelation' | 'fanRelation' | 'clubAttachment'
> {
  const platformPenalty = {
    1: 22,
    2: 16,
    3: 10,
    4: 4,
    5: -2,
    6: -8,
  }[club.tier]
  const overseasAdjustment = isOverseasClub(club) ? 4 : 0
  const preferenceRelief = player.preferredLeagues.includes(
    club.leagueKey,
  )
    ? 2
    : 0
  const integrationPenalty =
    platformPenalty + overseasAdjustment - preferenceRelief

  return {
    coachRelation: Math.round(
      clamp(46 + player.reputation * 0.18 - integrationPenalty, 20, 62),
    ),
    squadRelation: Math.round(
      clamp(43 + player.reputation * 0.28 - integrationPenalty, 20, 68),
    ),
    fanRelation: Math.round(
      clamp(
        38 +
          player.reputation * 0.34 -
          Math.max(0, integrationPenalty * 0.5),
        24,
        70,
      ),
    ),
    clubAttachment:
      isOverseasClub(club) && club.tier <= 1
        ? 18
        : isOverseasClub(club)
          ? 24
          : 28,
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
