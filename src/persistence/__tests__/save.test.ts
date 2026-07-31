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
    expect(migrated.saveVersion).toBe(4)
    expect(migrated.dataVersion).toBe(4)
    expect(migrated.draft.jerseyNumber).toBe(10)
    expect(migrated.draft.preferredFoot).toBe('RIGHT')
    expect(migrated.teamLevel).toBe('YOUTH')
    expect(migrated.firstTeamProgress.attention).toBe(0)
    expect(migrated.contract).toBeNull()
    expect(migrated.professionalOffer).toBeNull()
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

    expect(migrated.saveVersion).toBe(4)
    expect(migrated.firstTeamRole).toBeNull()
    expect(migrated.contract).toBeNull()
    expect(migrated.professionalOffer).toBeNull()
  })
})
