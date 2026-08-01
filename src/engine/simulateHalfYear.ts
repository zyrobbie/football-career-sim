import {
  ACADEMY_SCORES,
  BASE_RATES,
  COACH_BASE_SCORES,
  FACILITY_SCORES,
  POSITION_WEIGHTS,
  YOUTH_ATTACK_FACTORS,
  YOUTH_BENCHMARKS,
} from '../data/balance'
import {
  attributeKeys,
  type AcademyOffer,
  type ArrivalChoice,
  type AttributeKey,
  type Attributes,
  type DevelopmentApproach,
  type FirstTeamProgress,
  type HalfYearReport,
  type HalfYearStats,
  type Player,
  type TeamLevel,
  type TrainingFocus,
  type YouthRole,
} from '../models/game'
import {
  calculateOverall,
} from './player'
import { developAttributesByAge } from './ageDevelopment'
import { careerWindowLabel, playerAgeAtWindow } from './careerTime'
import { calculateYouthSelectionScore, youthRoleFromDifference } from './offers'
import {
  createFirstTeamProgress,
  evaluateFirstTeamProgress,
} from './firstTeamPath'
import { createRandom, poisson } from './random'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

const ROLE_APPEARANCE_RANGES: Record<YouthRole, readonly [number, number]> = {
  ROTATION: [0.35, 0.55],
  STARTER: [0.65, 0.85],
  CORE: [0.8, 0.95],
}

const ROLE_START_RANGES: Record<YouthRole, readonly [number, number]> = {
  ROTATION: [0.4, 0.6],
  STARTER: [0.75, 0.9],
  CORE: [0.9, 1],
}

const ROLE_EXPOSURE: Record<YouthRole, number> = {
  ROTATION: 45,
  STARTER: 72,
  CORE: 90,
}

const ROLE_ORDER: YouthRole[] = ['ROTATION', 'STARTER', 'CORE']

function applyArrivalChoice(
  player: Player,
  choice: ArrivalChoice,
): { player: Player; trainingBonus: number; summary: string } {
  const next = structuredClone(player)
  let trainingBonus = 0
  let summary = ''

  if (choice === 'COACH') {
    next.coachRelation = clamp(next.coachRelation + 8, 0, 100)
    next.squadRelation = clamp(next.squadRelation + 2, 0, 100)
    summary = '你主动与教练沟通，明确了第一个半年的发展目标。'
  } else if (choice === 'TEAMMATES') {
    next.squadRelation = clamp(next.squadRelation + 8, 0, 100)
    next.morale = clamp(next.morale + 3, 0, 100)
    summary = '你很快认识了新队友，更衣室里的陌生感正在消失。'
  } else if (choice === 'OPEN_DAY') {
    next.fanRelation = clamp(next.fanRelation + 6, 0, 100)
    next.mediaRelation = clamp(next.mediaRelation + 3, 0, 100)
    summary = '你参加了俱乐部开放活动，给球迷留下了不错的第一印象。'
  } else {
    trainingBonus = 3
    next.fitness = clamp(next.fitness - 2, 0, 100)
    summary = '你把时间留给训练场，但额外训练也带来了一点疲劳。'
  }

  return { player: next, trainingBonus, summary }
}

function prepareWindow(
  player: Player,
  arrivalChoice: ArrivalChoice | null,
  windowIndex: number,
  developmentApproach: DevelopmentApproach | null,
): { player: Player; trainingBonus: number; summary: string } {
  if (windowIndex === 0 && arrivalChoice) {
    return applyArrivalChoice(player, arrivalChoice)
  }

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
        '俱乐部注意到你的状态接近警戒线，安排了恢复训练、体能监测和心理沟通。',
    }
  }

  if (windowIndex >= 2 && developmentApproach === 'PUSH') {
    next.coachRelation = clamp(next.coachRelation + 4, 0, 100)
    next.fitness = clamp(next.fitness - 3, 0, 100)
    return {
      player: next,
      trainingBonus: 1,
      summary:
        '你主动找到教练争取一线队跟训机会。教练认可你的主动性，也提醒你控制额外负荷。',
    }
  }

  if (windowIndex >= 2 && developmentApproach === 'TEAM_FIRST') {
    next.squadRelation = clamp(next.squadRelation + 4, 0, 100)
    next.morale = clamp(next.morale + 2, 0, 100)
    return {
      player: next,
      trainingBonus: 0,
      summary:
        '你把青年队成绩放在首位，主动承担比赛责任，队友对你的信任明显增加。',
    }
  }

  if (windowIndex >= 2 && developmentApproach === 'STEADY') {
    next.form = clamp(next.form + 2, 0, 100)
    next.fitness = clamp(next.fitness + 1, 0, 100)
    return {
      player: next,
      trainingBonus: 0,
      summary:
        '你选择稳住训练和比赛节奏，不追逐短期机会，把注意力放在持续成长上。',
    }
  }

  return {
    player: next,
    trainingBonus: 0,
    summary:
      windowIndex < 2
        ? '你已经适应青年队生活，训练开始围绕稳定出场和持续成长展开。'
        : '第二个青训赛季开始，青年队表现将直接影响一线队对你的评估。',
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

function simulateStats(
  player: Player,
  offer: AcademyOffer,
  role: YouthRole,
  seed: string,
  windowIndex: number,
): { stats: HalfYearStats; injury: HalfYearReport['injury'] } {
  const random = createRandom(seed, 'appearance')
  const totalMatches = 18
  const [appearanceMin, appearanceMax] = ROLE_APPEARANCE_RANGES[role]
  const [startMin, startMax] = ROLE_START_RANGES[role]

  const injuryRandom = createRandom(seed, 'injury')
  const injuryRisk = windowIndex === 0 ? 0.02 : 0.025
  const hasInjury = injuryRandom.next() < injuryRisk
  const injuryWeeks = hasInjury ? injuryRandom.int(2, 6) : 0
  const availability = hasInjury ? clamp(1 - injuryWeeks / 26, 0.7, 1) : 1

  const appearances = Math.max(
    1,
    Math.round(totalMatches * random.float(appearanceMin, appearanceMax) * availability),
  )
  const starts = Math.min(
    appearances,
    Math.round(appearances * random.float(startMin, startMax)),
  )
  const substituteAppearances = appearances - starts
  const startMinutes = 65 + player.fitness * 0.25
  const substituteMinutes = 10 + player.fitness * 0.25
  const minutes = Math.round(
    starts * startMinutes + substituteAppearances * substituteMinutes,
  )

  const rates = BASE_RATES[player.primaryPosition]
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
  const teamFactor = YOUTH_ATTACK_FACTORS[offer.club.academyTier]
  const performanceState = stateModifier(player)
  const goalExpected =
    (minutes / 90) *
    rates.goals *
    attackFactor *
    teamFactor *
    performanceState
  const assistExpected =
    (minutes / 90) *
    rates.assists *
    assistFactor *
    teamFactor *
    performanceState
  const dataRandom = createRandom(seed, 'performance-data')
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

  const overall = calculateOverall(player.attributes, player.primaryPosition)
  const benchmark = YOUTH_BENCHMARKS[offer.club.tier]
  const abilityFit = clamp((overall - benchmark) * 0.06, -0.6, 0.6)
  const stateEffect = clamp((performanceState - 1) * 2, -0.4, 0.4)
  const dataEffect = clamp(
    (goals + assists - goalExpected - assistExpected) * 0.08,
    -0.15,
    0.15,
  )
  const ratingRandom = createRandom(seed, 'rating')
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

function performanceIndex(rating: number): number {
  if (rating <= 5.7) return 20
  if (rating <= 6.1) return 35
  if (rating <= 6.5) return 50
  if (rating <= 6.9) return 62
  if (rating <= 7.3) return 75
  if (rating <= 7.7) return 86
  return 95
}

function developmentMultiplier(index: number): number {
  if (index < 30) return 0.55
  if (index < 45) return 0.75
  if (index < 60) return 0.9
  if (index < 75) return 1
  if (index < 90) return 1.12
  return 1.2
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

function growAttributes(
  player: Player,
  offer: AcademyOffer,
  role: YouthRole,
  focus: TrainingFocus,
  trainingBonus: number,
  averageFitness: number,
  averageMorale: number,
  seed: string,
  windowIndex: number,
): Attributes {
  const effectiveCoach = Math.min(
    100,
    COACH_BASE_SCORES[offer.club.tier] *
      (0.85 + player.coachRelation * 0.003),
  )
  const trainingQuality =
    FACILITY_SCORES[offer.club.facilityTier] * 0.35 +
    ACADEMY_SCORES[offer.club.academyTier] * 0.45 +
    effectiveCoach * 0.2 +
    trainingBonus
  const developmentIndex =
    trainingQuality * 0.4 +
    ROLE_EXPOSURE[role] * 0.25 +
    player.squadRelation * 0.1 +
    averageFitness * 0.15 +
    averageMorale * 0.1
  const multiplier =
    developmentMultiplier(developmentIndex) *
    (focus === 'ADAPTATION' ? 0.9 : 1)
  const shares = trainingShares(player.primaryPosition, focus)
  const random = createRandom(seed, 'growth')

  return developAttributesByAge({
    player,
    age: playerAgeAtWindow(windowIndex),
    developmentMultiplier: multiplier,
    trainingShares: shares,
    random,
  })
}

function roleStepToward(
  current: YouthRole,
  target: YouthRole,
): YouthRole {
  const currentIndex = ROLE_ORDER.indexOf(current)
  const targetIndex = ROLE_ORDER.indexOf(target)
  if (currentIndex === targetIndex) return current
  return ROLE_ORDER[
    currentIndex + (targetIndex > currentIndex ? 1 : -1)
  ] as YouthRole
}

function numericChange(before: number, after: number) {
  return {
    before: roundTenth(before),
    after: roundTenth(after),
    delta: roundTenth(after - before),
  }
}

export function simulateHalfYear(input: {
  player: Player
  offer: AcademyOffer
  role: YouthRole
  arrivalChoice: ArrivalChoice | null
  trainingFocus: TrainingFocus
  careerSeed: string
  startYear: number
  windowIndex: number
  cashBeforeEuro: number
  developmentApproach?: DevelopmentApproach | null
  firstTeamProgress?: FirstTeamProgress
  teamLevel?: TeamLevel
  eventTrainingBonus?: number
}): {
  player: Player
  report: HalfYearReport
  role: YouthRole
  firstTeamProgress: FirstTeamProgress
  teamLevel: TeamLevel
} {
  const {
    offer,
    role,
    arrivalChoice,
    trainingFocus,
    careerSeed,
    startYear,
    windowIndex,
    developmentApproach = null,
    eventTrainingBonus = 0,
  } = input
  const startPlayer = structuredClone(input.player)
  const windowPreparation = prepareWindow(
    startPlayer,
    arrivalChoice,
    windowIndex,
    developmentApproach,
  )
  const workingPlayer = windowPreparation.player
  const simulationSeed = `${careerSeed}:window:${windowIndex}`
  const { stats, injury } = simulateStats(
    workingPlayer,
    offer,
    role,
    simulationSeed,
    windowIndex,
  )

  const formBefore = startPlayer.form
  const formAfter = clamp(
    stats.appearances >= 8
      ? workingPlayer.form * 0.4 + performanceIndex(stats.averageRating) * 0.6
      : workingPlayer.form * 0.7 + performanceIndex(stats.averageRating) * 0.3,
    workingPlayer.form - 25,
    workingPlayer.form + 25,
  )
  const workloadDelta =
    stats.appearances >= 15 ? -5 : stats.appearances >= 11 ? -2 : 2
  const fitnessBefore = startPlayer.fitness
  const fitnessAfter = injury
    ? Math.min(70, workingPlayer.fitness + workloadDelta)
    : clamp(workingPlayer.fitness + workloadDelta, 0, 100)
  const moraleBefore = startPlayer.morale
  const performanceMorale =
    stats.averageRating >= 7
      ? 5
      : stats.averageRating < 6.2
        ? -4
        : 1
  const roleMorale = role === 'CORE' ? 3 : role === 'STARTER' ? 1 : 0
  const adaptationMorale = trainingFocus === 'ADAPTATION' ? 4 : 0
  const moraleTarget =
    workingPlayer.morale * 0.5 +
    60 * 0.5 +
    performanceMorale +
    roleMorale +
    adaptationMorale
  const moraleAfter = clamp(
    moraleTarget,
    workingPlayer.morale - 20,
    workingPlayer.morale + 20,
  )

  const attributesAfter = growAttributes(
    workingPlayer,
    offer,
    role,
    trainingFocus,
    windowPreparation.trainingBonus + eventTrainingBonus,
    (workingPlayer.fitness + fitnessAfter) / 2,
    (workingPlayer.morale + moraleAfter) / 2,
    simulationSeed,
    windowIndex,
  )

  const playerAfter: Player = {
    ...workingPlayer,
    attributes: attributesAfter,
    form: roundTenth(formAfter),
    fitness: roundTenth(fitnessAfter),
    morale: roundTenth(moraleAfter),
    coachRelation: clamp(
      workingPlayer.coachRelation + (stats.averageRating >= 6.8 ? 2 : 0),
      0,
      100,
    ),
    squadRelation: clamp(
      workingPlayer.squadRelation + (stats.appearances >= 10 ? 1 : 0),
      0,
      100,
    ),
    clubAttachment: clamp(workingPlayer.clubAttachment + 3, 0, 100),
  }
  const targetRole = youthRoleFromDifference(
    calculateYouthSelectionScore(playerAfter) -
      YOUTH_BENCHMARKS[offer.club.tier],
  )
  const roleAfter = roleStepToward(role, targetRole)
  const firstTeamBefore =
    input.firstTeamProgress ?? createFirstTeamProgress(offer.club.id)
  const firstTeamEvaluation = evaluateFirstTeamProgress({
    previous: firstTeamBefore,
    player: playerAfter,
    offer,
    role: roleAfter,
    stats,
    windowIndex,
    approach: developmentApproach,
  })
  const teamLevel =
    input.teamLevel === 'FIRST_TEAM'
      ? 'FIRST_TEAM'
      : firstTeamEvaluation.teamLevel
  const stipend = Math.round(offer.annualStipendEuro / 2)
  const cashAfter = input.cashBeforeEuro + stipend
  const hints: string[] = []
  const nextWindowLabel = careerWindowLabel(startYear, windowIndex + 1)

  if (roleAfter !== role) {
    hints.push('教练正在考虑提高你的青年队地位。')
  }
  if (firstTeamEvaluation.progress.status !== firstTeamBefore.status) {
    hints.push(firstTeamEvaluation.outcomeSummary)
  }
  if (playerAfter.fitness < 46) {
    hints.push('身体状态接近警戒线，下个窗口将优先提供恢复方案。')
  }
  if (hints.length === 0 && playerAfter.coachRelation >= 55) {
    hints.push(`教练认可你的训练态度，${nextWindowLabel}计划将更有针对性。`)
  }
  if (hints.length === 0) {
    hints.push(`${nextWindowLabel}将根据你的表现重新评估青年队角色。`)
  }

  const report: HalfYearReport = {
    fromLabel: careerWindowLabel(startYear, windowIndex),
    toLabel: nextWindowLabel,
    clubId: offer.club.id,
    clubName: offer.club.name,
    roleBefore: role,
    roleAfter,
    stats,
    attributes: Object.fromEntries(
      attributeKeys.map((key: AttributeKey) => [
        key,
        numericChange(startPlayer.attributes[key], playerAfter.attributes[key]),
      ]),
    ) as HalfYearReport['attributes'],
    states: {
      form: numericChange(formBefore, playerAfter.form),
      fitness: numericChange(fitnessBefore, playerAfter.fitness),
      morale: numericChange(moraleBefore, playerAfter.morale),
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
      fans: numericChange(startPlayer.fanRelation, playerAfter.fanRelation),
    },
    firstTeam: {
      attention: numericChange(
        firstTeamBefore.attention,
        firstTeamEvaluation.progress.attention,
      ),
      readiness: numericChange(
        firstTeamBefore.readiness,
        firstTeamEvaluation.progress.readiness,
      ),
      matchProof: numericChange(
        firstTeamBefore.matchProof,
        firstTeamEvaluation.progress.matchProof,
      ),
      coachBacking: numericChange(
        firstTeamBefore.coachBacking,
        firstTeamEvaluation.progress.coachBacking,
      ),
      statusBefore: firstTeamBefore.status,
      statusAfter: firstTeamEvaluation.progress.status,
      outcomeSummary: firstTeamEvaluation.outcomeSummary,
    },
    stipendEuro: stipend,
    expenseEuro: 0,
    cashAfterEuro: cashAfter,
    injury,
    eventSummary: windowPreparation.summary,
    hints: hints.slice(0, 3),
  }

  return {
    player: playerAfter,
    report,
    role: roleAfter,
    firstTeamProgress: firstTeamEvaluation.progress,
    teamLevel,
  }
}
