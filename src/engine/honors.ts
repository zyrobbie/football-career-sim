import type {
  CareerHistoryEntry,
  CareerHonor,
  CareerHonorType,
  Club,
  ClubCompetitionStage,
  ClubSeasonResult,
  HalfYearStats,
  NationalTeamWindowRecord,
  Player,
  TeamLevel,
} from '../models/game'
import { calculateOverall } from './player'
import { createRandom, weightedPick } from './random'

const LEAGUE_TEAMS = 18

const EXPECTED_POSITION: Record<Club['tier'], number> = {
  1: 2,
  2: 3,
  3: 5,
  4: 8,
  5: 11,
  6: 14,
}

const EUROPE = new Set(['英格兰', '西班牙', '意大利', '德国', '法国', '荷兰', '葡萄牙', '比利时'])
const ASIA = new Set(['中国', '日本', '韩国'])
const SOUTH_AMERICA = new Set(['巴西', '阿根廷'])

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function seasonLabel(startYear: number, windowIndex: number): string {
  return `${startYear + Math.floor(windowIndex / 2)}赛季`
}

function continentalLabel(club: Club): string | null {
  if (EUROPE.has(club.country)) return '欧洲冠军联赛'
  if (ASIA.has(club.country)) return '亚洲冠军联赛'
  if (SOUTH_AMERICA.has(club.country)) return '南美解放者杯'
  return null
}

function isTopDivision(club: Club): boolean {
  return !club.leagueLabel.includes('次级')
}

function stageLabel(stage: ClubCompetitionStage): string {
  return {
    NOT_ENTERED: '未参赛',
    EARLY_EXIT: '早期出局',
    ROUND_OF_16: '16强',
    QUARTER_FINAL: '8强',
    SEMI_FINAL: '4强',
    RUNNER_UP: '亚军',
    CHAMPION: '冠军',
  }[stage]
}

function knockoutStage(
  strength: number,
  random: ReturnType<typeof createRandom>,
): ClubCompetitionStage {
  return weightedPick(random, [
    { value: 'EARLY_EXIT' as const, weight: clamp(32 - strength * 0.25, 8, 30) },
    { value: 'ROUND_OF_16' as const, weight: clamp(28 - strength * 0.12, 12, 26) },
    { value: 'QUARTER_FINAL' as const, weight: 20 },
    { value: 'SEMI_FINAL' as const, weight: 12 + strength * 0.08 },
    { value: 'RUNNER_UP' as const, weight: 6 + strength * 0.06 },
    { value: 'CHAMPION' as const, weight: 3 + strength * 0.12 },
  ])
}

function seasonStats(input: {
  history: CareerHistoryEntry[]
  windowIndex: number
  clubId: string
  current: HalfYearStats
}): HalfYearStats {
  const { history, windowIndex, clubId, current } = input
  const previous = history.find(
    (entry) =>
      entry.windowIndex === windowIndex - 1 &&
      entry.clubId === clubId &&
      entry.teamLevel === 'FIRST_TEAM',
  )?.stats
  if (!previous) return current
  const appearances = previous.appearances + current.appearances
  return {
    appearances,
    starts: previous.starts + current.starts,
    minutes: previous.minutes + current.minutes,
    goals: previous.goals + current.goals,
    assists: previous.assists + current.assists,
    yellowCards: previous.yellowCards + current.yellowCards,
    redCards: previous.redCards + current.redCards,
    averageRating:
      appearances > 0
        ? (previous.averageRating * previous.appearances +
            current.averageRating * current.appearances) /
          appearances
        : current.averageRating,
  }
}

function honor(input: {
  type: CareerHonorType
  scope: CareerHonor['scope']
  label: string
  competitionLabel: string
  seasonLabel: string
  windowIndex: number
  club?: Club | null
}): CareerHonor {
  const { type, scope, label, competitionLabel, seasonLabel, windowIndex, club = null } = input
  return {
    id: `${type}:${windowIndex}:${club?.id ?? 'CHN'}`,
    type,
    scope,
    label,
    competitionLabel,
    seasonLabel,
    windowIndex,
    clubId: club?.id ?? null,
    clubName: club?.name ?? null,
  }
}

function clubSeasonResult(input: {
  player: Player
  club: Club
  stats: HalfYearStats
  careerSeed: string
  startYear: number
  windowIndex: number
}): ClubSeasonResult {
  const { player, club, stats, careerSeed, startYear, windowIndex } = input
  const random = createRandom(careerSeed, 'club-season', windowIndex, club.id)
  const overall = calculateOverall(player.attributes, player.primaryPosition)
  const playerImpact = clamp(
    (stats.averageRating - 6.6) * 0.9 +
      (stats.goals + stats.assists) * 0.025 +
      (overall - 65) * 0.02,
    -1.2,
    1.5,
  )
  const profileShift = club.profile === 'ELITE' ? -0.6 : club.profile === 'SMALL' ? 0.6 : 0
  const leaguePosition = clamp(
    Math.round(EXPECTED_POSITION[club.tier] + profileShift - playerImpact + random.float(-2.4, 2.4)),
    1,
    LEAGUE_TEAMS,
  )
  const strength = clamp(100 - club.tier * 11 + playerImpact * 5, 25, 95)
  const domesticCupStage = knockoutStage(strength, random)
  const continental = continentalLabel(club)
  const qualificationChance = [0, 0.96, 0.82, 0.58, 0.3, 0.14, 0.04][club.tier]!
  const enteredContinental =
    Boolean(continental) &&
    isTopDivision(club) &&
    random.next() < qualificationChance
  const continentalStage = enteredContinental
    ? knockoutStage(strength - 9, random)
    : 'NOT_ENTERED'
  const achievements = [
    leaguePosition === 1 ? '联赛冠军' : `联赛第${leaguePosition}名`,
    domesticCupStage === 'CHAMPION' ? '国内杯赛冠军' : null,
    continentalStage === 'CHAMPION' && continental ? `${continental}冠军` : null,
  ].filter((item): item is string => Boolean(item))

  return {
    seasonLabel: seasonLabel(startYear, windowIndex),
    leagueLabel: club.leagueLabel,
    leaguePosition,
    leagueTeams: LEAGUE_TEAMS,
    domesticCupStage,
    continentalLabel: continental,
    continentalStage,
    summary: `${club.name}以${achievements.join('、')}结束本赛季；国内杯赛${stageLabel(domesticCupStage)}${continental ? `，${continental}${stageLabel(continentalStage)}` : ''}。`,
  }
}

function reputationForHonor(type: CareerHonorType): number {
  return {
    LEAGUE_TITLE: 2,
    DOMESTIC_CUP: 1,
    CONTINENTAL_TITLE: 3,
    WORLD_CUP: 5,
    ASIAN_CUP: 3,
    GOLDEN_BOOT: 3,
    TEAM_OF_SEASON: 2,
    LEAGUE_PLAYER_OF_YEAR: 4,
    BALLON_DOR: 8,
  }[type]
}

export function settleHonorsForWindow(input: {
  player: Player
  club: Club
  stats: HalfYearStats
  teamLevel: TeamLevel
  careerSeed: string
  startYear: number
  windowIndex: number
  history: CareerHistoryEntry[]
  nationalRecord: NationalTeamWindowRecord | null
}): {
  clubSeason: ClubSeasonResult | null
  honors: CareerHonor[]
  reputationDelta: number
} {
  const {
    player,
    club,
    stats,
    teamLevel,
    careerSeed,
    startYear,
    windowIndex,
    history,
    nationalRecord,
  } = input
  const label = seasonLabel(startYear, windowIndex)
  const honors: CareerHonor[] = []
  let season: ClubSeasonResult | null = null

  if (teamLevel === 'FIRST_TEAM' && windowIndex % 2 === 1) {
    const totals = seasonStats({ history, windowIndex, clubId: club.id, current: stats })
    season = clubSeasonResult({
      player,
      club,
      stats: totals,
      careerSeed,
      startYear,
      windowIndex,
    })
    const eligibleForTeamHonor = totals.appearances >= 8 || totals.minutes >= 600
    if (eligibleForTeamHonor && season.leaguePosition === 1) {
      honors.push(honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', label: `${label}${club.leagueLabel}冠军`, competitionLabel: club.leagueLabel, seasonLabel: label, windowIndex, club }))
    }
    if (eligibleForTeamHonor && season.domesticCupStage === 'CHAMPION') {
      honors.push(honor({ type: 'DOMESTIC_CUP', scope: 'CLUB', label: `${label}国内杯赛冠军`, competitionLabel: '国内杯赛', seasonLabel: label, windowIndex, club }))
    }
    if (eligibleForTeamHonor && season.continentalStage === 'CHAMPION' && season.continentalLabel) {
      honors.push(honor({ type: 'CONTINENTAL_TITLE', scope: 'CLUB', label: `${label}${season.continentalLabel}冠军`, competitionLabel: season.continentalLabel, seasonLabel: label, windowIndex, club }))
    }

    const awardRandom = createRandom(careerSeed, 'personal-honors', windowIndex, club.id)
    const overall = calculateOverall(player.attributes, player.primaryPosition)
    const production = totals.goals + totals.assists
    const topDivision = isTopDivision(club)
    if (topDivision && totals.goals >= awardRandom.int(14, 22)) {
      honors.push(honor({ type: 'GOLDEN_BOOT', scope: 'INDIVIDUAL', label: `${label}${club.leagueLabel}金靴`, competitionLabel: club.leagueLabel, seasonLabel: label, windowIndex, club }))
    }
    const teamOfSeasonScore = totals.averageRating * 10 + totals.appearances * 0.25 + overall * 0.15
    if (topDivision && totals.appearances >= 20 && teamOfSeasonScore >= awardRandom.float(87, 94)) {
      honors.push(honor({ type: 'TEAM_OF_SEASON', scope: 'INDIVIDUAL', label: `${label}${club.leagueLabel}赛季最佳阵容`, competitionLabel: club.leagueLabel, seasonLabel: label, windowIndex, club }))
    }
    const playerOfYearScore = totals.averageRating * 10 + production * 0.45 + overall * 0.12 + (season.leaguePosition <= 4 ? 5 : 0)
    if (topDivision && totals.appearances >= 24 && playerOfYearScore >= awardRandom.float(96, 106)) {
      honors.push(honor({ type: 'LEAGUE_PLAYER_OF_YEAR', scope: 'INDIVIDUAL', label: `${label}${club.leagueLabel}最佳球员`, competitionLabel: club.leagueLabel, seasonLabel: label, windowIndex, club }))
    }
    const majorTitleBonus = honors.some((item) => item.type === 'CONTINENTAL_TITLE') ? 8 : honors.some((item) => item.type === 'LEAGUE_TITLE') ? 4 : 0
    const ballonScore = totals.averageRating * 10 + production * 0.35 + overall * 0.25 + majorTitleBonus
    if (club.tier <= 2 && totals.appearances >= 24 && overall >= 84 && ballonScore >= awardRandom.float(114, 124)) {
      honors.push(honor({ type: 'BALLON_DOR', scope: 'INDIVIDUAL', label: `${label}金球奖`, competitionLabel: '金球奖', seasonLabel: label, windowIndex, club }))
    }
  }

  if (
    nationalRecord?.calledUp &&
    nationalRecord.appearances > 0 &&
    nationalRecord.stage === 'CHAMPION'
  ) {
    if (nationalRecord.competition === 'WORLD_CUP') {
      honors.push(honor({ type: 'WORLD_CUP', scope: 'NATIONAL', label: `${label}世界杯冠军`, competitionLabel: '世界杯', seasonLabel: label, windowIndex }))
    }
    if (nationalRecord.competition === 'ASIAN_CUP') {
      honors.push(honor({ type: 'ASIAN_CUP', scope: 'NATIONAL', label: `${label}亚洲杯冠军`, competitionLabel: '亚洲杯', seasonLabel: label, windowIndex }))
    }
  }

  return {
    clubSeason: season,
    honors,
    reputationDelta: honors.reduce((sum, item) => sum + reputationForHonor(item.type), 0),
  }
}

export function careerHonors(history: CareerHistoryEntry[]): CareerHonor[] {
  return history.flatMap((entry) => entry.honors ?? [])
}
