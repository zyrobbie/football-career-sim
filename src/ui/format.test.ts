import { describe, expect, it } from 'vitest'
import { clubLevelLabel } from './format'

describe('club level labels', () => {
  it('maps all six club tiers to player-facing competitive levels', () => {
    const tiers = [1, 2, 3, 4, 5, 6] as const
    expect(tiers.map(clubLevelLabel)).toEqual([
      '顶级联赛豪门',
      '顶级联赛强队',
      '顶级联赛中游',
      '顶级联赛中下游',
      '次级联赛强队',
      '次级联赛中下游',
    ])
  })
})
