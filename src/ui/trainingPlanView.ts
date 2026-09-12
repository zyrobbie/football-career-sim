import type { IconName } from '../components/Icons'
import { playerAgeAtWindow } from '../engine/careerTime'
import { MAINTENANCE_LABELS, normalizeTrainingFocus } from '../engine/trainingPlan'
import type { DevelopmentApproach, GameState, TrainingFocus } from '../models/game'

interface TrainingOption { id: TrainingFocus; title: string; description: string; icon: IconName; disabledReason: string | null }
const original = [
  { id: 'attack', title: '重点练进攻', description: '把更多训练时间放在进攻能力上。', icon: 'attack' },
  { id: 'defense', title: '重点练防守', description: '把更多训练时间放在防守和无球能力上。', icon: 'defense' },
  { id: 'physical', title: '重点练身体', description: '提升身体素质，增强对抗和耐力。', icon: 'physical' },
  { id: 'mental', title: '重点练心理', description: '提升判断、专注和比赛抗压能力。', icon: 'mental' },
  { id: 'BALANCED', title: '均衡训练', description: '按照你的位置特点均衡分配训练。', icon: 'career' },
  { id: 'ADAPTATION', title: '先适应青训', description: '优先稳住身体和心理状态，能力成长会稍慢一些。', icon: 'team' },
] satisfies Omit<TrainingOption, 'disabledReason'>[]
export function trainingPlanView(game: GameState) {
  const age = playerAgeAtWindow(game.windowIndex)
  const veteran = age >= 31
  const player = game.player!
  const recovery = veteran && Math.min(player.form, player.fitness, player.morale) < 46
  const savedFocus = normalizeTrainingFocus(game.trainingFocus, age)
  const options: TrainingOption[] = original.filter(option => !veteran || (age <= 33 && ['attack', 'defense', 'mental', 'BALANCED'].includes(option.id))).map(option => ({
    ...option, disabledReason: null,
    ...(option.id === 'ADAPTATION' && game.contract && game.windowIndex >= 4 ? { title: '先适应职业队', description: '优先适应职业队的训练和比赛强度，能力成长会稍慢一些。' } : {}),
    ...(veteran && option.id === 'mental' ? { description: '侧重判断、专注等心理能力；不同于心理状态恢复。' } : {}),
  }))
  if (veteran) {
    options.push({ id: 'BODY_CARE', title: MAINTENANCE_LABELS.BODY_CARE, icon: 'physical', disabledReason: null, description: '身体状态最多+4、竞技状态−2；身体衰退减缓20%。' + (player.fitness >= 95 ? ' 当前身体状态已接近上限，准备收益可能为0，仍可减缓身体衰退。' : '') })
    if (age >= 34) options.push({ id: 'MATCH_SHARPNESS', title: MAINTENANCE_LABELS.MATCH_SHARPNESS, icon: 'attack', description: '竞技状态最多+4、身体状态−3；能力仍随年龄变化。', disabledReason: player.form >= 95 ? '当前竞技状态已达95，不能新选此计划。' : null })
    options.push({ id: 'MENTAL_RESET', title: MAINTENANCE_LABELS.MENTAL_RESET, icon: 'mental', description: '心理状态最多+4、竞技状态−2；不提升心理能力。', disabledReason: player.morale >= 95 ? '当前心理状态已达95，不能新选此计划。' : null })
  }
  const defaultFocus: TrainingFocus = veteran ? 'BODY_CARE' : 'physical'
  const initialFocus = savedFocus ?? defaultFocus
  const ageNote = !veteran ? null : age <= 33 ? '普通成长仍按原规则进行，身体能力不再正常成长。' : age >= 37 ? '年龄衰退正在加快。维护可以帮助管理状态，但不能恢复正常能力成长。' : '本阶段以状态维护为主，能力仍随年龄变化。'
  return { age, veteran, recovery, options, savedFocus, initialFocus, defaultFocus, ageNote,
    key: `${game.careerSeed}:${game.windowIndex}:${game.trainingFocus ?? ''}:${game.developmentApproach ?? ''}` }
}
export interface TrainingSelection { focus: TrainingFocus; approach: DevelopmentApproach }
export function trainingSubmission(game: GameState, selection: TrainingSelection) {
  const model = trainingPlanView(game)
  if (model.recovery) return { focus: 'BODY_CARE' as const, approach: 'STEADY' as const }
  const option = model.options.find(option => option.id === selection.focus)
  // Saved choices remain continuable, even if their target has since saturated.
  if ((!option || option.disabledReason) && selection.focus !== model.savedFocus) return null
  return { focus: selection.focus, approach: game.windowIndex >= 2 ? selection.approach : null }
}


/** Display copy only: submission and normalization remain above unchanged. */
export const TRAINING_SHORT_EFFECTS: Record<TrainingFocus, string> = {
  attack: '侧重进攻能力', defense: '侧重防守与无球', physical: '对抗与耐力',
  mental: '判断与专注能力', BALANCED: '按位置均衡分配', ADAPTATION: '稳住状态 · 成长稍慢',
  BODY_CARE: '身体最多+4 · 竞技−2', MATCH_SHARPNESS: '竞技最多+4 · 身体−3', MENTAL_RESET: '心理最多+4 · 竞技−2',
}
