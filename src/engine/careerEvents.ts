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
  delayed?: CareerEventDelayed | readonly CareerEventDelayed[]
  outcomes?: readonly CareerEventOutcome[]
}

interface CareerEventDelayed {
  delayWindows?: 1 | 2 | 3
  playerDelta: PlayerEventDelta
  trainingBonus?: number
  summary: string
}

interface CareerEventOutcome {
  id: string
  label: string
  weight: number
  summary: string
  playerDelta?: PlayerEventDelta
  cashDeltaEuro?: number
  trainingBonus?: number
  delayed?: CareerEventDelayed | readonly CareerEventDelayed[]
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

function delayedList(
  delayed?: CareerEventDelayed | readonly CareerEventDelayed[],
): readonly CareerEventDelayed[] {
  if (!delayed) return []
  return Array.isArray(delayed) ? delayed : [delayed as CareerEventDelayed]
}

function combineRequestedDelta(
  first: PlayerEventDelta,
  second?: PlayerEventDelta,
): PlayerEventDelta {
  if (!second) return first
  const combined: PlayerEventDelta = { ...first }
  if (first.attributes || second.attributes) {
    combined.attributes = { ...first.attributes }
    for (const [key, value] of Object.entries(second.attributes ?? {})) {
      const attribute = key as keyof Player['attributes']
      combined.attributes[attribute] =
        (combined.attributes[attribute] ?? 0) + (value ?? 0)
    }
  }
  const keys = [
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
  for (const key of keys) {
    if (second[key] !== undefined) {
      combined[key] = (combined[key] ?? 0) + (second[key] ?? 0)
    }
  }
  return combined
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
        effectPreview: '支出€600 · 融入效果有波动（队内 +3～+10）',
        outcomeSummary:
          '一顿不奢华的聚餐缓和了气氛。钱花得不算少，但更衣室重新有了笑声。',
        playerDelta: { morale: 1 },
        cashDeltaEuro: -600,
        outcomes: [
          {
            id: 'POLITE',
            label: '礼貌响应',
            weight: 30,
            summary: '大家礼貌到场，但交流停留在表面。这笔钱没有白花，效果却很有限。',
            playerDelta: { squadRelation: 3 },
          },
          {
            id: 'WARM',
            label: '气氛升温',
            weight: 50,
            summary: '聚餐逐渐热闹起来，几名原本疏远的队友开始主动与你交流。',
            playerDelta: { squadRelation: 7, morale: 1 },
          },
          {
            id: 'BREAKTHROUGH',
            label: '真正融入',
            weight: 20,
            summary: '队长把你拉进了核心话题，这顿饭成了你真正融入更衣室的转折点。',
            playerDelta: { squadRelation: 10, coachRelation: 2, morale: 2 },
            delayed: {
              delayWindows: 2,
              playerDelta: { squadRelation: 2 },
              summary: '此前聚餐建立的信任仍在延续，队友更愿意在场上与你配合。',
            },
          },
        ],
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
        effectPreview: '70%赢得关注 · 30%被质疑浮躁',
        outcomeSummary:
          '你的雄心成为标题，知名度迅速上升，也给接下来的比赛加上了压力。',
        playerDelta: { morale: 1 },
        outcomes: [
          {
            id: 'AMBITION',
            label: '雄心被认可',
            weight: 70,
            summary: '这句话成为报道标题。外界把你的目标理解为雄心，关注度迅速上升。',
            playerDelta: { mediaRelation: 5, reputation: 5, morale: 2 },
            delayed: [
              {
                delayWindows: 1,
                playerDelta: { morale: -2, form: -1 },
                summary: '高目标仍被媒体反复提起，你在比赛前感到了额外压力。',
              },
              {
                delayWindows: 2,
                playerDelta: { reputation: 2 },
                summary: '那次公开表态持续扩大了你的知名度，更多人开始关注你的比赛。',
              },
            ],
          },
          {
            id: 'ARROGANT',
            label: '被批评浮躁',
            weight: 30,
            summary: '媒体截取了最强硬的一句话，质疑你尚未证明自己就急着谈论更高舞台。',
            playerDelta: { mediaRelation: -4, coachRelation: -2, morale: -2, reputation: 1 },
          },
        ],
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
        effectPreview: '55%扭转舆论 · 45%争议升级',
        outcomeSummary:
          '你的回应赢得了一些支持，也让争议继续占据讨论区。',
        playerDelta: {},
        outcomes: [
          {
            id: 'TURNAROUND',
            label: '回应赢得支持',
            weight: 55,
            summary: '完整采访让更多人理解了你的处境，批评声没有消失，但舆论明显缓和。',
            playerDelta: { mediaRelation: 4, reputation: 3, morale: 2 },
          },
          {
            id: 'ESCALATION',
            label: '争议继续升级',
            weight: 45,
            summary: '几句话被单独截取，回应反而制造了新的争论，你不得不继续承受关注。',
            playerDelta: { mediaRelation: -4, reputation: 1, morale: -3 },
            delayed: {
              delayWindows: 1,
              playerDelta: { morale: -2 },
              summary: '此前的公开争论仍在社交媒体发酵，心理压力尚未完全消退。',
            },
          },
        ],
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
        effectPreview: '短期状态上升 · 65%出现后续身体代价',
        outcomeSummary:
          '你维持了训练强度，短期状态更锐利，但疲劳没有真正消失。',
        playerDelta: { form: 3, fitness: -2, morale: 2 },
        trainingBonus: 1,
        outcomes: [
          {
            id: 'ESCAPE',
            label: '暂时扛住',
            weight: 35,
            summary: '你暂时扛住了负荷，状态得到提升，但身体警报并没有真正解除。',
            playerDelta: { form: 1 },
          },
          {
            id: 'RELAPSE',
            label: '疲劳反噬',
            weight: 65,
            summary: '高负荷让状态短暂变好，恢复指标却继续恶化，体能团队已经注意到异常。',
            playerDelta: { fitness: -2 },
            delayed: [
              {
                delayWindows: 1,
                playerDelta: { fitness: -7, morale: -1 },
                trainingBonus: -1,
                summary: '此前被隐瞒的疲劳重新出现，体能团队被迫降低训练负荷。',
              },
              {
                delayWindows: 2,
                playerDelta: { coachRelation: -2 },
                summary: '体能团队向教练提交了负荷记录，教练对你隐瞒状况感到不满。',
              },
            ],
          },
        ],
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
        description: '接受完整评估，即使可能错过部分比赛。',
        effectPreview: '身体 +4 · 教练关系 +3 · 竞技状态 -2',
        outcomeSummary: '你第一时间报告不适。出场准备受到影响，但俱乐部认可你的职业态度。',
        playerDelta: { fitness: 4, coachRelation: 3, form: -2 },
      },
      {
        id: 'B',
        title: '申请限制出场时间',
        description: '愿意出场，但请教练在60分钟左右换下你。',
        effectPreview: '75%安全完成 · 25%不适加重',
        outcomeSummary: '你和教练约定控制负荷，既保留出场机会，也没有完全忽视风险。',
        playerDelta: { coachRelation: 1 },
        outcomes: [
          {
            id: 'MANAGED',
            label: '负荷控制成功',
            weight: 75,
            summary: '教练按约定及时换下了你。你完成比赛任务，脚踝也没有进一步反应。',
            playerDelta: { form: 3, fitness: -1, morale: 2 },
          },
          {
            id: 'PAIN',
            label: '不适明显加重',
            weight: 25,
            summary: '比赛强度超出预期，脚踝在一次对抗后明显加重，你只能提前离场。',
            playerDelta: { form: -2, fitness: -6, morale: -2 },
            delayed: {
              delayWindows: 1,
              playerDelta: { fitness: -4 },
              trainingBonus: -0.5,
              summary: '关键比赛留下的脚踝不适仍在影响恢复，本窗口训练负荷受到限制。',
            },
          },
        ],
      },
      {
        id: 'C',
        title: '咬牙踢满全场',
        description: '把关键比赛放在身体风险之前，不主动要求换下。',
        effectPreview: '35%成为英雄 · 65%付出明显身体代价',
        outcomeSummary: '你决定把比赛放在身体风险之前。',
        playerDelta: { squadRelation: 1 },
        outcomes: [
          {
            id: 'HERO',
            label: '带伤完成关键表现',
            weight: 35,
            summary: '脚踝没有拖住你。你在关键时刻完成决定性表现，赢得了更衣室的尊重。',
            playerDelta: { form: 6, fitness: -4, morale: 4, squadRelation: 2, reputation: 2 },
            delayed: {
              delayWindows: 1,
              playerDelta: { fitness: -3 },
              summary: '带伤出战的消耗仍然存在，你需要额外时间恢复到正常负荷。',
            },
          },
          {
            id: 'PAIN',
            label: '伤势明显加重',
            weight: 65,
            summary: '一次急停让脚踝的不适迅速加剧，你没有等到终场就被迫离开比赛。',
            playerDelta: { form: -3, fitness: -9, morale: -3 },
            delayed: {
              delayWindows: 1,
              playerDelta: { fitness: -5 },
              trainingBonus: -1,
              summary: '带伤踢满的决定延长了恢复周期，本窗口训练计划被迫下调。',
            },
          },
        ],
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
        effectPreview: '60%扩大市场关注 · 40%引起俱乐部反感',
        outcomeSummary:
          '你留下了想象空间，市场关注明显增加，但现俱乐部开始怀疑你的长期态度。',
        playerDelta: { clubAttachment: -2 },
        outcomes: [
          {
            id: 'MARKET',
            label: '市场热度上升',
            weight: 60,
            summary: '模糊回应给传闻留下空间，更多媒体开始讨论你的下一站。',
            playerDelta: { reputation: 4, mediaRelation: 5, agentRelation: 2 },
            delayed: {
              delayWindows: 2,
              playerDelta: { reputation: 2 },
              summary: '此前的转会传闻仍在市场流传，你的名字继续出现在观察名单中。',
            },
          },
          {
            id: 'BACKFIRE',
            label: '现俱乐部产生反感',
            weight: 40,
            summary: '俱乐部认为你在借媒体施压，教练和球迷都开始质疑你的投入程度。',
            playerDelta: { coachRelation: -4, fanRelation: -3, mediaRelation: 2, morale: -1 },
          },
        ],
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
  const recentHistory = state.careerEventHistory.filter(
    (entry) => state.windowIndex - entry.windowIndex <= 10,
  )
  const recentIds = new Set(recentHistory.map((entry) => entry.eventId))
  const lastTwoCategories = state.careerEventHistory
    .slice(-2)
    .map((entry) => getCareerEvent(entry.eventId).category)
  const blockedCategory =
    lastTwoCategories.length === 2 &&
    lastTwoCategories[0] === lastTwoCategories[1]
      ? lastTwoCategories[0]
      : null
  const baseEligible = CAREER_EVENTS.filter((event) => event.isEligible(state))
  let eligible = baseEligible.filter(
    (event) =>
      !recentIds.has(event.id) && event.category !== blockedCategory,
  )
  if (eligible.length === 0) {
    const fallbackIds = new Set(
      state.careerEventHistory
        .filter((entry) => state.windowIndex - entry.windowIndex <= 4)
        .map((entry) => entry.eventId),
    )
    eligible = baseEligible.filter(
      (event) =>
        !fallbackIds.has(event.id) && event.category !== blockedCategory,
    )
  }
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
  consequences: CareerConsequence[]
} {
  const { state, eventId, choiceId } = input
  if (!state.player) throw new Error('特殊事件缺少球员状态。')
  const event = getCareerEvent(eventId)
  const choice = event.choices.find((candidate) => candidate.id === choiceId)
  if (!choice) throw new Error('这个特殊事件选项不存在。')

  const outcome = choice.outcomes?.length
    ? weightedPick(
        createRandom(
          state.careerSeed,
          'career-event-outcome',
          state.windowIndex,
          eventId,
          choiceId,
        ),
        choice.outcomes.map((candidate) => ({
          value: candidate,
          weight: candidate.weight,
        })),
      )
    : null
  const requestedDelta = combineRequestedDelta(
    choice.playerDelta,
    outcome?.playerDelta,
  )
  const resolved = applyPlayerDelta(state.player, requestedDelta)
  const requestedCashDelta =
    (choice.cashDeltaEuro ?? 0) + (outcome?.cashDeltaEuro ?? 0)
  const cashDeltaEuro = Math.max(-state.cashEuro, requestedCashDelta)
  const record: CareerEventRecord = {
    eventId,
    choiceId,
    windowIndex: state.windowIndex,
    choiceTitle: choice.title,
    outcomeSummary: outcome?.summary ?? choice.outcomeSummary,
    ...(outcome ? { outcomeLabel: outcome.label } : {}),
    appliedDelta: resolved.appliedDelta,
    cashDeltaEuro,
  }
  const delayed = [
    ...delayedList(choice.delayed),
    ...delayedList(outcome?.delayed),
  ]
  const consequences = delayed.map((entry, index) => ({
        id: `${eventId}:${state.windowIndex}:${choiceId}:${index}`,
        sourceEventId: eventId,
        applyAtWindow: state.windowIndex + (entry.delayWindows ?? 1),
        playerDelta: entry.playerDelta,
        trainingBonus: entry.trainingBonus ?? 0,
        summary: entry.summary,
      }))

  return {
    player: resolved.player,
    cashEuro: state.cashEuro + cashDeltaEuro,
    trainingBonus:
      (choice.trainingBonus ?? 0) + (outcome?.trainingBonus ?? 0),
    record,
    consequence: consequences[0] ?? null,
    consequences,
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
