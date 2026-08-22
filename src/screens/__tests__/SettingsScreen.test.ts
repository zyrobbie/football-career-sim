import { beforeEach, describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import { DATA_VERSION, SAVE_VERSION } from '../../models/game'
import { useGameStore } from '../../store/gameStore'
import { buildSettingsView, DELETE_CAREER_CONFIRMATION, deleteCareerIfConfirmed } from '../SettingsScreen'

function createCareer() {
  const store = useGameStore.getState()
  store.startNewCareer()
  store.submitIdentity({ name: '设置测试', jerseyNumber: 6, preferredFoot: 'RIGHT' })
  store.submitPosition('CM', 'CDM')
  store.submitPriorities(['STABILITY', 'PLAYING_TIME', 'COMPETITIVE_LEVEL', 'SALARY'])
  store.submitPreferences('DOMESTIC', [])
  store.confirmPlayer()
}

describe('settings screen helpers', () => {
  beforeEach(() => useGameStore.setState({ game: null, hasSave: false, error: null }))

  it('reads version and directory information from runtime constants', () => {
    const view = buildSettingsView()
    expect(view).toEqual({
      saveVersion: SAVE_VERSION,
      dataVersion: DATA_VERSION,
      clubCount: CLUBS.length,
      leagueCount: new Set(
        CLUBS.map((club) => club.leagueLabel.trim()).filter(Boolean),
      ).size,
    })
    expect(view.clubCount).toBe(366)
    expect(view.leagueCount).toBe(19)
    expect(view.leagueCount).not.toBe(new Set(CLUBS.map((club) => club.leagueKey)).size)
  })

  it('does nothing when deletion is cancelled', () => {
    let deleteCalls = 0
    expect(deleteCareerIfConfirmed((message) => {
      expect(message).toBe(DELETE_CAREER_CONFIRMATION)
      return false
    }, () => { deleteCalls += 1 })).toBe(false)
    expect(deleteCalls).toBe(0)
  })

  it('uses the existing store deletion action after confirmation', () => {
    createCareer()
    expect(useGameStore.getState().game).not.toBeNull()
    expect(deleteCareerIfConfirmed(() => true, () => useGameStore.getState().deleteCareer())).toBe(true)
    expect(useGameStore.getState().game).toBeNull()
    expect(useGameStore.getState().hasSave).toBe(false)
  })
})
