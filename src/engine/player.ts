import {
  INITIAL_ATTRIBUTE_RANGES,
  INITIAL_OVR_DISTRIBUTION,
  POSITION_WEIGHTS,
  POTENTIAL_DISTRIBUTION,
  POTENTIAL_OFFSETS,
  PRIORITY_VALUES,
} from '../data/balance'
import {
  attributeKeys,
  type AttributeKey,
  type Attributes,
  type CreationDraft,
  type Player,
  type Position,
} from '../models/game'
import { createRandom, weightedPick } from './random'

export function calculateOverall(
  attributes: Attributes,
  position: Position,
): number {
  const weights = POSITION_WEIGHTS[position]
  return attributeKeys.reduce(
    (total, key) => total + attributes[key] * weights[key],
    0,
  )
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function respectsPositionShape(
  position: Position,
  attributes: Attributes,
): boolean {
  if (position === 'ST') return attributes.attack >= attributes.defense + 12
  if (position === 'CB') return attributes.defense >= attributes.attack + 15
  if (position === 'CDM') return attributes.defense >= attributes.attack + 8
  if (position === 'LB' || position === 'RB') {
    return attributes.defense >= attributes.attack + 5
  }
  if (position === 'LW' || position === 'RW' || position === 'CAM') {
    return attributes.attack >= attributes.defense + 8
  }
  return true
}

function generateInitialAttributes(
  seed: string,
  position: Position,
  targetOverall: number,
): Attributes {
  const random = createRandom(seed, 'initial-attributes', position)
  const ranges = INITIAL_ATTRIBUTE_RANGES[position]
  let best: Attributes | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (let attempt = 0; attempt < 3000; attempt += 1) {
    const candidate = Object.fromEntries(
      attributeKeys.map((key) => {
        const [min, max] = ranges[key]
        return [key, roundTenth(random.float(min, max))]
      }),
    ) as unknown as Attributes
    if (!respectsPositionShape(position, candidate)) continue
    const distance = Math.abs(calculateOverall(candidate, position) - targetOverall)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }

  if (!best) {
    throw new Error(`Unable to generate attributes for ${position}.`)
  }

  const difference = targetOverall - calculateOverall(best, position)
  const adjusted = { ...best }
  for (let attempt = 0; attempt < 20 && Math.abs(difference) > 0.01; attempt += 1) {
    const currentDifference = targetOverall - calculateOverall(adjusted, position)
    for (const key of attributeKeys) {
      const [min, max] = ranges[key]
      adjusted[key] = clamp(
        adjusted[key] + currentDifference,
        min,
        max,
      )
    }
  }

  return Object.fromEntries(
    attributeKeys.map((key) => [key, roundTenth(adjusted[key])]),
  ) as unknown as Attributes
}

function minimumPotentialGap(
  position: Position,
  key: AttributeKey,
): number {
  const sorted = [...attributeKeys].sort(
    (left, right) =>
      POSITION_WEIGHTS[position][right] - POSITION_WEIGHTS[position][left],
  )
  const rank = sorted.indexOf(key)
  return [15, 12, 8, 5][rank] ?? 5
}

function generatePotentials(
  seed: string,
  position: Position,
  attributes: Attributes,
): Attributes {
  const tierRandom = createRandom(seed, 'potential-tier')
  const tier = weightedPick(
    tierRandom,
    POTENTIAL_DISTRIBUTION.map((item) => ({
      value: item,
      weight: item.weight,
    })),
  )
  const target = tierRandom.int(tier.min, tier.max)
  const random = createRandom(seed, 'potential-attributes', position)
  const offsets = POTENTIAL_OFFSETS[position]

  const potentials = Object.fromEntries(
    attributeKeys.map((key) => {
      const [minOffset, maxOffset] = offsets[key]
      const candidate = target + random.float(minOffset, maxOffset)
      const minimum = attributes[key] + minimumPotentialGap(position, key)
      return [key, clamp(candidate, Math.max(20, minimum), 99)]
    }),
  ) as unknown as Attributes

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const difference = target - calculateOverall(potentials, position)
    if (Math.abs(difference) <= 0.5) break
    for (const key of attributeKeys) {
      const minimum = attributes[key] + minimumPotentialGap(position, key)
      potentials[key] = clamp(
        potentials[key] + difference,
        Math.max(20, minimum),
        99,
      )
    }
  }

  return Object.fromEntries(
    attributeKeys.map((key) => [key, roundTenth(potentials[key])]),
  ) as unknown as Attributes
}

export function generatePlayer(
  draft: CreationDraft,
  careerSeed: string,
): Player {
  const overallRandom = createRandom(careerSeed, 'initial-overall')
  const targetOverall = weightedPick(
    overallRandom,
    INITIAL_OVR_DISTRIBUTION.map((item) => ({
      value: item.value,
      weight: item.weight,
    })),
  )
  const attributes = generateInitialAttributes(
    careerSeed,
    draft.primaryPosition,
    targetOverall,
  )
  const potentials = generatePotentials(
    careerSeed,
    draft.primaryPosition,
    attributes,
  )
  const reputation = createRandom(careerSeed, 'reputation').int(5, 10)
  const priorityValues = Object.fromEntries(
    draft.priorities.map((priority, index) => [
      priority,
      PRIORITY_VALUES[index],
    ]),
  ) as Player['priorityValues']

  return {
    id: `player-${careerSeed.slice(0, 12)}`,
    name: draft.name.trim(),
    nationality: 'CHN',
    jerseyNumber: draft.jerseyNumber,
    preferredFoot: draft.preferredFoot,
    primaryPosition: draft.primaryPosition,
    secondaryPosition: draft.secondaryPosition,
    positionFamiliarity: {
      [draft.primaryPosition]: 100,
      [draft.secondaryPosition]: 92,
    },
    attributes,
    potentials,
    form: 50,
    fitness: 90,
    morale: 65,
    coachRelation: 50,
    squadRelation: 50,
    agentRelation: 50,
    fanRelation: 50,
    mediaRelation: 50,
    reputation,
    clubAttachment: 45,
    priorities: [...draft.priorities],
    priorityValues,
    overseasIntent: draft.overseasIntent,
    preferredLeagues: [...draft.preferredLeagues],
  }
}
