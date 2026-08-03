import { describe, expect, it } from 'vitest'
import {
  INITIAL_OVR_DISTRIBUTION,
  POSITION_WEIGHTS,
  SECONDARY_POSITIONS,
} from '../../data/balance'
import {
  attributeKeys,
  positions,
} from '../../models/game'
import {
  calculateOverall,
  generatePlayer,
} from '../player'
import { createDraft } from './testFixtures'

describe('position configuration', () => {
  it('uses weights that sum to one', () => {
    for (const position of positions) {
      const total = attributeKeys.reduce(
        (sum, key) => sum + POSITION_WEIGHTS[position][key],
        0,
      )
      expect(total).toBeCloseTo(1, 8)
      expect(SECONDARY_POSITIONS[position].length).toBeGreaterThan(0)
    }
  })

  it('uses an initial overall distribution that sums to 100', () => {
    expect(
      INITIAL_OVR_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0),
    ).toBe(100)
  })
})

describe('player generation', () => {
  it('is deterministic for the same seed', () => {
    const draft = createDraft('CM')
    expect(generatePlayer(draft, 'same-seed')).toEqual(
      generatePlayer(draft, 'same-seed'),
    )
  })

  it('keeps the player identity traits chosen during registration', () => {
    const draft = {
      ...createDraft('LW'),
      jerseyNumber: 17,
      preferredFoot: 'LEFT' as const,
    }
    const player = generatePlayer(draft, 'identity-traits-seed')
    expect(player.jerseyNumber).toBe(17)
    expect(player.preferredFoot).toBe('LEFT')
  })

  it('generates valid position-shaped attributes and potentials', () => {
    for (const position of positions) {
      for (let index = 0; index < 120; index += 1) {
        const player = generatePlayer(
          createDraft(position),
          `${position}-${index}`,
        )
        const overall = calculateOverall(player.attributes, position)
        expect(Math.round(overall)).toBeGreaterThanOrEqual(34)
        expect(Math.round(overall)).toBeLessThanOrEqual(43)
        expect(player.positionFamiliarity[position]).toBe(100)
        expect(
          player.positionFamiliarity[player.secondaryPosition],
        ).toBe(92)
        for (const key of attributeKeys) {
          expect(Number.isFinite(player.attributes[key])).toBe(true)
          expect(player.attributes[key]).toBeGreaterThanOrEqual(0)
          expect(player.attributes[key]).toBeLessThanOrEqual(100)
          expect(player.potentials[key]).toBeGreaterThanOrEqual(
            player.attributes[key],
          )
          expect(player.potentials[key]).toBeLessThanOrEqual(99)
        }
        if (position === 'ST') {
          expect(player.attributes.attack - player.attributes.defense).toBeGreaterThanOrEqual(12)
        }
        if (position === 'CB') {
          expect(player.attributes.defense - player.attributes.attack).toBeGreaterThanOrEqual(15)
        }
      }
    }
  }, 20_000)
})
