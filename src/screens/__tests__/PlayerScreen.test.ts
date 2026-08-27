import { describe, expect, it } from 'vitest'
import { useGameStore } from '../../store/gameStore'
import { nextCareerNav } from '../../app/careerNavigation'
import type { HalfYearReport, SquadRole, TeamLevel } from '../../models/game'
import { buildPlayerViewModel } from '../PlayerScreen'

function createCareer(phase: import('../../models/game').GamePhase) {
  const store = useGameStore.getState()
  store.startNewCareer()
  store.submitIdentity({ name: '导航测试', jerseyNumber: 9, preferredFoot: 'LEFT' })
  store.submitPosition('ST', 'LW')
  store.submitPriorities(['PLAYING_TIME', 'COMPETITIVE_LEVEL', 'SALARY', 'STABILITY'])
  store.submitPreferences('CONDITIONAL', [])
  store.confirmPlayer()
  const game = useGameStore.getState().game!
  return { ...game, phase }
}

function reportWithActualContract(
  actualTeamLevel: TeamLevel,
  actualRole: SquadRole,
): HalfYearReport {
  const unchanged = { before: 50, after: 50, delta: 0 }
  return {
    fromLabel: '2026年夏季',
    toLabel: '2026年冬季',
    clubId: 'ita_inter',
    clubName: '国际米兰',
    roleBefore: actualRole,
    roleAfter: actualRole,
    stats: { appearances: 12, starts: 6, minutes: 540, goals: 2, assists: 1, yellowCards: 0, redCards: 0, averageRating: 6.8 },
    attributes: { attack: unchanged, defense: unchanged, physical: unchanged, mental: unchanged },
    states: { form: unchanged, fitness: unchanged, morale: unchanged },
    relations: { coach: unchanged, squad: unchanged, fans: unchanged },
    firstTeam: {
      attention: unchanged,
      readiness: unchanged,
      matchProof: unchanged,
      coachBacking: unchanged,
      statusBefore: 'WATCHLIST',
      statusAfter: 'PROMOTED',
      outcomeSummary: '上一窗口的合同兑现记录。',
    },
    stipendEuro: 0,
    expenseEuro: 0,
    cashAfterEuro: 0,
    contract: {
      annualSalaryEuro: 100_000,
      remainingHalfYears: 4,
      promisedTeamLevel: actualTeamLevel,
      promisedRole: actualRole,
      actualTeamLevel,
      actualRole,
      promiseFulfilled: true,
      brokenPromiseWindows: 0,
    },
    injury: null,
    eventSummary: '无特殊事件。',
    hints: [],
  }
}

describe('player view model', () => {
  it('uses the shared visible window for the same report age CareerHub displays', () => {
    const game = { ...createCareer('HALF_YEAR_REPORT'), windowIndex: 8 }
    const view = buildPlayerViewModel(game)
    expect(view.age).toBe(17)
  })

  it('does not need a contract or selected club to produce a safe read-only view', () => {
    const game = { ...createCareer('ACADEMY_OFFERS'), selectedClubId: null, contract: null }
    const view = buildPlayerViewModel(game)
    expect(view.clubName).toBe('还没有加入俱乐部')
    expect(view.contract).toBeNull()
    expect(view.actualRole).toBeNull()
  })

  it('uses the new club current state after a transfer instead of the previous report contract', () => {
    const game = {
      ...createCareer('HALF_YEAR_PLAN'),
      selectedClubId: 'eng_arsenal',
      teamLevel: 'FIRST_TEAM' as const,
      firstTeamRole: 'CORE' as const,
      youthRole: 'STARTER' as const,
      lastReport: reportWithActualContract('YOUTH', 'ROTATION'),
    }

    const view = buildPlayerViewModel(game)
    expect(view.actualTeamLevel).toBe('FIRST_TEAM')
    expect(view.actualRole).toBe('CORE')
    expect(view.actualContractTeamLevel).toBe('FIRST_TEAM')
    expect(view.actualContractRole).toBe('CORE')
  })

  it('reads contract promises separately from the current first-team state', () => {
    const game = {
      ...createCareer('HALF_YEAR_PLAN'),
      teamLevel: 'FIRST_TEAM' as const,
      firstTeamRole: 'STARTER' as const,
      youthRole: 'CORE' as const,
      contract: {
        type: 'FIRST_PRO' as const,
        clubId: 'ita_inter',
        remainingHalfYears: 6,
        annualSalaryEuro: 120_000,
        promisedTeamLevel: 'FIRST_TEAM' as const,
        promisedRole: 'ROTATION' as const,
        releaseClauseEuro: null,
        clubOptionYears: 0,
        parentClubId: null,
        brokenPromiseWindows: 0,
      },
      lastReport: reportWithActualContract('YOUTH', 'CORE'),
    }

    const view = buildPlayerViewModel(game)
    expect(view.contract).toMatchObject({
      promisedTeamLevel: 'FIRST_TEAM',
      promisedRole: 'ROTATION',
    })
    expect(view.actualTeamLevel).toBe('FIRST_TEAM')
    expect(view.actualRole).toBe('STARTER')
  })

  it('uses only the role belonging to the current youth or first-team level', () => {
    const youthGame = {
      ...createCareer('HALF_YEAR_PLAN'),
      teamLevel: 'YOUTH' as const,
      youthRole: 'CORE' as const,
      firstTeamRole: 'FRINGE' as const,
    }
    const firstTeamGame = {
      ...createCareer('HALF_YEAR_PLAN'),
      teamLevel: 'FIRST_TEAM' as const,
      youthRole: 'ROTATION' as const,
      firstTeamRole: 'SUBSTITUTE' as const,
    }

    expect(buildPlayerViewModel(youthGame)).toMatchObject({
      actualTeamLevel: 'YOUTH',
      actualRole: 'CORE',
    })
    expect(buildPlayerViewModel(firstTeamGame)).toMatchObject({
      actualTeamLevel: 'FIRST_TEAM',
      actualRole: 'SUBSTITUTE',
    })
  })

  it('keeps event and transfer state structurally unchanged while switching player navigation', () => {
    const planGame = createCareer('HALF_YEAR_PLAN')
    const beforePlan = structuredClone(planGame)
    expect(nextCareerNav(nextCareerNav('CAREER', 'PLAYER'), 'CAREER')).toBe('CAREER')
    buildPlayerViewModel(planGame)
    expect(planGame).toEqual(beforePlan)

    const eventGame = {
      ...createCareer('SPECIAL_EVENT'),
      pendingCareerEvent: {
        eventId: 'AGENT_MARKET_CHECK' as const,
        interactionKind: 'CHOICE' as const,
        stepIndex: 1,
        selections: ['A'],
        variantId: 'route-a',
      },
    }
    const beforeEvent = structuredClone(eventGame)
    expect(nextCareerNav(nextCareerNav('CAREER', 'PLAYER'), 'CAREER')).toBe('CAREER')
    buildPlayerViewModel(eventGame)
    expect(eventGame).toEqual(beforeEvent)
    expect(eventGame.pendingCareerEvent).toMatchObject({
      eventId: 'AGENT_MARKET_CHECK',
      stepIndex: 1,
      variantId: 'route-a',
      selections: ['A'],
    })

    const transferGame = {
      ...createCareer('TRANSFER_WINDOW'),
      selectedTransferChoiceId: 'STAY' as const,
    }
    const beforeTransfer = structuredClone(transferGame)
    expect(nextCareerNav(nextCareerNav('CAREER', 'PLAYER'), 'CAREER')).toBe('CAREER')
    buildPlayerViewModel(transferGame)
    expect(transferGame).toEqual(beforeTransfer)
    expect(transferGame.selectedTransferChoiceId).toBe('STAY')
    expect(transferGame.contract).toEqual(beforeTransfer.contract)
  })
})
