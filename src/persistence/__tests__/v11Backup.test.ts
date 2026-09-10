import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { deleteSavedCareer, loadGame, saveGame, validateGameState } from '../save'
const raw = readFileSync('docs/evidence/CEU-20260907/S0/fixtures/HALF_YEAR_REPORT.json', 'utf8')
const current = 'career_save_current', backup = 'career_save_backup', frozen = 'career_save_v11_backup'
function storage(entries: [string, string][], fail = false) {
  const data = new Map(entries)
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { if (fail && key === frozen) throw new Error('quota'); data.set(key, value) },
    removeItem: (key: string) => data.delete(key),
  } })
  return data
}
afterEach(() => vi.unstubAllGlobals())
it('keeps exact v11 bytes after migration and repeated v12 save/reload', () => {
  const data = storage([[current, raw]])
  const game = loadGame()!
  expect(game.saveVersion).toBe(12)
  for (let i = 0; i < 3; i++) { saveGame(game); expect(loadGame()).toEqual(game) }
  expect(JSON.parse(data.get(backup)!).data.saveVersion).toBe(12)
  expect(data.get(frozen)).toBe(raw)
})
it('preserves v11 on direct save before rotating the current', () => {
  const data = storage([[current, raw]])
  saveGame(validateGameState(JSON.parse(raw).data))
  expect(data.get(frozen)).toBe(raw)
  expect(JSON.parse(data.get(current)!).data.saveVersion).toBe(12)
})
it('preserves a valid v11 backup when recovering a corrupt current', () => {
  const data = storage([[current, 'corrupt'], [backup, raw]])
  expect(loadGame()!.saveVersion).toBe(12)
  expect(data.get(frozen)).toBe(raw)
})
it.each(['load', 'save'])('leaves original slots untouched if persistent backup fails during %s', action => {
  const data = storage([[current, raw], [backup, raw]], true)
  expect(() => action === 'load' ? loadGame() : saveGame(validateGameState(JSON.parse(raw).data))).toThrow('quota')
  expect(data.get(current)).toBe(raw); expect(data.get(backup)).toBe(raw)
})
it('does not archive corrupted input and removes all slots on explicit deletion', () => {
  const data = storage([[current, 'corrupt']])
  expect(loadGame()).toBeNull(); expect(data.has(frozen)).toBe(false)
  data.set(current, raw); loadGame(); deleteSavedCareer()
  expect(data.size).toBe(0)
})
