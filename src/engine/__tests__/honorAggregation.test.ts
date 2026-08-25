import { describe, expect, it } from 'vitest'
import { HONOR_VISUAL_REGISTRY, matchHonorVisual } from '../../data/honors/honorVisualRegistry'
import { CLUBS } from '../../data/balance'
import { aggregateCareerHonors, aggregateClubCareerHonors } from '../honorAggregation'
import { competitionLabelsForClub } from '../honors'
import type { CareerHonor } from '../../models/game'

function honor(input: Partial<CareerHonor> & Pick<CareerHonor, 'type' | 'scope' | 'competitionLabel'>): CareerHonor {
  return {
    id: input.id ?? `${input.scope}:${input.type}:${input.competitionLabel}:${input.windowIndex ?? 10}`,
    type: input.type,
    scope: input.scope,
    label: input.label ?? `${input.competitionLabel}冠军`,
    competitionLabel: input.competitionLabel,
    seasonLabel: input.seasonLabel ?? '2031赛季',
    windowIndex: input.windowIndex ?? 10,
    clubId: input.clubId ?? 'ita_inter',
    clubName: input.clubName ?? '国际米兰',
  }
}

describe('honor aggregation and visual registry', () => {
  it('covers the complete production honor identity set with exactly one reviewed visual each', () => {
    expect(HONOR_VISUAL_REGISTRY).toHaveLength(42)
    expect(new Set(HONOR_VISUAL_REGISTRY.map((item) => item.key)).size).toBe(42)
    expect(new Set(HONOR_VISUAL_REGISTRY.map((item) => item.assetPath)).size).toBe(42)
    for (const visual of HONOR_VISUAL_REGISTRY) {
      expect(visual.assetPath).toMatch(/assets\/honors\/.+\.svg$/)
      expect(visual.rightsNote).toMatch(/独立|原创/)
      if (visual.referenceStatus === 'OFFICIAL_IDENTITY_REFERENCE') {
        expect(visual.identityReferenceUrl).toMatch(/^https:\/\//)
      } else if (visual.referenceStatus === 'ORIGINAL_DESIGN') {
        expect(visual.identityReferenceUrl).toBeNull()
      }
    }

    const clubLabels = CLUBS.map(competitionLabelsForClub)
    const labels = (key: 'league' | 'domesticCup' | 'continental') =>
      [...new Set(clubLabels.map((item) => item[key]).filter((item): item is string => Boolean(item)))].sort()
    const leagueLabels = labels('league')
    const domesticCupLabels = labels('domesticCup')
    const continentalLabels = labels('continental')
    expect(leagueLabels).toHaveLength(19)
    expect(domesticCupLabels).toHaveLength(13)
    expect(continentalLabels).toHaveLength(4)

    const identities: Array<Pick<CareerHonor, 'type' | 'competitionLabel' | 'label'>> = [
      ...leagueLabels.map((competitionLabel) => honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel })),
      ...domesticCupLabels.map((competitionLabel) => honor({ type: 'DOMESTIC_CUP', scope: 'CLUB', competitionLabel })),
      ...continentalLabels.map((competitionLabel) => honor({ type: 'CONTINENTAL_TITLE', scope: 'CLUB', competitionLabel })),
      honor({ type: 'WORLD_CUP', scope: 'NATIONAL', competitionLabel: '世界杯' }),
      honor({ type: 'ASIAN_CUP', scope: 'NATIONAL', competitionLabel: '亚洲杯' }),
      honor({ type: 'BALLON_DOR', scope: 'INDIVIDUAL', competitionLabel: '金球奖' }),
      // The personal-honor production path is type based. Check every current
      // league label so a future league cannot silently lose its shared badge.
      ...(['GOLDEN_BOOT', 'TEAM_OF_SEASON', 'LEAGUE_PLAYER_OF_YEAR'] as const).flatMap((type) =>
        leagueLabels.map((competitionLabel) => honor({ type, scope: 'INDIVIDUAL', competitionLabel }))),
    ]

    const matchedVisuals = identities.map((identity) => {
      const matches = HONOR_VISUAL_REGISTRY.filter((visual) =>
        visual.type === identity.type &&
        (visual.competitionLabels.length === 0 || visual.competitionLabels.includes(identity.competitionLabel)))
      expect(matches).toHaveLength(1)
      return matches[0]!
    })
    expect(new Set(matchedVisuals.map((visual) => visual.key))).toEqual(
      new Set(HONOR_VISUAL_REGISTRY.map((visual) => visual.key)),
    )
    expect(identities.map((identity) => matchHonorVisual(identity).visual?.key))
      .toEqual(matchedVisuals.map((visual) => visual.key))
  })

  it('falls back by honor category for a configured type with an unknown competition', () => {
    const matched = matchHonorVisual(honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '未知联赛', label: '未知联赛冠军' }))
    expect(matched).toMatchObject({ visual: null, fallbackMark: '联', displayLabel: '未知联赛冠军' })
  })

  it('aggregates repeated Serie A titles but keeps a Premier League title separate', () => {
    const titles = [
      honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '意甲', seasonLabel: '2032赛季', windowIndex: 12 }),
      honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '意甲', seasonLabel: '2030赛季', windowIndex: 8 }),
      honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '英超', seasonLabel: '2031赛季', windowIndex: 10 }),
    ]
    const grouped = aggregateCareerHonors(titles)
    expect(grouped).toEqual(expect.arrayContaining([
      expect.objectContaining({ competitionLabel: '意甲', count: 2, seasons: ['2030赛季', '2032赛季'] }),
      expect.objectContaining({ competitionLabel: '英超', count: 1 }),
    ]))
  })

  it('keeps club, national, and individual honors in separate groups', () => {
    const grouped = aggregateCareerHonors([
      honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '意甲' }),
      honor({ type: 'WORLD_CUP', scope: 'NATIONAL', competitionLabel: '世界杯' }),
      honor({ type: 'GOLDEN_BOOT', scope: 'INDIVIDUAL', competitionLabel: '意甲' }),
    ])
    expect(grouped.map((item) => item.scope).sort()).toEqual(['CLUB', 'INDIVIDUAL', 'NATIONAL'])
  })

  it('filters a returning player club spell before aggregation and does not mutate input', () => {
    const honors = [
      honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '意甲', clubId: 'ita_inter', windowIndex: 8 }),
      honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '意甲', clubId: 'ita_inter', windowIndex: 16 }),
      honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '英超', clubId: 'eng_arsenal', windowIndex: 12 }),
    ]
    const before = [...honors]
    const grouped = aggregateClubCareerHonors(honors, 'ita_inter')
    expect(grouped).toEqual([expect.objectContaining({ clubId: 'ita_inter', competitionLabel: '意甲', count: 2 })])
    expect(honors).toEqual(before)
  })

  it('returns a stable order independently of input order', () => {
    const honors = [
      honor({ type: 'GOLDEN_BOOT', scope: 'INDIVIDUAL', competitionLabel: '意甲', windowIndex: 12 }),
      honor({ type: 'LEAGUE_TITLE', scope: 'CLUB', competitionLabel: '意甲', windowIndex: 10 }),
      honor({ type: 'WORLD_CUP', scope: 'NATIONAL', competitionLabel: '世界杯', windowIndex: 14 }),
    ]
    expect(aggregateCareerHonors(honors)).toEqual(aggregateCareerHonors([...honors].reverse()))
  })
})
