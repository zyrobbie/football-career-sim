import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { installTestStorage } from '../testing/keyMatchMomentTestSupport'
const seedControl = vi.hoisted(() => ({ current: 'FUNV3-uninitialized' }))
vi.mock('../engine/random', async (original) => ({ ...await original<typeof import('../engine/random')>(), createCareerSeed: () => seedControl.current }))
import { SECONDARY_POSITIONS } from '../data/balance'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import { eligibleCareerEventChoices, getCareerEvent } from '../engine/careerEvents'
import { playerAgeAtWindow } from '../engine/careerTime'
import { buildRetirementSummary } from '../engine/careerSummary'
import { halfYearDisposableIncome, cashReserveLimit } from '../engine/finance'
import { loadGame, saveGame } from '../persistence/save'
import type { DevelopmentApproach, FirstTeamRole, GameState, Position, TrainingFocus, TransferOffer } from '../models/game'
import type { ArrangementWindowReceipt, PersonalArrangementCategory } from '../models/personalArrangements'
import { useGameStore } from './gameStore'

// The reference runner rewrites only old-module import paths to the read-only
// archived V2.5 tree. New modules are never loaded in its BASELINE branch.
const BASELINE = process.env.FUNV3_BASELINE === '1'
const v3 = BASELINE ? null : await import('../engine/personalArrangements')
const entertainment = BASELINE ? null : await import('../engine/entertainmentV3')
const preparation = BASELINE ? null : await import('../engine/simulationPreparation')
const CAPTURE = process.env.FUNV3_CAPTURE === '1'
const SUITE = process.env.FUNV3_SUITE ?? 'all'
const OUT = resolve(process.env.FUNV3_CAPTURE_DIR ?? 'outputs/FUN-V3-20261023/balance/current')
const REFERENCE_PATH = resolve(process.env.FUNV3_BASELINE_FILE ?? 'docs/evidence/FUN-V3-20261023/balance/baseline-business-projections.json')
const reference: { runs: Record<string, ReferenceRun> } | null = !BASELINE && existsSync(REFERENCE_PATH) ? JSON.parse(readFileSync(REFERENCE_PATH, 'utf8')) : null
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value
const sha = (value: unknown) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex')
const clone = <T,>(value: T): T => structuredClone(value)
const positions: Position[] = ['ST', 'LW', 'RW', 'CAM', 'LM', 'RM', 'CM', 'CDM', 'LB', 'RB', 'CB']
const secondary = Object.fromEntries(positions.map(position => [position, SECONDARY_POSITIONS[position][0]!])) as Record<Position, Position>
type Group = 'OFF' | 'ON_FREE' | 'ON_FIXED_BODY' | 'ON_SITUATIONAL' | 'BASELINE' | 'CASH_CAP_BODY' | 'CASH_UNCAPPED_BODY' | 'CASH_CAP_FREE' | 'CASH_UNCAPPED_FREE'
type Scenario = { seed: string; index: number; position: Position; market: 'STAY_FIRST' | 'PLATFORM_FIRST' | 'PLAYING_TIME_FIRST' }
type Step = { label: string; windowIndex: number; phase: string; businessSHA256: string }
type ReferenceRun = { initialBusinessSHA256: string; prelude: Step[]; steps: Step[]; finalBusinessSHA256: string }
type WindowMetric = {
  windowIndex: number; age: number; clubId: string; teamLevel: string; annualSalaryEuro: number;
  salaryDueEuro: number; salaryActualEuro: number; capLossEuro: number; paymentEuro: number; refundEuro: number;
  balanceEuro: number; otherCashDeltaEuro: number; nextSalaryToSpendRatio: number | null;
  lowStateAtPlan: boolean; recoveryMarker: boolean; states: { form: number; fitness: number; morale: number; squadRelation: number };
  attributes: Record<string, number>; minutes: number; appearances: number; starts: number; goals: number; assists: number;
  injuryWeeks: number; plannedGain: number; actualGain: number; capLossGain: number; arrangementReceipts: ArrangementWindowReceipt[]; preparationAudit: {withoutPaid:{fitness:number;morale:number;squadRelation:number};withPaid:{fitness:number;morale:number;squadRelation:number};attributesUnchanged:boolean;potentialsUnchanged:boolean;keyMomentPreparedChecked:boolean}|null;
  eventId: string | null; eventCategory: string | null; eventChoiceId: string | null;
}
type RunResult = { scenario: Scenario; group: Group; initialBusinessSHA256: string; finalBusinessSHA256: string; actionCount: number; maxWindowIndex: number; windows: WindowMetric[]; steps: Step[]; final: GameState; metrics: ReturnType<typeof metricsFor> }
const longScenarios: Scenario[] = Array.from({ length: 48 }, (_, index) => ({ seed: `FUNV3-LONG-${String(index).padStart(2, '0')}`, index, position: positions[index % positions.length]!, market: (['STAY_FIRST', 'PLATFORM_FIRST', 'PLAYING_TIME_FIRST'] as const)[index % 3]! }))
const cashScenarios = Array.from({ length: 20 }, (_, index): Scenario => ({ seed: `FUNV3-CASH-${String(index).padStart(2, '0')}`, index, position: positions[index % positions.length]!, market: 'STAY_FIRST' }))
const completed: RunResult[] = []
const fixtures: { seed: string; businessSHA256: string; raw: string; source: string }[] = []
const baselineRuns: Record<string, ReferenceRun> = {}
const preludeBySeed = new Map<string, Step[]>()
const selectedIndices = process.env.FUNV3_INDICES?.split(',').map(Number)
const included = (s: Scenario) => !selectedIndices || selectedIndices.includes(s.index)
const roleRank: Record<FirstTeamRole, number> = { FRINGE: 0, SUBSTITUTE: 1, ROTATION: 2, STARTER: 3, CORE: 4 }
const store = () => useGameStore.getState()

function businessProjection(game: GameState) {
  const projected = clone(game) as unknown as Record<string, unknown>
  delete projected.entertainmentV3; delete projected.saveVersion; delete projected.dataVersion
  for (const entry of [projected.lastReport, ...(projected.history as unknown[])]) {
    if (entry && typeof entry === 'object') {
      delete (entry as Record<string, unknown>).personalArrangements
      delete (entry as Record<string, unknown>).offPitchSummary
      delete (entry as Record<string, unknown>).personalArrangementSummary
    }
  }
  return projected
}
function reset(game?: GameState) {
  installTestStorage()
  useGameStore.setState({ game: null, hasSave: false, error: null, isReviewingReport: false, voluntaryRetirementConfirmation: null })
  if (game) { saveGame(game); useGameStore.setState({ game, hasSave: true }) }
}
function trainingFor(game: GameState, scenario: Scenario): { focus: TrainingFocus; approach: DevelopmentApproach | null } {
  if (game.windowIndex < 2) return { focus: 'BALANCED', approach: null }
  if (scenario.index % 3 === 0) return { focus: 'BALANCED', approach: 'STEADY' }
  if (scenario.index % 3 === 2) return { focus: 'physical', approach: 'TEAM_FIRST' }
  return { focus: ['ST', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(scenario.position) ? 'attack' : ['CDM', 'LB', 'RB', 'CB'].includes(scenario.position) ? 'defense' : 'mental', approach: 'STEADY' }
}
function selectOffer(game: GameState, scenario: Scenario): string {
  const available = game.transferOffers.filter(o => !o.withdrawn)
  const external = available.filter(o => o.clubId !== game.selectedClubId)
  if (scenario.market === 'STAY_FIRST') {
    if ((game.contract?.remainingHalfYears ?? 0) > 0) return 'STAY'
    const id = available.find(o => o.type === 'RENEWAL' && o.clubId === game.selectedClubId)?.id ?? [...external].sort((a, b) => a.clubId.localeCompare(b.clubId))[0]?.id
    if (!id) throw new Error(`No contract-expiry choice: ${scenario.seed}/${game.windowIndex}`)
    return id
  }
  const parameters = (o: TransferOffer) => getClubParametersByCompatibleId(o.clubId)!
  const sorted = [...(external.length ? external : available)].sort((a, b) => {
    const ac = parameters(a), bc = parameters(b)
    if (scenario.market === 'PLAYING_TIME_FIRST') {
      const first = Number(b.promisedTeamLevel === 'FIRST_TEAM') - Number(a.promisedTeamLevel === 'FIRST_TEAM')
      if (first) return first
      const ar = a.promisedTeamLevel === 'FIRST_TEAM' && a.promisedRole ? roleRank[a.promisedRole as FirstTeamRole] : -1
      const br = b.promisedTeamLevel === 'FIRST_TEAM' && b.promisedRole ? roleRank[b.promisedRole as FirstTeamRole] : -1
      if (ar !== br) return br - ar
    }
    if (ac.platformTier !== bc.platformTier) return ac.platformTier - bc.platformTier
    if (scenario.market === 'PLATFORM_FIRST') {
      for (const key of ['exposure', 'facility', 'academy'] as const) if (ac[key] !== bc[key]) return bc[key] - ac[key]
    }
    return a.clubId.localeCompare(b.clubId)
  })
  if (!sorted[0]) throw new Error(`No transfer choices: ${scenario.seed}/${game.windowIndex}`)
  return sorted[0].id
}
function maybePurchase(scenario: Scenario, group: Group, act: (label: string, run: () => void) => void, evaluatedYears: Set<number>) {
  if (!v3 || !['ON_FIXED_BODY', 'ON_SITUATIONAL', 'CASH_CAP_BODY', 'CASH_UNCAPPED_BODY'].includes(group)) return
  const game = store().game!
  if (v3.arrangementEligibility(game)) return
  if (group !== 'ON_SITUATIONAL') {
    const year = v3.gameYearAtWindow(game.startYear, game.windowIndex)
    if (evaluatedYears.has(year)) return
    evaluatedYears.add(year)
  }
  let category: PersonalArrangementCategory | null = 'BODY'
  if (group === 'ON_SITUATIONAL') {
    category = game.player!.fitness < 55 ? 'BODY' : game.player!.morale < 55 ? 'MENTAL' : v3.currentArrangementMove(game) && (game.player!.morale < 65 || game.player!.squadRelation < 65) ? 'SETTLE' : null
  }
  if (!category) return
  const reserve = group === 'ON_SITUATIONAL' ? halfYearDisposableIncome(game.contract!.annualSalaryEuro) : 0
  const selection = trainingFor(game, scenario)
  for (const tier of ['PREMIUM', 'PLUS', 'BASIC'] as const) {
    const quote = v3.quotePersonalArrangement(game, category, tier, selection)
    if (!quote.disabledReason && quote.cashAfterEuro >= reserve) {
      const persisted = loadGame()!
      const persistedQuote = v3.quotePersonalArrangement(persisted, category, tier, selection)
      if (persistedQuote.quoteId !== quote.quoteId && CAPTURE) {
        mkdirSync(OUT, {recursive: true})
        writeFileSync(resolve(OUT, `quote-mismatch-${scenario.seed}-${game.windowIndex}.json`), JSON.stringify({group,selection,quote,persistedQuote,game,persisted},null,2)+'\n')
      }
      act('purchasePersonalArrangement', () => store().purchasePersonalArrangement(quote.request)); return
    }
  }
}
function nextAction(scenario: Scenario, group: Group, act: (label: string, run: () => void) => void, evaluatedYears: Set<number>) {
  const game = store().game!
  switch (game.phase) {
    case 'ACADEMY_OFFERS': act('selectAcademy', () => store().selectAcademy(game.academyOffers[scenario.index % game.academyOffers.length]!.club.id)); break
    case 'ARRIVAL_EVENT': act('chooseArrival', () => store().chooseArrival('COACH')); break
    case 'HALF_YEAR_PLAN': {
      maybePurchase(scenario, group, act, evaluatedYears)
      const training = trainingFor(store().game!, scenario)
      act('chooseTraining', () => store().chooseTraining(training.focus, training.approach)); break
    }
    case 'SPECIAL_EVENT': {
      const pending = game.pendingCareerEvent!, event = getCareerEvent(pending.eventId, game)
      const eligible = eligibleCareerEventChoices(game, event)
      const route = event.setup?.options.find(o => o.id === pending.variantId)
      const choices = event.setup && pending.stepIndex === 0
        ? event.setup.options.filter(o => o.choiceIds.some(id => eligible.some(c => c.id === id))).map(o => o.id)
        : eligible.filter(c => !route || route.choiceIds.includes(c.id)).map(c => c.id)
      if (!choices.length) throw new Error(`No eligible choice: ${scenario.seed}/${game.windowIndex}/${pending.eventId}`)
      const choice = choices[(scenario.index + game.windowIndex + pending.stepIndex) % choices.length]!
      act('chooseCareerEvent', () => store().chooseCareerEvent(choice)); break
    }
    case 'SPECIAL_EVENT_RESULT': act('continueAfterCareerEvent', () => store().continueAfterCareerEvent()); break
    case 'KEY_MATCH_MOMENT': case 'KEY_MATCH_MOMENT_RESULT': {
      const pending = game.pendingKeyMatchMoment!
      const context = {careerSeed:game.careerSeed,playerId:game.player!.id,windowIndex:game.windowIndex,clubId:pending.clubId,momentId:pending.id,inputFingerprint:pending.inputFingerprint}
      if (game.phase === 'KEY_MATCH_MOMENT') act('chooseKeyMatchMoment', () => store().chooseKeyMatchMoment(pending.choices[0]!.id, context))
      else act('finishKeyMatchMoment', () => store().finishKeyMatchMoment(context))
      break
    }
    case 'HALF_YEAR_REPORT': act('advanceAfterReport', () => store().advanceAfterReport()); break
    case 'CAREER_DASHBOARD': act('openProfessionalContract', () => store().openProfessionalContract()); break
    case 'PRO_CONTRACT_OFFER': act('acceptProfessionalContract', () => store().acceptProfessionalContract()); break
    case 'PRO_CONTRACT_COMPLETE': act('startProfessionalCareer', () => store().startProfessionalCareer()); break
    case 'PRO_STAGE_COMPLETE': {
      if (game.windowIndex >= 55) { act('requestRetirement', () => store().requestRetirement()); break }
      store().openTransferWindow()
      if (store().game?.phase === 'TRANSFER_WINDOW') { act('openTransferWindow', () => {}); break }
      const error = store().error
      const allowed = error === '职业生涯最后一年不再开启新的合同或转会谈判。' || error === '本窗口没有新的转会机会。' || error?.startsWith('经纪团队正在持续观察市场。') || error?.startsWith('本阶段表现尚未吸引到合适报价。')
      if (!allowed || !(store().game!.contract?.remainingHalfYears ?? 0)) throw new Error(`Market failure: ${scenario.seed}/${game.windowIndex}: ${error}`)
      store().clearError(); act('continueProfessionalCareer', () => store().continueProfessionalCareer()); break
    }
    case 'TRANSFER_WINDOW': {
      const choice = selectOffer(game, scenario)
      if (game.selectedTransferChoiceId !== choice) act('selectTransferChoice', () => store().selectTransferChoice(choice))
      act('confirmTransferChoice', () => store().confirmTransferChoice()); break
    }
    case 'TRANSFER_ARRIVAL': act('chooseTransferArrival', () => store().chooseTransferArrival('NONE')); break
    case 'TRANSFER_STAGE_COMPLETE': act('continueAfterTransfer', () => store().continueAfterTransfer()); break
    case 'RETIREMENT_DECISION': act('confirmRetirement', () => store().confirmRetirement()); break
    default: throw new Error(`Stalled ${scenario.seed}/${group}/${game.windowIndex}/${game.phase}`)
  }
}
function assertState(game: GameState, scenario: Scenario, group: Group) {
  if (!Number.isFinite(game.cashEuro) || game.cashEuro < 0) throw new Error(`Invalid balance ${scenario.seed}/${group}`)
  if (game.windowIndex > 55) throw new Error(`Exceeded final window ${scenario.seed}/${group}`)
  for (const [key, value] of Object.entries(game.player?.attributes ?? {})) if (!Number.isFinite(value) || value < 0 || value > game.player!.potentials[key as keyof NonNullable<GameState['player']>['potentials']]) throw new Error(`Invalid attribute ${key}: ${scenario.seed}/${group}`)
  if (game.contract && game.contract.clubId !== game.selectedClubId) throw new Error(`Contract club mismatch ${scenario.seed}/${group}`)
  for (const a of game.entertainmentV3?.arrangements ?? []) {
    if (a.refundEuro > a.priceEuro) throw new Error(`Excess refund ${scenario.seed}/${group}`)
    if (a.periods.some(p => p.status === 'EXECUTED' && !p.actual)) throw new Error(`Missing receipt ${scenario.seed}/${group}`)
    if (a.periods.some(p => p.status === 'PENDING' && p.windowIndex < game.windowIndex)) throw new Error(`Overdue receipt ${scenario.seed}/${group}`)
  }
}
function driver(scenario: Scenario, group: Group, initial: GameState | null, stop: (g: GameState) => boolean) {
  reset(initial ?? undefined); seedControl.current = scenario.seed
  const steps: Step[] = [], windows: WindowMetric[] = []
  const evaluatedYears = new Set<number>()
  const plan = new Map<number, { salary: number; low: boolean; cash: number; refundBeforeEuro: number }>()
  const act = (label: string, run: () => void) => {
    const before = store().game ? clone(store().game!) : null
    if (before?.phase === 'HALF_YEAR_PLAN' && !plan.has(before.windowIndex)) plan.set(before.windowIndex, { salary: before.contract?.annualSalaryEuro ?? 0, low: Boolean(before.player && Math.min(before.player.form, before.player.fitness, before.player.morale) < 46), cash: before.cashEuro, refundBeforeEuro: sum(before.entertainmentV3?.ledger.filter(l=>l.windowIndex===before.windowIndex&&l.kind==='REFUND').map(l=>l.amountEuro)??[]) })
    run()
    if (store().error) throw new Error(`${scenario.seed}/${group} ${label} W${store().game?.windowIndex}: ${store().error}`)
    const after = store().game!
    assertState(after, scenario, group)
    steps.push({ label, windowIndex: after.windowIndex, phase: after.phase, businessSHA256: sha(businessProjection(after)) })
    if (before && after.history.length > before.history.length) {
      const report = after.lastReport!, p = plan.get(after.windowIndex)
      const salary = p?.salary ?? before.contract?.annualSalaryEuro ?? 0
      const salaryDue = before.contract ? halfYearDisposableIncome(salary) : report.stipendEuro
      const event = [...after.careerEventHistory].reverse().find(e => e.windowIndex === after.windowIndex)
      const receipts = report.personalArrangements?.receipts ?? []
      let preparationAudit: WindowMetric['preparationAudit'] = null
      if (receipts.length && v3 && preparation) {
        const input: GameState = {...before,phase:'SIMULATION_READY',pendingCareerEvent:null,trainingFocus:after.trainingFocus,developmentApproach:after.developmentApproach}
        const immutableSHA = sha(input)
        const withoutPaid = preparation.prepareArrangementQuotePlayer(input, after.trainingFocus!, after.developmentApproach)
        const withPaid = v3.preparePersonalArrangementWindow(input, withoutPaid)
        expect(withPaid.receipts, `Same-preparation receipt mismatch ${scenario.seed}/${group}/W${after.windowIndex}`).toEqual(receipts)
        expect(sha(input), 'Pure preparation must not mutate the input').toBe(immutableSHA)
        expect(withPaid.player.attributes).toEqual(withoutPaid.attributes)
        expect(withPaid.player.potentials).toEqual(withoutPaid.potentials)
        for (const key of ['fitness','morale','squadRelation'] as const) {
          const contributed = sum(receipts.map(r=>r.actual[key]))
          expect(Math.abs(withPaid.player[key]-withoutPaid[key]-contributed), `Exactly-once paid contribution ${key}`).toBeLessThan(1e-8)
        }
        if (before.pendingKeyMatchMoment) {
          const frozen = before.pendingKeyMatchMoment.prepared
          expect({attributes:withPaid.player.attributes,form:withPaid.player.form,fitness:withPaid.player.fitness,morale:withPaid.player.morale}).toEqual({attributes:frozen.attributes,form:frozen.form,fitness:frozen.fitness,morale:frozen.morale})
        }
        preparationAudit = {withoutPaid:{fitness:withoutPaid.fitness,morale:withoutPaid.morale,squadRelation:withoutPaid.squadRelation},withPaid:{fitness:withPaid.player.fitness,morale:withPaid.player.morale,squadRelation:withPaid.player.squadRelation},attributesUnchanged:true,potentialsUnchanged:true,keyMomentPreparedChecked:Boolean(before.pendingKeyMatchMoment)}
      }

      const planned = receipts.reduce((s, r) => s + Object.values(r.planned).reduce((x, n) => x + n, 0), 0)
      const actual = receipts.reduce((s, r) => s + Object.values(r.actual).reduce((x, n) => x + n, 0), 0)
      const ledger = after.entertainmentV3?.ledger.filter(l => l.windowIndex === after.windowIndex) ?? []
      const payment = ledger.filter(l => l.kind === 'PAYMENT').reduce((s, l) => s + l.amountEuro, 0)
      const refund = ledger.filter(l => l.kind === 'REFUND').reduce((s, l) => s + l.amountEuro, 0)
      const previous = windows.at(-1)
      if (previous?.paymentEuro) previous.nextSalaryToSpendRatio = report.stipendEuro / previous.paymentEuro
      windows.push({ windowIndex: after.windowIndex, age: playerAgeAtWindow(after.windowIndex), clubId: after.selectedClubId!, teamLevel: after.teamLevel, annualSalaryEuro: salary,
        salaryDueEuro: salaryDue, salaryActualEuro: report.stipendEuro, capLossEuro: Math.max(0, salaryDue - report.stipendEuro), paymentEuro: payment, refundEuro: refund,
        balanceEuro: after.cashEuro, otherCashDeltaEuro: after.cashEuro - (p?.cash ?? before.cashEuro) - report.stipendEuro + payment - refund + (p?.refundBeforeEuro ?? 0), nextSalaryToSpendRatio: null,
        lowStateAtPlan: p?.low ?? false, recoveryMarker: /恢复优先|先恢复，策略未执行/.test(report.eventSummary + report.hints.join(' ')),
        states: { form: after.player!.form, fitness: after.player!.fitness, morale: after.player!.morale, squadRelation: after.player!.squadRelation }, attributes: { ...after.player!.attributes },
        minutes: report.stats.minutes, appearances: report.stats.appearances, starts: report.stats.starts, goals: report.stats.goals, assists: report.stats.assists, injuryWeeks: report.injury?.weeks ?? 0,
        plannedGain: planned, actualGain: actual, capLossGain: planned - actual, arrangementReceipts:clone(receipts),preparationAudit, eventId: event?.eventId ?? null, eventCategory: event ? getCareerEvent(event.eventId, after).category : null, eventChoiceId: event?.choiceId ?? null })
    }
  }
  if (!initial) {
    act('startNewCareer', () => store().startNewCareer())
    if (!BASELINE) {
      const g = store().game!, root = entertainment!.createEntertainmentV3State(null, 56); root.cashPolicy = 'LEGACY_CAP'
      const off = { ...g, entertainmentV3: root }; saveGame(off); useGameStore.setState({ game: off })
    }
    act('submitIdentity', () => store().submitIdentity({ name: `固定样本${scenario.seed.slice(-2)}`, jerseyNumber: 8, preferredFoot: scenario.index % 2 ? 'LEFT' : 'RIGHT' }))
    act('submitPosition', () => store().submitPosition(scenario.position, secondary[scenario.position]))
    act('submitPriorities', () => store().submitPriorities(['PLAYING_TIME', 'COMPETITIVE_LEVEL', 'STABILITY', 'SALARY']))
    act('submitPreferences', () => store().submitPreferences(scenario.index % 3 === 2 ? 'DOMESTIC' : scenario.index % 3 === 0 ? 'STRONG' : 'CONDITIONAL', scenario.index % 3 === 2 ? [] : [['意大利'], ['英格兰'], ['德国'], ['法国']][scenario.index % 4]!))
    act('confirmPlayer', () => store().confirmPlayer())
  }
  for (let n = 0; n < 1100; n++) {
    const g = store().game!
    if (stop(g)) return { game: clone(g), windows, steps }
    nextAction(scenario, group, act, evaluatedYears)
  }
  throw new Error(`Action budget exceeded ${scenario.seed}/${group}`)
}
function adultFixture(scenario: Scenario) {
  const prelude = driver(scenario, BASELINE ? 'BASELINE' : 'OFF', null, g => g.phase === 'HALF_YEAR_PLAN' && playerAgeAtWindow(g.windowIndex) >= 18 && Boolean(g.contract))
  preludeBySeed.set(scenario.seed, prelude.steps)
  if (CAPTURE) fixtures.push({ seed: scenario.seed, businessSHA256: sha(businessProjection(prelude.game)), raw: JSON.stringify(prelude.game), source: 'public legacy prelude, no user save' })
  return prelude.game
}
function initialFor(raw: GameState, group: Group) {
  const game = clone(raw)
  if (!BASELINE) {
    const off = group === 'OFF'
    const root = entertainment!.createEntertainmentV3State(game.selectedClubId, off ? 56 : 0)
    root.cashPolicy = off || group.startsWith('CASH_CAP_') ? 'LEGACY_CAP' : 'UNCAPPED'
    game.entertainmentV3 = root
  }
  return game
}
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const mean = (values: number[]) => values.length ? sum(values) / values.length : 0
function count(values: string[]) { const out: Record<string, number> = {}; for (const value of values) out[value] = (out[value] ?? 0) + 1; return out }
function metricsFor(game: GameState, windows: WindowMetric[]) {
  const arrangements = game.entertainmentV3?.arrangements ?? [], events = windows.filter(w => w.eventId)
  const summary = buildRetirementSummary(game)
  return { windows: windows.length, lowStateAtPlanWindows: windows.filter(w => w.lowStateAtPlan).length, recoveryWindows: windows.filter(w => w.recoveryMarker).length,
    averageFitness: mean(windows.map(w => w.states.fitness)), averageMorale: mean(windows.map(w => w.states.morale)), averageForm: mean(windows.map(w => w.states.form)),
    minutes: sum(windows.map(w => w.minutes)), appearances: sum(windows.map(w => w.appearances)), starts: sum(windows.map(w => w.starts)), goals: sum(windows.map(w => w.goals)), assists: sum(windows.map(w => w.assists)), injuryWindows: windows.filter(w => w.injuryWeeks > 0).length, injuryWeeks: sum(windows.map(w => w.injuryWeeks)),
    peakOverall: summary.peakOverall, finalOverall: summary.finalOverall, honors: summary.honors.length,
    attributePeak: Object.fromEntries(Object.keys(game.player!.attributes).map(key => [key, Math.max(...windows.map(w => w.attributes[key]!), game.player!.attributes[key as keyof NonNullable<GameState['player']>['attributes']])])),
    finalAttributes: {...game.player!.attributes},
    ageBands: Object.fromEntries([[18,24],[25,29],[30,33],[34,40]].map(([from,to]) => {
      const ageWindows = windows.filter(w => w.age >= from! && w.age <= to!)
      return [`${from}-${to}`, {windows:ageWindows.length, averageFitness:mean(ageWindows.map(w=>w.states.fitness)), averageMorale:mean(ageWindows.map(w=>w.states.morale)), averageAttributes:Object.fromEntries(Object.keys(game.player!.attributes).map(key=>[key,mean(ageWindows.map(w=>w.attributes[key]!))]))}]
    })),
    salaryDueEuro: sum(windows.map(w => w.salaryDueEuro)), salaryActualEuro: sum(windows.map(w => w.salaryActualEuro)), salaryCapLossEuro: sum(windows.map(w => w.capLossEuro)),
    purchaseCount: arrangements.length, paymentEuro: sum(arrangements.map(a => a.priceEuro)), refundEuro: sum(arrangements.map(a => a.refundEuro)), balanceEuro: game.cashEuro,
    categoryCounts: count(arrangements.map(a => a.category)), tierCounts: count(arrangements.map(a => `${a.category}:${a.tier}`)), actualGain: sum(windows.map(w => w.actualGain)), capLossGain: sum(windows.map(w => w.capLossGain)),
    livingCityMoves: game.entertainmentV3?.livingCity.moves.length ?? 0, cityEligibleWindows: windows.filter(w => game.entertainmentV3?.livingCity.moves.some(m => w.windowIndex >= m.windowIndex && w.windowIndex <= m.windowIndex + 1)).length,
    eventCount: events.length, eventCategories: count(events.map(w => w.eventCategory!)), eventIds: count(events.map(w => w.eventId!)),
    reachedV3Nodes: [...new Set(events.filter(w => w.eventId!.startsWith('V3_')).map(w => w.eventId!))].sort(),
    consecutiveSameEvent: windows.filter((w, i) => i > 0 && w.eventId !== null && w.eventId === windows[i - 1]!.eventId).length,
    consecutiveSameEventCategory: windows.filter((w, i) => i > 0 && w.eventCategory !== null && w.eventCategory === windows[i - 1]!.eventCategory).length,
    storyClosures: count(game.entertainmentV3?.stories.closedChains.map(c => c.reason) ?? []), storyFollowupDelayWindows: count(game.entertainmentV3?.stories.closedChains.filter(c=>c.reason==='COMPLETED').map(c=>String(c.closedAtWindowIndex-c.firstWindowIndex)) ?? []), storyEligibleWindowsBeforeClosure: sum(game.entertainmentV3?.stories.closedChains.map(c=>Math.max(0,c.closedAtWindowIndex-c.availableFromWindowIndex)) ?? []), settlementTerminations: arrangements.filter(a=>a.category==='SETTLE'&&a.terminationCause).map(a=>({purchaseWindowIndex:a.purchaseWindowIndex,cause:a.terminationCause,executedPeriods:a.periods.filter(p=>p.status==='EXECUTED').length,terminatedPeriods:a.periods.filter(p=>p.status==='TERMINATED').length,refundEuro:a.refundEuro})), activeStoryAtEnd: game.entertainmentV3?.stories.activeChain?.chainId ?? null }
}
function run(scenario: Scenario, group: Group, raw: GameState, stop?: (g: GameState) => boolean): RunResult {
  const initial = initialFor(raw, group), initialSHA = sha(businessProjection(initial))
  expect(initialSHA).toBe(sha(businessProjection(raw)))
  const result = driver(scenario, group, initial, stop ?? (g => g.phase === 'CAREER_RETIRED'))
  const final = result.game
  if (!BASELINE) {
    const executed = final.entertainmentV3!.arrangements.flatMap(a=>a.periods.filter(p=>p.status==='EXECUTED').map(p=>({arrangementId:a.id,windowIndex:p.windowIndex,planned:p.planned,actual:p.actual,reason:p.reason})))
    const reported = result.windows.flatMap(w=>w.arrangementReceipts)
    const key = (r:{arrangementId:string;windowIndex:number}) => `${r.arrangementId}:${r.windowIndex}`
    expect(new Set(reported.map(key)).size, 'Every period is reported once').toBe(reported.length)
    expect([...reported].sort((a,b)=>key(a).localeCompare(key(b)))).toEqual([...executed].sort((a,b)=>key(a).localeCompare(key(b))))
    expect(sum(result.windows.map(w=>w.actualGain))).toBeCloseTo(sum(executed.flatMap(r=>Object.values(r.actual!))),8)
    expect(sum(result.windows.map(w=>w.plannedGain))).toBe(sum(executed.flatMap(r=>Object.values(r.planned))))
    const ledger=final.entertainmentV3!.ledger
    expect(sum(ledger.filter(l=>l.kind==='PAYMENT').map(l=>l.amountEuro))).toBe(sum(final.entertainmentV3!.arrangements.map(a=>a.priceEuro)))
    expect(sum(ledger.filter(l=>l.kind==='REFUND').map(l=>l.amountEuro))).toBe(sum(final.entertainmentV3!.arrangements.map(a=>a.refundEuro)))
  }
  if (!stop) { expect(final.phase).toBe('CAREER_RETIRED'); expect(final.retirementReason).toBe('AGE_LIMIT'); expect(final.entertainmentV3?.stories.activeChain ?? null).toBeNull(); expect(final.entertainmentV3?.arrangements.flatMap(a => a.periods).some(p => p.status === 'PENDING') ?? false).toBe(false) }
  return { scenario, group, initialBusinessSHA256: initialSHA, finalBusinessSHA256: sha(businessProjection(final)), actionCount: result.steps.length, maxWindowIndex: final.windowIndex, windows: result.windows, steps: result.steps, final, metrics: metricsFor(final, result.windows) }
}
function compareReference(scenario: Scenario, result: RunResult) {
  if (!reference) return
  const expected = reference.runs[scenario.seed]
  expect(expected, `Missing original V2.5 reference ${scenario.seed}`).toBeDefined()
  expect(result.initialBusinessSHA256, `Initial fixture differs from original V2.5: ${scenario.seed}`).toBe(expected!.initialBusinessSHA256)
  expect(preludeBySeed.get(scenario.seed), `Legacy prelude differs ${scenario.seed}`).toEqual(expected!.prelude)
  expect(result.steps, `Business OFF differs ${scenario.seed}`).toEqual(expected!.steps)
  expect(result.finalBusinessSHA256).toBe(expected!.finalBusinessSHA256)
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-16T00:00:00Z')); reset() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
it.skipIf(BASELINE || SUITE === 'cash')('has a bundled original V2.5 reference, independent of the candidate implementation', () => {
  expect(reference, 'The original V2.5 reference must ship with CI; do not silently skip OFF equivalence.').not.toBeNull()
  if (!selectedIndices) expect(Object.keys(reference!.runs)).toHaveLength(48)
})
describe('FUNV3 frozen 48 x 4 long-career public-store experiment', () => {
  it.skipIf(SUITE === 'cash' || SUITE === 'replay').each(longScenarios.filter(included))('$seed / $position', scenario => {
    const raw = adultFixture(scenario)
    for (const group of (BASELINE ? ['BASELINE'] : ['OFF', 'ON_FREE', 'ON_FIXED_BODY', 'ON_SITUATIONAL']) as Group[]) {
      const result = run(scenario, group, raw)
      completed.push(result)
      if (BASELINE) baselineRuns[scenario.seed] = { initialBusinessSHA256: result.initialBusinessSHA256, prelude: preludeBySeed.get(scenario.seed)!, steps: result.steps, finalBusinessSHA256: result.finalBusinessSHA256 }
      if (group === 'OFF') compareReference(scenario, result)
    }
  }, 120_000)
})
describe('FUNV3 controlled 20-start cash A/B with no-spend context', () => {
  it.skipIf(BASELINE || SUITE === 'long' || SUITE === 'replay').each(cashScenarios.filter(scenario => BASELINE || SUITE === 'long' || SUITE === 'replay' || included(scenario)))('$seed income stratum', scenario => {
    const raw = adultFixture(scenario), salary = [18_000, 60_000, 240_000, 2_000_000][Math.floor(scenario.index / 5)]!
    raw.contract = { ...raw.contract!, annualSalaryEuro: salary, remainingHalfYears: 16 }; raw.cashEuro = cashReserveLimit(salary)
    for (const group of ['CASH_CAP_BODY', 'CASH_UNCAPPED_BODY', 'CASH_CAP_FREE', 'CASH_UNCAPPED_FREE'] as const) {
      const result = run(scenario, group, raw, g => g.phase === 'HALF_YEAR_REPORT' && g.windowIndex === 17)
      expect(result.windows).toHaveLength(8); expect(result.windows.every(w => w.annualSalaryEuro === salary)).toBe(true)
      completed.push(result)
    }
  }, 120_000)
})
it.skipIf(BASELINE || SUITE === 'cash' || Boolean(selectedIndices))('replays four preselected situational careers exactly (additional runs, not unique samples)', () => {
  for (const index of [0, 11, 23, 47]) {
    const scenario = longScenarios[index]!, raw = adultFixture(scenario)
    const a = run(scenario, 'ON_SITUATIONAL', raw), b = run(scenario, 'ON_SITUATIONAL', raw)
    expect(b).toEqual(a)
  }
}, 120_000)
afterAll(() => {
  if (!CAPTURE) return
  mkdirSync(OUT, { recursive: true })
  const metadata = { generatedAt: '2026-10-23', baselineCommit: '37411e336d1b837e99720bb444eb0b0761eb852e', suite: SUITE, mode: BASELINE ? 'ORIGINAL_V2_5_REFERENCE' : 'CANDIDATE', referenceCompared: Boolean(reference), uniqueLongStarts: new Set(completed.filter(r => r.scenario.seed.startsWith('FUNV3-LONG')).map(r => r.scenario.seed)).size, longMainRuns: completed.filter(r => r.scenario.seed.startsWith('FUNV3-LONG')).length, uniqueCashStarts: new Set(completed.filter(r => r.scenario.seed.startsWith('FUNV3-CASH')).map(r => r.scenario.seed)).size, cashMainRuns: completed.filter(r => r.scenario.seed.startsWith('FUNV3-CASH')).length, deterministicReplayRuns: BASELINE || SUITE === 'cash' || selectedIndices ? 0 : 8, subjectiveFunEstablished: false }
  writeFileSync(resolve(OUT, 'results.json'), JSON.stringify({ metadata, runs: completed }, null, 2) + '\n')
  writeFileSync(resolve(OUT, 'fixtures.json'), JSON.stringify({ metadata, fixtures }, null, 2) + '\n')
  writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify({ metadata, runs: completed.map(({ scenario, group, actionCount, maxWindowIndex, initialBusinessSHA256, finalBusinessSHA256, metrics }) => ({ scenario, group, actionCount, maxWindowIndex, initialBusinessSHA256, finalBusinessSHA256, metrics })) }, null, 2) + '\n')
  if (BASELINE) writeFileSync(resolve(OUT, 'baseline-business-projections.json'), JSON.stringify({ metadata, runs: baselineRuns }, null, 2) + '\n')
})
