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

describe('professional half-year simulation', () => {
  it('deterministically settles first-team matches, salary and contract promise', () => {
    const careerSeed = 'professional-window-determinism'
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
      saveVersion: 4,
      dataVersion: 4,
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
      arrivalChoice: 'COACH',
      trainingFocus: 'BALANCED',
      developmentApproach: 'STEADY',
      trainingQualityBonus: 0,
      firstTeamProgress,
      cashEuro: 7_000,
      lastReport: null,
      history: [],
    }

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
})
