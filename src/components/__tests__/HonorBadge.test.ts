import { describe, expect, it } from 'vitest'
import { honorBadgeExportAttributes, HONOR_BADGE_EXPORT_RASTERIZE } from '../HonorBadge'
import { matchHonorVisual } from '../../data/honors/honorVisualRegistry'

describe('honor badge presentation', () => {
  it('marks local visual assets for retirement export rasterization', () => {
    const assetPath = matchHonorVisual({ type: 'CONTINENTAL_TITLE', competitionLabel: '欧冠', label: '欧冠冠军' }).visual?.assetPath ?? null
    expect(honorBadgeExportAttributes(assetPath)).toEqual({ 'data-export-rasterize': HONOR_BADGE_EXPORT_RASTERIZE })
    expect(honorBadgeExportAttributes(null)).toEqual({})
  })

  it('keeps the sixteen new league-title visuals renderable and export-rasterized', () => {
    for (const competitionLabel of ['西甲', '德甲', '法甲', '荷甲', '葡超', '比甲', 'J1联赛', 'K1联赛', '巴甲', '阿甲', '英冠', '意乙', '西乙', '德乙', '法乙', '中甲']) {
      const assetPath = matchHonorVisual({ type: 'LEAGUE_TITLE', competitionLabel, label: `${competitionLabel}冠军` }).visual?.assetPath ?? null
      expect(assetPath).toMatch(/assets\/honors\/.+\.svg$/)
      expect(honorBadgeExportAttributes(assetPath)).toEqual({ 'data-export-rasterize': HONOR_BADGE_EXPORT_RASTERIZE })
    }
  })

  it('keeps the new domestic-cup visuals renderable and export-rasterized', () => {
    for (const competitionLabel of ['国王杯', '德国杯', '法国杯', '荷兰杯', '葡萄牙杯', '比利时杯', '中国足协杯', '天皇杯', '韩国杯', '巴西杯', '阿根廷杯']) {
      const assetPath = matchHonorVisual({ type: 'DOMESTIC_CUP', competitionLabel, label: `${competitionLabel}冠军` }).visual?.assetPath ?? null
      expect(assetPath).toMatch(/assets\/honors\/.+\.svg$/)
      expect(honorBadgeExportAttributes(assetPath)).toEqual({ 'data-export-rasterize': HONOR_BADGE_EXPORT_RASTERIZE })
    }
  })

  it('keeps the Libertadores visual renderable and export-rasterized', () => {
    const assetPath = matchHonorVisual({ type: 'CONTINENTAL_TITLE', competitionLabel: '解放者杯', label: '解放者杯冠军' }).visual?.assetPath ?? null
    expect(assetPath).toMatch(/assets\/honors\/copa-libertadores\.svg$/)
    expect(honorBadgeExportAttributes(assetPath)).toEqual({ 'data-export-rasterize': HONOR_BADGE_EXPORT_RASTERIZE })
  })

  it('matches continental, national, and individual final-batch honors without cross-using assets', () => {
    expect(matchHonorVisual({ type: 'CONTINENTAL_TITLE', competitionLabel: '亚冠精英联赛', label: '亚冠精英联赛冠军' }).visual?.key).toBe('afc-champions-league-elite')
    expect(matchHonorVisual({ type: 'ASIAN_CUP', competitionLabel: '亚洲杯', label: '亚洲杯冠军' }).visual?.key).toBe('asian-cup')
    expect(matchHonorVisual({ type: 'LEAGUE_PLAYER_OF_YEAR', competitionLabel: '意甲', label: '意甲最佳球员' })).toMatchObject({
      displayLabel: '意甲联赛最佳球员',
      visual: expect.objectContaining({ key: 'league-player-of-year' }),
    })
    expect(matchHonorVisual({ type: 'ASIAN_CUP', competitionLabel: '未知杯赛', label: '未知杯赛冠军' })).toMatchObject({ visual: null, fallbackMark: '亚' })
  })

  it('keeps an unknown honor renderable as a text category mark', () => {
    expect(matchHonorVisual({ type: 'ASIAN_CUP', competitionLabel: '未知亚洲赛事', label: '未知亚洲赛事冠军' })).toMatchObject({ visual: null, fallbackMark: '亚' })
  })
})
