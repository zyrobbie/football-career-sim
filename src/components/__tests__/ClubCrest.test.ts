import { describe, expect, it } from 'vitest'
import {
  CLUB_CREST_EXPORT_RASTERIZE,
  clubCrestAssetExportAttributes,
  resolveClubCrestPresentation,
} from '../ClubCrest'

describe('club crest presentation fallback', () => {
  it('keeps a mixed three-card invitation set renderable with approved assets and short marks', () => {
    const cards = [
      resolveClubCrestPresentation({ clubId: 'cn_shanghai_donggang', shortMark: '沪' }),
      resolveClubCrestPresentation({ clubId: 'ita_inter', shortMark: '国' }),
      resolveClubCrestPresentation({ clubId: 'eng_liverpool', shortMark: '利' }),
    ]

    expect(cards.map((card) => card.assetPath !== null)).toEqual([true, true, false])
    expect(cards.map((card) => card.fallbackShortMark)).toEqual(['沪', '国', '利'])
  })

  it('uses the same resolved resource for repeated career spells', () => {
    const spells = Array.from({ length: 3 }, () =>
      resolveClubCrestPresentation({ clubId: 'cn_chengdu_jincheng', shortMark: '蓉' }),
    )

    expect(new Set(spells.map((spell) => spell.assetPath))).toEqual(
      new Set([expect.stringMatching(/assets\/clubs\/crests\/cn-chengdu-jincheng\.svg$/)]),
    )
  })

  it('marks only real crest assets for export-clone rasterization', () => {
    const asset = resolveClubCrestPresentation({
      clubId: 'cn_beijing_yuhua',
      shortMark: '京',
    })
    expect(clubCrestAssetExportAttributes(asset.assetPath)).toEqual({
      'data-export-rasterize': CLUB_CREST_EXPORT_RASTERIZE,
    })
    expect(clubCrestAssetExportAttributes(null)).toEqual({})
  })

  it('uses local SVG resources for both Chinese crest batches', () => {
    for (const clubId of ['cn_wuhan_jiangcheng', 'chn1_tianjin_jinmen', 'cn_guangxi_liancheng', 'chn2_liaoning_tiecheng', 'chn2_hohhot_qingcheng']) {
      const presentation = resolveClubCrestPresentation({ clubId, shortMark: '测' })
      expect(presentation.assetPath).toMatch(/assets\/clubs\/crests\/cn-[a-z-]+\.svg$/)
      expect(presentation.fallbackShortMark).toBe('测')
    }
    expect(resolveClubCrestPresentation({ clubId: 'unknown-china-club', shortMark: '测' }))
      .toEqual({ assetPath: null, fallbackShortMark: '测' })
  })

  it('isolates an image failure to its asset path and retries a different club asset', () => {
    const shanghai = resolveClubCrestPresentation({
      clubId: 'cn_shanghai_donggang',
      shortMark: '沪',
    })
    const afterShanghaiFailure = resolveClubCrestPresentation({
      clubId: 'cn_shanghai_donggang',
      shortMark: '沪',
      failedAssetPath: shanghai.assetPath,
    })
    const beijingAfterShanghaiFailure = resolveClubCrestPresentation({
      clubId: 'cn_beijing_yuhua',
      shortMark: '京',
      failedAssetPath: shanghai.assetPath,
    })

    expect(shanghai.assetPath).toMatch(/assets\/clubs\/crests\/cn-shanghai-donggang\.svg$/)
    expect(afterShanghaiFailure).toEqual({ assetPath: null, fallbackShortMark: '沪' })
    expect(beijingAfterShanghaiFailure).toEqual({
      assetPath: expect.stringMatching(/assets\/clubs\/crests\/cn-beijing-yuhua\.svg$/),
      fallbackShortMark: '京',
    })
    expect(
      resolveClubCrestPresentation({
        clubId: 'ita_inter',
        shortMark: '国',
        failedAssetPath: shanghai.assetPath,
      }),
    ).toEqual({
      assetPath: expect.stringMatching(/assets\/clubs\/crests\/ita-inter\.svg$/),
      fallbackShortMark: '国',
    })
    expect(resolveClubCrestPresentation({ clubId: 'ita_juventus', shortMark: '尤' }))
      .toEqual({ assetPath: null, fallbackShortMark: '尤' })
  })
})
