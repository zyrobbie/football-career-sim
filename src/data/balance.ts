import type {
  AttributeKey,
  Attributes,
  CareerPriority,
  Club,
  Position,
} from '../models/game'

export const POSITION_LABELS: Record<Position, string> = {
  ST: '中锋',
  LW: '左边锋',
  RW: '右边锋',
  CAM: '前腰',
  LM: '左中场',
  RM: '右中场',
  CM: '中前卫',
  CDM: '后腰',
  LB: '左后卫',
  RB: '右后卫',
  CB: '中后卫',
}

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  attack: '进攻',
  defense: '防守',
  physical: '身体',
  mental: '心理',
}

export const POSITION_WEIGHTS: Record<Position, Attributes> = {
  ST: { attack: 0.4, defense: 0.05, physical: 0.3, mental: 0.25 },
  LW: { attack: 0.35, defense: 0.1, physical: 0.35, mental: 0.2 },
  RW: { attack: 0.35, defense: 0.1, physical: 0.35, mental: 0.2 },
  CAM: { attack: 0.4, defense: 0.1, physical: 0.2, mental: 0.3 },
  LM: { attack: 0.3, defense: 0.25, physical: 0.25, mental: 0.2 },
  RM: { attack: 0.3, defense: 0.25, physical: 0.25, mental: 0.2 },
  CM: { attack: 0.3, defense: 0.3, physical: 0.15, mental: 0.25 },
  CDM: { attack: 0.15, defense: 0.35, physical: 0.3, mental: 0.2 },
  LB: { attack: 0.2, defense: 0.35, physical: 0.3, mental: 0.15 },
  RB: { attack: 0.2, defense: 0.35, physical: 0.3, mental: 0.15 },
  CB: { attack: 0.05, defense: 0.4, physical: 0.3, mental: 0.25 },
}

type Range = readonly [number, number]

export const INITIAL_ATTRIBUTE_RANGES: Record<
  Position,
  Record<AttributeKey, Range>
> = {
  ST: {
    attack: [38, 50],
    defense: [14, 26],
    physical: [34, 47],
    mental: [31, 44],
  },
  LW: {
    attack: [36, 48],
    defense: [16, 30],
    physical: [36, 49],
    mental: [30, 43],
  },
  RW: {
    attack: [36, 48],
    defense: [16, 30],
    physical: [36, 49],
    mental: [30, 43],
  },
  CAM: {
    attack: [37, 49],
    defense: [18, 31],
    physical: [29, 42],
    mental: [34, 47],
  },
  LM: {
    attack: [35, 46],
    defense: [31, 43],
    physical: [35, 47],
    mental: [34, 46],
  },
  RM: {
    attack: [35, 46],
    defense: [31, 43],
    physical: [35, 47],
    mental: [34, 46],
  },
  CM: {
    attack: [33, 45],
    defense: [32, 44],
    physical: [31, 44],
    mental: [35, 47],
  },
  CDM: {
    attack: [22, 36],
    defense: [35, 48],
    physical: [35, 48],
    mental: [32, 45],
  },
  LB: {
    attack: [26, 39],
    defense: [34, 47],
    physical: [36, 49],
    mental: [31, 44],
  },
  RB: {
    attack: [26, 39],
    defense: [34, 47],
    physical: [36, 49],
    mental: [31, 44],
  },
  CB: {
    attack: [15, 28],
    defense: [36, 49],
    physical: [35, 48],
    mental: [33, 46],
  },
}

export const SECONDARY_POSITIONS: Record<Position, Position[]> = {
  ST: ['LW', 'RW', 'CAM'],
  LW: ['RW', 'LM', 'ST', 'CAM'],
  RW: ['LW', 'RM', 'ST', 'CAM'],
  CAM: ['CM', 'LM', 'RM', 'LW', 'RW'],
  LM: ['CM', 'LW', 'LB'],
  RM: ['CM', 'RW', 'RB'],
  CM: ['CAM', 'CDM', 'LM', 'RM'],
  CDM: ['CM', 'CB'],
  LB: ['LM', 'CB'],
  RB: ['RM', 'CB'],
  CB: ['CDM', 'LB', 'RB'],
}

export const INITIAL_OVR_DISTRIBUTION = [
  { value: 34, weight: 3 },
  { value: 35, weight: 5 },
  { value: 36, weight: 10 },
  { value: 37, weight: 14 },
  { value: 38, weight: 18 },
  { value: 39, weight: 18 },
  { value: 40, weight: 14 },
  { value: 41, weight: 9 },
  { value: 42, weight: 6 },
  { value: 43, weight: 3 },
] as const

export const POTENTIAL_DISTRIBUTION = [
  { min: 65, max: 68, weight: 15, label: '普通职业球员' },
  { min: 69, max: 75, weight: 25, label: '国内优秀球员' },
  { min: 76, max: 82, weight: 30, label: '高水平留洋球员' },
  { min: 83, max: 88, weight: 20, label: '世界级潜质' },
  { min: 89, max: 94, weight: 10, label: '历史级潜质' },
] as const

export const POTENTIAL_OFFSETS: Record<
  Position,
  Record<AttributeKey, Range>
> = {
  ST: {
    attack: [5, 10],
    defense: [-35, -22],
    physical: [-2, 5],
    mental: [-4, 4],
  },
  LW: {
    attack: [4, 8],
    defense: [-28, -16],
    physical: [2, 8],
    mental: [-6, 2],
  },
  RW: {
    attack: [4, 8],
    defense: [-28, -16],
    physical: [2, 8],
    mental: [-6, 2],
  },
  CAM: {
    attack: [5, 10],
    defense: [-25, -12],
    physical: [-10, 0],
    mental: [0, 6],
  },
  LM: {
    attack: [-3, 6],
    defense: [-5, 5],
    physical: [-2, 6],
    mental: [-4, 4],
  },
  RM: {
    attack: [-3, 6],
    defense: [-5, 5],
    physical: [-2, 6],
    mental: [-4, 4],
  },
  CM: {
    attack: [-5, 5],
    defense: [-5, 5],
    physical: [-6, 4],
    mental: [-3, 5],
  },
  CDM: {
    attack: [-25, -12],
    defense: [4, 10],
    physical: [0, 7],
    mental: [-5, 3],
  },
  LB: {
    attack: [-12, -2],
    defense: [2, 8],
    physical: [2, 9],
    mental: [-8, 2],
  },
  RB: {
    attack: [-12, -2],
    defense: [2, 8],
    physical: [2, 9],
    mental: [-8, 2],
  },
  CB: {
    attack: [-35, -20],
    defense: [3, 8],
    physical: [-4, 4],
    mental: [-8, 2],
  },
}

export const PRIORITY_LABELS: Record<CareerPriority, string> = {
  PLAYING_TIME: '出场时间',
  COMPETITIVE_LEVEL: '竞技水平',
  SALARY: '工资收入',
  STABILITY: '职业稳定',
}

export const PRIORITY_VALUES = [85, 70, 55, 40] as const

export const PREFERRED_LEAGUES = [
  '英格兰',
  '西班牙',
  '意大利',
  '德国',
  '法国',
  '荷兰',
  '葡萄牙',
  '比利时',
  '日本',
  '韩国',
  '巴西',
  '阿根廷',
] as const

export const YOUTH_BENCHMARKS: Record<Club['tier'], number> = {
  1: 48,
  2: 45,
  3: 42,
  4: 39,
  5: 36,
  6: 33,
}

export const FIRST_TEAM_BENCHMARKS: Record<Club['tier'], number> = {
  1: 85,
  2: 80,
  3: 74,
  4: 68,
  5: 62,
  6: 56,
}

export const FACILITY_SCORES: Record<Club['facilityTier'], number> = {
  1: 95,
  2: 88,
  3: 80,
  4: 71,
  5: 61,
  6: 51,
}

export const ACADEMY_SCORES: Record<Club['academyTier'], number> = {
  1: 95,
  2: 87,
  3: 78,
  4: 68,
  5: 58,
  6: 48,
}

export const COACH_BASE_SCORES: Record<Club['tier'], number> = {
  1: 94,
  2: 87,
  3: 79,
  4: 70,
  5: 60,
  6: 50,
}

export const YOUTH_STIPENDS: Record<Club['tier'], number> = {
  1: 8000,
  2: 7000,
  3: 6000,
  4: 5000,
  5: 4000,
  6: 3000,
}

export const DOMESTIC_CLUBS: Club[] = [
  {
    id: 'cn_shanghai_donggang',
    name: '上海东港',
    shortMark: '沪',
    country: '中国',
    leagueKey: '中国',
    leagueLabel: '顶级联赛',
    profile: 'ELITE',
    tier: 1,
    facilityTier: 1,
    academyTier: 1,
    description: '训练条件一流，但每一个位置都竞争激烈。',
  },
  {
    id: 'cn_beijing_yuhua',
    name: '北京御华',
    shortMark: '京',
    country: '中国',
    leagueKey: '中国',
    leagueLabel: '顶级联赛',
    profile: 'ELITE',
    tier: 2,
    facilityTier: 2,
    academyTier: 1,
    description: '青训传统突出，进入一线队需要持续证明自己。',
  },
  {
    id: 'cn_wuhan_jiangcheng',
    name: '武汉江城',
    shortMark: '汉',
    country: '中国',
    leagueKey: '中国',
    leagueLabel: '顶级联赛',
    profile: 'BALANCED',
    tier: 3,
    facilityTier: 3,
    academyTier: 3,
    description: '训练与出场较为平衡，承诺给予稳定的青年队机会。',
  },
  {
    id: 'cn_chengdu_jincheng',
    name: '成都锦城',
    shortMark: '蓉',
    country: '中国',
    leagueKey: '中国',
    leagueLabel: '顶级联赛',
    profile: 'BALANCED',
    tier: 4,
    facilityTier: 3,
    academyTier: 4,
    description: '重视年轻球员，竞争和成长环境相对均衡。',
  },
  {
    id: 'cn_guangxi_liancheng',
    name: '广西联城',
    shortMark: '桂',
    country: '中国',
    leagueKey: '中国',
    leagueLabel: '次级联赛',
    profile: 'SMALL',
    tier: 5,
    facilityTier: 5,
    academyTier: 4,
    description: '设施有限，但年轻球员更容易成为青年队核心。',
  },
  {
    id: 'cn_yunnan_shanhe',
    name: '云南山河',
    shortMark: '滇',
    country: '中国',
    leagueKey: '中国',
    leagueLabel: '次级联赛',
    profile: 'SMALL',
    tier: 6,
    facilityTier: 5,
    academyTier: 6,
    description: '竞争压力较小，一线队会更早关注表现突出的新人。',
  },
]

export const OVERSEAS_CLUBS: Club[] = [
  {
    id: 'eng_arsenal', name: '阿森纳', shortMark: '枪', country: '英格兰', leagueKey: '英格兰', leagueLabel: '英格兰顶级联赛',
    profile: 'ELITE', tier: 1, facilityTier: 1, academyTier: 1,
    description: '顶级竞技平台与训练环境并存，位置竞争极其激烈。',
  },
  {
    id: 'eng_liverpool', name: '利物浦', shortMark: '利', country: '英格兰', leagueKey: '英格兰', leagueLabel: '英格兰顶级联赛',
    profile: 'ELITE', tier: 1, facilityTier: 1, academyTier: 2,
    description: '比赛强度高，年轻球员必须迅速适应攻防节奏。',
  },
  {
    id: 'esp_real_madrid', name: '皇家马德里', shortMark: '皇', country: '西班牙', leagueKey: '西班牙', leagueLabel: '西班牙顶级联赛',
    profile: 'ELITE', tier: 1, facilityTier: 1, academyTier: 1,
    description: '世界级平台，曝光度与竞争压力同样巨大。',
  },
  {
    id: 'esp_barcelona', name: '巴塞罗那', shortMark: '巴', country: '西班牙', leagueKey: '西班牙', leagueLabel: '西班牙顶级联赛',
    profile: 'ELITE', tier: 1, facilityTier: 1, academyTier: 1,
    description: '重视技术与青训传统，但一线队门槛很高。',
  },
  {
    id: 'ita_inter', name: '国际米兰', shortMark: '国', country: '意大利', leagueKey: '意大利', leagueLabel: '意大利顶级联赛',
    profile: 'ELITE', tier: 1, facilityTier: 1, academyTier: 2,
    description: '战术要求严格，成熟稳定的表现更容易赢得信任。',
  },
  {
    id: 'ita_juventus', name: '尤文图斯', shortMark: '尤', country: '意大利', leagueKey: '意大利', leagueLabel: '意大利顶级联赛',
    profile: 'ELITE', tier: 2, facilityTier: 1, academyTier: 2,
    description: '重视结果和战术纪律，竞争环境强硬。',
  },
  {
    id: 'ger_bayern', name: '拜仁慕尼黑', shortMark: '拜', country: '德国', leagueKey: '德国', leagueLabel: '德国顶级联赛',
    profile: 'ELITE', tier: 1, facilityTier: 1, academyTier: 1,
    description: '训练与竞技标准极高，几乎没有轻松的轮换位置。',
  },
  {
    id: 'ger_dortmund', name: '多特蒙德', shortMark: '多', country: '德国', leagueKey: '德国', leagueLabel: '德国顶级联赛',
    profile: 'ELITE', tier: 2, facilityTier: 1, academyTier: 1,
    description: '愿意培养年轻球员，但需要用比赛持续兑现潜力。',
  },
  {
    id: 'fra_psg', name: '巴黎圣日耳曼', shortMark: '巴', country: '法国', leagueKey: '法国', leagueLabel: '法国顶级联赛',
    profile: 'ELITE', tier: 1, facilityTier: 1, academyTier: 1,
    description: '资源和关注度顶尖，阵容竞争同样残酷。',
  },
  {
    id: 'fra_monaco', name: '摩纳哥', shortMark: '摩', country: '法国', leagueKey: '法国', leagueLabel: '法国顶级联赛',
    profile: 'BALANCED', tier: 2, facilityTier: 2, academyTier: 1,
    description: '青年培养路径清晰，是进入五大联赛的重要跳板。',
  },
  {
    id: 'ned_ajax', name: '阿贾克斯', shortMark: '阿', country: '荷兰', leagueKey: '荷兰', leagueLabel: '荷兰顶级联赛',
    profile: 'ELITE', tier: 3, facilityTier: 2, academyTier: 1,
    description: '技术和青训传统突出，成长空间优于短期薪资。',
  },
  {
    id: 'ned_psv', name: '埃因霍温', shortMark: '埃', country: '荷兰', leagueKey: '荷兰', leagueLabel: '荷兰顶级联赛',
    profile: 'BALANCED', tier: 3, facilityTier: 2, academyTier: 2,
    description: '攻势足球环境适合年轻球员积累欧洲比赛经验。',
  },
  {
    id: 'por_benfica', name: '本菲卡', shortMark: '本', country: '葡萄牙', leagueKey: '葡萄牙', leagueLabel: '葡萄牙顶级联赛',
    profile: 'ELITE', tier: 2, facilityTier: 2, academyTier: 1,
    description: '青训与球员发展体系成熟，欧洲曝光度较高。',
  },
  {
    id: 'por_porto', name: '波尔图', shortMark: '波', country: '葡萄牙', leagueKey: '葡萄牙', leagueLabel: '葡萄牙顶级联赛',
    profile: 'ELITE', tier: 2, facilityTier: 2, academyTier: 2,
    description: '比赛要求强硬，适合希望快速证明自己的球员。',
  },
  {
    id: 'bel_brugge', name: '布鲁日', shortMark: '布', country: '比利时', leagueKey: '比利时', leagueLabel: '比利时顶级联赛',
    profile: 'BALANCED', tier: 3, facilityTier: 3, academyTier: 2,
    description: '兼顾欧战机会和年轻球员出场，是务实的留洋入口。',
  },
  {
    id: 'bel_anderlecht', name: '安德莱赫特', shortMark: '安', country: '比利时', leagueKey: '比利时', leagueLabel: '比利时顶级联赛',
    profile: 'BALANCED', tier: 4, facilityTier: 3, academyTier: 1,
    description: '青训传统深厚，能够提供相对明确的成长通道。',
  },
  {
    id: 'jpn_urawa', name: '浦和红钻', shortMark: '浦', country: '日本', leagueKey: '日本', leagueLabel: '日本顶级联赛',
    profile: 'BALANCED', tier: 4, facilityTier: 3, academyTier: 3,
    description: '职业化程度高，适应成本低于欧洲联赛。',
  },
  {
    id: 'jpn_vissel', name: '神户胜利船', shortMark: '神', country: '日本', leagueKey: '日本', leagueLabel: '日本顶级联赛',
    profile: 'BALANCED', tier: 4, facilityTier: 3, academyTier: 3,
    description: '重视比赛控制与职业习惯，出场竞争相对均衡。',
  },
  {
    id: 'kor_ulsan', name: '蔚山HD', shortMark: '蔚', country: '韩国', leagueKey: '韩国', leagueLabel: '韩国顶级联赛',
    profile: 'BALANCED', tier: 4, facilityTier: 3, academyTier: 3,
    description: '对抗和跑动要求很高，能够磨炼身体与比赛强度。',
  },
  {
    id: 'kor_jeonbuk', name: '全北现代', shortMark: '全', country: '韩国', leagueKey: '韩国', leagueLabel: '韩国顶级联赛',
    profile: 'BALANCED', tier: 4, facilityTier: 3, academyTier: 3,
    description: '成熟的亚洲职业平台，角色竞争与出场机会并存。',
  },
  {
    id: 'bra_palmeiras', name: '帕尔梅拉斯', shortMark: '帕', country: '巴西', leagueKey: '巴西', leagueLabel: '巴西顶级联赛',
    profile: 'ELITE', tier: 2, facilityTier: 2, academyTier: 1,
    description: '人才密度高、赛程强度大，成长与竞争都很直接。',
  },
  {
    id: 'bra_flamengo', name: '弗拉门戈', shortMark: '弗', country: '巴西', leagueKey: '巴西', leagueLabel: '巴西顶级联赛',
    profile: 'ELITE', tier: 2, facilityTier: 2, academyTier: 2,
    description: '球迷关注度高，表现起伏会迅速影响舆论环境。',
  },
  {
    id: 'arg_river', name: '河床', shortMark: '河', country: '阿根廷', leagueKey: '阿根廷', leagueLabel: '阿根廷顶级联赛',
    profile: 'ELITE', tier: 2, facilityTier: 2, academyTier: 1,
    description: '青训和竞争传统突出，强调技术与比赛意志。',
  },
  {
    id: 'arg_boca', name: '博卡青年', shortMark: '博', country: '阿根廷', leagueKey: '阿根廷', leagueLabel: '阿根廷顶级联赛',
    profile: 'ELITE', tier: 2, facilityTier: 2, academyTier: 2,
    description: '比赛氛围强烈，心理承压和球迷关系尤为重要。',
  },
]

export const CLUBS: Club[] = [...DOMESTIC_CLUBS, ...OVERSEAS_CLUBS]

export function isOverseasClub(club: Club): boolean {
  return club.country !== '中国'
}

export const BASE_RATES: Record<
  Position,
  { goals: number; assists: number; yellow: number; red: number }
> = {
  ST: { goals: 0.32, assists: 0.1, yellow: 0.05, red: 0.004 },
  LW: { goals: 0.2, assists: 0.17, yellow: 0.06, red: 0.004 },
  RW: { goals: 0.2, assists: 0.17, yellow: 0.06, red: 0.004 },
  CAM: { goals: 0.14, assists: 0.22, yellow: 0.07, red: 0.006 },
  LM: { goals: 0.1, assists: 0.18, yellow: 0.11, red: 0.006 },
  RM: { goals: 0.1, assists: 0.18, yellow: 0.11, red: 0.006 },
  CM: { goals: 0.08, assists: 0.16, yellow: 0.15, red: 0.008 },
  CDM: { goals: 0.04, assists: 0.09, yellow: 0.22, red: 0.012 },
  LB: { goals: 0.03, assists: 0.12, yellow: 0.18, red: 0.012 },
  RB: { goals: 0.03, assists: 0.12, yellow: 0.18, red: 0.012 },
  CB: { goals: 0.04, assists: 0.03, yellow: 0.2, red: 0.014 },
}

export const YOUTH_ATTACK_FACTORS: Record<Club['academyTier'], number> = {
  1: 1.2,
  2: 1.12,
  3: 1.05,
  4: 1,
  5: 0.93,
  6: 0.87,
}
