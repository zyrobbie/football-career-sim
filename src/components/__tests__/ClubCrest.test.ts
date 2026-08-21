import { describe, expect, it } from 'vitest'
import { resolveClubCrestPresentation } from '../ClubCrest'

describe('club crest presentation fallback', () => {
  it('keeps a mixed three-card invitation set renderable with local assets and short marks', () => {
    const cards = [
      resolveClubCrestPresentation({ clubId: 'cn_shanghai_donggang', shortMark: '沪' }),
      resolveClubCrestPresentation({ clubId: 'ita_inter', shortMark: '国' }),
      resolveClubCrestPresentation({ clubId: 'eng_liverpool', shortMark: '利' }),
    ]

    expect(cards.map((card) => card.assetPath !== null)).toEqual([true, false, false])
    expect(cards.map((card) => card.fallbackShortMark)).toEqual(['沪', '国', '利'])
  })

  it('uses the same resolved resource for repeated career spells', () => {
    const spells = Array.from({ length: 3 }, () =>
      resolveClubCrestPresentation({ clubId: 'cn_chengdu_jincheng', shortMark: '蓉' }),
    )

    expect(new Set(spells.map((spell) => spell.assetPath))).toEqual(
      new Set(['/assets/clubs/crests/cn-chengdu-jincheng.svg']),
    )
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

    expect(shanghai.assetPath).toBe('/assets/clubs/crests/cn-shanghai-donggang.svg')
    expect(afterShanghaiFailure).toEqual({ assetPath: null, fallbackShortMark: '沪' })
    expect(beijingAfterShanghaiFailure).toEqual({
      assetPath: '/assets/clubs/crests/cn-beijing-yuhua.svg',
      fallbackShortMark: '京',
    })
    expect(
      resolveClubCrestPresentation({
        clubId: 'ita_inter',
        shortMark: '国',
        failedAssetPath: shanghai.assetPath,
      }),
    ).toEqual({ assetPath: null, fallbackShortMark: '国' })
  })
})
