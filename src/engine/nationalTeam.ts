import {
  BASE_RATES,
  FIRST_TEAM_BENCHMARKS,
} from '../data/balance'
import type {
  Club,
  HalfYearReport,
  HalfYearStats,
  NationalTeamCompetition,
  NationalTeamRole,
  NationalTeamStage,
  NationalTeamState,
  NationalTeamWindowRecord,
  Player,
  TeamLevel,
} from '../models/game'
import { calculateOverall } from './player'
import { playerAgeAtWindow } from './careerTime'
import { createRandom, poisson, weightedPick } from './random'

export const CHINA_RANKING_SNAPSHOT = {
  rank: 91,
  date: '2026-07-20',
  baseStrength: 65,
  gameplayBonus: 5,
} as const

export const NATIONAL_TEAM_SELECTION_BENCHMARK = 64

export function createNationalTeamState(): NationalTeamState {
  return {
    retired: false,
    currentRole: null,
    caps: 0,
    goals: 0,
    assists: 0,
    debutWindowIndex: null,
    history: [],
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function yearForWindow(startYear: number, windowIndex: number): number {
  return startYear + Math.floor(windowIndex / 2)
}

export function nationalCompetitionForWindow(
  startYear: number,
  windowIndex: number,
): NationalTeamCompetition {
  if (windowIndex % 2 === 1) return 'INTERNATIONAL_WINDOW'
  const year = yearForWindow(startYear, windowIndex)
  if ((year - 2026) % 4 === 0) return 'WORLD_CUP'
  if ((year - 2027) % 4 === 0) return 'ASIAN_CUP'
  return 'INTERNATIONAL_WINDOW'
}

function healthPenalty(player: Player, injured: boolean): number {
  const fitnessPenalty =
    player.fitness >= 75
      ? 0
      : player.fitness >= 60
        ? -1
        : player.fitness >= 40
          ? -3
          : -6
  return fitnessPenalty + (injured ? -3 : 0)
}

export function nationalTeamSelectionScore(input: {
  player: Player
  club: Club
  clubStats: HalfYearStats
  injured: boolean
}): number {
  const { player, club, clubStats, injured } = input
  const overall = calculateOverall(
    player.attributes,
    player.primaryPosition,
  )
  const formModifier = (player.form - 50) * 0.05
  const ratingModifier = clamp(
    (clubStats.averageRating - 6.5) * 2,
    -3,
    3,
  )
  const leagueQualityModifier = clamp(
    (FIRST_TEAM_BENCHMARKS[club.tier] - 60) * 0.08,
    -2,
    2,
  )
  const reputationModifier = clamp(
    (player.reputation - 40) * 0.03,
    -1,
    2,
  )
  return roundTenth(
    overall +
      formModifier +
      ratingModifier +
      leagueQualityModifier +
      reputationModifier +
      healthPenalty(player, injured),
  )
}

export function nationalTeamRoleFromScore(
  score: number,
): NationalTeamRole | null {
  const difference = score - NATIONAL_TEAM_SELECTION_BENCHMARK
  if (difference >= 7) return 'CORE'
  if (difference >= 3) return 'STARTER'
  if (difference >= -1) return 'ROTATION'
  if (difference >= -4) return 'FRINGE'
  return null
}

function qualificationChance(
  competition: NationalTeamCompetition,
  effectiveStrength: number,
): number {
  if (competition === 'WORLD_CUP') {
    if (effectiveStrength < 55) return 0.08
    if (effectiveStrength < 60) return 0.15
    if (effectiveStrength < 65) return 0.25
    if (effectiveStrength < 70) return 0.4
    if (effectiveStrength < 75) return 0.6
    return 0.78
  }
  if (competition === 'ASIAN_CUP') {
    if (effectiveStrength < 55) return 0.6
    if (effectiveStrength < 60) return 0.8
    if (effectiveStrength < 65) return 0.92
    return 0.98
  }
  return 1
}

function tournamentStage(input: {
  competition: NationalTeamCompetition
  effectiveStrength: number
  qualified: boolean
  random: ReturnType<typeof createRandom>
}): NationalTeamStage | null {
  const { competition, effectiveStrength, qualified, random } = input
  if (competition === 'INTERNATIONAL_WINDOW') return null
  if (!qualified) return 'NOT_QUALIFIED'

  if (competition === 'WORLD_CUP') {
    const strengthShift = clamp((effectiveStrength - 70) * 0.6, -6, 6)
    return weightedPick(random, [
      { value: 'GROUP_STAGE' as const, weight: 38 - strengthShift },
      { value: 'ROUND_OF_16' as const, weight: 31 - strengthShift / 2 },
      { value: 'QUARTER_FINAL' as const, weight: 18 + strengthShift / 2 },
      { value: 'SEMI_FINAL' as const, weight: 8 + strengthShift / 3 },
      { value: 'RUNNER_UP' as const, weight: 4 + strengthShift / 4 },
      { value: 'CHAMPION' as const, weight: 1 + strengthShift / 5 },
    ])
  }

  const strengthShift = clamp((effectiveStrength - 70) * 0.8, -8, 8)
  return weightedPick(random, [
    { value: 'GROUP_STAGE' as const, weight: 7 - strengthShift / 3 },
    { value: 'ROUND_OF_16' as const, weight: 13 - strengthShift / 3 },
    { value: 'QUARTER_FINAL' as const, weight: 22 - strengthShift / 4 },
    { value: 'SEMI_FINAL' as const, weight: 25 + strengthShift / 4 },
    { value: 'RUNNER_UP' as const, weight: 18 + strengthShift / 3 },
    { value: 'CHAMPION' as const, weight: 15 + strengthShift / 2 },
  ])
}

function roleAppearanceRate(role: NationalTeamRole): readonly [number, number] {
  const rates: Record<NationalTeamRole, readonly [number, number]> = {
    FRINGE: [0.2, 0.5],
    ROTATION: [0.5, 0.78],
    STARTER: [0.78, 0.95],
    CORE: [0.9, 1],
  }
  return rates[role]
}

function roleStartRate(role: NationalTeamRole): readonly [number, number] {
  const rates: Record<NationalTeamRole, readonly [number, number]> = {
    FRINGE: [0, 0.2],
    ROTATION: [0.35, 0.65],
    STARTER: [0.72, 0.92],
    CORE: [0.88, 1],
  }
  return rates[role]
}

function competitionLabel(competition: NationalTeamCompetition): string {
  return {
    INTERNATIONAL_WINDOW: '国家队比赛日',
    WORLD_CUP: '世界杯周期',
    ASIAN_CUP: '亚洲杯周期',
  }[competition]
}

function stageLabel(stage: NationalTeamStage | null): string {
  if (!stage) return ''
  return {
    NOT_QUALIFIED: '未进入正赛',
    GROUP_STAGE: '小组赛',
    ROUND_OF_16: '16强',
    QUARTER_FINAL: '8强',
    SEMI_FINAL: '4强',
    RUNNER_UP: '亚军',
    CHAMPION: '冠军',
  }[stage]
}

export function simulateNationalTeamWindow(input: {
  nationalTeam: NationalTeamState
  player: Player
  club: Club
  clubStats: HalfYearStats
  teamLevel: TeamLevel
  injured: boolean
  careerSeed: string
  startYear: number
  windowIndex: number
}): {
  nationalTeam: NationalTeamState
  player: Player
  record: NationalTeamWindowRecord
} {
  const {
    nationalTeam,
    player,
    club,
    clubStats,
    teamLevel,
    injured,
    careerSeed,
    startYear,
    windowIndex,
  } = input
  const competition = nationalCompetitionForWindow(startYear, windowIndex)
  const score = nationalTeamSelectionScore({
    player,
    club,
    clubStats,
    injured,
  })
  const eligible =
    !nationalTeam.retired &&
    teamLevel === 'FIRST_TEAM' &&
    playerAgeAtWindow(windowIndex) >= 16
  const role = eligible ? nationalTeamRoleFromScore(score) : null

  if (!role) {
    const reason = nationalTeam.retired
      ? '你已经退出国家队。'
      : teamLevel !== 'FIRST_TEAM'
        ? '本阶段仍在青年队，未进入成年国家队选拔范围。'
        : score < NATIONAL_TEAM_SELECTION_BENCHMARK - 4
          ? `本期选拔分${score.toFixed(1)}，暂未达到国家队征召线。`
          : '国家队本期没有征召你。'
    return {
      nationalTeam: { ...nationalTeam, currentRole: null },
      player,
      record: {
        windowIndex,
        calledUp: false,
        role: null,
        competition,
        stage: null,
        appearances: 0,
        starts: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        averageRating: null,
        selectionScore: score,
        selectionBenchmark: NATIONAL_TEAM_SELECTION_BENCHMARK,
        debut: false,
        summary: reason,
      },
    }
  }

  const random = createRandom(
    careerSeed,
    'national-team',
    windowIndex,
  )
  const playerContribution = clamp(
    (score - NATIONAL_TEAM_SELECTION_BENCHMARK) * 0.35,
    -2,
    4,
  )
  const effectiveStrength =
    CHINA_RANKING_SNAPSHOT.baseStrength +
    CHINA_RANKING_SNAPSHOT.gameplayBonus +
    random.float(-2, 2) +
    playerContribution
  const qualified =
    random.next() < qualificationChance(competition, effectiveStrength)
  const stage = tournamentStage({
    competition,
    effectiveStrength,
    qualified,
    random,
  })
  const scheduledMatches =
    competition === 'INTERNATIONAL_WINDOW'
      ? random.int(3, 5)
      : stage === 'NOT_QUALIFIED'
        ? random.int(2, 4)
        : random.int(4, 7)
  const [appearanceMin, appearanceMax] = roleAppearanceRate(role)
  const appearances = Math.min(
    scheduledMatches,
    Math.max(
      role === 'FRINGE' ? 0 : 1,
      Math.round(
        scheduledMatches * random.float(appearanceMin, appearanceMax),
      ),
    ),
  )
  const [startMin, startMax] = roleStartRate(role)
  const starts = Math.min(
    appearances,
    Math.round(appearances * random.float(startMin, startMax)),
  )
  const minutes = Math.round(
    starts * (67 + player.fitness * 0.22) +
      (appearances - starts) * (11 + player.fitness * 0.2),
  )
  const rates = BASE_RATES[player.primaryPosition]
  const scoringFactor = clamp(
    0.75 + (score - NATIONAL_TEAM_SELECTION_BENCHMARK) * 0.025,
    0.65,
    1.25,
  )
  const goals = poisson(
    random,
    (minutes / 90) * rates.goals * scoringFactor,
  )
  const assists = poisson(
    random,
    (minutes / 90) * rates.assists * scoringFactor,
  )
  const averageRating =
    appearances > 0
      ? roundTenth(
          clamp(
            6.45 +
              (score - NATIONAL_TEAM_SELECTION_BENCHMARK) * 0.035 +
              (goals + assists) * 0.08 +
              random.float(-0.18, 0.18),
            5.7,
            8.5,
          ),
        )
      : null
  const debut = nationalTeam.caps === 0 && appearances > 0
  const stageText = stage ? `，球队成绩${stageLabel(stage)}` : ''
  const summary = debut
    ? `你完成了中国成年国家队首秀，${appearances}场${goals}球${assists}助攻${stageText}。`
    : `${competitionLabel(competition)}获得${appearances}次出场，贡献${goals}球${assists}助攻${stageText}。`
  const record: NationalTeamWindowRecord = {
    windowIndex,
    calledUp: true,
    role,
    competition,
    stage,
    appearances,
    starts,
    minutes,
    goals,
    assists,
    averageRating,
    selectionScore: score,
    selectionBenchmark: NATIONAL_TEAM_SELECTION_BENCHMARK,
    debut,
    summary,
  }
  const reputationGain =
    1 +
    (debut ? 2 : 0) +
    (stage === 'SEMI_FINAL' ||
    stage === 'RUNNER_UP' ||
    stage === 'CHAMPION'
      ? 2
      : 0)

  return {
    nationalTeam: {
      ...nationalTeam,
      currentRole: role,
      caps: nationalTeam.caps + appearances,
      goals: nationalTeam.goals + goals,
      assists: nationalTeam.assists + assists,
      debutWindowIndex:
        nationalTeam.debutWindowIndex ?? (debut ? windowIndex : null),
      history: [...nationalTeam.history, record].slice(-60),
    },
    player: {
      ...player,
      reputation: clamp(player.reputation + reputationGain, 0, 100),
    },
    record,
  }
}

export function attachNationalTeamToReport(input: {
  report: HalfYearReport
  record: NationalTeamWindowRecord
}): HalfYearReport {
  const { report, record } = input
  const nationalHint = record.calledUp
    ? record.summary
    : record.selectionScore >= record.selectionBenchmark - 7
      ? record.summary
      : null
  return {
    ...report,
    nationalTeam: record,
    hints: [nationalHint, ...report.hints]
      .filter((hint): hint is string => Boolean(hint))
      .slice(0, 3),
  }
}
