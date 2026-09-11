import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLUBS } from '../../data/balance'
import type { CareerHistoryEntry, CareerHonor, HalfYearStats } from '../../models/game'
import { generatePlayer } from '../player'
import { createDraft } from './testFixtures'
import { careerHonors, clubTeamHonors, settleHonorsForWindow, uniqueClubChampionships } from '../honors'
import { aggregateCareerHonors, aggregateClubCareerHonors } from '../honorAggregation'
import { buildRetirementSummary } from '../careerSummary'
import { buildCareerHistoryView } from '../../ui/careerHistoryView'
import { createRetirementVisualAuditGame } from '../../testing/createRetirementVisualAuditGame'
import { loadGame, saveGame } from '../../persistence/save'

const como = CLUBS.find(c => c.id === 'ita1_como')!
const inter = CLUBS.find(c => c.id === 'ita_inter')!
const player = { ...generatePlayer(createDraft('CM'), 'honor-dup-player'), attributes: { attack: 90, defense: 28, physical: 85, mental: 81 } }
const stats: HalfYearStats = { appearances: 14, starts: 13, minutes: 1170, goals: 2, assists: 1, yellowCards: 1, redCards: 0, averageRating: 6.8 }
const prior: CareerHistoryEntry = { windowIndex: 18, clubId: inter.id, clubName: inter.name, role: 'CORE', stats, arrivalChoice: null, trainingFocus: 'BALANCED', developmentApproach: 'STEADY', endingAttributes: player.attributes, firstTeamAttention: 80, teamLevel: 'FIRST_TEAM' }
const input = { player, club: como, stats, teamLevel: 'FIRST_TEAM' as const, careerSeed: 'honor-dup-42', startYear: 2026, windowIndex: 19, history: [prior], nationalRecord: null }
function cup(clubId = como.id, changes: Partial<CareerHonor> = {}): CareerHonor {
  return { id: `DOMESTIC_CUP:19:${clubId}`, type: 'DOMESTIC_CUP', scope: 'CLUB', competitionLabel: '意大利杯', seasonLabel: '2035赛季', label: '2035赛季意大利杯冠军', windowIndex: 19, clubId, clubName: clubId === como.id ? como.name : inter.name, ...changes }
}
function oldGame() {
  const game = createRetirementVisualAuditGame([inter.id, como.id])
  game.history[0]!.honors = []
  game.history[1]!.honors = [cup(como.id), cup(inter.id)]
  return game
}
afterEach(() => vi.unstubAllGlobals())

describe('one club championship per competition and season', () => {
  it('settles a deterministic mid-season transfer without duplicate titles or reputation', () => {
    const result = settleHonorsForWindow(input)
    expect(result.honors.filter(h => h.type === 'DOMESTIC_CUP')).toEqual([cup()])
    expect(result.honors.filter(h => h.type === 'LEAGUE_TITLE')).toHaveLength(1)
    expect(result.honors.find(h => h.type === 'CONTINENTAL_TITLE')?.clubId).toBe(inter.id)
    expect(result.reputationDelta).toBe(6)
    expect(settleHonorsForWindow({ ...input, history: [] }).clubSeason).toEqual(result.clubSeason)
  })

  it('keeps former-club championships when the current club has no participation', () => {
    const result = settleHonorsForWindow({ ...input, stats: { ...stats, appearances: 0, starts: 0, minutes: 0 } })
    expect(result.honors.filter(h => h.scope === 'CLUB').every(h => h.clubId === inter.id)).toBe(true)
    expect(result.honors.find(h => h.type === 'DOMESTIC_CUP')?.clubId).toBe(inter.id)
  })

  it('preserves different competitions, seasons, and non-club honors without string-label deduplication', () => {
    const arsenal = CLUBS.find(c => c.id === 'eng_arsenal')!
    const english = clubTeamHonors({ club: arsenal, label: '2035赛季', windowIndex: 19, participated: true, season: { seasonLabel: '2035赛季', leagueLabel: '英超', leaguePosition: 2, leagueTeams: 18, domesticCupStage: 'CHAMPION', continentalLabel: null, continentalStage: 'NOT_ENTERED', summary: '' } })[0]!
    const honors = [cup(), english, cup(como.id, { id: 'next-season', seasonLabel: '2036赛季', windowIndex: 21 }), cup(como.id, { id: 'league', type: 'LEAGUE_TITLE', competitionLabel: '意甲' }), cup(como.id, { id: 'individual', scope: 'INDIVIDUAL', type: 'TEAM_OF_SEASON' }), cup(como.id, { id: 'national', scope: 'NATIONAL', type: 'ASIAN_CUP' })]
    expect(careerHonors([{ ...prior, honors }])).toEqual(honors)
  })

  it('keeps the first source record, even if sorting ids would prefer the later club', () => {
    const first = cup(como.id, { id: 'z-current' }), second = cup(inter.id, { id: 'a-former' })
    const honors = Object.freeze([Object.freeze(first), Object.freeze(second)])
    const grouped = aggregateCareerHonors(honors)
    expect(grouped).toEqual([expect.objectContaining({ count: 1, seasons: ['2035赛季'], clubId: como.id })])
    expect(honors).toEqual([first, second])
  })

  it('uses structured identity for report-only honors and retains incomplete identities', () => {
    const first = cup(), duplicate = cup(inter.id, { competitionLabel: ' 意大利杯 ', label: '不同展示文字' })
    const unknown = cup(inter.id, { id: 'unknown', competitionLabel: '' })
    expect(uniqueClubChampionships([first, duplicate, unknown, { ...unknown, id: 'unknown-2' }])).toEqual([first, unknown, { ...unknown, id: 'unknown-2' }])
  })

  it('normalizes before filtering club detail, preventing both clubs from claiming the same title', () => {
    const honors = [cup(), cup(inter.id)]
    expect(aggregateClubCareerHonors(honors, como.id)[0]?.count).toBe(1)
    expect(aggregateClubCareerHonors(honors, inter.id)).toEqual([])
  })

  it('keeps retirement totals, history groups, and club details consistent for old duplicates', () => {
    const game = oldGame(), before = JSON.stringify(game)
    const summary = buildRetirementSummary(game), history = buildCareerHistoryView(game)
    expect(summary.honors).toHaveLength(1)
    expect(summary.clubs.find(c => c.clubId === como.id)?.honors).toEqual(['2035赛季意大利杯冠军'])
    expect(summary.clubs.find(c => c.clubId === inter.id)?.honors).toEqual([])
    expect(history.honors.club).toHaveLength(1)
    expect(history.clubs.find(c => c.clubId === inter.id)?.honors).toEqual([])
    expect(JSON.stringify(game)).toBe(before)
  })

  it('does not rewrite old honor arrays or saved bytes on load and read-only summary generation', () => {
    const map = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v) }, removeItem: (k: string) => { map.delete(k) } } })
    const game = oldGame()
    saveGame(game)
    const raw = map.get('career_save_current')!
    const loaded = loadGame()!
    expect(loaded.history[1]!.honors).toEqual(game.history[1]!.honors)
    expect(buildRetirementSummary(loaded).honors).toHaveLength(1)
    expect(map.get('career_save_current')).toBe(raw)
  })
})
