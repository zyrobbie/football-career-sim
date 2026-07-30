import { describe, expect, it } from 'vitest'
import { attributeKeys } from '../../models/game'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import { simulateHalfYear } from '../simulateHalfYear'
import { createDraft } from './testFixtures'

describe('half-year simulation', () => {
  it('is deterministic and respects report invariants', () => {
    const seed = 'simulation-determinism'
    const player = generatePlayer(createDraft('ST'), seed)
    const offer = generateAcademyOffers(player, seed)[1]!
    const input = {
      player,
      offer,
      role: offer.expectedRole,
      arrivalChoice: 'COACH' as const,
      trainingFocus: 'physical' as const,
      careerSeed: seed,
      startYear: 2026,
      windowIndex: 0,
      cashBeforeEuro: 1000,
    }
    const first = simulateHalfYear(input)
    const second = simulateHalfYear(input)
    expect(first).toEqual(second)

    const { stats } = first.report
    expect(stats.appearances).toBeGreaterThan(0)
    expect(stats.starts).toBeLessThanOrEqual(stats.appearances)
    expect(stats.minutes).toBeGreaterThan(0)
    expect(stats.averageRating).toBeGreaterThanOrEqual(5.5)
    expect(stats.averageRating).toBeLessThanOrEqual(8.5)
    expect(first.report.cashAfterEuro).toBe(
      1000 + offer.annualStipendEuro / 2,
    )

    for (const key of attributeKeys) {
      expect(first.player.attributes[key]).toBeGreaterThanOrEqual(
        player.attributes[key],
      )
      expect(first.player.attributes[key]).toBeLessThanOrEqual(
        player.potentials[key],
      )
    }
    expect(first.report.injury?.weeks ?? 0).toBeLessThanOrEqual(6)
  })

  it('uses an independent second-window stream without repeating arrival rewards', () => {
    const seed = 'two-window-career'
    const player = generatePlayer(createDraft('CM'), seed)
    const offer = generateAcademyOffers(player, seed)[1]!
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

    expect(first.report.fromLabel).toBe('2026年夏季')
    expect(first.report.toLabel).toBe('2026年冬季')
    expect(second.report.fromLabel).toBe('2026年冬季')
    expect(second.report.toLabel).toBe('2027年夏季')
    expect(second.report.stats).not.toEqual(first.report.stats)
    expect(second.report.cashAfterEuro).toBe(
      1000 + offer.annualStipendEuro,
    )
    expect(second.report.eventSummary).not.toContain('主动与教练沟通')
  })
})
