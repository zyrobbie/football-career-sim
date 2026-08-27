import { describe, expect, it } from 'vitest'
import { validateGameState } from '../persistence/save'
import { COPY_AUDIT_PHASES, createCopyAuditGame } from './createCopyAuditGame'

describe('COPY-A3 audit-state factory', () => {
  it('creates validated production-shaped state at every persisted phase', () => {
    for (const phase of COPY_AUDIT_PHASES) {
      const game = createCopyAuditGame(phase)
      if (phase === 'HOME') {
        expect(game).toBeNull()
      } else {
        expect(game?.phase).toBe(phase)
        expect(validateGameState(game)).toEqual(game)
      }
    }
  })
})
