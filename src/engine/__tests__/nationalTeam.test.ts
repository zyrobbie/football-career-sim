import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import { generatePlayer } from '../player'
import {
  createNationalTeamState,
  nationalCompetitionForWindow,
  nationalTeamRoleFromScore,
  simulateNationalTeamWindow,
} from '../nationalTeam'
import { createDraft } from './testFixtures'

const clubStats = {
  appearances: 17,
  starts: 15,
  minutes: 1_320,
  goals: 7,
  assists: 4,
  yellowCards: 1,
  redCards: 0,
  averageRating: 7.3,
}

function strongPlayer() {
  const player = generatePlayer(createDraft('ST'), 'national-team-player')
  return {
    ...player,
    attributes: { attack: 82, defense: 40, physical: 80, mental: 78 },
    potentials: { attack: 90, defense: 65, physical: 88, mental: 87 },
    form: 78,
    fitness: 82,
    reputation: 72,
  }
}

describe('China senior national team', () => {
  it('uses the fixed World Cup and Asian Cup summer cycles', () => {
    expect(nationalCompetitionForWindow(2026, 0)).toBe('WORLD_CUP')
    expect(nationalCompetitionForWindow(2026, 1)).toBe(
      'INTERNATIONAL_WINDOW',
    )
    expect(nationalCompetitionForWindow(2026, 2)).toBe('ASIAN_CUP')
    expect(nationalCompetitionForWindow(2026, 8)).toBe('WORLD_CUP')
  })

  it('maps the selection score to a stable squad role', () => {
    expect(nationalTeamRoleFromScore(71)).toBe('CORE')
    expect(nationalTeamRoleFromScore(67)).toBe('STARTER')
    expect(nationalTeamRoleFromScore(63)).toBe('ROTATION')
    expect(nationalTeamRoleFromScore(60)).toBe('FRINGE')
    expect(nationalTeamRoleFromScore(59.9)).toBeNull()
  })

  it('deterministically records a call-up and accumulates career totals', () => {
    const input = {
      nationalTeam: createNationalTeamState(),
      player: strongPlayer(),
      club: CLUBS.find((club) => club.id === 'ita_inter')!,
      clubStats,
      teamLevel: 'FIRST_TEAM' as const,
      injured: false,
      careerSeed: 'national-team-determinism',
      startYear: 2026,
      windowIndex: 8,
    }
    const first = simulateNationalTeamWindow(input)
    const second = simulateNationalTeamWindow(input)

    expect(first).toEqual(second)
    expect(first.record.calledUp).toBe(true)
    expect(first.record.debut).toBe(first.record.appearances > 0)
    expect(first.nationalTeam.caps).toBe(first.record.appearances)
    expect(first.nationalTeam.goals).toBe(first.record.goals)
    expect(first.nationalTeam.assists).toBe(first.record.assists)
  })

  it('does not select youth players or players who retired internationally', () => {
    const base = {
      player: strongPlayer(),
      club: CLUBS.find((club) => club.id === 'cn_shanghai_donggang')!,
      clubStats,
      injured: false,
      careerSeed: 'national-team-ineligible',
      startYear: 2026,
      windowIndex: 12,
    }
    const youth = simulateNationalTeamWindow({
      ...base,
      nationalTeam: createNationalTeamState(),
      teamLevel: 'YOUTH',
    })
    const retired = simulateNationalTeamWindow({
      ...base,
      nationalTeam: { ...createNationalTeamState(), retired: true },
      teamLevel: 'FIRST_TEAM',
    })

    expect(youth.record.calledUp).toBe(false)
    expect(retired.record.calledUp).toBe(false)
    expect(retired.nationalTeam.currentRole).toBeNull()
  })
})
