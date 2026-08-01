import { describe, expect, it } from 'vitest'
import { CLUBS, isOverseasClub } from '../../data/balance'
import type { ContractState } from '../../models/game'
import { generatePlayer } from '../player'
import {
  assessDomesticTransferOpportunity,
  assessOverseasInterest,
  applyTransferArrivalChoice,
  contractFromTransferOffer,
  generateContractExpiryOffers,
  generateDomesticTransferOffers,
  generateTransferOffers,
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
  it('shows deterministic overseas scouting at 16-17 without creating a signable offer', () => {
    const { player, careerSeed } = createTransferFixture()
    const first = assessOverseasInterest({
      player,
      careerSeed,
      windowIndex: 6,
    })
    const repeated = assessOverseasInterest({
      player,
      careerSeed,
      windowIndex: 6,
    })

    expect(first).toEqual(repeated)
    expect(first.visible).toBe(true)
    expect(first.club && isOverseasClub(first.club)).toBe(true)
    expect(first.summary).toContain('不会生成可签署的国际转会合同')
    expect(
      assessOverseasInterest({ player, careerSeed, windowIndex: 4 }).visible,
    ).toBe(false)
    expect(
      assessOverseasInterest({ player, careerSeed, windowIndex: 10 }).visible,
    ).toBe(false)
  })

  it('keeps every formal offer domestic before age 18', () => {
    const { player, currentClubId, careerSeed } = createTransferFixture()
    player.overseasIntent = 'STRONG'
    const offers = generateTransferOffers({
      player,
      currentClubId,
      currentTeamLevel: 'FIRST_TEAM',
      latestReport: null,
      careerSeed,
      windowIndex: 9,
    })

    expect(offers).toHaveLength(3)
    expect(
      offers.every((offer) => {
        const club = CLUBS.find((candidate) => candidate.id === offer.clubId)
        return club !== undefined && !isOverseasClub(club)
      }),
    ).toBe(true)
  })

  it('uses intent and preferred leagues in formal offers from age 18', () => {
    const { player, currentClubId, careerSeed } = createTransferFixture()
    player.attributes = { attack: 62, defense: 62, physical: 62, mental: 62 }
    player.overseasIntent = 'STRONG'
    player.preferredLeagues = ['英格兰', '德国']
    const offers = generateTransferOffers({
      player,
      currentClubId,
      currentTeamLevel: 'FIRST_TEAM',
      latestReport: null,
      careerSeed,
      windowIndex: 10,
    })
    const overseasClubs = offers
      .map((offer) => CLUBS.find((club) => club.id === offer.clubId))
      .filter((club) => club && isOverseasClub(club))

    expect(offers).toHaveLength(3)
    expect(overseasClubs).toHaveLength(2)
    expect(
      overseasClubs.every((club) =>
        player.preferredLeagues.includes(club!.leagueKey),
      ),
    ).toBe(true)
    expect(
      offers.filter((offer) => offer.type === 'PERMANENT_TRANSFER'),
    ).toHaveLength(2)
  })

  it('reviews the market every two or three professional windows and requires good form', () => {
    const { player } = createTransferFixture()
    const goodReport = {
      stats: {
        appearances: 14,
        starts: 12,
        minutes: 1050,
        goals: 3,
        assists: 2,
        yellowCards: 1,
        redCards: 0,
        averageRating: 7.1,
      },
    }
    const poorReport = {
      stats: {
        ...goodReport.stats,
        appearances: 6,
        averageRating: 6.4,
      },
    }

    expect(
      assessDomesticTransferOpportunity({
        player,
        latestReport: goodReport,
        windowIndex: 4,
      }).available,
    ).toBe(false)
    expect(
      assessDomesticTransferOpportunity({
        player,
        latestReport: goodReport,
        windowIndex: 5,
      }).available,
    ).toBe(true)
    expect(
      assessDomesticTransferOpportunity({
        player,
        latestReport: goodReport,
        windowIndex: 6,
      }).available,
    ).toBe(false)
    expect(
      assessDomesticTransferOpportunity({
        player,
        latestReport: goodReport,
        windowIndex: 8,
      }).available,
    ).toBe(true)
    expect(
      assessDomesticTransferOpportunity({
        player,
        latestReport: goodReport,
        windowIndex: 10,
      }).available,
    ).toBe(true)
    expect(
      assessDomesticTransferOpportunity({
        player,
        latestReport: poorReport,
        windowIndex: 5,
      }).available,
    ).toBe(false)
  })

  it('creates exactly three deterministic offers excluding the current club', () => {
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
      new Set(fixture.offers.map((offer) => offer.clubId)).size,
    ).toBe(3)
    expect(
      fixture.offers.every(
        (offer) =>
          offer.interestScore >= 50 &&
          offer.transferFeeEuro > 0 &&
          offer.annualSalaryEuro > 0,
      ),
    ).toBe(true)
  })

  it('can place a strong academy youth offer beside a lower-league first-team offer', () => {
    const { player, currentClubId } = createTransferFixture()
    player.attributes = {
      attack: 57,
      defense: 57,
      physical: 57,
      mental: 57,
    }

    const windows = Array.from({ length: 20 }, (_, index) => index + 5)
    const mixedWindow = windows
      .map((windowIndex) =>
        generateDomesticTransferOffers({
          player,
          currentClubId,
          currentTeamLevel: 'YOUTH',
          latestReport: null,
          careerSeed: `role-choice-${windowIndex}`,
          windowIndex,
        }),
      )
      .find((offers) => {
        const includesStrongAcademyYouth = offers.some((offer) => {
          const club = CLUBS.find(
            (candidate) => candidate.id === offer.clubId,
          )
          return (
            club !== undefined &&
            club.academyTier <= 2 &&
            offer.promisedTeamLevel === 'YOUTH'
          )
        })
        const includesLowerLeagueFirstTeam = offers.some((offer) => {
          const club = CLUBS.find(
            (candidate) => candidate.id === offer.clubId,
          )
          return (
            club !== undefined &&
            club.tier >= 5 &&
            offer.promisedTeamLevel === 'FIRST_TEAM'
          )
        })
        return includesStrongAcademyYouth && includesLowerLeagueFirstTeam
      })

    expect(mixedWindow).toBeDefined()
    expect(mixedWindow).toHaveLength(3)
  })

  it('never offers a youth contract from age 22 onward', () => {
    const { player, currentClubId } = createTransferFixture()
    player.attributes = {
      attack: 46,
      defense: 46,
      physical: 46,
      mental: 46,
    }
    const offers = generateDomesticTransferOffers({
      player,
      currentClubId,
      currentTeamLevel: 'YOUTH',
      latestReport: null,
      careerSeed: 'age-22-first-team-only',
      windowIndex: 18,
    })

    expect(offers).toHaveLength(3)
    expect(
      offers.every((offer) => offer.promisedTeamLevel === 'FIRST_TEAM'),
    ).toBe(true)
  })

  it('adds three external free-agent contracts to the renewal option at expiry', () => {
    const { careerSeed, player, currentClubId } = createTransferFixture()
    const currentContract = {
      type: 'FIRST_PRO',
      clubId: currentClubId,
      remainingHalfYears: 0,
      annualSalaryEuro: 36_000,
      promisedTeamLevel: 'YOUTH',
      promisedRole: 'CORE',
      releaseClauseEuro: 500_000,
      clubOptionYears: 0,
      parentClubId: null,
      brokenPromiseWindows: 0,
    } satisfies ContractState
    const offers = generateContractExpiryOffers({
      player,
      currentClubId,
      currentTeamLevel: 'YOUTH',
      currentRole: 'CORE',
      currentContract,
      latestReport: null,
      careerSeed,
      windowIndex: 9,
    })

    expect(offers).toHaveLength(4)
    expect(offers[0]?.type).toBe('RENEWAL')
    expect(
      offers.slice(1).every(
        (offer) =>
          offer.type === 'FREE_TRANSFER' &&
          offer.clubId !== currentClubId &&
          offer.transferFeeEuro === 0,
      ),
    ).toBe(true)
    expect(new Set(offers.slice(1).map((offer) => offer.clubId)).size).toBe(3)
  })

  it('converts every expiry-market contract to first-team status after age 22', () => {
    const { careerSeed, player, currentClubId } = createTransferFixture()
    const currentContract = {
      type: 'FIRST_PRO',
      clubId: currentClubId,
      remainingHalfYears: 0,
      annualSalaryEuro: 36_000,
      promisedTeamLevel: 'YOUTH',
      promisedRole: 'CORE',
      releaseClauseEuro: 500_000,
      clubOptionYears: 0,
      parentClubId: null,
      brokenPromiseWindows: 0,
    } satisfies ContractState
    const offers = generateContractExpiryOffers({
      player,
      currentClubId,
      currentTeamLevel: 'YOUTH',
      currentRole: 'CORE',
      currentContract,
      latestReport: null,
      careerSeed,
      windowIndex: 24,
    })

    expect(
      offers.every((offer) => offer.promisedTeamLevel === 'FIRST_TEAM'),
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
