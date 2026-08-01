import { describe, expect, it } from 'vitest'
import { generateAcademyOffers } from '../../engine/offers'
import { generatePlayer } from '../../engine/player'
import { simulateHalfYear } from '../../engine/simulateHalfYear'
import { createDraft } from '../../engine/__tests__/testFixtures'
import { validateGameState } from '../save'

function legacyIdentityState() {
  return {
    saveVersion: 1,
    dataVersion: 1,
    phase: 'CREATE_IDENTITY',
    careerSeed: 'legacy-seed-2026',
    startYear: 2026,
    windowIndex: 0,
    draft: {
      name: '林致远',
      birthYear: 2013,
      birthMonth: 7,
      primaryPosition: 'ST',
      secondaryPosition: 'LW',
      priorities: [
        'PLAYING_TIME',
        'COMPETITIVE_LEVEL',
        'SALARY',
        'STABILITY',
      ],
      overseasIntent: 'CONDITIONAL',
      preferredLeagues: [],
    },
    player: null,
    academyOffers: [],
    selectedClubId: null,
    youthRole: null,
    arrivalChoice: null,
    trainingFocus: null,
    trainingQualityBonus: 0,
    cashEuro: 1000,
    lastReport: null,
    history: [],
  }
}

describe('save migration', () => {
  it('upgrades version 1 identity fields without invalidating the save', () => {
    const migrated = validateGameState(legacyIdentityState())
    expect(migrated.saveVersion).toBe(9)
    expect(migrated.dataVersion).toBe(9)
    expect(migrated.draft.jerseyNumber).toBe(10)
    expect(migrated.draft.preferredFoot).toBe('RIGHT')
    expect(migrated.teamLevel).toBe('YOUTH')
    expect(migrated.firstTeamProgress.attention).toBe(0)
    expect(migrated.contract).toBeNull()
    expect(migrated.professionalOffer).toBeNull()
    expect(migrated.transferOffers).toEqual([])
    expect(migrated.transferDecision).toBeNull()
    expect(migrated.pendingCareerEventId).toBeNull()
    expect(migrated.careerEventHistory).toEqual([])
    expect(migrated.pendingConsequences).toEqual([])
  })

  it('rejects an out-of-range jersey number', () => {
    const migrated = validateGameState(legacyIdentityState())
    expect(() =>
      validateGameState({
        ...migrated,
        draft: { ...migrated.draft, jerseyNumber: 100 },
      }),
    ).toThrow()
  })

  it('adds domestic country metadata to version 8 academy clubs', () => {
    const current = validateGameState(legacyIdentityState())
    const player = generatePlayer(createDraft('CM'), 'version-eight-club')
    const offer = generateAcademyOffers(player, 'version-eight-club')[0]!
    const { country: _country, leagueKey: _leagueKey, ...legacyClub } =
      offer.club
    const migrated = validateGameState({
      ...current,
      saveVersion: 8,
      dataVersion: 8,
      academyOffers: [{ ...offer, club: legacyClub }],
    })

    expect(migrated.saveVersion).toBe(9)
    expect(migrated.academyOffers[0]?.club.country).toBe('中国')
    expect(migrated.academyOffers[0]?.club.leagueKey).toBe('中国')
  })

  it('accepts one renewal plus three external contract offers', () => {
    const current = validateGameState(legacyIdentityState())
    const offer = {
      id: 'renewal-9-current-club',
      type: 'RENEWAL' as const,
      clubId: 'current-club',
      remainingHalfYears: 4,
      annualSalaryEuro: 60_000,
      promisedTeamLevel: 'YOUTH' as const,
      promisedRole: 'CORE' as const,
      releaseClauseEuro: 1_000_000,
      clubOptionYears: 0,
      parentClubId: null,
      brokenPromiseWindows: 0,
      transferFeeEuro: 0,
      interestScore: 100,
      estimatedPotential: 80,
      counterUsed: false,
      counterDirection: null,
      negotiationSucceeded: null,
      negotiationMessage: null,
      withdrawn: false,
    }
    const offers = [
      offer,
      ...['club-a', 'club-b', 'club-c'].map((clubId, index) => ({
        ...offer,
        id: `free-9-${clubId}`,
        type: 'FREE_TRANSFER' as const,
        clubId,
        interestScore: 80 - index,
      })),
    ]

    const restored = validateGameState({
      ...current,
      transferOffers: offers,
    })

    expect(restored.transferOffers).toHaveLength(4)
  })

  it('continues a version 2 completed demo at the third window', () => {
    const seed = 'legacy-two-window-save'
    const draft = createDraft('CM')
    const player = generatePlayer(draft, seed)
    const offers = generateAcademyOffers(player, seed)
    const offer = offers[1]!
    const first = simulateHalfYear({
      player,
      offer,
      role: offer.expectedRole,
      arrivalChoice: 'COACH',
      trainingFocus: 'BALANCED',
      careerSeed: seed,
      startYear: 2026,
      windowIndex: 0,
      cashBeforeEuro: 1000,
    })
    const second = simulateHalfYear({
      player: first.player,
      offer,
      role: first.role,
      arrivalChoice: null,
      trainingFocus: 'mental',
      careerSeed: seed,
      startYear: 2026,
      windowIndex: 1,
      cashBeforeEuro: first.report.cashAfterEuro,
    })
    const legacy = {
      saveVersion: 2,
      dataVersion: 2,
      phase: 'CAREER_DASHBOARD',
      careerSeed: seed,
      startYear: 2026,
      windowIndex: 1,
      draft,
      player: second.player,
      academyOffers: offers,
      selectedClubId: offer.club.id,
      youthRole: second.role,
      arrivalChoice: 'COACH',
      trainingFocus: 'mental',
      trainingQualityBonus: 0,
      cashEuro: second.report.cashAfterEuro,
      lastReport: second.report,
      history: [
        {
          windowIndex: 0,
          clubId: offer.club.id,
          clubName: offer.club.name,
          role: first.role,
          stats: first.report.stats,
          arrivalChoice: 'COACH',
          trainingFocus: 'BALANCED',
          endingAttributes: first.player.attributes,
        },
        {
          windowIndex: 1,
          clubId: offer.club.id,
          clubName: offer.club.name,
          role: second.role,
          stats: second.report.stats,
          arrivalChoice: null,
          trainingFocus: 'mental',
          endingAttributes: second.player.attributes,
        },
      ],
    }

    const migrated = validateGameState(legacy)
    expect(migrated.phase).toBe('HALF_YEAR_PLAN')
    expect(migrated.windowIndex).toBe(2)
    expect(migrated.history).toHaveLength(2)
    expect(migrated.firstTeamProgress.attention).toBe(34)
  })

  it('adds contract fields to a version 3 save', () => {
    const current = validateGameState(legacyIdentityState())
    const {
      firstTeamRole: _firstTeamRole,
      contract: _contract,
      professionalOffer: _professionalOffer,
      ...oldFields
    } = current
    const migrated = validateGameState({
      ...oldFields,
      saveVersion: 3,
      dataVersion: 3,
    })

    expect(migrated.saveVersion).toBe(9)
    expect(migrated.firstTeamRole).toBeNull()
    expect(migrated.contract).toBeNull()
    expect(migrated.professionalOffer).toBeNull()
    expect(migrated.transferOffers).toEqual([])
    expect(migrated.selectedTransferChoiceId).toBeNull()
  })

  it('repairs version 6 contract fulfillment from the role that played the window', () => {
    const current = validateGameState(legacyIdentityState())
    const seed = 'legacy-role-timing-repair'
    const draft = createDraft('CM')
    const player = generatePlayer(draft, seed)
    const offers = generateAcademyOffers(player, seed)
    const offer = offers[1]!
    const simulated = simulateHalfYear({
      player,
      offer,
      role: 'ROTATION',
      arrivalChoice: 'COACH',
      trainingFocus: 'BALANCED',
      careerSeed: seed,
      startYear: 2026,
      windowIndex: 4,
      cashBeforeEuro: 1_000,
    })
    const contract = {
      type: 'FIRST_PRO' as const,
      clubId: offer.club.id,
      remainingHalfYears: 6,
      annualSalaryEuro: 80_000,
      promisedTeamLevel: 'FIRST_TEAM' as const,
      promisedRole: 'STARTER' as const,
      releaseClauseEuro: 2_000_000,
      clubOptionYears: 0,
      parentClubId: null,
      brokenPromiseWindows: 0,
    }
    const legacy = {
      ...current,
      saveVersion: 6,
      dataVersion: 6,
      phase: 'HALF_YEAR_REPORT',
      careerSeed: seed,
      windowIndex: 4,
      draft,
      player: simulated.player,
      academyOffers: offers,
      selectedClubId: offer.club.id,
      teamLevel: 'FIRST_TEAM',
      youthRole: null,
      firstTeamRole: 'STARTER',
      contract,
      arrivalChoice: 'COACH',
      lastReport: {
        ...simulated.report,
        roleBefore: 'ROTATION',
        roleAfter: 'STARTER',
        firstTeam: {
          ...simulated.report.firstTeam,
          statusBefore: 'PROMOTED',
          statusAfter: 'PROMOTED',
        },
        contract: {
          annualSalaryEuro: contract.annualSalaryEuro,
          remainingHalfYears: contract.remainingHalfYears,
          promisedTeamLevel: contract.promisedTeamLevel,
          promisedRole: contract.promisedRole,
          actualTeamLevel: 'FIRST_TEAM',
          actualRole: 'STARTER',
          promiseFulfilled: true,
          brokenPromiseWindows: 0,
        },
      },
      history: [
        {
          windowIndex: 4,
          clubId: offer.club.id,
          clubName: offer.club.name,
          role: 'STARTER',
          stats: simulated.report.stats,
          arrivalChoice: null,
          trainingFocus: 'BALANCED',
          developmentApproach: 'STEADY',
          endingAttributes: simulated.player.attributes,
          firstTeamAttention: simulated.firstTeamProgress.attention,
          teamLevel: 'FIRST_TEAM',
        },
      ],
    }

    const migrated = validateGameState(legacy)

    expect(migrated.saveVersion).toBe(9)
    expect(migrated.lastReport?.contract?.actualRole).toBe('ROTATION')
    expect(migrated.lastReport?.contract?.actualTeamLevel).toBe('FIRST_TEAM')
    expect(migrated.lastReport?.contract?.promiseFulfilled).toBe(false)
    expect(migrated.contract?.brokenPromiseWindows).toBe(1)
    expect(migrated.history[0]?.role).toBe('ROTATION')

    const repairedExpiredPlan = validateGameState({
      ...migrated,
      phase: 'HALF_YEAR_PLAN',
      windowIndex: 5,
      contract: {
        ...migrated.contract!,
        remainingHalfYears: 0,
      },
      trainingFocus: 'BALANCED',
      developmentApproach: 'STEADY',
    })
    expect(repairedExpiredPlan.phase).toBe('PRO_STAGE_COMPLETE')
    expect(repairedExpiredPlan.windowIndex).toBe(4)
    expect(repairedExpiredPlan.trainingFocus).toBeNull()

    const repairedOverAge = validateGameState({
      ...migrated,
      phase: 'HALF_YEAR_PLAN',
      windowIndex: 56,
      trainingFocus: null,
      developmentApproach: null,
    })
    expect(repairedOverAge.phase).toBe('RETIREMENT_DECISION')
    expect(repairedOverAge.retirementReason).toBe('AGE_LIMIT')
  })
})
