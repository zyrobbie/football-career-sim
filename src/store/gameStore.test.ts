import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'

describe('academy two-year progression', () => {
  beforeEach(() => {
    useGameStore.setState({
      game: null,
      hasSave: false,
      error: null,
    })
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
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_REPORT')
    expect(game?.history).toHaveLength(2)
    expect(game?.history[1]?.arrivalChoice).toBeNull()
    expect(game?.history[1]?.clubName).toBe(offer!.club.name)

    store.advanceAfterReport()
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_PLAN')
    expect(game?.windowIndex).toBe(2)

    store.chooseTraining('BALANCED', 'PUSH')
    game = useGameStore.getState().game
    expect(game?.history).toHaveLength(3)
    expect(game?.history[2]?.developmentApproach).toBe('PUSH')
    expect(game?.firstTeamProgress.attention).toBeGreaterThan(0)

    store.advanceAfterReport()
    expect(useGameStore.getState().game?.windowIndex).toBe(3)
    store.chooseTraining('mental', 'TEAM_FIRST')
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
    game = useGameStore.getState().game
    expect(game?.phase).toBe('HALF_YEAR_REPORT')
    expect(game?.history).toHaveLength(5)
    expect(game?.history[4]?.windowIndex).toBe(4)
    expect(game?.lastReport?.contract).toBeDefined()
    expect(game?.lastReport?.incomeLabel).toBe('工资可支配收入')
    expect(game?.contract?.remainingHalfYears).toBe(
      remainingHalfYears - 1,
    )
    expect(game?.cashEuro).toBeGreaterThan(1000)

    store.advanceAfterReport()
    expect(useGameStore.getState().game?.phase).toBe(
      'PRO_STAGE_COMPLETE',
    )
  })
})
