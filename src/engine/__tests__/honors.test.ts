import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import type {
  HalfYearStats,
  NationalTeamWindowRecord,
} from '../../models/game'
import { settleHonorsForWindow } from '../honors'
import { generatePlayer } from '../player'
import { createDraft } from './testFixtures'

const inter = CLUBS.find((club) => club.id === 'ita_inter')!

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
})
