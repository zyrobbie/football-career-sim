import { describe, expect, it } from 'vitest'
import { CLUBS } from '../data/balance'
import {
  clubLevelLabel,
  integrationDifficultyLabel,
  trainingQualityLabel,
} from './format'

describe('club level labels', () => {
  it('distinguishes global platform and training levels across leagues', () => {
    const inter = CLUBS.find((club) => club.id === 'ita_inter')!
    const bologna = CLUBS.find((club) => club.id === 'ita_bologna')!
    const shanghai = CLUBS.find(
      (club) => club.id === 'cn_shanghai_donggang',
    )!
    const guangxi = CLUBS.find(
      (club) => club.id === 'cn_guangxi_liancheng',
    )!

    expect(clubLevelLabel(inter)).toBe('世界级豪门')
    expect(clubLevelLabel(bologna)).toBe('五大联赛中游')
    expect(clubLevelLabel(shanghai)).toBe('中国顶级豪门')
    expect(clubLevelLabel(guangxi)).toBe('中国次级强队')
    expect(trainingQualityLabel(inter)).toBe('世界顶尖训练')
    expect(trainingQualityLabel(shanghai)).toBe('国内顶尖训练')
    expect(integrationDifficultyLabel(inter)).toBe('极高')
    expect(integrationDifficultyLabel(shanghai)).toBe('中等')
  })
})
