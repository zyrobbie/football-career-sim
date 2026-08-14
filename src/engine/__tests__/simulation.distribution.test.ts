import { describe, expect, it } from 'vitest'
import {
  INITIAL_OVR_DISTRIBUTION,
  POTENTIAL_DISTRIBUTION,
} from '../../data/balance'
import {
  attributeKeys,
  positions,
  type Position,
} from '../../models/game'
import { generateAcademyOffers } from '../offers'
import { calculateOverall, generatePlayer } from '../player'
import { simulateHalfYear } from '../simulateHalfYear'
import { createDraft } from './testFixtures'

describe('10,000-player first-window distribution', () => {
  it('draws three distinct Chinese academy offers from the expanded catalog deterministically', () => {
    const observed = new Set<string>()
    for (let index = 0; index < 100; index += 1) {
      const player = generatePlayer(createDraft('CM'), `academy-catalog-${index}`)
      const first = generateAcademyOffers(player, `academy-catalog-${index}`)
      const second = generateAcademyOffers(player, `academy-catalog-${index}`)
      expect(first).toEqual(second)
      expect(first).toHaveLength(3)
      expect(new Set(first.map((offer) => offer.club.id)).size).toBe(3)
      expect(first.every((offer) => offer.club.country === '中国')).toBe(true)
      for (const offer of first) observed.add(offer.club.id)
    }
    expect(observed.size).toBeGreaterThanOrEqual(12)
    expect([...observed].some((id) => !['cn_shanghai_donggang', 'cn_beijing_yuhua', 'cn_wuhan_jiangcheng', 'cn_chengdu_jincheng', 'cn_guangxi_liancheng', 'cn_yunnan_shanhe'].includes(id))).toBe(true)
  })

  it('produces no invariant failures and tracks the intended OVR curve', () => {
    const samples = 10_000
    const overallCounts = new Map<number, number>()
    const potentialCounts = new Map<string, number>()
    const roleCounts = new Map<string, number>()
    let invariantFailures = 0
    let totalGrowth = 0
    let injuries = 0

    for (let index = 0; index < samples; index += 1) {
      const position = positions[index % positions.length] as Position
      const seed = `distribution-${index}`
      const player = generatePlayer(createDraft(position), seed)
      const overall = Math.round(
        calculateOverall(player.attributes, player.primaryPosition),
      )
      const potential = calculateOverall(
        player.potentials,
        player.primaryPosition,
      )
      overallCounts.set(overall, (overallCounts.get(overall) ?? 0) + 1)
      const potentialTier = POTENTIAL_DISTRIBUTION.find(
        (item) => potential <= item.max + 0.6,
      )
      if (!potentialTier) {
        invariantFailures += 1
      } else {
        potentialCounts.set(
          potentialTier.label,
          (potentialCounts.get(potentialTier.label) ?? 0) + 1,
        )
      }

      const offers = generateAcademyOffers(player, seed)
      if (
        offers.length !== 3 ||
        new Set(offers.map((offer) => offer.club.profile)).size !== 3
      ) {
        invariantFailures += 1
      }
      const offer = offers[1]!
      roleCounts.set(
        offer.expectedRole,
        (roleCounts.get(offer.expectedRole) ?? 0) + 1,
      )
      const result = simulateHalfYear({
        player,
        offer,
        role: offer.expectedRole,
        arrivalChoice: 'TEAMMATES',
        trainingFocus: 'BALANCED',
        careerSeed: seed,
        startYear: 2026,
        windowIndex: 0,
        cashBeforeEuro: 1000,
      })
      if (result.report.injury) injuries += 1

      for (const key of attributeKeys) {
        const value = result.player.attributes[key]
        totalGrowth += value - player.attributes[key]
        if (
          !Number.isFinite(value) ||
          value < 0 ||
          value > 100 ||
          value > result.player.potentials[key]
        ) {
          invariantFailures += 1
        }
      }
      const stats = result.report.stats
      if (
        stats.starts > stats.appearances ||
        stats.appearances < 0 ||
        stats.minutes < 0 ||
        result.report.cashAfterEuro < 0
      ) {
        invariantFailures += 1
      }
    }

    expect(invariantFailures).toBe(0)
    expect(totalGrowth / samples).toBeGreaterThan(1)
    expect(totalGrowth / samples).toBeLessThan(9)
    expect(injuries / samples).toBeGreaterThan(0.015)
    expect(injuries / samples).toBeLessThan(0.05)
    expect(roleCounts.size).toBeGreaterThan(1)

    for (const expected of INITIAL_OVR_DISTRIBUTION) {
      const actualShare = (overallCounts.get(expected.value) ?? 0) / samples
      expect(actualShare).toBeGreaterThan(
        Math.max(0, expected.weight / 100 - 0.025),
      )
      expect(actualShare).toBeLessThan(expected.weight / 100 + 0.025)
    }

    for (const expected of POTENTIAL_DISTRIBUTION) {
      const actualShare = (potentialCounts.get(expected.label) ?? 0) / samples
      expect(actualShare).toBeGreaterThan(
        Math.max(0, expected.weight / 100 - 0.025),
      )
      expect(actualShare).toBeLessThan(expected.weight / 100 + 0.025)
    }
  }, 90_000)
})
