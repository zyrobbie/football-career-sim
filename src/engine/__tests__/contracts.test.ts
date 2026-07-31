import { describe, expect, it } from 'vitest'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import {
  contractFromOffer,
  generateFirstProfessionalOffer,
  resolveFirstContractCounter,
} from '../contracts'
import { createDraft } from './testFixtures'

function createOfferFixture(teamLevel: 'YOUTH' | 'FIRST_TEAM' = 'YOUTH') {
  const seed = 'contract-test-seed'
  const player = generatePlayer(createDraft('CM'), seed)
  const club = generateAcademyOffers(player, seed)[1]!.club
  const offer = generateFirstProfessionalOffer({
    player,
    club,
    youthRole: 'STARTER',
    teamLevel,
    firstTeamProgress: {
      clubId: club.id,
      attention: teamLevel === 'FIRST_TEAM' ? 86 : 68,
      readiness: 70,
      matchProof: 67,
      coachBacking: 72,
      status: teamLevel === 'FIRST_TEAM' ? 'PROMOTED' : 'FIRST_TEAM_TRAINING',
    },
    careerSeed: seed,
  })
  return { seed, player, club, offer }
}

describe('first professional contract', () => {
  it('generates a deterministic, valid academy contract', () => {
    const fixture = createOfferFixture()
    const repeated = createOfferFixture()

    expect(fixture.offer).toEqual(repeated.offer)
    expect(fixture.offer.promisedTeamLevel).toBe('YOUTH')
    expect(fixture.offer.promisedRole).toBe('STARTER')
    expect(fixture.offer.annualSalaryEuro).toBeGreaterThan(0)
    expect(fixture.offer.remainingHalfYears).toBeGreaterThanOrEqual(6)
    expect(fixture.offer.remainingHalfYears).toBeLessThanOrEqual(10)
    expect(fixture.offer.releaseClauseEuro).toBeGreaterThan(
      fixture.offer.annualSalaryEuro,
    )
  })

  it('uses a first-team role after promotion', () => {
    const { offer } = createOfferFixture('FIRST_TEAM')

    expect(offer.promisedTeamLevel).toBe('FIRST_TEAM')
    expect([
      'FRINGE',
      'SUBSTITUTE',
      'ROTATION',
      'STARTER',
      'CORE',
    ]).toContain(offer.promisedRole)
  })

  it('allows exactly one deterministic counteroffer and keeps a signable offer', () => {
    const { offer, player, seed } = createOfferFixture()
    const negotiated = resolveFirstContractCounter({
      offer,
      direction: 'SALARY',
      player,
      careerSeed: seed,
    })

    expect(negotiated.counterUsed).toBe(true)
    expect(negotiated.counterDirection).toBe('SALARY')
    expect(negotiated.negotiationSucceeded).not.toBeNull()
    expect(negotiated.annualSalaryEuro).toBeGreaterThanOrEqual(
      offer.annualSalaryEuro,
    )
    expect(() =>
      resolveFirstContractCounter({
        offer: negotiated,
        direction: 'RELEASE_CLAUSE',
        player,
        careerSeed: seed,
      }),
    ).toThrow('已经完成过一次反报价')

    const contract = contractFromOffer(negotiated)
    expect(contract.type).toBe('FIRST_PRO')
    expect(contract).not.toHaveProperty('counterUsed')
  })
})
