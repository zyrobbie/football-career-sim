import { professionalApproachSummary, prepareProfessionalWindow, adjustedProfessionalRange, professionalInjuryRisk, PROFESSIONAL_APPEARANCE_LIMIT, type ProfessionalMatchModifiers } from './professionalApproach'
import { resolveTrainingPlan, applyTrainingMaintenance, trainingEventSummary, type TrainingExecution } from './trainingPlan'
import {
  BASE_RATES,
  FIRST_TEAM_BENCHMARKS,
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
import { developAttributesByAge } from './ageDevelopment'
import { careerWindowLabel, playerAgeAtWindow } from './careerTime'
import { evaluateFirstTeamRole } from './contracts'
import { enforceAgeBasedFirstTeam } from './eligibility'
import {
  cashReserveLimit,
  halfYearDisposableIncome,
} from './finance'
import { calculateOverall } from './player'
import { createRandom, poisson } from './random'
import { simulateHalfYear } from './simulateHalfYear'
import {
  developmentMultiplierFromTraining,
  developmentMultiplierWithMatchExperience,
  firstTeamMatchExperienceBonusForRuntimeClub,
  trainingQualityScore,
} from './trainingQuality'

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

function simulateFirstTeamStats(input: {
  player: Player
  offer: AcademyOffer
  role: FirstTeamRole
  seed: string
  matchModifiers: ProfessionalMatchModifiers
  recovery: boolean
}): {
  stats: HalfYearStats
  injury: HalfYearReport['injury']
  execution: { appearanceRange: readonly [number, number]; startRange: readonly [number, number]; injuryRisk: number; opportunityCapped: boolean }
} {
  const { player, offer, role, seed } = input
  const random = createRandom(seed, 'professional-appearances')
  const injuryRandom = createRandom(seed, 'professional-injury')
  const totalMatches = 18
  const [appearanceMin, appearanceMax] = adjustedProfessionalRange(APPEARANCE_RANGES[role], input.matchModifiers.appearanceRateBonus, PROFESSIONAL_APPEARANCE_LIMIT)
  const [startMin, startMax] = adjustedProfessionalRange(START_RANGES[role], input.matchModifiers.startRateBonus, 1)
  const injuryRisk = professionalInjuryRisk(player, input.matchModifiers, input.recovery)
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
    execution: { appearanceRange: [appearanceMin, appearanceMax] as const, startRange: [startMin, startMax] as const, injuryRisk, opportunityCapped: APPEARANCE_RANGES[role].some(v => v + input.matchModifiers.appearanceRateBonus > PROFESSIONAL_APPEARANCE_LIMIT || v + input.matchModifiers.appearanceRateBonus < 0) || START_RANGES[role].some(v => v + input.matchModifiers.startRateBonus > 1 || v + input.matchModifiers.startRateBonus < 0) },
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
  minutes: number
  seed: string
  windowIndex: number
  trainingExecution: TrainingExecution | null
}): Attributes {
  const { player, offer, role, focus, trainingBonus, minutes, seed, windowIndex } = input
  const trainingQuality = trainingQualityScore({
    club: offer.club,
    coachRelation: player.coachRelation,
    teamLevel: 'FIRST_TEAM',
    bonus: trainingBonus,
  })
  const trainingMultiplier = developmentMultiplierFromTraining({
    trainingQuality,
    roleExposure: ROLE_EXPOSURE[role],
    squadRelation: player.squadRelation,
    fitness: player.fitness,
    morale: player.morale,
    focus,
  })
  const multiplier = developmentMultiplierWithMatchExperience(
    trainingMultiplier,
    firstTeamMatchExperienceBonusForRuntimeClub({ club: offer.club, minutes }),
  )
  const shares = resolveTrainingPlan(player.primaryPosition, focus).shares
  const random = createRandom(seed, 'professional-growth')

  return developAttributesByAge({
    player,
    age: playerAgeAtWindow(windowIndex),
    developmentMultiplier: multiplier,
    trainingShares: shares,
    trainingExecution: input.trainingExecution,
    random,
  })
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
  const trainingExecution = applyTrainingMaintenance(startPlayer, workingPlayer, playerAgeAtWindow(state.windowIndex), focus)
  const seed = `${state.careerSeed}:window:${state.windowIndex}`
  const { stats, injury, execution } = simulateFirstTeamStats({
    player: workingPlayer,
    offer,
    role,
    seed,
    matchModifiers: preparation.matchModifiers,
    recovery: preparation.recovery,
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
    minutes: stats.minutes,
    seed,
    windowIndex: state.windowIndex,
    trainingExecution,
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
        (stats.appearances >= 10 ? 2 : !preparation.recovery && preparation.effectiveApproach === 'TEAM_FIRST' ? 2 : 0),
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
    actualRole: role,
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
    eventSummary: trainingEventSummary(professionalApproachSummary(preparation, execution, playerAfter.squadRelation), trainingExecution),
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
    actualRole: role,
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
  const state = enforceAgeBasedFirstTeam(input.state)
  const { offer } = input
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
  // 本窗口的比赛仍由窗口开始时的球队层级与角色生成；晋升与角色调整
  // 在窗口结束后生效，只影响下一个窗口，不能倒过来参与本窗口合同结算。
  const actualTeamLevel = state.teamLevel
  const actualRole = state.youthRole
  const nextTeamLevel = youthResult.teamLevel
  const firstTeamRole =
    nextTeamLevel === 'FIRST_TEAM'
      ? evaluateFirstTeamRole(youthResult.player, offer.club)
      : null
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
    teamLevel: nextTeamLevel,
    youthRole:
      nextTeamLevel === 'YOUTH' ? youthResult.role : null,
    firstTeamRole,
    contract: settlement.contract,
    cashEuro: settlement.cashAfterEuro,
    firstTeamProgress: youthResult.firstTeamProgress,
  }
}
