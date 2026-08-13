import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import type { Club, GameState } from '../../models/game'
import {
  contractFromOffer,
  generateFirstProfessionalOffer,
} from '../contracts'
import { createFirstTeamProgress } from '../firstTeamPath'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import { createCareerStoryState } from '../careerStory'
import { createDraft } from './testFixtures'

function createFirstTeamState(
  careerSeed: string,
  clubOverride?: Club,
) {
  const draft = createDraft('CAM')
  const player = generatePlayer(draft, careerSeed)
  const generatedOffers = generateAcademyOffers(player, careerSeed)
  const generatedAcademy = generatedOffers[1]!
  const academy = clubOverride
    ? { ...generatedAcademy, club: clubOverride }
    : generatedAcademy
  const academyOffers = clubOverride ? [academy] : generatedOffers
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
    saveVersion: 11,
    dataVersion: 11,
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
    pendingCareerEvent: null,
    careerEventHistory: [],
    pendingConsequences: [],
    careerStory: createCareerStoryState(academy.club.id),
    trainingFocus: 'BALANCED',
    developmentApproach: 'STEADY',
    trainingQualityBonus: 0,
    firstTeamProgress,
    cashEuro: 7_000,
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
  return { state, academy }
}

describe('professional half-year simulation', () => {
  it('keeps the default fixture academy offers and club-linked state aligned', () => {
    const { state, academy } = createFirstTeamState(
      'professional-default-fixture-offers',
    )

    expect(state.academyOffers).toHaveLength(3)
    expect(state.academyOffers[1]).toBe(academy)
    expect(state.selectedClubId).toBe(academy.club.id)
    expect(state.contract?.clubId).toBe(academy.club.id)
    expect(state.professionalOffer?.clubId).toBe(academy.club.id)
    expect(state.firstTeamProgress.clubId).toBe(academy.club.id)
    expect(state.careerStory.club.clubId).toBe(academy.club.id)
  })

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

  it('cannot simulate another youth window after the player turns 22', () => {
    const { state, academy } = createFirstTeamState(
      'over-age-professional-simulation',
    )
    state.windowIndex = 20
    state.teamLevel = 'YOUTH'
    state.youthRole = 'CORE'
    state.firstTeamRole = null
    state.contract = {
      ...state.contract!,
      promisedTeamLevel: 'YOUTH',
      promisedRole: 'CORE',
    }

    const result = simulateProfessionalHalfYear({ state, offer: academy })

    expect(result.teamLevel).toBe('FIRST_TEAM')
    expect(result.youthRole).toBeNull()
    expect(result.report.contract?.actualTeamLevel).toBe('FIRST_TEAM')
  })

  it('keeps 50 fixed-seed first-team settlements deterministic and within potential caps', () => {
    for (let index = 0; index < 50; index += 1) {
      const { state, academy } = createFirstTeamState(`professional-growth-${index}`)
      const first = simulateProfessionalHalfYear({ state, offer: academy })
      const second = simulateProfessionalHalfYear({ state, offer: academy })
      expect(first).toEqual(second)
      for (const key of ['attack', 'defense', 'physical', 'mental'] as const) {
        expect(first.player.attributes[key]).toBeLessThanOrEqual(state.player!.potentials[key])
      }
    }
  })

  it('职业半年结算会将实际比赛分钟计入能力成长', () => {
    const ajax = CLUBS.find((club) => club.id === 'ned_ajax')!
    const { state, academy } = createFirstTeamState(
      'professional-minutes-growth-wiring',
      ajax,
    )
    state.windowIndex = 8
    state.firstTeamRole = 'ROTATION'
    state.player = {
      ...state.player!,
      attributes: { attack: 42, defense: 42, physical: 42, mental: 42 },
      potentials: { attack: 90, defense: 90, physical: 90, mental: 90 },
      form: 70,
      fitness: 70,
      morale: 70,
      coachRelation: 50,
      squadRelation: 50,
    }

    expect(academy.club.id).toBe('ned_ajax')
    expect(state.selectedClubId).toBe('ned_ajax')
    expect(state.contract?.clubId).toBe('ned_ajax')
    expect(state.professionalOffer?.clubId).toBe('ned_ajax')
    expect(state.firstTeamProgress.clubId).toBe('ned_ajax')
    expect(state.careerStory.club.clubId).toBe('ned_ajax')
    expect(state.academyOffers.map((offer) => offer.club.id)).toEqual(['ned_ajax'])

    const result = simulateProfessionalHalfYear({ state, offer: academy })
    // This locks the complete path: simulated stats.minutes (497) is consumed
    // by firstTeamMatchExperienceBonusForRuntimeClub before age growth.
    expect({ minutes: result.report.stats.minutes, attributes: result.player.attributes }).toEqual({
      minutes: 497,
      attributes: { attack: 45.9, defense: 42.9, physical: 44.1, mental: 44.9 },
    })
  })
})
