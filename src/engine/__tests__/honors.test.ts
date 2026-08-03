import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import type {
  CareerHistoryEntry,
  HalfYearStats,
  NationalTeamWindowRecord,
} from '../../models/game'
import {
  competitionLabelsForClub,
  settleHonorsForWindow,
} from '../honors'
import { generatePlayer } from '../player'
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

  it('keeps all four approved personal awards reachable for an elite season', () => {
    const earned = new Set<string>()
    for (let index = 0; index < 60; index += 1) {
      for (const item of settle({ careerSeed: `elite-${index}` }).honors) {
        if (item.scope === 'INDIVIDUAL') earned.add(item.type)
      }
    }

    expect(earned).toEqual(
      new Set([
        'GOLDEN_BOOT',
        'TEAM_OF_SEASON',
        'LEAGUE_PLAYER_OF_YEAR',
        'BALLON_DOR',
      ]),
    )
  })

  it('does not award a Ballon d’Or below the elite ability threshold', () => {
    const player = elitePlayer()
    player.attributes = { attack: 76, defense: 40, physical: 73, mental: 70 }

    for (let index = 0; index < 60; index += 1) {
      expect(
        settle({ player, careerSeed: `non-elite-${index}` }).honors.some(
          (item) => item.type === 'BALLON_DOR',
        ),
      ).toBe(false)
    }
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
})
