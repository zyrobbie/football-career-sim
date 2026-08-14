import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import { listClubParameters } from '../../data/clubs/clubRepository'
import {
  developmentMultiplierWithMatchExperience,
  developmentMultiplierFromTraining,
  firstTeamMatchExperienceBonus,
  firstTeamMatchExperienceBonusForRuntimeClub,
  leagueExperienceIntensity,
  trainingQualityScore,
  usesLegacyTrainingFallback,
} from '../trainingQuality'

function club(id: string) {
  return CLUBS.find((candidate) => candidate.id === id)!
}

describe('training quality', () => {
  it('uses V1 continuous facility, academy and platform data for all 366 runtime clubs', () => {
    expect(CLUBS).toHaveLength(366)
    for (const runtimeClub of CLUBS) {
      expect(usesLegacyTrainingFallback(runtimeClub)).toBe(false)
    }
  })

  it('keeps the five approved V1 training-quality examples at coach relation 50', () => {
    const cases = [
      ['ita_inter', 96.2, 96.4],
      ['ned_ajax', 92.1, 89.3],
      ['eng_brighton', 84.6, 82.9],
      ['cn_shanghai_donggang', 71.4, 71.8],
      ['cn_guangxi_liancheng', 50.3, 50.8],
    ] as const
    for (const [id, youth, firstTeam] of cases) {
      const runtimeClub = club(id)
      expect(trainingQualityScore({ club: runtimeClub, coachRelation: 50, teamLevel: 'YOUTH' })).toBe(youth)
      expect(trainingQualityScore({ club: runtimeClub, coachRelation: 50, teamLevel: 'FIRST_TEAM' })).toBe(firstTeam)
    }
  })

  it('does not collapse formal clubs with the same former training tiers into one quality', () => {
    const arsenal = club('eng_arsenal')
    const madrid = club('esp_real_madrid')
    expect(arsenal.facilityTier).toBe(madrid.facilityTier)
    expect(arsenal.academyTier).toBe(madrid.academyTier)
    expect(trainingQualityScore({ club: arsenal, coachRelation: 50, teamLevel: 'YOUTH' }))
      .not.toBe(trainingQualityScore({ club: madrid, coachRelation: 50, teamLevel: 'YOUTH' }))
  })

  it('raises training quality monotonically with coach relation, applies bonuses, and keeps fixture fallback', () => {
    const inter = club('ita_inter')
    const low = trainingQualityScore({ club: inter, coachRelation: 0, teamLevel: 'YOUTH' })
    const mid = trainingQualityScore({ club: inter, coachRelation: 50, teamLevel: 'YOUTH' })
    const high = trainingQualityScore({ club: inter, coachRelation: 100, teamLevel: 'YOUTH' })
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
    expect(trainingQualityScore({ club: inter, coachRelation: 100, teamLevel: 'FIRST_TEAM', bonus: 20 })).toBe(100)
    const fixture = { ...inter, id: 'fixture_unmapped_club' }
    expect(usesLegacyTrainingFallback(fixture)).toBe(true)
  })

  it('keeps a visible nonlinear gap from global elite to domestic levels', () => {
    const common = {
      coachRelation: 50,
      teamLevel: 'YOUTH' as const,
    }
    const inter = trainingQualityScore({
      ...common,
      club: club('ita_inter'),
    })
    const shanghai = trainingQualityScore({
      ...common,
      club: club('cn_shanghai_donggang'),
    })
    const guangxi = trainingQualityScore({
      ...common,
      club: club('cn_guangxi_liancheng'),
    })

    expect(inter).toBeGreaterThan(shanghai)
    expect(shanghai).toBeGreaterThan(guangxi)

    const multiplier = (trainingQuality: number) =>
      developmentMultiplierFromTraining({
        trainingQuality,
        roleExposure: 90,
        squadRelation: 50,
        fitness: 70,
        morale: 70,
        focus: 'BALANCED',
      })
    const interMultiplier = multiplier(inter)
    const shanghaiMultiplier = multiplier(shanghai)
    const guangxiMultiplier = multiplier(guangxi)

    expect(interMultiplier).toBeGreaterThan(shanghaiMultiplier)
    expect(shanghaiMultiplier).toBeGreaterThan(guangxiMultiplier)
    expect(interMultiplier - shanghaiMultiplier).toBeGreaterThan(
      shanghaiMultiplier - guangxiMultiplier,
    )
    expect(interMultiplier / shanghaiMultiplier).toBeGreaterThan(1.2)
  })

  it('classifies every V1 league and applies the exact minutes boundaries', () => {
    const expectedIntensity: Record<string, number> = {
      'Premier League（20）': 1.15, 'LaLiga EA Sports（20）': 1.15, 'Serie A（20）': 1.15, 'Bundesliga（18）': 1.15, 'Ligue 1（18）': 1.15,
      'Eredivisie（18）': 1.08, 'Liga Portugal（18）': 1.08, 'Belgian Pro League（18）': 1.08,
      'EFL Championship（24）': 1, 'LaLiga Hypermotion（22）': 1, 'Serie B（20）': 1, '2. Bundesliga（18）': 1, 'Ligue 2（18）': 1, 'Campeonato Brasileiro Série A（20）': 1, 'Liga Profesional（30）': 1,
      '中国顶级联赛（16）': 0.92, 'J1 League（20）': 0.92, 'K League 1（12）': 0.92, '中国次级联赛（16）': 0.85,
    }
    const oneClubPerLeague = new Map(listClubParameters().map((parameters) => [parameters.league, parameters]))
    expect(oneClubPerLeague.size).toBe(19)
    for (const [league, intensity] of Object.entries(expectedIntensity)) {
      expect(leagueExperienceIntensity(oneClubPerLeague.get(league)!)).toBe(intensity)
    }
    const interParameters = oneClubPerLeague.get('Serie A（20）')!
    expect([0, 1, 270, 271, 630, 631, 990, 991].map((minutes) => firstTeamMatchExperienceBonus({ club: interParameters, minutes }))).toEqual([
      0, 0.0345, 0.0345, 0.115, 0.115, 0.2645, 0.2645, 0.322,
    ])
    expect(firstTeamMatchExperienceBonusForRuntimeClub({ club: club('ita_inter'), minutes: 0 })).toBe(0)
  })

  it('combines real first-team minutes only after the existing environment multiplier', () => {
    const context = { squadRelation: 50, fitness: 70, morale: 70, focus: 'BALANCED' as const }
    const interYouthCore = developmentMultiplierFromTraining({ trainingQuality: 96.2, roleExposure: 90, ...context })
    const ajaxRotation = developmentMultiplierWithMatchExperience(
      developmentMultiplierFromTraining({ trainingQuality: 89.3, roleExposure: 60, ...context }),
      firstTeamMatchExperienceBonusForRuntimeClub({ club: club('ned_ajax'), minutes: 700 }),
    )
    const interFringe = developmentMultiplierWithMatchExperience(
      developmentMultiplierFromTraining({ trainingQuality: 96.4, roleExposure: 20, ...context }), 0,
    )
    const interYouthStarter = developmentMultiplierFromTraining({ trainingQuality: 96.2, roleExposure: 72, ...context })
    expect(ajaxRotation).toBeGreaterThanOrEqual(interYouthCore)
    expect(interFringe).toBeLessThan(interYouthStarter)
    expect(developmentMultiplierWithMatchExperience(interYouthCore, 0)).toBe(interYouthCore)
  })
})
