import { describe, expect, it } from 'vitest'
import { POSITION_WEIGHTS } from '../../data/balance'
import { positions, type Position } from '../../models/game'
import { developAttributesByAge } from '../ageDevelopment'
import { calculateOverall, generatePlayer } from '../player'
import { createRandom } from '../random'
import { createDraft } from './testFixtures'

function percentile(values: number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) * share)]!
}

describe('career growth distribution', () => {
  it('lets strong-potential players approach their ceiling in an elite environment', () => {
    const potentials: number[] = []
    const peaks: number[] = []
    const fulfillment: number[] = []

    for (let index = 0; index < 500; index += 1) {
      const position = positions[index % positions.length] as Position
      const seed = `career-growth-${index}`
      let player = generatePlayer(createDraft(position), seed)
      const potential = calculateOverall(player.potentials, position)
      let peak = calculateOverall(player.attributes, position)

      for (let windowIndex = 0; windowIndex <= 35; windowIndex += 1) {
        const age = 13 + Math.floor(windowIndex / 2)
        player = {
          ...player,
          attributes: developAttributesByAge({
            player,
            age,
            developmentMultiplier: 1.3,
            trainingShares: POSITION_WEIGHTS[position],
            random: createRandom(seed, 'career-growth', windowIndex),
          }),
        }
        peak = Math.max(peak, calculateOverall(player.attributes, position))
      }

      potentials.push(potential)
      peaks.push(peak)
      fulfillment.push((peak / potential) * 100)
    }

    expect(peaks.filter((value) => value >= 80).length / peaks.length).toBeGreaterThanOrEqual(0.27)
    expect(peaks.filter((value) => value >= 85).length / peaks.length).toBeGreaterThanOrEqual(0.07)
    expect(percentile(peaks, 0.5)).toBeGreaterThan(75)
    expect(percentile(fulfillment, 0.5)).toBeGreaterThan(97)
    expect(percentile(peaks, 0.9)).toBeLessThanOrEqual(percentile(potentials, 0.9) + 0.5)
  })

  it('lets a normal professional pathway realize most of its potential', () => {
    const peaks: number[] = []
    const fulfillment: number[] = []

    for (let index = 0; index < 500; index += 1) {
      const position = positions[index % positions.length] as Position
      const seed = `normal-career-growth-${index}`
      let player = generatePlayer(createDraft(position), seed)
      const potential = calculateOverall(player.potentials, position)
      let peak = calculateOverall(player.attributes, position)

      for (let windowIndex = 0; windowIndex <= 35; windowIndex += 1) {
        const age = 13 + Math.floor(windowIndex / 2)
        player = {
          ...player,
          attributes: developAttributesByAge({
            player,
            age,
            developmentMultiplier: 0.95,
            trainingShares: POSITION_WEIGHTS[position],
            random: createRandom(seed, 'normal-career-growth', windowIndex),
          }),
        }
        peak = Math.max(peak, calculateOverall(player.attributes, position))
      }

      peaks.push(peak)
      fulfillment.push((peak / potential) * 100)
    }

    expect(percentile(fulfillment, 0.5)).toBeGreaterThan(94)
    expect(peaks.filter((value) => value >= 80).length / peaks.length).toBeGreaterThanOrEqual(0.22)
    expect(peaks.filter((value) => value >= 85).length / peaks.length).toBeGreaterThanOrEqual(0.04)
  })
})
