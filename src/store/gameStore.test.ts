import { beforeEach, describe, expect, it } from 'vitest'
import { generateAcademyOffers } from '../engine/offers'
import { generatePlayer } from '../engine/player'
import { createFirstTeamProgress } from '../engine/firstTeamPath'
import { createDraft } from '../engine/__tests__/testFixtures'
import type { GameState } from '../models/game'
import { validateGameState } from '../persistence/save'
import { useGameStore } from './gameStore'

function resolveSpecialEventIfPresent() {
  const store = useGameStore.getState()
  if (store.game?.phase === 'SPECIAL_EVENT') {
    store.chooseCareerEvent('A')
  }
}

describe('academy two-year progression', () => {
  beforeEach(() => {
    useGameStore.setState({
      game: null,
      hasSave: false,
      error: null,
    })
  })

  it('retires directly when an expired contract would require a new age-40 deal', () => {
    const careerSeed = 'expiry-before-age-limit'
    const draft = createDraft('CM')
    const player = generatePlayer(draft, careerSeed)
    const academyOffers = generateAcademyOffers(player, careerSeed)
    const selected = academyOffers[0]!
    const base: GameState = {
      saveVersion: 10,
      dataVersion: 10,
      phase: 'HALF_YEAR_REPORT',
      careerSeed,
      startYear: 2026,
      windowIndex: 54,
      draft,
      player,
      academyOffers,
      selectedClubId: selected.club.id,
      teamLevel: 'FIRST_TEAM',
      youthRole: null,
      firstTeamRole: 'ROTATION',
      contract: {
        type: 'RENEWAL',
        clubId: selected.club.id,
        remainingHalfYears: 0,
        annualSalaryEuro: 200_000,
        promisedTeamLevel: 'FIRST_TEAM',
        promisedRole: 'ROTATION',
        releaseClauseEuro: null,
        clubOptionYears: 0,
        parentClubId: null,
        brokenPromiseWindows: 0,
      },
      professionalOffer: null,
      transferOffers: [],
      selectedTransferChoiceId: null,
      transferDecision: null,
      arrivalChoice: 'COACH',
      transferArrivalChoice: null,
      pendingCareerEventId: null,
      careerEventHistory: [],
      pendingConsequences: [],
      trainingFocus: null,
      developmentApproach: null,
      trainingQualityBonus: 0,
      firstTeamProgress: createFirstTeamProgress(selected.club.id),
      cashEuro: 50_000,
      nationalTeam: {
        retired: false,
        currentRole: null,
        caps: 0,
        goals: 0,
        assists: 0,
        debutWindowIndex: null,
        history: [],
      },
      retirementReason: null,
      lastReport: null,
      history: [],
    }

    useGameStore.setState({ game: base, error: null })
    useGameStore.getState().advanceAfterReport()
    expect(useGameStore.getState().game?.phase).toBe('RETIREMENT_DECISION')
    expect(useGameStore.getState().game?.retirementReason).toBe('AGE_LIMIT')

    useGameStore.setState({ game: { ...base, windowIndex: 53 }, error: null })
    useGameStore.getState().advanceAfterReport()
    expect(useGameStore.getState().game?.phase).toBe('RETIREMENT_DECISION')
    expect(useGameStore.getState().game?.retirementReason).toBe('AGE_LIMIT')
  })

  it('advances through four windows and evaluates the first-team path', () => {
    const store = useGameStore.getState()
    store.startNewCareer()
    store.submitIdentity({
      name: '林致远',
      jerseyNumber: 7,
      preferredFoot: 'RIGHT',
    })
    store.submitPosition('ST', 'LW')
    store.submitPriorities([
      'PLAYING_TIME',
      'COMPETITIVE_LEVEL',
      'SALARY',
      'STABILITY',
    ])
    store.submitPreferences('CONDITIONAL', ['英格兰'])
    store.confirmPlayer()

    const offer = useGameStore.getState().game?.academyOffers[1]
    expect(offer).toBeDefined()
    store.selectAcademy(offer!.club.id)
    store.chooseArrival('COACH')
    store.chooseTraining('physical')
    resolveSpecialEventIfPresent()

    let game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_REPORT')
    expect(game?.history).toHaveLength(1)
    expect(game?.windowIndex).toBe(0)
    expect(game?.history[0]?.clubName).toBe(offer!.club.name)

    store.advanceAfterReport()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_PLAN')
    expect(game?.windowIndex).toBe(1)

    store.chooseTraining('mental')
    resolveSpecialEventIfPresent()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_REPORT')
    expect(game?.history).toHaveLength(2)
    expect(game?.history[1]?.arrivalChoice).toBeNull()
    expect(game?.history[1]?.clubName).toBe(offer!.club.name)
    expect(game?.careerEventHistory).toHaveLength(1)

    store.advanceAfterReport()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_PLAN')
    expect(game?.windowIndex).toBe(2)

    store.chooseTraining('BALANCED', 'PUSH')
    resolveSpecialEventIfPresent()
    game = useGameStore.getState().game
    expect(game?.history).toHaveLength(3)
    expect(game?.history[2]?.developmentApproach).toBe('PUSH')
    expect(game?.firstTeamProgress.attention).toBeGreaterThan(0)

    store.advanceAfterReport()
    expect(useGameStore.getState().game?.windowIndex).toBe(3)
    store.chooseTraining('mental', 'TEAM_FIRST')
    resolveSpecialEventIfPresent()
    game = useGameStore.getState().game
    expect(game?.history).toHaveLength(4)
    expect(game?.history[3]?.firstTeamAttention).toBe(
      game?.firstTeamProgress.attention,
    )

    store.advanceAfterReport()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('CAREER_DASHBOARD')
    expect(game?.windowIndex).toBe(3)

    store.openProfessionalContract()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('PRO_CONTRACT_OFFER')
    expect(game?.professionalOffer?.clubId).toBe(offer!.club.id)
    expect(game?.professionalOffer?.counterUsed).toBe(false)

    store.counterProfessionalOffer('SALARY')
    game = useGameStore.getState().game
    expect(game?.professionalOffer?.counterUsed).toBe(true)
    expect(game?.professionalOffer?.negotiationSucceeded).not.toBeNull()

    store.acceptProfessionalContract()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('PRO_CONTRACT_COMPLETE')
    expect(game?.contract?.type).toBe('FIRST_PRO')
    expect(game?.contract?.clubId).toBe(offer!.club.id)
    expect(game?.contract?.annualSalaryEuro).toBeGreaterThan(0)

    const remainingHalfYears = game!.contract!.remainingHalfYears
    store.startProfessionalCareer()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_PLAN')
    expect(game?.windowIndex).toBe(4)

    store.chooseTraining('BALANCED', 'STEADY')
    resolveSpecialEventIfPresent()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_REPORT')
    expect(game?.history).toHaveLength(5)
    expect(game?.history[4]?.windowIndex).toBe(4)
    expect(game?.lastReport?.contract).toBeDefined()
    expect(game?.lastReport?.nationalTeam).toBeUndefined()
    expect(game?.nationalTeam.history).toEqual([])
    expect(game?.lastReport?.incomeLabel).toBe('工资可支配收入')
    expect(game?.contract?.remainingHalfYears).toBe(
      remainingHalfYears - 1,
    )
    expect(game?.cashEuro).toBeGreaterThan(1000)

    useGameStore.setState({
      game: {
        ...game!,
        contract: {
          ...game!.contract!,
          remainingHalfYears: 0,
        },
      },
    })

    store.advanceAfterReport()
    expect(useGameStore.getState().game?.phase).toBe(
      'PRO_STAGE_COMPLETE',
    )

    store.continueProfessionalCareer()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('PRO_STAGE_COMPLETE')
    expect(useGameStore.getState().error).toContain('合同已经到期')
    store.clearError()

    store.openTransferWindow()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('TRANSFER_WINDOW')
    expect(game?.windowIndex).toBe(5)
    expect(game?.transferOffers).toHaveLength(4)
    expect(game?.transferOffers[0]?.type).toBe('RENEWAL')
    expect(game?.transferOffers.slice(1).every(
      (candidate) =>
        candidate.type === 'FREE_TRANSFER' &&
        candidate.transferFeeEuro === 0,
    )).toBe(true)
    expect(game?.selectedTransferChoiceId).toBe(
      game?.transferOffers[0]?.id,
    )

    const repairedDuplicateMarket = validateGameState({
      ...game!,
      windowIndex: game!.windowIndex + 1,
      transferOffers: [
        game!.transferOffers[0]!,
        game!.transferOffers[1]!,
        game!.transferOffers[1]!,
        game!.transferOffers[2]!,
      ],
    })
    expect(repairedDuplicateMarket.phase).toBe('PRO_STAGE_COMPLETE')
    expect(repairedDuplicateMarket.windowIndex).toBe(
      repairedDuplicateMarket.history.at(-1)?.windowIndex,
    )
    expect(repairedDuplicateMarket.transferOffers).toEqual([])

    store.confirmTransferChoice()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('TRANSFER_STAGE_COMPLETE')
    expect(game?.contract?.type).toBe('RENEWAL')
    expect(game?.contract?.remainingHalfYears).toBeGreaterThan(0)
    expect(game?.transferDecision?.kind).toBe('STAY')

    store.continueAfterTransfer()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_PLAN')
    expect(game?.windowIndex).toBe(5)

    store.chooseTraining('attack', 'PUSH')
    resolveSpecialEventIfPresent()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_REPORT')
    expect(game?.history).toHaveLength(6)

    const strongPerformanceGame = game!
    useGameStore.setState({
      game: {
        ...strongPerformanceGame,
        lastReport: {
          ...strongPerformanceGame.lastReport!,
          stats: {
            ...strongPerformanceGame.lastReport!.stats,
            appearances: 14,
            averageRating: 7.1,
          },
        },
      },
    })

    store.advanceAfterReport()
    store.openTransferWindow()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('TRANSFER_WINDOW')
    expect(game?.windowIndex).toBe(6)
    expect(game?.transferOffers).toHaveLength(3)
    expect(game?.selectedTransferChoiceId).toBe('STAY')

    const normalTransferGame = game!
    const invalidEarlyRenewal = {
      ...normalTransferGame.transferOffers[0]!,
      id: 'invalid-early-renewal',
      type: 'RENEWAL' as const,
      clubId: normalTransferGame.selectedClubId!,
      transferFeeEuro: 0,
    }
    useGameStore.setState({
      game: {
        ...normalTransferGame,
        transferOffers: [
          invalidEarlyRenewal,
          ...normalTransferGame.transferOffers,
        ],
        selectedTransferChoiceId: invalidEarlyRenewal.id,
      },
    })
    store.confirmTransferChoice()
    expect(useGameStore.getState().game?.phase).toBe('TRANSFER_WINDOW')
    expect(useGameStore.getState().error).toContain('原合同尚未到期')
    store.clearError()
    useGameStore.setState({ game: normalTransferGame })
    game = normalTransferGame

    const transferOffer = game!.transferOffers[0]!
    store.selectTransferChoice(transferOffer.id)
    store.counterTransferOffer('SALARY')
    game = useGameStore.getState().game
    const negotiated = game!.transferOffers.find(
      (candidate) => candidate.id === transferOffer.id,
    )!
    expect(negotiated.counterUsed).toBe(true)

    const signable =
      game!.transferOffers.find((candidate) => !candidate.withdrawn) ??
      null
    expect(signable).not.toBeNull()
    store.selectTransferChoice(signable!.id)
    store.confirmTransferChoice()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('TRANSFER_ARRIVAL')
    expect(game?.selectedClubId).toBe(signable!.clubId)
    expect(game?.contract?.clubId).toBe(signable!.clubId)

    const cashBeforeArrival = game!.cashEuro
    store.chooseTransferArrival('LEADERS')
    game = useGameStore.getState().game
    expect(game?.phase).toBe('TRANSFER_STAGE_COMPLETE')
    expect(game?.transferDecision?.kind).toBe('TRANSFER')
    expect(game?.transferDecision?.arrivalChoice).toBe('LEADERS')
    expect(game?.cashEuro).toBe(cashBeforeArrival)

    const transferredClubId = game!.selectedClubId!
    const transferredContractHalfYears = game!.contract!.remainingHalfYears
    store.continueAfterTransfer()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_PLAN')
    expect(game?.windowIndex).toBe(6)
    expect(game?.selectedClubId).toBe(transferredClubId)
    expect(game?.transferOffers).toEqual([])
    expect(game?.selectedTransferChoiceId).toBeNull()

    store.chooseTraining('BALANCED', 'STEADY')
    resolveSpecialEventIfPresent()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_REPORT')
    expect(game?.history).toHaveLength(7)
    expect(game?.history[6]?.windowIndex).toBe(6)
    expect(game?.history[6]?.clubId).toBe(transferredClubId)
    expect(game?.lastReport?.clubId).toBe(transferredClubId)
    expect(game?.contract?.remainingHalfYears).toBe(
      transferredContractHalfYears - 1,
    )

    store.advanceAfterReport()
    expect(useGameStore.getState().game?.phase).toBe(
      'PRO_STAGE_COMPLETE',
    )
    store.openTransferWindow()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('PRO_STAGE_COMPLETE')
    expect(game?.transferOffers).toEqual([])
    expect(useGameStore.getState().error).toContain('集中评估')
    store.clearError()

    useGameStore.setState({
      game: {
        ...game!,
        contract: {
          ...game!.contract!,
          brokenPromiseWindows: 1,
        },
      },
    })
    store.openTransferWindow(true)
    expect(useGameStore.getState().game?.phase).toBe('PRO_STAGE_COMPLETE')
    expect(useGameStore.getState().error).toContain('连续两个窗口')
    store.clearError()

    useGameStore.setState({
      game: {
        ...game!,
        contract: {
          ...game!.contract!,
          brokenPromiseWindows: 2,
        },
      },
    })
    store.openTransferWindow(true)
    game = useGameStore.getState().game
    expect(game?.phase).toBe('TRANSFER_WINDOW')
    expect(game?.transferOffers).toHaveLength(3)
    expect(game?.selectedTransferChoiceId).toBe('STAY')
    store.confirmTransferChoice()
    expect(useGameStore.getState().game?.phase).toBe(
      'TRANSFER_STAGE_COMPLETE',
    )
    store.continueAfterTransfer()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_PLAN')
    expect(game?.windowIndex).toBe(7)

    useGameStore.setState({
      game: {
        ...game!,
        phase: 'PRO_STAGE_COMPLETE',
        windowIndex: 34,
        retirementReason: null,
      },
    })
    store.requestRetirement()
    expect(useGameStore.getState().game?.phase).toBe('RETIREMENT_DECISION')
    expect(useGameStore.getState().game?.retirementReason).toBe('VOLUNTARY')
    store.cancelRetirement()
    expect(useGameStore.getState().game?.phase).toBe('PRO_STAGE_COMPLETE')

    useGameStore.setState({
      game: {
        ...useGameStore.getState().game!,
        windowIndex: 55,
        retirementReason: null,
      },
    })
    store.requestRetirement()
    expect(useGameStore.getState().game?.retirementReason).toBe('AGE_LIMIT')
    store.cancelRetirement()
    expect(useGameStore.getState().game?.phase).toBe('RETIREMENT_DECISION')
    expect(useGameStore.getState().error).toContain('不能撤回')
    store.clearError()
    store.confirmRetirement()
    expect(useGameStore.getState().game?.phase).toBe('CAREER_RETIRED')
  })

  it('writes a senior China call-up into the professional report and save state', () => {
    const careerSeed = 'store-national-team-integration'
    const draft = createDraft('ST')
    const generated = generatePlayer(draft, careerSeed)
    const player = {
      ...generated,
      attributes: { attack: 82, defense: 40, physical: 80, mental: 78 },
      potentials: { attack: 90, defense: 65, physical: 88, mental: 87 },
      form: 78,
      fitness: 82,
      reputation: 72,
    }
    const academyOffers = generateAcademyOffers(player, careerSeed)
    const selected = academyOffers[0]!
    const game: GameState = {
      saveVersion: 10,
      dataVersion: 10,
      phase: 'HALF_YEAR_PLAN',
      careerSeed,
      startYear: 2026,
      windowIndex: 6,
      draft,
      player,
      academyOffers,
      selectedClubId: selected.club.id,
      teamLevel: 'FIRST_TEAM',
      youthRole: null,
      firstTeamRole: 'CORE',
      contract: {
        type: 'FIRST_PRO',
        clubId: selected.club.id,
        remainingHalfYears: 6,
        annualSalaryEuro: 180_000,
        promisedTeamLevel: 'FIRST_TEAM',
        promisedRole: 'CORE',
        releaseClauseEuro: 3_000_000,
        clubOptionYears: 0,
        parentClubId: null,
        brokenPromiseWindows: 0,
      },
      professionalOffer: null,
      transferOffers: [],
      selectedTransferChoiceId: null,
      transferDecision: null,
      arrivalChoice: 'COACH',
      transferArrivalChoice: null,
      pendingCareerEventId: null,
      careerEventHistory: [],
      pendingConsequences: [],
      trainingFocus: null,
      developmentApproach: null,
      trainingQualityBonus: 0,
      firstTeamProgress: {
        ...createFirstTeamProgress(selected.club.id),
        status: 'PROMOTED',
      },
      cashEuro: 20_000,
      nationalTeam: {
        retired: false,
        currentRole: null,
        caps: 0,
        goals: 0,
        assists: 0,
        debutWindowIndex: null,
        history: [],
      },
      retirementReason: null,
      lastReport: null,
      history: [],
    }
    useGameStore.setState({ game, error: null })

    useGameStore.getState().chooseTraining('BALANCED', 'STEADY')
    resolveSpecialEventIfPresent()
    const completed = useGameStore.getState().game!

    expect(completed.phase).toBe('HALF_YEAR_REPORT')
    expect(completed.lastReport?.nationalTeam?.calledUp).toBe(true)
    expect(completed.nationalTeam.history).toHaveLength(1)
    expect(completed.nationalTeam.caps).toBe(
      completed.lastReport?.nationalTeam?.appearances,
    )

    useGameStore.setState({
      game: { ...completed, phase: 'PRO_STAGE_COMPLETE', windowIndex: 34 },
    })
    useGameStore.getState().retireFromNationalTeam()
    expect(useGameStore.getState().game?.nationalTeam.retired).toBe(true)
    expect(useGameStore.getState().game?.nationalTeam.currentRole).toBeNull()
  })
})
