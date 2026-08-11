import { describe, expect, it } from 'vitest'
import {
  ACADEMY_SCORES,
  CLUBS,
  COACH_BASE_SCORES,
  FACILITY_SCORES,
  isOverseasClub,
} from '../../data/balance'
import type {
  ContractState,
  FirstTeamRole,
  HalfYearReport,
} from '../../models/game'
import { generatePlayer } from '../player'
import {
  assessDomesticTransferOpportunity,
  assessOverseasInterest,
  applyTransferArrivalChoice,
  careerPreferenceFit,
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
  it('uses career priorities when the agent filters sporting platforms and roles', () => {
    const { player } = createTransferFixture()
    const eliteClub = CLUBS.find((club) => club.id === 'ita_inter')!
    const smallerClub = CLUBS.find((club) => club.tier >= 5)!

    player.priorities = ['COMPETITIVE_LEVEL', 'PLAYING_TIME', 'STABILITY', 'SALARY']
    player.priorityValues = {
      COMPETITIVE_LEVEL: 85,
      PLAYING_TIME: 70,
      STABILITY: 55,
      SALARY: 40,
    }
    const platformElite = careerPreferenceFit({
      player,
      club: eliteClub,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'FRINGE',
    })
    const platformStarter = careerPreferenceFit({
      player,
      club: smallerClub,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'STARTER',
    })

    player.priorities = ['PLAYING_TIME', 'STABILITY', 'SALARY', 'COMPETITIVE_LEVEL']
    player.priorityValues = {
      PLAYING_TIME: 85,
      STABILITY: 70,
      SALARY: 55,
      COMPETITIVE_LEVEL: 40,
    }
    const playingElite = careerPreferenceFit({
      player,
      club: eliteClub,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'FRINGE',
    })
    const playingStarter = careerPreferenceFit({
      player,
      club: smallerClub,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'STARTER',
    })

    expect(platformElite).toBeGreaterThan(platformStarter)
    expect(playingStarter).toBeGreaterThan(playingElite)
  })

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

  it('offers a descending platform ladder with better roles after a player stalls at an overseas giant', () => {
    const { player, careerSeed } = createTransferFixture()
    player.attributes = {
      attack: 68,
      defense: 68,
      physical: 68,
      mental: 68,
    }
    player.form = 58
    player.reputation = 62
    player.overseasIntent = 'STRONG'
    player.preferredLeagues = ['意大利', '英格兰']
    const latestReport = {
      roleAfter: 'FRINGE',
      stats: {
        appearances: 3,
        starts: 1,
        minutes: 118,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        averageRating: 6.3,
      },
      contract: {
        annualSalaryEuro: 135_000,
        remainingHalfYears: 0,
        promisedTeamLevel: 'FIRST_TEAM',
        promisedRole: 'CORE',
        actualTeamLevel: 'FIRST_TEAM',
        actualRole: 'FRINGE',
        promiseFulfilled: false,
        brokenPromiseWindows: 2,
      },
    } as HalfYearReport
    const offers = generateTransferOffers({
      player,
      currentClubId: 'ita_inter',
      currentTeamLevel: 'FIRST_TEAM',
      latestReport,
      careerSeed,
      windowIndex: 20,
    })
    const clubs = offers.map(
      (offer) => CLUBS.find((club) => club.id === offer.clubId)!,
    )
    const roleOrder: FirstTeamRole[] = [
      'FRINGE',
      'SUBSTITUTE',
      'ROTATION',
      'STARTER',
      'CORE',
    ]

    expect(offers).toHaveLength(3)
    expect(['英格兰', '西班牙', '意大利', '德国', '法国']).toContain(
      clubs[0]!.country,
    )
    expect(clubs[0]!.tier).toBeGreaterThanOrEqual(3)
    expect(['荷兰', '葡萄牙', '比利时', '巴西', '阿根廷', '日本', '韩国']).toContain(
      clubs[1]!.country,
    )
    expect(clubs[2]!.country).toBe('中国')
    expect(clubs[2]!.profile).toBe('ELITE')
    expect(
      offers.every(
        (offer) =>
          offer.promisedTeamLevel === 'FIRST_TEAM' &&
          roleOrder.indexOf(offer.promisedRole as FirstTeamRole) > 0,
      ),
    ).toBe(true)
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
            club.academyTier <= 3 &&
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

  it('never creates a new transfer or renewal contract for the age-40 season', () => {
    const { careerSeed, player, currentClubId } = createTransferFixture()
    const currentContract = {
      type: 'RENEWAL',
      clubId: currentClubId,
      remainingHalfYears: 0,
      annualSalaryEuro: 180_000,
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'ROTATION',
      releaseClauseEuro: null,
      clubOptionYears: 0,
      parentClubId: null,
      brokenPromiseWindows: 0,
    } satisfies ContractState

    expect(
      generateTransferOffers({
        player,
        currentClubId,
        currentTeamLevel: 'FIRST_TEAM',
        latestReport: null,
        careerSeed,
        windowIndex: 54,
      }),
    ).toEqual([])
    expect(
      generateContractExpiryOffers({
        player,
        currentClubId,
        currentTeamLevel: 'FIRST_TEAM',
        currentRole: 'ROTATION',
        currentContract,
        latestReport: null,
        careerSeed,
        windowIndex: 54,
      }),
    ).toEqual([])
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
    const inter = CLUBS.find((club) => club.id === 'ita_inter')!
    const shanghai = CLUBS.find(
      (club) => club.id === 'cn_shanghai_donggang',
    )!
    const yunnan = CLUBS.find(
      (club) => club.id === 'cn_yunnan_shanhe',
    )!
    const base = integrationBaseForTransfer(knownPlayer, inter)
    const domesticBase = integrationBaseForTransfer(
      knownPlayer,
      shanghai,
    )
    const lowerLeagueBase = integrationBaseForTransfer(
      knownPlayer,
      yunnan,
    )
    const integrated = { ...knownPlayer, ...base }
    const cashEuro = 10_000
    const result = applyTransferArrivalChoice({
      player: integrated,
      choice: 'DINNER',
      cashEuro,
    })

    expect(base.squadRelation).toBeLessThan(domesticBase.squadRelation)
    expect(
      domesticBase.squadRelation - base.squadRelation,
    ).toBeGreaterThanOrEqual(
      lowerLeagueBase.squadRelation - domesticBase.squadRelation,
    )
    expect(result.cashSpentEuro).toBe(
      transferDinnerCost(cashEuro),
    )
    expect(result.cashEuro).toBe(cashEuro - result.cashSpentEuro)
    expect(result.player.squadRelation).toBeGreaterThan(
      integrated.squadRelation,
    )
  })

  it('keeps the European-giant training gap at least as large as the domestic divisional gap', () => {
    const inter = CLUBS.find((club) => club.id === 'ita_inter')!
    const shanghai = CLUBS.find(
      (club) => club.id === 'cn_shanghai_donggang',
    )!
    const yunnan = CLUBS.find(
      (club) => club.id === 'cn_yunnan_shanhe',
    )!
    const trainingScore = (club: (typeof CLUBS)[number]) =>
      FACILITY_SCORES[club.facilityTier] * 0.45 +
      ACADEMY_SCORES[club.academyTier] * 0.1 +
      COACH_BASE_SCORES[club.tier] * 0.45

    expect(trainingScore(inter)).toBeGreaterThan(trainingScore(shanghai))
    expect(
      trainingScore(inter) - trainingScore(shanghai),
    ).toBeGreaterThanOrEqual(
      trainingScore(shanghai) - trainingScore(yunnan),
    )
  })
})
