import { afterEach, afterAll, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import type { Club } from '../../models/game'
// Isolated test dependency control; the production catalog and generator API are unchanged.
const control = vi.hoisted(() => ({ ids: null as string[] | null }))
vi.mock('../../data/balance', async original => {
  const actual = await original<typeof import('../../data/balance')>()
  return {
    ...actual,
    get CLUBS() { return control.ids === null ? actual.CLUBS : actual.CLUBS.filter(c => control.ids!.includes(c.id)) },
    get DOMESTIC_CLUBS() { return control.ids === null ? actual.DOMESTIC_CLUBS : actual.DOMESTIC_CLUBS.filter(c => control.ids!.includes(c.id)) },
  }
})
import { CLUBS } from '../../data/balance'
import { generateTransferOffers, generateContractExpiryOffers } from '../transfers'
const all = [...CLUBS]
const source = JSON.parse(readFileSync('docs/evidence/CEU-20260907/M-01/generated-r4/boundaries.json', 'utf8'))
const regular = source.find((r: { path: string; ovr: number; intent: string }) => r.path === 'expiry' && r.ovr === 85 && r.intent === 'CONDITIONAL')
const rescue = source.find((r: { path: string; ovr: number; intent: string }) => r.path === 'rescue' && r.ovr === 79 && r.intent === 'CONDITIONAL')
const domestic = all.filter(c => c.country === '中国' && c.profile === 'ELITE').slice(0, 2)
const overseas = all.filter(c => c.country !== '中国' && c.tier <= 2 && c.id !== regular.currentClubId).slice(0, 2)
const results: unknown[] = []
afterEach(() => { control.ids = null })
const pools = [
  { name: 'empty-adult-catalog', clubs: [], count: 0 },
  { name: 'one-domestic', clubs: [domestic[0]!], count: 1 },
  { name: 'two-domestic-no-overseas', clubs: domestic, count: 2 },
  { name: 'only-overseas', clubs: overseas, count: 2 },
  { name: 'one-each-region', clubs: [domestic[0]!, overseas[0]!], count: 2 },
]
it.each(pools)('connects $name to the public generator and expiry wrapper at signing age', row => {
  const args = structuredClone(regular.input)
  const expiryArgs = { ...args, currentRole: 'STARTER' as const, currentContract: regular.expiryContract }
  const originalRenewal = generateContractExpiryOffers(expiryArgs)[0]
  control.ids = [args.currentClubId, ...row.clubs.map(c => c.id)]
  const direct = generateTransferOffers(args)
  const expired = generateContractExpiryOffers(expiryArgs)
  expect(direct).toHaveLength(row.count)
  expect(expired).toHaveLength(row.count + 1)
  expect(expired[0]).toEqual(originalRenewal)
  expect(expired.slice(1)).toEqual(direct.map(o => ({ ...o, id: `free-${args.windowIndex}-${o.clubId}`, type: 'FREE_TRANSFER', transferFeeEuro: 0 })))
  expect(new Set(direct.map(o => o.clubId))).toEqual(new Set(row.clubs.map(c => c.id)))
  expect(generateTransferOffers(args)).toEqual(direct)
  results.push({ source: 'isolated balance module catalog subset, existing real IDs; no production data changes', name: row.name, input: args, candidateCatalog: row.clubs.map(c => c.id), expectedExternal: row.count, direct, expired })
})
it.each([0, 1, 2])('connects %s role-improving rescue candidates to the public generator and expiry', count => {
  const args = structuredClone(rescue.input)
  const clubs = domestic.slice(0, count)
  control.ids = [args.currentClubId, ...clubs.map(c => c.id)]
  const direct = generateTransferOffers(args)
  expect(direct).toHaveLength(count)
  expect(direct.every(o => o.promisedTeamLevel === 'FIRST_TEAM' && o.promisedRole !== 'FRINGE')).toBe(true)
  const expired = generateContractExpiryOffers({ ...args, currentRole: 'FRINGE', currentContract: regular.expiryContract })
  expect(expired).toHaveLength(count + 1)
  expect(expired.slice(1)).toEqual(direct.map(o => ({ ...o, id: `free-${args.windowIndex}-${o.clubId}`, type: 'FREE_TRANSFER', transferFeeEuro: 0 })))
  results.push({ source: 'constructed elite rescue input plus isolated catalog subset', name: `rescue-improving-${count}`, input: args, candidateCatalog: clubs.map((c: Club) => c.id), expectedExternal: count, direct, expired })
})
it('returns no rescue offers when real generated promises do not improve the role', () => {
  const args = structuredClone(rescue.input)
  args.player.attributes = { attack: 30, defense: 30, physical: 30, mental: 30 }
  const target = all.find(c => c.country !== '中国' && c.tier === 1 && c.id !== args.currentClubId)!
  control.ids = [args.currentClubId, target.id]
  expect(generateTransferOffers(args)).toEqual([])
  results.push({ source: 'constructed low-ability elite rescue input, real promise calculation', name: 'rescue-no-improved-promises', input: args, candidateCatalog: [target.id], expectedExternal: 0, direct: [] })
})
afterAll(() => { if (process.env.CEU_M02_EVIDENCE === '1') writeFileSync('docs/evidence/CEU-20260907/M-02/pool-connections.json', JSON.stringify(results, null, 2) + '\n', { flag: 'wx' }) })

it('preserves scarce expiry markets under the R1 persistence contract', async () => {
  const { validateGameState } = await import('../../persistence/save')
  const old = JSON.parse(readFileSync('docs/evidence/CEU-20260907/M-01/generated-r4/fixtures/expiry.json', 'utf8')).data
  for (const externalCount of [0, 1, 2]) {
    const clubs = all.filter(c => c.id !== old.selectedClubId).slice(0, externalCount)
    control.ids = [old.selectedClubId, ...clubs.map(c => c.id)]
    const offers = generateContractExpiryOffers({ player: old.player, currentClubId: old.selectedClubId, currentTeamLevel: old.teamLevel, currentRole: old.firstTeamRole ?? old.youthRole, currentContract: old.contract, latestReport: old.lastReport, careerSeed: old.careerSeed, windowIndex: old.windowIndex })
    expect(offers).toHaveLength(externalCount + 1)
    const constructed = { ...old, transferOffers: offers, selectedTransferChoiceId: offers[0]!.id }
    const normalized = validateGameState(constructed)
    expect(normalized).toEqual(constructed)
    results.push({ name: `existing-persistence-scarcity-${externalCount}`, source: 'explicit constructed expiry output under isolated catalog', constructed, normalized, status: 'R1 validation preserves complete market; public save/load/signing covered in gameStore.ceuM02R1.test.ts' })
  }
})
