import { clubDisplayNameForCompatibleId } from '../data/clubs/clubChineseNames'
import { resolveClubParametersId } from '../data/clubs/clubRepository'
import { CLUBS, runtimeClubById } from '../data/clubs/runtimeClubCatalog'
import type {
  CareerHistoryEntry,
  CareerHonor,
  CareerHonorType,
  Club,
  GameState,
  HalfYearStats,
  NationalTeamCompetition,
  NationalTeamStage,
  TeamLevel,
} from '../models/game'
import { clubLevelLabel } from '../ui/format'
import { careerWindowLabel, playerAgeAtWindow } from './careerTime'
import { calculateOverall } from './player'
import { careerHonors } from './honors'

interface CareerTotals {
  appearances: number
  starts: number
  goals: number
  assists: number
  minutes: number
}

export interface ClubCareerSummary extends CareerTotals {
  clubId: string
  clubName: string
  country: string
  levelLabel: string
  firstWindowIndex: number
  lastWindowIndex: number
  windows: number
  serviceLabel: string
  serviceSpells: Array<{
    firstWindowIndex: number
    lastWindowIndex: number
    label: string
  }>
  teamLevels: TeamLevel[]
  teamLevelLabel: string
  peakOverall: number
  honors: string[]
}

export interface NationalCareerSummary {
  appearances: number
  goals: number
  assists: number
  worldCupBest: NationalTeamStage | null
  asianCupBest: NationalTeamStage | null
}

export interface CareerTag {
  id: string
  label: string
  reason: string
  score: number
}

export interface CareerEvaluation {
  title: string
  summary: string
  provisionalScore: number
  completedPoints: number
  completedPointsMaximum: 100
  reservedPoints: 0
  dimensions: {
    clubPerformance: number
    nationalTeam: number
    peakAndPlatform: number
    longevity: number
    collectiveHonors: number
    personalHonors: number
  }
}

export interface RetirementSummary {
  age: number
  finalOverall: number
  peakOverall: number
  peakAge: number
  potentialOverall: number
  fulfillmentPercent: number
  finalMarketValueEuro: number
  peakMarketValueEuro: number
  peakMarketValueAge: number
  totals: CareerTotals
  youthTotals: CareerTotals
  seniorTotals: CareerTotals
  nationalTeam: NationalCareerSummary
  honors: CareerHonor[]
  clubs: ClubCareerSummary[]
  clubCount: number
  tags: CareerTag[]
  evaluation: CareerEvaluation
}

const EMPTY_TOTALS: CareerTotals = {
  appearances: 0,
  starts: 0,
  goals: 0,
  assists: 0,
  minutes: 0,
}

const MARKET_VALUE_ANCHORS = [
  [34, 10_000],
  [40, 30_000],
  [49, 100_000],
  [59, 500_000],
  [69, 3_000_000],
  [76, 12_000_000],
  [84, 60_000_000],
  [89, 120_000_000],
  [94, 200_000_000],
] as const

const NATIONAL_STAGE_RANK: Record<NationalTeamStage, number> = {
  NOT_QUALIFIED: 0,
  GROUP_STAGE: 1,
  ROUND_OF_16: 2,
  QUARTER_FINAL: 3,
  SEMI_FINAL: 4,
  RUNNER_UP: 5,
  CHAMPION: 6,
}

const HONOR_POINTS: Record<CareerHonorType, number> = {
  LEAGUE_TITLE: 4,
  DOMESTIC_CUP: 2,
  CONTINENTAL_TITLE: 7,
  WORLD_CUP: 10,
  ASIAN_CUP: 6,
  GOLDEN_BOOT: 3,
  TEAM_OF_SEASON: 2,
  LEAGUE_PLAYER_OF_YEAR: 5,
  BALLON_DOR: 10,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function addStats(total: CareerTotals, stats: HalfYearStats): CareerTotals {
  return {
    appearances: total.appearances + stats.appearances,
    starts: total.starts + stats.starts,
    goals: total.goals + stats.goals,
    assists: total.assists + stats.assists,
    minutes: total.minutes + stats.minutes,
  }
}

function sumHistory(
  history: CareerHistoryEntry[],
  predicate: (entry: CareerHistoryEntry) => boolean = () => true,
): CareerTotals {
  return history.filter(predicate).reduce(
    (total, entry) => addStats(total, entry.stats),
    { ...EMPTY_TOTALS },
  )
}

function marketAnchorValue(overall: number): number {
  if (overall <= MARKET_VALUE_ANCHORS[0][0]) {
    return MARKET_VALUE_ANCHORS[0][1]
  }
  for (let index = 1; index < MARKET_VALUE_ANCHORS.length; index += 1) {
    const previous = MARKET_VALUE_ANCHORS[index - 1]!
    const current = MARKET_VALUE_ANCHORS[index]!
    if (overall <= current[0]) {
      const progress = (overall - previous[0]) / (current[0] - previous[0])
      return previous[1] * Math.pow(current[1] / previous[1], progress)
    }
  }
  return MARKET_VALUE_ANCHORS.at(-1)![1]
}

function ageMarketMultiplier(age: number): number {
  if (age <= 18) return 1.05
  if (age <= 21) return 1.25
  if (age <= 24) return 1.38
  if (age <= 28) return 1.28
  if (age <= 31) return 1.02
  if (age <= 34) return 0.72
  if (age <= 37) return 0.42
  return 0.2
}

export function estimateMarketValueEuro(input: {
  overall: number
  age: number
  clubTier?: Club['tier'] | undefined
  averageRating?: number
}): number {
  const { overall, age, clubTier = 5, averageRating = 6.7 } = input
  const platformMultiplier = [0, 1.38, 1.22, 1.06, 0.9, 0.72, 0.56][clubTier]!
  const performanceMultiplier = clamp(0.86 + (averageRating - 6.3) * 0.18, 0.82, 1.18)
  const raw =
    marketAnchorValue(overall) *
    ageMarketMultiplier(age) *
    platformMultiplier *
    performanceMultiplier
  const roundUnit = raw >= 10_000_000 ? 100_000 : raw >= 1_000_000 ? 50_000 : 5_000
  return clamp(Math.round(raw / roundUnit) * roundUnit, 5_000, 250_000_000)
}

function clubForHistory(game: GameState, clubId: string): Club | null {
  const canonicalId = resolveClubParametersId(clubId) ?? clubId
  return (
    game.academyOffers.find((offer) => offer.club.id === canonicalId)?.club ??
    runtimeClubById.get(canonicalId) ??
    CLUBS.find((club) => club.id === canonicalId) ??
    null
  )
}

function compactWindowLabel(startYear: number, windowIndex: number): string {
  return careerWindowLabel(startYear, windowIndex)
    .replace('年夏季', '夏')
    .replace('年冬季', '冬')
}

function teamLevelSummary(levels: Set<TeamLevel>): {
  teamLevels: TeamLevel[]
  teamLevelLabel: string
} {
  const teamLevels = [...levels].sort((a) => (a === 'YOUTH' ? -1 : 1))
  if (teamLevels.length === 2) {
    return { teamLevels, teamLevelLabel: '青年队 / 一线队' }
  }
  return {
    teamLevels,
    teamLevelLabel: teamLevels[0] === 'FIRST_TEAM' ? '一线队' : '青年队',
  }
}

function serviceSpellsForEntries(
  startYear: number,
  entries: CareerHistoryEntry[],
): ClubCareerSummary['serviceSpells'] {
  const sorted = [...entries].sort((a, b) => a.windowIndex - b.windowIndex)
  const spells: Array<{ firstWindowIndex: number; lastWindowIndex: number }> = []

  for (const entry of sorted) {
    const current = spells.at(-1)
    if (current && entry.windowIndex === current.lastWindowIndex + 1) {
      current.lastWindowIndex = entry.windowIndex
    } else {
      spells.push({
        firstWindowIndex: entry.windowIndex,
        lastWindowIndex: entry.windowIndex,
      })
    }
  }

  return spells.map((spell) => ({
    ...spell,
    label:
      spell.firstWindowIndex === spell.lastWindowIndex
        ? compactWindowLabel(startYear, spell.firstWindowIndex)
        : `${compactWindowLabel(startYear, spell.firstWindowIndex)}—${compactWindowLabel(startYear, spell.lastWindowIndex)}`,
  }))
}

function aggregateClubs(game: GameState): ClubCareerSummary[] {
  const player = game.player!
  const grouped = new Map<
    string,
    {
      entries: CareerHistoryEntry[]
      totals: CareerTotals
      levels: Set<TeamLevel>
      peakOverall: number
    }
  >()

  for (const entry of game.history) {
    const existing = grouped.get(entry.clubId) ?? {
      entries: [],
      totals: { ...EMPTY_TOTALS },
      levels: new Set<TeamLevel>(),
      peakOverall: 0,
    }
    existing.entries.push(entry)
    existing.totals = addStats(existing.totals, entry.stats)
    existing.levels.add(entry.teamLevel)
    existing.peakOverall = Math.max(
      existing.peakOverall,
      Math.round(calculateOverall(entry.endingAttributes, player.primaryPosition)),
    )
    grouped.set(entry.clubId, existing)
  }

  return [...grouped.entries()]
    .map(([clubId, group]) => {
      const firstWindowIndex = Math.min(...group.entries.map((entry) => entry.windowIndex))
      const lastWindowIndex = Math.max(...group.entries.map((entry) => entry.windowIndex))
      const club = clubForHistory(game, clubId)
      const levels = teamLevelSummary(group.levels)
      const serviceSpells = serviceSpellsForEntries(
        game.startYear,
        group.entries,
      )
      return {
        clubId,
        clubName: clubDisplayNameForCompatibleId(
          clubId,
          club?.name ?? group.entries.at(-1)?.clubName ?? '未知俱乐部',
        ),
        country: club?.country ?? '—',
        levelLabel: club ? clubLevelLabel(club) : '俱乐部级别待补充',
        firstWindowIndex,
        lastWindowIndex,
        windows: group.entries.length,
        serviceLabel: serviceSpells.map((spell) => spell.label).join('、'),
        serviceSpells,
        ...levels,
        ...group.totals,
        peakOverall: group.peakOverall,
        honors: group.entries
          .flatMap((entry) => entry.honors ?? [])
          .filter(
            (item) => item.scope === 'CLUB' && item.clubId === clubId,
          )
          .map((item) => item.label),
      }
    })
    .sort((a, b) => a.firstWindowIndex - b.firstWindowIndex)
}

function buildTags(input: {
  game: GameState
  clubs: ClubCareerSummary[]
  seniorTotals: CareerTotals
  peakOverall: number
  peakAge: number
  fulfillmentPercent: number
  honors: CareerHonor[]
}): CareerTag[] {
  const {
    game,
    clubs,
    seniorTotals,
    peakOverall,
    peakAge,
    fulfillmentPercent,
    honors,
  } = input
  const player = game.player!
  const seniorWindows = game.history.filter((entry) => entry.teamLevel === 'FIRST_TEAM').length
  const totalWindows = game.history.length
  const mostClubWindows = Math.max(0, ...clubs.map((club) => club.windows))
  const overseasSeniorWindows = game.history.filter((entry) => {
    const club = clubForHistory(game, entry.clubId)
    return entry.teamLevel === 'FIRST_TEAM' && club?.country !== '中国'
  }).length
  const candidates: CareerTag[] = []
  const add = (id: string, label: string, reason: string, score: number) => {
    candidates.push({ id, label, reason, score })
  }

  if (clubs.length === 1 && totalWindows >= 20) {
    add('ONE_CLUB', '一人一队', `全部${totalWindows}个窗口都效力同一家俱乐部`, 100)
  } else if (mostClubWindows >= Math.max(12, totalWindows * 0.65)) {
    add('LOYAL', '球队忠魂', '职业生涯的大部分时光都交给了同一家俱乐部', 88)
  }
  if (clubs.length >= 6) {
    add('GLOBE_TROTTER', '四海为家', `职业生涯先后效力${clubs.length}家俱乐部`, 85)
  } else if (clubs.length >= 4) {
    add('JOURNEYMAN', '绿茵浪子', `在${clubs.length}家俱乐部留下足迹`, 72)
  }
  if (overseasSeniorWindows >= 16 && peakOverall >= 75) {
    add('OVERSEAS_FLAG', '留洋旗帜', '在海外一线队长期立足并达到高水平', 92)
  } else if (overseasSeniorWindows >= 6) {
    add('OVERSEAS_PLAYER', '旅欧名将', '在海外一线队赢得了持续出场', 76)
  }
  if (game.nationalTeam.caps >= 80) {
    add('CHINA_FLAG', '中国足球旗帜', `为国家队出场${game.nationalTeam.caps}次`, 95)
  } else if (game.nationalTeam.caps >= 30) {
    add('INTERNATIONAL', '国足中坚', `为国家队出场${game.nationalTeam.caps}次`, 78)
  }
  if (game.nationalTeam.goals + game.nationalTeam.assists >= 30) {
    add('NATIONAL_HERO', '国家队英雄', '在国家队贡献了大量关键进球与助攻', 88)
  }
  const collectiveHonorCount = honors.filter(
    (item) => item.scope !== 'INDIVIDUAL',
  ).length
  if (honors.some((item) => item.type === 'BALLON_DOR')) {
    add('BALLON_DOR_WINNER', '金球先生', '登上世界个人荣誉的最高领奖台', 99)
  }
  if (honors.some((item) => item.type === 'WORLD_CUP')) {
    add('WORLD_CHAMPION', '世界冠军', '随中国国家队捧起世界杯冠军奖杯', 98)
  } else if (collectiveHonorCount >= 5) {
    add('SERIAL_WINNER', '冠军收割者', `球员生涯赢得${collectiveHonorCount}项集体荣誉`, 90)
  } else if (collectiveHonorCount >= 2) {
    add('WINNER', '冠军球员', `球员生涯赢得${collectiveHonorCount}项集体荣誉`, 78)
  }
  if (playerAgeAtWindow(game.windowIndex) >= 37 && seniorWindows >= 30) {
    add('EVERGREEN', '常青树', '保持竞争力直至生涯暮年', 86)
  }
  if (seniorTotals.appearances >= seniorWindows * 12 && seniorWindows >= 12) {
    add('IRONMAN', '铁人', '多年保持稳定的比赛出勤', 80)
  }
  if (peakAge >= 28 && peakOverall >= 70) {
    add('LATE_BLOOMER', '大器晚成', `${peakAge}岁抵达能力巅峰`, 72)
  }
  if (fulfillmentPercent < 78 && peakOverall >= 60) {
    add('UNFULFILLED', '天才未竟', '巅峰表现与隐藏潜力之间仍留有距离', 84)
  }
  if (player.squadRelation >= 72 && player.coachRelation >= 65) {
    add('LEADER', '领袖', '赢得教练和更衣室的共同信任', 82)
  }
  if (player.squadRelation >= 68 && player.fanRelation >= 68) {
    add('DIPLOMAT', '外交官', '在队友与球迷之间都拥有良好口碑', 74)
  }
  if (seniorTotals.appearances >= 150) {
    add('PROFESSIONAL', '模范职业人', '用长期稳定的职业履历证明自己', 70)
  }

  const unique = new Map<string, CareerTag>()
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (!unique.has(candidate.id)) unique.set(candidate.id, candidate)
  }
  const fallbacks: CareerTag[] = [
    { id: 'ACADEMY_GRADUATE', label: '青训出品', reason: '从13岁青训起步完成整段球员生涯', score: 42 },
    { id: 'CAREER_PLAYER', label: '职业球员', reason: '在职业足球世界留下了正式履历', score: 40 },
    { id: 'PERSISTENT', label: '坚持到底', reason: '把球员生涯完整地写到了终场', score: 38 },
  ]
  for (const fallback of fallbacks) {
    if (unique.size >= 3) break
    unique.set(fallback.id, fallback)
  }
  return [...unique.values()].slice(0, 8)
}

function bestNationalStage(
  game: GameState,
  competition?: NationalTeamCompetition,
): NationalTeamStage | null {
  return game.nationalTeam.history.reduce<NationalTeamStage | null>((best, record) => {
    if (competition && record.competition !== competition) return best
    if (!record.stage) return best
    if (!best || NATIONAL_STAGE_RANK[record.stage] > NATIONAL_STAGE_RANK[best]) {
      return record.stage
    }
    return best
  }, null)
}

function buildEvaluation(input: {
  game: GameState
  clubs: ClubCareerSummary[]
  seniorTotals: CareerTotals
  peakOverall: number
  fulfillmentPercent: number
  honors: CareerHonor[]
}): CareerEvaluation {
  const { game, clubs, seniorTotals, peakOverall, fulfillmentPercent, honors } = input
  const seniorEntries = game.history.filter((entry) => entry.teamLevel === 'FIRST_TEAM')
  const averageRating = seniorEntries.length
    ? seniorEntries.reduce((sum, entry) => sum + entry.stats.averageRating, 0) / seniorEntries.length
    : 0
  const production = seniorTotals.goals + seniorTotals.assists
  const clubPerformance = clamp(
    (seniorTotals.appearances / 300) * 10 +
      (production / 140) * 7 +
      Math.max(0, averageRating - 6) * 4,
    0,
    25,
  )
  const stage = bestNationalStage(game)
  const stagePoints = stage ? (NATIONAL_STAGE_RANK[stage] / 6) * 2 : 0
  const nationalTeam = clamp(
    (game.nationalTeam.caps / 80) * 8 +
      ((game.nationalTeam.goals + game.nationalTeam.assists) / 35) * 5 +
      stagePoints,
    0,
    15,
  )
  const bestTier = Math.min(
    6,
    ...game.history.map((entry) => clubForHistory(game, entry.clubId)?.tier ?? 6),
  )
  const peakAndPlatform = clamp(
    ((peakOverall - 50) / 35) * 10 + (7 - bestTier) * (5 / 6),
    0,
    15,
  )
  const longevity = clamp((seniorEntries.length / 40) * 5, 0, 5)
  const collectiveHonors = clamp(
    honors
      .filter((item) => item.scope !== 'INDIVIDUAL')
      .reduce((sum, item) => sum + HONOR_POINTS[item.type], 0),
    0,
    25,
  )
  const personalHonors = clamp(
    honors
      .filter((item) => item.scope === 'INDIVIDUAL')
      .reduce((sum, item) => sum + HONOR_POINTS[item.type], 0),
    0,
    15,
  )
  const completedPoints =
    clubPerformance +
    nationalTeam +
    peakAndPlatform +
    longevity +
    collectiveHonors +
    personalHonors
  const provisionalScore = Math.min(100, Math.round(completedPoints))

  let title = '坚实职业生涯'
  let summary = '你在职业足球中留下了清晰、完整而可信的足迹。'
  if (
    honors.some((item) => item.type === 'BALLON_DOR') ||
    (peakOverall >= 85 && bestTier <= 2)
  ) {
    title = '世界级名将'
    summary = '你在最高水平的舞台兑现了天赋，成为这个时代的重要名字。'
  } else if (game.nationalTeam.caps >= 60 && peakOverall >= 75) {
    title = '中国足球旗帜'
    summary = '俱乐部履历与国家队担当共同定义了你的球员生涯。'
  } else if (clubs.length === 1 && seniorTotals.appearances >= 150) {
    title = '一队传奇'
    summary = '忠诚、出场与岁月，让你的名字和同一家俱乐部牢牢相连。'
  } else if (fulfillmentPercent < 78 && peakOverall >= 60) {
    title = '天赋未竟'
    summary = '你曾让人看见更高的可能，也留下了值得反复回想的遗憾。'
  } else if (completedPoints >= 70) {
    title = '卓越职业生涯'
    summary = '长期表现、平台高度与职业寿命共同写成了一段出色生涯。'
  }

  return {
    title,
    summary,
    provisionalScore,
    completedPoints: provisionalScore,
    completedPointsMaximum: 100,
    reservedPoints: 0,
    dimensions: {
      clubPerformance: Math.round(clubPerformance),
      nationalTeam: Math.round(nationalTeam),
      peakAndPlatform: Math.round(peakAndPlatform),
      longevity: Math.round(longevity),
      collectiveHonors: Math.round(collectiveHonors),
      personalHonors: Math.round(personalHonors),
    },
  }
}

export function buildRetirementSummary(game: GameState): RetirementSummary {
  if (!game.player) throw new Error('Retirement summary requires a player.')
  const player = game.player
  const finalOverall = Math.round(calculateOverall(player.attributes, player.primaryPosition))
  const potentialOverall = Math.round(calculateOverall(player.potentials, player.primaryPosition))
  const historyPeaks = game.history.map((entry) => ({
    entry,
    overall: Math.round(calculateOverall(entry.endingAttributes, player.primaryPosition)),
  }))
  const peakRecord = historyPeaks.reduce(
    (best, candidate) => (candidate.overall > best.overall ? candidate : best),
    {
      entry: game.history.at(-1) ?? null,
      overall: finalOverall,
    } as { entry: CareerHistoryEntry | null; overall: number },
  )
  const peakOverall = Math.max(finalOverall, peakRecord.overall)
  const peakAge = peakRecord.entry ? playerAgeAtWindow(peakRecord.entry.windowIndex) : playerAgeAtWindow(game.windowIndex)
  const clubs = aggregateClubs(game)
  const totals = sumHistory(game.history)
  const youthTotals = sumHistory(game.history, (entry) => entry.teamLevel === 'YOUTH')
  const seniorTotals = sumHistory(game.history, (entry) => entry.teamLevel === 'FIRST_TEAM')
  const currentClub = game.selectedClubId ? clubForHistory(game, game.selectedClubId) : null
  const finalRating = game.lastReport?.stats.averageRating ?? 6.7
  const finalMarketValueEuro = estimateMarketValueEuro({
    overall: finalOverall,
    age: playerAgeAtWindow(game.windowIndex),
    clubTier: currentClub?.tier,
    averageRating: finalRating,
  })
  const marketRecords = historyPeaks.map(({ entry, overall }) => {
    const club = clubForHistory(game, entry.clubId)
    return {
      age: playerAgeAtWindow(entry.windowIndex),
      value: estimateMarketValueEuro({
        overall,
        age: playerAgeAtWindow(entry.windowIndex),
        clubTier: club?.tier,
        averageRating: entry.stats.averageRating,
      }),
    }
  })
  marketRecords.push({ age: playerAgeAtWindow(game.windowIndex), value: finalMarketValueEuro })
  const peakMarketRecord = marketRecords.reduce((best, candidate) =>
    candidate.value > best.value ? candidate : best,
  )
  const fulfillmentPercent = clamp(Math.round((peakOverall / Math.max(1, potentialOverall)) * 100), 0, 100)
  const honors = careerHonors(game.history)
  const evaluation = buildEvaluation({
    game,
    clubs,
    seniorTotals,
    peakOverall,
    fulfillmentPercent,
    honors,
  })
  const tags = buildTags({
    game,
    clubs,
    seniorTotals,
    peakOverall,
    peakAge,
    fulfillmentPercent,
    honors,
  })

  return {
    age: playerAgeAtWindow(game.windowIndex),
    finalOverall,
    peakOverall,
    peakAge,
    potentialOverall,
    fulfillmentPercent,
    finalMarketValueEuro,
    peakMarketValueEuro: peakMarketRecord.value,
    peakMarketValueAge: peakMarketRecord.age,
    totals,
    youthTotals,
    seniorTotals,
    nationalTeam: {
      appearances: game.nationalTeam.caps,
      goals: game.nationalTeam.goals,
      assists: game.nationalTeam.assists,
      worldCupBest: bestNationalStage(game, 'WORLD_CUP'),
      asianCupBest: bestNationalStage(game, 'ASIAN_CUP'),
    },
    honors,
    clubs,
    clubCount: clubs.length,
    tags,
    evaluation,
  }
}
