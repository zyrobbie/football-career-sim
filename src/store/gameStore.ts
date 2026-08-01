import { create } from 'zustand'
import { SECONDARY_POSITIONS } from '../data/balance'
import {
  buildClubSimulationOffer,
  generateAcademyOffers,
} from '../engine/offers'
import {
  contractFromOffer,
  generateFirstProfessionalOffer,
  resolveFirstContractCounter,
} from '../engine/contracts'
import { createFirstTeamProgress } from '../engine/firstTeamPath'
import { generatePlayer } from '../engine/player'
import { createCareerSeed } from '../engine/random'
import {
  attachCareerEventToReport,
  consumeCareerConsequences,
  resolveCareerEventChoice,
  selectCareerEvent,
} from '../engine/careerEvents'
import {
  canAdvanceBeyondWindow,
  DEMO_WINDOW_COUNT,
  retirementAvailabilityAfterWindow,
} from '../engine/careerTime'
import { simulateHalfYear } from '../engine/simulateHalfYear'
import { simulateProfessionalHalfYear } from '../engine/simulateProfessionalHalfYear'
import {
  assessDomesticTransferOpportunity,
  applyTransferArrivalChoice,
  contractFromTransferOffer,
  generateContractExpiryOffers,
  generateDomesticTransferOffers,
  integrationBaseForTransfer,
  resolveTransferCounter,
} from '../engine/transfers'
import type {
  ArrivalChoice,
  CareerEventChoiceId,
  CareerPriority,
  CounterOfferDirection,
  DevelopmentApproach,
  FirstTeamRole,
  GamePhase,
  GameState,
  OverseasIntent,
  Position,
  PreferredFoot,
  TrainingFocus,
  TransferArrivalChoice,
  YouthRole,
} from '../models/game'
import {
  deleteSavedCareer,
  hasSavedCareer,
  loadGame,
  saveGame,
} from '../persistence/save'

interface GameStore {
  game: GameState | null
  hasSave: boolean
  error: string | null
  startNewCareer: () => void
  continueCareer: () => void
  deleteCareer: () => void
  submitIdentity: (input: {
    name: string
    jerseyNumber: number
    preferredFoot: PreferredFoot
  }) => void
  submitPosition: (primary: Position, secondary: Position) => void
  submitPriorities: (priorities: CareerPriority[]) => void
  submitPreferences: (
    intent: OverseasIntent,
    leagues: string[],
  ) => void
  confirmPlayer: () => void
  selectAcademy: (clubId: string) => void
  chooseArrival: (choice: ArrivalChoice) => void
  chooseTraining: (
    focus: TrainingFocus,
    approach?: DevelopmentApproach | null,
  ) => void
  chooseCareerEvent: (choice: CareerEventChoiceId) => void
  advanceAfterReport: () => void
  reviewReport: () => void
  openProfessionalContract: () => void
  counterProfessionalOffer: (direction: CounterOfferDirection) => void
  acceptProfessionalContract: () => void
  startProfessionalCareer: () => void
  openTransferWindow: (forcedByPromiseBreach?: boolean) => void
  continueProfessionalCareer: () => void
  selectTransferChoice: (choiceId: 'STAY' | string) => void
  counterTransferOffer: (direction: CounterOfferDirection) => void
  confirmTransferChoice: () => void
  chooseTransferArrival: (choice: TransferArrivalChoice) => void
  continueAfterTransfer: () => void
  requestRetirement: () => void
  cancelRetirement: () => void
  confirmRetirement: () => void
  goToPhase: (phase: GamePhase) => void
  clearError: () => void
}

function currentYear(): number {
  return new Date().getFullYear()
}

function createInitialGame(): GameState {
  const startYear = currentYear()
  return {
    saveVersion: 8,
    dataVersion: 8,
    phase: 'CREATE_IDENTITY',
    careerSeed: createCareerSeed(),
    startYear,
    windowIndex: 0,
    draft: {
      name: '',
      jerseyNumber: 10,
      preferredFoot: 'RIGHT',
      primaryPosition: 'ST',
      secondaryPosition: 'LW',
      priorities: [
        'PLAYING_TIME',
        'COMPETITIVE_LEVEL',
        'SALARY',
        'STABILITY',
      ],
      overseasIntent: 'CONDITIONAL',
      preferredLeagues: [],
    },
    player: null,
    academyOffers: [],
    selectedClubId: null,
    teamLevel: 'YOUTH',
    youthRole: null,
    firstTeamRole: null,
    contract: null,
    professionalOffer: null,
    transferOffers: [],
    selectedTransferChoiceId: null,
    transferDecision: null,
    arrivalChoice: null,
    transferArrivalChoice: null,
    pendingCareerEventId: null,
    careerEventHistory: [],
    pendingConsequences: [],
    trainingFocus: null,
    developmentApproach: null,
    trainingQualityBonus: 0,
    firstTeamProgress: createFirstTeamProgress(),
    cashEuro: 1000,
    retirementReason: null,
    lastReport: null,
    history: [],
  }
}

export const useGameStore = create<GameStore>((set, get) => {
  const commit = (next: GameState) => {
    saveGame(next)
    set({ game: next, hasSave: true, error: null })
  }

  const runReadySimulation = (state: GameState) => {
    if (
      state.phase !== 'SIMULATION_READY' ||
      !state.player ||
      !state.selectedClubId ||
      !state.trainingFocus
    ) {
      return state
    }
    const offer =
      state.academyOffers.find(
        (candidate) => candidate.club.id === state.selectedClubId,
      ) ??
      buildClubSimulationOffer(
        state.selectedClubId,
        state.youthRole ?? 'ROTATION',
      )
    if (!offer) throw new Error('当前俱乐部资料缺失，无法完成半年结算。')
    const consequences = consumeCareerConsequences(state)
    const simulationState: GameState = {
      ...state,
      player: consequences.player,
      pendingConsequences: consequences.pendingConsequences,
      trainingQualityBonus:
        state.trainingQualityBonus + consequences.trainingBonus,
    }
    const currentEventRecord = [...state.careerEventHistory]
      .reverse()
      .find((entry) => entry.windowIndex === state.windowIndex) ?? null
    if (
      simulationState.contract &&
      simulationState.windowIndex >= DEMO_WINDOW_COUNT
    ) {
      const result = simulateProfessionalHalfYear({
        state: simulationState,
        offer,
      })
      const report = attachCareerEventToReport({
        report: result.report,
        record: currentEventRecord,
        appliedConsequenceDelta: consequences.appliedDelta,
        consequenceSummaries: consequences.summaries,
      })
      return {
        ...simulationState,
        phase: 'HALF_YEAR_REPORT',
        pendingCareerEventId: null,
        trainingQualityBonus: 0,
        player: result.player,
        teamLevel: result.teamLevel,
        youthRole: result.youthRole,
        firstTeamRole: result.firstTeamRole,
        contract: result.contract,
        firstTeamProgress: result.firstTeamProgress,
        cashEuro: result.cashEuro,
        lastReport: report,
        history: [
          ...state.history,
          {
            windowIndex: state.windowIndex,
            clubId: offer.club.id,
            clubName: offer.club.name,
            role: report.contract?.actualRole ?? report.roleBefore,
            stats: report.stats,
            arrivalChoice: null,
            trainingFocus: state.trainingFocus,
            developmentApproach: state.developmentApproach,
            endingAttributes: { ...result.player.attributes },
            firstTeamAttention: result.firstTeamProgress.attention,
            teamLevel:
              report.contract?.actualTeamLevel ?? result.teamLevel,
          },
        ],
      } satisfies GameState
    }
    if (!simulationState.youthRole || !simulationState.arrivalChoice) {
      return state
    }
    const arrivalChoice =
      simulationState.windowIndex === 0
        ? simulationState.arrivalChoice
        : null
    const result = simulateHalfYear({
      player: simulationState.player!,
      offer,
      role: simulationState.youthRole,
      arrivalChoice,
      trainingFocus: simulationState.trainingFocus!,
      careerSeed: simulationState.careerSeed,
      startYear: simulationState.startYear,
      windowIndex: simulationState.windowIndex,
      cashBeforeEuro: simulationState.cashEuro,
      developmentApproach: simulationState.developmentApproach,
      firstTeamProgress: simulationState.firstTeamProgress,
      teamLevel: simulationState.teamLevel,
      eventTrainingBonus: simulationState.trainingQualityBonus,
    })
    const report = attachCareerEventToReport({
      report: result.report,
      record: currentEventRecord,
      appliedConsequenceDelta: consequences.appliedDelta,
      consequenceSummaries: consequences.summaries,
    })
    return {
      ...simulationState,
      phase: 'HALF_YEAR_REPORT',
      pendingCareerEventId: null,
      trainingQualityBonus: 0,
      player: result.player,
      youthRole: result.role,
      teamLevel: result.teamLevel,
      firstTeamProgress: result.firstTeamProgress,
      cashEuro: report.cashAfterEuro,
      lastReport: report,
      history: [
        ...state.history,
        {
          windowIndex: state.windowIndex,
          clubId: offer.club.id,
          clubName: offer.club.name,
          role: result.role,
          stats: report.stats,
          arrivalChoice,
          trainingFocus: state.trainingFocus,
          developmentApproach: state.developmentApproach,
          endingAttributes: { ...result.player.attributes },
          firstTeamAttention: result.firstTeamProgress.attention,
          teamLevel: result.teamLevel,
        },
      ],
    } satisfies GameState
  }

  return {
    game: null,
    hasSave: hasSavedCareer(),
    error: null,

    startNewCareer: () => {
      try {
        commit(createInitialGame())
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '无法新建生涯。' })
      }
    },

    continueCareer: () => {
      try {
        const loaded = loadGame()
        if (!loaded) {
          set({ hasSave: false, error: '没有找到可继续的生涯。' })
          return
        }
        const resumed = runReadySimulation(loaded)
        if (resumed !== loaded) saveGame(resumed)
        set({ game: resumed, hasSave: true, error: null })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '存档读取失败。',
        })
      }
    },

    deleteCareer: () => {
      deleteSavedCareer()
      set({ game: null, hasSave: false, error: null })
    },

    submitIdentity: ({ name, jerseyNumber, preferredFoot }) => {
      const game = get().game
      if (!game) return
      if (name.trim().length < 2 || name.trim().length > 12) {
        set({ error: '姓名需要输入2至12个字符。' })
        return
      }
      if (
        !Number.isInteger(jerseyNumber) ||
        jerseyNumber < 1 ||
        jerseyNumber > 99
      ) {
        set({ error: '偏好球衣号码需要是1至99之间的整数。' })
        return
      }
      commit({
        ...game,
        phase: 'CREATE_POSITION',
        draft: {
          ...game.draft,
          name: name.trim(),
          jerseyNumber,
          preferredFoot,
        },
      })
    },

    submitPosition: (primary, secondary) => {
      const game = get().game
      if (!game) return
      if (!SECONDARY_POSITIONS[primary].includes(secondary)) {
        set({ error: '这个副位置与主位置不兼容。' })
        return
      }
      commit({
        ...game,
        phase: 'CREATE_PRIORITIES',
        draft: {
          ...game.draft,
          primaryPosition: primary,
          secondaryPosition: secondary,
        },
      })
    },

    submitPriorities: (priorities) => {
      const game = get().game
      if (!game) return
      if (priorities.length !== 4 || new Set(priorities).size !== 4) {
        set({ error: '请完整排列四项职业追求。' })
        return
      }
      commit({
        ...game,
        phase: 'CREATE_PREFERENCES',
        draft: { ...game.draft, priorities: [...priorities] },
      })
    },

    submitPreferences: (overseasIntent, preferredLeagues) => {
      const game = get().game
      if (!game) return
      if (preferredLeagues.length > 3) {
        set({ error: '最多选择三个偏好联赛。' })
        return
      }
      const draft = {
        ...game.draft,
        overseasIntent,
        preferredLeagues:
          overseasIntent === 'DOMESTIC' ? [] : [...preferredLeagues],
      }
      const player = generatePlayer(draft, game.careerSeed)
      commit({
        ...game,
        phase: 'PLAYER_REVEAL',
        draft,
        player,
      })
    },

    confirmPlayer: () => {
      const game = get().game
      if (!game?.player) return
      commit({
        ...game,
        phase: 'ACADEMY_OFFERS',
        academyOffers: generateAcademyOffers(game.player, game.careerSeed),
      })
    },

    selectAcademy: (clubId) => {
      const game = get().game
      if (!game) return
      const offer = game.academyOffers.find(
        (candidate) => candidate.club.id === clubId,
      )
      if (!offer) {
        set({ error: '这份青训邀请已经失效。' })
        return
      }
      commit({
        ...game,
        phase: 'ARRIVAL_EVENT',
        selectedClubId: clubId,
        teamLevel: 'YOUTH',
        youthRole: offer.expectedRole,
        firstTeamProgress: createFirstTeamProgress(clubId),
      })
    },

    chooseArrival: (choice) => {
      const game = get().game
      if (!game) return
      commit({
        ...game,
        phase: 'HALF_YEAR_PLAN',
        arrivalChoice: choice,
      })
    },

    chooseTraining: (focus, approach = null) => {
      const game = get().game
      if (!game) return
      try {
        const ready: GameState = {
          ...game,
          phase: 'SIMULATION_READY',
          trainingFocus: focus,
          developmentApproach:
            game.windowIndex >= 2 ? approach ?? 'STEADY' : null,
        }
        const pendingCareerEventId = selectCareerEvent(ready)
        if (pendingCareerEventId) {
          commit({
            ...ready,
            phase: 'SPECIAL_EVENT',
            pendingCareerEventId,
          })
          return
        }
        commit(ready)
        commit(runReadySimulation(ready))
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '半年结算失败。',
        })
      }
    },

    chooseCareerEvent: (choiceId) => {
      const game = get().game
      if (
        !game?.pendingCareerEventId ||
        !game.player ||
        game.phase !== 'SPECIAL_EVENT'
      ) {
        set({ error: '当前没有等待处理的特殊事件。' })
        return
      }
      try {
        const resolved = resolveCareerEventChoice({
          state: game,
          eventId: game.pendingCareerEventId,
          choiceId,
        })
        const ready: GameState = {
          ...game,
          phase: 'SIMULATION_READY',
          player: resolved.player,
          cashEuro: resolved.cashEuro,
          pendingCareerEventId: null,
          careerEventHistory: [
            ...game.careerEventHistory,
            resolved.record,
          ],
          pendingConsequences: resolved.consequence
            ? [...game.pendingConsequences, resolved.consequence]
            : game.pendingConsequences,
          trainingQualityBonus:
            game.trainingQualityBonus + resolved.trainingBonus,
        }
        commit(ready)
        commit(runReadySimulation(ready))
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : '特殊事件结算失败。',
        })
      }
    },

    advanceAfterReport: () => {
      const game = get().game
      if (!game) return
      if (game.contract && game.windowIndex >= DEMO_WINDOW_COUNT) {
        commit({ ...game, phase: 'PRO_STAGE_COMPLETE' })
        return
      }
      if (game.history.length >= DEMO_WINDOW_COUNT) {
        commit({ ...game, phase: 'CAREER_DASHBOARD' })
        return
      }
      commit({
        ...game,
        phase: 'HALF_YEAR_PLAN',
        windowIndex: game.windowIndex + 1,
        pendingCareerEventId: null,
        trainingFocus: null,
        developmentApproach: null,
      })
    },

    reviewReport: () => {
      const game = get().game
      if (!game?.lastReport) return
      commit({ ...game, phase: 'HALF_YEAR_REPORT' })
    },

    openProfessionalContract: () => {
      const game = get().game
      if (
        !game?.player ||
        !game.selectedClubId ||
        !game.youthRole
      ) {
        set({ error: '当前生涯还不具备签署首份职业合同的条件。' })
        return
      }
      const club = game.academyOffers.find(
        (candidate) => candidate.club.id === game.selectedClubId,
      )?.club
      if (!club) {
        set({ error: '当前俱乐部资料缺失，无法生成合同。' })
        return
      }
      const professionalOffer =
        game.professionalOffer ??
        generateFirstProfessionalOffer({
          player: game.player,
          club,
          youthRole: game.youthRole,
          teamLevel: game.teamLevel,
          firstTeamProgress: game.firstTeamProgress,
          careerSeed: game.careerSeed,
        })
      commit({
        ...game,
        phase: 'PRO_CONTRACT_OFFER',
        professionalOffer,
      })
    },

    counterProfessionalOffer: (direction) => {
      const game = get().game
      if (!game?.player || !game.professionalOffer) return
      try {
        const professionalOffer = resolveFirstContractCounter({
          offer: game.professionalOffer,
          direction,
          player: game.player,
          careerSeed: game.careerSeed,
        })
        commit({ ...game, professionalOffer })
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : '反报价没有成功提交。',
        })
      }
    },

    acceptProfessionalContract: () => {
      const game = get().game
      if (!game?.professionalOffer) return
      const contract = contractFromOffer(game.professionalOffer)
      const isFirstTeam = contract.promisedTeamLevel === 'FIRST_TEAM'
      commit({
        ...game,
        phase: 'PRO_CONTRACT_COMPLETE',
        contract,
        teamLevel: contract.promisedTeamLevel,
        youthRole: isFirstTeam
          ? null
          : (contract.promisedRole as YouthRole),
        firstTeamRole: isFirstTeam
          ? (contract.promisedRole as FirstTeamRole)
          : null,
      })
    },

    startProfessionalCareer: () => {
      const game = get().game
      if (
        !game?.contract ||
        game.phase !== 'PRO_CONTRACT_COMPLETE'
      ) {
        set({ error: '需要先完成首份职业合同签约。' })
        return
      }
      commit({
        ...game,
        phase: 'HALF_YEAR_PLAN',
        windowIndex: Math.max(DEMO_WINDOW_COUNT, game.windowIndex + 1),
        trainingFocus: null,
        developmentApproach: null,
      })
    },

    openTransferWindow: (forcedByPromiseBreach = false) => {
      const game = get().game
      if (
        !game?.player ||
        !game.contract ||
        !game.selectedClubId ||
        game.phase !== 'PRO_STAGE_COMPLETE'
      ) {
        set({ error: '当前生涯还不能进入转会窗口。' })
        return
      }
      if (!canAdvanceBeyondWindow(game.windowIndex)) {
        set({ error: '40岁赛季已经结束，职业日历不能再进入新的转会窗口。' })
        return
      }
      const contractExpired = game.contract.remainingHalfYears === 0
      const opportunity = assessDomesticTransferOpportunity({
        player: game.player,
        latestReport: game.lastReport,
        windowIndex: game.windowIndex,
      })
      const canRequestTransfer =
        !contractExpired &&
        forcedByPromiseBreach &&
        game.contract.brokenPromiseWindows >= 2
      if (forcedByPromiseBreach && !canRequestTransfer) {
        set({ error: '只有连续两个窗口未兑现角色承诺时，才能主动提出转会申请。' })
        return
      }
      if (
        !contractExpired &&
        !opportunity.available &&
        !canRequestTransfer
      ) {
        set({ error: opportunity.summary })
        return
      }
      const currentRole =
        game.teamLevel === 'FIRST_TEAM'
          ? game.firstTeamRole
          : game.youthRole
      if (!currentRole) {
        set({ error: '当前球队角色缺失，无法生成合同报价。' })
        return
      }
      const windowIndex =
        !contractExpired && game.transferOffers.length > 0
          ? game.windowIndex
          : game.windowIndex + 1
      const transferOffers =
        contractExpired
          ? generateContractExpiryOffers({
              player: game.player,
              currentClubId: game.selectedClubId,
              currentTeamLevel: game.teamLevel,
              currentRole,
              currentContract: game.contract,
              latestReport: game.lastReport,
              careerSeed: game.careerSeed,
              windowIndex,
            })
          : game.transferOffers.length > 0
          ? game.transferOffers
          : generateDomesticTransferOffers({
              player: game.player,
              currentClubId: game.selectedClubId,
              currentTeamLevel: game.teamLevel,
              latestReport: game.lastReport,
              careerSeed: game.careerSeed,
              windowIndex,
            })
      commit({
        ...game,
        phase: 'TRANSFER_WINDOW',
        windowIndex,
        transferOffers,
        selectedTransferChoiceId:
          contractExpired
            ? transferOffers[0]?.id ?? null
            : game.selectedTransferChoiceId ?? 'STAY',
        transferDecision: null,
        transferArrivalChoice: null,
      })
    },

    continueProfessionalCareer: () => {
      const game = get().game
      if (
        !game?.player ||
        !game.contract ||
        !game.selectedClubId ||
        game.phase !== 'PRO_STAGE_COMPLETE'
      ) {
        set({ error: '需要先完成本次职业半年。' })
        return
      }
      if (!canAdvanceBeyondWindow(game.windowIndex)) {
        set({ error: '40岁赛季已经结束，必须先完成退役。' })
        return
      }
      const opportunity = assessDomesticTransferOpportunity({
        player: game.player,
        latestReport: game.lastReport,
        windowIndex: game.windowIndex,
      })
      if (game.contract.remainingHalfYears === 0) {
        set({
          error: '合同已经到期，必须先完成续约或自由转会，不能无合同进入下一职业半年。',
        })
        return
      }
      if (opportunity.available) {
        set({ error: '本窗口已有正式转会机会，请先完成去留决定。' })
        return
      }
      commit({
        ...game,
        phase: 'HALF_YEAR_PLAN',
        windowIndex: game.windowIndex + 1,
        transferOffers: [],
        selectedTransferChoiceId: null,
        transferDecision: null,
        transferArrivalChoice: null,
        pendingCareerEventId: null,
        trainingFocus: null,
        developmentApproach: null,
        trainingQualityBonus: 0,
      })
    },

    selectTransferChoice: (choiceId) => {
      const game = get().game
      if (!game || game.phase !== 'TRANSFER_WINDOW') return
      if (
        choiceId === 'STAY' &&
        game.contract?.remainingHalfYears === 0
      ) {
        set({ error: '合同已经到期，不能按原合同直接留队。' })
        return
      }
      if (
        choiceId !== 'STAY' &&
        !game.transferOffers.some(
          (offer) => offer.id === choiceId && !offer.withdrawn,
        )
      ) {
        set({ error: '这份转会报价已经失效。' })
        return
      }
      commit({ ...game, selectedTransferChoiceId: choiceId })
    },

    counterTransferOffer: (direction) => {
      const game = get().game
      if (
        !game?.player ||
        !game.selectedTransferChoiceId ||
        game.selectedTransferChoiceId === 'STAY'
      ) {
        set({ error: '请先选择一份可谈判的转会报价。' })
        return
      }
      const selected = game.transferOffers.find(
        (offer) => offer.id === game.selectedTransferChoiceId,
      )
      if (!selected) {
        set({ error: '这份转会报价已经失效。' })
        return
      }
      try {
        const updated = resolveTransferCounter({
          offer: selected,
          direction,
          player: game.player,
          careerSeed: game.careerSeed,
          windowIndex: game.windowIndex,
        })
        commit({
          ...game,
          transferOffers: game.transferOffers.map((offer) =>
            offer.id === updated.id ? updated : offer,
          ),
          selectedTransferChoiceId: updated.withdrawn
            ? game.contract?.remainingHalfYears === 0
              ? game.transferOffers.find(
                  (offer) =>
                    offer.type === 'RENEWAL' && !offer.withdrawn,
                )?.id ?? null
              : 'STAY'
            : updated.id,
        })
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : '反报价没有成功提交。',
        })
      }
    },

    confirmTransferChoice: () => {
      const game = get().game
      if (
        !game?.player ||
        !game.contract ||
        !game.selectedClubId ||
        !game.selectedTransferChoiceId
      ) {
        set({ error: '请先确定本窗口的去向。' })
        return
      }
      const fromClubId = game.selectedClubId
      if (game.selectedTransferChoiceId === 'STAY') {
        if (game.contract.remainingHalfYears === 0) {
          set({ error: '合同已经到期，不能按原合同直接留队。' })
          return
        }
        commit({
          ...game,
          phase: 'TRANSFER_STAGE_COMPLETE',
          transferDecision: {
            kind: 'STAY',
            fromClubId,
            toClubId: fromClubId,
            arrivalChoice: null,
            cashSpentEuro: 0,
          },
        })
        return
      }

      const offer = game.transferOffers.find(
        (candidate) =>
          candidate.id === game.selectedTransferChoiceId &&
          !candidate.withdrawn,
      )
      if (!offer) {
        set({ error: '这份转会报价已经失效。' })
        return
      }
      const contract = contractFromTransferOffer(offer)
      const isFirstTeam =
        contract.promisedTeamLevel === 'FIRST_TEAM'
      if (offer.type === 'RENEWAL' && offer.clubId === fromClubId) {
        if (game.contract.remainingHalfYears > 0) {
          set({ error: '原合同尚未到期，当前不能签署续约合同。' })
          return
        }
        commit({
          ...game,
          phase: 'TRANSFER_STAGE_COMPLETE',
          contract,
          teamLevel: contract.promisedTeamLevel,
          youthRole: isFirstTeam
            ? null
            : (contract.promisedRole as YouthRole),
          firstTeamRole: isFirstTeam
            ? (contract.promisedRole as FirstTeamRole)
            : null,
          transferDecision: {
            kind: 'STAY',
            fromClubId,
            toClubId: fromClubId,
            arrivalChoice: null,
            cashSpentEuro: 0,
          },
        })
        return
      }
      const integration = integrationBaseForTransfer(game.player)
      commit({
        ...game,
        phase: 'TRANSFER_ARRIVAL',
        player: { ...game.player, ...integration },
        selectedClubId: offer.clubId,
        contract,
        teamLevel: contract.promisedTeamLevel,
        youthRole: isFirstTeam
          ? null
          : (contract.promisedRole as YouthRole),
        firstTeamRole: isFirstTeam
          ? (contract.promisedRole as FirstTeamRole)
          : null,
        firstTeamProgress: createFirstTeamProgress(offer.clubId),
        transferDecision: {
          kind: 'TRANSFER',
          fromClubId,
          toClubId: offer.clubId,
          arrivalChoice: null,
          cashSpentEuro: 0,
        },
      })
    },

    chooseTransferArrival: (choice) => {
      const game = get().game
      if (
        !game?.player ||
        game.phase !== 'TRANSFER_ARRIVAL' ||
        game.transferDecision?.kind !== 'TRANSFER'
      ) {
        set({ error: '当前没有需要处理的转会融入事件。' })
        return
      }
      const result = applyTransferArrivalChoice({
        player: game.player,
        choice,
        cashEuro: game.cashEuro,
      })
      commit({
        ...game,
        phase: 'TRANSFER_STAGE_COMPLETE',
        player: result.player,
        cashEuro: result.cashEuro,
        transferArrivalChoice: choice,
        transferDecision: {
          ...game.transferDecision,
          arrivalChoice: choice,
          cashSpentEuro: result.cashSpentEuro,
        },
      })
    },

    continueAfterTransfer: () => {
      const game = get().game
      if (
        !game?.player ||
        !game.contract ||
        !game.selectedClubId ||
        game.phase !== 'TRANSFER_STAGE_COMPLETE'
      ) {
        set({ error: '需要先完成本次转会窗口。' })
        return
      }
      if (!canAdvanceBeyondWindow(game.windowIndex - 1)) {
        set({ error: '40岁赛季已经结束，不能再进入新的职业半年。' })
        return
      }
      commit({
        ...game,
        phase: 'HALF_YEAR_PLAN',
        transferOffers: [],
        selectedTransferChoiceId: null,
        pendingCareerEventId: null,
        trainingFocus: null,
        developmentApproach: null,
        trainingQualityBonus: 0,
      })
    },

    requestRetirement: () => {
      const game = get().game
      if (!game?.player || game.phase !== 'PRO_STAGE_COMPLETE') {
        set({ error: '只能在完成一个职业窗口后决定是否退役。' })
        return
      }
      const availability = retirementAvailabilityAfterWindow(
        game.windowIndex,
      )
      if (availability === 'UNAVAILABLE') {
        set({ error: '当前年龄和职业状态还不具备主动退役条件。' })
        return
      }
      commit({
        ...game,
        phase: 'RETIREMENT_DECISION',
        retirementReason:
          availability === 'MANDATORY' ? 'AGE_LIMIT' : 'VOLUNTARY',
      })
    },

    cancelRetirement: () => {
      const game = get().game
      if (
        !game ||
        game.phase !== 'RETIREMENT_DECISION' ||
        game.retirementReason !== 'VOLUNTARY'
      ) {
        set({ error: '这次退役决定已经不能撤回。' })
        return
      }
      commit({
        ...game,
        phase: 'PRO_STAGE_COMPLETE',
        retirementReason: null,
      })
    },

    confirmRetirement: () => {
      const game = get().game
      if (
        !game?.player ||
        game.phase !== 'RETIREMENT_DECISION' ||
        !game.retirementReason
      ) {
        set({ error: '当前没有待确认的退役决定。' })
        return
      }
      commit({ ...game, phase: 'CAREER_RETIRED' })
    },

    goToPhase: (phase) => {
      const game = get().game
      if (!game) return
      commit({ ...game, phase })
    },

    clearError: () => set({ error: null }),
  }
})
