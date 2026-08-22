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

  it('has twelve unique, canonical, audit-complete sample records and legal local paths', () => {
    expect(CLUB_CREST_MANIFEST).toHaveLength(12)
    expect(new Set(CLUB_CREST_MANIFEST.map((crest) => crest.canonicalClubId)).size).toBe(12)
    expect(new Set(CLUB_CREST_MANIFEST.map((crest) => crest.crestKey)).size).toBe(12)

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
})
