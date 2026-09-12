import type { DevelopmentApproach, Player } from '../models/game'

export interface ProfessionalMatchModifiers {
  appearanceRateBonus: number
  startRateBonus: number
  injuryRiskDelta: number
}
interface ApproachConfiguration extends ProfessionalMatchModifiers {
  coachRelation: number
  squadRelation: number
  form: number
  fitness: number
  morale: number
  trainingBonus: number
  summary: string
}

export const PROFESSIONAL_APPROACHES: Readonly<Record<DevelopmentApproach, Readonly<ApproachConfiguration>>> = {
  PUSH: {
    coachRelation: 3, squadRelation: 0, form: 0, fitness: -4, morale: 0,
    trainingBonus: 1, appearanceRateBonus: 0.10, startRateBonus: 0.08, injuryRiskDelta: 0.025,
    summary: '你主动向教练争取更多正式比赛机会，训练投入得到认可，但身体负荷也随之增加。',
  },
  STEADY: {
    coachRelation: 0, squadRelation: 0, form: 3, fitness: 2, morale: 0,
    trainingBonus: 0, appearanceRateBonus: 0, startRateBonus: 0, injuryRiskDelta: -0.015,
    summary: '你选择先适应职业队节奏，在训练强度、比赛准备和身体恢复之间保持平衡。',
  },
  TEAM_FIRST: {
    coachRelation: 0, squadRelation: 5, form: 0, fitness: 0, morale: 3,
    trainingBonus: 0, appearanceRateBonus: 0.04, startRateBonus: -0.06, injuryRiskDelta: 0,
    summary: '你接受球队的阶段性安排，把团队需要放在个人出场诉求之前，更衣室更愿意接纳你。',
  },
}
export const PROFESSIONAL_INJURY_LIMITS = { normal: [0.015, 0.16], recovery: [0.03, 0.12] } as const
export const PROFESSIONAL_APPEARANCE_LIMIT = 0.98
const stateKeys = ['coachRelation', 'squadRelation', 'form', 'fitness', 'morale'] as const
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function prepareProfessionalWindow(player: Player, approach: DevelopmentApproach | null) {
  const next = structuredClone(player)
  const recovery = player.form < 46 || player.fitness < 46 || player.morale < 46
  const effectiveApproach = recovery ? null : approach ?? 'STEADY'
  const config = effectiveApproach ? PROFESSIONAL_APPROACHES[effectiveApproach] : null
  if (recovery) {
    if (next.form < 46) next.form = clamp(next.form + 7, 0, 100)
    if (next.fitness < 46) next.fitness = clamp(next.fitness + 10, 0, 100)
    if (next.morale < 46) next.morale = clamp(next.morale + 8, 0, 100)
  } else if (config) {
    for (const key of stateKeys) next[key] = clamp(next[key] + config[key], 0, 100)
  }
  return {
    player: next,
    trainingBonus: config?.trainingBonus ?? 0,
    recovery,
    effectiveApproach,
    preparationChanges: Object.fromEntries(stateKeys.map(key => [key, next[key] - player[key]])) as Record<typeof stateKeys[number], number>,
    summary: config?.summary ?? '职业队为你安排了恢复训练、体能监测和心理沟通，避免低迷状态持续恶化。',
    matchModifiers: {
      appearanceRateBonus: config?.appearanceRateBonus ?? 0,
      startRateBonus: config?.startRateBonus ?? 0,
      injuryRiskDelta: config?.injuryRiskDelta ?? 0,
    } satisfies ProfessionalMatchModifiers,
  }
}

export function adjustedProfessionalRange(range: readonly [number, number], bonus: number, max: number): readonly [number, number] {
  const lower = clamp(range[0] + bonus, 0, max)
  return [lower, clamp(range[1] + bonus, lower, max)]
}

export function professionalInjuryRisk(player: Player, modifiers: ProfessionalMatchModifiers, recovery: boolean): number {
  const [min, max] = recovery ? PROFESSIONAL_INJURY_LIMITS.recovery : PROFESSIONAL_INJURY_LIMITS.normal
  return clamp(0.04 + (50 - player.fitness) * 0.001 + (45 - player.attributes.physical) * 0.0005 + (recovery ? 0 : modifiers.injuryRiskDelta), min, max)
}


/** Describes actual execution; probability and draw metadata stay out of player copy. */
export function professionalApproachSummary(
  preparation: ReturnType<typeof prepareProfessionalWindow>,
  match: { appearanceRange: readonly [number, number]; startRange: readonly [number, number]; injuryRisk: number; opportunityCapped: boolean },
  squadAfter: number,
): string {
  const names = { PUSH: '主动争取出场', STEADY: '先站稳脚跟', TEAM_FIRST: '先服从球队安排' }
  const labels = { coachRelation: '教练关系', squadRelation: '队内关系', form: '竞技状态', fitness: '身体状态', morale: '心理状态' }
  const signed = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n * 10) / 10}`
  const changes = stateKeys.filter(k => preparation.preparationChanges[k] !== 0).map(k => `${labels[k]}${signed(preparation.preparationChanges[k])}`).join('、') || '状态与关系没有额外变化'
  if (preparation.recovery) return `本期先恢复，策略未执行。恢复准备：${changes}。`
  const approach = preparation.effectiveApproach!
  const riskAtFloor = match.injuryRisk === PROFESSIONAL_INJURY_LIMITS.normal[0]
  const direction = approach === 'PUSH'
    ? `争取更多出场与首发，${riskAtFloor ? '伤病风险仍处于下限' : '承担更高伤病风险'}`
    : approach === 'TEAM_FIRST' ? '增加替补机会，减少首发诉求'
    : `保持原角色机会范围，${riskAtFloor ? '伤病风险已到下限' : '降低伤病风险'}`
  const lines = [`本期策略：${names[approach]}。${direction}。`, `准备实际变化：${changes}。`]
  const config = PROFESSIONAL_APPROACHES[approach]
  const limits = []
  if (stateKeys.some(k => preparation.preparationChanges[k] !== config[k])) limits.push('部分准备效果已受状态或关系边界限制')
  if (match.opportunityCapped) limits.push('部分机会调整已触及边界')
  if (limits.length) lines.push(`${limits.join('；')}。`)
  if (approach === 'TEAM_FIRST' && squadAfter > preparation.player.squadRelation) lines.push(`赛后队内关系另${signed(squadAfter - preparation.player.squadRelation)}。`)
  return lines.join('\n')
}
