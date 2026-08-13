import { describe, expect, it } from 'vitest'
import { WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID } from '../legacyClubIdMap'
import {
  getClubParametersByCompatibleId,
  getClubParametersById,
  getClubParametersByWorkbookId,
  listClubParameters,
  listClubParametersByCountry,
  listClubParametersByLeague,
  listClubParametersByPlatformTier,
  resolveClubParametersId,
  trainingQualitiesForClubParameters,
  trainingQualityForClubParameters,
} from '../clubRepository'

const legacyIdentities = [
  ['chn1_shanghai_donggang', 'cn_shanghai_donggang', '上海东港', '中国'],
  ['chn1_beijing_yuhua', 'cn_beijing_yuhua', '北京御华', '中国'],
  ['chn1_wuhan_jiangcheng', 'cn_wuhan_jiangcheng', '武汉江城', '中国'],
  ['chn1_chengdu_jincheng', 'cn_chengdu_jincheng', '成都锦城', '中国'],
  ['chn2_guangxi_liancheng', 'cn_guangxi_liancheng', '广西联城', '中国'],
  ['chn2_yunnan_shanhe', 'cn_yunnan_shanhe', '云南山河', '中国'],
  ['eng1_arsenal', 'eng_arsenal', 'Arsenal', '英格兰'],
  ['eng1_liverpool', 'eng_liverpool', 'Liverpool', '英格兰'],
  ['eng1_brighton_and_hove_albion', 'eng_brighton', 'Brighton & Hove Albion', '英格兰'],
  ['eng1_fulham', 'eng_fulham', 'Fulham', '英格兰'],
  ['esp1_real_madrid', 'esp_real_madrid', 'Real Madrid', '西班牙'],
  ['esp1_fc_barcelona', 'esp_barcelona', 'FC Barcelona', '西班牙'],
  ['esp1_real_sociedad', 'esp_real_sociedad', 'Real Sociedad', '西班牙'],
  ['esp1_celta_de_vigo', 'esp_celta', 'Celta de Vigo', '西班牙'],
  ['ita1_inter', 'ita_inter', 'Inter', '意大利'],
  ['ita1_juventus', 'ita_juventus', 'Juventus', '意大利'],
  ['ita1_bologna', 'ita_bologna', 'Bologna', '意大利'],
  ['ita1_torino', 'ita_torino', 'Torino', '意大利'],
  ['ger1_bayern_munchen', 'ger_bayern', 'Bayern München', '德国'],
  ['ger1_borussia_dortmund', 'ger_dortmund', 'Borussia Dortmund', '德国'],
  ['ger1_eintracht_frankfurt', 'ger_frankfurt', 'Eintracht Frankfurt', '德国'],
  ['ger1_mainz_05', 'ger_mainz', 'Mainz 05', '德国'],
  ['fra1_paris_saint_germain', 'fra_psg', 'Paris Saint-Germain', '法国'],
  ['fra1_as_monaco', 'fra_monaco', 'AS Monaco', '法国'],
  ['fra1_lille', 'fra_lille', 'Lille', '法国'],
  ['fra1_strasbourg', 'fra_strasbourg', 'Strasbourg', '法国'],
  ['ned1_ajax', 'ned_ajax', 'Ajax', '荷兰'],
  ['ned1_psv', 'ned_psv', 'PSV', '荷兰'],
  ['por1_benfica', 'por_benfica', 'Benfica', '葡萄牙'],
  ['por1_fc_porto', 'por_porto', 'FC Porto', '葡萄牙'],
  ['bel1_club_brugge', 'bel_brugge', 'Club Brugge', '比利时'],
  ['bel1_anderlecht', 'bel_anderlecht', 'Anderlecht', '比利时'],
  ['jpn1_urawa_red_diamonds', 'jpn_urawa', 'Urawa Red Diamonds', '日本'],
  ['jpn1_vissel_kobe', 'jpn_vissel', 'Vissel Kobe', '日本'],
  ['kor1_ulsan_hd', 'kor_ulsan', 'Ulsan HD', '韩国'],
  ['kor1_jeonbuk_hyundai_motors', 'kor_jeonbuk', 'Jeonbuk Hyundai Motors', '韩国'],
  ['bra1_palmeiras', 'bra_palmeiras', 'Palmeiras', '巴西'],
  ['bra1_flamengo', 'bra_flamengo', 'Flamengo', '巴西'],
  ['arg1_river_plate', 'arg_river', 'River Plate', '阿根廷'],
  ['arg1_boca_juniors', 'arg_boca', 'Boca Juniors', '阿根廷'],
] as const

describe('club parameters V1 repository', () => {
  it('contains exactly 366 immutable records with complete bounded values', () => {
    const clubs = listClubParameters()
    expect(clubs).toHaveLength(366)
    expect(new Set(clubs.map((club) => club.id)).size).toBe(366)
    expect(new Set(clubs.map((club) => club.workbookId)).size).toBe(366)
    expect(Object.isFrozen(clubs)).toBe(true)

    for (const club of clubs) {
      expect(Object.isFrozen(club)).toBe(true)
      expect([1, 2]).toContain(club.divisionLevel)
      expect([1, 2, 3, 4, 5, 6]).toContain(club.platformTier)
      for (const value of [club.id, club.workbookId, club.sourceId, club.country, club.league, club.name]) {
        expect(value.length).toBeGreaterThan(0)
      }
      for (const value of [club.facility, club.academy, club.wage, club.exposure, club.firstTeamThreshold, club.youthPlayerPreference]) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
    }
  })

  it('has exactly 19 leagues and the approved platform-tier distribution', () => {
    const clubs = listClubParameters()
    expect(new Set(clubs.map((club) => club.league)).size).toBe(19)
    expect(listClubParametersByPlatformTier(1)).toHaveLength(12)
    expect(listClubParametersByPlatformTier(2)).toHaveLength(31)
    expect(listClubParametersByPlatformTier(3)).toHaveLength(57)
    expect(listClubParametersByPlatformTier(4)).toHaveLength(87)
    expect(listClubParametersByPlatformTier(5)).toHaveLength(148)
    expect(listClubParametersByPlatformTier(6)).toHaveLength(31)
  })

  it('preserves every manually verified legacy runtime ID and resolves its workbook ID to the same object', () => {
    expect(Object.keys(WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID)).toHaveLength(40)
    expect(legacyIdentities).toHaveLength(40)
    for (const [workbookId, runtimeId, name, country] of legacyIdentities) {
      expect(WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID[workbookId]).toBe(runtimeId)
      const byRuntimeId = getClubParametersById(runtimeId)
      const byWorkbookId = getClubParametersByWorkbookId(workbookId)
      expect(byRuntimeId).toBe(byWorkbookId)
      expect(getClubParametersByCompatibleId(runtimeId)).toBe(byRuntimeId)
      expect(getClubParametersByCompatibleId(workbookId)).toBe(byRuntimeId)
      expect(resolveClubParametersId(workbookId)).toBe(runtimeId)
      expect(byRuntimeId).toMatchObject({ id: runtimeId, workbookId, name, country })
    }
  })

  it('uses indexed canonical/workbook, country, league, and platform-tier queries', () => {
    expect(getClubParametersById('ita_inter')?.workbookId).toBe('ita1_inter')
    expect(getClubParametersById('ita1_inter')).toBeNull()
    expect(getClubParametersByWorkbookId('ita1_inter')?.id).toBe('ita_inter')
    expect(getClubParametersByCompatibleId('missing')).toBeNull()
    expect(listClubParametersByCountry('中国')).toHaveLength(32)
    expect(listClubParametersByCountry('英格兰')).toHaveLength(44)
    expect(listClubParametersByLeague('Premier League（20）')).toHaveLength(20)
    expect(listClubParametersByLeague('Liga Profesional（30）')).toHaveLength(30)
    expect(listClubParametersByPlatformTier(1)).toBe(listClubParametersByPlatformTier(1))
  })

  it('keeps representative source parameters intact across countries and platform tiers', () => {
    const samples = [
      ['eng_arsenal', 1, 96, 94, 98, 98, 87, 86],
      ['ita_inter', 1, 99, 95, 95, 98, 86, 70],
      ['esp_real_sociedad', 3, 81, 93, 74, 84, 76, 92],
      ['ned_ajax', 2, 90, 96, 68, 82, 78, 95],
      ['por_benfica', 2, 89, 96, 72, 87, 77, 94],
      ['bel_brugge', 2, 89, 87, 76, 83, 79, 83],
      ['jpn_urawa', 4, 76, 72, 58, 67, 70, 72],
      ['kor_ulsan', 4, 74, 68, 53, 63, 67, 78],
      ['bra_palmeiras', 2, 89, 92, 76, 84, 78, 86],
      ['arg_river', 2, 85, 94, 62, 83, 78, 92],
      ['cn_shanghai_donggang', 4, 74, 70, 70, 72, 70, 66],
      ['cn_guangxi_liancheng', 6, 52, 49, 33, 32, 56, 88],
    ] as const
    for (const [id, platformTier, facility, academy, wage, exposure, firstTeamThreshold, youthPlayerPreference] of samples) {
      expect(getClubParametersById(id)).toMatchObject({
        platformTier, facility, academy, wage, exposure, firstTeamThreshold, youthPlayerPreference,
      })
    }
  })

  it('recalculates training quality from six parameters and platform coach base, never workbook N/O', () => {
    const inter = getClubParametersById('ita_inter')!
    expect(trainingQualitiesForClubParameters(inter)).toEqual({ youth: 96.2, firstTeam: 96.4 })
    expect(trainingQualityForClubParameters(inter, 'YOUTH', 50)).toBe(96.2)
    expect(trainingQualityForClubParameters(inter, 'FIRST_TEAM', 50)).toBe(96.4)
  })
})
