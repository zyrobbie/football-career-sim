import { describe, expect, it } from 'vitest'
import { CLUB_CITY_RECORDS, isKnownLivingCityId, resolveClubCity } from '../clubCities'
import { listClubParameters } from './clubRepository'

const SAME_CITY_GROUPS = [
  ['eng_arsenal', 'eng1_chelsea', 'eng1_tottenham_hotspur', 'eng_fulham', 'eng1_brentford', 'eng2_west_ham_united', 'eng2_millwall', 'eng2_charlton_athletic', 'eng2_queens_park_rangers'],
  ['eng_liverpool', 'eng1_everton'],
  ['eng1_manchester_city', 'eng1_manchester_united'],
  ['esp_real_madrid', 'esp1_atletico_de_madrid', 'esp1_rayo_vallecano'],
  ['esp1_real_betis', 'esp1_sevilla'],
  ['esp1_valencia', 'esp1_levante'],
  ['esp_celta', 'esp2_celta_fortuna'],
  ['esp_real_sociedad', 'esp2_real_sociedad_b'],
  ['ita_inter', 'ita1_ac_milan'],
  ['ita_juventus', 'ita_torino'],
  ['ita1_roma', 'ita1_lazio'],
  ['ita1_genoa', 'ita2_sampdoria'],
  ['bel_brugge', 'bel1_cercle_brugge'],
  ['bel_anderlecht', 'bel1_union_saint_gilloise'],
  ['ned1_feyenoord', 'ned1_sparta_rotterdam', 'ned1_excelsior'],
  ['chn1_xian_changan', 'chn2_shaanxi_qinling'],
]

describe('approved V3 club living bases', () => {
  it('covers every canonical club exactly once without a runtime research dependency', () => {
    const catalog = listClubParameters()
    expect(CLUB_CITY_RECORDS).toHaveLength(366)
    expect(new Set(CLUB_CITY_RECORDS.map((record) => record.canonicalClubId)).size).toBe(366)
    expect(CLUB_CITY_RECORDS.map((record) => record.canonicalClubId).sort())
      .toEqual(catalog.map((club) => club.id).sort())
    for (const club of catalog) {
      const record = resolveClubCity(club.id)
      expect(record.canonicalClubId).toBe(club.id)
      expect(record.cityId).toMatch(/^[a-z]{2}_[a-z0-9_]+$/)
      expect(record.cityName).toBeTruthy()
      expect(record.geographicCountryCode).toMatch(/^[A-Z]{2}$/)
      expect(record.sources.length).toBeGreaterThan(0)
      expect(record.sources.every((source) => source.url.length > 0)).toBe(true)
      expect(isKnownLivingCityId(record.cityId)).toBe(true)
      expect(Object.isFrozen(record)).toBe(true)
      expect(Object.isFrozen(record.sources)).toBe(true)
    }
  })

  it('matches the complete approved 366-club decision-table fingerprint', () => {
    const key = CLUB_CITY_RECORDS.map((record) => `${record.canonicalClubId}=${record.cityId}`).sort().join('\n')
    let hash = 2166136261
    for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619)
    expect((hash >>> 0).toString(16)).toBe('de74bb98')
  })

  it('resolves all 366 workbook IDs including the 40 nonidentity aliases identically', () => {
    let aliases = 0
    for (const club of listClubParameters()) {
      if (club.id !== club.workbookId) aliases += 1
      expect(resolveClubCity(club.workbookId)).toBe(resolveClubCity(club.id))
    }
    expect(aliases).toBe(40)
  })

  it.each(SAME_CITY_GROUPS)('shares the approved city for %s and its same-city group', (...clubIds) => {
    const cities = clubIds.map((id) => resolveClubCity(id).cityId)
    expect(cities.every(Boolean)).toBe(true)
    expect(new Set(cities).size).toBe(1)
  })

  it.each([
    ['eng2_watford', 'eng_arsenal'],
    ['eng2_west_bromwich_albion', 'eng1_aston_villa'],
    ['esp_barcelona', 'esp1_espanyol'],
    ['por1_braga', 'por1_vitoria_sc'],
    ['arg1_racing_club', 'arg_boca'],
    ['arg1_tigre', 'arg_boca'],
    ['jpn1_fc_tokyo', 'jpn1_tokyo_verdy'],
    ['jpn1_cerezo_osaka', 'jpn1_gamba_osaka'],
  ])('does not collapse distinct bases %s and %s into a metro shortcut', (first, second) => {
    expect(resolveClubCity(first).canonicalClubId).not.toBeNull()
    expect(resolveClubCity(second).canonicalClubId).not.toBeNull()
    expect(resolveClubCity(first).cityId).not.toBe(resolveClubCity(second).cityId)
  })

  it('retains honest source kinds and separately labels authored China settings', () => {
    const china = listClubParameters().filter((club) => club.country === '中国')
    expect(china).toHaveLength(32)
    for (const club of china) {
      const record = resolveClubCity(club.id)
      expect(record.kind).toBe('game-design')
      expect(record.sourceKind).toBe('PRODUCT_CANON')
      expect(record.sources.some((source) => source.kind === 'game-design')).toBe(true)
      expect(record.sources.some((source) => source.kind === 'official')).toBe(false)
      expect(record.rationale).toContain('not an inference')
    }
    expect(resolveClubCity('eng_arsenal').kind).toBe('official')
    expect(resolveClubCity('eng1_chelsea').kind).toBe('secondary')
    expect(resolveClubCity('eng1_manchester_united').sourceKind).toBe('PRODUCT_HOME_BASE')
    expect(resolveClubCity('eng1_manchester_united').kind).toBe('game-design')
    expect(CLUB_CITY_RECORDS.filter((record) => record.sourceKind === 'PRODUCT_HOME_BASE')).toHaveLength(17)
  })

  it.each([
    ['jpn1_fc_tokyo', 'jp_chofu'], ['jpn1_tokyo_verdy', 'jp_inagi'],
    ['jpn1_v_varen_nagasaki', 'jp_isahaya'], ['jpn1_kyoto_sanga', 'jp_kyoto'],
    ['jpn1_mito_hollyhock', 'jp_mito'], ['kor1_gangwon_fc', 'kr_gangneung'],
    ['esp2_andorra', 'ad_andorra_la_vella'], ['fra_monaco', 'mc_monaco'],
    ['eng2_cardiff_city', 'gb_cardiff'], ['eng2_swansea_city', 'gb_swansea'],
    ['eng2_wrexham', 'gb_wrexham'], ['ita1_sassuolo', 'it_sassuolo'],
    ['fra1_olympique_lyonnais', 'fr_lyon'], ['fra_lille', 'fr_lille'],
  ])('uses explicit reviewed home-base semantics for %s', (clubId, cityId) => {
    expect(resolveClubCity(clubId).cityId).toBe(cityId)
  })

  it.each([null, undefined, '', 'Arsenal', 'Manchester', 'eng_unknown', 'GB', '__proto__', 'constructor', 'eng_arsenal ', 'ENG_ARSENAL'])
  ('never infers a club or city for unrecognized input %s', (value) => {
    const record = resolveClubCity(value)
    expect(record.canonicalClubId).toBeNull()
    expect(record.cityId).toBeNull()
    expect(record.kind).toBe('unknown')
    expect(record.sources).toEqual([])
    expect(isKnownLivingCityId(value)).toBe(false)
  })
})
