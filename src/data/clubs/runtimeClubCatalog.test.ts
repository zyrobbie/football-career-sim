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
    ['eng1_chelsea', 'Chelsea', '英格兰', 'Premier League（20）'],
    ['eng1_manchester_city', 'Manchester City', '英格兰', 'Premier League（20）'],
    ['ita1_ac_milan', 'AC Milan', '意大利', 'Serie A（20）'],
    ['ned1_feyenoord', 'Feyenoord', '荷兰', 'Eredivisie（18）'],
    ['por1_sporting_cp', 'Sporting CP', '葡萄牙', 'Liga Portugal（18）'],
    ['jpn1_kashima_antlers', 'Kashima Antlers', '日本', 'J1 League（20）'],
  ])('keeps generated sample %s visible in runtime data', (id, name, country, leagueLabel) => {
    expect(CLUBS.find((club) => club.id === id)).toMatchObject({ id, name, country, leagueLabel })
  })
})
