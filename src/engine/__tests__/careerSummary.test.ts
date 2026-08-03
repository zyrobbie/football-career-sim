import { describe, expect, it } from 'vitest'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import type { CareerHistoryEntry, GameState, HalfYearStats } from '../../models/game'
import { createDraft } from './testFixtures'
import { buildRetirementSummary, estimateMarketValueEuro } from '../careerSummary'

function stats(appearances: number, goals: number, assists: number, rating: number): HalfYearStats {
  return {
    appearances,
    starts: Math.max(0, appearances - 2),
    minutes: appearances * 72,
    goals,
    assists,
    yellowCards: 1,
    redCards: 0,
    averageRating: rating,
  }
}

function retirementGame(): GameState {
  const careerSeed = 'retirement-summary-test'
  const draft = createDraft('ST')
  const player = generatePlayer(draft, careerSeed)
  const academyOffers = generateAcademyOffers(player, careerSeed)
  const domestic = academyOffers[0]!
  const history: CareerHistoryEntry[] = [
    {
      windowIndex: 0,
      clubId: domestic.club.id,
      clubName: domestic.club.name,
      role: 'CORE',
      stats: stats(15, 6, 3, 7.2),
      arrivalChoice: 'COACH',
      trainingFocus: 'attack',
      developmentApproach: null,
      endingAttributes: { attack: 48, defense: 22, physical: 44, mental: 40 },
      firstTeamAttention: 42,
      teamLevel: 'YOUTH',
    },
    {
      windowIndex: 4,
      clubId: domestic.club.id,
      clubName: domestic.club.name,
      role: 'STARTER',
      stats: stats(14, 5, 2, 7.0),
      arrivalChoice: null,
      trainingFocus: 'BALANCED',
      developmentApproach: 'STEADY',
      endingAttributes: { attack: 66, defense: 30, physical: 62, mental: 59 },
      firstTeamAttention: 70,
      teamLevel: 'FIRST_TEAM',
    },
    {
      windowIndex: 20,
      clubId: 'ita_inter',
      clubName: '国际米兰',
      role: 'ROTATION',
      stats: stats(16, 7, 4, 7.3),
      arrivalChoice: null,
      trainingFocus: 'mental',
      developmentApproach: 'TEAM_FIRST',
      endingAttributes: { attack: 82, defense: 40, physical: 77, mental: 76 },
      firstTeamAttention: 88,
      teamLevel: 'FIRST_TEAM',
      honors: [
        {
          id: 'CONTINENTAL_TITLE:20:ita_inter',
          type: 'CONTINENTAL_TITLE',
          scope: 'CLUB',
          label: '2036赛季欧洲冠军联赛冠军',
          competitionLabel: '欧洲冠军联赛',
          seasonLabel: '2036赛季',
          windowIndex: 20,
          clubId: 'ita_inter',
          clubName: '国际米兰',
        },
        {
          id: 'TEAM_OF_SEASON:20:ita_inter',
          type: 'TEAM_OF_SEASON',
          scope: 'INDIVIDUAL',
          label: '2036赛季意大利顶级联赛赛季最佳阵容',
          competitionLabel: '意大利顶级联赛',
          seasonLabel: '2036赛季',
          windowIndex: 20,
          clubId: 'ita_inter',
          clubName: '国际米兰',
        },
      ],
    },
  ]

  return {
    saveVersion: 10,
    dataVersion: 10,
    phase: 'CAREER_RETIRED',
    careerSeed,
    startYear: 2026,
    windowIndex: 55,
    draft,
    player: {
      ...player,
      attributes: { attack: 72, defense: 38, physical: 66, mental: 71 },
      potentials: { attack: 86, defense: 58, physical: 82, mental: 82 },
      reputation: 78,
      squadRelation: 74,
      coachRelation: 72,
      fanRelation: 75,
    },
    academyOffers,
    selectedClubId: 'ita_inter',
    teamLevel: 'FIRST_TEAM',
    youthRole: null,
    firstTeamRole: 'ROTATION',
    contract: {
      type: 'PERMANENT_TRANSFER',
      clubId: 'ita_inter',
      remainingHalfYears: 0,
      annualSalaryEuro: 1_200_000,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'ROTATION',
      releaseClauseEuro: null,
      clubOptionYears: 0,
      parentClubId: null,
      brokenPromiseWindows: 0,
    },
    professionalOffer: null,
    transferOffers: [],
    selectedTransferChoiceId: null,
    transferDecision: null,
    arrivalChoice: 'COACH',
    transferArrivalChoice: null,
    pendingCareerEventId: null,
    careerEventHistory: [],
    pendingConsequences: [],
    trainingFocus: null,
    developmentApproach: null,
    trainingQualityBonus: 0,
    firstTeamProgress: {
      clubId: 'ita_inter',
      attention: 90,
      readiness: 88,
      matchProof: 84,
      coachBacking: 76,
      status: 'PROMOTED',
    },
    cashEuro: 500_000,
    nationalTeam: {
      retired: false,
      currentRole: 'STARTER',
      caps: 68,
      goals: 24,
      assists: 13,
      debutWindowIndex: 12,
      history: [
        {
          windowIndex: 30,
          calledUp: true,
          role: 'STARTER',
          competition: 'WORLD_CUP',
          stage: 'QUARTER_FINAL',
          appearances: 5,
          starts: 5,
          minutes: 450,
          goals: 2,
          assists: 1,
          averageRating: 7.2,
          selectionScore: 82,
          selectionBenchmark: 70,
          debut: false,
          summary: '世界杯八强',
        },
        {
          windowIndex: 34,
          calledUp: true,
          role: 'CORE',
          competition: 'ASIAN_CUP',
          stage: 'RUNNER_UP',
          appearances: 6,
          starts: 6,
          minutes: 540,
          goals: 3,
          assists: 2,
          averageRating: 7.5,
          selectionScore: 88,
          selectionBenchmark: 72,
          debut: false,
          summary: '亚洲杯亚军',
        },
      ],
    },
    retirementReason: 'AGE_LIMIT',
    lastReport: null,
    history,
  }
}

describe('retirement career summary', () => {
  it('aggregates each club and separates youth from senior data', () => {
    const summary = buildRetirementSummary(retirementGame())

    expect(summary.clubs).toHaveLength(2)
    expect(summary.clubs[0]?.teamLevelLabel).toBe('青年队 / 一线队')
    expect(summary.clubs[0]?.appearances).toBe(29)
    expect(summary.youthTotals.appearances).toBe(15)
    expect(summary.seniorTotals.appearances).toBe(30)
    expect(summary.peakOverall).toBeGreaterThan(summary.finalOverall)
    expect(summary.peakMarketValueEuro).toBeGreaterThan(summary.finalMarketValueEuro)
    expect(summary.nationalTeam.worldCupBest).toBe('QUARTER_FINAL')
    expect(summary.nationalTeam.asianCupBest).toBe('RUNNER_UP')
    expect(summary.honors).toHaveLength(2)
    expect(summary.clubs[1]?.honors).toEqual([
      '2036赛季欧洲冠军联赛冠军',
    ])
  })

  it('keeps return spells separate while aggregating club totals once', () => {
    const game = retirementGame()
    const domestic = game.history[0]!
    const overseas = game.history[2]!
    game.history = [
      { ...domestic, windowIndex: 0 },
      { ...domestic, windowIndex: 1 },
      { ...overseas, windowIndex: 2 },
      { ...domestic, windowIndex: 3 },
      { ...domestic, windowIndex: 4 },
    ]

    const summary = buildRetirementSummary(game)
    const club = summary.clubs.find((candidate) => candidate.clubId === domestic.clubId)!

    expect(club.serviceSpells.map((spell) => spell.label)).toEqual([
      '2026夏—2026冬',
      '2027冬—2028夏',
    ])
    expect(club.appearances).toBe(domestic.stats.appearances * 4)
  })

  it('derives a stable evaluation and three to eight player-facing tags', () => {
    const game = retirementGame()
    const first = buildRetirementSummary(game)
    const second = buildRetirementSummary(game)

    expect(second).toEqual(first)
    expect(first.tags.length).toBeGreaterThanOrEqual(3)
    expect(first.tags.length).toBeLessThanOrEqual(8)
    expect(first.evaluation.completedPointsMaximum).toBe(100)
    expect(first.evaluation.reservedPoints).toBe(0)
    expect(first.evaluation.provisionalScore).toBe(first.evaluation.completedPoints)
    expect(first.evaluation.provisionalScore).toBeLessThanOrEqual(100)
    expect(first.evaluation.dimensions.collectiveHonors).toBe(7)
    expect(first.evaluation.dimensions.personalHonors).toBe(2)
  })

  it('keeps the market-value estimate monotonic for equal age and platform', () => {
    const lower = estimateMarketValueEuro({ overall: 65, age: 24, clubTier: 2 })
    const higher = estimateMarketValueEuro({ overall: 80, age: 24, clubTier: 2 })

    expect(higher).toBeGreaterThan(lower)
  })
})
