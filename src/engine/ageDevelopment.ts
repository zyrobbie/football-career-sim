import {
  declineManagementFactor,
  declineProfileAtAge,
  growthPoolAtAge,
} from '../data/ageCurve'
import {
  attributeKeys,
  type AttributeKey,
  type Attributes,
  type Player,
} from '../models/game'
import type { RandomSource } from './random'

function gapFactor(gap: number): number {
  if (gap >= 25) return 1
  if (gap >= 15) return 0.8
  if (gap >= 8) return 0.55
  if (gap >= 3) return 0.25
  if (gap > 0) return 0.08
  return 0
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

export function developAttributesByAge(input: {
  player: Player
  age: number
  developmentMultiplier: number
  trainingShares: Record<AttributeKey, number>
  random: RandomSource
}): Attributes {
  const {
    player,
    age,
    developmentMultiplier,
    trainingShares,
    random,
  } = input
  const growthPool = growthPoolAtAge(age)
  const decline = declineProfileAtAge(age)
  const managementFactor = declineManagementFactor(player.fitness)

  return Object.fromEntries(
    attributeKeys.map((key) => {
      const canNormallyGrow = !(age >= 31 && key === 'physical')
      const gap = player.potentials[key] - player.attributes[key]
      const normalGrowth = canNormallyGrow
        ? growthPool *
          developmentMultiplier *
          trainingShares[key] *
          gapFactor(gap) *
          random.float(0.9, 1.1)
        : 0
      const lateMentalGrowth =
        age >= 34 && age <= 36 && key === 'mental'
          ? random.float(0, 0.1)
          : 0
      const improved = Math.min(
        player.potentials[key],
        player.attributes[key] + normalGrowth + lateMentalGrowth,
      )
      const afterDecline = improved - decline[key] * managementFactor

      return [key, roundTenth(Math.max(20, afterDecline))]
    }),
  ) as unknown as Attributes
}
