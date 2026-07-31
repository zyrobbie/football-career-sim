import type {
  DevelopmentApproach,
  FirstTeamRole,
  FirstTeamStatus,
  OverseasIntent,
  PreferredFoot,
  TrainingFocus,
  YouthRole,
} from '../models/game'

export function formatEuro(value: number): string {
  return `€${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)}`
}

export function roleLabel(role: YouthRole | FirstTeamRole): string {
  return {
    FRINGE: '边缘球员',
    SUBSTITUTE: '替补球员',
    ROTATION: '轮换球员',
    STARTER: '主力球员',
    CORE: '核心球员',
  }[role]
}

export function chanceLabel(chance: 'HARD' | 'NORMAL' | 'FAST'): string {
  return {
    HARD: '较难',
    NORMAL: '正常',
    FAST: '较快',
  }[chance]
}

export function overseasIntentLabel(intent: OverseasIntent): string {
  return {
    STRONG: '强烈希望留洋',
    CONDITIONAL: '条件合适时留洋',
    DOMESTIC: '更倾向留在国内',
  }[intent]
}

export function preferredFootLabel(foot: PreferredFoot): string {
  return foot === 'LEFT' ? '左脚' : '右脚'
}

export function trainingFocusLabel(focus: TrainingFocus): string {
  return {
    attack: '加强进攻',
    defense: '加强防守',
    physical: '加强身体',
    mental: '加强心理',
    BALANCED: '平衡训练',
    ADAPTATION: '适应青训节奏',
  }[focus]
}

export function firstTeamStatusLabel(status: FirstTeamStatus): string {
  return {
    DEVELOPING: '青年队培养',
    WATCHLIST: '一线队观察名单',
    TRAINING_CANDIDATE: '跟训候选',
    FIRST_TEAM_TRAINING: '一线队跟训',
    PROMOTION_READY: '晋升讨论',
    PROMOTED: '正式晋升一线队',
  }[status]
}

export function developmentApproachLabel(
  approach: DevelopmentApproach,
): string {
  return {
    PUSH: '主动争取跟训',
    STEADY: '稳住成长节奏',
    TEAM_FIRST: '青年队成绩优先',
  }[approach]
}
