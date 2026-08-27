import { getClubParametersByCompatibleId } from './clubRepository'

export type ClubCrestSourceType =
  | 'ORIGINAL_GAME_ARTWORK'
  | 'OFFICIAL_CLUB_REFERENCE'

export type ClubCrestRightsStatus =
  | 'ORIGINAL_GAME_ASSET'
  | 'TRADEMARK_ASSET_PENDING_CLEARANCE'

export interface ClubCrestManifestRecord {
  canonicalClubId: string
  crestKey: string
  assetPath: string | null
  sourceUrl: string
  sourceType: ClubCrestSourceType
  rightsStatus: ClubCrestRightsStatus
  attribution: string
  lastReviewedAt: string
}

export interface ClubCrestAsset extends ClubCrestManifestRecord {
  assetPath: string
}

const REVIEWED_AT = '2026-08-21'
const OVERSEAS_SAMPLE_REVIEWED_AT = '2026-08-27'

export function clubCrestAssetPath(
  filename: string,
  baseUrl = import.meta.env.BASE_URL,
): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBaseUrl}assets/clubs/crests/${filename}`
}

/**
 * Runtime assets are locally authored artwork. Real-club identity references
 * without original artwork intentionally retain a null asset path and resolve
 * to the existing short-mark UI.
 */
export const CLUB_CREST_MANIFEST: readonly Readonly<ClubCrestManifestRecord>[] =
  Object.freeze(([
    {
      canonicalClubId: 'ita_inter', crestKey: 'inter-original',
      assetPath: clubCrestAssetPath('ita-inter.svg'),
      sourceUrl: 'https://www.inter.it/en/news/2021-03-27-history-inter-crest', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original game artwork; official club history was used only to research the long-standing serpent identity.', lastReviewedAt: OVERSEAS_SAMPLE_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_ac_milan', crestKey: 'ac-milan-original',
      assetPath: clubCrestAssetPath('ita-ac-milan.svg'),
      sourceUrl: 'https://www.acmilan.com/en/history', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original game artwork; official club history was used only to research the devil identity.', lastReviewedAt: OVERSEAS_SAMPLE_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita_juventus', crestKey: 'juventus', assetPath: null,
      sourceUrl: 'https://www.juventus.com/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'Juventus club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_atalanta', crestKey: 'atalanta-original',
      assetPath: clubCrestAssetPath('ita-atalanta.svg'),
      sourceUrl: 'https://en.atalanta.it/news/la-dea-al-centro-cambio-logo-22-05-2026', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original game artwork; official club material was used only to research the goddess identity.', lastReviewedAt: OVERSEAS_SAMPLE_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_lazio', crestKey: 'lazio-original',
      assetPath: clubCrestAssetPath('ita-lazio.svg'),
      sourceUrl: 'https://www.sslazio.it/en/club/storia-del-club/storia', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original game artwork; official club history was used only to research the eagle identity.', lastReviewedAt: OVERSEAS_SAMPLE_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_roma', crestKey: 'roma-original',
      assetPath: clubCrestAssetPath('ita-roma.svg'),
      sourceUrl: 'https://www.asroma.com/en/news/61619/on-this-day-the-lupetto-becomes-an-official-club-logo', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original game artwork; official club history was used only to research the wolf identity.', lastReviewedAt: OVERSEAS_SAMPLE_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_como', crestKey: 'como-original',
      assetPath: clubCrestAssetPath('ita-como.svg'),
      sourceUrl: 'https://www.comune.como.it/vivere-il-comune/luoghi/Piazza-Cavour/', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original game artwork; municipal material was used only to research the lakefront setting.', lastReviewedAt: OVERSEAS_SAMPLE_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita_bologna', crestKey: 'bologna-original',
      assetPath: clubCrestAssetPath('ita-bologna.svg'),
      sourceUrl: 'https://www.bolognawelcome.com/en/places/towers-historic-buildings/the-two-towers-garisenda-and-degli-asinelli-eng', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original game artwork; municipal tourism material was used only to research the Two Towers.', lastReviewedAt: OVERSEAS_SAMPLE_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_venezia', crestKey: 'venezia-original',
      assetPath: clubCrestAssetPath('ita-venezia.svg'),
      sourceUrl: 'https://www.comune.venezia.it/it/node/16768', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original game artwork; municipal material was used only to research gondola culture.', lastReviewedAt: OVERSEAS_SAMPLE_REVIEWED_AT,
    },
    {
      canonicalClubId: 'eng_arsenal', crestKey: 'arsenal', assetPath: null,
      sourceUrl: 'https://www.arsenal.com/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'Arsenal club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'ned_ajax', crestKey: 'ajax', assetPath: null,
      sourceUrl: 'https://english.ajax.nl/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'Ajax club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'bra_flamengo', crestKey: 'flamengo', assetPath: null,
      sourceUrl: 'https://www.flamengo.com.br/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'Flamengo club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'arg_river', crestKey: 'river-plate', assetPath: null,
      sourceUrl: 'https://www.cariverplate.com.ar/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'River Plate club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'cn_shanghai_donggang', crestKey: 'shanghai-donggang-original',
      assetPath: clubCrestAssetPath('cn-shanghai-donggang.svg'),
      sourceUrl: 'local://club-crest-v1/cn-shanghai-donggang', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'cn_beijing_yuhua', crestKey: 'beijing-yuhua-original',
      assetPath: clubCrestAssetPath('cn-beijing-yuhua.svg'),
      sourceUrl: 'local://club-crest-v1/cn-beijing-yuhua', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'chn1_shandong_taiyue', crestKey: 'shandong-taiyue-original',
      assetPath: clubCrestAssetPath('cn-shandong-taiyue.svg'),
      sourceUrl: 'local://club-crest-v1/cn-shandong-taiyue', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'cn_chengdu_jincheng', crestKey: 'chengdu-jincheng-original',
      assetPath: clubCrestAssetPath('cn-chengdu-jincheng.svg'),
      sourceUrl: 'local://club-crest-v1/cn-chengdu-jincheng', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT,
    },
    { canonicalClubId: 'cn_wuhan_jiangcheng', crestKey: 'wuhan-jiangcheng-original', assetPath: clubCrestAssetPath('cn-wuhan-jiangcheng.svg'), sourceUrl: 'local://club-crest-v1/cn-wuhan-jiangcheng', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_tianjin_jinmen', crestKey: 'tianjin-jinmen-original', assetPath: clubCrestAssetPath('cn-tianjin-jinmen.svg'), sourceUrl: 'local://club-crest-v1/cn-tianjin-jinmen', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_zhejiang_qianchao', crestKey: 'zhejiang-qianchao-original', assetPath: clubCrestAssetPath('cn-zhejiang-qianchao.svg'), sourceUrl: 'local://club-crest-v1/cn-zhejiang-qianchao', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_henan_zhongyuan', crestKey: 'henan-zhongyuan-original', assetPath: clubCrestAssetPath('cn-henan-zhongyuan.svg'), sourceUrl: 'local://club-crest-v1/cn-henan-zhongyuan', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_changchun_beichen', crestKey: 'changchun-beichen-original', assetPath: clubCrestAssetPath('cn-changchun-beichen.svg'), sourceUrl: 'local://club-crest-v1/cn-changchun-beichen', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_dalian_bincheng', crestKey: 'dalian-bincheng-original', assetPath: clubCrestAssetPath('cn-dalian-bincheng.svg'), sourceUrl: 'local://club-crest-v1/cn-dalian-bincheng', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_qingdao_haiwan', crestKey: 'qingdao-haiwan-original', assetPath: clubCrestAssetPath('cn-qingdao-haiwan.svg'), sourceUrl: 'local://club-crest-v1/cn-qingdao-haiwan', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_shenzhen_pengcheng', crestKey: 'shenzhen-pengcheng-original', assetPath: clubCrestAssetPath('cn-shenzhen-pengcheng.svg'), sourceUrl: 'local://club-crest-v1/cn-shenzhen-pengcheng', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_chongqing_shancheng', crestKey: 'chongqing-shancheng-original', assetPath: clubCrestAssetPath('cn-chongqing-shancheng.svg'), sourceUrl: 'local://club-crest-v1/cn-chongqing-shancheng', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_xian_changan', crestKey: 'xian-changan-original', assetPath: clubCrestAssetPath('cn-xian-changan.svg'), sourceUrl: 'local://club-crest-v1/cn-xian-changan', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_nanjing_jinling', crestKey: 'nanjing-jinling-original', assetPath: clubCrestAssetPath('cn-nanjing-jinling.svg'), sourceUrl: 'local://club-crest-v1/cn-nanjing-jinling', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn1_guangzhou_nanyue', crestKey: 'guangzhou-nanyue-original', assetPath: clubCrestAssetPath('cn-guangzhou-nanyue.svg'), sourceUrl: 'local://club-crest-v1/cn-guangzhou-nanyue', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'cn_guangxi_liancheng', crestKey: 'guangxi-liancheng-original', assetPath: clubCrestAssetPath('cn-guangxi-liancheng.svg'), sourceUrl: 'local://club-crest-v1/cn-guangxi-liancheng', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'cn_yunnan_shanhe', crestKey: 'yunnan-shanhe-original', assetPath: clubCrestAssetPath('cn-yunnan-shanhe.svg'), sourceUrl: 'local://club-crest-v1/cn-yunnan-shanhe', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_liaoning_tiecheng', crestKey: 'liaoning-tiecheng-original', assetPath: clubCrestAssetPath('cn-liaoning-tiecheng.svg'), sourceUrl: 'local://club-crest-v1/cn-liaoning-tiecheng', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_shijiazhuang_yanzhao', crestKey: 'shijiazhuang-yanzhao-original', assetPath: clubCrestAssetPath('cn-shijiazhuang-yanzhao.svg'), sourceUrl: 'local://club-crest-v1/cn-shijiazhuang-yanzhao', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_suzhou_wumen', crestKey: 'suzhou-wumen-original', assetPath: clubCrestAssetPath('cn-suzhou-wumen.svg'), sourceUrl: 'local://club-crest-v1/cn-suzhou-wumen', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_wuxi_taihu', crestKey: 'wuxi-taihu-original', assetPath: clubCrestAssetPath('cn-wuxi-taihu.svg'), sourceUrl: 'local://club-crest-v1/cn-wuxi-taihu', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_nantong_jianghai', crestKey: 'nantong-jianghai-original', assetPath: clubCrestAssetPath('cn-nantong-jianghai.svg'), sourceUrl: 'local://club-crest-v1/cn-nantong-jianghai', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_hefei_luzhou', crestKey: 'hefei-luzhou-original', assetPath: clubCrestAssetPath('cn-hefei-luzhou.svg'), sourceUrl: 'local://club-crest-v1/cn-hefei-luzhou', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_foshan_lingnan', crestKey: 'foshan-lingnan-original', assetPath: clubCrestAssetPath('cn-foshan-lingnan.svg'), sourceUrl: 'local://club-crest-v1/cn-foshan-lingnan', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_meizhou_jiaying', crestKey: 'meizhou-jiaying-original', assetPath: clubCrestAssetPath('cn-meizhou-jiaying.svg'), sourceUrl: 'local://club-crest-v1/cn-meizhou-jiaying', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_xiamen_ludao', crestKey: 'xiamen-ludao-original', assetPath: clubCrestAssetPath('cn-xiamen-ludao.svg'), sourceUrl: 'local://club-crest-v1/cn-xiamen-ludao', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_ningbo_yongjiang', crestKey: 'ningbo-yongjiang-original', assetPath: clubCrestAssetPath('cn-ningbo-yongjiang.svg'), sourceUrl: 'local://club-crest-v1/cn-ningbo-yongjiang', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_shaanxi_qinling', crestKey: 'shaanxi-qinling-original', assetPath: clubCrestAssetPath('cn-shaanxi-qinling.svg'), sourceUrl: 'local://club-crest-v1/cn-shaanxi-qinling', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_guizhou_qianfeng', crestKey: 'guizhou-qianfeng-original', assetPath: clubCrestAssetPath('cn-guizhou-qianfeng.svg'), sourceUrl: 'local://club-crest-v1/cn-guizhou-qianfeng', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_xinjiang_kunlun', crestKey: 'xinjiang-kunlun-original', assetPath: clubCrestAssetPath('cn-xinjiang-kunlun.svg'), sourceUrl: 'local://club-crest-v1/cn-xinjiang-kunlun', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
    { canonicalClubId: 'chn2_hohhot_qingcheng', crestKey: 'hohhot-qingcheng-original', assetPath: clubCrestAssetPath('cn-hohhot-qingcheng.svg'), sourceUrl: 'local://club-crest-v1/cn-hohhot-qingcheng', sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET', attribution: 'Original fictional club crest created for this game.', lastReviewedAt: REVIEWED_AT },
  ] satisfies readonly ClubCrestManifestRecord[]).map((record) => Object.freeze(record)))

const crestByCanonicalClubId: ReadonlyMap<string, Readonly<ClubCrestManifestRecord>> =
  new Map(CLUB_CREST_MANIFEST.map((record) => [record.canonicalClubId, record]))

function isRuntimeAsset(
  record: Readonly<ClubCrestManifestRecord>,
): record is Readonly<ClubCrestAsset> {
  return record.assetPath !== null && record.rightsStatus === 'ORIGINAL_GAME_ASSET'
}

/** Resolves canonical and workbook IDs, returning only usable local assets. */
export function getClubCrestByCompatibleId(id: string): Readonly<ClubCrestAsset> | null {
  const canonicalClubId = getClubParametersByCompatibleId(id)?.id
  if (!canonicalClubId) return null
  const record = crestByCanonicalClubId.get(canonicalClubId)
  return record && isRuntimeAsset(record) ? record : null
}

/** Exposes audit metadata without making unavailable assets renderable. */
export function getClubCrestManifestRecordByCompatibleId(
  id: string,
): Readonly<ClubCrestManifestRecord> | null {
  const canonicalClubId = getClubParametersByCompatibleId(id)?.id
  return canonicalClubId ? crestByCanonicalClubId.get(canonicalClubId) ?? null : null
}
