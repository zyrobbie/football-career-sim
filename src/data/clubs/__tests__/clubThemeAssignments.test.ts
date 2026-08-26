import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CLUB_THEME_PRESET_BY_CANONICAL_ID,
  CLUB_THEME_PRESET_KEYS,
} from '../clubThemeAssignments'
import { listClubParameters, resolveClubParametersId } from '../clubRepository'

const assignmentCsv = readFileSync(
  new URL('../../../../docs/data/club-theme-preset-assignments-v1.csv', import.meta.url),
  'utf8',
)

function csvRows(source: string): readonly Readonly<Record<string, string>>[] {
  const [headerLine, ...lines] = source.trim().split('\n')
  const parseLine = (line: string) => [...line.matchAll(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g)]
    .map((match) => (match[1] ?? match[2] ?? '').replaceAll('""', '"'))
  const header = parseLine(headerLine ?? '')
  return lines.map((line) => Object.freeze(Object.fromEntries(
    header.map((key, index) => [key, parseLine(line)[index] ?? '']),
  )))
}

describe('club theme preset assignments', () => {
  it('covers every canonical club once with all 14 presets in use', () => {
    const clubs = listClubParameters()
    const assignmentIds = Object.keys(CLUB_THEME_PRESET_BY_CANONICAL_ID)
    expect(clubs).toHaveLength(366)
    expect(assignmentIds).toHaveLength(366)
    expect(new Set(assignmentIds).size).toBe(366)
    expect(new Set(Object.values(CLUB_THEME_PRESET_BY_CANONICAL_ID))).toEqual(new Set(CLUB_THEME_PRESET_KEYS))
    for (const club of clubs) {
      expect(CLUB_THEME_PRESET_BY_CANONICAL_ID[club.id]).toBeDefined()
      expect(resolveClubParametersId(club.workbookId)).toBe(club.id)
      expect(CLUB_THEME_PRESET_BY_CANONICAL_ID[resolveClubParametersId(club.workbookId) ?? ''])
        .toBe(CLUB_THEME_PRESET_BY_CANONICAL_ID[club.id])
    }
  })

  it('matches the V4-A2 audit CSV exactly without a DEFAULT assignment', () => {
    const rows = csvRows(assignmentCsv)
    expect(rows).toHaveLength(366)
    expect(new Set(rows.map((row) => row.canonicalClubId)).size).toBe(366)
    expect(new Set(rows.map((row) => row.workbookId)).size).toBe(366)
    for (const row of rows) {
      expect(row.templateKey).not.toBe('DEFAULT')
      expect(CLUB_THEME_PRESET_BY_CANONICAL_ID[row.canonicalClubId ?? '']).toBe(row.templateKey)
    }
  })
})
