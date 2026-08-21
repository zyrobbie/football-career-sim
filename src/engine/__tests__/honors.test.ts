import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import type {
  AcademyOffer,
  CareerHistoryEntry,
  Club,
  GameState,
  HalfYearStats,
  NationalTeamWindowRecord,
} from '../../models/game'
import {
  ballonDorHonorBonus,
  clubTeamHonors,
  competitionLabelsForClub,
  isBallonDorEligible,
  settleHonorsForWindow,
} from '../honors'
import { generatePlayer } from '../player'
import { calculateOverall } from '../player'
import { createRandom } from '../random'
import { createCareerStoryState } from '../careerStory'
import { createFirstTeamProgress } from '../firstTeamPath'
import { generateAcademyOffers } from '../offers'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import { contractFromOffer, generateFirstProfessionalOffer } from '../contracts'
import { createDraft } from './testFixtures'

const inter = CLUBS.find((club) => club.id === 'ita_inter')!
const arsenal = CLUBS.find((club) => club.id === 'eng_arsenal')!

const eliteStats: HalfYearStats = {
  appearances: 28,
  starts: 27,
  minutes: 2_430,
  goals: 28,
  assists: 15,
  yellowCards: 2,
  redCards: 0,
  averageRating: 8.1,
}

function award(type: import('../../models/game').CareerHonorType): import('../../models/game').CareerHonor {
  return {
    id: type,
    type,
    scope: type === 'GOLDEN_BOOT' || type === 'LEAGUE_PLAYER_OF_YEAR' ? 'INDIVIDUAL' : 'CLUB',
    label: type,
    competitionLabel: type,
    seasonLabel: '2026赛季',
    windowIndex: 9,
    clubId: inter.id,
    clubName: inter.name,
  }
}

function elitePlayer() {
  const player = generatePlayer(createDraft('ST'), 'honor-player')
  return {
    ...player,
    attributes: { attack: 92, defense: 58, physical: 89, mental: 90 },
  }
}

function settle(overrides: Partial<Parameters<typeof settleHonorsForWindow>[0]> = {}) {
  return settleHonorsForWindow({
    player: elitePlayer(),
    club: inter,
    stats: eliteStats,
    teamLevel: 'FIRST_TEAM',
    careerSeed: 'honor-test',
    startYear: 2026,
    windowIndex: 9,
    history: [],
    nationalRecord: null,
    ...overrides,
  })
}

describe('career honors settlement', () => {
  it('calculates the adopted Ballon d’Or honor contribution without double-counting titles', () => {
    expect(ballonDorHonorBonus([])).toBe(0)
    expect(ballonDorHonorBonus([award('LEAGUE_TITLE')])).toBe(6)
    expect(ballonDorHonorBonus([award('CONTINENTAL_TITLE')])).toBe(12)
    expect(ballonDorHonorBonus([award('LEAGUE_TITLE'), award('CONTINENTAL_TITLE')])).toBe(14)
    expect(ballonDorHonorBonus([award('GOLDEN_BOOT')])).toBe(4)
    expect(ballonDorHonorBonus([award('LEAGUE_PLAYER_OF_YEAR')])).toBe(5)
    expect(ballonDorHonorBonus([
      award('LEAGUE_TITLE'), award('CONTINENTAL_TITLE'), award('GOLDEN_BOOT'), award('LEAGUE_PLAYER_OF_YEAR'),
    ])).toBe(23)
  })

  it('is deterministic and settles club seasons only in winter first-team windows', () => {
    const first = settle()
    const second = settle()

    expect(second).toEqual(first)
    expect(first.clubSeason).not.toBeNull()
    expect(settle({ windowIndex: 8 }).clubSeason).toBeNull()
    expect(settle({ teamLevel: 'YOUTH' }).clubSeason).toBeNull()
  })

  it('only awards national-team titles to players who appeared in a championship run', () => {
    const champion: NationalTeamWindowRecord = {
      windowIndex: 9,
      calledUp: true,
      role: 'CORE',
      competition: 'WORLD_CUP',
      stage: 'CHAMPION',
      appearances: 6,
      starts: 6,
      minutes: 540,
      goals: 4,
      assists: 2,
      averageRating: 7.8,
      selectionScore: 90,
      selectionBenchmark: 74,
      debut: false,
      summary: '世界杯冠军',
    }

    expect(
      settle({ nationalRecord: champion }).honors.some(
        (item) => item.type === 'WORLD_CUP',
      ),
    ).toBe(true)
    expect(
      settle({
        nationalRecord: { ...champion, appearances: 0, starts: 0, minutes: 0 },
      }).honors.some((item) => item.type === 'WORLD_CUP'),
    ).toBe(false)
  })

  it('uses real competition names for each country and continental level', () => {
    expect(competitionLabelsForClub(inter)).toEqual({
      league: '意甲',
      domesticCup: '意大利杯',
      continental: '欧冠',
    })
    expect(competitionLabelsForClub(arsenal)).toEqual({
      league: '英超',
      domesticCup: '英格兰足总杯',
      continental: '欧冠',
    })
  })

  it('uses division level for second-tier names and suppresses continental competition', () => {
    const clubs = [
      ['eng2_burnley', '英冠', '英格兰足总杯'],
      ['ita2_cremonese', '意乙', '意大利杯'],
      ['esp2_almeria', '西乙', '国王杯'],
      ['ger2_bochum', '德乙', '德国杯'],
      ['fra2_metz', '法乙', '法国杯'],
      ['chn2_liaoning_tiecheng', '中甲', '中国足协杯'],
    ] as const
    for (const [clubId, league, domesticCup] of clubs) {
      const club = CLUBS.find((candidate) => candidate.id === clubId)!
      expect(competitionLabelsForClub(club)).toEqual({ league, domesticCup, continental: null })
      const result = settle({ club, careerSeed: `second-tier-${clubId}` })
      expect(result.clubSeason?.continentalLabel).toBeNull()
      expect(result.clubSeason?.continentalStage).toBe('NOT_ENTERED')
      expect(result.clubSeason?.summary).not.toMatch(/欧冠未参赛|欧联杯未参赛|亚冠未参赛/)
    }
  })

  it('awards a second-tier title using its real league name', () => {
    const burnley = CLUBS.find((club) => club.id === 'eng2_burnley')!
    const honors = clubTeamHonors({
      club: burnley, label: '2030赛季', windowIndex: 9, participated: true,
      season: { seasonLabel: '2030赛季', leagueLabel: burnley.leagueLabel, leaguePosition: 1, leagueTeams: 18, domesticCupStage: 'EARLY_EXIT', continentalLabel: null, continentalStage: 'NOT_ENTERED', summary: '' },
    })
    expect(honors).toContainEqual(expect.objectContaining({ type: 'LEAGUE_TITLE', competitionLabel: '英冠' }))
    expect(honors.some((honor) => honor.label.includes('英超'))).toBe(false)
  })

  it('shares every club title with a player who made one seasonal appearance', () => {
    const cameoStats: HalfYearStats = {
      ...eliteStats,
      appearances: 1,
      starts: 0,
      minutes: 12,
      goals: 0,
      assists: 0,
      averageRating: 6.4,
    }
    let titleSeasons = 0

    for (let index = 0; index < 160; index += 1) {
      const result = settle({ stats: cameoStats, careerSeed: `cameo-${index}` })
      const season = result.clubSeason!
      const expected = [
        season.leaguePosition === 1 ? 'LEAGUE_TITLE' : null,
        season.domesticCupStage === 'CHAMPION' ? 'DOMESTIC_CUP' : null,
        season.continentalStage === 'CHAMPION' ? 'CONTINENTAL_TITLE' : null,
      ].filter(Boolean)
      if (expected.length > 0) titleSeasons += 1
      for (const type of expected) {
        expect(result.honors.some((item) => item.type === type)).toBe(true)
      }
    }

    expect(titleSeasons).toBeGreaterThan(0)
  })

  it('keeps a former club title when the player appeared before a mid-season transfer', () => {
    const priorEntry: CareerHistoryEntry = {
      windowIndex: 8,
      clubId: arsenal.id,
      clubName: arsenal.name,
      role: 'FRINGE',
      stats: { ...eliteStats, appearances: 1, starts: 0, minutes: 18, goals: 0, assists: 0 },
      arrivalChoice: null,
      trainingFocus: 'BALANCED',
      developmentApproach: 'STEADY',
      endingAttributes: elitePlayer().attributes,
      firstTeamAttention: 80,
      teamLevel: 'FIRST_TEAM',
    }
    let foundFormerClubTitle = false

    for (let index = 0; index < 240; index += 1) {
      const result = settle({
        careerSeed: `former-club-${index}`,
        history: [priorEntry],
      })
      if (result.honors.some((item) => item.clubId === arsenal.id)) {
        foundFormerClubTitle = true
        break
      }
    }

    expect(foundFormerClubTitle).toBe(true)
  })

  it('keeps Ballon d’Or gates for tier, appearances, and real OVR', () => {
    const lowOverall = elitePlayer()
    lowOverall.attributes = { attack: 82, defense: 82, physical: 82, mental: 82 }
    const tierThree = CLUBS.find((club) => club.tier === 3 && club.id !== inter.id)!
    const fewerThan24 = { ...eliteStats, appearances: 23, starts: 23, minutes: 2_070 }

    const fullHonors = [award('LEAGUE_TITLE'), award('CONTINENTAL_TITLE'), award('GOLDEN_BOOT'), award('LEAGUE_PLAYER_OF_YEAR')]
    expect(ballonDorHonorBonus(fullHonors)).toBe(23)
    expect(isBallonDorEligible({ club: inter, appearances: 28, overall: 82 })).toBe(false)
    expect(isBallonDorEligible({ club: tierThree, appearances: 28, overall: 92 })).toBe(false)
    expect(isBallonDorEligible({ club: inter, appearances: 23, overall: 92 })).toBe(false)
    expect(isBallonDorEligible({ club: inter, appearances: 28, overall: 84 })).toBe(true)
    expect(settle({ player: lowOverall }).honors.some((honor) => honor.type === 'BALLON_DOR')).toBe(false)
    expect(settle({ club: tierThree }).honors.some((honor) => honor.type === 'BALLON_DOR')).toBe(false)
    expect(settle({ stats: fewerThan24 }).honors.some((honor) => honor.type === 'BALLON_DOR')).toBe(false)
  })
})

type AuditCase = {
  label: string
  overall: 82 | 84 | 88 | 90 | 92
  club: Club
}
const PEAK_SEASON_START_WINDOW = 28
const PEAK_SEASON_END_WINDOW = 29

function professionalState(seed: string, overall: AuditCase['overall'], club: Club): {
  state: GameState
  academy: AcademyOffer
} {
  const draft = createDraft('ST')
  const player = generatePlayer(draft, seed)
  const tunedPlayer = {
    ...player,
    attributes: { attack: overall, defense: overall, physical: overall, mental: overall },
    potentials: { attack: overall, defense: overall, physical: overall, mental: overall },
    fitness: 70,
    morale: 70,
    coachRelation: 50,
    squadRelation: 50,
  }
  const generatedAcademy = generateAcademyOffers(tunedPlayer, seed)[1]!
  const academy = { ...generatedAcademy, club }
  const firstTeamProgress = {
    ...createFirstTeamProgress(club.id),
    attention: 100, readiness: 100, matchProof: 100, coachBacking: 100, status: 'PROMOTED' as const,
  }
  const professionalOffer = generateFirstProfessionalOffer({
    player: tunedPlayer, club, youthRole: academy.expectedRole, teamLevel: 'FIRST_TEAM', firstTeamProgress, careerSeed: seed,
  })
  return {
    academy,
    state: {
      saveVersion: 11, dataVersion: 11, phase: 'SIMULATION_READY', careerSeed: seed, startYear: 2026, windowIndex: PEAK_SEASON_START_WINDOW,
      draft, player: tunedPlayer, academyOffers: [academy], selectedClubId: club.id, teamLevel: 'FIRST_TEAM', youthRole: null,
      firstTeamRole: 'CORE', contract: contractFromOffer(professionalOffer), professionalOffer, transferOffers: [], selectedTransferChoiceId: null,
      transferDecision: null, arrivalChoice: 'COACH', transferArrivalChoice: null, pendingCareerEvent: null, careerEventHistory: [], pendingConsequences: [],
      careerStory: createCareerStoryState(club.id), trainingFocus: 'BALANCED', developmentApproach: 'STEADY', trainingQualityBonus: 0,
      firstTeamProgress, cashEuro: 7_000, nationalTeam: { retired: false, currentRole: null, caps: 0, goals: 0, assists: 0, debutWindowIndex: null, history: [] }, retirementReason: null, lastReport: null, history: [],
    },
  }
}

function simulateRealSeason(seed: string, overall: AuditCase['overall'], club: Club) {
  const { state, academy } = professionalState(seed, overall, club)
  const startOverall = calculateOverall(state.player!.attributes, state.player!.primaryPosition)
  expect(startOverall).toBe(overall)
  const summer = simulateProfessionalHalfYear({ state, offer: academy })
  const summerOverall = calculateOverall(summer.player.attributes, summer.player.primaryPosition)
  expect(summerOverall).toBe(overall)
  const summerEntry: CareerHistoryEntry = {
    windowIndex: PEAK_SEASON_START_WINDOW, clubId: club.id, clubName: club.name, role: summer.firstTeamRole!, stats: summer.report.stats,
    arrivalChoice: null, trainingFocus: 'BALANCED', developmentApproach: 'STEADY', endingAttributes: summer.player.attributes,
    firstTeamAttention: 100, teamLevel: 'FIRST_TEAM',
  }
  const winterState: GameState = {
    ...state, windowIndex: PEAK_SEASON_END_WINDOW, player: summer.player, firstTeamRole: summer.firstTeamRole, contract: summer.contract,
    cashEuro: summer.cashEuro, firstTeamProgress: summer.firstTeamProgress, history: [summerEntry], lastReport: summer.report,
  }
  const winter = simulateProfessionalHalfYear({ state: winterState, offer: academy })
  const winterOverall = calculateOverall(winter.player.attributes, winter.player.primaryPosition)
  expect(winterOverall).toBe(overall)
  const settled = settleHonorsForWindow({
    player: winter.player, club, stats: winter.report.stats, teamLevel: 'FIRST_TEAM', careerSeed: seed, startYear: 2026,
    windowIndex: PEAK_SEASON_END_WINDOW, history: [summerEntry], nationalRecord: null,
  })
  const stats = {
    appearances: summer.report.stats.appearances + winter.report.stats.appearances,
    goals: summer.report.stats.goals + winter.report.stats.goals,
    assists: summer.report.stats.assists + winter.report.stats.assists,
    averageRating: (summer.report.stats.averageRating * summer.report.stats.appearances + winter.report.stats.averageRating * winter.report.stats.appearances) /
      (summer.report.stats.appearances + winter.report.stats.appearances),
  }
  const actualOverall = winterOverall
  const legacyTitleBonus = settled.honors.some((honor) => honor.type === 'CONTINENTAL_TITLE')
    ? 8
    : settled.honors.some((honor) => honor.type === 'LEAGUE_TITLE')
      ? 4
      : 0
  const baseBallonScore = stats.averageRating * 10 + (stats.goals + stats.assists) * 0.35 + actualOverall * 0.25
  const ballonScore = baseBallonScore + ballonDorHonorBonus(settled.honors)
  const legacyBallonScore = baseBallonScore + legacyTitleBonus
  const random = createRandom(seed, 'personal-honors', PEAK_SEASON_END_WINDOW, club.id)
  random.int(14, 22); random.float(87, 94); random.float(96, 106)
  const competitionLine = random.float(114, 124)
  const qualified = isBallonDorEligible({ club, appearances: stats.appearances, overall: actualOverall })
  const won = settled.honors.some((honor) => honor.type === 'BALLON_DOR')
  expect(won).toBe(qualified && ballonScore >= competitionLine)
  return { seed, stats, honors: settled.honors, startOverall, summerOverall, winterOverall, ballonScore, legacyBallonScore, competitionLine, qualified, won }
}

function round(value: number) { return Math.round(value * 100) / 100 }

describe('Ballon d’Or real-simulation reachability audit', () => {
  const atalanta = CLUBS.find((club) => club.id === 'ita1_atalanta')!
  const auditCases: AuditCase[] = [
    { label: 'OVR82-T1', overall: 82, club: inter }, { label: 'OVR82-T2', overall: 82, club: atalanta },
    { label: 'OVR84-T1', overall: 84, club: inter }, { label: 'OVR84-T2', overall: 84, club: atalanta },
    { label: 'OVR88-T1', overall: 88, club: inter }, { label: 'OVR88-T2', overall: 88, club: atalanta },
    { label: 'OVR90-T1', overall: 90, club: inter }, { label: 'OVR90-T2', overall: 90, club: atalanta },
    { label: 'OVR92-T1', overall: 92, club: inter }, { label: 'OVR92-T2', overall: 92, club: atalanta },
  ]

  it('measures 200 real simulated seasons per OVR and platform group', () => {
    const sampleGroups = new Map<string, ReturnType<typeof simulateRealSeason>[]>()
    const summary = Object.fromEntries(auditCases.map((auditCase) => {
      const samples = Array.from({ length: 200 }, (_, index) => simulateRealSeason(`ballon-audit:${auditCase.label}:${index}`, auditCase.overall, auditCase.club))
      sampleGroups.set(auditCase.label, samples)
      const averageRating = round(samples.reduce((sum, sample) => sum + sample.stats.averageRating, 0) / samples.length)
      const averageContributions = round(samples.reduce((sum, sample) => sum + sample.stats.goals + sample.stats.assists, 0) / samples.length)
      const scores = samples.map((sample) => sample.ballonScore)
      const honors = (type: string) => samples.filter((sample) => sample.honors.some((honor) => honor.type === type)).length
      return [auditCase.label, {
        actualOverallRange: [Math.min(...samples.map((sample) => sample.startOverall)), Math.max(...samples.map((sample) => sample.winterOverall))], averageRating, ratingRange: [round(Math.min(...samples.map((sample) => sample.stats.averageRating))), round(Math.max(...samples.map((sample) => sample.stats.averageRating)))], averageContributions, contributionRange: [Math.min(...samples.map((sample) => sample.stats.goals + sample.stats.assists)), Math.max(...samples.map((sample) => sample.stats.goals + sample.stats.assists))], scoreRange: [round(Math.min(...scores)), round(Math.max(...scores))],
        qualifiedRate: round(samples.filter((sample) => sample.qualified).length / samples.length), winRate: round(samples.filter((sample) => sample.won).length / samples.length),
        leagueTitles: honors('LEAGUE_TITLE'), continentalTitles: honors('CONTINENTAL_TITLE'), goldenBoots: honors('GOLDEN_BOOT'), playerOfYear: honors('LEAGUE_PLAYER_OF_YEAR'), wins: honors('BALLON_DOR'),
      }]
    }))
    const userCases = {
      ovr90T2Continental: Array.from({ length: 200 }, (_, index) => simulateRealSeason(`ballon-user-t2:${index}`, 90, atalanta)).filter((sample) => sample.honors.some((honor) => honor.type === 'CONTINENTAL_TITLE')),
      ovr92T1ContinentalGoldenBoot: Array.from({ length: 200 }, (_, index) => simulateRealSeason(`ballon-user-t1:${index}`, 92, inter)).filter((sample) => sample.honors.some((honor) => honor.type === 'CONTINENTAL_TITLE') && sample.honors.some((honor) => honor.type === 'GOLDEN_BOOT')),
      ovr90PlayerOfYearWithoutContinental: Array.from({ length: 200 }, (_, index) => simulateRealSeason(`ballon-user-poy:${index}`, 90, inter)).filter((sample) => sample.honors.some((honor) => honor.type === 'LEAGUE_PLAYER_OF_YEAR') && !sample.honors.some((honor) => honor.type === 'CONTINENTAL_TITLE')),
    }
    const calibration = Object.fromEntries(auditCases.map((auditCase) => {
      const samples = sampleGroups.get(auditCase.label)!
      const threshold = (sample: (typeof samples)[number], low: number, high: number) => {
        const random = createRandom(sample.seed, 'personal-honors', PEAK_SEASON_END_WINDOW, auditCase.club.id)
        random.int(14, 22); random.float(87, 94); random.float(96, 106)
        return random.float(low, high)
      }
      return [auditCase.label, {
        planAWinRate: round(samples.filter((sample) => sample.qualified && sample.legacyBallonScore >= threshold(sample, 108, 118)).length / samples.length),
        adoptedPlanBWinRate: round(samples.filter((sample) => sample.won).length / samples.length),
      }]
    }))
    expect(summary['OVR82-T1']!.wins + summary['OVR82-T2']!.wins).toBe(0)
    expect(summary['OVR90-T1']!.wins + summary['OVR90-T2']!.wins + summary['OVR92-T1']!.wins + summary['OVR92-T2']!.wins).toBeGreaterThan(0)
    expect(Object.values(summary).every((item) => item.averageRating >= 5.5 && item.averageRating <= 8.5)).toBe(true)
    console.info(`BALLON_REACHABILITY_AUDIT_JSON=${JSON.stringify({ summary, userCases: Object.fromEntries(Object.entries(userCases).map(([key, samples]) => [key, { samples: samples.length, wins: samples.filter((sample) => sample.won).length, winRate: samples.length ? round(samples.filter((sample) => sample.won).length / samples.length) : null, scoreRange: samples.length ? [round(Math.min(...samples.map((sample) => sample.ballonScore))), round(Math.max(...samples.map((sample) => sample.ballonScore)))] : null }])), calibration })}`)
  }, 15_000)

  it('never awards a Ballon d’Or below real OVR 84, including title-winning seasons', () => {
    const samples = Array.from({ length: 200 }, (_, index) => simulateRealSeason(`ballon-under-84:${index}`, 82, inter))
    expect(samples.some((sample) => sample.honors.some((honor) => honor.type === 'LEAGUE_TITLE' || honor.type === 'CONTINENTAL_TITLE'))).toBe(true)
    expect(samples.every((sample) => sample.winterOverall < 84 && !sample.won)).toBe(true)
  })
})
