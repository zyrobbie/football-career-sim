import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CLUB_CREST_MANIFEST,
  clubCrestAssetPath,
  getClubCrestByCompatibleId,
  getClubCrestManifestRecordByCompatibleId,
} from '../clubCrests'

describe('club crest V1 manifest', () => {
  it('resolves locally usable sample crests by canonical and workbook-compatible IDs', () => {
    const byCanonicalId = getClubCrestByCompatibleId('cn_shanghai_donggang')
    const byWorkbookId = getClubCrestByCompatibleId('chn1_shanghai_donggang')

    expect(byCanonicalId).not.toBeNull()
    expect(byWorkbookId).toBe(byCanonicalId)
    expect(byCanonicalId).toMatchObject({
      canonicalClubId: 'cn_shanghai_donggang',
      crestKey: 'shanghai-donggang-original',
      assetPath: '/assets/clubs/crests/cn-shanghai-donggang.svg',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
    })
    expect(Object.isFrozen(byCanonicalId)).toBe(true)
  })

  it('keeps local crest URLs inside the configured Pages base path', () => {
    expect(clubCrestAssetPath('cn-shanghai-donggang.svg', './')).toBe(
      './assets/clubs/crests/cn-shanghai-donggang.svg',
    )
    expect(clubCrestAssetPath('cn-shanghai-donggang.svg', '/football-career-sim/')).toBe(
      '/football-career-sim/assets/clubs/crests/cn-shanghai-donggang.svg',
    )
  })

  it('retains auditable real-club references while returning null without a cleared local asset', () => {
    const canonical = getClubCrestManifestRecordByCompatibleId('ita_inter')
    const workbook = getClubCrestManifestRecordByCompatibleId('ita1_inter')

    expect(workbook).toBe(canonical)
    expect(canonical).toMatchObject({
      canonicalClubId: 'ita_inter',
      assetPath: null,
      sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
    })
    expect(getClubCrestByCompatibleId('ita_inter')).toBeNull()
    expect(getClubCrestByCompatibleId('eng_liverpool')).toBeNull()
    expect(getClubCrestByCompatibleId('missing-club')).toBeNull()
  })

  it('has forty unique, canonical, audit-complete records and thirty-two usable Chinese local crests', () => {
    expect(CLUB_CREST_MANIFEST).toHaveLength(40)
    expect(new Set(CLUB_CREST_MANIFEST.map((crest) => crest.canonicalClubId)).size).toBe(40)
    expect(new Set(CLUB_CREST_MANIFEST.map((crest) => crest.crestKey)).size).toBe(40)
    expect(CLUB_CREST_MANIFEST.filter((crest) => crest.assetPath !== null)).toHaveLength(32)

    for (const crest of CLUB_CREST_MANIFEST) {
      expect(getClubCrestManifestRecordByCompatibleId(crest.canonicalClubId)).toBe(crest)
      expect(crest.sourceUrl.length).toBeGreaterThan(0)
      expect(crest.attribution.length).toBeGreaterThan(0)
      expect(crest.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      if (crest.assetPath) {
        expect(crest.assetPath).toMatch(/(?:^|\/)assets\/clubs\/crests\/[a-z0-9-]+\.svg$/)
        expect(crest.rightsStatus).toBe('ORIGINAL_GAME_ASSET')
      } else {
        expect(crest.rightsStatus).toBe('TRADEMARK_ASSET_PENDING_CLEARANCE')
      }
    }
  })

  it('resolves every Chinese crest through its canonical and workbook-compatible IDs', () => {
    const pairs = [
      ['cn_wuhan_jiangcheng', 'chn1_wuhan_jiangcheng'],
      ['chn1_tianjin_jinmen', 'chn1_tianjin_jinmen'],
      ['chn1_zhejiang_qianchao', 'chn1_zhejiang_qianchao'],
      ['chn1_henan_zhongyuan', 'chn1_henan_zhongyuan'],
      ['chn1_changchun_beichen', 'chn1_changchun_beichen'],
      ['chn1_dalian_bincheng', 'chn1_dalian_bincheng'],
      ['chn1_qingdao_haiwan', 'chn1_qingdao_haiwan'],
      ['chn1_shenzhen_pengcheng', 'chn1_shenzhen_pengcheng'],
      ['chn1_chongqing_shancheng', 'chn1_chongqing_shancheng'],
      ['chn1_xian_changan', 'chn1_xian_changan'],
      ['chn1_nanjing_jinling', 'chn1_nanjing_jinling'],
      ['chn1_guangzhou_nanyue', 'chn1_guangzhou_nanyue'],
      ['cn_guangxi_liancheng', 'chn2_guangxi_liancheng'],
      ['cn_yunnan_shanhe', 'chn2_yunnan_shanhe'],
      ['chn2_liaoning_tiecheng', 'chn2_liaoning_tiecheng'], ['chn2_shijiazhuang_yanzhao', 'chn2_shijiazhuang_yanzhao'],
      ['chn2_suzhou_wumen', 'chn2_suzhou_wumen'], ['chn2_wuxi_taihu', 'chn2_wuxi_taihu'],
      ['chn2_nantong_jianghai', 'chn2_nantong_jianghai'], ['chn2_hefei_luzhou', 'chn2_hefei_luzhou'],
      ['chn2_foshan_lingnan', 'chn2_foshan_lingnan'], ['chn2_meizhou_jiaying', 'chn2_meizhou_jiaying'],
      ['chn2_xiamen_ludao', 'chn2_xiamen_ludao'], ['chn2_ningbo_yongjiang', 'chn2_ningbo_yongjiang'],
      ['chn2_shaanxi_qinling', 'chn2_shaanxi_qinling'], ['chn2_guizhou_qianfeng', 'chn2_guizhou_qianfeng'],
      ['chn2_xinjiang_kunlun', 'chn2_xinjiang_kunlun'], ['chn2_hohhot_qingcheng', 'chn2_hohhot_qingcheng'],
    ] as const
    for (const [canonicalId, workbookId] of pairs) {
      const canonical = getClubCrestByCompatibleId(canonicalId)
      expect(canonical).not.toBeNull()
      expect(getClubCrestByCompatibleId(workbookId)).toBe(canonical)
    }
    expect(getClubCrestByCompatibleId('missing-china-club')).toBeNull()
  })

  it('keeps batch-A primary motifs distinct while retaining safe, closed football-badge assets', () => {
    const batchA = [
      ['cn-wuhan-jiangcheng.svg', 'TWO_RIVERS_AND_BRIDGE'],
      ['cn-tianjin-jinmen.svg', 'ARCH_GATE_AND_RIVER_RING'],
      ['cn-zhejiang-qianchao.svg', 'THREE_LAYER_TIDAL_WAVE'],
      ['cn-henan-zhongyuan.svg', 'BRONZE_TRIPOD_AND_RIVER'],
      ['cn-changchun-beichen.svg', 'POLAR_STAR_AND_ICE_CRYSTAL'],
      ['cn-dalian-bincheng.svg', 'LIGHTHOUSE_BEAM_AND_SEA'],
      ['cn-qingdao-haiwan.svg', 'MAIN_SAIL_AND_TRESTLE'],
      ['cn-shenzhen-pengcheng.svg', 'SKYLINE_AND_SPEED_LINES'],
      ['cn-chongqing-shancheng.svg', 'TERRACES_AND_MONORAIL'],
      ['cn-xian-changan.svg', 'CITY_WALL_AND_PAGODA'],
      ['cn-nanjing-jinling.svg', 'RIVER_BRIDGE_AND_PLANE_TREE'],
      ['cn-guangzhou-nanyue.svg', 'CANTON_TOWER_AND_PEARL_RIVER'],
      ['cn-guangxi-liancheng.svg', 'KARST_AND_BRONZE_DRUM'],
      ['cn-yunnan-shanhe.svg', 'SNOW_MOUNTAIN_AND_TERRACES'],
    ] as const
    const crestDirectory = resolve(process.cwd(), 'public/assets/clubs/crests')
    for (const [assetFile] of batchA) {
      const source = readFileSync(resolve(crestDirectory, assetFile), 'utf8')
      expect(source).toContain('viewBox="0 0 128 128"')
      expect(source).toMatch(/<(path|circle|polygon|rect)\b/)
      expect(source).not.toMatch(/<(?:text|script|image)\b|font-family|(?:href|xlink:href)="(?:https?:|data:)/i)
    }
    expect(new Set(batchA.map(([, primaryMotif]) => primaryMotif)).size).toBe(batchA.length)
  })
})
