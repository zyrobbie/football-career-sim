import { beforeEach, describe, expect, it } from 'vitest'
import { CLUBS } from '../data/balance'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import { createCareerStoryState } from '../engine/careerStory'
import { getCareerEvent } from '../engine/careerEvents'
import { contractFromOffer, generateFirstProfessionalOffer } from '../engine/contracts'
import { createFirstTeamProgress } from '../engine/firstTeamPath'
import { buildClubSimulationOffer, generateAcademyOffers } from '../engine/offers'
import { generatePlayer } from '../engine/player'
import { createDraft } from '../engine/__tests__/testFixtures'
import type { GameState, TransferOffer } from '../models/game'
import { validateGameState } from '../persistence/save'
import { useGameStore } from './gameStore'

function academyGame(seed: string): GameState {
  const draft = createDraft('CM')
  const player = generatePlayer(draft, seed)
  const offers = generateAcademyOffers(player, seed)
  return {
    saveVersion: 11, dataVersion: 11, phase: 'ACADEMY_OFFERS', careerSeed: seed, startYear: 2026, windowIndex: 0,
    draft, player, academyOffers: offers, selectedClubId: null, teamLevel: 'YOUTH', youthRole: null, firstTeamRole: null,
    contract: null, professionalOffer: null, transferOffers: [], selectedTransferChoiceId: null, transferDecision: null,
    arrivalChoice: null, transferArrivalChoice: null, pendingCareerEvent: null, careerEventHistory: [], pendingConsequences: [],
    careerStory: createCareerStoryState(offers[0]!.club.id), trainingFocus: null, developmentApproach: null, trainingQualityBonus: 0,
    firstTeamProgress: createFirstTeamProgress(offers[0]!.club.id), cashEuro: 1_000,
    nationalTeam: { retired: false, currentRole: null, caps: 0, goals: 0, assists: 0, debutWindowIndex: null, history: [] },
    retirementReason: null, lastReport: null, history: [],
  }
}

function academyGameWithNewClub(seedPrefix: string): { game: GameState; target: string } {
  for (let index = 0; index < 100; index += 1) {
    const game = academyGame(`${seedPrefix}-${index}`)
    const target = game.academyOffers.find((offer) => offer.club.id.startsWith('chn1_'))?.club.id
    if (target) return { game, target }
  }
  throw new Error('Expected deterministic academy seeds to offer a new Chinese V1 club.')
}

function professionalGame(seed: string, clubId: string, phase: GameState['phase'] = 'TRANSFER_WINDOW', expired = false): GameState {
  const draft = createDraft('CM')
  const player = generatePlayer(draft, seed)
  const academy = buildClubSimulationOffer(clubId, 'STARTER')!
  const progress = { ...createFirstTeamProgress(clubId), attention: 100, readiness: 100, matchProof: 100, coachBacking: 100, status: 'PROMOTED' as const }
  const professional = generateFirstProfessionalOffer({ player, club: academy.club, youthRole: 'STARTER', teamLevel: 'FIRST_TEAM', firstTeamProgress: progress, careerSeed: seed })
  return {
    saveVersion: 11, dataVersion: 11, phase, careerSeed: seed, startYear: 2026, windowIndex: 9,
    draft, player, academyOffers: [academy, ...generateAcademyOffers(player, `${seed}-offers`).slice(0, 2)], selectedClubId: clubId, teamLevel: 'FIRST_TEAM', youthRole: null, firstTeamRole: 'ROTATION',
    contract: { ...contractFromOffer(professional), remainingHalfYears: expired ? 0 : 6 }, professionalOffer: professional,
    transferOffers: [], selectedTransferChoiceId: null, transferDecision: null, arrivalChoice: 'COACH', transferArrivalChoice: null,
    pendingCareerEvent: null, careerEventHistory: [], pendingConsequences: [], careerStory: createCareerStoryState(clubId),
    trainingFocus: null, developmentApproach: null, trainingQualityBonus: 0, firstTeamProgress: progress, cashEuro: 7_000,
    nationalTeam: { retired: false, currentRole: null, caps: 0, goals: 0, assists: 0, debutWindowIndex: null, history: [] },
    retirementReason: null, lastReport: null, history: [],
  }
}

function injectedOffer(game: GameState, targetId: string, type: TransferOffer['type'] = 'PERMANENT_TRANSFER'): TransferOffer {
  return { id: `workflow-${targetId}`, type, clubId: targetId, remainingHalfYears: 6, annualSalaryEuro: 150_000, promisedTeamLevel: 'FIRST_TEAM', promisedRole: 'ROTATION', releaseClauseEuro: 3_000_000, clubOptionYears: 0, parentClubId: null, brokenPromiseWindows: 0, transferFeeEuro: type === 'FREE_TRANSFER' ? 0 : 500_000, interestScore: 75, estimatedPotential: 76, counterUsed: false, counterDirection: null, negotiationSucceeded: null, negotiationMessage: null, withdrawn: false }
}

function settlePlan() {
  useGameStore.getState().chooseTraining('BALANCED', 'STEADY')
  while (useGameStore.getState().game?.phase === 'SPECIAL_EVENT') {
    const pending = useGameStore.getState().game!.pendingCareerEvent!
    const event = getCareerEvent(pending.eventId)
    const choice = event.setup && pending.stepIndex === 0
      ? event.setup.options[0]!.id
      : event.choices[0]!.id
    useGameStore.getState().chooseCareerEvent(choice)
  }
  if (useGameStore.getState().game?.phase === 'SPECIAL_EVENT_RESULT') {
    useGameStore.getState().continueAfterCareerEvent()
  }
  const game = useGameStore.getState().game!
  expect(game.phase).toBe('HALF_YEAR_REPORT')
}

function assertClubAlignment(clubId: string) {
  const game = useGameStore.getState().game!
  expect(game.selectedClubId).toBe(clubId)
  expect(game.contract?.clubId).toBe(clubId)
  expect(game.firstTeamProgress.clubId).toBe(clubId)
  expect(game.careerStory.club.clubId).toBe(clubId)
  expect(game.history.at(-1)?.clubId).toBe(clubId)
  expect(game.lastReport?.clubId).toBe(clubId)
  expect(CLUBS.some((club) => club.id === clubId)).toBe(true)
  expect(getClubParametersByCompatibleId(clubId)?.id).toBe(clubId)
}

function acceptInjectedTransfer(targetId: string, seed: string) {
  const game = professionalGame(seed, 'ita_inter')
  useGameStore.setState({ game: { ...game, transferOffers: [injectedOffer(game, targetId)], selectedTransferChoiceId: null }, error: null })
  const store = useGameStore.getState()
  store.selectTransferChoice(`workflow-${targetId}`)
  store.confirmTransferChoice()
  store.chooseTransferArrival('LEADERS')
  store.continueAfterTransfer()
  settlePlan()
}

describe('V1 club public gameStore workflows', () => {
  beforeEach(() => useGameStore.setState({ game: null, hasSave: false, error: null }))

  it('selects a new Chinese academy club through public academy actions', () => {
    const { game, target } = academyGameWithNewClub('v1-academy-china-one')
    useGameStore.setState({ game, error: null }); const store = useGameStore.getState(); store.selectAcademy(target); store.chooseArrival('COACH'); store.chooseTraining('BALANCED')
    const settled = useGameStore.getState().game!; expect(settled.selectedClubId).toBe(target); expect(settled.history.at(-1)?.clubId).toBe(target); expect(settled.lastReport?.clubId).toBe(target); expect(settled.firstTeamProgress.clubId).toBe(target); expect(settled.careerStory.club.clubId).toBe(target)
  })

  it('selects a second new Chinese academy club through public academy actions', () => {
    const { game, target } = academyGameWithNewClub('v1-academy-china-two')
    useGameStore.setState({ game, error: null }); const store = useGameStore.getState(); store.selectAcademy(target); store.chooseArrival('TEAMMATES'); store.chooseTraining('mental')
    const settled = useGameStore.getState().game!; expect(settled.selectedClubId).toBe(target); expect(settled.history.at(-1)?.clubId).toBe(target); expect(settled.lastReport?.clubId).toBe(target); expect(settled.firstTeamProgress.clubId).toBe(target); expect(settled.careerStory.club.clubId).toBe(target)
  })

  it('transfers publicly to a new Chinese club', () => { acceptInjectedTransfer('chn1_shandong_taiyue', 'v1-domestic-transfer'); assertClubAlignment('chn1_shandong_taiyue') })
  it('transfers publicly to a new overseas top-flight club', () => { acceptInjectedTransfer('eng1_chelsea', 'v1-top-flight-transfer'); assertClubAlignment('eng1_chelsea') })
  it('transfers publicly to a new overseas second-tier club', () => { acceptInjectedTransfer('eng2_burnley', 'v1-second-tier-transfer'); assertClubAlignment('eng2_burnley') })

  it('renews through an actually generated expiry market', () => {
    const game = professionalGame('v1-renewal', 'ita_inter', 'PRO_STAGE_COMPLETE', true); useGameStore.setState({ game, error: null }); const store = useGameStore.getState(); store.openTransferWindow(); const market = useGameStore.getState().game!; expect(market.transferOffers[0]?.type).toBe('RENEWAL'); store.selectTransferChoice(market.transferOffers[0]!.id); store.confirmTransferChoice(); store.continueAfterTransfer(); settlePlan(); assertClubAlignment('ita_inter'); expect(useGameStore.getState().game?.transferDecision?.kind).toBe('STAY')
  })

  it('accepts a new-club free transfer from an actually generated expiry market', () => {
    let offer: TransferOffer | undefined
    for (let index = 0; index < 100 && !offer; index += 1) {
      const game = professionalGame(`v1-free-transfer-${index}`, 'ita_inter', 'PRO_STAGE_COMPLETE', true); useGameStore.setState({ game, error: null }); useGameStore.getState().openTransferWindow()
      offer = useGameStore.getState().game!.transferOffers.find((candidate) => candidate.type === 'FREE_TRANSFER' && getClubParametersByCompatibleId(candidate.clubId)?.workbookId === candidate.clubId)
    }
    expect(offer).toBeDefined(); expect(offer!.transferFeeEuro).toBe(0); const store = useGameStore.getState(); store.selectTransferChoice(offer!.id); store.confirmTransferChoice(); store.chooseTransferArrival('LEADERS'); store.continueAfterTransfer(); settlePlan(); assertClubAlignment(offer!.clubId)
  })

  it('accepts an actually generated recovery offer after an overseas giant stall', () => {
    const game = professionalGame('v1-recovery', 'ita_inter', 'PRO_STAGE_COMPLETE'); const stalled = { ...game, player: { ...game.player!, attributes: { attack: 68, defense: 68, physical: 68, mental: 68 }, form: 58, reputation: 62, overseasIntent: 'STRONG' as const, preferredLeagues: ['意大利', '英格兰'] }, lastReport: { ...game.lastReport, roleAfter: 'FRINGE' as const, stats: { appearances: 3, starts: 1, minutes: 100, goals: 0, assists: 0, yellowCards: 0, redCards: 0, averageRating: 6.3 } } as GameState['lastReport'], contract: { ...game.contract!, brokenPromiseWindows: 2 } }; useGameStore.setState({ game: stalled, error: null }); const store = useGameStore.getState(); store.openTransferWindow(true); const market = useGameStore.getState().game!; expect(market.phase).toBe('TRANSFER_WINDOW'); expect(new Set(market.transferOffers.map((offer) => offer.clubId)).size).toBe(3); const offer = market.transferOffers[0]!; store.selectTransferChoice(offer.id); store.confirmTransferChoice(); store.chooseTransferArrival('LEADERS'); store.continueAfterTransfer(); settlePlan(); assertClubAlignment(offer.clubId)
  })

  it('restores a legacy runtime ID save and continues publicly', () => {
    const restored = validateGameState(JSON.parse(JSON.stringify(professionalGame('v1-legacy-restore', 'ita_inter', 'HALF_YEAR_PLAN')))); useGameStore.setState({ game: restored, error: null }); settlePlan(); assertClubAlignment('ita_inter'); expect(useGameStore.getState().game?.selectedClubId).toBe('ita_inter')
  })

  it('settles a new second-tier club season through public gameStore actions', () => {
    const game = professionalGame('v1-second-tier-season', 'eng2_burnley', 'HALF_YEAR_PLAN'); useGameStore.setState({ game, error: null }); settlePlan(); const settled = useGameStore.getState().game!; assertClubAlignment('eng2_burnley'); expect(settled.history.at(-1)?.clubSeason?.continentalLabel).toBeNull(); expect(settled.history.at(-1)?.clubSeason?.summary).not.toMatch(/欧冠未参赛|欧联杯未参赛|亚冠未参赛/)
  })
})
