import { runtimeClubById } from '../data/clubs/runtimeClubCatalog'
import { clubDisplayNameForCompatibleId } from '../data/clubs/clubChineseNames'
import { buildRetirementSummary } from '../engine/careerSummary'
import { careerWindowLabel, playerAgeAtWindow } from '../engine/careerTime'
import { calculateOverall } from '../engine/player'
import type { CareerHonor, GameState, SquadRole, TeamLevel } from '../models/game'

export interface CareerHistoryWindowView {
  windowIndex: number
  windowLabel: string
  age: number
  clubId: string
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
  windows: CareerHistoryWindowView[]
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
    windows: [...game.history]
      .sort((left, right) => right.windowIndex - left.windowIndex)
      .map((entry) => ({
        windowIndex: entry.windowIndex,
        windowLabel: careerWindowLabel(game.startYear, entry.windowIndex),
        age: playerAgeAtWindow(entry.windowIndex),
        clubId: entry.clubId,
        clubName: clubDisplayNameForCompatibleId(
          entry.clubId,
          runtimeClubById.get(entry.clubId)?.name ?? entry.clubName ?? '未知俱乐部',
        ),
        teamLevel: entry.teamLevel,
        role: entry.role,
        overall: Math.round(calculateOverall(entry.endingAttributes, player.primaryPosition)),
        appearances: entry.stats.appearances,
        goals: entry.stats.goals,
        assists: entry.stats.assists,
      })),
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
