import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import { generatePlayer } from '../player'
import {
  applyTransferArrivalChoice,
  contractFromTransferOffer,
  generateDomesticTransferOffers,
  integrationBaseForTransfer,
  resolveTransferCounter,
  transferDinnerCost,
} from '../transfers'
import { createDraft } from './testFixtures'

function createTransferFixture() {
  const careerSeed = 'domestic-transfer-test-seed'
  const player = generatePlayer(createDraft('CM'), careerSeed)
  player.attributes = {
    attack: player.attributes.attack + 4,
    defense: player.attributes.defense + 4,
    physical: player.attributes.physical + 4,
    mental: player.attributes.mental + 4,
  }
  player.form = 62
  player.reputation = 34
  const currentClubId = CLUBS[3]!.id
  const offers = generateDomesticTransferOffers({
    player,
    currentClubId,
    currentTeamLevel: 'YOUTH',
    latestReport: null,
    careerSeed,
    windowIndex: 5,
  })
  return { careerSeed, player, currentClubId, offers }
}

describe('domestic transfer window', () => {
  it('creates up to three deterministic offers excluding the current club', () => {
    const fixture = createTransferFixture()
    const repeated = createTransferFixture()

    expect(fixture.offers).toEqual(repeated.offers)
    expect(fixture.offers).toHaveLength(3)
    expect(
      fixture.offers.every(
        (offer) => offer.clubId !== fixture.currentClubId,
      ),
    ).toBe(true)
    expect(
      fixture.offers.every(
        (offer) =>
          offer.interestScore >= 50 &&
          offer.transferFeeEuro > 0 &&
          offer.annualSalaryEuro > 0,
      ),
    ).toBe(true)
  })

  it('resolves one counteroffer and always leaves an explicit final state', () => {
    const { offers, player, careerSeed } = createTransferFixture()
    const offer = offers[0]!
    const negotiated = resolveTransferCounter({
      offer,
      direction: 'SALARY',
      player,
      careerSeed,
      windowIndex: 5,
    })

    expect(negotiated.counterUsed).toBe(true)
    expect(negotiated.counterDirection).toBe('SALARY')
    expect(negotiated.negotiationSucceeded).not.toBeNull()
    expect(
      negotiated.withdrawn ||
        negotiated.annualSalaryEuro >= offer.annualSalaryEuro,
    ).toBe(true)
    expect(() =>
      resolveTransferCounter({
        offer: negotiated,
        direction: 'ROLE',
        player,
        careerSeed,
        windowIndex: 5,
      }),
    ).toThrow()

    if (!negotiated.withdrawn) {
      const contract = contractFromTransferOffer(negotiated)
      expect(contract.clubId).toBe(offer.clubId)
      expect(contract).not.toHaveProperty('transferFeeEuro')
      expect(contract).not.toHaveProperty('counterUsed')
    }
  })

  it('uses reputation for initial integration and charges the visible dinner cost', () => {
    const { player } = createTransferFixture()
    const knownPlayer = {
      ...player,
      reputation: 60,
      coachRelation: 80,
      squadRelation: 80,
      fanRelation: 80,
    }
    const base = integrationBaseForTransfer(knownPlayer)
    const integrated = { ...knownPlayer, ...base }
    const cashEuro = 10_000
    const result = applyTransferArrivalChoice({
      player: integrated,
      choice: 'DINNER',
      cashEuro,
    })

    expect(base.squadRelation).toBeGreaterThan(34)
    expect(result.cashSpentEuro).toBe(
      transferDinnerCost(cashEuro),
    )
    expect(result.cashEuro).toBe(cashEuro - result.cashSpentEuro)
    expect(result.player.squadRelation).toBeGreaterThan(
      integrated.squadRelation,
    )
  })
})
