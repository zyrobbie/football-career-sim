import {
  ACADEMY_SCORES,
  BASE_RATES,
  COACH_BASE_SCORES,
  FACILITY_SCORES,
  FIRST_TEAM_BENCHMARKS,
  POSITION_WEIGHTS,
} from '../data/balance'
import {
  attributeKeys,
  type AcademyOffer,
  type AttributeKey,
  type Attributes,
  type ContractState,
  type DevelopmentApproach,
  type FirstTeamRole,
  type GameState,
  type HalfYearReport,
  type HalfYearStats,
  type Player,
  type SquadRole,
  type TeamLevel,
  type TrainingFocus,
  type YouthRole,
} from '../models/game'
import { careerWindowLabel } from './careerTime'
import { evaluateFirstTeamRole } from './contracts'
import {
  cashReserveLimit,
  halfYearDisposableIncome,
} from './finance'
import { calculateOverall } from './player'
import { createRandom, poisson } from './random'
import { simulateHalfYear } from './simulateHalfYear'

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

const APPEARANCE_RANGES: Record<
  FirstTeamRole,
  readonly [number, number]
> = {
  FRINGE: [0.05, 0.2],
  SUBSTITUTE: [0.2, 0.4],
  ROTATION: [0.4, 0.65],
  STARTER: [0.65, 0.9],
  CORE: [0.8, 0.95],
}

const START_RANGES: Record<FirstTeamRole, readonly [number, number]> = {
  FRINGE: [0, 0.1],
  SUBSTITUTE: [0.15, 0.35],
  ROTATION: [0.45, 0.65],
  STARTER: [0.75, 0.9],
  CORE: [0.85, 0.95],
}

const ROLE_EXPOSURE: Record<FirstTeamRole, number> = {
  FRINGE: 20,
  SUBSTITUTE: 38,
  ROTATION: 60,
  STARTER: 82,
  CORE: 94,
}

const TEAM_ATTACK_FACTOR: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 1.15,
  2: 1.08,
  3: 1.03,
  4: 0.99,
  5: 0.95,
  6: 0.91,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function numericChange(before: number, after: number) {
  return {
    before: roundTenth(before),
    after: roundTenth(after),
    delta: roundTenth(after - before),
  }
}

function stateModifier(player: Player): number {
  return clamp(
    1 +
      (player.form - 50) * 0.003 +
      (player.fitness - 50) * 0.002 +
      (player.morale - 50) * 0.002,
    0.75,
    1.25,
  )
}

function performanceIndex(rating: number): number {
  if (rating <= 5.7) return 20
  if (rating <= 6.1) return 35
  if (rating <= 6.5) return 50
  if (rating <= 6.9) return 62
  if (rating <= 7.3) return 75
  if (rating <= 7.7) return 86
  return 95
}

function trainingShares(
  position: Player['primaryPosition'],
  focus: TrainingFocus,
): Attributes {
  const weights = POSITION_WEIGHTS[position]
  if (focus === 'BALANCED' || focus === 'ADAPTATION') return { ...weights }
  return Object.fromEntries(
    attributeKeys.map((key) => [
      key,
      weights[key] * 0.75 + (key === focus ? 0.25 : 0),
    ]),
  ) as unknown as Attributes
}

function gapFactor(gap: number): number {
  if (gap >= 25) return 1
  if (gap >= 15) return 0.8
  if (gap >= 8) return 0.55
  if (gap >= 3) return 0.25
  if (gap > 0) return 0.08
  return 0
}

function roleStepToward(
  current: FirstTeamRole,
  target: FirstTeamRole,
): FirstTeamRole {
  const currentIndex = FIRST_TEAM_ROLE_ORDER.indexOf(current)
  const targetIndex = FIRST_TEAM_ROLE_ORDER.indexOf(target)
  if (currentIndex === targetIndex) return current
  return FIRST_TEAM_ROLE_ORDER[
    currentIndex + (targetIndex > currentIndex ? 1 : -1)
  ] as FirstTeamRole
}

function prepareProfessionalWindow(
  player: Player,
  approach: DevelopmentApproach | null,
): { player: Player; trainingBonus: number; summary: string } {
  const next = structuredClone(player)
  const needsSupport =
    next.form < 46 || next.fitness < 46 || next.morale < 46

  if (needsSupport) {
    if (next.form < 46) next.form = clamp(next.form + 7, 0, 100)
    if (next.fitness < 46) next.fitness = clamp(next.fitness + 10, 0, 100)
    if (next.morale < 46) next.morale = clamp(next.morale + 8, 0, 100)
    return {
      player: next,
      trainingBonus: 0,
      summary:
        '职业队为你安排了恢复训练、体能监测和心理沟通，避免低迷状态持续恶化。',
    }
  }

  if (approach === 'PUSH') {
    next.coachRelation = clamp(next.coachRelation + 3, 0, 100)
    next.fitness = clamp(next.fitness - 3, 0, 100)
    return {
      player: next,
      trainingBonus: 1,
      summary:
        '你主动向教练争取更多正式比赛机会，训练投入得到认可，但身体负荷也随之增加。',
    }
  }

  if (approach === 'TEAM_FIRST') {
    next.squadRelation = clamp(next.squadRelation + 4, 0, 100)
    next.morale = clamp(next.morale + 2, 0, 100)
    return {
      player: next,
      trainingBonus: 0,
      summary:
        '你接受球队的阶段性安排，把团队需要放在个人出场诉求之前，更衣室更愿意接纳你。',
    }
  }

  next.form = clamp(next.form + 2, 0, 100)
  next.fitness = clamp(next.fitness + 1, 0, 100)
  return {
    player: next,
    trainingBonus: 0,
    summary:
      '你选择先适应职业队节奏，在训练强度、比赛准备和身体恢复之间保持平衡。',
  }
}

function simulateFirstTeamStats(input: {
  player: Player
  offer: AcademyOffer
  role: FirstTeamRole
  seed: string
}): {
  stats: HalfYearStats
  injury: HalfYearReport['injury']
} {
  const { player, offer, role, seed } = input
  const random = createRandom(seed, 'professional-appearances')
  const injuryRandom = createRandom(seed, 'professional-injury')
  const totalMatches = 18
  const [appearanceMin, appearanceMax] = APPEARANCE_RANGES[role]
  const [startMin, startMax] = START_RANGES[role]
  const injuryRisk = clamp(
    0.04 +
      (50 - player.fitness) * 0.001 +
      (45 - player.attributes.physical) * 0.0005,
    0.03,
    0.12,
  )
  const hasInjury = injuryRandom.next() < injuryRisk
  const injuryWeeks = hasInjury ? injuryRandom.int(2, 7) : 0
  const availability = hasInjury
    ? clamp(1 - injuryWeeks / 26, 0.68, 1)
    : 1
  const appearances = Math.max(
    role === 'FRINGE' ? 0 : 1,
    Math.round(
      totalMatches *
        random.float(appearanceMin, appearanceMax) *
        availability,
    ),
  )
  const starts = Math.min(
    appearances,
    Math.round(appearances * random.float(startMin, startMax)),
  )
  const substituteAppearances = appearances - starts
  const minutes = Math.round(
    starts * (65 + player.fitness * 0.25) +
      substituteAppearances * (10 + player.fitness * 0.25),
  )
  const rates = BASE_RATES[player.primaryPosition]
  const matchState = stateModifier(player)
  const attackFactor =
    0.45 +
    player.attributes.attack * 0.006 +
    player.attributes.physical * 0.0025 +
    player.attributes.mental * 0.002
  const assistFactor =
    0.5 +
    player.attributes.attack * 0.0065 +
    player.attributes.physical * 0.001 +
    player.attributes.mental * 0.0025
  const teamFactor = TEAM_ATTACK_FACTOR[offer.club.tier]
  const goalExpected =
    (minutes / 90) *
    rates.goals *
    attackFactor *
    teamFactor *
    matchState
  const assistExpected =
    (minutes / 90) *
    rates.assists *
    assistFactor *
    teamFactor *
    matchState
  const dataRandom = createRandom(seed, 'professional-performance')
  const goals = poisson(dataRandom, goalExpected)
  const assists = poisson(dataRandom, assistExpected)
  const disciplineFactor = 1.25 - player.attributes.mental * 0.005
  const yellowCards = poisson(
    dataRandom,
    (minutes / 90) * rates.yellow * disciplineFactor,
  )
  const redCards = poisson(
    dataRandom,
    (minutes / 90) * rates.red * disciplineFactor,
  )
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const abilityFit = clamp(
    (overall - FIRST_TEAM_BENCHMARKS[offer.club.tier]) * 0.06,
    -0.6,
    0.6,
  )
  const stateEffect = clamp((matchState - 1) * 2, -0.4, 0.4)
  const dataEffect = clamp(
    (goals + assists - goalExpected - assistExpected) * 0.08,
    -0.15,
    0.15,
  )
  const ratingRandom = createRandom(seed, 'professional-rating')
  const averageRating = roundTenth(
    clamp(
      6.5 +
        abilityFit +
        stateEffect +
        dataEffect +
        ratingRandom.float(-0.15, 0.15),
      5.5,
      8.5,
    ),
  )

  return {
    stats: {
      appearances,
      starts,
      minutes,
      goals,
      assists,
      yellowCards,
      redCards,
      averageRating,
    },
    injury: hasInjury
      ? {
          category: injuryRandom.pick([
            'MUSCLE',
            'ANKLE',
            'FOOT',
            'OTHER',
          ] as const),
          weeks: injuryWeeks,
        }
      : null,
  }
}

function growFirstTeamAttributes(input: {
  player: Player
  offer: AcademyOffer
  role: FirstTeamRole
  focus: TrainingFocus
  trainingBonus: number
  seed: string
}): Attributes {
  const { player, offer, role, focus, trainingBonus, seed } = input
  const effectiveCoach = Math.min(
    100,
    COACH_BASE_SCORES[offer.club.tier] *
      (0.85 + player.coachRelation * 0.003),
  )
  const trainingQuality =
    FACILITY_SCORES[offer.club.facilityTier] * 0.45 +
    ACADEMY_SCORES[offer.club.academyTier] * 0.1 +
    effectiveCoach * 0.45 +
    trainingBonus
  const developmentIndex =
    trainingQuality * 0.5 +
    ROLE_EXPOSURE[role] * 0.22 +
    player.squadRelation * 0.08 +
    player.fitness * 0.12 +
    player.morale * 0.08
  const multiplier =
    clamp(0.55 + developmentIndex / 120, 0.7, 1.35) *
    (focus === 'ADAPTATION' ? 0.9 : 1)
  const shares = trainingShares(player.primaryPosition, focus)
  const random = createRandom(seed, 'professional-growth')

  return Object.fromEntries(
    attributeKeys.map((key) => {
      const gap = player.potentials[key] - player.attributes[key]
      const growth =
        5.5 *
        multiplier *
        shares[key] *
        gapFactor(gap) *
        random.float(0.9, 1.1)
      return [
        key,
        roundTenth(
          Math.min(player.potentials[key], player.attributes[key] + growth),
        ),
      ]
    }),
  ) as unknown as Attributes
}

function promiseFulfilled(
  contract: ContractState,
  actualTeamLevel: TeamLevel,
  actualRole: SquadRole,
): boolean {
  if (
    contract.promisedTeamLevel === 'YOUTH' &&
    actualTeamLevel === 'FIRST_TEAM'
  ) {
    return true
  }
  if (contract.promisedTeamLevel !== actualTeamLevel) return false
  if (!contract.promisedRole) return true
  const order =
    actualTeamLevel === 'FIRST_TEAM'
      ? FIRST_TEAM_ROLE_ORDER
      : YOUTH_ROLE_ORDER
  return (
    order.indexOf(actualRole as never) >=
    order.indexOf(contract.promisedRole as never)
  )
}

function settleContract(input: {
  contract: ContractState
  actualTeamLevel: TeamLevel
  actualRole: SquadRole
  cashBeforeEuro: number
}): {
  contract: ContractState
  incomeEuro: number
  cashAfterEuro: number
  promiseFulfilled: boolean
} {
  const { contract, actualTeamLevel, actualRole, cashBeforeEuro } = input
  const fulfilled = promiseFulfilled(
    contract,
    actualTeamLevel,
    actualRole,
  )
  const availableIncome = halfYearDisposableIncome(
    contract.annualSalaryEuro,
  )
  const reserveLimit = cashReserveLimit(contract.annualSalaryEuro)
  const cashAfterEuro = Math.min(
    cashBeforeEuro + availableIncome,
    Math.max(cashBeforeEuro, reserveLimit),
  )
  return {
    contract: {
      ...contract,
      remainingHalfYears: Math.max(0, contract.remainingHalfYears - 1),
      brokenPromiseWindows: fulfilled
        ? 0
        : contract.brokenPromiseWindows + 1,
    },
    incomeEuro: cashAfterEuro - cashBeforeEuro,
    cashAfterEuro,
    promiseFulfilled: fulfilled,
  }
}

function attachContractReport(input: {
  report: HalfYearReport
  contractBefore: ContractState
  contractAfter: ContractState
  actualTeamLevel: TeamLevel
  actualRole: SquadRole
  incomeEuro: number
  cashAfterEuro: number
  promiseFulfilled: boolean
}): HalfYearReport {
  const {
    report,
    contractBefore,
    contractAfter,
    actualTeamLevel,
    actualRole,
    incomeEuro,
    cashAfterEuro,
    promiseFulfilled: fulfilled,
  } = input
  const promiseHint = fulfilled
    ? '俱乐部本窗口兑现了合同中的球队层级与角色承诺。'
    : contractAfter.brokenPromiseWindows >= 2
      ? '角色承诺已连续两个窗口未兑现，下一阶段将触发正式沟通事件。'
      : '当前安排低于合同承诺；若下个窗口仍未改善，将记录违约并触发沟通。'
  const incomeHint =
    incomeEuro === 0
      ? '现金储备已经达到当前工资对应的上限，本窗口可支配收入已转入不单独模拟的长期资产。'
      : null

  return {
    ...report,
    roleAfter: actualRole,
    stipendEuro: incomeEuro,
    incomeLabel: '工资可支配收入',
    cashAfterEuro,
    contract: {
      annualSalaryEuro: contractBefore.annualSalaryEuro,
      remainingHalfYears: contractAfter.remainingHalfYears,
      promisedTeamLevel: contractBefore.promisedTeamLevel,
      promisedRole: contractBefore.promisedRole,
      actualTeamLevel,
      actualRole,
      promiseFulfilled: fulfilled,
      brokenPromiseWindows: contractAfter.brokenPromiseWindows,
    },
    hints: [promiseHint, incomeHint, ...report.hints]
      .filter((hint): hint is string => Boolean(hint))
      .slice(0, 3),
  }
}

function simulateFirstTeamHalfYear(input: {
  state: GameState
  offer: AcademyOffer
  role: FirstTeamRole
  focus: TrainingFocus
  approach: DevelopmentApproach | null
}): {
  player: Player
  report: HalfYearReport
  firstTeamRole: FirstTeamRole
  contract: ContractState
  cashEuro: number
} {
  const { state, offer, role, focus, approach } = input
  const startPlayer = structuredClone(state.player!)
  const preparation = prepareProfessionalWindow(startPlayer, approach)
  const workingPlayer = preparation.player
  const seed = `${state.careerSeed}:window:${state.windowIndex}`
  const { stats, injury } = simulateFirstTeamStats({
    player: workingPlayer,
    offer,
    role,
    seed,
  })
  const formAfter = clamp(
    stats.appearances >= 8
      ? workingPlayer.form * 0.4 +
          performanceIndex(stats.averageRating) * 0.6
      : workingPlayer.form * 0.72 +
          performanceIndex(stats.averageRating) * 0.28,
    workingPlayer.form - 25,
    workingPlayer.form + 25,
  )
  const workloadDelta =
    stats.appearances >= 15 ? -5 : stats.appearances >= 11 ? -2 : 2
  const fitnessAfter = injury
    ? Math.min(70, workingPlayer.fitness + workloadDelta)
    : clamp(workingPlayer.fitness + workloadDelta, 0, 100)
  const performanceMorale =
    stats.averageRating >= 7
      ? 5
      : stats.averageRating < 6.2
        ? -4
        : 1
  const playingTimeMorale =
    stats.appearances <= 3 ? -5 : stats.appearances >= 12 ? 3 : 0
  const moraleAfter = clamp(
    workingPlayer.morale * 0.55 +
      60 * 0.45 +
      performanceMorale +
      playingTimeMorale +
      (focus === 'ADAPTATION' ? 4 : 0),
    workingPlayer.morale - 20,
    workingPlayer.morale + 20,
  )
  const attributesAfter = growFirstTeamAttributes({
    player: workingPlayer,
    offer,
    role,
    focus,
    trainingBonus:
      preparation.trainingBonus + state.trainingQualityBonus,
    seed,
  })
  const playerAfter: Player = {
    ...workingPlayer,
    attributes: attributesAfter,
    form: roundTenth(formAfter),
    fitness: roundTenth(fitnessAfter),
    morale: roundTenth(moraleAfter),
    coachRelation: clamp(
      workingPlayer.coachRelation +
        (stats.averageRating >= 6.8 ? 2 : stats.averageRating < 6 ? -2 : 0),
      0,
      100,
    ),
    squadRelation: clamp(
      workingPlayer.squadRelation +
        (stats.appearances >= 10 ? 2 : approach === 'TEAM_FIRST' ? 2 : 0),
      0,
      100,
    ),
    fanRelation: clamp(
      workingPlayer.fanRelation +
        (stats.averageRating >= 7 ? 3 : stats.goals + stats.assists >= 2 ? 2 : 0),
      0,
      100,
    ),
    reputation: clamp(
      workingPlayer.reputation +
        (stats.appearances >= 10 ? 2 : 0) +
        (stats.averageRating >= 7 ? 2 : 0),
      0,
      100,
    ),
    clubAttachment: clamp(workingPlayer.clubAttachment + 2, 0, 100),
  }
  const targetRole = evaluateFirstTeamRole(playerAfter, offer.club)
  const roleAfter = roleStepToward(role, targetRole)
  const settlement = settleContract({
    contract: state.contract!,
    actualTeamLevel: 'FIRST_TEAM',
    actualRole: roleAfter,
    cashBeforeEuro: state.cashEuro,
  })
  const nextWindowLabel = careerWindowLabel(
    state.startYear,
    state.windowIndex + 1,
  )
  const baseReport: HalfYearReport = {
    fromLabel: careerWindowLabel(state.startYear, state.windowIndex),
    toLabel: nextWindowLabel,
    clubId: offer.club.id,
    clubName: offer.club.name,
    roleBefore: role,
    roleAfter,
    stats,
    attributes: Object.fromEntries(
      attributeKeys.map((key: AttributeKey) => [
        key,
        numericChange(
          startPlayer.attributes[key],
          playerAfter.attributes[key],
        ),
      ]),
    ) as HalfYearReport['attributes'],
    states: {
      form: numericChange(startPlayer.form, playerAfter.form),
      fitness: numericChange(startPlayer.fitness, playerAfter.fitness),
      morale: numericChange(startPlayer.morale, playerAfter.morale),
    },
    relations: {
      coach: numericChange(
        startPlayer.coachRelation,
        playerAfter.coachRelation,
      ),
      squad: numericChange(
        startPlayer.squadRelation,
        playerAfter.squadRelation,
      ),
      fans: numericChange(
        startPlayer.fanRelation,
        playerAfter.fanRelation,
      ),
    },
    firstTeam: {
      attention: numericChange(100, 100),
      readiness: numericChange(100, 100),
      matchProof: numericChange(100, 100),
      coachBacking: numericChange(100, 100),
      statusBefore: 'PROMOTED',
      statusAfter: 'PROMOTED',
      outcomeSummary:
        roleAfter === role
          ? '你在一线队的实际角色保持稳定。'
          : `教练组根据训练和比赛表现调整了你的一线队角色。`,
    },
    stipendEuro: settlement.incomeEuro,
    incomeLabel: '工资可支配收入',
    expenseEuro: 0,
    cashAfterEuro: settlement.cashAfterEuro,
    injury,
    eventSummary: preparation.summary,
    hints: [
      roleAfter !== role
        ? '你的队内角色发生了一级变化，下一窗口出场比例也会随之调整。'
        : `${nextWindowLabel}仍将按照本窗口的实际角色安排出场。`,
    ],
  }
  const report = attachContractReport({
    report: baseReport,
    contractBefore: state.contract!,
    contractAfter: settlement.contract,
    actualTeamLevel: 'FIRST_TEAM',
    actualRole: roleAfter,
    incomeEuro: settlement.incomeEuro,
    cashAfterEuro: settlement.cashAfterEuro,
    promiseFulfilled: settlement.promiseFulfilled,
  })

  return {
    player: playerAfter,
    report,
    firstTeamRole: roleAfter,
    contract: settlement.contract,
    cashEuro: settlement.cashAfterEuro,
  }
}

export function simulateProfessionalHalfYear(input: {
  state: GameState
  offer: AcademyOffer
}): {
  player: Player
  report: HalfYearReport
  teamLevel: TeamLevel
  youthRole: YouthRole | null
  firstTeamRole: FirstTeamRole | null
  contract: ContractState
  cashEuro: number
  firstTeamProgress: GameState['firstTeamProgress']
} {
  const { state, offer } = input
  if (
    !state.player ||
    !state.contract ||
    !state.trainingFocus
  ) {
    throw new Error('职业半年模拟缺少球员、合同或训练选择。')
  }

  if (state.teamLevel === 'FIRST_TEAM') {
    const role =
      state.firstTeamRole ??
      evaluateFirstTeamRole(state.player, offer.club)
    const result = simulateFirstTeamHalfYear({
      state,
      offer,
      role,
      focus: state.trainingFocus,
      approach: state.developmentApproach,
    })
    return {
      ...result,
      teamLevel: 'FIRST_TEAM',
      youthRole: null,
      firstTeamProgress: {
        ...state.firstTeamProgress,
        attention: 100,
        readiness: 100,
        matchProof: 100,
        coachBacking: 100,
        status: 'PROMOTED',
      },
    }
  }

  if (!state.youthRole || !state.arrivalChoice) {
    throw new Error('青年队职业半年模拟缺少当前角色。')
  }
  const youthResult = simulateHalfYear({
    player: state.player,
    offer,
    role: state.youthRole,
    arrivalChoice: null,
    trainingFocus: state.trainingFocus,
    careerSeed: state.careerSeed,
    startYear: state.startYear,
    windowIndex: state.windowIndex,
    cashBeforeEuro: state.cashEuro,
    developmentApproach: state.developmentApproach,
    firstTeamProgress: state.firstTeamProgress,
    teamLevel: state.teamLevel,
    eventTrainingBonus: state.trainingQualityBonus,
  })
  const actualTeamLevel = youthResult.teamLevel
  const firstTeamRole =
    actualTeamLevel === 'FIRST_TEAM'
      ? evaluateFirstTeamRole(youthResult.player, offer.club)
      : null
  const actualRole = firstTeamRole ?? youthResult.role
  const settlement = settleContract({
    contract: state.contract,
    actualTeamLevel,
    actualRole,
    cashBeforeEuro: state.cashEuro,
  })
  const report = attachContractReport({
    report: youthResult.report,
    contractBefore: state.contract,
    contractAfter: settlement.contract,
    actualTeamLevel,
    actualRole,
    incomeEuro: settlement.incomeEuro,
    cashAfterEuro: settlement.cashAfterEuro,
    promiseFulfilled: settlement.promiseFulfilled,
  })

  return {
    player: youthResult.player,
    report,
    teamLevel: actualTeamLevel,
    youthRole:
      actualTeamLevel === 'YOUTH' ? youthResult.role : null,
    firstTeamRole,
    contract: settlement.contract,
    cashEuro: settlement.cashAfterEuro,
    firstTeamProgress: youthResult.firstTeamProgress,
  }
}
