import type {
  CareerConsequence,
  CareerEventCategory,
  CareerEventChoiceId,
  CareerEventId,
  CareerEventRecord,
  GameState,
  HalfYearReport,
  Player,
  PlayerEventDelta,
} from '../models/game'
import { createRandom, weightedPick } from './random'

export interface CareerEventChoice {
  id: CareerEventChoiceId
  title: string
  description: string
  effectPreview: string
  outcomeSummary: string
  playerDelta: PlayerEventDelta
  cashDeltaEuro?: number
  trainingBonus?: number
  delayed?: {
    playerDelta: PlayerEventDelta
    trainingBonus?: number
    summary: string
  }
}

export interface CareerEventDefinition {
  id: CareerEventId
  category: CareerEventCategory
  eyebrow: string
  title: string
  description: string
  weight: number
  isEligible: (state: GameState) => boolean
  choices: readonly CareerEventChoice[]
}

const always = () => true
const hasContract = (state: GameState) => Boolean(state.contract)
const latestRating = (state: GameState) =>
  state.lastReport?.stats.averageRating ?? 6.6

export const CAREER_EVENTS: readonly CareerEventDefinition[] = [
  {
    id: 'COACH_DEFENSIVE_TASK',
    category: 'COACH',
    eyebrow: '教练 · 战术要求',
    title: '球队需要你补上防守训练。',
    description:
      '教练认为你的进攻特点已经很鲜明，但球队最近缺少愿意参与防守的球员。',
    weight: 12,
    isEligible: (state) =>
      Boolean(state.player) &&
      state.player!.attributes.defense < state.player!.attributes.attack,
    choices: [
      {
        id: 'A',
        title: '接受额外训练',
        description: '按教练要求增加防守课。',
        effectPreview: '防守、教练关系上升 · 身体略降',
        outcomeSummary:
          '你接受了额外防守训练。教练开始把你视为更可靠的战术执行者。',
        playerDelta: {
          attributes: { defense: 0.8 },
          coachRelation: 5,
          fitness: -3,
        },
        delayed: {
          playerDelta: { coachRelation: 2 },
          trainingBonus: 1,
          summary: '上个窗口的防守加练让教练更愿意为你安排针对性训练。',
        },
      },
      {
        id: 'B',
        title: '先谈角色定位',
        description: '接受要求，但请教练说明长期计划。',
        effectPreview: '心理、教练关系小幅上升',
        outcomeSummary:
          '你先确认了战术定位，再接受调整。沟通让训练目标变得清楚。',
        playerDelta: {
          attributes: { mental: 0.5 },
          coachRelation: 2,
          morale: 1,
        },
      },
      {
        id: 'C',
        title: '坚持进攻特长',
        description: '礼貌拒绝，把精力留给自己的强项。',
        effectPreview: '心理状态上升 · 教练关系下降',
        outcomeSummary:
          '你坚持把训练资源用于进攻。方向更明确，但教练对你的服从度有所保留。',
        playerDelta: { morale: 3, coachRelation: -5, reputation: -1 },
      },
    ],
  },
  {
    id: 'COACH_ROLE_TRIAL',
    category: 'COACH',
    eyebrow: '教练 · 临场试验',
    title: '教练想在下一场改变你的场上职责。',
    description:
      '这不是正式学习新位置，而是一次短期战术试验，可能改变教练对你的判断。',
    weight: 9,
    isEligible: (state) => state.windowIndex >= 2,
    choices: [
      {
        id: 'A',
        title: '完全接受安排',
        description: '先证明自己的战术适应力。',
        effectPreview: '心理、教练关系上升 · 状态略降',
        outcomeSummary:
          '你没有犹豫地接受新职责。短期表现略有波动，但教练记住了你的适应性。',
        playerDelta: {
          attributes: { mental: 0.7 },
          coachRelation: 4,
          form: -2,
        },
        delayed: {
          playerDelta: { form: 2 },
          trainingBonus: 0.5,
          summary: '此前的战术试验开始转化为更好的比赛理解。',
        },
      },
      {
        id: 'B',
        title: '提出阶段试用',
        description: '先试一场，再与教练共同复盘。',
        effectPreview: '竞技、教练关系小幅上升',
        outcomeSummary:
          '你和教练约定先试用再复盘，既保留了主动权，也没有回避球队需要。',
        playerDelta: { coachRelation: 2, form: 1, morale: 1 },
      },
      {
        id: 'C',
        title: '专注原有职责',
        description: '说明自己希望继续打磨当前特点。',
        effectPreview: '进攻、心理状态上升 · 教练关系下降',
        outcomeSummary:
          '你选择继续打磨原有职责，个人方向更稳定，但错过了一次战术展示。',
        playerDelta: {
          attributes: { attack: 0.5 },
          morale: 2,
          coachRelation: -2,
        },
      },
    ],
  },
  {
    id: 'CAPTAIN_VIDEO_REVIEW',
    category: 'TEAM',
    eyebrow: '更衣室 · 队长邀请',
    title: '队长邀请你参加赛后录像复盘。',
    description:
      '这不是强制活动，但资深球员都在观察年轻人愿不愿意参与球队讨论。',
    weight: 10,
    isEligible: always,
    choices: [
      {
        id: 'A',
        title: '主动承担分析',
        description: '准备片段，并在会议上表达判断。',
        effectPreview: '心理、队内关系上升 · 身体略降',
        outcomeSummary:
          '你的准备让队友看到了比赛理解力，也让自己在更衣室里更有存在感。',
        playerDelta: {
          attributes: { mental: 0.6 },
          squadRelation: 5,
          fitness: -1,
        },
      },
      {
        id: 'B',
        title: '认真旁听学习',
        description: '少说多听，记录资深球员的判断。',
        effectPreview: '队内、教练关系小幅上升',
        outcomeSummary:
          '你认真听完了复盘。没有抢镜，但队长认可你的学习态度。',
        playerDelta: { squadRelation: 3, coachRelation: 1 },
      },
      {
        id: 'C',
        title: '把时间留给恢复',
        description: '婉拒邀请，优先休息和身体恢复。',
        effectPreview: '身体状态上升 · 队内关系下降',
        outcomeSummary:
          '你选择优先恢复身体。状态得到改善，但队友觉得你仍有些游离。',
        playerDelta: { fitness: 3, squadRelation: -3 },
      },
    ],
  },
  {
    id: 'TEAMMATE_RIVALRY',
    category: 'TEAM',
    eyebrow: '更衣室 · 位置竞争',
    title: '同位置队友开始公开与你竞争。',
    description:
      '训练表现接近的两个人只能有一个首发位置，更衣室也在等待你的反应。',
    weight: 10,
    isEligible: always,
    choices: [
      {
        id: 'A',
        title: '共享训练心得',
        description: '竞争继续，但不把彼此当作敌人。',
        effectPreview: '队内关系、心理能力上升',
        outcomeSummary:
          '你主动分享训练心得。竞争没有消失，却开始变成互相推动。',
        playerDelta: {
          attributes: { mental: 0.4 },
          squadRelation: 5,
        },
      },
      {
        id: 'B',
        title: '训练场正面对决',
        description: '用每一次对抗证明自己更值得首发。',
        effectPreview: '竞技状态上升 · 队内关系下降',
        outcomeSummary:
          '你把竞争带进每一堂训练课。状态被激活，但彼此之间的距离也变大了。',
        playerDelta: { form: 4, squadRelation: -2, fitness: -1 },
      },
      {
        id: 'C',
        title: '找教练谈轮换',
        description: '把竞争规则交给教练明确。',
        effectPreview: '心理、教练关系上升 · 队内关系略降',
        outcomeSummary:
          '你要求教练明确竞争规则，内心更踏实，但队友认为你把问题带出了更衣室。',
        playerDelta: { coachRelation: 2, morale: 2, squadRelation: -2 },
      },
    ],
  },
  {
    id: 'DRESSING_ROOM_DISPUTE',
    category: 'TEAM',
    eyebrow: '更衣室 · 内部矛盾',
    title: '一次训练冲突让更衣室气氛紧张。',
    description:
      '两名队友互相指责，队长希望有人让大家重新把注意力放回比赛。',
    weight: 7,
    isEligible: (state) => Boolean(state.player) && state.player!.squadRelation < 68,
    choices: [
      {
        id: 'A',
        title: '主动居中调解',
        description: '分别沟通，避免矛盾继续扩大。',
        effectPreview: '队内、教练关系上升 · 心理略降',
        outcomeSummary:
          '你帮助双方把话说开。过程消耗精力，却让更多队友开始信任你。',
        playerDelta: { squadRelation: 4, coachRelation: 2, morale: -2 },
      },
      {
        id: 'B',
        title: '支持队长处理',
        description: '不抢话语权，执行队长的安排。',
        effectPreview: '教练、队内关系小幅上升',
        outcomeSummary:
          '你支持队长恢复秩序，既没有扩大冲突，也展示了团队立场。',
        playerDelta: { coachRelation: 3, squadRelation: 2, clubAttachment: 1 },
      },
      {
        id: 'C',
        title: '请全队简单聚餐',
        description: '花一笔现金，让大家在训练外重新交流。',
        effectPreview: '队内关系明显上升 · 支出€600',
        outcomeSummary:
          '一顿不奢华的聚餐缓和了气氛。钱花得不算少，但更衣室重新有了笑声。',
        playerDelta: { squadRelation: 7, morale: 2 },
        cashDeltaEuro: -600,
      },
    ],
  },
  {
    id: 'MEDIA_BREAKTHROUGH',
    category: 'MEDIA',
    eyebrow: '舆论 · 突然走红',
    title: '一段比赛集锦让你受到额外关注。',
    description:
      '本地媒体把你称作值得期待的年轻球员，记者要求你回应外界评价。',
    weight: 8,
    isEligible: (state) =>
      Boolean(state.player) &&
      (state.player!.reputation >= 18 || latestRating(state) >= 6.9),
    choices: [
      {
        id: 'A',
        title: '低调谈论训练',
        description: '把关注归因于球队和日常准备。',
        effectPreview: '媒体、教练关系小幅上升',
        outcomeSummary:
          '你把话题拉回训练和球队。报道不算轰动，但俱乐部认可你的分寸。',
        playerDelta: { mediaRelation: 2, coachRelation: 2, reputation: 1 },
      },
      {
        id: 'B',
        title: '公开更高目标',
        description: '告诉记者，自己准备挑战更高舞台。',
        effectPreview: '声誉、媒体关系上升 · 下窗口压力增加',
        outcomeSummary:
          '你的雄心成为标题，知名度迅速上升，也给接下来的比赛加上了压力。',
        playerDelta: { mediaRelation: 5, reputation: 4, morale: 2 },
        delayed: {
          playerDelta: { morale: -3, form: -1 },
          summary: '此前公开的高目标持续受到追问，你感受到了额外舆论压力。',
        },
      },
      {
        id: 'C',
        title: '把荣誉归于球队',
        description: '重点感谢队友、教练和俱乐部。',
        effectPreview: '球迷关系、忠诚度上升',
        outcomeSummary:
          '你的回答让球迷和队友都很受用，个人热度也转化为对俱乐部的认同。',
        playerDelta: { fanRelation: 5, clubAttachment: 4, mediaRelation: 1 },
      },
    ],
  },
  {
    id: 'ONLINE_CRITICISM',
    category: 'MEDIA',
    eyebrow: '舆论 · 网络质疑',
    title: '连续几场普通表现引来网络批评。',
    description:
      '有人质疑你只靠天赋，也有人认为俱乐部给了你过多机会。',
    weight: 9,
    isEligible: (state) =>
      Boolean(state.player) &&
      (state.player!.morale < 72 || latestRating(state) < 6.8),
    choices: [
      {
        id: 'A',
        title: '关闭评论区',
        description: '不回应，把注意力重新放回训练。',
        effectPreview: '心理能力、心理状态上升',
        outcomeSummary:
          '你暂时切断了外界噪音。话题很快降温，训练注意力重新集中。',
        playerDelta: {
          attributes: { mental: 0.5 },
          morale: 2,
          mediaRelation: -1,
        },
      },
      {
        id: 'B',
        title: '亲自公开回应',
        description: '捍卫自己的努力和比赛态度。',
        effectPreview: '声誉、媒体关系上升 · 心理略降',
        outcomeSummary:
          '你的回应赢得了一些支持，也让争议继续占据讨论区。',
        playerDelta: { mediaRelation: 2, reputation: 2, morale: -2 },
        delayed: {
          playerDelta: { mediaRelation: -2 },
          summary: '此前的公开回应仍被反复引用，你与媒体的关系出现余波。',
        },
      },
      {
        id: 'C',
        title: '请俱乐部协助',
        description: '由新闻官处理舆论，自己接受心理沟通。',
        effectPreview: '心理状态明显恢复',
        outcomeSummary:
          '俱乐部替你挡下了部分舆论压力，心理沟通也帮助你恢复稳定。',
        playerDelta: { morale: 4, coachRelation: 1, mediaRelation: 1 },
      },
    ],
  },
  {
    id: 'FAN_DAY_OR_REST',
    category: 'MEDIA',
    eyebrow: '球迷 · 公开活动',
    title: '球迷见面会与恢复训练撞期。',
    description:
      '俱乐部允许你自己决定参加程度，但球迷和体能团队都在等待答案。',
    weight: 8,
    isEligible: (state) => Boolean(state.player) && state.player!.reputation >= 12,
    choices: [
      {
        id: 'A',
        title: '全程参加活动',
        description: '认真满足签名和交流需求。',
        effectPreview: '球迷、媒体关系上升 · 身体下降',
        outcomeSummary:
          '你全程留在活动现场，球迷非常满意，但恢复时间被明显压缩。',
        playerDelta: { fanRelation: 6, mediaRelation: 2, fitness: -3 },
      },
      {
        id: 'B',
        title: '只参加核心环节',
        description: '完成公开露面后按时返回恢复。',
        effectPreview: '球迷关系上升 · 身体略降',
        outcomeSummary:
          '你完成了最重要的交流环节，也保留了大部分恢复时间。',
        playerDelta: { fanRelation: 3, fitness: -1 },
      },
      {
        id: 'C',
        title: '完全留在基地',
        description: '优先恢复，为接下来的比赛负责。',
        effectPreview: '身体状态上升 · 球迷关系下降',
        outcomeSummary:
          '你选择留在基地恢复。体能团队满意，一部分等待已久的球迷却感到失望。',
        playerDelta: { fitness: 4, fanRelation: -3 },
      },
    ],
  },
  {
    id: 'FITNESS_WARNING',
    category: 'HEALTH',
    eyebrow: '身体 · 负荷警报',
    title: '体能团队发现你的疲劳指标偏高。',
    description:
      '目前还不是伤病，但继续维持高负荷可能影响接下来几周的训练质量。',
    weight: 11,
    isEligible: (state) =>
      Boolean(state.player) &&
      (state.player!.fitness < 78 || state.developmentApproach === 'PUSH'),
    choices: [
      {
        id: 'A',
        title: '完整执行休整',
        description: '减少训练量，先把身体恢复到安全水平。',
        effectPreview: '身体明显上升 · 竞技状态略降',
        outcomeSummary:
          '你完整执行了恢复方案，身体指标回到安全区，但训练节奏暂时放慢。',
        playerDelta: { fitness: 7, form: -2, coachRelation: 2 },
      },
      {
        id: 'B',
        title: '改为低强度训练',
        description: '保留训练连续性，同时减少高负荷内容。',
        effectPreview: '身体、身体能力小幅上升',
        outcomeSummary:
          '你接受了低强度训练，既保住节奏，也让疲劳得到控制。',
        playerDelta: { fitness: 3, attributes: { physical: 0.4 } },
      },
      {
        id: 'C',
        title: '隐瞒疲劳继续练',
        description: '不想错过竞争机会，维持原有强度。',
        effectPreview: '竞技状态上升 · 下窗口身体风险',
        outcomeSummary:
          '你维持了训练强度，短期状态更锐利，但疲劳没有真正消失。',
        playerDelta: { form: 3, fitness: -2, morale: 2 },
        trainingBonus: 1,
        delayed: {
          playerDelta: { fitness: -7, morale: -1 },
          trainingBonus: -1,
          summary: '此前被隐瞒的疲劳重新出现，体能团队被迫降低训练负荷。',
        },
      },
    ],
  },
  {
    id: 'KEY_MATCH_PAIN',
    category: 'HEALTH',
    eyebrow: '身体 · 赛前不适',
    title: '关键比赛前，你感到脚踝轻微不适。',
    description:
      '检查结果并不严重，但是否如实报告、是否坚持比赛，将由你自己决定。',
    weight: 7,
    isEligible: (state) =>
      state.history.length >= 2 || Boolean(state.contract),
    choices: [
      {
        id: 'A',
        title: '立即报告队医',
        description: '接受评估，即使可能错过部分比赛。',
        effectPreview: '身体、教练关系上升 · 状态略降',
        outcomeSummary:
          '你第一时间报告不适。出场准备受到影响，但俱乐部认可你的职业态度。',
        playerDelta: { fitness: 4, coachRelation: 3, form: -2 },
      },
      {
        id: 'B',
        title: '申请限制时间',
        description: '愿意出场，但请教练控制比赛负荷。',
        effectPreview: '竞技状态上升 · 身体略降',
        outcomeSummary:
          '你和教练约定控制负荷，既保留了出场机会，也没有完全忽视风险。',
        playerDelta: { form: 2, fitness: -2, coachRelation: 1 },
      },
      {
        id: 'C',
        title: '咬牙踢满全场',
        description: '把关键比赛放在身体风险之前。',
        effectPreview: '竞技、心理上升 · 下窗口身体代价',
        outcomeSummary:
          '你坚持完成比赛，赢得了更衣室尊重，但脚踝负担继续累积。',
        playerDelta: { form: 5, fitness: -5, morale: 2, squadRelation: 2 },
        delayed: {
          playerDelta: { fitness: -8 },
          summary: '关键比赛留下的脚踝负担在恢复期再次显现。',
        },
      },
    ],
  },
  {
    id: 'CONTRACT_ROLE_TALK',
    category: 'CONTRACT',
    eyebrow: '合同 · 角色沟通',
    title: '你的实际角色与合同承诺出现落差。',
    description:
      '经纪人建议尽早沟通，但直接施压也可能伤害你与教练的关系。',
    weight: 13,
    isEligible: (state) =>
      hasContract(state) &&
      Boolean(state.contract && state.contract.brokenPromiseWindows > 0),
    choices: [
      {
        id: 'A',
        title: '直接要求发展计划',
        description: '与教练面对面确认角色和时间表。',
        effectPreview: '心理状态、教练关系上升',
        outcomeSummary:
          '你要求俱乐部给出明确的发展计划。谈话并不轻松，但双方至少重新对齐了预期。',
        playerDelta: { morale: 3, coachRelation: 1, agentRelation: 1 },
        delayed: {
          playerDelta: { coachRelation: 2, form: 1 },
          summary: '角色沟通后，教练开始在训练和比赛安排中给出更明确反馈。',
        },
      },
      {
        id: 'B',
        title: '继续耐心等待',
        description: '用训练表现争取，而不是公开挑战安排。',
        effectPreview: '队内关系上升 · 心理状态小幅下降',
        outcomeSummary:
          '你选择继续等待机会，更衣室认可你的克制，但不确定性仍然存在。',
        playerDelta: { squadRelation: 3, morale: -1, clubAttachment: 1 },
      },
      {
        id: 'C',
        title: '让经纪人施压',
        description: '由经纪人向管理层提出正式交涉。',
        effectPreview: '经纪人、媒体关系上升 · 教练关系下降',
        outcomeSummary:
          '经纪人把问题带到管理层，俱乐部无法继续回避，但教练对这种方式并不满意。',
        playerDelta: { agentRelation: 5, mediaRelation: 2, coachRelation: -4 },
      },
    ],
  },
  {
    id: 'TRANSFER_RUMOR',
    category: 'CONTRACT',
    eyebrow: '转会 · 传闻发酵',
    title: '媒体突然把你与另一家俱乐部联系起来。',
    description:
      '消息真假难辨，但你的回应会影响现俱乐部、球迷和潜在追求者的态度。',
    weight: 8,
    isEligible: (state) =>
      hasContract(state) && Boolean(state.player && state.player.reputation >= 22),
    choices: [
      {
        id: 'A',
        title: '明确否认传闻',
        description: '强调自己只关注当前俱乐部。',
        effectPreview: '忠诚度、球迷关系上升',
        outcomeSummary:
          '你迅速否认传闻，现俱乐部和球迷感到安心，外界话题也很快降温。',
        playerDelta: { clubAttachment: 4, fanRelation: 4, mediaRelation: 1 },
      },
      {
        id: 'B',
        title: '保持模糊回应',
        description: '不承认也不否认，让市场继续关注。',
        effectPreview: '声誉、媒体关系上升 · 忠诚度下降',
        outcomeSummary:
          '你留下了想象空间，市场关注明显增加，但现俱乐部开始怀疑你的长期态度。',
        playerDelta: { reputation: 3, mediaRelation: 4, clubAttachment: -3 },
      },
      {
        id: 'C',
        title: '公开留洋梦想',
        description: '坦率表达未来希望挑战更高水平。',
        effectPreview: '心理、声誉上升 · 球迷和教练关系下降',
        outcomeSummary:
          '你公开表达了更高目标，个人方向更加坚定，但一部分球迷和教练并不高兴。',
        playerDelta: { morale: 4, reputation: 2, fanRelation: -4, coachRelation: -2 },
      },
    ],
  },
]

const eventMap = new Map(CAREER_EVENTS.map((event) => [event.id, event]))

export function getCareerEvent(id: CareerEventId): CareerEventDefinition {
  const event = eventMap.get(id)
  if (!event) throw new Error(`Unknown career event: ${id}`)
  return event
}

export function selectCareerEvent(state: GameState): CareerEventId | null {
  if (!state.player || state.windowIndex === 0) return null
  const recentIds = new Set(
    state.careerEventHistory
      .filter((entry) => state.windowIndex - entry.windowIndex <= 2)
      .map((entry) => entry.eventId),
  )
  const eligible = CAREER_EVENTS.filter(
    (event) => !recentIds.has(event.id) && event.isEligible(state),
  )
  if (eligible.length === 0) return null

  const lastWindow = state.careerEventHistory.at(-1)?.windowIndex ?? -99
  const guaranteed =
    state.windowIndex === 1 ||
    (Boolean(state.contract) && state.windowIndex === 4) ||
    state.windowIndex - lastWindow >= 2
  const random = createRandom(
    state.careerSeed,
    'career-event',
    state.windowIndex,
  )
  const triggerChance = state.contract ? 0.8 : 0.7
  if (!guaranteed && random.next() > triggerChance) return null

  return weightedPick(
    random,
    eligible.map((event) => ({ value: event.id, weight: event.weight })),
  )
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function applyPlayerDelta(
  player: Player,
  requested: PlayerEventDelta,
): { player: Player; appliedDelta: PlayerEventDelta } {
  const next = structuredClone(player)
  const applied: PlayerEventDelta = {}

  if (requested.attributes) {
    const appliedAttributes: NonNullable<PlayerEventDelta['attributes']> = {}
    for (const [key, delta] of Object.entries(requested.attributes)) {
      const attribute = key as keyof Player['attributes']
      const before = next.attributes[attribute]
      const after = roundTenth(
        clamp(before + (delta ?? 0), 0, next.potentials[attribute]),
      )
      next.attributes[attribute] = after
      appliedAttributes[attribute] = roundTenth(after - before)
    }
    applied.attributes = appliedAttributes
  }

  const ratingKeys = [
    'form',
    'fitness',
    'morale',
    'coachRelation',
    'squadRelation',
    'agentRelation',
    'fanRelation',
    'mediaRelation',
    'reputation',
    'clubAttachment',
  ] as const
  for (const key of ratingKeys) {
    const delta = requested[key]
    if (delta === undefined) continue
    const before = next[key]
    const after = roundTenth(clamp(before + delta))
    next[key] = after
    applied[key] = roundTenth(after - before)
  }

  return { player: next, appliedDelta: applied }
}

export function resolveCareerEventChoice(input: {
  state: GameState
  eventId: CareerEventId
  choiceId: CareerEventChoiceId
}): {
  player: Player
  cashEuro: number
  trainingBonus: number
  record: CareerEventRecord
  consequence: CareerConsequence | null
} {
  const { state, eventId, choiceId } = input
  if (!state.player) throw new Error('特殊事件缺少球员状态。')
  const event = getCareerEvent(eventId)
  const choice = event.choices.find((candidate) => candidate.id === choiceId)
  if (!choice) throw new Error('这个特殊事件选项不存在。')

  const resolved = applyPlayerDelta(state.player, choice.playerDelta)
  const requestedCashDelta = choice.cashDeltaEuro ?? 0
  const cashDeltaEuro = Math.max(-state.cashEuro, requestedCashDelta)
  const record: CareerEventRecord = {
    eventId,
    choiceId,
    windowIndex: state.windowIndex,
    choiceTitle: choice.title,
    outcomeSummary: choice.outcomeSummary,
    appliedDelta: resolved.appliedDelta,
    cashDeltaEuro,
  }
  const consequence = choice.delayed
    ? {
        id: `${eventId}:${state.windowIndex}:${choiceId}`,
        sourceEventId: eventId,
        applyAtWindow: state.windowIndex + 1,
        playerDelta: choice.delayed.playerDelta,
        trainingBonus: choice.delayed.trainingBonus ?? 0,
        summary: choice.delayed.summary,
      }
    : null

  return {
    player: resolved.player,
    cashEuro: state.cashEuro + cashDeltaEuro,
    trainingBonus: choice.trainingBonus ?? 0,
    record,
    consequence,
  }
}

function mergeAppliedDelta(
  first: PlayerEventDelta,
  second: PlayerEventDelta,
): PlayerEventDelta {
  const merged: PlayerEventDelta = { ...first }
  if (first.attributes || second.attributes) {
    merged.attributes = { ...first.attributes }
    for (const [key, value] of Object.entries(second.attributes ?? {})) {
      const attribute = key as keyof Player['attributes']
      merged.attributes[attribute] = roundTenth(
        (merged.attributes[attribute] ?? 0) + (value ?? 0),
      )
    }
  }
  const ratingKeys = [
    'form',
    'fitness',
    'morale',
    'coachRelation',
    'squadRelation',
    'agentRelation',
    'fanRelation',
    'mediaRelation',
    'reputation',
    'clubAttachment',
  ] as const
  for (const key of ratingKeys) {
    if (second[key] === undefined) continue
    merged[key] = roundTenth((merged[key] ?? 0) + (second[key] ?? 0))
  }
  return merged
}

export function consumeCareerConsequences(state: GameState): {
  player: Player | null
  pendingConsequences: CareerConsequence[]
  trainingBonus: number
  appliedDelta: PlayerEventDelta
  summaries: string[]
} {
  if (!state.player) {
    return {
      player: null,
      pendingConsequences: state.pendingConsequences,
      trainingBonus: 0,
      appliedDelta: {},
      summaries: [],
    }
  }
  let player = state.player
  let appliedDelta: PlayerEventDelta = {}
  let trainingBonus = 0
  const summaries: string[] = []
  const pendingConsequences: CareerConsequence[] = []

  for (const consequence of state.pendingConsequences) {
    if (consequence.applyAtWindow !== state.windowIndex) {
      pendingConsequences.push(consequence)
      continue
    }
    const resolved = applyPlayerDelta(player, consequence.playerDelta)
    player = resolved.player
    appliedDelta = mergeAppliedDelta(appliedDelta, resolved.appliedDelta)
    trainingBonus += consequence.trainingBonus
    summaries.push(consequence.summary)
  }

  return {
    player,
    pendingConsequences,
    trainingBonus,
    appliedDelta,
    summaries,
  }
}

function includePriorDelta(
  change: HalfYearReport['states']['form'],
  delta = 0,
) {
  const before = roundTenth(change.before - delta)
  return {
    before,
    after: change.after,
    delta: roundTenth(change.after - before),
  }
}

export function attachCareerEventToReport(input: {
  report: HalfYearReport
  record: CareerEventRecord | null
  appliedConsequenceDelta: PlayerEventDelta
  consequenceSummaries: string[]
}): HalfYearReport {
  const { report, record, appliedConsequenceDelta, consequenceSummaries } = input
  const combinedDelta = record
    ? mergeAppliedDelta(record.appliedDelta, appliedConsequenceDelta)
    : appliedConsequenceDelta
  const event = record ? getCareerEvent(record.eventId) : null

  return {
    ...report,
    attributes: {
      attack: includePriorDelta(
        report.attributes.attack,
        combinedDelta.attributes?.attack,
      ),
      defense: includePriorDelta(
        report.attributes.defense,
        combinedDelta.attributes?.defense,
      ),
      physical: includePriorDelta(
        report.attributes.physical,
        combinedDelta.attributes?.physical,
      ),
      mental: includePriorDelta(
        report.attributes.mental,
        combinedDelta.attributes?.mental,
      ),
    },
    states: {
      form: includePriorDelta(report.states.form, combinedDelta.form),
      fitness: includePriorDelta(report.states.fitness, combinedDelta.fitness),
      morale: includePriorDelta(report.states.morale, combinedDelta.morale),
    },
    relations: {
      coach: includePriorDelta(
        report.relations.coach,
        combinedDelta.coachRelation,
      ),
      squad: includePriorDelta(
        report.relations.squad,
        combinedDelta.squadRelation,
      ),
      fans: includePriorDelta(
        report.relations.fans,
        combinedDelta.fanRelation,
      ),
    },
    expenseEuro:
      report.expenseEuro + Math.max(0, -(record?.cashDeltaEuro ?? 0)),
    specialEvent:
      record && event
        ? {
            eventId: record.eventId,
            title: event.title,
            choiceTitle: record.choiceTitle,
            outcomeSummary: record.outcomeSummary,
          }
        : null,
    consequenceSummaries,
  }
}
