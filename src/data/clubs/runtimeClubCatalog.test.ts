import { describe, expect, it } from 'vitest'
import { listClubParameters } from './clubRepository'
import { CLUBS, DOMESTIC_CLUBS, OVERSEAS_CLUBS } from './runtimeClubCatalog'

describe('runtime Club Parameters V1 catalog', () => {
  it('derives all persisted runtime clubs without changing legacy IDs', () => {
    expect(CLUBS).toHaveLength(366)
    expect(new Set(CLUBS.map((club) => club.id)).size).toBe(366)
    expect(DOMESTIC_CLUBS).toHaveLength(32)
    expect(OVERSEAS_CLUBS).toHaveLength(334)
    expect(new Set(CLUBS.map((club) => club.leagueLabel)).size).toBe(19)
    expect(CLUBS.find((club) => club.id === 'ita_inter')?.name).toBe('国际米兰')
    expect(CLUBS.find((club) => club.id === 'cn_shanghai_donggang')?.name).toBe('上海东港')
    expect(CLUBS.map((club) => club.id)).toEqual(listClubParameters().map((club) => club.id))
  })

  it.each([
    ['eng1_chelsea', '切尔西', '英格兰', 'Premier League（20）'],
    ['eng1_manchester_city', '曼城', '英格兰', 'Premier League（20）'],
    ['ita1_ac_milan', 'AC米兰', '意大利', 'Serie A（20）'],
    ['ned1_feyenoord', '费耶诺德', '荷兰', 'Eredivisie（18）'],
    ['por1_sporting_cp', '葡萄牙体育', '葡萄牙', 'Liga Portugal（18）'],
    ['jpn1_kashima_antlers', '鹿岛鹿角', '日本', 'J1 League（20）'],
  ])('uses the Chinese display name for runtime sample %s', (id, name, country, leagueLabel) => {
    expect(CLUBS.find((club) => club.id === id)).toMatchObject({ id, name, country, leagueLabel })
  })
})
