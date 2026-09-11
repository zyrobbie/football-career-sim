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
const DESIGNER_DELIVERY_REVIEWED_AT = '2026-09-11'

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
      canonicalClubId: 'fra1_troyes', crestKey: 'fra1-troyes-original',
      assetPath: clubCrestAssetPath('fra1-troyes.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-troyes.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_toulouse', crestKey: 'fra1-toulouse-original',
      assetPath: clubCrestAssetPath('fra1-toulouse.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-toulouse.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_rennes', crestKey: 'fra1-rennes-original',
      assetPath: clubCrestAssetPath('fra1-rennes.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-rennes.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_paris_fc', crestKey: 'fra1-paris-fc-original',
      assetPath: clubCrestAssetPath('fra1-paris-fc.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-paris-fc.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_olympique_lyonnais', crestKey: 'fra1-olympique-lyonnais-original',
      assetPath: clubCrestAssetPath('fra1-olympique-lyonnais.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-olympique-lyonnais.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_nice', crestKey: 'fra1-nice-original',
      assetPath: clubCrestAssetPath('fra1-nice.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-nice.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_marseille', crestKey: 'fra1-marseille-original',
      assetPath: clubCrestAssetPath('fra1-marseille.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-marseille.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_lorient', crestKey: 'fra1-lorient-original',
      assetPath: clubCrestAssetPath('fra1-lorient.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-lorient.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_lens', crestKey: 'fra1-lens-original',
      assetPath: clubCrestAssetPath('fra1-lens.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-lens.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_le_mans', crestKey: 'fra1-le-mans-original',
      assetPath: clubCrestAssetPath('fra1-le-mans.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-le-mans.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_le_havre', crestKey: 'fra1-le-havre-original',
      assetPath: clubCrestAssetPath('fra1-le-havre.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-le-havre.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_brest', crestKey: 'fra1-brest-original',
      assetPath: clubCrestAssetPath('fra1-brest.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-brest.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_auxerre', crestKey: 'fra1-auxerre-original',
      assetPath: clubCrestAssetPath('fra1-auxerre.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-auxerre.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra1_angers', crestKey: 'fra1-angers-original',
      assetPath: clubCrestAssetPath('fra1-angers.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra1-angers.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra_strasbourg', crestKey: 'fra-strasbourg-original',
      assetPath: clubCrestAssetPath('fra-strasbourg.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra-strasbourg.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra_psg', crestKey: 'fra-psg-original',
      assetPath: clubCrestAssetPath('fra-psg.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra-psg.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra_monaco', crestKey: 'fra-monaco-original',
      assetPath: clubCrestAssetPath('fra-monaco.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra-monaco.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'fra_lille', crestKey: 'fra-lille-original',
      assetPath: clubCrestAssetPath('fra-lille.svg'),
      sourceUrl: 'local://CLR4-20260912/FRA/fra-lille.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_werder_bremen', crestKey: 'ger1-werder-bremen-original',
      assetPath: clubCrestAssetPath('ger1-werder-bremen.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-werder-bremen.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_union_berlin', crestKey: 'ger1-union-berlin-original',
      assetPath: clubCrestAssetPath('ger1-union-berlin.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-union-berlin.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_stuttgart', crestKey: 'ger1-stuttgart-original',
      assetPath: clubCrestAssetPath('ger1-stuttgart.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-stuttgart.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_schalke_04', crestKey: 'ger1-schalke-04-original',
      assetPath: clubCrestAssetPath('ger1-schalke-04.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-schalke-04.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_rb_leipzig', crestKey: 'ger1-rb-leipzig-original',
      assetPath: clubCrestAssetPath('ger1-rb-leipzig.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-rb-leipzig.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_paderborn', crestKey: 'ger1-paderborn-original',
      assetPath: clubCrestAssetPath('ger1-paderborn.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-paderborn.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_koln', crestKey: 'ger1-koln-original',
      assetPath: clubCrestAssetPath('ger1-koln.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-koln.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_hoffenheim', crestKey: 'ger1-hoffenheim-original',
      assetPath: clubCrestAssetPath('ger1-hoffenheim.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-hoffenheim.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_hamburg', crestKey: 'ger1-hamburg-original',
      assetPath: clubCrestAssetPath('ger1-hamburg.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-hamburg.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_freiburg', crestKey: 'ger1-freiburg-original',
      assetPath: clubCrestAssetPath('ger1-freiburg.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-freiburg.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_elversberg', crestKey: 'ger1-elversberg-original',
      assetPath: clubCrestAssetPath('ger1-elversberg.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-elversberg.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_borussia_monchengladbach', crestKey: 'ger1-borussia-monchengladbach-original',
      assetPath: clubCrestAssetPath('ger1-borussia-monchengladbach.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-borussia-monchengladbach.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_bayer_leverkusen', crestKey: 'ger1-bayer-leverkusen-original',
      assetPath: clubCrestAssetPath('ger1-bayer-leverkusen.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-bayer-leverkusen.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger1_augsburg', crestKey: 'ger1-augsburg-original',
      assetPath: clubCrestAssetPath('ger1-augsburg.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger1-augsburg.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger_mainz', crestKey: 'ger-mainz-original',
      assetPath: clubCrestAssetPath('ger-mainz.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger-mainz.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger_frankfurt', crestKey: 'ger-frankfurt-original',
      assetPath: clubCrestAssetPath('ger-frankfurt.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger-frankfurt.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger_dortmund', crestKey: 'ger-dortmund-original',
      assetPath: clubCrestAssetPath('ger-dortmund.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger-dortmund.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ger_bayern', crestKey: 'ger-bayern-original',
      assetPath: clubCrestAssetPath('ger-bayern.svg'),
      sourceUrl: 'local://CLR4-20260912/GER/ger-bayern.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_villarreal', crestKey: 'esp1-villarreal-original',
      assetPath: clubCrestAssetPath('esp1-villarreal.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-villarreal.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_valencia', crestKey: 'esp1-valencia-original',
      assetPath: clubCrestAssetPath('esp1-valencia.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-valencia.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_sevilla', crestKey: 'esp1-sevilla-original',
      assetPath: clubCrestAssetPath('esp1-sevilla.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-sevilla.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_real_betis', crestKey: 'esp1-real-betis-original',
      assetPath: clubCrestAssetPath('esp1-real-betis.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-real-betis.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_rayo_vallecano', crestKey: 'esp1-rayo-vallecano-original',
      assetPath: clubCrestAssetPath('esp1-rayo-vallecano.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-rayo-vallecano.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_racing_de_santander', crestKey: 'esp1-racing-de-santander-original',
      assetPath: clubCrestAssetPath('esp1-racing-de-santander.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-racing-de-santander.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_osasuna', crestKey: 'esp1-osasuna-original',
      assetPath: clubCrestAssetPath('esp1-osasuna.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-osasuna.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_malaga', crestKey: 'esp1-malaga-original',
      assetPath: clubCrestAssetPath('esp1-malaga.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-malaga.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_levante', crestKey: 'esp1-levante-original',
      assetPath: clubCrestAssetPath('esp1-levante.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-levante.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_getafe', crestKey: 'esp1-getafe-original',
      assetPath: clubCrestAssetPath('esp1-getafe.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-getafe.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_espanyol', crestKey: 'esp1-espanyol-original',
      assetPath: clubCrestAssetPath('esp1-espanyol.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-espanyol.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_elche', crestKey: 'esp1-elche-original',
      assetPath: clubCrestAssetPath('esp1-elche.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-elche.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_deportivo_la_coruna', crestKey: 'esp1-deportivo-la-coruna-original',
      assetPath: clubCrestAssetPath('esp1-deportivo-la-coruna.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-deportivo-la-coruna.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_atletico_de_madrid', crestKey: 'esp1-atletico-de-madrid-original',
      assetPath: clubCrestAssetPath('esp1-atletico-de-madrid.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-atletico-de-madrid.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_athletic_club', crestKey: 'esp1-athletic-club-original',
      assetPath: clubCrestAssetPath('esp1-athletic-club.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-athletic-club (1).svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp1_alaves', crestKey: 'esp1-alaves-original',
      assetPath: clubCrestAssetPath('esp1-alaves.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp1-alaves.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp_real_sociedad', crestKey: 'esp-real-sociedad-original',
      assetPath: clubCrestAssetPath('esp-real-sociedad.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp-real-sociedad.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp_real_madrid', crestKey: 'esp-real-madrid-original',
      assetPath: clubCrestAssetPath('esp-real-madrid.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp-real-madrid.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp_celta', crestKey: 'esp-celta-original',
      assetPath: clubCrestAssetPath('esp-celta.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp-celta.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'esp_barcelona', crestKey: 'esp-barcelona-original',
      assetPath: clubCrestAssetPath('esp-barcelona.svg'),
      sourceUrl: 'local://CLR4-20260912/ESP/esp-barcelona.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_tottenham_hotspur', crestKey: 'eng1-tottenham-hotspur-original',
      assetPath: clubCrestAssetPath('eng1-tottenham-hotspur.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-tottenham-hotspur.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_sunderland', crestKey: 'eng1-sunderland-original',
      assetPath: clubCrestAssetPath('eng1-sunderland.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-sunderland.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_nottingham_forest', crestKey: 'eng1-nottingham-forest-original',
      assetPath: clubCrestAssetPath('eng1-nottingham-forest.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-nottingham-forest.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_newcastle_united', crestKey: 'eng1-newcastle-united-original',
      assetPath: clubCrestAssetPath('eng1-newcastle-united.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-newcastle-united.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_manchester_united', crestKey: 'eng1-manchester-united-original',
      assetPath: clubCrestAssetPath('eng1-manchester-united.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-manchester-united.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_manchester_city', crestKey: 'eng1-manchester-city-original',
      assetPath: clubCrestAssetPath('eng1-manchester-city.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-manchester-city.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_leeds_united', crestKey: 'eng1-leeds-united-original',
      assetPath: clubCrestAssetPath('eng1-leeds-united.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-leeds-united.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_ipswich_town', crestKey: 'eng1-ipswich-town-original',
      assetPath: clubCrestAssetPath('eng1-ipswich-town.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-ipswich-town.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_hull_city', crestKey: 'eng1-hull-city-original',
      assetPath: clubCrestAssetPath('eng1-hull-city.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-hull-city.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_everton', crestKey: 'eng1-everton-original',
      assetPath: clubCrestAssetPath('eng1-everton.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-everton.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_crystal_palace', crestKey: 'eng1-crystal-palace-original',
      assetPath: clubCrestAssetPath('eng1-crystal-palace.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-crystal-palace.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_coventry_city', crestKey: 'eng1-coventry-city-original',
      assetPath: clubCrestAssetPath('eng1-coventry-city.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-coventry-city.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_chelsea', crestKey: 'eng1-chelsea-original',
      assetPath: clubCrestAssetPath('eng1-chelsea.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-chelsea.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_brentford', crestKey: 'eng1-brentford-original',
      assetPath: clubCrestAssetPath('eng1-brentford.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-brentford.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_aston_villa', crestKey: 'eng1-aston-villa-original',
      assetPath: clubCrestAssetPath('eng1-aston-villa.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-aston-villa.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng1_afc_bournemouth', crestKey: 'eng1-afc-bournemouth-original',
      assetPath: clubCrestAssetPath('eng1-afc-bournemouth.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng1-afc-bournemouth.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng_liverpool', crestKey: 'eng-liverpool-original',
      assetPath: clubCrestAssetPath('eng-liverpool.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng-liverpool.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng_fulham', crestKey: 'eng-fulham-original',
      assetPath: clubCrestAssetPath('eng-fulham.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng-fulham.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng_brighton', crestKey: 'eng-brighton-original',
      assetPath: clubCrestAssetPath('eng-brighton.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng-brighton.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'eng_arsenal', crestKey: 'eng-arsenal-original',
      assetPath: clubCrestAssetPath('eng-arsenal.svg'),
      sourceUrl: 'local://CLR4-20260912/ENG/eng-arsenal.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original designer SVG supplied by the user; source frozen in CLR4-20260912.', lastReviewedAt: '2026-09-12',
    },
    {
      canonicalClubId: 'ita_inter', crestKey: 'inter-original',
      assetPath: clubCrestAssetPath('ita-inter.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-inter.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_ac_milan', crestKey: 'ac-milan-original',
      assetPath: clubCrestAssetPath('ita-ac-milan.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-ac-milan.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita_juventus', crestKey: 'juventus-original',
      assetPath: clubCrestAssetPath('ita-juventus.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-juventus.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_lecce', crestKey: 'lecce-original',
      assetPath: clubCrestAssetPath('ita1-lecce.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-lecce.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_atalanta', crestKey: 'atalanta-original',
      assetPath: clubCrestAssetPath('ita-atalanta.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-atalanta.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_lazio', crestKey: 'lazio-original',
      assetPath: clubCrestAssetPath('ita-lazio.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-lazio.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_roma', crestKey: 'roma-original',
      assetPath: clubCrestAssetPath('ita-roma.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-roma.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_como', crestKey: 'como-original',
      assetPath: clubCrestAssetPath('ita-como.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-como.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita_bologna', crestKey: 'bologna-original',
      assetPath: clubCrestAssetPath('ita-bologna.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-bologna.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_venezia', crestKey: 'venezia-original',
      assetPath: clubCrestAssetPath('ita-venezia.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-venezia.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita_torino', crestKey: 'ita-torino-original',
      assetPath: clubCrestAssetPath('ita-torino.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita-torino.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_cagliari', crestKey: 'ita1-cagliari-original',
      assetPath: clubCrestAssetPath('ita1-cagliari.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-cagliari.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_fiorentina', crestKey: 'ita1-fiorentina-original',
      assetPath: clubCrestAssetPath('ita1-fiorentina.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-fiorentina.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_frosinone', crestKey: 'ita1-frosinone-original',
      assetPath: clubCrestAssetPath('ita1-frosinone.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-frosinone.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_genoa', crestKey: 'ita1-genoa-original',
      assetPath: clubCrestAssetPath('ita1-genoa.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-genoa.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_monza', crestKey: 'ita1-monza-original',
      assetPath: clubCrestAssetPath('ita1-monza.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-monza.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_napoli', crestKey: 'ita1-napoli-original',
      assetPath: clubCrestAssetPath('ita1-napoli.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-napoli.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_parma', crestKey: 'ita1-parma-original',
      assetPath: clubCrestAssetPath('ita1-parma.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-parma.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_sassuolo', crestKey: 'ita1-sassuolo-original',
      assetPath: clubCrestAssetPath('ita1-sassuolo.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-sassuolo.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
    },
    {
      canonicalClubId: 'ita1_udinese', crestKey: 'ita1-udinese-original',
      assetPath: clubCrestAssetPath('ita1-udinese.svg'),
      sourceUrl: 'local://CLR-20260911/ITA/ita1-udinese.svg', sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
      attribution: 'Original SVG supplied by the user from the designer delivery; frozen source recorded in CLR-20260911/A.', lastReviewedAt: DESIGNER_DELIVERY_REVIEWED_AT,
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
