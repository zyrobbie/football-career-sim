import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/balance'
import {
  developmentMultiplierFromTraining,
  trainingQualityScore,
} from '../trainingQuality'

function club(id: string) {
  return CLUBS.find((candidate) => candidate.id === id)!
}

describe('training quality', () => {
  it('keeps a visible nonlinear gap from global elite to domestic levels', () => {
    const common = {
      coachRelation: 50,
      teamLevel: 'YOUTH' as const,
    }
    const inter = trainingQualityScore({
      ...common,
      club: club('ita_inter'),
    })
    const shanghai = trainingQualityScore({
      ...common,
      club: club('cn_shanghai_donggang'),
    })
    const yunnan = trainingQualityScore({
      ...common,
      club: club('cn_yunnan_shanhe'),
    })

    expect(inter).toBeGreaterThan(shanghai)
    expect(shanghai).toBeGreaterThan(yunnan)

    const multiplier = (trainingQuality: number) =>
      developmentMultiplierFromTraining({
        trainingQuality,
        roleExposure: 90,
        squadRelation: 50,
        fitness: 70,
        morale: 70,
        focus: 'BALANCED',
      })
    const interMultiplier = multiplier(inter)
    const shanghaiMultiplier = multiplier(shanghai)
    const yunnanMultiplier = multiplier(yunnan)

    expect(interMultiplier).toBeGreaterThan(shanghaiMultiplier)
    expect(shanghaiMultiplier).toBeGreaterThan(yunnanMultiplier)
    expect(interMultiplier - shanghaiMultiplier).toBeGreaterThan(
      shanghaiMultiplier - yunnanMultiplier,
    )
    expect(interMultiplier / shanghaiMultiplier).toBeGreaterThan(1.2)
  })
})
