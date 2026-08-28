import { runtimeClubById } from '../data/clubs/runtimeClubCatalog'
import { clubDisplayNameForCompatibleId } from '../data/clubs/clubChineseNames'
import { resolveClubParametersId } from '../data/clubs/clubRepository'
import { buildRetirementSummary } from '../engine/careerSummary'
import { playerAgeAtWindow } from '../engine/careerTime'
import { calculateOverall } from '../engine/player'
import type {
  CareerHistoryEntry,
  CareerHonor,
  GameState,
  SquadRole,
  TeamLevel,
} from '../models/game'

export interface CareerHistorySeasonView {
  startWindowIndex: number
  endWindowIndex: number
  seasonLabel: string
  age: number
  clubName: string
  teamLevel: TeamLevel
  role: SquadRole
  overall: number
  appearances: number
  goals: number
  assists: number
}

export interface CareerHistoryClubView {
  clubId: string
  clubName: string
  shortMark: string
  country: string
  levelLabel: string
  serviceSpells: Array<{
    firstWindowIndex: number
    lastWindowIndex: number
    label: string
  }>
  teamLevelLabel: string
  appearances: number
  goals: number
  assists: number
  peakOverall: number
  honors: CareerHonor[]
}

export interface CareerHistoryView {
  completedWindows: number
  clubCount: number
  totals: {
    appearances: number
    goals: number
    assists: number
    youthAppearances: number
    seniorAppearances: number
    nationalAppearances: number
  }
  seasons: CareerHistorySeasonView[]
  clubs: CareerHistoryClubView[]
  nationalTeam: {
    appearances: number
    goals: number
    assists: number
    worldCupBest: GameState['nationalTeam']['history'][number]['stage']
    asianCupBest: GameState['nationalTeam']['history'][number]['stage']
  }
  honors: {
    club: CareerHonor[]
    national: CareerHonor[]
    individual: CareerHonor[]
  }
}

function displayClubName(entry: CareerHistoryEntry): string {
  return clubDisplayNameForCompatibleId(
    entry.clubId,
    runtimeClubById.get(entry.clubId)?.name ?? entry.clubName ?? '未知俱乐部',
  )
}

function seasonLabel(startYear: number, startWindowIndex: number): string {
  const seasonStartYear = startYear + startWindowIndex / 2
  return `${seasonStartYear}-${String((seasonStartYear + 1) % 100).padStart(2, '0')}赛季`
}

export function buildCareerHistorySeasons(input: {
  history: readonly CareerHistoryEntry[]
  startYear: number
  primaryPosition: NonNullable<GameState['player']>['primaryPosition']
}): CareerHistorySeasonView[] {
  const historyByWindowIndex = new Map<number, CareerHistoryEntry>()
  for (const entry of input.history) {
    if (!historyByWindowIndex.has(entry.windowIndex)) {
      historyByWindowIndex.set(entry.windowIndex, entry)
    }
  }

  return [...historyByWindowIndex.values()]
    .filter((entry) => entry.windowIndex % 2 === 0)
    .map((summerEntry) => {
      const winterEntry = historyByWindowIndex.get(summerEntry.windowIndex + 1)
      if (!winterEntry || winterEntry.windowIndex % 2 !== 1) return null

      const summerClubName = displayClubName(summerEntry)
      const winterClubName = displayClubName(winterEntry)
      const summerCanonicalClubId = resolveClubParametersId(summerEntry.clubId) ?? summerEntry.clubId
      const winterCanonicalClubId = resolveClubParametersId(winterEntry.clubId) ?? winterEntry.clubId
      return {
        startWindowIndex: summerEntry.windowIndex,
        endWindowIndex: winterEntry.windowIndex,
        seasonLabel: seasonLabel(input.startYear, summerEntry.windowIndex),
        age: playerAgeAtWindow(summerEntry.windowIndex),
        clubName: summerCanonicalClubId === winterCanonicalClubId
          ? winterClubName
          : `${summerClubName} → ${winterClubName}`,
        teamLevel: winterEntry.teamLevel,
        role: winterEntry.role,
        overall: Math.round(calculateOverall(winterEntry.endingAttributes, input.primaryPosition)),
        appearances: summerEntry.stats.appearances + winterEntry.stats.appearances,
        goals: summerEntry.stats.goals + winterEntry.stats.goals,
        assists: summerEntry.stats.assists + winterEntry.stats.assists,
      } satisfies CareerHistorySeasonView
    })
    .filter((season): season is CareerHistorySeasonView => season !== null)
    .sort((left, right) => right.endWindowIndex - left.endWindowIndex)
}

export function buildCareerHistoryView(game: GameState): CareerHistoryView {
  const player = game.player!
  const summary = buildRetirementSummary(game)
  const honors = {
    club: summary.honors.filter((item) => item.scope === 'CLUB'),
    national: summary.honors.filter((item) => item.scope === 'NATIONAL'),
    individual: summary.honors.filter((item) => item.scope === 'INDIVIDUAL'),
  }

  return {
    completedWindows: game.history.length,
    clubCount: summary.clubCount,
    totals: {
      appearances: summary.totals.appearances,
      goals: summary.totals.goals,
      assists: summary.totals.assists,
      youthAppearances: summary.youthTotals.appearances,
      seniorAppearances: summary.seniorTotals.appearances,
      nationalAppearances: summary.nationalTeam.appearances,
    },
    seasons: buildCareerHistorySeasons({
      history: game.history,
      startYear: game.startYear,
      primaryPosition: player.primaryPosition,
    }),
    clubs: summary.clubs.map((club) => ({
      clubId: club.clubId,
      clubName: clubDisplayNameForCompatibleId(club.clubId, club.clubName),
      shortMark: runtimeClubById.get(club.clubId)?.shortMark ?? club.clubName.slice(0, 1),
      country: club.country,
      levelLabel: club.levelLabel,
      serviceSpells: club.serviceSpells.map((spell) => ({ ...spell })),
      teamLevelLabel: club.teamLevelLabel,
      appearances: club.appearances,
      goals: club.goals,
      assists: club.assists,
      peakOverall: club.peakOverall,
      honors: game.history
        .flatMap((entry) => entry.honors ?? [])
        .filter((honor) => honor.scope === 'CLUB' && honor.clubId === club.clubId),
    })),
    nationalTeam: {
      appearances: summary.nationalTeam.appearances,
      goals: summary.nationalTeam.goals,
      assists: summary.nationalTeam.assists,
      worldCupBest: summary.nationalTeam.worldCupBest,
      asianCupBest: summary.nationalTeam.asianCupBest,
    },
    honors,
  }
}
