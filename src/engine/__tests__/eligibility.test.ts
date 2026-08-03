import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import type { GameState } from '../../models/game'
import { createFirstTeamProgress } from '../firstTeamPath'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import { enforceAgeBasedFirstTeam } from '../eligibility'
import { createDraft } from './testFixtures'

function createOverAgeYouthState(): GameState {
  const careerSeed = 'over-age-youth-contract'
  const draft = createDraft('LW')
  const player = generatePlayer(draft, careerSeed)
  const academyOffers = generateAcademyOffers(player, careerSeed)
  const inter = CLUBS.find((club) => club.id === 'ita_inter')!

  return {
    saveVersion: 10,
    dataVersion: 10,
    phase: 'HALF_YEAR_PLAN',
    careerSeed,
    startYear: 2026,
    windowIndex: 20,
    draft,
    player,
    academyOffers,
    selectedClubId: inter.id,
    teamLevel: 'YOUTH',
    youthRole: 'CORE',
    firstTeamRole: null,
    contract: {
      type: 'RENEWAL',
      clubId: inter.id,
      remainingHalfYears: 4,
      annualSalaryEuro: 390_000,
      promisedTeamLevel: 'YOUTH',
      promisedRole: 'CORE',
      releaseClauseEuro: 4_000_000,
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
    firstTeamProgress: createFirstTeamProgress(inter.id),
    cashEuro: 132_000,
    nationalTeam: {
      retired: false,
      currentRole: null,
      caps: 0,
      goals: 0,
      assists: 0,
      debutWindowIndex: null,
      history: [],
    },
    retirementReason: null,
    lastReport: null,
    history: [],
  }
}

describe('age-based squad eligibility', () => {
  it('moves an age-23 player with an active youth contract into the first team', () => {
    const state = createOverAgeYouthState()
    const repaired = enforceAgeBasedFirstTeam(state)

    expect(repaired.teamLevel).toBe('FIRST_TEAM')
    expect(repaired.youthRole).toBeNull()
    expect(repaired.firstTeamRole).toBe('FRINGE')
    expect(repaired.contract?.promisedTeamLevel).toBe('FIRST_TEAM')
    expect(repaired.contract?.promisedRole).toBe('FRINGE')
    expect(repaired.contract?.remainingHalfYears).toBe(4)
    expect(repaired.firstTeamProgress.status).toBe('PROMOTED')
    expect(repaired.firstTeamProgress.attention).toBe(100)
  })

  it('does not rewrite completed youth history when repairing current status', () => {
    const state = createOverAgeYouthState()
    state.history = [
      {
        windowIndex: 19,
        clubId: 'ita_inter',
        clubName: '国际米兰',
        role: 'CORE',
        stats: {
          appearances: 15,
          starts: 14,
          minutes: 1_200,
          goals: 5,
          assists: 1,
          yellowCards: 0,
          redCards: 0,
          averageRating: 7.4,
        },
        arrivalChoice: null,
        trainingFocus: 'BALANCED',
        developmentApproach: 'STEADY',
        endingAttributes: { ...state.player!.attributes },
        firstTeamAttention: 60,
        teamLevel: 'YOUTH',
      },
    ]

    const repaired = enforceAgeBasedFirstTeam(state)

    expect(repaired.history[0]?.teamLevel).toBe('YOUTH')
    expect(repaired.history[0]?.role).toBe('CORE')
  })
})
