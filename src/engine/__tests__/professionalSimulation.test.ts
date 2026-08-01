import { describe, expect, it } from 'vitest'
import type { GameState } from '../../models/game'
import {
  contractFromOffer,
  generateFirstProfessionalOffer,
} from '../contracts'
import { createFirstTeamProgress } from '../firstTeamPath'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import { createDraft } from './testFixtures'

function createFirstTeamState(careerSeed: string) {
  const draft = createDraft('CAM')
  const player = generatePlayer(draft, careerSeed)
  const academyOffers = generateAcademyOffers(player, careerSeed)
  const academy = academyOffers[1]!
  const firstTeamProgress = {
    ...createFirstTeamProgress(academy.club.id),
    attention: 100,
    readiness: 100,
    matchProof: 100,
    coachBacking: 100,
    status: 'PROMOTED' as const,
  }
  const professionalOffer = generateFirstProfessionalOffer({
    player,
    club: academy.club,
    youthRole: academy.expectedRole,
    teamLevel: 'FIRST_TEAM',
    firstTeamProgress,
    careerSeed,
  })
  const contract = contractFromOffer(professionalOffer)
  const state: GameState = {
    saveVersion: 8,
    dataVersion: 8,
    phase: 'SIMULATION_READY',
    careerSeed,
    startYear: 2026,
    windowIndex: 4,
    draft,
    player,
    academyOffers,
    selectedClubId: academy.club.id,
    teamLevel: 'FIRST_TEAM',
    youthRole: null,
    firstTeamRole: professionalOffer.promisedRole as GameState['firstTeamRole'],
    contract,
    professionalOffer,
    transferOffers: [],
    selectedTransferChoiceId: null,
    transferDecision: null,
    arrivalChoice: 'COACH',
    transferArrivalChoice: null,
    pendingCareerEventId: null,
    careerEventHistory: [],
    pendingConsequences: [],
    trainingFocus: 'BALANCED',
    developmentApproach: 'STEADY',
    trainingQualityBonus: 0,
    firstTeamProgress,
    cashEuro: 7_000,
    retirementReason: null,
    lastReport: null,
    history: [],
  }
  return { state, academy }
}

describe('professional half-year simulation', () => {
  it('deterministically settles first-team matches, salary and contract promise', () => {
    const careerSeed = 'professional-window-determinism'
    const { state, academy } = createFirstTeamState(careerSeed)
    const contract = state.contract!

    const first = simulateProfessionalHalfYear({
      state,
      offer: academy,
    })
    const second = simulateProfessionalHalfYear({
      state,
      offer: academy,
    })

    expect(first).toEqual(second)
    expect(first.teamLevel).toBe('FIRST_TEAM')
    expect(first.report.stats.appearances).toBeGreaterThanOrEqual(0)
    expect(first.report.stats.starts).toBeLessThanOrEqual(
      first.report.stats.appearances,
    )
    expect(first.report.incomeLabel).toBe('工资可支配收入')
    expect(first.report.contract?.actualTeamLevel).toBe('FIRST_TEAM')
    expect(first.contract.remainingHalfYears).toBe(
      contract.remainingHalfYears - 1,
    )
    expect(first.cashEuro).toBeGreaterThanOrEqual(state.cashEuro)
  })

  it('settles a starter promise from the role that generated this window stats', () => {
    const { state, academy } = createFirstTeamState(
      'professional-role-demotion-regression',
    )
    state.firstTeamRole = 'STARTER'
    state.contract = {
      ...state.contract!,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'STARTER',
    }
    state.player = {
      ...state.player!,
      attributes: {
        attack: 25,
        defense: 25,
        physical: 25,
        mental: 25,
      },
      form: 35,
      morale: 35,
      coachRelation: 35,
    }

    const result = simulateProfessionalHalfYear({ state, offer: academy })

    expect(result.report.roleBefore).toBe('STARTER')
    expect(result.report.roleAfter).toBe('ROTATION')
    expect(result.firstTeamRole).toBe('ROTATION')
    expect(result.report.contract?.actualRole).toBe('STARTER')
    expect(result.report.contract?.promiseFulfilled).toBe(true)
  })

  it('does not backdate a next-window promotion into this window promise', () => {
    const { state, academy } = createFirstTeamState(
      'professional-role-promotion-regression',
    )
    state.firstTeamRole = 'ROTATION'
    state.contract = {
      ...state.contract!,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'STARTER',
    }
    state.player = {
      ...state.player!,
      attributes: {
        attack: 94,
        defense: 94,
        physical: 94,
        mental: 94,
      },
      potentials: {
        attack: 94,
        defense: 94,
        physical: 94,
        mental: 94,
      },
      form: 100,
      morale: 100,
      coachRelation: 100,
    }

    const result = simulateProfessionalHalfYear({ state, offer: academy })

    expect(result.report.roleBefore).toBe('ROTATION')
    expect(result.report.roleAfter).toBe('STARTER')
    expect(result.firstTeamRole).toBe('STARTER')
    expect(result.report.contract?.actualRole).toBe('ROTATION')
    expect(result.report.contract?.promiseFulfilled).toBe(false)
  })
})
