import { describe, expect, it } from 'vitest'
import { CLUBS } from '../runtimeClubCatalog'
import { CLUB_PARAMETERS_V1 } from '../clubParametersV1'
import {
  CLUB_CHINESE_NAMES_BY_ID,
  chineseClubShortMark,
  clubDisplayNameForCompatibleId,
} from '../clubChineseNames'
import { WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID } from '../legacyClubIdMap'

describe('club Chinese display names', () => {
  it('covers every canonical runtime club ID exactly once with a visible Chinese name', () => {
    expect(Object.keys(CLUB_CHINESE_NAMES_BY_ID)).toHaveLength(366)
    expect(Object.keys(CLUB_CHINESE_NAMES_BY_ID).sort()).toEqual(
      CLUB_PARAMETERS_V1.map((club) => club.id).sort(),
    )
    for (const name of Object.values(CLUB_CHINESE_NAMES_BY_ID)) {
      expect(name.trim()).not.toBe('')
      expect(name).toMatch(/[\u3400-\u9fff]/)
    }
    expect(CLUBS).toHaveLength(366)
    expect(new Set(CLUBS.map((club) => club.leagueLabel)).size).toBe(19)
  })

  it.each([
    ['ita_inter', '国际米兰'], ['ita1_ac_milan', 'AC米兰'], ['ita1_roma', '罗马'],
    ['ita1_parma', '帕尔马'], ['ita1_udinese', '乌迪内斯'], ['eng1_manchester_united', '曼联'],
    ['eng1_manchester_city', '曼城'], ['esp_barcelona', '巴塞罗那'], ['esp_real_madrid', '皇家马德里'],
    ['ned_ajax', '阿贾克斯'], ['jpn1_kashima_antlers', '鹿岛鹿角'], ['bra_flamengo', '弗拉门戈'],
    ['arg_river', '河床'], ['cn_shanghai_donggang', '上海东港'], ['chn1_shandong_taiyue', '山东泰岳'],
  ])('resolves representative %s as %s', (id, expectedName) => {
    expect(CLUB_CHINESE_NAMES_BY_ID[id]).toBe(expectedName)
    expect(CLUBS.find((club) => club.id === id)?.name).toBe(expectedName)
  })

  it('keeps the 40 legacy runtime IDs canonical and supports workbook-ID display lookups', () => {
    expect(Object.keys(WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID)).toHaveLength(40)
    expect(clubDisplayNameForCompatibleId('ita_inter', 'Inter')).toBe('国际米兰')
    expect(clubDisplayNameForCompatibleId('ita1_inter', 'Inter')).toBe('国际米兰')
    expect(clubDisplayNameForCompatibleId('ita1_ac_milan', 'AC Milan')).toBe('AC米兰')
  })

  it('presents English names from old history, offer, and retirement snapshots without rewriting them', () => {
    const legacySnapshots = [
      { kind: 'history', clubId: 'ita1_ac_milan', clubName: 'AC Milan' },
      { kind: 'academy-offer', clubId: 'ita1_parma', clubName: 'Parma' },
      { kind: 'retirement-summary', clubId: 'ita1_udinese', clubName: 'Udinese' },
    ]
    const before = structuredClone(legacySnapshots)

    expect(legacySnapshots.map((snapshot) =>
      clubDisplayNameForCompatibleId(snapshot.clubId, snapshot.clubName),
    )).toEqual(['AC米兰', '帕尔马', '乌迪内斯'])
    expect(legacySnapshots).toEqual(before)
  })

  it('uses Chinese short marks for new clubs and only falls back for unknown external data', () => {
    expect(chineseClubShortMark('AC米兰')).toBe('米')
    expect(CLUBS.find((club) => club.id === 'ita1_ac_milan')?.shortMark).toBe('米')
    expect(clubDisplayNameForCompatibleId('unknown-club', 'Old Snapshot FC')).toBe('Old Snapshot FC')
  })
})
