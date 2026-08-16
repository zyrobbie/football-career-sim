import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const seedControl = vi.hoisted(() => ({ current: 'uninitialized-career-seed' }))
vi.mock('../engine/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/random')>()
  return { ...actual, createCareerSeed: () => seedControl.current }
})

import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import { eligibleCareerEventChoices, getCareerEvent } from '../engine/careerEvents'
import { playerAgeAtWindow, shouldRetireAtContractExpiry } from '../engine/careerTime'
import { buildRetirementSummary, type RetirementSummary } from '../engine/careerSummary'
import type { FirstTeamRole, GameState, OverseasIntent, Position, PreferredFoot, TrainingFocus, TransferOffer } from '../models/game'
import { useGameStore } from './gameStore'

type MarketPolicy = 'STAY_FIRST' | 'PLATFORM_FIRST' | 'PLAYING_TIME_FIRST'
type TrainingPolicy = 'BALANCED_STEADY' | 'POSITION_FOCUS' | 'PHYSICAL_PROTECTION'
interface CareerAuditScenario { seed: string; primaryPosition: Position; secondaryPosition: Position; preferredFoot: PreferredFoot; intent: OverseasIntent; preferredLeagues: string[]; marketPolicy: MarketPolicy; trainingPolicy: TrainingPolicy }
interface CareerAuditResult { scenario: CareerAuditScenario; game: GameState; actionCount: number; maxWindowIndex: number; retirementSummary: RetirementSummary; eventCount: number; eventCountsById: Record<string, number>; interactionKindCounts: Record<string, number>; transferCount: number; renewalCount: number; freeTransferCount: number; stayCount: number; clubIds: string[]; tierWindows: Record<string, number> }

const baseScenarios: readonly Omit<CareerAuditScenario, 'seed'>[] = [
  { primaryPosition: 'ST', secondaryPosition: 'CAM', preferredFoot: 'RIGHT', intent: 'STRONG', preferredLeagues: ['意大利'], marketPolicy: 'STAY_FIRST', trainingPolicy: 'BALANCED_STEADY' },
  { primaryPosition: 'LW', secondaryPosition: 'RW', preferredFoot: 'LEFT', intent: 'CONDITIONAL', preferredLeagues: ['英格兰'], marketPolicy: 'PLATFORM_FIRST', trainingPolicy: 'POSITION_FOCUS' },
  { primaryPosition: 'CAM', secondaryPosition: 'CM', preferredFoot: 'RIGHT', intent: 'DOMESTIC', preferredLeagues: [], marketPolicy: 'PLAYING_TIME_FIRST', trainingPolicy: 'PHYSICAL_PROTECTION' },
  { primaryPosition: 'LM', secondaryPosition: 'RM', preferredFoot: 'LEFT', intent: 'STRONG', preferredLeagues: ['西班牙'], marketPolicy: 'STAY_FIRST', trainingPolicy: 'POSITION_FOCUS' },
  { primaryPosition: 'CM', secondaryPosition: 'CDM', preferredFoot: 'RIGHT', intent: 'CONDITIONAL', preferredLeagues: ['德国'], marketPolicy: 'PLATFORM_FIRST', trainingPolicy: 'PHYSICAL_PROTECTION' },
  { primaryPosition: 'CDM', secondaryPosition: 'CM', preferredFoot: 'LEFT', intent: 'DOMESTIC', preferredLeagues: [], marketPolicy: 'PLAYING_TIME_FIRST', trainingPolicy: 'BALANCED_STEADY' },
  { primaryPosition: 'LB', secondaryPosition: 'RB', preferredFoot: 'LEFT', intent: 'STRONG', preferredLeagues: ['法国'], marketPolicy: 'STAY_FIRST', trainingPolicy: 'PHYSICAL_PROTECTION' },
  { primaryPosition: 'CB', secondaryPosition: 'CDM', preferredFoot: 'RIGHT', intent: 'CONDITIONAL', preferredLeagues: ['荷兰'], marketPolicy: 'PLATFORM_FIRST', trainingPolicy: 'BALANCED_STEADY' },
  { primaryPosition: 'ST', secondaryPosition: 'LW', preferredFoot: 'LEFT', intent: 'DOMESTIC', preferredLeagues: [], marketPolicy: 'PLAYING_TIME_FIRST', trainingPolicy: 'POSITION_FOCUS' },
  { primaryPosition: 'RW', secondaryPosition: 'LW', preferredFoot: 'RIGHT', intent: 'STRONG', preferredLeagues: ['英格兰'], marketPolicy: 'STAY_FIRST', trainingPolicy: 'BALANCED_STEADY' },
  { primaryPosition: 'CM', secondaryPosition: 'CAM', preferredFoot: 'LEFT', intent: 'CONDITIONAL', preferredLeagues: ['意大利'], marketPolicy: 'PLATFORM_FIRST', trainingPolicy: 'POSITION_FOCUS' },
  { primaryPosition: 'CB', secondaryPosition: 'LB', preferredFoot: 'RIGHT', intent: 'DOMESTIC', preferredLeagues: [], marketPolicy: 'PLAYING_TIME_FIRST', trainingPolicy: 'PHYSICAL_PROTECTION' },
]
const scenarios = baseScenarios.flatMap((scenario, index) => [0, 1, 2].map((variant) => ({ ...scenario, seed: `full-career-${index}-${variant}` })))
const firstTeamRoleRank: Record<FirstTeamRole, number> = { FRINGE: 0, SUBSTITUTE: 1, ROTATION: 2, STARTER: 3, CORE: 4 }
let transitionCounts = { permanent: 0, renewal: 0, free: 0, stay: 0 }

function numeric(value: number, label: string) { expect(Number.isFinite(value), label).toBe(true); expect(value, label).toBeGreaterThanOrEqual(0) }
function assertState(game: GameState) {
  if (game.selectedClubId) expect(getClubParametersByCompatibleId(game.selectedClubId)).not.toBeNull()
  if (game.player) {
    for (const [key, value] of Object.entries(game.player.attributes)) { numeric(value, `attribute ${key}`); expect(value).toBeLessThanOrEqual(game.player.potentials[key as keyof typeof game.player.potentials]) }
    for (const [key, value] of Object.entries(game.player.potentials)) { numeric(value, `potential ${key}`); expect(value).toBeLessThanOrEqual(100) }
  }
  if (game.contract) {
    expect(game.contract.remainingHalfYears).toBeGreaterThanOrEqual(0); expect(game.contract.clubId).toBe(game.selectedClubId); expect(game.firstTeamProgress.clubId).toBe(game.selectedClubId); expect(game.careerStory.club.clubId).toBe(game.selectedClubId)
    if (playerAgeAtWindow(game.windowIndex) >= 22) expect(game.contract.promisedTeamLevel).not.toBe('YOUTH')
  }
  if (game.phase === 'HALF_YEAR_PLAN' && game.contract && playerAgeAtWindow(game.windowIndex) >= 18) expect(game.contract.remainingHalfYears).toBeGreaterThan(0)
  const age = playerAgeAtWindow(game.windowIndex)
  expect(age).toBeLessThanOrEqual(40)
  if (age === 40) expect(['PRO_CONTRACT_OFFER', 'PRO_CONTRACT_COMPLETE', 'TRANSFER_WINDOW', 'TRANSFER_ARRIVAL']).not.toContain(game.phase)
  const external = game.transferOffers.filter((offer) => offer.clubId !== game.selectedClubId)
  expect(new Set(game.transferOffers.map((offer) => offer.id)).size).toBe(game.transferOffers.length); expect(new Set(external.map((offer) => offer.clubId)).size).toBe(external.length)
  for (const entry of game.history) expect(getClubParametersByCompatibleId(entry.clubId)).not.toBeNull()
  const eventKeys = game.careerEventHistory.map((event) => `${event.windowIndex}:${event.eventId}`); expect(new Set(eventKeys).size).toBe(eventKeys.length)
}
function fingerprint(game: GameState) { return JSON.stringify([game.phase, game.windowIndex, game.pendingCareerEvent?.eventId, game.pendingCareerEvent?.stepIndex, game.pendingCareerEvent?.variantId, game.pendingCareerEvent?.selections, game.selectedTransferChoiceId, game.transferDecision, game.contract?.remainingHalfYears, game.history.length]) }
function parametersFor(offer: TransferOffer) { const parameters = getClubParametersByCompatibleId(offer.clubId); if (!parameters) throw new Error(`Unknown transfer club ${offer.clubId}`); return parameters }
function chooseTransferOffer(game: GameState, scenario: CareerAuditScenario): 'STAY' | string {
  const available = game.transferOffers.filter((offer) => !offer.withdrawn); const external = available.filter((offer) => offer.clubId !== game.selectedClubId)
  if (scenario.marketPolicy === 'STAY_FIRST') {
    if ((game.contract?.remainingHalfYears ?? 0) > 0) return 'STAY'
    return available.find((offer) => offer.type === 'RENEWAL' && offer.clubId === game.selectedClubId)?.id ?? [...external].sort((a, b) => a.clubId.localeCompare(b.clubId))[0]!.id
  }
  return [...(external.length ? external : available)].sort((a, b) => {
    const aClub = parametersFor(a); const bClub = parametersFor(b)
    if (scenario.marketPolicy === 'PLAYING_TIME_FIRST') {
      const aFirst = a.promisedTeamLevel === 'FIRST_TEAM' ? 1 : 0; const bFirst = b.promisedTeamLevel === 'FIRST_TEAM' ? 1 : 0
      if (aFirst !== bFirst) return bFirst - aFirst
      const aRole = a.promisedTeamLevel === 'FIRST_TEAM' && a.promisedRole ? firstTeamRoleRank[a.promisedRole as FirstTeamRole] : -1; const bRole = b.promisedTeamLevel === 'FIRST_TEAM' && b.promisedRole ? firstTeamRoleRank[b.promisedRole as FirstTeamRole] : -1
      if (aRole !== bRole) return bRole - aRole
    }
    if (aClub.platformTier !== bClub.platformTier) return aClub.platformTier - bClub.platformTier
    if (scenario.marketPolicy === 'PLATFORM_FIRST') { if (aClub.exposure !== bClub.exposure) return bClub.exposure - aClub.exposure; if (aClub.facility !== bClub.facility) return bClub.facility - aClub.facility; if (aClub.academy !== bClub.academy) return bClub.academy - aClub.academy }
    return a.clubId.localeCompare(b.clubId)
  })[0]!.id
}
function trainingFor(game: GameState, scenario: CareerAuditScenario): { focus: TrainingFocus; approach: 'STEADY' | 'TEAM_FIRST' | null } {
  if (game.windowIndex < 2) return { focus: 'BALANCED', approach: null }
  if (scenario.trainingPolicy === 'BALANCED_STEADY') return { focus: 'BALANCED', approach: 'STEADY' }
  if (scenario.trainingPolicy === 'PHYSICAL_PROTECTION') return { focus: 'physical', approach: 'TEAM_FIRST' }
  if (['ST', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(scenario.primaryPosition)) return { focus: 'attack', approach: 'STEADY' }
  if (['CDM', 'LB', 'RB', 'CB'].includes(scenario.primaryPosition)) return { focus: 'defense', approach: 'STEADY' }
  return { focus: 'mental', approach: 'STEADY' }
}
function driveCareer(scenario: CareerAuditScenario): CareerAuditResult {
  seedControl.current = scenario.seed; const store = () => useGameStore.getState(); let actionCount = 0; let maxWindowIndex = 0
  const action = (label: string, run: () => void) => { const before = fingerprint(store().game!); run(); actionCount += 1; const state = store(); if (state.error) throw new Error(`audit action=${label} error=${state.error} before=${before} after=${fingerprint(state.game!)}`); if (before === fingerprint(state.game!)) throw new Error(`audit action=${label} made no progress: ${before}`) }
  store().startNewCareer(); expect(store().game?.careerSeed).toBe(scenario.seed); expect(store().game?.startYear).toBe(2026)
  store().submitIdentity({ name: `审计${scenario.seed.slice(-3)}`, jerseyNumber: 8, preferredFoot: scenario.preferredFoot }); store().submitPosition(scenario.primaryPosition, scenario.secondaryPosition); store().submitPriorities(['PLAYING_TIME', 'COMPETITIVE_LEVEL', 'STABILITY', 'SALARY']); store().submitPreferences(scenario.intent, scenario.preferredLeagues); store().confirmPlayer()
  expect(store().game?.draft.preferredFoot).toBe(scenario.preferredFoot); expect(store().game?.draft.overseasIntent).toBe(scenario.intent)
  for (let steps = 0; steps < 1000; steps += 1) {
    const game = store().game!; maxWindowIndex = Math.max(maxWindowIndex, game.windowIndex); assertState(game)
    if (game.phase === 'CAREER_RETIRED') {
      const retirementSummary = buildRetirementSummary(game); for (const value of [retirementSummary.age, retirementSummary.finalOverall, retirementSummary.peakOverall, retirementSummary.potentialOverall, retirementSummary.finalMarketValueEuro, retirementSummary.peakMarketValueEuro, retirementSummary.evaluation.completedPoints]) numeric(value, 'retirement summary')
      const eventCountsById = game.careerEventHistory.reduce<Record<string, number>>((counts, event) => ({ ...counts, [event.eventId]: (counts[event.eventId] ?? 0) + 1 }), {}); const interactionKindCounts = game.careerEventHistory.reduce<Record<string, number>>((counts, event) => { const kind = getCareerEvent(event.eventId).interactionKind; return { ...counts, [kind]: (counts[kind] ?? 0) + 1 } }, {}); const tierWindows = game.history.reduce<Record<string, number>>((counts, entry) => { const tier = getClubParametersByCompatibleId(entry.clubId)?.platformTier; return { ...counts, [`T${tier}`]: (counts[`T${tier}`] ?? 0) + 1 } }, {})
      return { scenario, game, actionCount, maxWindowIndex, retirementSummary, eventCount: game.careerEventHistory.length, eventCountsById, interactionKindCounts, transferCount: transitionCounts.permanent, renewalCount: transitionCounts.renewal, freeTransferCount: transitionCounts.free, stayCount: transitionCounts.stay, clubIds: [...new Set(game.history.map((entry) => entry.clubId))], tierWindows }
    }
    switch (game.phase) {
      case 'ACADEMY_OFFERS': action('selectAcademy', () => store().selectAcademy(game.academyOffers[steps % game.academyOffers.length]!.club.id)); break
      case 'ARRIVAL_EVENT': action('chooseArrival', () => store().chooseArrival((['COACH', 'TEAMMATES', 'OPEN_DAY'] as const)[steps % 3]!)); break
      case 'HALF_YEAR_PLAN': { const training = trainingFor(game, scenario); action('chooseTraining', () => store().chooseTraining(training.focus, training.approach)); break }
      case 'SPECIAL_EVENT': { const pending = game.pendingCareerEvent!; const event = getCareerEvent(pending.eventId); const eligible = eligibleCareerEventChoices(game, event); const route = event.setup?.options.find((option) => option.id === pending.variantId); const choices = event.setup && pending.stepIndex === 0 ? event.setup.options.filter((option) => option.choiceIds.some((id) => eligible.some((choice) => choice.id === id))).map((option) => option.id) : eligible.filter((choice) => !route || route.choiceIds.includes(choice.id)).map((choice) => choice.id); if (!choices.length) throw new Error(`no eligible event option seed=${scenario.seed} window=${game.windowIndex} event=${event.id} kind=${pending.interactionKind} eligible=${eligible.map((choice) => choice.id)}`); const choice = choices[steps % choices.length]!; if (route) expect(route.choiceIds).toContain(choice); if (!route && !(event.setup && pending.stepIndex === 0)) expect(eligible.map((option) => option.id)).toContain(choice); action('chooseCareerEvent', () => store().chooseCareerEvent(choice)); break }
      case 'SPECIAL_EVENT_RESULT': action('continueAfterCareerEvent', () => store().continueAfterCareerEvent()); break
      case 'HALF_YEAR_REPORT': action('advanceAfterReport', () => store().advanceAfterReport()); break
      case 'CAREER_DASHBOARD': action('openProfessionalContract', () => store().openProfessionalContract()); break
      case 'PRO_CONTRACT_OFFER': action('acceptProfessionalContract', () => store().acceptProfessionalContract()); break
      case 'PRO_CONTRACT_COMPLETE': action('startProfessionalCareer', () => store().startProfessionalCareer()); break
      case 'PRO_STAGE_COMPLETE': if (game.windowIndex >= 55) action('requestRetirement', () => store().requestRetirement()); else { store().openTransferWindow(); if (store().game?.phase === 'PRO_STAGE_COMPLETE') { const finalYear = store().error === '职业生涯最后一年不再开启新的合同或转会谈判。'; const normalNoMarket = store().error === '本窗口没有新的转会机会。' || store().error?.startsWith('经纪团队正在持续观察市场。') || store().error?.startsWith('本阶段表现尚未吸引到合适报价。'); if (finalYear) { expect(store().game?.contract?.remainingHalfYears).toBeGreaterThan(0); store().clearError(); action('continueProfessionalCareerInFinalYear', () => store().continueProfessionalCareer()) } else { if (!normalNoMarket || game.contract?.remainingHalfYears === 0) throw new Error(`unexpected market result seed=${scenario.seed} error=${store().error}`); store().clearError(); action('continueProfessionalCareer', () => store().continueProfessionalCareer()) } } }; break
      case 'TRANSFER_WINDOW': { const selected = chooseTransferOffer(game, scenario); if (game.selectedTransferChoiceId !== selected) action('selectTransferChoice', () => store().selectTransferChoice(selected)); const offer = store().game!.transferOffers.find((candidate) => candidate.id === selected); action('confirmTransferChoice', () => store().confirmTransferChoice()); if (selected === 'STAY') transitionCounts.stay += 1; else if (offer?.type === 'RENEWAL') transitionCounts.renewal += 1; else if (offer?.type === 'FREE_TRANSFER') transitionCounts.free += 1; else transitionCounts.permanent += 1; break }
      case 'TRANSFER_ARRIVAL': action('chooseTransferArrival', () => store().chooseTransferArrival('NONE')); break
      case 'TRANSFER_STAGE_COMPLETE': action('continueAfterTransfer', () => store().continueAfterTransfer()); break
      case 'RETIREMENT_DECISION': action('confirmRetirement', () => store().confirmRetirement()); break
      default: throw new Error(`audit stalled seed=${scenario.seed} window=${game.windowIndex} phase=${game.phase}`)
    }
  }
  throw new Error(`audit exceeded action limit seed=${scenario.seed} phase=${store().game?.phase} window=${store().game?.windowIndex}`)
}
function resetStore() { useGameStore.setState({ game: null, hasSave: false, error: null }); transitionCounts = { permanent: 0, renewal: 0, free: 0, stay: 0 } }
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-16T00:00:00Z')); resetStore() })
afterEach(() => { vi.useRealTimers() })
function deterministicSummary(result: CareerAuditResult) { return { seed: result.game.careerSeed, phase: result.game.phase, retirementReason: result.game.retirementReason, actionCount: result.actionCount, history: result.game.history, nationalTeam: result.game.nationalTeam, eventHistory: result.game.careerEventHistory, cashEuro: result.game.cashEuro, summary: result.retirementSummary, transfers: { stay: result.stayCount, renewal: result.renewalCount, permanent: result.transferCount, free: result.freeTransferCount } } }
function mean(values: number[]) { return Math.round(values.reduce((total, value) => total + value, 0) / values.length * 100) / 100 }
function median(values: number[]) { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2 }
function countBy<T extends string>(values: T[]) { return Object.fromEntries([...new Set(values)].sort().map((key) => [key, values.filter((value) => value === key).length])) }
function auditSummary(results: CareerAuditResult[]) {
  const summaries = results.map((result) => result.retirementSummary); const histories = results.flatMap((result) => result.game.history); const allHonors = summaries.flatMap((summary) => summary.honors); const allParameters = histories.map((entry) => getClubParametersByCompatibleId(entry.clubId)!)
  const peaks = summaries.map((summary) => summary.peakOverall); const finals = summaries.map((summary) => summary.finalOverall); const actions = results.map((result) => result.actionCount)
  const eventCounts = results.flatMap((result) => Object.entries(result.eventCountsById).flatMap(([id, count]) => Array.from({ length: count }, () => id)))
  const overseas = histories.filter((entry) => getClubParametersByCompatibleId(entry.clubId)?.country !== '中国').length
  const fiveCountries = new Set(['英格兰', '西班牙', '意大利', '德国', '法国'])
  const individualTypes = ['GOLDEN_BOOT', 'TEAM_OF_SEASON', 'LEAGUE_PLAYER_OF_YEAR', 'BALLON_DOR'] as const
  const marketPolicies = Object.fromEntries([...new Set(results.map((result) => result.scenario.marketPolicy))].sort().map((value) => { const scoped = results.filter((result) => result.scenario.marketPolicy === value); return [value, { careers: scoped.length, averagePermanentTransfers: mean(scoped.map((result) => result.transferCount)), averageFreeTransfers: mean(scoped.map((result) => result.freeTransferCount)), averageRenewals: mean(scoped.map((result) => result.renewalCount)), averageClubs: mean(scoped.map((result) => result.retirementSummary.clubCount)), averageAppearances: mean(scoped.map((result) => result.retirementSummary.seniorTotals.appearances)), averagePeakOverall: mean(scoped.map((result) => result.retirementSummary.peakOverall)), bestPlatformTier: Math.min(...scoped.flatMap((result) => Object.keys(result.tierWindows).map((tier) => Number(tier.slice(1))))) }] }))
  const trainingPolicies = Object.fromEntries([...new Set(results.map((result) => result.scenario.trainingPolicy))].sort().map((value) => { const scoped = results.filter((result) => result.scenario.trainingPolicy === value); return [value, { careers: scoped.length, averagePotentialOverall: mean(scoped.map((result) => result.retirementSummary.potentialOverall)), averagePeakOverall: mean(scoped.map((result) => result.retirementSummary.peakOverall)), averageFinalOverall: mean(scoped.map((result) => result.retirementSummary.finalOverall)), averageFulfillmentPercent: mean(scoped.map((result) => result.retirementSummary.fulfillmentPercent)), averageAppearances: mean(scoped.map((result) => result.retirementSummary.seniorTotals.appearances)), atLeast80: scoped.filter((result) => result.retirementSummary.peakOverall >= 80).length, atLeast85: scoped.filter((result) => result.retirementSummary.peakOverall >= 85).length, atLeast90: scoped.filter((result) => result.retirementSummary.peakOverall >= 90).length }] }))
  return {
    completed: results.length, failed: 0, seeds: results.map((result) => result.scenario.seed), actionCounts: { min: Math.min(...actions), max: Math.max(...actions), average: mean(actions), median: median(actions) }, windows: countBy(results.map((result) => String(result.maxWindowIndex))), retirement: { ages: countBy(summaries.map((summary) => String(summary.age))), reasons: countBy(results.map((result) => result.game.retirementReason!)) }, potentialBands: { '65-68': summaries.filter((summary) => summary.potentialOverall <= 68).length, '69-75': summaries.filter((summary) => summary.potentialOverall >= 69 && summary.potentialOverall <= 75).length, '76-82': summaries.filter((summary) => summary.potentialOverall >= 76 && summary.potentialOverall <= 82).length, '83-88': summaries.filter((summary) => summary.potentialOverall >= 83 && summary.potentialOverall <= 88).length, '89-94': summaries.filter((summary) => summary.potentialOverall >= 89).length }, peakOverall: { min: Math.min(...peaks), max: Math.max(...peaks), average: mean(peaks), median: median(peaks), atLeast80: peaks.filter((value) => value >= 80).length, atLeast85: peaks.filter((value) => value >= 85).length, atLeast90: peaks.filter((value) => value >= 90).length, peakAges: countBy(summaries.map((summary) => String(summary.peakAge))) }, retirementOverall: { min: Math.min(...finals), max: Math.max(...finals), average: mean(finals), median: median(finals) }, windowsByTeam: countBy(histories.map((entry) => entry.teamLevel)), seniorTotals: { appearances: summaries.reduce((total, summary) => total + summary.seniorTotals.appearances, 0), goals: summaries.reduce((total, summary) => total + summary.seniorTotals.goals, 0), assists: summaries.reduce((total, summary) => total + summary.seniorTotals.assists, 0) }, nationalTeam: { selected: summaries.filter((summary) => summary.nationalTeam.appearances > 0).length, appearances: summaries.reduce((total, summary) => total + summary.nationalTeam.appearances, 0), goals: summaries.reduce((total, summary) => total + summary.nationalTeam.goals, 0), assists: summaries.reduce((total, summary) => total + summary.nationalTeam.assists, 0) }, transitions: { permanent: results.reduce((total, result) => total + result.transferCount, 0), renewal: results.reduce((total, result) => total + result.renewalCount, 0), free: results.reduce((total, result) => total + result.freeTransferCount, 0), stay: results.reduce((total, result) => total + result.stayCount, 0), averageClubs: mean(summaries.map((summary) => summary.clubCount)) }, tierWindows: countBy(allParameters.map((parameters) => `T${parameters.platformTier}`)), coverage: { clubs: new Set(histories.map((entry) => entry.clubId)).size, countries: new Set(allParameters.map((parameters) => parameters.country)).size, leagues: new Set(allParameters.map((parameters) => parameters.league)).size, domesticWindows: histories.length - overseas, fiveLeagueWindows: histories.filter((entry) => fiveCountries.has(getClubParametersByCompatibleId(entry.clubId)?.country ?? '')).length, otherOverseasWindows: histories.filter((entry) => { const country = getClubParametersByCompatibleId(entry.clubId)?.country; return country !== '中国' && !fiveCountries.has(country ?? '') }).length }, honors: { team: allHonors.filter((honor) => honor.scope !== 'INDIVIDUAL').length, individual: Object.fromEntries(individualTypes.map((type) => [type, allHonors.filter((honor) => honor.type === type).length])) }, tags: { total: summaries.reduce((total, summary) => total + summary.tags.length, 0), evaluations: countBy(summaries.map((summary) => String(summary.evaluation.completedPoints))) }, events: { total: eventCounts.length, interactionKinds: countBy(results.flatMap((result) => Object.entries(result.interactionKindCounts).flatMap(([kind, count]) => Array.from({ length: count }, () => kind)))), mostRepeated: Object.entries(countBy(eventCounts)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? null }, policies: { market: marketPolicies, training: trainingPolicies } }
}
describe('36 full public gameStore career audits', () => { it.each(scenarios)('$seed · $primaryPosition · $intent · $marketPolicy · $trainingPolicy', (scenario) => { const result = driveCareer(scenario); expect(result.game.phase).toBe('CAREER_RETIRED'); expect(result.game.retirementReason).toBe('AGE_LIMIT'); expect([39, 40]).toContain(result.retirementSummary.age); if (result.retirementSummary.age === 39) { expect(result.game.contract?.remainingHalfYears).toBe(0); expect(shouldRetireAtContractExpiry(result.game.windowIndex)).toBe(true) }; expect(useGameStore.getState().error).toBeNull(); expect(result.actionCount).toBeLessThan(1000) }) })
describe('full-career audit determinism', () => { const selected = [scenarios[0]!, scenarios[4]!, scenarios[8]!, scenarios[13]!, scenarios[19]!, scenarios[25]!]; it.each(selected)('replays $seed exactly', (scenario) => { const first = driveCareer(scenario); resetStore(); const second = driveCareer(scenario); expect(deterministicSummary(second)).toEqual(deterministicSummary(first)) }) })
describe('full-career audit aggregate', () => { it('emits stable statistics from all 36 completed careers', () => { const results = scenarios.map((scenario) => { resetStore(); return driveCareer(scenario) }); const summary = auditSummary(results); expect(summary.completed).toBe(36); expect(summary.retirement.reasons).toEqual({ AGE_LIMIT: 36 }); expect(summary.retirement.ages['40']).toBeGreaterThan(0); console.info(`FULL_CAREER_AUDIT_JSON=${JSON.stringify(summary)}`) }, 30_000) })
