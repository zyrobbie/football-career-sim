import { beforeEach, describe, expect, it } from 'vitest'
import {
  deleteCareerIfConfirmed as deleteHomeCareerIfConfirmed,
  HOME_DELETE_CAREER_CONFIRMATION,
  HOME_NEW_CAREER_CONFIRMATION,
  startNewCareerIfConfirmed,
} from '../HomeScreen'
import {
  deleteDemoCareerIfConfirmed,
  DEMO_DELETE_CAREER_CONFIRMATION,
} from '../DemoCompleteScreen'
import {
  retireFromNationalTeamIfConfirmed,
  RETIRE_NATIONAL_TEAM_CONFIRMATION,
} from '../ProfessionalStageCompleteScreen'
import { createCopyAuditGame } from '../../testing/createCopyAuditGame'
import { useGameStore } from '../../store/gameStore'

function seedCareer() {
  useGameStore.setState({ game: createCopyAuditGame('ACADEMY_OFFERS'), hasSave: true, error: null })
}

describe('native confirmation flows', () => {
  beforeEach(() => useGameStore.setState({ game: null, hasSave: false, error: null }))

  it('keeps an existing home career when replacing it is cancelled, then starts normally when accepted', () => {
    seedCareer()
    const before = structuredClone(useGameStore.getState().game)
    expect(startNewCareerIfConfirmed(true, (message) => {
      expect(message).toBe(HOME_NEW_CAREER_CONFIRMATION)
      return false
    }, useGameStore.getState().startNewCareer)).toBe(false)
    expect(useGameStore.getState().game).toEqual(before)
    expect(startNewCareerIfConfirmed(true, () => true, useGameStore.getState().startNewCareer)).toBe(true)
    expect(useGameStore.getState().game?.phase).toBe('CREATE_IDENTITY')
  })

  it.each([
    ['home', HOME_DELETE_CAREER_CONFIRMATION, deleteHomeCareerIfConfirmed],
    ['academy completion', DEMO_DELETE_CAREER_CONFIRMATION, deleteDemoCareerIfConfirmed],
  ] as const)('%s deletion keeps state on cancel and clears it on confirmation', (_scope, message, confirmDelete) => {
    seedCareer()
    const before = structuredClone(useGameStore.getState().game)
    expect(confirmDelete((actual) => {
      expect(actual).toBe(message)
      return false
    }, useGameStore.getState().deleteCareer)).toBe(false)
    expect(useGameStore.getState().game).toEqual(before)
    expect(confirmDelete(() => true, useGameStore.getState().deleteCareer)).toBe(true)
    expect(useGameStore.getState().game).toBeNull()
    expect(useGameStore.getState().hasSave).toBe(false)
  })

  it('only retires from the national team after confirmation and preserves club state', () => {
    const game = createCopyAuditGame('PRO_STAGE_COMPLETE')!
    const eligible = {
      ...game,
      windowIndex: 34,
      teamLevel: 'FIRST_TEAM' as const,
      youthRole: null,
      firstTeamRole: 'FRINGE' as const,
      contract: game.contract
        ? {
            ...game.contract,
            promisedTeamLevel: 'FIRST_TEAM' as const,
            promisedRole: 'FRINGE' as const,
          }
        : null,
      firstTeamProgress: {
        ...game.firstTeamProgress,
        status: 'PROMOTED' as const,
      },
      nationalTeam: {
        ...game.nationalTeam,
        caps: 1,
        history: [{ windowIndex: 34, calledUp: true, role: 'STARTER' as const, competition: 'INTERNATIONAL_WINDOW' as const, stage: null, appearances: 1, starts: 1, minutes: 90, goals: 0, assists: 0, averageRating: 7, selectionScore: 70, selectionBenchmark: 60, debut: true, summary: '验收征召。' }],
        debutWindowIndex: 34,
        currentRole: 'STARTER' as const,
      },
    }
    useGameStore.setState({ game: eligible, hasSave: true, error: null })
    const before = structuredClone(useGameStore.getState().game!)
    expect(retireFromNationalTeamIfConfirmed((message) => {
      expect(message).toBe(RETIRE_NATIONAL_TEAM_CONFIRMATION)
      return false
    }, useGameStore.getState().retireFromNationalTeam)).toBe(false)
    expect(useGameStore.getState().game).toEqual(before)
    expect(retireFromNationalTeamIfConfirmed(() => true, useGameStore.getState().retireFromNationalTeam)).toBe(true)
    const after = useGameStore.getState().game!
    expect(after.nationalTeam.retired).toBe(true)
    expect(after.nationalTeam.currentRole).toBeNull()
    expect(after.phase).toBe(before.phase)
    expect(after.selectedClubId).toBe(before.selectedClubId)
    expect(after.contract).toEqual(before.contract)
    expect(after.cashEuro).toBe(before.cashEuro)
  })
})
