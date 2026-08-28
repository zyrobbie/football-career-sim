import { beforeEach, describe, expect, it } from 'vitest'
import { calculateOverall } from '../engine/player'
import { buildRetirementSummary } from '../engine/careerSummary'
import type { CareerHistoryEntry, CareerHonor, GameState, SquadRole, TeamLevel } from '../models/game'
import { useGameStore } from '../store/gameStore'
import { buildCareerHistorySeasons, buildCareerHistoryView } from './careerHistoryView'

function createCareer(): GameState {
  const store = useGameStore.getState()
  store.startNewCareer()
  store.submitIdentity({ name: '履历测试', jerseyNumber: 10, preferredFoot: 'RIGHT' })
  store.submitPosition('ST', 'LW')
  store.submitPriorities(['PLAYING_TIME', 'COMPETITIVE_LEVEL', 'SALARY', 'STABILITY'])
  store.submitPreferences('CONDITIONAL', [])
  store.confirmPlayer()
  return useGameStore.getState().game!
}

function honor(scope: CareerHonor['scope'], id: string): CareerHonor {
  return {
    id,
    type: scope === 'INDIVIDUAL' ? 'TEAM_OF_SEASON' : scope === 'NATIONAL' ? 'ASIAN_CUP' : 'LEAGUE_TITLE',
    scope,
    label: `${scope} 荣誉`,
    competitionLabel: '测试赛事',
    seasonLabel: '2028赛季',
    windowIndex: 4,
    clubId: scope === 'NATIONAL' ? null : 'ita_inter',
    clubName: scope === 'NATIONAL' ? null : '国际米兰',
  }
}

function entry(input: {
  game: GameState
  windowIndex: number
  clubId: string
  clubName: string
  teamLevel: TeamLevel
  appearances: number
  goals?: number
  assists?: number
  role?: SquadRole
  honors?: CareerHonor[]
}): CareerHistoryEntry {
  return {
    windowIndex: input.windowIndex,
    clubId: input.clubId,
    clubName: input.clubName,
    role: input.role ?? (input.teamLevel === 'FIRST_TEAM' ? 'STARTER' : 'CORE'),
    stats: { appearances: input.appearances, starts: input.appearances, minutes: input.appearances * 80, goals: input.goals ?? input.appearances / 2, assists: input.assists ?? 2, yellowCards: 0, redCards: 0, averageRating: 7 },
    arrivalChoice: 'COACH',
    trainingFocus: 'BALANCED',
    developmentApproach: input.windowIndex >= 2 ? 'STEADY' : null,
    endingAttributes: { ...input.game.player!.attributes, attack: 63 + input.windowIndex },
    firstTeamAttention: 80,
    teamLevel: input.teamLevel,
    ...(input.honors ? { honors: input.honors } : {}),
  }
}

function historyGame(): GameState {
  const game = createCareer()
  const domestic = game.academyOffers[0]!.club
  const history = [
    entry({ game, windowIndex: 0, clubId: domestic.id, clubName: domestic.name, teamLevel: 'YOUTH', appearances: 12 }),
    entry({ game, windowIndex: 1, clubId: domestic.id, clubName: domestic.name, teamLevel: 'YOUTH', appearances: 13 }),
    entry({ game, windowIndex: 2, clubId: 'ita_inter', clubName: '国际米兰', teamLevel: 'FIRST_TEAM', appearances: 16, honors: [honor('CLUB', 'club-honor'), honor('INDIVIDUAL', 'individual-honor')] }),
    entry({ game, windowIndex: 3, clubId: domestic.id, clubName: domestic.name, teamLevel: 'FIRST_TEAM', appearances: 15, honors: [honor('NATIONAL', 'national-honor')] }),
  ]
  return {
    ...game,
    history,
    nationalTeam: {
      ...game.nationalTeam,
      caps: 8,
      goals: 3,
      assists: 2,
      history: [
        { windowIndex: 2, calledUp: true, role: 'STARTER', competition: 'WORLD_CUP', stage: 'QUARTER_FINAL', appearances: 4, starts: 4, minutes: 360, goals: 1, assists: 1, averageRating: 7.1, selectionScore: 80, selectionBenchmark: 70, debut: true, summary: '世界杯八强' },
        { windowIndex: 3, calledUp: true, role: 'CORE', competition: 'ASIAN_CUP', stage: 'RUNNER_UP', appearances: 4, starts: 4, minutes: 360, goals: 2, assists: 1, averageRating: 7.2, selectionScore: 82, selectionBenchmark: 70, debut: false, summary: '亚洲杯亚军' },
      ],
    },
  }
}

describe('career history view', () => {
  beforeEach(() => useGameStore.setState({ game: null, hasSave: false, error: null }))

  it('is safe with an empty history', () => {
    const view = buildCareerHistoryView(createCareer())
    expect(view.completedWindows).toBe(0)
    expect(view.seasons).toEqual([])
    expect(view.clubs).toEqual([])
    expect(view.totals).toMatchObject({ appearances: 0, youthAppearances: 0, seniorAppearances: 0 })
  })

  it('only displays complete summer-to-winter seasons, newest first', () => {
    const game = historyGame()
    const view = buildCareerHistoryView(game)
    expect(view.seasons).toHaveLength(2)
    expect(view.seasons.map((season) => season.endWindowIndex)).toEqual([3, 1])
    expect(view.seasons[0]).toMatchObject({ seasonLabel: `${game.startYear + 1}-${String((game.startYear + 2) % 100).padStart(2, '0')}赛季` })
  })

  it('hides unpaired windows without crossing a missing season boundary', () => {
    const game = historyGame()
    const onlySummer = { ...game, history: [game.history[0]!] }
    const summerWinterSummer = { ...game, history: game.history.slice(0, 3) }
    const missingPair = { ...game, history: [game.history[0]!, game.history[2]!, game.history[3]!] }

    expect(buildCareerHistoryView(onlySummer).seasons).toEqual([])
    expect(buildCareerHistoryView(summerWinterSummer).seasons).toHaveLength(1)
    expect(buildCareerHistoryView(missingPair).seasons.map((season) => season.startWindowIndex)).toEqual([2])
  })

  it('sums stats and uses the winter record for OVR, role, and team level', () => {
    const game = historyGame()
    const [summer, winter] = game.history
    const season = buildCareerHistorySeasons({
      history: [
        { ...summer!, stats: { ...summer!.stats, appearances: 8, goals: 3, assists: 1 } },
        { ...winter!, teamLevel: 'FIRST_TEAM', role: 'ROTATION', stats: { ...winter!.stats, appearances: 11, goals: 5, assists: 4 } },
      ],
      startYear: 2040,
      primaryPosition: game.player!.primaryPosition,
    })[0]!

    expect(season).toMatchObject({
      seasonLabel: '2040-41赛季',
      appearances: 19,
      goals: 8,
      assists: 5,
      teamLevel: 'FIRST_TEAM',
      role: 'ROTATION',
    })
    expect(season.overall).toBe(Math.round(calculateOverall(winter!.endingAttributes, game.player!.primaryPosition)))
  })

  it('shows a same-club season once using the compatible Chinese display name', () => {
    const game = historyGame()
    const [summer, winter] = game.history
    const seasons = buildCareerHistorySeasons({
      history: [
        { ...summer!, clubId: 'ita_inter', clubName: 'Inter Milan' },
        { ...winter!, clubId: 'ita_inter', clubName: 'Inter Milan' },
      ],
      startYear: 2040,
      primaryPosition: game.player!.primaryPosition,
    })

    expect(seasons).toHaveLength(1)
    expect(seasons[0]?.clubName).toBe('国际米兰')
    expect(seasons[0]?.clubName).not.toContain('→')
  })

  it('treats workbook and canonical IDs for the same club as one season club', () => {
    const game = historyGame()
    const [summer, winter] = game.history
    const seasons = buildCareerHistorySeasons({
      history: [
        {
          ...summer!,
          clubId: 'ita1_inter',
          clubName: 'Inter Milan',
          stats: { ...summer!.stats, appearances: 10, goals: 2, assists: 3 },
        },
        {
          ...winter!,
          clubId: 'ita_inter',
          clubName: 'Inter Milan',
          stats: { ...winter!.stats, appearances: 12, goals: 4, assists: 5 },
        },
      ],
      startYear: 2040,
      primaryPosition: game.player!.primaryPosition,
    })

    expect(seasons).toHaveLength(1)
    expect(seasons[0]).toMatchObject({
      clubName: '国际米兰',
      appearances: 22,
      goals: 6,
      assists: 8,
    })
    expect(seasons[0]?.clubName).not.toContain('→')
  })

  it('keeps a summer-to-winter transfer in one season with both localized club names', () => {
    const game = historyGame()
    const season = buildCareerHistorySeasons({
      history: [
        entry({ game, windowIndex: 0, clubId: 'ita_inter', clubName: 'Inter Milan', teamLevel: 'FIRST_TEAM', appearances: 10, goals: 2, assists: 3 }),
        entry({ game, windowIndex: 1, clubId: 'ita1_ac_milan', clubName: 'AC Milan', teamLevel: 'FIRST_TEAM', appearances: 12, goals: 4, assists: 5 }),
      ],
      startYear: 2040,
      primaryPosition: game.player!.primaryPosition,
    })

    expect(season).toHaveLength(1)
    expect(season[0]).toMatchObject({
      clubName: '国际米兰 → AC米兰',
      appearances: 22,
      goals: 6,
      assists: 8,
    })
  })

  it('preserves separate return spells while matching the existing club aggregation', () => {
    const game = historyGame()
    const view = buildCareerHistoryView(game)
    const summary = buildRetirementSummary(game)
    const domesticId = game.history[0]!.clubId
    const club = view.clubs.find((item) => item.clubId === domesticId)!
    const summaryClub = summary.clubs.find((item) => item.clubId === domesticId)!
    expect(club.serviceSpells).toHaveLength(2)
    expect(club.serviceSpells).toEqual(summaryClub.serviceSpells)
    expect(club.appearances).toBe(summaryClub.appearances)
    expect(club.peakOverall).toBe(summaryClub.peakOverall)
  })

  it('keeps club totals separate from national-team totals and splits honors by real scope', () => {
    const game = historyGame()
    const view = buildCareerHistoryView(game)
    const summary = buildRetirementSummary(game)
    expect(view.totals.appearances).toBe(summary.youthTotals.appearances + summary.seniorTotals.appearances)
    expect(view.totals.goals).toBe(summary.youthTotals.goals + summary.seniorTotals.goals)
    expect(view.totals.assists).toBe(summary.youthTotals.assists + summary.seniorTotals.assists)
    expect(view.totals.appearances).not.toBe(summary.totals.appearances + summary.nationalTeam.appearances)
    expect(view.nationalTeam).toMatchObject({ appearances: 8, goals: 3, assists: 2, worldCupBest: 'QUARTER_FINAL', asianCupBest: 'RUNNER_UP' })
    expect(view.honors.club).toHaveLength(1)
    expect(view.honors.national).toHaveLength(1)
    expect(view.honors.individual).toHaveLength(1)
  })

  it('does not mutate game state or expose hidden-potential and transfer-only fields', () => {
    const game = historyGame()
    const before = structuredClone(game)
    const view = buildCareerHistoryView(game)
    expect(game).toEqual(before)
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain('potential')
    expect(serialized).not.toContain('fulfillment')
    expect(serialized).not.toContain('transferFee')
    expect(serialized).not.toContain('transferType')
  })

  it('resolves legacy English snapshot club names only in the derived season view and retirement summary', () => {
    const game = historyGame()
    const legacyGame = {
      ...game,
      history: game.history.map((item, index) => index >= 2
        ? { ...item, clubId: 'ita1_ac_milan', clubName: 'AC Milan' }
        : item),
    }
    const before = structuredClone(legacyGame)
    const view = buildCareerHistoryView(legacyGame)
    const summary = buildRetirementSummary(legacyGame)

    expect(view.seasons.find((entry) => entry.startWindowIndex === 2)?.clubName).toBe('AC米兰')
    expect(summary.clubs.find((club) => club.clubId === 'ita1_ac_milan')?.clubName).toBe('AC米兰')
    expect(legacyGame).toEqual(before)
  })
})
