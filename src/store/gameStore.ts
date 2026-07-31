import { create } from 'zustand'
import { SECONDARY_POSITIONS } from '../data/balance'
import { generateAcademyOffers } from '../engine/offers'
import {
  contractFromOffer,
  generateFirstProfessionalOffer,
  resolveFirstContractCounter,
} from '../engine/contracts'
import { createFirstTeamProgress } from '../engine/firstTeamPath'
import { generatePlayer } from '../engine/player'
import { createCareerSeed } from '../engine/random'
import { DEMO_WINDOW_COUNT } from '../engine/careerTime'
import { simulateHalfYear } from '../engine/simulateHalfYear'
import { simulateProfessionalHalfYear } from '../engine/simulateProfessionalHalfYear'
import type {
  ArrivalChoice,
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
  advanceAfterReport: () => void
  reviewReport: () => void
  openProfessionalContract: () => void
  counterProfessionalOffer: (direction: CounterOfferDirection) => void
  acceptProfessionalContract: () => void
  startProfessionalCareer: () => void
  goToPhase: (phase: GamePhase) => void
  clearError: () => void
}

function currentYear(): number {
  return new Date().getFullYear()
}

function createInitialGame(): GameState {
  const startYear = currentYear()
  return {
    saveVersion: 4,
    dataVersion: 4,
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
    arrivalChoice: null,
    trainingFocus: null,
    developmentApproach: null,
    trainingQualityBonus: 0,
    firstTeamProgress: createFirstTeamProgress(),
    cashEuro: 1000,
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
    const offer = state.academyOffers.find(
      (candidate) => candidate.club.id === state.selectedClubId,
    )
    if (!offer) throw new Error('Selected academy offer is missing.')
    if (state.contract && state.windowIndex >= DEMO_WINDOW_COUNT) {
      const result = simulateProfessionalHalfYear({ state, offer })
      return {
        ...state,
        phase: 'HALF_YEAR_REPORT',
        player: result.player,
        teamLevel: result.teamLevel,
        youthRole: result.youthRole,
        firstTeamRole: result.firstTeamRole,
        contract: result.contract,
        firstTeamProgress: result.firstTeamProgress,
        cashEuro: result.cashEuro,
        lastReport: result.report,
        history: [
          ...state.history,
          {
            windowIndex: state.windowIndex,
            clubId: offer.club.id,
            clubName: offer.club.name,
            role: result.report.roleAfter,
            stats: result.report.stats,
            arrivalChoice: null,
            trainingFocus: state.trainingFocus,
            developmentApproach: state.developmentApproach,
            endingAttributes: { ...result.player.attributes },
            firstTeamAttention: result.firstTeamProgress.attention,
            teamLevel: result.teamLevel,
          },
        ],
      } satisfies GameState
    }
    if (!state.youthRole || !state.arrivalChoice) return state
    const arrivalChoice =
      state.windowIndex === 0 ? state.arrivalChoice : null
    const result = simulateHalfYear({
      player: state.player,
      offer,
      role: state.youthRole,
      arrivalChoice,
      trainingFocus: state.trainingFocus,
      careerSeed: state.careerSeed,
      startYear: state.startYear,
      windowIndex: state.windowIndex,
      cashBeforeEuro: state.cashEuro,
      developmentApproach: state.developmentApproach,
      firstTeamProgress: state.firstTeamProgress,
      teamLevel: state.teamLevel,
    })
    return {
      ...state,
      phase: 'HALF_YEAR_REPORT',
      player: result.player,
      youthRole: result.role,
      teamLevel: result.teamLevel,
      firstTeamProgress: result.firstTeamProgress,
      cashEuro: result.report.cashAfterEuro,
      lastReport: result.report,
      history: [
        ...state.history,
        {
          windowIndex: state.windowIndex,
          clubId: offer.club.id,
          clubName: offer.club.name,
          role: result.role,
          stats: result.report.stats,
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
        commit(ready)
        commit(runReadySimulation(ready))
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '半年结算失败。',
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

    goToPhase: (phase) => {
      const game = get().game
      if (!game) return
      commit({ ...game, phase })
    },

    clearError: () => set({ error: null }),
  }
})
