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

export function clubCrestAssetPath(
  filename: string,
  baseUrl = import.meta.env.BASE_URL,
): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBaseUrl}assets/clubs/crests/${filename}`
}

/**
 * V1 only contains locally authored artwork. Real-club rows remain auditable
 * references until a distribution licence is cleared; they intentionally have
 * no runtime asset path and therefore resolve to the existing short-mark UI.
 */
export const CLUB_CREST_MANIFEST: readonly Readonly<ClubCrestManifestRecord>[] =
  Object.freeze(([
    {
      canonicalClubId: 'ita_inter', crestKey: 'inter', assetPath: null,
      sourceUrl: 'https://www.inter.it/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'Inter club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_ac_milan', crestKey: 'ac-milan', assetPath: null,
      sourceUrl: 'https://www.acmilan.com/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'AC Milan club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita_juventus', crestKey: 'juventus', assetPath: null,
      sourceUrl: 'https://www.juventus.com/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'Juventus club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_atalanta', crestKey: 'atalanta', assetPath: null,
      sourceUrl: 'https://www.atalanta.it/', sourceType: 'OFFICIAL_CLUB_REFERENCE',
      rightsStatus: 'TRADEMARK_ASSET_PENDING_CLEARANCE',
      attribution: 'Atalanta club identity reference; no crest file is embedded.', lastReviewedAt: REVIEWED_AT,
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
