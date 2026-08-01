import { describe, expect, it } from 'vitest'
import type { Player } from '../../models/game'
import { developAttributesByAge } from '../ageDevelopment'
import type { RandomSource } from '../random'

const random: RandomSource = {
  next: () => 0.5,
  float: (min, max) => min + (max - min) * 0.5,
  int: (min, max) => Math.floor((min + max) / 2),
  pick: (items) => items[0]!,
}

const player = {
  attributes: { attack: 60, defense: 60, physical: 60, mental: 60 },
  potentials: { attack: 90, defense: 90, physical: 90, mental: 90 },
  fitness: 100,
} as Player

const shares = { attack: 0.25, defense: 0.25, physical: 0.25, mental: 0.25 }

describe('age development curve', () => {
  it('grows normally in the early career and slows by age band', () => {
    const age20 = developAttributesByAge({
      player,
      age: 20,
      developmentMultiplier: 1,
      trainingShares: shares,
      random,
    })
    const age29 = developAttributesByAge({
      player,
      age: 29,
      developmentMultiplier: 1,
      trainingShares: shares,
      random,
    })

    expect(age20.attack).toBeGreaterThan(age29.attack)
    expect(age29.attack).toBeGreaterThan(60)
  })

  it('stops physical growth from age 31 while other attributes can still improve', () => {
    const attributes = developAttributesByAge({
      player,
      age: 32,
      developmentMultiplier: 1,
      trainingShares: shares,
      random,
    })

    expect(attributes.attack).toBeGreaterThan(60)
    expect(attributes.physical).toBeLessThan(60)
  })

  it('applies decline instead of normal growth from age 34 onward', () => {
    const age35 = developAttributesByAge({
      player,
      age: 35,
      developmentMultiplier: 1.35,
      trainingShares: shares,
      random,
    })
    const age40 = developAttributesByAge({
      player,
      age: 40,
      developmentMultiplier: 1.35,
      trainingShares: shares,
      random,
    })

    expect(age35.attack).toBeLessThan(60)
    expect(age35.physical).toBeLessThan(60)
    expect(age35.mental).toBeGreaterThanOrEqual(60)
    expect(age40.attack).toBeLessThan(60)
    expect(age40.defense).toBeLessThan(60)
    expect(age40.physical).toBeLessThan(59.5)
    expect(age40.mental).toBeLessThan(60)
  })
})
