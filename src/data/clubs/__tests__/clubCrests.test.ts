import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLUB_PARAMETERS_V1 } from '../clubParametersV1'
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

  it('uses delivered Ajax artwork while retaining undelivered and unknown fallbacks', () => {
    const canonical = getClubCrestManifestRecordByCompatibleId('ned_ajax')
    const workbook = getClubCrestManifestRecordByCompatibleId('ned1_ajax')

    expect(workbook).toBe(canonical)
    expect(canonical).toMatchObject({
      canonicalClubId: 'ned_ajax',
      assetPath: '/assets/clubs/crests/ned-ajax.svg',
      sourceType: 'ORIGINAL_GAME_ARTWORK',
      rightsStatus: 'ORIGINAL_GAME_ASSET',
    })
    expect(getClubCrestByCompatibleId('ned_ajax')).toBe(canonical)
    expect(getClubCrestByCompatibleId('ned1_utrecht')).toBeNull()
    expect(getClubCrestByCompatibleId('missing-club')).toBeNull()
  })

  it('has 178 unique, canonical, audit-complete records and 178 usable local crests', () => {
    expect(CLUB_CREST_MANIFEST).toHaveLength(178)
    expect(new Set(CLUB_CREST_MANIFEST.map((crest) => crest.canonicalClubId)).size).toBe(178)
    expect(new Set(CLUB_CREST_MANIFEST.map((crest) => crest.crestKey)).size).toBe(178)
    expect(CLUB_CREST_MANIFEST.filter((crest) => crest.assetPath !== null)).toHaveLength(178)

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

  it('resolves all twenty delivered Serie A crests by canonical and workbook-compatible IDs', () => {
    const samples = [
      ['ita1_ac_milan', 'ita1_ac_milan', 'ita-ac-milan.svg'],
      ['ita1_atalanta', 'ita1_atalanta', 'ita-atalanta.svg'],
      ['ita_bologna', 'ita1_bologna', 'ita-bologna.svg'],
      ['ita1_como', 'ita1_como', 'ita-como.svg'],
      ['ita_inter', 'ita1_inter', 'ita-inter.svg'],
      ['ita_juventus', 'ita1_juventus', 'ita-juventus.svg'],
      ['ita1_lazio', 'ita1_lazio', 'ita-lazio.svg'],
      ['ita1_roma', 'ita1_roma', 'ita-roma.svg'],
      ['ita_torino', 'ita1_torino', 'ita-torino.svg'],
      ['ita1_venezia', 'ita1_venezia', 'ita-venezia.svg'],
      ['ita1_cagliari', 'ita1_cagliari', 'ita1-cagliari.svg'],
      ['ita1_fiorentina', 'ita1_fiorentina', 'ita1-fiorentina.svg'],
      ['ita1_frosinone', 'ita1_frosinone', 'ita1-frosinone.svg'],
      ['ita1_genoa', 'ita1_genoa', 'ita1-genoa.svg'],
      ['ita1_lecce', 'ita1_lecce', 'ita1-lecce.svg'],
      ['ita1_monza', 'ita1_monza', 'ita1-monza.svg'],
      ['ita1_napoli', 'ita1_napoli', 'ita1-napoli.svg'],
      ['ita1_parma', 'ita1_parma', 'ita1-parma.svg'],
      ['ita1_sassuolo', 'ita1_sassuolo', 'ita1-sassuolo.svg'],
      ['ita1_udinese', 'ita1_udinese', 'ita1-udinese.svg'],
    ] as const

    for (const [canonicalId, workbookId, filename] of samples) {
      const canonical = getClubCrestByCompatibleId(canonicalId)
      expect(canonical).toMatchObject({
        canonicalClubId: canonicalId,
        assetPath: `/assets/clubs/crests/${filename}`,
        sourceType: 'ORIGINAL_GAME_ARTWORK',
        rightsStatus: 'ORIGINAL_GAME_ASSET',
      })
      expect(getClubCrestByCompatibleId(workbookId)).toBe(canonical)
      const source = readFileSync(
        resolve(process.cwd(), 'public/assets/clubs/crests', filename),
        'utf8',
      )
      expect(source).toContain('viewBox="0 0 128 128"')
      expect(source).not.toMatch(
        /<(?:text|script|image)\b|font-family|(?:href|xlink:href)="(?:https?:|data:)/i,
      )
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

describe('CLR4 delivered league mappings', () => {
  it('resolves the exact 20 delivered ENG clubs, compatible IDs and local assets', () => {
    const samples = [
      ['eng_arsenal', 'eng1_arsenal', 'eng-arsenal.svg'],
      ['eng_brighton', 'eng1_brighton_and_hove_albion', 'eng-brighton.svg'],
      ['eng_fulham', 'eng1_fulham', 'eng-fulham.svg'],
      ['eng_liverpool', 'eng1_liverpool', 'eng-liverpool.svg'],
      ['eng1_afc_bournemouth', 'eng1_afc_bournemouth', 'eng1-afc-bournemouth.svg'],
      ['eng1_aston_villa', 'eng1_aston_villa', 'eng1-aston-villa.svg'],
      ['eng1_brentford', 'eng1_brentford', 'eng1-brentford.svg'],
      ['eng1_chelsea', 'eng1_chelsea', 'eng1-chelsea.svg'],
      ['eng1_coventry_city', 'eng1_coventry_city', 'eng1-coventry-city.svg'],
      ['eng1_crystal_palace', 'eng1_crystal_palace', 'eng1-crystal-palace.svg'],
      ['eng1_everton', 'eng1_everton', 'eng1-everton.svg'],
      ['eng1_hull_city', 'eng1_hull_city', 'eng1-hull-city.svg'],
      ['eng1_ipswich_town', 'eng1_ipswich_town', 'eng1-ipswich-town.svg'],
      ['eng1_leeds_united', 'eng1_leeds_united', 'eng1-leeds-united.svg'],
      ['eng1_manchester_city', 'eng1_manchester_city', 'eng1-manchester-city.svg'],
      ['eng1_manchester_united', 'eng1_manchester_united', 'eng1-manchester-united.svg'],
      ['eng1_newcastle_united', 'eng1_newcastle_united', 'eng1-newcastle-united.svg'],
      ['eng1_nottingham_forest', 'eng1_nottingham_forest', 'eng1-nottingham-forest.svg'],
      ['eng1_sunderland', 'eng1_sunderland', 'eng1-sunderland.svg'],
      ['eng1_tottenham_hotspur', 'eng1_tottenham_hotspur', 'eng1-tottenham-hotspur.svg']
] as const
    const delivered = CLUB_CREST_MANIFEST.filter(r => r.sourceUrl.startsWith('local://CLR4-20260912/ENG/'))
    expect(delivered.map(r => r.canonicalClubId).sort()).toEqual(samples.map(r => r[0]).sort())
    for (const [canonicalId, workbookId, filename] of samples) {
      const crest = getClubCrestByCompatibleId(canonicalId)
      expect(crest).toMatchObject({ canonicalClubId: canonicalId, assetPath: `/assets/clubs/crests/${filename}`, sourceType: 'ORIGINAL_GAME_ARTWORK' })
      expect(getClubCrestByCompatibleId(workbookId)).toBe(crest)
      const svg = readFileSync(resolve(process.cwd(), 'public/assets/clubs/crests', filename), 'utf8')
      expect(svg).toContain('viewBox="0 0 128 128"')
      expect(svg).not.toMatch(/<(?:text|script|image)\b|font-family|(?:href|xlink:href)="(?:https?:|data:)/i)
    }
  })
  it('resolves the exact 20 delivered ESP clubs, compatible IDs and local assets', () => {
    const samples = [
      ['esp_barcelona', 'esp1_fc_barcelona', 'esp-barcelona.svg'],
      ['esp_celta', 'esp1_celta_de_vigo', 'esp-celta.svg'],
      ['esp_real_madrid', 'esp1_real_madrid', 'esp-real-madrid.svg'],
      ['esp_real_sociedad', 'esp1_real_sociedad', 'esp-real-sociedad.svg'],
      ['esp1_alaves', 'esp1_alaves', 'esp1-alaves.svg'],
      ['esp1_athletic_club', 'esp1_athletic_club', 'esp1-athletic-club.svg'],
      ['esp1_atletico_de_madrid', 'esp1_atletico_de_madrid', 'esp1-atletico-de-madrid.svg'],
      ['esp1_deportivo_la_coruna', 'esp1_deportivo_la_coruna', 'esp1-deportivo-la-coruna.svg'],
      ['esp1_elche', 'esp1_elche', 'esp1-elche.svg'],
      ['esp1_espanyol', 'esp1_espanyol', 'esp1-espanyol.svg'],
      ['esp1_getafe', 'esp1_getafe', 'esp1-getafe.svg'],
      ['esp1_levante', 'esp1_levante', 'esp1-levante.svg'],
      ['esp1_malaga', 'esp1_malaga', 'esp1-malaga.svg'],
      ['esp1_osasuna', 'esp1_osasuna', 'esp1-osasuna.svg'],
      ['esp1_racing_de_santander', 'esp1_racing_de_santander', 'esp1-racing-de-santander.svg'],
      ['esp1_rayo_vallecano', 'esp1_rayo_vallecano', 'esp1-rayo-vallecano.svg'],
      ['esp1_real_betis', 'esp1_real_betis', 'esp1-real-betis.svg'],
      ['esp1_sevilla', 'esp1_sevilla', 'esp1-sevilla.svg'],
      ['esp1_valencia', 'esp1_valencia', 'esp1-valencia.svg'],
      ['esp1_villarreal', 'esp1_villarreal', 'esp1-villarreal.svg']
] as const
    const delivered = CLUB_CREST_MANIFEST.filter(r => r.sourceUrl.startsWith('local://CLR4-20260912/ESP/'))
    expect(delivered.map(r => r.canonicalClubId).sort()).toEqual(samples.map(r => r[0]).sort())
    for (const [canonicalId, workbookId, filename] of samples) {
      const crest = getClubCrestByCompatibleId(canonicalId)
      expect(crest).toMatchObject({ canonicalClubId: canonicalId, assetPath: `/assets/clubs/crests/${filename}`, sourceType: 'ORIGINAL_GAME_ARTWORK' })
      expect(getClubCrestByCompatibleId(workbookId)).toBe(crest)
      const svg = readFileSync(resolve(process.cwd(), 'public/assets/clubs/crests', filename), 'utf8')
      expect(svg).toContain('viewBox="0 0 128 128"')
      expect(svg).not.toMatch(/<(?:text|script|image)\b|font-family|(?:href|xlink:href)="(?:https?:|data:)/i)
    }
  })
  it('resolves the exact 18 delivered GER clubs, compatible IDs and local assets', () => {
    const samples = [
      ['ger_bayern', 'ger1_bayern_munchen', 'ger-bayern.svg'],
      ['ger_dortmund', 'ger1_borussia_dortmund', 'ger-dortmund.svg'],
      ['ger_frankfurt', 'ger1_eintracht_frankfurt', 'ger-frankfurt.svg'],
      ['ger_mainz', 'ger1_mainz_05', 'ger-mainz.svg'],
      ['ger1_augsburg', 'ger1_augsburg', 'ger1-augsburg.svg'],
      ['ger1_bayer_leverkusen', 'ger1_bayer_leverkusen', 'ger1-bayer-leverkusen.svg'],
      ['ger1_borussia_monchengladbach', 'ger1_borussia_monchengladbach', 'ger1-borussia-monchengladbach.svg'],
      ['ger1_elversberg', 'ger1_elversberg', 'ger1-elversberg.svg'],
      ['ger1_freiburg', 'ger1_freiburg', 'ger1-freiburg.svg'],
      ['ger1_hamburg', 'ger1_hamburg', 'ger1-hamburg.svg'],
      ['ger1_hoffenheim', 'ger1_hoffenheim', 'ger1-hoffenheim.svg'],
      ['ger1_koln', 'ger1_koln', 'ger1-koln.svg'],
      ['ger1_paderborn', 'ger1_paderborn', 'ger1-paderborn.svg'],
      ['ger1_rb_leipzig', 'ger1_rb_leipzig', 'ger1-rb-leipzig.svg'],
      ['ger1_schalke_04', 'ger1_schalke_04', 'ger1-schalke-04.svg'],
      ['ger1_stuttgart', 'ger1_stuttgart', 'ger1-stuttgart.svg'],
      ['ger1_union_berlin', 'ger1_union_berlin', 'ger1-union-berlin.svg'],
      ['ger1_werder_bremen', 'ger1_werder_bremen', 'ger1-werder-bremen.svg']
] as const
    const delivered = CLUB_CREST_MANIFEST.filter(r => r.sourceUrl.startsWith('local://CLR4-20260912/GER/'))
    expect(delivered.map(r => r.canonicalClubId).sort()).toEqual(samples.map(r => r[0]).sort())
    for (const [canonicalId, workbookId, filename] of samples) {
      const crest = getClubCrestByCompatibleId(canonicalId)
      expect(crest).toMatchObject({ canonicalClubId: canonicalId, assetPath: `/assets/clubs/crests/${filename}`, sourceType: 'ORIGINAL_GAME_ARTWORK' })
      expect(getClubCrestByCompatibleId(workbookId)).toBe(crest)
      const svg = readFileSync(resolve(process.cwd(), 'public/assets/clubs/crests', filename), 'utf8')
      expect(svg).toContain('viewBox="0 0 128 128"')
      expect(svg).not.toMatch(/<(?:text|script|image)\b|font-family|(?:href|xlink:href)="(?:https?:|data:)/i)
    }
  })
  it('resolves the exact 18 delivered FRA clubs, compatible IDs and local assets', () => {
    const samples = [
      ['fra_lille', 'fra1_lille', 'fra-lille.svg'],
      ['fra_monaco', 'fra1_as_monaco', 'fra-monaco.svg'],
      ['fra_psg', 'fra1_paris_saint_germain', 'fra-psg.svg'],
      ['fra_strasbourg', 'fra1_strasbourg', 'fra-strasbourg.svg'],
      ['fra1_angers', 'fra1_angers', 'fra1-angers.svg'],
      ['fra1_auxerre', 'fra1_auxerre', 'fra1-auxerre.svg'],
      ['fra1_brest', 'fra1_brest', 'fra1-brest.svg'],
      ['fra1_le_havre', 'fra1_le_havre', 'fra1-le-havre.svg'],
      ['fra1_le_mans', 'fra1_le_mans', 'fra1-le-mans.svg'],
      ['fra1_lens', 'fra1_lens', 'fra1-lens.svg'],
      ['fra1_lorient', 'fra1_lorient', 'fra1-lorient.svg'],
      ['fra1_marseille', 'fra1_marseille', 'fra1-marseille.svg'],
      ['fra1_nice', 'fra1_nice', 'fra1-nice.svg'],
      ['fra1_olympique_lyonnais', 'fra1_olympique_lyonnais', 'fra1-olympique-lyonnais.svg'],
      ['fra1_paris_fc', 'fra1_paris_fc', 'fra1-paris-fc.svg'],
      ['fra1_rennes', 'fra1_rennes', 'fra1-rennes.svg'],
      ['fra1_toulouse', 'fra1_toulouse', 'fra1-toulouse.svg'],
      ['fra1_troyes', 'fra1_troyes', 'fra1-troyes.svg']
] as const
    const delivered = CLUB_CREST_MANIFEST.filter(r => r.sourceUrl.startsWith('local://CLR4-20260912/FRA/'))
    expect(delivered.map(r => r.canonicalClubId).sort()).toEqual(samples.map(r => r[0]).sort())
    for (const [canonicalId, workbookId, filename] of samples) {
      const crest = getClubCrestByCompatibleId(canonicalId)
      expect(crest).toMatchObject({ canonicalClubId: canonicalId, assetPath: `/assets/clubs/crests/${filename}`, sourceType: 'ORIGINAL_GAME_ARTWORK' })
      expect(getClubCrestByCompatibleId(workbookId)).toBe(crest)
      const svg = readFileSync(resolve(process.cwd(), 'public/assets/clubs/crests', filename), 'utf8')
      expect(svg).toContain('viewBox="0 0 128 128"')
      expect(svg).not.toMatch(/<(?:text|script|image)\b|font-family|(?:href|xlink:href)="(?:https?:|data:)/i)
    }
  })
})


// Match game-catalog membership, not the current real-world league roster.
describe('CLR4 complete game-catalog coverage', () => {
  it('covers exactly all four first divisions without adding second-division assets', () => {
    for (const [league, count] of [['ENG', 20], ['ESP', 20], ['GER', 18], ['FRA', 18]] as const) {
      const expected = CLUB_PARAMETERS_V1.filter(club => club.workbookId.startsWith(`${league.toLowerCase()}1_`)).map(club => club.id).sort()
      expect(expected).toHaveLength(count)
      const actual = CLUB_CREST_MANIFEST.filter(crest => crest.sourceUrl.startsWith(`local://CLR4-20260912/${league}/`)).map(crest => crest.canonicalClubId).sort()
      expect(actual).toEqual(expected)
    }
  })
})

 describe('CLR7 exact supplied strong-club coverage', () => {
  it('resolves all fifty exact delivered canonical/workbook pairs and files', () => {
    const samples = [
      [
            "ned_ajax",
            "ned1_ajax",
            "ned-ajax.svg"
      ],
      [
            "ned1_feyenoord",
            "ned1_feyenoord",
            "ned-feyenoord.svg"
      ],
      [
            "ned1_az",
            "ned1_az",
            "ned1-az-alkmaar.svg"
      ],
      [
            "ned1_twente",
            "ned1_twente",
            "ned1-fc-twente.svg"
      ],
      [
            "ned_psv",
            "ned1_psv",
            "ned1-psv-eindhoven.svg"
      ],
      [
            "por_benfica",
            "por1_benfica",
            "por-benfica.svg"
      ],
      [
            "por_porto",
            "por1_fc_porto",
            "por-porto.svg"
      ],
      [
            "por1_braga",
            "por1_braga",
            "por1-braga.svg"
      ],
      [
            "por1_sporting_cp",
            "por1_sporting_cp",
            "por1-sporting-cp.svg"
      ],
      [
            "por1_vitoria_sc",
            "por1_vitoria_sc",
            "por1-vitoria-guimaraes.svg"
      ],
      [
            "bel_anderlecht",
            "bel1_anderlecht",
            "bel-anderlecht.svg"
      ],
      [
            "bel_brugge",
            "bel1_club_brugge",
            "bel-club-brugge.svg"
      ],
      [
            "bel1_antwerp",
            "bel1_antwerp",
            "bel1-antwerp.svg"
      ],
      [
            "bel1_genk",
            "bel1_genk",
            "bel1-genk.svg"
      ],
      [
            "bel1_gent",
            "bel1_gent",
            "bel1-gent.svg"
      ],
      [
            "bel1_standard_liege",
            "bel1_standard_liege",
            "bel1-standard-liege.svg"
      ],
      [
            "bel1_union_saint_gilloise",
            "bel1_union_saint_gilloise",
            "bel1-union-saint-gilloise.svg"
      ],
      [
            "arg_boca",
            "arg1_boca_juniors",
            "arg-boca.svg"
      ],
      [
            "arg_river",
            "arg1_river_plate",
            "arg-river.svg"
      ],
      [
            "arg1_argentinos_juniors",
            "arg1_argentinos_juniors",
            "arg1-argentinos-juniors.svg"
      ],
      [
            "arg1_estudiantes_de_la_plata",
            "arg1_estudiantes_de_la_plata",
            "arg1-estudiantes-de-la-plata.svg"
      ],
      [
            "arg1_independiente",
            "arg1_independiente",
            "arg1-independiente.svg"
      ],
      [
            "arg1_newell_s_old_boys",
            "arg1_newell_s_old_boys",
            "arg1-newell-s-old-boys.svg"
      ],
      [
            "arg1_racing_club",
            "arg1_racing_club",
            "arg1-racing-club.svg"
      ],
      [
            "arg1_rosario_central",
            "arg1_rosario_central",
            "arg1-rosario-central.svg"
      ],
      [
            "arg1_san_lorenzo",
            "arg1_san_lorenzo",
            "arg1-san-lorenzo.svg"
      ],
      [
            "arg1_velez_sarsfield",
            "arg1_velez_sarsfield",
            "arg1-velez-sarsfield.svg"
      ],
      [
            "kor_jeonbuk",
            "kor1_jeonbuk_hyundai_motors",
            "kor-jeonbuk-hyundai-motors.svg"
      ],
      [
            "kor1_fc_seoul",
            "kor1_fc_seoul",
            "kor1-fc-seoul.svg"
      ],
      [
            "kor1_pohang_steelers",
            "kor1_pohang_steelers",
            "kor1-pohang-steelers.svg"
      ],
      [
            "kor_ulsan",
            "kor1_ulsan_hd",
            "kor1-ulsan-hd.svg"
      ],
      [
            "jpn_urawa",
            "jpn1_urawa_red_diamonds",
            "jpn-urawa.svg"
      ],
      [
            "jpn_vissel",
            "jpn1_vissel_kobe",
            "jpn-vissel.svg"
      ],
      [
            "jpn1_gamba_osaka",
            "jpn1_gamba_osaka",
            "jpn1-gamba-osaka.svg"
      ],
      [
            "jpn1_kashima_antlers",
            "jpn1_kashima_antlers",
            "jpn1-kashima-antlers.svg"
      ],
      [
            "jpn1_kawasaki_frontale",
            "jpn1_kawasaki_frontale",
            "jpn1-kawasaki-frontale.svg"
      ],
      [
            "jpn1_sanfrecce_hiroshima",
            "jpn1_sanfrecce_hiroshima",
            "jpn1-sanfrecce-hiroshima.svg"
      ],
      [
            "jpn1_yokohama_f_marinos",
            "jpn1_yokohama_f_marinos",
            "jpn1-yokohama-f-marinos.svg"
      ],
      [
            "bra_flamengo",
            "bra1_flamengo",
            "bra-flamengo.svg"
      ],
      [
            "bra_palmeiras",
            "bra1_palmeiras",
            "bra-palmeiras.svg"
      ],
      [
            "bra1_atletico_mineiro",
            "bra1_atletico_mineiro",
            "bra1-atletico-mineiro.svg"
      ],
      [
            "bra1_botafogo",
            "bra1_botafogo",
            "bra1-botafogo.svg"
      ],
      [
            "bra1_corinthians",
            "bra1_corinthians",
            "bra1-corinthians.svg"
      ],
      [
            "bra1_cruzeiro",
            "bra1_cruzeiro",
            "bra1-cruzeiro.svg"
      ],
      [
            "bra1_fluminense",
            "bra1_fluminense",
            "bra1-fluminense.svg"
      ],
      [
            "bra1_gremio",
            "bra1_gremio",
            "bra1-gremio.svg"
      ],
      [
            "bra1_internacional",
            "bra1_internacional",
            "bra1-internacional.svg"
      ],
      [
            "bra1_santos",
            "bra1_santos",
            "bra1-santos.svg"
      ],
      [
            "bra1_sao_paulo",
            "bra1_sao_paulo",
            "bra1-sao-paulo.svg"
      ],
      [
            "bra1_vasco_da_gama",
            "bra1_vasco_da_gama",
            "bra1-vasco-da-gama.svg"
      ]
] as const
    const actual = CLUB_CREST_MANIFEST.filter(r => r.sourceUrl.startsWith('local://CLR7-20260912/'))
    expect(actual.map(r => r.canonicalClubId).sort()).toEqual(samples.map(r => r[0]).sort())
    for (const [id, workbookId, filename] of samples) {
      const crest = getClubCrestByCompatibleId(id)
      expect(crest).toMatchObject({ assetPath: `/assets/clubs/crests/${filename}`, sourceType: 'ORIGINAL_GAME_ARTWORK', rightsStatus: 'ORIGINAL_GAME_ASSET' })
      expect(getClubCrestByCompatibleId(workbookId)).toBe(crest)
      const svg = readFileSync(resolve(process.cwd(), 'public/assets/clubs/crests', filename), 'utf8')
      expect(svg).toContain('viewBox="0 0 128 128"')
      expect(svg).not.toMatch(/<(?:text|script|image)\b|font-family|(?:href|xlink:href)="(?:https?:|data:)/i)
    }
  })
})
