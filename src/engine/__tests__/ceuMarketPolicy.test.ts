import { afterAll, afterEach, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { CLUBS } from '../../data/balance'
import { getClubParametersByCompatibleId } from '../../data/clubs/clubRepository'
import { generateTransferOffers, generateContractExpiryOffers, qualifiesForAdultMarket, selectTransferCandidates, type TransferCandidate } from '../transfers'
import type { Club, FirstTeamRole, Player } from '../../models/game'
import * as random from '../random'
const root = 'docs/evidence/CEU-20260907'
const json = (f: string) => JSON.parse(readFileSync(f, 'utf8'))
const source = json(`${root}/S0/market-baseline.json`)
const oldRows = json(`${root}/M-01/generated-r4/boundaries.json`)
type Input = Parameters<typeof generateTransferOffers>[0]
const input: Input = { player: source.player, currentClubId: source.currentClubId, currentTeamLevel: 'FIRST_TEAM', latestReport: null, careerSeed: 'review-return-0', windowIndex: source.windowIndex }
const country = (id: string) => getClubParametersByCompatibleId(id)!.country
const newE03: unknown[] = [], boundaries: unknown[] = [], scarcity: unknown[] = []
const record = (file: string, data: unknown) => { if (process.env.CEU_M02_EVIDENCE === '1') writeFileSync(`${root}/M-02/${file}.json`, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' }) }
afterEach(() => vi.restoreAllMocks())
function guarantees(args: Input, offers: ReturnType<typeof generateTransferOffers>) {
  const eligible = CLUBS.filter(c => c.id !== args.currentClubId && qualifiesForAdultMarket(args.player, c))
  const domestic = eligible.filter(c => c.country === '中国').length
  const overseas = eligible.length - domestic
  const domesticOffers = offers.filter(o => country(o.clubId) === '中国').length
  if (args.player.overseasIntent === 'DOMESTIC' && domestic >= 2) expect(domesticOffers).toBeGreaterThanOrEqual(2)
  if (args.player.overseasIntent === 'CONDITIONAL' && domestic && overseas) { expect(domesticOffers).toBeGreaterThanOrEqual(1); expect(offers.length - domesticOffers).toBeGreaterThanOrEqual(1) }
}
it.each(['CONDITIONAL', 'DOMESTIC', 'STRONG'] as const)('reuses complete original E-03 input for all 100 seeds: %s', intent => {
  const samples = source.samples.map((old: { seed: string; offers: unknown[] }) => {
    const args = { ...structuredClone(input), careerSeed: old.seed, player: { ...structuredClone(source.player), overseasIntent: intent } }
    const offers = generateTransferOffers(args)
    expect(generateTransferOffers(args)).toEqual(offers)
    expect(offers).toHaveLength(3); guarantees(args, offers)
    const enriched = offers.map(o => ({ ...o, country: country(o.clubId) }))
    // For unchanged input, a previously offered club keeps all contractual/scoring fields.
    if (intent === 'CONDITIONAL') for (const offer of enriched) {
      const prior = (old.offers as typeof enriched).find(o => o.clubId === offer.clubId)
      if (prior) expect(offer).toEqual(prior)
    }
    return { input: args, offers: enriched }
  })
  expect(samples).toHaveLength(100)
  const counts = samples.map((s: { offers: { country: string }[] }) => s.offers.filter(o => o.country === '中国').length)
  newE03.push({ intent, source: `${root}/S0/market-baseline.json`, sourceSHA: createHash('sha256').update(readFileSync(`${root}/S0/market-baseline.json`)).digest('hex'), domesticTotal: counts.reduce((a: number, b: number) => a + b, 0), externalTotal: 300, domesticPerWindow: { min: Math.min(...counts), max: Math.max(...counts) }, samples })
})
it('directly verifies qualification independent of intent, using division/platform parameters rather than club.tier', () => {
  for (const ovr of [65, 66, 73, 74, 79, 80, 84, 85]) for (const intent of ['CONDITIONAL', 'DOMESTIC', 'STRONG'] as const) for (const club of CLUBS) {
    const player = { ...source.player, overseasIntent: intent, attributes: { attack: ovr, defense: ovr, physical: ovr, mental: ovr } }
    const p = getClubParametersByCompatibleId(club.id)!
    const expected = ovr >= 85 ? p.divisionLevel === 1 && (p.platformTier <= 3 || club.country === '中国' && p.platformTier === 4) : ovr >= 80 ? p.divisionLevel === 1 && p.platformTier <= 4 : ovr >= 74 ? p.divisionLevel === 1 && p.platformTier <= 5 || p.divisionLevel === 2 && p.platformTier === 4 : ovr >= 66 ? p.platformTier >= 3 && p.platformTier <= 6 : true
    expect(qualifiesForAdultMarket(player, club), `${ovr}/${intent}/${club.id}`).toBe(expected)
    expect(qualifiesForAdultMarket(player, { ...club, tier: club.tier === 1 ? 6 : 1 })).toBe(expected)
  }
})
it('reuses the 47 frozen complete boundary inputs across regular/expiry/rescue paths', () => {
  expect(oldRows).toHaveLength(47)
  for (const row of oldRows) {
    const args: Input = structuredClone(row.input)
    const offers = row.path === 'expiry' ? generateContractExpiryOffers({ ...args, currentRole: 'STARTER', currentContract: row.expiryContract }) : generateTransferOffers(args)
    const repeated = row.path === 'expiry' ? generateContractExpiryOffers({ ...args, currentRole: 'STARTER', currentContract: row.expiryContract }) : generateTransferOffers(args)
    expect(repeated).toEqual(offers)
    const external = offers.filter(o => o.type !== 'RENEWAL')
    expect(external.length).toBeLessThanOrEqual(3); expect(offers.length).toBeLessThanOrEqual(row.path === 'expiry' ? 4 : 3)
    expect(new Set(external.map(o => o.clubId)).size).toBe(external.length)
    expect(external.every(o => o.clubId !== args.currentClubId)).toBe(true)
    if (row.age === 40) expect(offers).toEqual([])
    else if (row.age < 18) expect(external.every(o => country(o.clubId) === '中国')).toBe(true)
    else if (row.path !== 'rescue') guarantees(args, external)
    if (row.age < 40 && row.path === 'expiry') {
      expect(offers[0]).toEqual((row.offers as typeof offers).map(({ ...o }) => { delete (o as typeof o & { country?: string }).country; return o })[0])
      expect(external.every(o => o.type === 'FREE_TRANSFER' && o.transferFeeEuro === 0)).toBe(true)
      const direct = generateTransferOffers(args).map(o => ({ ...o, id: `free-${args.windowIndex}-${o.clubId}`, type: 'FREE_TRANSFER', transferFeeEuro: 0 }))
      expect(external).toEqual(direct)
    }
    if (row.path === 'rescue' && row.age < 40 && (row.role === 'FRINGE' || row.appearances <= 5)) {
      const order = ['FRINGE', 'SUBSTITUTE', 'ROTATION', 'STARTER', 'CORE']
      expect(external.every(o => o.promisedTeamLevel === 'FIRST_TEAM' && order.indexOf(o.promisedRole ?? '') > order.indexOf(row.role))).toBe(true)
      if (row.intent === 'DOMESTIC') expect(country(external[0]!.clubId)).toBe('中国')
    }
    boundaries.push({ ...row, oldOffers: row.offers, offers })
  }
})

// Explicitly constructed selector inputs; clubs are unchanged real catalog entries,
// but promises/scores here are controlled to isolate composition and scarcity.
function candidate(club: Club, role: FirstTeamRole = 'CORE'): TransferCandidate {
  return { club, interestScore: 70, preferenceFit: 60, estimatedPotential: 90, promise: { teamLevel: 'FIRST_TEAM', role } }
}
function clubWhere(predicate: (c: Club) => boolean) { const club = CLUBS.find(predicate); expect(club).toBeDefined(); return club! }
const d1 = candidate(clubWhere(c => c.country === '中国' && c.profile === 'ELITE'))
const d2 = candidate(clubWhere(c => c.country === '中国' && c.profile === 'ELITE' && c.id !== d1.club.id))
const h1 = candidate(clubWhere(c => c.country !== '中国' && c.tier <= 2 && c.leagueKey === '意大利'))
const h2 = candidate(clubWhere(c => c.country !== '中国' && c.tier <= 2 && c.leagueKey !== '意大利'))
const lower = candidate(clubWhere(c => c.country !== '中国' && c.tier === 3 && c.id !== input.currentClubId))
const adultCases = [
  { name: 'empty', pool: [], count: 0 },
  { name: 'one-domestic', pool: [d1], count: 1 },
  { name: 'two-domestic-no-overseas', pool: [d1, d2], count: 2 },
  { name: 'no-domestic', pool: [h1, h2, lower], count: 3 },
  { name: 'one-domestic-unique-region', pool: [d1, h1, h2], count: 3 },
  { name: 'one-overseas-unique-region', pool: [d1, d2, h1], count: 3 },
  { name: 'two-one-per-region', pool: [d1, h1], count: 2 },
  { name: 'no-preferred-league', pool: [d1, d2, h2], count: 3 },
  { name: 'only-one-high-platform', pool: [d1, d2, h1, lower], count: 3 },
  { name: 'duplicates-current-excluded', pool: [d1, d1, h1, candidate(clubWhere(c => c.id === input.currentClubId))], count: 2 },
]
it.each(adultCases)('MR-02 controlled adult pool: $name', row => {
  for (const intent of ['CONDITIONAL', 'DOMESTIC', 'STRONG'] as const) {
    const args = { ...input, player: { ...source.player, overseasIntent: intent, attributes: { attack: 85, defense: 85, physical: 85, mental: 85 } } }
    const selected = selectTransferCandidates(args, row.pool)
    expect(selected).toHaveLength(row.count); expect(selectTransferCandidates(args, row.pool)).toEqual(selected)
    expect(new Set(selected.map(c => c.club.id)).size).toBe(row.count)
    expect(selected.every(c => c.club.id !== args.currentClubId && row.pool.includes(c))).toBe(true)
    const domestic = row.pool.filter(c => c.club.country === '中国')
    const uniqueDomestic = new Set(domestic.map(c => c.club.id)).size
    if (intent === 'DOMESTIC' && uniqueDomestic >= 2) expect(selected.slice(0, 2).every(c => c.club.country === '中国')).toBe(true)
    if (intent === 'CONDITIONAL' && uniqueDomestic && row.pool.some(c => c.club.country !== '中国' && c.club.id !== args.currentClubId)) {
      expect(selected[0]!.club.country).toBe('中国'); expect(selected[1]!.club.country).not.toBe('中国')
    }
    if (intent === 'STRONG') {
      const high = new Set(row.pool.filter(c => c.club.country !== '中国' && c.club.tier <= 2 && c.club.id !== args.currentClubId).map(c => c.club.id))
      expect(selected.slice(0, 2).filter(c => high.has(c.club.id))).toHaveLength(Math.min(2, high.size))
    }
    scarcity.push({ kind: 'constructed selector pool', name: row.name, intent, input: args, pool: row.pool, expectedCount: row.count, selected })
  }
})
it('STRONG reserves only two high overseas slots and a controlled open draw can select China', () => {
  const original = random.createRandom
  const slots: string[] = []
  vi.spyOn(random, 'createRandom').mockImplementation((...parts) => {
    const result = original(...parts)
    if (parts[1] === 'transfer-market-slot') { slots.push(String(parts[3])); return { ...result, float: (min, max) => parts[3] === 'adult-open' ? max * 0.999999 : min } }
    return result
  })
  const args = { ...input, player: { ...source.player, overseasIntent: 'STRONG' as const, preferredLeagues: ['无候选联赛'], attributes: { attack: 85, defense: 85, physical: 85, mental: 85 } } }
  const selected = selectTransferCandidates(args, [h1, h2, d1])
  expect(selected.slice(0, 2).every(c => c.club.country !== '中国' && c.club.tier <= 2)).toBe(true)
  expect(selected[2]!.club.id).toBe(d1.club.id)
  expect(slots).toContain('adult-open')
  expect(qualifiesForAdultMarket(args.player, d1.club)).toBe(true)
})
const bigFive = candidate(clubWhere(c => ['英格兰', '西班牙', '意大利', '德国', '法国'].includes(c.country) && c.tier >= 3))
const development = candidate(clubWhere(c => ['荷兰', '葡萄牙', '比利时'].includes(c.country) && c.tier >= 3))
const rescueCases = [
  { name: 'zero-improvement', pool: [{ ...h1, promise: { teamLevel: 'FIRST_TEAM' as const, role: 'FRINGE' as const } }, { ...d1, promise: { teamLevel: 'YOUTH' as const, role: 'CORE' as const } }], count: 0 },
  { name: 'one-improvement', pool: [bigFive], count: 1 },
  { name: 'two-improvements', pool: [bigFive, development], count: 2 },
  { name: 'missing-big-five', pool: [development, d1, d2], count: 3 },
  { name: 'missing-development', pool: [bigFive, d1, d2], count: 3 },
  { name: 'missing-domestic', pool: [bigFive, development, lower], count: new Set([bigFive.club.id, development.club.id, lower.club.id]).size },
]
it.each(rescueCases)('MR-02 controlled rescue pool: $name', row => {
  for (const intent of ['DOMESTIC', 'CONDITIONAL', 'STRONG'] as const) {
    const base = oldRows.find((r: { path: string }) => r.path === 'rescue').input
    const args = { ...structuredClone(base), player: { ...base.player, overseasIntent: intent } }
    const selected = selectTransferCandidates(args, row.pool)
    expect(selected).toHaveLength(row.count)
    expect(selected.every(c => c.promise.teamLevel === 'FIRST_TEAM' && c.promise.role !== 'FRINGE')).toBe(true)
    if (intent === 'DOMESTIC' && row.pool.includes(d1)) expect(selected[0]!.club.id === d1.club.id || selected[0]!.club.id === d2.club.id).toBe(true)
    scarcity.push({ kind: 'constructed rescue promises; no natural capture claim', name: row.name, intent, input: args, pool: row.pool, expectedCount: row.count, selected })
  }
})
it('keeps FRINGE with >5 appearances in rescue, but SUBSTITUTE 6 in ordinary adult eligibility', () => {
  const base = structuredClone(oldRows.find((r: { path: string }) => r.path === 'rescue').input) as Input
  base.player.attributes = { attack: 85, defense: 85, physical: 85, mental: 85 }
  // Platform 5/6 is ineligible for OVR85 ordinary market, but improved first-team role qualifies for rescue.
  const low = candidate(clubWhere(c => c.country !== '中国' && getClubParametersByCompatibleId(c.id)!.platformTier >= 5))
  for (const [role, appearances, count] of [['FRINGE', 12, 1], ['SUBSTITUTE', 5, 1], ['SUBSTITUTE', 6, 0]] as const) {
    const args = structuredClone(base); args.latestReport!.stats.appearances = appearances
    args.latestReport!.contract!.actualRole = role
    expect(selectTransferCandidates(args, [low])).toHaveLength(count)
  }
})
afterAll(() => { record('e03-directions', newE03); record('boundaries', boundaries); record('scarcity', scarcity) })
