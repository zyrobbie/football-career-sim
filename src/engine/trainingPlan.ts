import { POSITION_WEIGHTS } from '../data/balance'
import { attributeKeys, type Attributes, type GameState, type Player, type TrainingFocus } from '../models/game'
import { playerAgeAtWindow } from './careerTime'

export const MAINTENANCE_LABELS = {
  BODY_CARE: '身体维护', MATCH_SHARPNESS: '比赛状态', MENTAL_RESET: '心理调适',
} as const
export type MaintenanceFocus = keyof typeof MAINTENANCE_LABELS
export function isMaintenanceFocus(focus: TrainingFocus): focus is MaintenanceFocus {
  return focus === 'BODY_CARE' || focus === 'MATCH_SHARPNESS' || focus === 'MENTAL_RESET'
}
export function normalizeTrainingFocus(focus: TrainingFocus | null, age: number): TrainingFocus | null {
  if (focus === null || age <= 30) return focus
  if (focus === 'physical') return 'BODY_CARE'
  if (focus === 'ADAPTATION') return 'MENTAL_RESET'
  if (age >= 34) {
    if (focus === 'mental') return 'MENTAL_RESET'
    if (focus === 'attack' || focus === 'defense' || focus === 'BALANCED') return 'MATCH_SHARPNESS'
  }
  return focus
}
export function normalizePendingTraining(state: GameState): GameState {
  if (!['HALF_YEAR_PLAN', 'SPECIAL_EVENT', 'SPECIAL_EVENT_RESULT', 'SIMULATION_READY', 'KEY_MATCH_MOMENT', 'KEY_MATCH_MOMENT_RESULT'].includes(state.phase)) return state
  const trainingFocus = normalizeTrainingFocus(state.trainingFocus, playerAgeAtWindow(state.windowIndex))
  return trainingFocus === state.trainingFocus ? state : { ...state, trainingFocus }
}
/** Explicitly resolve new plans; never treat a maintenance enum as an ability key. */
export function resolveTrainingPlan(position: Player['primaryPosition'], focus: TrainingFocus): { shares: Attributes; multiplier: number } {
  const weights = POSITION_WEIGHTS[position]
  const distributed = focus === 'BALANCED' || focus === 'ADAPTATION' || isMaintenanceFocus(focus)
  return {
    shares: distributed ? { ...weights } : Object.fromEntries(attributeKeys.map(key => [key, weights[key] * 0.75 + (key === focus ? 0.25 : 0)])) as unknown as Attributes,
    multiplier: trainingFocusMultiplier(focus),
  }
}
export function trainingFocusMultiplier(focus: TrainingFocus): number {
  return focus === 'ADAPTATION' || isMaintenanceFocus(focus) ? 0.9 : 1
}
export interface TrainingExecution {
  focus: TrainingFocus
  recovery: boolean
  before: Pick<Player, 'form' | 'fitness' | 'morale'>
  gains: { form: number; fitness: number; morale: number }
  costs: { form: number; fitness: number; morale: number }
  declineFitness: number
  physicalDeclineMultiplier: number
  physicalDeclineSaved: number
  saturated: boolean
}
/** Call after the existing recovery/strategy preparation. Recovery is decided from its INPUT once. */
export function applyTrainingMaintenance(before: Player, prepared: Player, age: number, focus: TrainingFocus): TrainingExecution | null {
  if (age <= 30) return null
  const recovery = before.form < 46 || before.fitness < 46 || before.morale < 46
  const execution: TrainingExecution = {
    focus, recovery, before: { form: before.form, fitness: before.fitness, morale: before.morale },
    gains: { form: 0, fitness: 0, morale: 0 }, costs: { form: 0, fitness: 0, morale: 0 },
    declineFitness: prepared.fitness, physicalDeclineMultiplier: 1, physicalDeclineSaved: 0, saturated: false,
  }
  if (recovery || !isMaintenanceFocus(focus)) return execution
  const target = focus === 'BODY_CARE' ? 'fitness' : focus === 'MATCH_SHARPNESS' ? 'form' : 'morale'
  const cost = focus === 'MATCH_SHARPNESS' ? 'fitness' : 'form'
  execution.gains[target] = Math.min(4, Math.max(0, 95 - prepared[target]))
  execution.costs[cost] = Math.min(prepared[cost], focus === 'MATCH_SHARPNESS' ? 3 : 2)
  execution.saturated = execution.gains[target] === 0
  prepared[target] += execution.gains[target]
  prepared[cost] -= execution.costs[cost]
  if (focus === 'BODY_CARE') execution.physicalDeclineMultiplier = 0.8
  return execution
}
const number = (value: number) => {
  const rounded = Math.round(value * 100) / 100
  return `${Math.abs(rounded - value) > 1e-9 ? "约" : ""}${rounded}`
}
export function trainingEventSummary(summary: string, execution: TrainingExecution | null): string {
  if (!execution) return summary
  const labels: Record<TrainingFocus, string> = { attack: '重点练进攻', defense: '重点练防守', physical: '重点练身体', mental: '重点练心理', BALANCED: '均衡训练', ADAPTATION: '适应', ...MAINTENANCE_LABELS }
  const plan = labels[execution.focus]
  if (execution.recovery) {
    const states = (['form', 'fitness', 'morale'] as const).filter(key => execution.before[key] < 46).map(key => `${{ form: '竞技', fitness: '身体', morale: '心理状态' }[key]}${number(execution.before[key])}`).join('、')
    return `${summary}\n本期训练：${plan}；结算准备时${states}低于46，自动恢复优先（仅低项：竞技+${execution.before.form < 46 ? 7 : 0}、身体+${execution.before.fitness < 46 ? 10 : 0}、心理状态+${execution.before.morale < 46 ? 8 : 0}）；本期由恢复安排接替职业策略和维护计划，未执行维护收益、成本及衰退减缓。`
  }
  if (!isMaintenanceFocus(execution.focus)) return `${summary}\n本期训练：${plan}；按原规则分配成长，身体不再正常成长。`
  const { gains, costs } = execution
  const detail = execution.focus === 'BODY_CARE'
    ? `训练准备身体+${number(gains.fitness)}、竞技−${number(costs.form)}；身体衰退减少${number(execution.physicalDeclineSaved)}`
    : execution.focus === 'MATCH_SHARPNESS'
      ? `训练准备竞技+${number(gains.form)}、身体−${number(costs.fitness)}；能力仍随年龄变化`
      : `训练准备心理状态+${number(gains.morale)}、竞技−${number(costs.form)}；不提升心理能力`
  return `${summary}\n本期训练：${plan}；${detail}${execution.saturated ? '；准备时目标状态已达95，准备收益为0，成本照常执行' : ''}。`
}
