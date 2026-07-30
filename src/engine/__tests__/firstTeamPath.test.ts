import { describe, expect, it } from 'vitest'
import type {
  FirstTeamProgress,
  TeamLevel,
} from '../../models/game'
import { generateAcademyOffers } from '../offers'
import { evaluateFirstTeamProgress } from '../firstTeamPath'
import { generatePlayer } from '../player'
import { simulateHalfYear } from '../simulateHalfYear'
import { createDraft } from './testFixtures'

const stats = {
  appearances: 15,
  starts: 13,
  minutes: 1120,
  goals: 5,
  assists: 3,
  yellowCards: 1,
  redCards: 0,
  averageRating: 7.1,
}

describe('first-team pathway', () => {
  it('keeps the pathway explainable and rewards a faster club route', () => {
    const seed = 'first-team-path'
    const player = generatePlayer(createDraft('LW'), seed)
    player.coachRelation = 68
    const baseOffer = generateAcademyOffers(player, seed)[1]!
    const previous = {
      clubId: baseOffer.club.id,
      attention: 52,
      readiness: 44,
      matchProof: 58,
      coachBacking: 55,
      status: 'WATCHLIST' as const,
    }
    const shared = {
      previous,
      player,
      role: 'CORE' as const,
      stats,
      windowIndex: 2,
      approach: 'PUSH' as const,
    }
    const hard = evaluateFirstTeamProgress({
      ...shared,
      offer: { ...baseOffer, firstTeamChance: 'HARD' },
    })
    const fast = evaluateFirstTeamProgress({
      ...shared,
      offer: { ...baseOffer, firstTeamChance: 'FAST' },
    })

    expect(fast.progress.attention).toBeGreaterThan(
      hard.progress.attention,
    )
    expect(fast.progress.readiness).toBeGreaterThanOrEqual(0)
    expect(fast.progress.matchProof).toBeLessThanOrEqual(100)
    expect(fast.progress.coachBacking).toBeLessThanOrEqual(100)
  })

  it('does not allow formal promotion before the end of age 14', () => {
    const seed = 'early-promotion-gate'
    const player = generatePlayer(createDraft('CM'), seed)
    player.attributes = {
      attack: 70,
      defense: 70,
      physical: 70,
      mental: 70,
    }
    player.potentials = {
      attack: 80,
      defense: 80,
      physical: 80,
      mental: 80,
    }
    player.coachRelation = 90
    const offer = {
      ...generateAcademyOffers(player, seed)[0]!,
      firstTeamChance: 'FAST' as const,
    }
    const result = evaluateFirstTeamProgress({
      previous: {
        clubId: offer.club.id,
        attention: 90,
        readiness: 90,
        matchProof: 90,
        coachBacking: 90,
        status: 'PROMOTION_READY',
      },
      player,
      offer,
      role: 'CORE',
      stats: { ...stats, averageRating: 8 },
      windowIndex: 2,
      approach: 'PUSH',
    })

    expect(result.teamLevel).toBe('YOUTH')
    expect(result.progress.status).not.toBe('PROMOTED')
  })

  it('keeps formal promotion possible but uncommon after four windows', () => {
    const samples = 400
    let promotions = 0

    for (let index = 0; index < samples; index += 1) {
      const seed = `promotion-distribution-${index}`
      let player = generatePlayer(createDraft('ST'), seed)
      const offer = generateAcademyOffers(player, seed)[2]!
      let role = offer.expectedRole
      let progress: FirstTeamProgress = {
        clubId: offer.club.id,
        attention: 18,
        readiness: 0,
        matchProof: 0,
        coachBacking: 0,
        status: 'DEVELOPING',
      }
      let teamLevel: TeamLevel = 'YOUTH'
      let cash = 1000

      for (let windowIndex = 0; windowIndex < 4; windowIndex += 1) {
        const result = simulateHalfYear({
          player,
          offer,
          role,
          arrivalChoice: windowIndex === 0 ? 'COACH' : null,
          trainingFocus: 'BALANCED',
          careerSeed: seed,
          startYear: 2026,
          windowIndex,
          cashBeforeEuro: cash,
          developmentApproach: windowIndex >= 2 ? 'PUSH' : null,
          firstTeamProgress: progress,
          teamLevel,
        })
        player = result.player
        role = result.role
        progress = result.firstTeamProgress
        teamLevel = result.teamLevel
        cash = result.report.cashAfterEuro
      }

      if (teamLevel === 'FIRST_TEAM') promotions += 1
    }

    expect(promotions).toBeGreaterThan(0)
    expect(promotions / samples).toBeLessThan(0.45)
  }, 15_000)
})
