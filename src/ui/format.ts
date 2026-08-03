import type {
  Club,
  DevelopmentApproach,
  FirstTeamRole,
  FirstTeamStatus,
  NationalTeamCompetition,
  NationalTeamRole,
  NationalTeamStage,
  OverseasIntent,
  PreferredFoot,
  TrainingFocus,
  YouthRole,
} from '../models/game'

const BIG_FIVE = new Set([
  '英格兰',
  '西班牙',
  '意大利',
  '德国',
  '法国',
])

const EUROPEAN_DEVELOPMENT_LEAGUES = new Set([
  '荷兰',
  '葡萄牙',
  '比利时',
])

export function clubLevelLabel(club: Club): string {
  if (club.country === '中国') {
    if (club.leagueLabel === '次级联赛') {
      return club.id === 'cn_guangxi_liancheng'
        ? '中国次级强队'
        : '中国次级中下游'
    }
    return club.profile === 'ELITE'
      ? '中国顶级豪门'
      : '中国顶级中游'
  }

  if (BIG_FIVE.has(club.country)) {
    if (club.tier === 1) return '世界级豪门'
    if (club.tier === 2) return '五大联赛强队'
    if (club.tier === 3) return '五大联赛中游'
    return '五大联赛中下游'
  }

  if (EUROPEAN_DEVELOPMENT_LEAGUES.has(club.country)) {
    if (club.tier <= 2) return '欧洲次级豪门'
    if (club.tier === 3) return '欧洲次级强队'
    return '欧洲次级中游'
  }

  if (club.country === '巴西' || club.country === '阿根廷') {
    return club.tier <= 2 ? '南美豪门' : '南美强队'
  }

  return club.tier <= 3 ? '亚洲顶级强队' : '亚洲顶级中游'
}

export function trainingQualityLabel(club: Club): string {
  if (club.facilityTier === 1) return '世界顶尖训练'
  if (club.facilityTier === 2) return '国际一流训练'
  if (club.facilityTier === 3) return '高水平训练'
  if (club.facilityTier === 4) {
    return club.country === '中国' ? '国内顶尖训练' : '优质训练'
  }
  if (club.facilityTier === 5) return '国内良好训练'
  return '基础训练'
}

export function academyQualityLabel(club: Club): string {
  if (club.academyTier === 1) return '世界顶尖青训'
  if (club.academyTier === 2) return '国际一流青训'
  if (club.academyTier === 3) return '高水平青训'
  if (club.academyTier === 4) {
    return club.country === '中国' ? '国内顶尖青训' : '优质青训'
  }
  if (club.academyTier === 5) return '国内良好青训'
  return '基础青训'
}

export function integrationDifficultyLabel(club: Club): string {
  if (club.country !== '中国' && club.tier === 1) return '极高'
  if (club.country !== '中国' && club.tier <= 2) return '高'
  if (club.tier <= 4) return '中等'
  return '较低'
}

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

export function nationalTeamRoleLabel(role: NationalTeamRole): string {
  return {
    FRINGE: '边缘国脚',
    ROTATION: '轮换国脚',
    STARTER: '国家队主力',
    CORE: '国家队核心',
  }[role]
}

export function nationalCompetitionLabel(
  competition: NationalTeamCompetition,
): string {
  return {
    INTERNATIONAL_WINDOW: '国家队比赛日',
    WORLD_CUP: '世界杯',
    ASIAN_CUP: '亚洲杯',
  }[competition]
}

export function nationalStageLabel(stage: NationalTeamStage): string {
  return {
    NOT_QUALIFIED: '未进正赛',
    GROUP_STAGE: '小组赛',
    ROUND_OF_16: '16强',
    QUARTER_FINAL: '8强',
    SEMI_FINAL: '4强',
    RUNNER_UP: '亚军',
    CHAMPION: '冠军',
  }[stage]
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
