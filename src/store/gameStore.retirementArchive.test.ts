import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadGame, saveGame } from '../persistence/save'
import { createRetirementVisualAuditGame } from '../testing/createRetirementVisualAuditGame'
import { useGameStore } from './gameStore'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

const originalWindow = globalThis.window

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: new MemoryStorage() },
  })
  useGameStore.setState({ game: null, hasSave: false, error: null })
})

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  })
  useGameStore.setState({ game: null, hasSave: false, error: null })
})

describe('retirement archive return-home action', () => {
  it('only clears the retired archive from memory and keeps its persisted save resumable', () => {
    const retired = createRetirementVisualAuditGame(['ita_inter'])
    saveGame(retired)
    useGameStore.setState({ game: retired, hasSave: true, error: null })

    useGameStore.getState().returnToHome()

    expect(useGameStore.getState()).toMatchObject({
      game: null,
      hasSave: true,
      error: null,
    })
    expect(loadGame()).toEqual(retired)

    useGameStore.getState().continueCareer()
    expect(useGameStore.getState().game).toEqual(retired)
  })

  it('does nothing while a non-retired career is active', () => {
    const retired = createRetirementVisualAuditGame(['ita_inter'])
    const active = { ...retired, phase: 'RETIREMENT_DECISION' as const }
    useGameStore.setState({ game: active, hasSave: true, error: null })

    useGameStore.getState().returnToHome()

    expect(useGameStore.getState().game).toEqual(active)
    expect(useGameStore.getState().hasSave).toBe(true)
  })
})
