import type {
  CareerConsequence,
  CareerEventCategory,
  CareerEventChoiceId,
  CareerEventId,
  CareerEventRecord,
  CareerStoryEffect,
  FirstTeamRole,
  GameState,
  HalfYearReport,
  Player,
  PlayerEventDelta,
} from '../models/game'
import {
  CAREER_EVENT_IDS,
  interactionProtocolFor,
  type CareerEventInteractionKind,
} from '../data/careerEventIds'
import {
  applyCareerStoryEffect,
  ensureStoryClub,
} from './careerStory'
import { createRandom, weightedPick } from './random'
import { playerAgeAtWindow } from './careerTime'

export type CareerEventPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

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
  storyEffect?: CareerStoryEffect
}

export interface CareerEventSetupOption {
  id: string
  title: string
  description: string
  choiceIds: readonly CareerEventChoiceId[]
}

export interface CareerEventSetup {
  prompt: string
  options: readonly CareerEventSetupOption[]
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
  storyEffect?: CareerStoryEffect
}

export interface CareerEventDefinition {
  id: CareerEventId
  groupId: string
  category: CareerEventCategory
  priority: CareerEventPriority
  cooldownWindows: number
  interactionKind: CareerEventInteractionKind
  eyebrow: string
  title: string
  description: string
  weight: number
  isEligible: (state: GameState) => boolean
  setup?: CareerEventSetup
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

function combineStoryEffects(
  first?: CareerStoryEffect,
  second?: CareerStoryEffect,
): CareerStoryEffect | undefined {
  if (!first) return second
  if (!second) return first
  const tendencyDelta: NonNullable<CareerStoryEffect['tendencyDelta']> = {
    ...first.tendencyDelta,
  }
  for (const [key, value] of Object.entries(second.tendencyDelta ?? {})) {
    const tendency = key as keyof typeof tendencyDelta
    tendencyDelta[tendency] =
      (tendencyDelta[tendency] ?? 0) + (value ?? 0)
  }
  const combined: CareerStoryEffect = { ...first, ...second }
  if (first.club || second.club) {
    combined.club = { ...first.club, ...second.club }
  }
  if (Object.keys(tendencyDelta).length > 0) {
    combined.tendencyDelta = tendencyDelta
  }
  return combined
}

const always = () => true
const hasContract = (state: GameState) => Boolean(state.contract)
const latestRating = (state: GameState) =>
  state.lastReport?.stats.averageRating ?? 6.6

const FIRST_TEAM_ROLE_ORDER: readonly FirstTeamRole[] = [
  'FRINGE',
  'SUBSTITUTE',
  'ROTATION',
  'STARTER',
  'CORE',
]

function latestActualTeamLevel(state: GameState) {
  const latestHistory = state.history.at(-1)
  if (latestHistory?.clubId === state.selectedClubId) {
    return latestHistory.teamLevel
  }
  return state.teamLevel
}

function latestActualFirstTeamRole(
  state: GameState,
): FirstTeamRole | null {
  if (latestActualTeamLevel(state) !== 'FIRST_TEAM') return null
  const latestHistory = state.history.at(-1)
  const role =
    latestHistory?.clubId === state.selectedClubId
      ? latestHistory.role
      : state.firstTeamRole
  return FIRST_TEAM_ROLE_ORDER.includes(role as FirstTeamRole)
    ? (role as FirstTeamRole)
    : null
}

function hasFirstTeamRole(
  state: GameState,
  minimumRole: FirstTeamRole,
): boolean {
  const role = latestActualFirstTeamRole(state)
  return Boolean(
    role &&
      FIRST_TEAM_ROLE_ORDER.indexOf(role) >=
        FIRST_TEAM_ROLE_ORDER.indexOf(minimumRole),
  )
}

function currentClubFirstTeamWindows(state: GameState): number {
  if (!state.selectedClubId) return 0
  let windows = 0
  for (let index = state.history.length - 1; index >= 0; index -= 1) {
    const entry = state.history[index]
    if (!entry || entry.clubId !== state.selectedClubId) break
    if (entry.teamLevel === 'FIRST_TEAM' && entry.stats.appearances > 0) {
      windows += 1
    }
  }
  return windows
}

function hasCareerEvent(state: GameState, eventId: CareerEventId): boolean {
  return state.careerEventHistory.some((entry) => entry.eventId === eventId)
}

function hasPlayedForAnotherClub(state: GameState): boolean {
  return state.history.some(
    (entry) => entry.clubId !== state.selectedClubId,
  )
}

function completedFirstTeamHistory(state: GameState) {
  return state.history.filter(
    (entry) =>
      entry.windowIndex < state.windowIndex &&
      entry.teamLevel === 'FIRST_TEAM' &&
      entry.stats.appearances > 0,
  )
}

function firstTeamCareerTotals(state: GameState) {
  return completedFirstTeamHistory(state).reduce(
    (totals, entry) => ({
      appearances: totals.appearances + entry.stats.appearances,
      goals: totals.goals + entry.stats.goals,
      assists: totals.assists + entry.stats.assists,
    }),
    { appearances: 0, goals: 0, assists: 0 },
  )
}

function latestCompletedFirstTeamWindows(
  state: GameState,
  count: number,
) {
  return completedFirstTeamHistory(state).slice(-count)
}

function currentClubTenureWindows(state: GameState): number {
  if (!state.selectedClubId) return 0
  let windows = 0
  for (let index = state.history.length - 1; index >= 0; index -= 1) {
    const entry = state.history[index]
    if (!entry || entry.clubId !== state.selectedClubId) break
    windows += 1
  }
  return windows
}

function careerHonors(state: GameState) {
  return [
    ...state.history.flatMap((entry) => entry.honors ?? []),
    ...(state.lastReport?.honors ?? []),
  ]
}

function hasCareerHonor(
  state: GameState,
  types: readonly string[],
): boolean {
  return careerHonors(state).some((honor) => types.includes(honor.type))
}

function isReturnTransfer(state: GameState): boolean {
  const decision = state.transferDecision
  if (
    decision?.kind !== 'TRANSFER' ||
    decision.toClubId !== state.selectedClubId
  ) {
    return false
  }
  return state.history.some(
    (entry) =>
      entry.windowIndex < state.windowIndex &&
      entry.clubId === decision.toClubId,
  )
}

function departedClubTenureWindows(state: GameState): number {
  const decision = state.transferDecision
  if (decision?.kind !== 'TRANSFER') return 0
  return state.history.filter(
    (entry) => entry.clubId === decision.fromClubId,
  ).length
}

function latestNationalWindow(state: GameState) {
  return state.lastReport?.nationalTeam ?? null
}

function isEstablishedFirstTeamLeader(state: GameState): boolean {
  return Boolean(
    state.player &&
      playerAgeAtWindow(state.windowIndex) >= 23 &&
      hasFirstTeamRole(state, 'STARTER') &&
      currentClubFirstTeamWindows(state) >= 4 &&
      state.player.squadRelation >= 72 &&
      state.player.coachRelation >= 65 &&
      state.careerStory.club.leadership === 'CANDIDATE' &&
      state.careerStory.tendencies.leadership >= 2,
  )
}

export const CAREER_EVENTS: readonly CareerEventDefinition[] = [
  {
    id: 'COACH_DEFENSIVE_TASK',
    groupId: 'COACH_TRAINING_REQUEST',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
    groupId: 'COACH_ROLE_EXPERIMENT',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
    id: 'COACH_TACTICAL_MEETING',
    groupId: 'COACH_TACTICAL_DIALOGUE',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 3,
    interactionKind: 'DIALOGUE',
    eyebrow: '教练 · 战术沟通',
    title: '教练组希望听听你对最近战术的看法。',
    description: '你可以先决定沟通场合，再选择具体表达方式。不同场合会改变教练如何理解你的意见。',
    weight: 8,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 16 &&
      (hasFirstTeamRole(state, 'ROTATION') || state.youthRole === 'CORE'),
    setup: {
      prompt: '你准备在哪里谈这件事？',
      options: [
        {
          id: 'PRIVATE',
          title: '训练后单独沟通',
          description: '避免公开挑战教练权威。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'GROUP',
          title: '战术会上当面发言',
          description: '让全队一起参与讨论。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '用录像说明问题',
        description: '拿具体回合支持自己的判断。',
        effectPreview: '心理能力、教练关系上升',
        outcomeSummary: '你用几个清楚的比赛回合说明观点。教练没有全部采纳，但认可了你的准备和判断。',
        playerDelta: { attributes: { mental: 0.6 }, coachRelation: 4 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '只询问自己的职责',
        description: '把讨论限制在如何完成角色。',
        effectPreview: '教练关系、竞技状态小幅上升',
        outcomeSummary: '你没有评价全队战术，只把个人职责问得更加清楚，下一阶段执行起来更有把握。',
        playerDelta: { coachRelation: 2, form: 2 },
      },
      {
        id: 'C',
        title: '提出整体调整',
        description: '公开说明球队攻守衔接的问题。',
        effectPreview: '50%获得认可 · 50%被视为越界',
        outcomeSummary: '你在战术会上明确提出了整体调整建议。',
        playerDelta: { morale: 1 },
        outcomes: [
          {
            id: 'ACCEPTED',
            label: '建议得到认可',
            weight: 50,
            summary: '教练把你的建议写上战术板，队友也开始把你视作能参与比赛设计的人。',
            playerDelta: { coachRelation: 5, squadRelation: 3, reputation: 1 },
            storyEffect: { tendencyDelta: { leadership: 1 } },
          },
          {
            id: 'OVERSTEP',
            label: '被认为越过边界',
            weight: 50,
            summary: '意见本身并非毫无道理，但公开表达让教练觉得你越过了角色边界。',
            playerDelta: { coachRelation: -4, squadRelation: -1 },
          },
        ],
      },
      {
        id: 'D',
        title: '先邀请队友补充',
        description: '把发言变成一次共同讨论。',
        effectPreview: '队内关系、领导倾向上升',
        outcomeSummary: '你没有把讨论变成个人演讲，而是让不同位置的队友共同补充，会议气氛明显更开放。',
        playerDelta: { squadRelation: 5, coachRelation: 1 },
        storyEffect: { tendencyDelta: { diplomacy: 1, leadership: 1 } },
      },
    ],
  },
  {
    id: 'COACH_SET_PIECE_DUTY',
    groupId: 'COACH_SPECIALIST_TRAINING',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 3,
    interactionKind: 'ALLOCATION',
    eyebrow: '教练 · 训练分配',
    title: '教练给了你一份额外定位球训练额度。',
    description: '额外训练时间有限，你必须决定如何分配，无法同时获得全部收益。',
    weight: 7,
    isEligible: (state) => state.windowIndex >= 2,
    choices: [
      {
        id: 'A',
        title: '70%主罚 · 30%体能',
        description: '把大部分时间用于直接进攻贡献。',
        effectPreview: '进攻明显上升 · 身体小幅下降',
        outcomeSummary: '你把训练重点放在主罚技术上，进攻细节更成熟，但额外训练消耗了恢复时间。',
        playerDelta: { attributes: { attack: 0.8 }, fitness: -2, coachRelation: 1 },
      },
      {
        id: 'B',
        title: '40%主罚 · 60%战术',
        description: '兼顾脚法和定位球跑位理解。',
        effectPreview: '进攻、心理能力均衡上升',
        outcomeSummary: '你没有只练脚法，而是把更多时间用于战术配合，能力提升更均衡。',
        playerDelta: { attributes: { attack: 0.4, mental: 0.5 }, coachRelation: 2 },
      },
      {
        id: 'C',
        title: '20%主罚 · 80%恢复',
        description: '保留专项感觉，优先维护身体。',
        effectPreview: '身体状态明显上升 · 专项成长较少',
        outcomeSummary: '你只完成必要的专项训练，把大部分额度用于恢复，身体指标因此明显改善。',
        playerDelta: { attributes: { attack: 0.2 }, fitness: 5 },
      },
    ],
  },
  {
    id: 'COACH_ROTATION_WARNING',
    groupId: 'COACH_ROLE_PRESSURE',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 3,
    interactionKind: 'RISK',
    eyebrow: '教练 · 位置压力',
    title: '教练提醒你：近期位置并不稳固。',
    description: '你要先决定把这次谈话当作风险控制，还是一次主动翻盘的机会。',
    weight: 8,
    isEligible: (state) => Boolean(state.contract) && latestRating(state) < 7.1,
    setup: {
      prompt: '你准备采取哪种风险态度？',
      options: [
        {
          id: 'CONTROL',
          title: '先保住轮换位置',
          description: '降低波动，争取稳定信任。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'ATTACK',
          title: '主动争夺更高位置',
          description: '承担更大失败代价。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '接受简化职责',
        description: '先把最基础的战术要求做到稳定。',
        effectPreview: '教练关系上升 · 竞技状态小幅下降',
        outcomeSummary: '你接受了更清晰、更简单的职责，短期表现不抢眼，但重新获得了教练的基本信任。',
        playerDelta: { coachRelation: 5, form: -1, morale: 1 },
      },
      {
        id: 'B',
        title: '申请逐场复盘',
        description: '用持续沟通减少判断偏差。',
        effectPreview: '心理能力、教练关系小幅上升',
        outcomeSummary: '你主动要求逐场复盘，教练看到了改进意愿，你也更清楚问题在哪里。',
        playerDelta: { attributes: { mental: 0.4 }, coachRelation: 3 },
      },
      {
        id: 'C',
        title: '要求下一场首发',
        description: '直接用比赛证明警告没有必要。',
        effectPreview: '40%强势回应 · 60%压力反噬',
        outcomeSummary: '你要求用一场首发来决定自己的位置。',
        playerDelta: { morale: 2 },
        outcomes: [
          {
            id: 'RESPONSE',
            label: '强势回应',
            weight: 40,
            summary: '你抓住机会完成了有说服力的表现，教练重新评估了你的竞争顺位。',
            playerDelta: { form: 7, coachRelation: 4, reputation: 2 },
            storyEffect: { tendencyDelta: { clutch: 1 } },
          },
          {
            id: 'PRESSURE',
            label: '压力反噬',
            weight: 60,
            summary: '急于证明自己让动作变得僵硬，这场表现反而强化了教练的担忧。',
            playerDelta: { form: -6, morale: -4, coachRelation: -3 },
          },
        ],
      },
      {
        id: 'D',
        title: '公开增加训练量',
        description: '让所有人看到你对竞争的回应。',
        effectPreview: '65%赢得认可 · 35%身体透支',
        outcomeSummary: '你公开增加了训练量，希望用投入改变竞争局面。',
        playerDelta: { fitness: -2 },
        outcomes: [
          {
            id: 'NOTICE',
            label: '投入得到认可',
            weight: 65,
            summary: '训练质量和态度都保持在线，教练组认可了你的回应。',
            playerDelta: { form: 4, coachRelation: 3 },
            trainingBonus: 0.5,
          },
          {
            id: 'OVERLOAD',
            label: '身体出现透支',
            weight: 35,
            summary: '训练投入超过了恢复能力，本窗口后半程状态明显下滑。',
            playerDelta: { fitness: -7, form: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'CAPTAIN_VIDEO_REVIEW',
    groupId: 'CLUB_LEADERSHIP',
    category: 'TEAM',
    priority: 'P3',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
    eyebrow: '更衣室 · 队长邀请',
    title: '队长邀请你参加赛后录像复盘。',
    description:
      '这不是强制活动，但资深球员都在观察年轻人愿不愿意参与球队讨论。',
    weight: 10,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 17 &&
      hasFirstTeamRole(state, 'SUBSTITUTE') &&
      state.careerStory.club.leadership !== 'CAPTAIN',
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
        storyEffect: {
          club: { leadership: 'CANDIDATE' },
          tendencyDelta: { leadership: 1, professionalism: 1 },
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
        storyEffect: { tendencyDelta: { professionalism: 1 } },
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
    id: 'CAPTAIN_ARMBAND_OFFER',
    groupId: 'CLUB_LEADERSHIP',
    category: 'TEAM',
    priority: 'P2',
    cooldownWindows: 4,
    interactionKind: 'RISK',
    eyebrow: '更衣室 · 队长袖标',
    title: '教练问你是否愿意在下一场戴上队长袖标。',
    description: '这既是荣誉也是公开考验。你要先决定如何理解这份责任，再选择具体做法。',
    weight: 5,
    isEligible: isEstablishedFirstTeamLeader,
    setup: {
      prompt: '你准备以什么方式接过袖标？',
      options: [
        {
          id: 'STEADY',
          title: '把它当作团队责任',
          description: '先稳住更衣室和比赛秩序。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'STATEMENT',
          title: '把它当作领袖宣言',
          description: '主动留下属于自己的印记。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '赛前逐一沟通',
        description: '先听清每名队友需要什么。',
        effectPreview: '75%顺利完成 · 25%沟通过度',
        outcomeSummary: '你在赛前花时间逐一了解队友的状态。',
        playerDelta: { morale: 1 },
        outcomes: [
          {
            id: 'CAPTAIN',
            label: '首次带队成功',
            weight: 75,
            summary: '沟通让球队在困难阶段保持一致。比赛结束后，教练确认你会继续担任队长。',
            playerDelta: { squadRelation: 7, coachRelation: 4, reputation: 3 },
            storyEffect: { club: { leadership: 'CAPTAIN' }, tendencyDelta: { leadership: 2, diplomacy: 1 } },
          },
          {
            id: 'OVERTHINK',
            label: '沟通过度',
            weight: 25,
            summary: '你试图照顾所有人的想法，反而让临场指令失去重点。袖标暂时仍只是一次试用。',
            playerDelta: { squadRelation: 2, morale: -2 },
            storyEffect: { tendencyDelta: { diplomacy: 1 } },
          },
        ],
      },
      {
        id: 'B',
        title: '延续原有秩序',
        description: '尊重老队长留下的规则。',
        effectPreview: '队内、教练关系稳定上升',
        outcomeSummary: '你没有急着改变更衣室，而是让球队平稳度过交接。教练决定继续信任你。',
        playerDelta: { squadRelation: 5, coachRelation: 4, clubAttachment: 2 },
        storyEffect: { club: { leadership: 'CAPTAIN' }, tendencyDelta: { leadership: 1, professionalism: 1 } },
      },
      {
        id: 'C',
        title: '发表强硬赛前讲话',
        description: '用情绪和目标把所有人拉到一起。',
        effectPreview: '45%点燃球队 · 55%显得用力过猛',
        outcomeSummary: '你选择用一段强硬讲话开启自己的队长时刻。',
        playerDelta: { morale: 2 },
        outcomes: [
          {
            id: 'INSPIRE',
            label: '点燃球队',
            weight: 45,
            summary: '讲话正好击中了球队情绪，你也用表现兑现了承诺，袖标从试用变成正式责任。',
            playerDelta: { form: 6, squadRelation: 6, reputation: 5 },
            storyEffect: { club: { leadership: 'CAPTAIN' }, publicPersona: 'OUTSPOKEN', tendencyDelta: { leadership: 2, clutch: 1 } },
          },
          {
            id: 'FORCED',
            label: '显得用力过猛',
            weight: 55,
            summary: '讲话没有得到预期回应，几名资深队友认为你太急于证明领袖身份。',
            playerDelta: { squadRelation: -5, morale: -3, reputation: 1 },
          },
        ],
      },
      {
        id: 'D',
        title: '主动承担关键责任',
        description: '在场上要求最难处理的任务。',
        effectPreview: '50%确立领袖地位 · 50%表现受压',
        outcomeSummary: '你没有多说，而是主动接下比赛中最困难的责任。',
        playerDelta: { fitness: -2 },
        outcomes: [
          {
            id: 'DELIVER',
            label: '关键责任兑现',
            weight: 50,
            summary: '你在最需要的时候完成任务，更衣室用最直接的方式接受了你。',
            playerDelta: { form: 7, squadRelation: 5, reputation: 4 },
            storyEffect: { club: { leadership: 'CAPTAIN' }, tendencyDelta: { leadership: 2, clutch: 1 } },
          },
          {
            id: 'MISS',
            label: '表现受压',
            weight: 50,
            summary: '承担责任的意愿没有问题，但表现没有跟上，教练暂时收回了长期任命。',
            playerDelta: { form: -5, morale: -4, squadRelation: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'TEAMMATE_RIVALRY',
    groupId: 'POSITION_RIVALRY',
    category: 'TEAM',
    priority: 'P3',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
        storyEffect: { club: { rivalry: 'HEALTHY' } },
      },
      {
        id: 'B',
        title: '训练场正面对决',
        description: '用每一次对抗证明自己更值得首发。',
        effectPreview: '竞技状态上升 · 队内关系下降',
        outcomeSummary:
          '你把竞争带进每一堂训练课。状态被激活，但彼此之间的距离也变大了。',
        playerDelta: { form: 4, squadRelation: -2, fitness: -1 },
        storyEffect: { club: { rivalry: 'HOSTILE' } },
      },
      {
        id: 'C',
        title: '找教练谈轮换',
        description: '把竞争规则交给教练明确。',
        effectPreview: '心理、教练关系上升 · 队内关系略降',
        outcomeSummary:
          '你要求教练明确竞争规则，内心更踏实，但队友认为你把问题带出了更衣室。',
        playerDelta: { coachRelation: 2, morale: 2, squadRelation: -2 },
        storyEffect: { club: { rivalry: 'HEALTHY' }, tendencyDelta: { professionalism: 1 } },
      },
    ],
  },
  {
    id: 'DRESSING_ROOM_DISPUTE',
    groupId: 'DRESSING_ROOM_CONFLICT',
    category: 'TEAM',
    priority: 'P3',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
    eyebrow: '更衣室 · 内部矛盾',
    title: '一次训练冲突让更衣室气氛紧张。',
    description:
      '两名队友互相指责，队长希望有人让大家重新把注意力放回比赛。',
    weight: 7,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 17 &&
      Boolean(state.player) &&
      state.player!.squadRelation < 68,
    choices: [
      {
        id: 'A',
        title: '主动居中调解',
        description: '分别沟通，避免矛盾继续扩大。',
        effectPreview: '队内、教练关系上升 · 心理略降',
        outcomeSummary:
          '你帮助双方把话说开。过程消耗精力，却让更多队友开始信任你。',
        playerDelta: { squadRelation: 4, coachRelation: 2, morale: -2 },
        storyEffect: { tendencyDelta: { diplomacy: 1, leadership: 1 } },
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
    id: 'YOUNG_TEAMMATE_MENTOR',
    groupId: 'CLUB_MENTORSHIP',
    category: 'TEAM',
    priority: 'P3',
    cooldownWindows: 4,
    interactionKind: 'DIALOGUE',
    eyebrow: '更衣室 · 年轻队友',
    title: '一名刚进入一线队的年轻队友向你求助。',
    description: '他既担心训练跟不上，也不知道如何融入更衣室。你可以先选择谈话重点。',
    weight: 6,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 24 &&
      hasFirstTeamRole(state, 'STARTER') &&
      currentClubFirstTeamWindows(state) >= 2 &&
      state.careerStory.club.mentorship !== 'MENTOR',
    setup: {
      prompt: '你先从哪一件事谈起？',
      options: [
        {
          id: 'FOOTBALL',
          title: '先谈训练和比赛',
          description: '从职业要求建立信任。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'LIFE',
          title: '先谈生活和融入',
          description: '先解决场外的不安。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '陪他完成额外训练',
        description: '直接示范职业训练节奏。',
        effectPreview: '队内关系、领导倾向上升 · 身体略降',
        outcomeSummary: '你陪他完成了几次额外训练。年轻队友逐渐跟上节奏，也开始把你当作真正的导师。',
        playerDelta: { squadRelation: 5, fitness: -2, coachRelation: 2 },
        storyEffect: { club: { mentorship: 'MENTOR' }, tendencyDelta: { leadership: 1, professionalism: 1 } },
      },
      {
        id: 'B',
        title: '整理一份比赛笔记',
        description: '把经验转化为清楚的方法。',
        effectPreview: '心理能力、队内关系上升',
        outcomeSummary: '你把训练和比赛经验整理成一份简洁笔记，帮助他更快理解一线队要求。',
        playerDelta: { attributes: { mental: 0.5 }, squadRelation: 4 },
        storyEffect: { club: { mentorship: 'MENTOR' }, tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'C',
        title: '带他认识更衣室成员',
        description: '主动把他带进日常交流。',
        effectPreview: '队内关系、外交倾向上升',
        outcomeSummary: '你没有让他独自摸索，而是带他认识不同小组的队友，他很快放松下来。',
        playerDelta: { squadRelation: 6, morale: 2 },
        storyEffect: { club: { mentorship: 'MENTOR' }, tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'D',
        title: '分享自己的低谷经历',
        description: '告诉他不适应并不代表失败。',
        effectPreview: '心理状态、队内关系上升',
        outcomeSummary: '你的坦诚让他意识到困难并不可耻，也让更多队友看见了你愿意承担照顾新人的责任。',
        playerDelta: { morale: 4, squadRelation: 4, reputation: 1 },
        storyEffect: { club: { mentorship: 'MENTOR' }, tendencyDelta: { leadership: 1, diplomacy: 1 } },
      },
    ],
  },
  {
    id: 'TEAM_SOCIAL_CLIQUE',
    groupId: 'DRESSING_ROOM_CULTURE',
    category: 'TEAM',
    priority: 'P3',
    cooldownWindows: 3,
    interactionKind: 'PERSON_TONE',
    eyebrow: '更衣室 · 小团体',
    title: '更衣室里的两个小圈子都在拉拢你。',
    description: '你要先决定和谁谈，再选择自己的表达方式；这会影响队友如何理解你的立场。',
    weight: 7,
    isEligible: (state) => Boolean(state.player) && state.player!.squadRelation < 78,
    setup: {
      prompt: '你准备先和谁沟通？',
      options: [
        {
          id: 'CAPTAIN_GROUP',
          title: '先找资深球员',
          description: '理解更衣室原有秩序。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'YOUNG_GROUP',
          title: '先找年轻球员',
          description: '听清被忽视一方的想法。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '尊重传统但保持中立',
        description: '认可秩序，不加入排他立场。',
        effectPreview: '队内关系、职业倾向上升',
        outcomeSummary: '你表达了对资深球员的尊重，也明确不会参与排斥。双方接受了你的边界。',
        playerDelta: { squadRelation: 4, coachRelation: 1 },
        storyEffect: { tendencyDelta: { professionalism: 1, diplomacy: 1 } },
      },
      {
        id: 'B',
        title: '明确站在资深一方',
        description: '用清晰站队换取核心圈信任。',
        effectPreview: '60%进入核心圈 · 40%矛盾加深',
        outcomeSummary: '你选择公开站在资深球员一边。',
        playerDelta: { clubAttachment: 1 },
        outcomes: [
          { id: 'INNER', label: '进入核心圈', weight: 60, summary: '资深球员开始主动照应你，你在更衣室获得了更直接的话语权。', playerDelta: { squadRelation: 6, reputation: 2 } },
          { id: 'DIVIDE', label: '矛盾加深', weight: 40, summary: '站队让另一部分队友明显疏远你，更衣室分歧反而扩大。', playerDelta: { squadRelation: -6, morale: -2 } },
        ],
      },
      {
        id: 'C',
        title: '温和听完他们的不满',
        description: '先让年轻球员把话说完整。',
        effectPreview: '队内关系、外交倾向上升',
        outcomeSummary: '你没有急着评判，而是完整听完年轻队友的不满，再帮助他们把问题说得更具体。',
        playerDelta: { squadRelation: 5, morale: 1 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'D',
        title: '鼓励他们公开表达',
        description: '把私下抱怨带到正式会议。',
        effectPreview: '45%推动改变 · 55%引发反弹',
        outcomeSummary: '你鼓励年轻球员把问题带到全队会议上。',
        playerDelta: { morale: 1 },
        outcomes: [
          { id: 'CHANGE', label: '推动更衣室改变', weight: 45, summary: '讨论虽然尖锐，却促成了新的相处规则，你也被视作敢于推动改变的人。', playerDelta: { squadRelation: 7, reputation: 3 }, storyEffect: { tendencyDelta: { leadership: 1, diplomacy: 1 } } },
          { id: 'BACKLASH', label: '资深球员反弹', weight: 55, summary: '资深球员认为你在背后组织挑战，短期内对你的态度明显转冷。', playerDelta: { squadRelation: -5, coachRelation: -2 } },
        ],
      },
    ],
  },
  {
    id: 'MEDIA_BREAKTHROUGH',
    groupId: 'MEDIA_PROFILE',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
        storyEffect: { publicPersona: 'LOW_KEY' },
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
        storyEffect: {
          publicPersona: 'TEAM_FIRST',
          tendencyDelta: { diplomacy: 1 },
        },
      },
    ],
  },
  {
    id: 'ONLINE_CRITICISM',
    groupId: 'MEDIA_PRESSURE',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
    groupId: 'FAN_OBLIGATION',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
    id: 'PENALTY_SHOOTOUT_ORDER',
    groupId: 'MATCH_PRESSURE',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 3,
    interactionKind: 'RISK',
    eyebrow: '比赛 · 点球顺位',
    title: '淘汰赛进入点球大战，教练让你选择主罚顺位。',
    description: '你要先决定承担多大的责任，再从对应顺位中作出选择。成功和失败的概率都会提前显示。',
    weight: 6,
    isEligible: (state) =>
      Boolean(state.contract) &&
      playerAgeAtWindow(state.windowIndex) >= 16 &&
      hasFirstTeamRole(state, 'SUBSTITUTE') &&
      Boolean(
        state.player &&
          (state.player.attributes.attack >= 55 ||
            state.player.attributes.mental >= 60),
      ),
    setup: {
      prompt: '你愿意承担多大的关键球责任？',
      options: [
        { id: 'CONTROL', title: '控制风险', description: '选择相对稳定的中段顺位。', choiceIds: ['A', 'B'] },
        { id: 'DECIDE', title: '主动决定比赛', description: '争取最受关注的关键顺位。', choiceIds: ['C', 'D'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '第三顺位主罚',
        description: '在压力升高前完成任务。',
        effectPreview: '78%罚进 · 22%罚失',
        outcomeSummary: '你选择在第三顺位走向点球点。',
        playerDelta: {},
        outcomes: [
          { id: 'SCORE', label: '稳稳罚进', weight: 78, summary: '你按照训练方式完成射门，为球队保持了点球大战节奏。', playerDelta: { form: 4, morale: 3 } },
          { id: 'MISS', label: '射门被扑', weight: 22, summary: '射门角度不够刁钻，但球队仍有时间弥补，你承受了有限的舆论压力。', playerDelta: { form: -3, morale: -3 } },
        ],
      },
      {
        id: 'B',
        title: '第四顺位主罚',
        description: '承担更高压力，同时避免最后一罚。',
        effectPreview: '70%罚进 · 30%罚失',
        outcomeSummary: '你选择第四顺位，压力和决定性都明显提高。',
        playerDelta: {},
        outcomes: [
          { id: 'SCORE', label: '顶住压力', weight: 70, summary: '你在压力最重的阶段罚进点球，队友和教练记住了这次冷静。', playerDelta: { form: 5, morale: 4, squadRelation: 2 }, storyEffect: { tendencyDelta: { clutch: 1 } } },
          { id: 'MISS', label: '关键罚失', weight: 30, summary: '你没有躲避责任，但点球偏出，失落感持续了整个窗口。', playerDelta: { form: -5, morale: -5 } },
        ],
      },
      {
        id: 'C',
        title: '第一顺位开场',
        description: '用第一罚给全队定下基调。',
        effectPreview: '68%带来好开局 · 32%让球队先陷入被动',
        outcomeSummary: '你主动要求第一个站上点球点。',
        playerDelta: { reputation: 1 },
        outcomes: [
          { id: 'LEAD', label: '带来好开局', weight: 68, summary: '第一罚干净命中，队友从你的冷静中获得了信心。', playerDelta: { form: 6, squadRelation: 4, morale: 3 }, storyEffect: { tendencyDelta: { leadership: 1, clutch: 1 } } },
          { id: 'MISS', label: '开场罚失', weight: 32, summary: '第一罚被扑让球队立即陷入被动，你也成为赛后讨论的焦点。', playerDelta: { form: -6, morale: -5, mediaRelation: -2 } },
        ],
      },
      {
        id: 'D',
        title: '第五顺位终结',
        description: '等待可能决定胜负的最后一罚。',
        effectPreview: '55%成为英雄 · 45%承担失利',
        outcomeSummary: '你选择最可能决定比赛的第五顺位。',
        playerDelta: { reputation: 1 },
        outcomes: [
          { id: 'HERO', label: '终结比赛', weight: 55, summary: '你罚进了决定胜负的一球，庆祝画面迅速成为这段赛季的代表时刻。', playerDelta: { form: 9, morale: 6, reputation: 6, fanRelation: 5 }, storyEffect: { tendencyDelta: { clutch: 2 } } },
          { id: 'MISS', label: '承担失利', weight: 45, summary: '最后一罚没有命中。你主动承担责任，却仍要面对漫长的失落和质疑。', playerDelta: { form: -8, morale: -7, mediaRelation: -3 }, storyEffect: { tendencyDelta: { clutch: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'LATE_SUBSTITUTION_BRIEF',
    groupId: 'MATCH_ROLE_DECISION',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 3,
    interactionKind: 'DIALOGUE',
    eyebrow: '比赛 · 临场指令',
    title: '比赛还剩十五分钟，助教让你准备替补出场。',
    description: '场上局面混乱，指令只有几句话。你可以先确认球队最需要什么，再决定如何执行。',
    weight: 8,
    isEligible: (state) =>
      Boolean(state.contract) && hasFirstTeamRole(state, 'SUBSTITUTE'),
    setup: {
      prompt: '你先向助教确认什么？',
      options: [
        { id: 'SCORE', title: '先问比分任务', description: '确认球队要冒险还是控场。', choiceIds: ['A', 'B'] },
        { id: 'ROLE', title: '先问个人职责', description: '确认自己在体系中的具体位置。', choiceIds: ['C', 'D'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '主动压上争胜',
        description: '用高风险跑动冲击对手防线。',
        effectPreview: '45%制造关键机会 · 55%无功而返',
        outcomeSummary: '你带着明确的争胜任务进入比赛。',
        playerDelta: { fitness: -2 },
        outcomes: [
          { id: 'IMPACT', label: '制造关键机会', weight: 45, summary: '你的跑动打乱了对手防线，球队在最后阶段创造了决定性机会。', playerDelta: { form: 7, coachRelation: 3, reputation: 2 }, storyEffect: { tendencyDelta: { clutch: 1 } } },
          { id: 'QUIET', label: '无功而返', weight: 55, summary: '你积极投入，但有限时间里没有得到合适机会，比赛平静结束。', playerDelta: { form: -1 } },
        ],
      },
      {
        id: 'B',
        title: '帮助球队控住局面',
        description: '先减少失误，保证阵型稳定。',
        effectPreview: '教练关系、心理能力小幅上升',
        outcomeSummary: '你没有追求抢镜，而是帮助球队稳住最后阶段，教练认可这份比赛理解。',
        playerDelta: { attributes: { mental: 0.4 }, coachRelation: 3, form: 1 },
      },
      {
        id: 'C',
        title: '严格执行指定跑位',
        description: '不擅自扩大自己的活动范围。',
        effectPreview: '教练关系上升 · 个人表现平稳',
        outcomeSummary: '你把临场指令执行得很干净，没有留下华丽镜头，却让战术保持完整。',
        playerDelta: { coachRelation: 4, squadRelation: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'D',
        title: '根据场面自由判断',
        description: '保留临场改变跑位的权利。',
        effectPreview: '50%改变比赛 · 50%打乱部署',
        outcomeSummary: '你选择在基本职责之外保留临场判断空间。',
        playerDelta: { morale: 1 },
        outcomes: [
          { id: 'READ', label: '判断改变比赛', weight: 50, summary: '一次提前判断让你出现在最关键的位置，球队因此完成了最后阶段的改变。', playerDelta: { form: 7, reputation: 3, coachRelation: 2 }, storyEffect: { tendencyDelta: { clutch: 1 } } },
          { id: 'BREAK', label: '打乱原有部署', weight: 50, summary: '你的自由跑动和队友发生重叠，教练对这次擅自改变安排并不满意。', playerDelta: { form: -4, coachRelation: -4 } },
        ],
      },
    ],
  },
  {
    id: 'CUP_ROTATION_START',
    groupId: 'MATCH_OPPORTUNITY',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 3,
    interactionKind: 'RANKING',
    eyebrow: '比赛 · 杯赛机会',
    title: '杯赛首发前，教练让你明确自己的比赛优先级。',
    description: '你必须在个人表现、战术纪律和身体管理之间排出先后顺序。',
    weight: 7,
    isEligible: (state) =>
      Boolean(state.contract) && hasFirstTeamRole(state, 'SUBSTITUTE'),
    choices: [
      {
        id: 'A',
        title: '表现 ＞ 纪律 ＞ 身体',
        description: '优先抓住少有的展示机会。',
        effectPreview: '竞技状态明显上升 · 身体消耗增加',
        outcomeSummary: '你把个人表现放在第一位，整场保持高投入，成功让更多人记住了这次首发。',
        playerDelta: { form: 6, reputation: 3, fitness: -5 },
      },
      {
        id: 'B',
        title: '纪律 ＞ 表现 ＞ 身体',
        description: '先完成教练交代的全部职责。',
        effectPreview: '教练、队内关系稳定上升',
        outcomeSummary: '你没有为了数据破坏战术，教练和队友都认可这是一场可靠的杯赛表现。',
        playerDelta: { coachRelation: 5, squadRelation: 3, form: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'C',
        title: '身体 ＞ 纪律 ＞ 表现',
        description: '控制强度，确保后续窗口稳定。',
        effectPreview: '身体状态上升 · 舆论关注下降',
        outcomeSummary: '你用更克制的方式完成比赛，没有制造太多话题，但为后续赛程保留了身体。',
        playerDelta: { fitness: 5, form: -1, mediaRelation: -1 },
      },
    ],
  },
  {
    id: 'FITNESS_WARNING',
    groupId: 'FITNESS_MANAGEMENT',
    category: 'HEALTH',
    priority: 'P2',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
    eyebrow: '身体 · 负荷警报',
    title: '体能团队发现你的疲劳指标偏高。',
    description:
      '目前还不是伤病，但如果继续维持高负荷，本窗口后半程的训练质量会受到影响。',
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
        effectPreview: '短期状态上升 · 65%当窗遭遇身体反噬',
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
            summary: '高负荷让状态短暂变好，随后训练质量和恢复指标一同下滑，教练也得知你隐瞒了疲劳。',
            playerDelta: { fitness: -8, morale: -1, coachRelation: -2 },
            trainingBonus: -1,
          },
        ],
      },
    ],
  },
  {
    id: 'KEY_MATCH_PAIN',
    groupId: 'MATCH_AVAILABILITY',
    category: 'HEALTH',
    priority: 'P2',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
            summary: '比赛强度超出预期，脚踝在一次对抗后明显不适，你只能提前离场并下调本窗口训练量。',
            playerDelta: { form: -2, fitness: -10, morale: -2 },
            trainingBonus: -0.5,
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
            summary: '脚踝没有拖住你。你在关键时刻完成决定性表现，赢得尊重，也付出了当窗恢复变慢的代价。',
            playerDelta: { form: 6, fitness: -7, morale: 4, squadRelation: 2, reputation: 2 },
          },
          {
            id: 'PAIN',
            label: '不适明显加重',
            weight: 65,
            summary: '一次急停让脚踝的不适迅速加剧，你没有等到终场就被迫离开，余下训练也随即降量。',
            playerDelta: { form: -3, fitness: -14, morale: -3 },
            trainingBonus: -1,
          },
        ],
      },
    ],
  },
  {
    id: 'CONTRACT_ROLE_TALK',
    groupId: 'CONTRACT_ROLE',
    category: 'CONTRACT',
    priority: 'P1',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
    groupId: 'TRANSFER_MEDIA',
    category: 'CONTRACT',
    priority: 'P3',
    cooldownWindows: 2,
    interactionKind: 'CHOICE',
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
  {
    id: 'NATIONAL_DEBUT_REVIEW',
    groupId: 'NATIONAL_ENTRY',
    category: 'NATIONAL',
    priority: 'P2',
    cooldownWindows: 8,
    interactionKind: 'CHOICE',
    eyebrow: '国家队 · 首秀复盘',
    title: '国家队首秀结束后，教练组单独留下了你。',
    description: '第一次穿上国家队球衣已经成为履历的一部分，现在要决定如何理解这次起点。',
    weight: 9,
    isEligible: (state) =>
      Boolean(latestNationalWindow(state)?.debut) &&
      !hasCareerEvent(state, 'NATIONAL_DEBUT_REVIEW'),
    choices: [
      {
        id: 'A',
        title: '逐回合复盘表现',
        description: '先弄清自己与国家队要求的差距。',
        effectPreview: '心理能力、职业倾向上升',
        outcomeSummary: '你没有沉浸在首秀光环里，而是把每次处理球重新看了一遍，下一次集训目标变得清晰。',
        playerDelta: { attributes: { mental: 0.5 }, morale: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '把球衣送给家人',
        description: '用一个私人仪式记住职业起点。',
        effectPreview: '心理状态、国家声誉上升',
        outcomeSummary: '家人收藏了你的首秀球衣。这个时刻没有制造太多新闻，却让你更加确定继续前进的意义。',
        playerDelta: { morale: 5, reputation: 2 },
      },
      {
        id: 'C',
        title: '接受完整媒体采访',
        description: '主动谈论首秀和未来目标。',
        effectPreview: '65%扩大关注 · 35%被认为言之过早',
        outcomeSummary: '你选择让第一次国家队经历成为公众认识你的窗口。',
        playerDelta: { reputation: 1 },
        outcomes: [
          {
            id: 'WELCOME',
            label: '表达赢得认可',
            weight: 65,
            summary: '采访真诚而克制，球迷开始把你视作值得期待的新面孔。',
            playerDelta: { fanRelation: 5, mediaRelation: 4, reputation: 4 },
            storyEffect: { publicPersona: 'LOW_KEY' },
          },
          {
            id: 'EARLY',
            label: '目标被指过早',
            weight: 35,
            summary: '媒体把你的长期目标放大成即时承诺，首秀后的喜悦很快混入了质疑。',
            playerDelta: { mediaRelation: -3, morale: -2, reputation: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'NATIONAL_ROLE_MEETING',
    groupId: 'NATIONAL_ROLE',
    category: 'NATIONAL',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'DIALOGUE',
    eyebrow: '国家队 · 队内定位',
    title: '国家队教练与你讨论下一阶段的队内定位。',
    description: '你已经不再是第一次报到的新人，可以先决定谈话重点，再表达自己的诉求。',
    weight: 7,
    isEligible: (state) =>
      state.nationalTeam.caps >= 8 &&
      !state.nationalTeam.retired &&
      Boolean(state.nationalTeam.currentRole) &&
      hasFirstTeamRole(state, 'ROTATION'),
    setup: {
      prompt: '你希望先谈哪一部分？',
      options: [
        {
          id: 'ROLE',
          title: '先谈比赛角色',
          description: '确认自己在体系中的具体任务。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'TEAM',
          title: '先谈球队目标',
          description: '从团队需要出发再谈个人。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '争取稳定首发',
        description: '用俱乐部表现要求更明确的位置。',
        effectPreview: '45%获得认可 · 55%被要求继续证明',
        outcomeSummary: '你明确提出希望成为稳定首发。',
        playerDelta: { morale: 1 },
        outcomes: [
          {
            id: 'TRUST',
            label: '诉求获得认可',
            weight: 45,
            summary: '教练认可你的进步，也给出了更明确的比赛责任。',
            playerDelta: { form: 4, reputation: 3, morale: 3 },
            storyEffect: { tendencyDelta: { leadership: 1 } },
          },
          {
            id: 'PROVE',
            label: '仍需继续证明',
            weight: 55,
            summary: '教练没有否定你，但要求先把俱乐部状态稳定在更高水平。',
            playerDelta: { morale: -2, form: 1 },
          },
        ],
      },
      {
        id: 'B',
        title: '接受功能型角色',
        description: '先提高在不同比赛中的可用性。',
        effectPreview: '心理能力、竞技状态上升',
        outcomeSummary: '你接受了更具体的功能型任务，出场承诺没有增加，但教练更清楚何时可以使用你。',
        playerDelta: { attributes: { mental: 0.5 }, form: 3, morale: 1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'C',
        title: '询问如何帮助全队',
        description: '把个人位置放到球队目标之后。',
        effectPreview: '队内关系、外交倾向上升',
        outcomeSummary: '你先问球队需要什么，再讨论自己能承担什么，谈话因此变得务实。',
        playerDelta: { squadRelation: 4, morale: 2, reputation: 1 },
        storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'D',
        title: '主动承担关键球',
        description: '愿意在压力最大的时刻站出来。',
        effectPreview: '大赛倾向上升 · 心理压力增加',
        outcomeSummary: '你主动表示愿意承担关键责任。教练记住了这句话，外界期待也随之提高。',
        playerDelta: { reputation: 3, morale: -1 },
        storyEffect: { tendencyDelta: { clutch: 1, leadership: 1 } },
      },
    ],
  },
  {
    id: 'NATIONAL_SQUAD_OMISSION',
    groupId: 'NATIONAL_SELECTION',
    category: 'NATIONAL',
    priority: 'P2',
    cooldownWindows: 4,
    interactionKind: 'CHOICE',
    eyebrow: '国家队 · 名单落选',
    title: '有过国家队经历的你，这次没有进入集训名单。',
    description: '落选不是生涯失败，但公开反应和接下来的训练方式会影响你重返名单的路径。',
    weight: 8,
    isEligible: (state) => {
      const record = latestNationalWindow(state)
      return Boolean(
        record &&
          !record.calledUp &&
          !state.nationalTeam.retired &&
          state.nationalTeam.caps >= 3 &&
          record.selectionScore >= record.selectionBenchmark - 10,
      )
    },
    choices: [
      {
        id: 'A',
        title: '私下询问改进方向',
        description: '不公开抱怨，只向教练组索取反馈。',
        effectPreview: '心理能力、职业倾向上升',
        outcomeSummary: '你拿到了一份具体反馈，落选仍然失望，但训练不再没有方向。',
        playerDelta: { attributes: { mental: 0.5 }, morale: 1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '用俱乐部比赛回应',
        description: '把情绪全部转化为场上投入。',
        effectPreview: '60%状态反弹 · 40%训练过载',
        outcomeSummary: '你决定不通过媒体回应，把注意力放回俱乐部。',
        playerDelta: { fitness: -2 },
        outcomes: [
          {
            id: 'REBOUND',
            label: '状态明显反弹',
            weight: 60,
            summary: '落选激活了竞争心，你在俱乐部重新拿出有说服力的表现。',
            playerDelta: { form: 7, morale: 4, reputation: 2 },
          },
          {
            id: 'OVERLOAD',
            label: '投入超过恢复',
            weight: 40,
            summary: '急于证明自己让训练负荷过高，状态没有立刻转化成比赛表现。',
            playerDelta: { fitness: -6, form: -2, morale: -2 },
          },
        ],
      },
      {
        id: 'C',
        title: '公开表示尊重决定',
        description: '承认竞争结果，同时保留回归目标。',
        effectPreview: '媒体、球迷关系上升',
        outcomeSummary: '你的回应没有制造争议，也让球迷看见了重返名单的决心。',
        playerDelta: { mediaRelation: 3, fanRelation: 3, morale: 2 },
        storyEffect: { publicPersona: 'LOW_KEY', tendencyDelta: { diplomacy: 1 } },
      },
    ],
  },
  {
    id: 'NATIONAL_CLUB_LOAD_CONFLICT',
    groupId: 'NATIONAL_LOAD',
    category: 'NATIONAL',
    priority: 'P2',
    cooldownWindows: 4,
    interactionKind: 'ALLOCATION',
    eyebrow: '国家队 · 负荷协调',
    title: '俱乐部和国家队对你的训练负荷产生分歧。',
    description: '两边都希望你保持状态，但恢复时间有限，必须明确这一阶段的分配方式。',
    weight: 6,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 18 &&
      Boolean(latestNationalWindow(state)?.calledUp) &&
      hasFirstTeamRole(state, 'ROTATION') &&
      Boolean(
        state.player &&
          (state.player.fitness < 80 ||
            (state.lastReport?.stats.appearances ?? 0) >= 12),
      ),
    choices: [
      {
        id: 'A',
        title: '俱乐部60% · 国家队40%',
        description: '优先保证日常联赛和俱乐部位置。',
        effectPreview: '教练关系、身体状态上升',
        outcomeSummary: '你把大部分恢复资源留给俱乐部，国家队训练有所收缩，但长期比赛节奏更加稳定。',
        playerDelta: { coachRelation: 4, fitness: 4, reputation: -1 },
      },
      {
        id: 'B',
        title: '两边各50%',
        description: '要求两套团队共享全部负荷数据。',
        effectPreview: '身体、外交倾向稳定上升',
        outcomeSummary: '双方共享了训练数据，你没有完全满足任何一边，却避免了重复负荷。',
        playerDelta: { fitness: 3, coachRelation: 1, morale: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1, professionalism: 1 } },
      },
      {
        id: 'C',
        title: '国家队65% · 俱乐部35%',
        description: '把国家队比赛视为当前最高优先级。',
        effectPreview: '国家声誉上升 · 俱乐部关系承压',
        outcomeSummary: '你明确优先国家队任务，公众认可这份投入，俱乐部教练却担心日常安排被打乱。',
        playerDelta: { reputation: 4, fanRelation: 2, coachRelation: -3, fitness: -1 },
      },
    ],
  },
  {
    id: 'NATIONAL_TOURNAMENT_REACTION',
    groupId: 'NATIONAL_TOURNAMENT',
    category: 'NATIONAL',
    priority: 'P2',
    cooldownWindows: 8,
    interactionKind: 'RANKING',
    eyebrow: '国家队 · 大赛之后',
    title: '国家队大赛结束，所有人都在总结这段经历。',
    description: '无论成绩好坏，你都要决定把公众责任、个人复盘和身体恢复放在怎样的顺序。',
    weight: 7,
    isEligible: (state) => {
      const record = latestNationalWindow(state)
      return Boolean(
        record?.calledUp &&
          record.competition !== 'INTERNATIONAL_WINDOW' &&
          record.stage,
      )
    },
    choices: [
      {
        id: 'A',
        title: '复盘 ＞ 公众 ＞ 恢复',
        description: '先分析比赛，再承担公开回应。',
        effectPreview: '心理能力、国家声誉上升',
        outcomeSummary: '你先完成了完整复盘，再面对媒体谈论得失，表达因此更有内容。',
        playerDelta: { attributes: { mental: 0.7 }, mediaRelation: 3, reputation: 3, fitness: -2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '公众 ＞ 恢复 ＞ 复盘',
        description: '第一时间回应球迷和媒体。',
        effectPreview: '球迷、媒体关系明显上升',
        outcomeSummary: '你没有在赛后消失，而是第一时间承担了公开责任，球迷记住了你的态度。',
        playerDelta: { fanRelation: 6, mediaRelation: 4, reputation: 3, morale: -1 },
        storyEffect: { tendencyDelta: { leadership: 1, diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '恢复 ＞ 复盘 ＞ 公众',
        description: '先让身体和情绪回到稳定区间。',
        effectPreview: '身体、心理状态明显恢复',
        outcomeSummary: '你暂时远离舆论，先完成身体和情绪恢复，再以更平静的方式总结比赛。',
        playerDelta: { fitness: 7, morale: 5, mediaRelation: -2 },
      },
    ],
  },
  {
    id: 'AGENT_MARKET_CHECK',
    groupId: 'AGENT_MARKET_STRATEGY',
    category: 'CONTRACT',
    priority: 'P3',
    cooldownWindows: 5,
    interactionKind: 'DIALOGUE',
    eyebrow: '经纪人 · 市场评估',
    title: '经纪人建议在合同期内做一次非正式市场评估。',
    description: '这不会立刻产生转会报价，只是帮助你判断外界位置；你要先确定谈话方向。',
    weight: 7,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 18 &&
      hasFirstTeamRole(state, 'SUBSTITUTE') &&
      Boolean(
        state.contract &&
          state.contract.remainingHalfYears >= 3 &&
          state.player &&
          state.player.reputation >= 25,
      ),
    setup: {
      prompt: '你希望经纪人优先评估什么？',
      options: [
        {
          id: 'CAREER',
          title: '先看竞技平台',
          description: '比较联赛、球队角色和成长空间。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'CONTRACT',
          title: '先看合同价值',
          description: '比较工资、年限和市场位置。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '只评估稳定主力机会',
        description: '拒绝只有名气、没有出场空间的方向。',
        effectPreview: '经纪人关系、职业判断上升',
        outcomeSummary: '经纪人把筛选重点放在真实出场空间，市场报告更短，却更符合你的职业目标。',
        playerDelta: { agentRelation: 3, morale: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '优先了解更高平台',
        description: '即使角色较低，也想知道上限在哪里。',
        effectPreview: '声誉、进取倾向上升 · 心理承压',
        outcomeSummary: '经纪人把范围扩大到更高平台，你看见了可能性，也意识到竞争会比现在更激烈。',
        playerDelta: { reputation: 3, morale: -1, agentRelation: 2 },
      },
      {
        id: 'C',
        title: '核对合理工资区间',
        description: '避免未来谈判脱离真实市场。',
        effectPreview: '经纪人关系、心理状态上升',
        outcomeSummary: '你拿到了一份克制的市场区间，未来谈判有了参照，不再只听传闻。',
        playerDelta: { agentRelation: 4, morale: 2 },
      },
      {
        id: 'D',
        title: '要求制造市场声量',
        description: '希望更多俱乐部和媒体注意到你。',
        effectPreview: '55%扩大关注 · 45%引发现队反感',
        outcomeSummary: '你授权经纪人主动扩大市场声量。',
        playerDelta: { agentRelation: 2 },
        outcomes: [
          {
            id: 'BUZZ',
            label: '关注明显增加',
            weight: 55,
            summary: '几家媒体开始讨论你的市场位置，个人知名度随之提高。',
            playerDelta: { mediaRelation: 4, reputation: 5 },
            delayed: {
              delayWindows: 2,
              playerDelta: { reputation: 2 },
              summary: '此前的市场评估继续被外界引用，你仍在多家俱乐部的观察范围内。',
            },
          },
          {
            id: 'ANNOY',
            label: '俱乐部产生反感',
            weight: 45,
            summary: '俱乐部认为经纪团队在合同期内制造压力，教练也开始追问你的真实态度。',
            playerDelta: { coachRelation: -4, fanRelation: -2, reputation: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'RENEWAL_EXPECTATION_TALK',
    groupId: 'CONTRACT_FUTURE',
    category: 'CONTRACT',
    priority: 'P2',
    cooldownWindows: 5,
    interactionKind: 'CHOICE',
    eyebrow: '合同 · 续约预期',
    title: '俱乐部提前询问你对下一份合同的基本态度。',
    description: '这不是正式续约，也不会改变当前合同，只是双方在谈判前交换预期。',
    weight: 7,
    isEligible: (state) =>
      Boolean(
        state.contract &&
          state.contract.remainingHalfYears >= 2 &&
          state.contract.remainingHalfYears <= 4,
      ) &&
      playerAgeAtWindow(state.windowIndex) < 39 &&
      currentClubFirstTeamWindows(state) >= 2,
    choices: [
      {
        id: 'A',
        title: '优先谈清球队角色',
        description: '出场定位比工资数字更重要。',
        effectPreview: '教练、经纪人关系上升',
        outcomeSummary: '你把角色放在谈判首位，俱乐部知道未来必须给出清晰的竞技计划。',
        playerDelta: { coachRelation: 3, agentRelation: 2, morale: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '表达长期留下意愿',
        description: '只要计划合理，愿意继续共同成长。',
        effectPreview: '忠诚度、球迷关系明显上升',
        outcomeSummary: '你没有在非正式谈话中索要承诺，而是先表达留下意愿，俱乐部和球迷都感到安心。',
        playerDelta: { clubAttachment: 6, fanRelation: 5, morale: 2 },
        storyEffect: { publicPersona: 'TEAM_FIRST' },
      },
      {
        id: 'C',
        title: '暂不承诺任何方向',
        description: '等正式报价和赛季结果出来再决定。',
        effectPreview: '保留主动权 · 俱乐部关系小幅下降',
        outcomeSummary: '你礼貌地保留了全部选择，谈判空间更大，俱乐部却无法确认你的长期态度。',
        playerDelta: { agentRelation: 3, coachRelation: -2, clubAttachment: -1 },
      },
    ],
  },
  {
    id: 'RELEASE_CLAUSE_BRIEFING',
    groupId: 'CONTRACT_TERMS',
    category: 'CONTRACT',
    priority: 'P3',
    cooldownWindows: 8,
    interactionKind: 'CHOICE',
    eyebrow: '合同 · 解约条款',
    title: '经纪人重新向你解释合同里的解约金条款。',
    description: '条款本身不会在这次谈话中改变，但你可以决定未来谈判更重视自由、稳定还是收入。',
    weight: 5,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 18 &&
      hasFirstTeamRole(state, 'ROTATION') &&
      Boolean(state.contract?.releaseClauseEuro),
    choices: [
      {
        id: 'A',
        title: '未来争取降低解约金',
        description: '为可能的生涯跃升保留通道。',
        effectPreview: '经纪人关系上升 · 忠诚度下降',
        outcomeSummary: '你明确告诉经纪人，未来合同必须保留合理的流动空间。',
        playerDelta: { agentRelation: 4, clubAttachment: -2, morale: 2 },
      },
      {
        id: 'B',
        title: '接受稳定合同逻辑',
        description: '只要俱乐部计划可靠，不把离队放在首位。',
        effectPreview: '忠诚度、心理状态上升',
        outcomeSummary: '你接受条款所代表的长期稳定，至少在当前阶段不把转会当作唯一目标。',
        playerDelta: { clubAttachment: 4, morale: 3, fanRelation: 2 },
      },
      {
        id: 'C',
        title: '未来用高薪交换高条款',
        description: '如果流动受限，就要求合同体现价值。',
        effectPreview: '经纪人、市场倾向上升 · 球迷关系下降',
        outcomeSummary: '你把未来谈判原则说得很直接：限制越强，俱乐部就必须支付相应代价。',
        playerDelta: { agentRelation: 5, reputation: 2, fanRelation: -2 },
        storyEffect: { publicPersona: 'OUTSPOKEN' },
      },
    ],
  },
  {
    id: 'DEADLINE_DAY_SPECULATION',
    groupId: 'TRANSFER_MEDIA',
    category: 'CONTRACT',
    priority: 'P3',
    cooldownWindows: 4,
    interactionKind: 'PERSON_TONE',
    eyebrow: '转会 · 截止日前',
    title: '转会截止日前，记者堵住了你的离场通道。',
    description: '没有正式报价需要处理，但一句话就可能改变俱乐部和市场对你的判断。',
    weight: 6,
    isEligible: (state) =>
      Boolean(state.contract && state.contract.remainingHalfYears > 0) &&
      hasFirstTeamRole(state, 'ROTATION') &&
      Boolean(state.player && state.player.reputation >= 35) &&
      !state.transferDecision,
    setup: {
      prompt: '你准备先回应谁的关切？',
      options: [
        {
          id: 'CLUB',
          title: '先回应现俱乐部球迷',
          description: '把稳定和投入放在第一位。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'MARKET',
          title: '先回应外部市场',
          description: '保留未来可能性。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '明确本窗口不会离队',
        description: '直接结束所有截止日猜测。',
        effectPreview: '球迷、教练关系明显上升',
        outcomeSummary: '你的回答没有留下模糊空间，转会话题迅速降温，球队也更容易专注比赛。',
        playerDelta: { fanRelation: 6, coachRelation: 4, clubAttachment: 3 },
      },
      {
        id: 'B',
        title: '只强调当前比赛',
        description: '不谈长期未来，也不制造离队暗示。',
        effectPreview: '媒体、职业倾向小幅上升',
        outcomeSummary: '你把所有问题拉回下一场比赛，记者没有得到标题，俱乐部也接受了这种克制。',
        playerDelta: { mediaRelation: 2, coachRelation: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1, diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '承认愿意听取机会',
        description: '说明职业球员不会关闭所有可能。',
        effectPreview: '55%提升市场热度 · 45%激怒现队球迷',
        outcomeSummary: '你承认愿意了解合适的机会。',
        playerDelta: { agentRelation: 2 },
        outcomes: [
          {
            id: 'INTEREST',
            label: '市场热度上升',
            weight: 55,
            summary: '坦率回应让外界确认你并非完全不可接触，更多球队开始关注后续窗口。',
            playerDelta: { reputation: 5, mediaRelation: 4 },
          },
          {
            id: 'ANGER',
            label: '现队球迷反感',
            weight: 45,
            summary: '回答在截止日气氛中被理解为逼宫，主场球迷对你的态度明显转冷。',
            playerDelta: { fanRelation: -6, coachRelation: -3, reputation: 2 },
          },
        ],
      },
      {
        id: 'D',
        title: '用玩笑回避问题',
        description: '缓和现场气氛，不提供实质答案。',
        effectPreview: '媒体关系上升 · 未来仍有猜测',
        outcomeSummary: '一句玩笑让现场轻松下来，但没有真正结束外界对未来的讨论。',
        playerDelta: { mediaRelation: 4, morale: 2, reputation: 1 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
    ],
  },
  {
    id: 'INTERVIEW_MISQUOTE',
    groupId: 'MEDIA_INTERVIEW_CRISIS',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 4,
    interactionKind: 'RISK',
    eyebrow: '媒体 · 采访失真',
    title: '一段采访被剪成了与你原意不同的标题。',
    description: '俱乐部允许你回应，但越强硬的处理越可能延长争议。',
    weight: 7,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 18 &&
      Boolean(state.player && state.player.reputation >= 25),
    setup: {
      prompt: '你准备把风险控制在什么范围？',
      options: [
        {
          id: 'QUIET',
          title: '先私下修正',
          description: '尽量不让争议继续扩散。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'PUBLIC',
          title: '公开夺回话语权',
          description: '承担更高热度，直接说明原意。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '要求媒体更正全文',
        description: '由新闻官提供录音和原始语境。',
        effectPreview: '80%安静更正 · 20%媒体拒绝',
        outcomeSummary: '俱乐部新闻官正式联系了媒体。',
        playerDelta: {},
        outcomes: [
          {
            id: 'CORRECTED',
            label: '报道完成更正',
            weight: 80,
            summary: '完整语境被补回，争议很快失去热度，你也没有亲自卷入争吵。',
            playerDelta: { mediaRelation: 3, coachRelation: 2, morale: 2 },
          },
          {
            id: 'REFUSED',
            label: '媒体拒绝更正',
            weight: 20,
            summary: '对方坚持标题没有错误，争议没有扩大，却留下了一些误解。',
            playerDelta: { mediaRelation: -3, morale: -2 },
          },
        ],
      },
      {
        id: 'B',
        title: '让话题自然过去',
        description: '不回应，不给标题第二次传播机会。',
        effectPreview: '竞技、心理状态小幅恢复',
        outcomeSummary: '你没有继续喂养争议，几天后话题降温，训练注意力也重新集中。',
        playerDelta: { form: 2, morale: 3, mediaRelation: -1 },
        storyEffect: { publicPersona: 'LOW_KEY' },
      },
      {
        id: 'C',
        title: '发布完整原话视频',
        description: '直接让公众判断谁改变了语境。',
        effectPreview: '60%扭转舆论 · 40%冲突升级',
        outcomeSummary: '你发布了没有剪辑的完整回答。',
        playerDelta: { reputation: 1 },
        outcomes: [
          {
            id: 'TURN',
            label: '舆论明显反转',
            weight: 60,
            summary: '完整视频证明原报道过度剪辑，公众开始支持你的回应。',
            playerDelta: { mediaRelation: 5, fanRelation: 4, reputation: 5, morale: 3 },
          },
          {
            id: 'ESCALATE',
            label: '媒体公开反击',
            weight: 40,
            summary: '双方围绕语境继续争执，你赢得一部分支持，也让话题停留得更久。',
            playerDelta: { mediaRelation: -5, fanRelation: 2, morale: -3, reputation: 3 },
          },
        ],
      },
      {
        id: 'D',
        title: '召开一次说明采访',
        description: '用更完整的交流解释立场。',
        effectPreview: '媒体关系、外交倾向上升',
        outcomeSummary: '你没有攻击记者，而是把原本想说的内容重新讲清，争议逐渐变成一次正常讨论。',
        playerDelta: { mediaRelation: 4, reputation: 3, morale: 1 },
        storyEffect: { tendencyDelta: { diplomacy: 1 }, publicPersona: 'OUTSPOKEN' },
      },
    ],
  },
  {
    id: 'SPONSOR_APPEARANCE',
    groupId: 'COMMERCIAL_OBLIGATION',
    category: 'MEDIA',
    priority: 'P4',
    cooldownWindows: 6,
    interactionKind: 'ALLOCATION',
    eyebrow: '商业 · 公开邀约',
    title: '一家品牌邀请你参加半天的公开活动。',
    description: '这是一笔真实可支配收入，但活动、训练和恢复无法同时占满时间。',
    weight: 5,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 18 &&
      Boolean(state.player && state.player.reputation >= 40),
    choices: [
      {
        id: 'A',
        title: '活动70% · 训练30%',
        description: '完整履约，接受更高曝光。',
        effectPreview: '现金+€6,000 · 声誉上升 · 身体下降',
        outcomeSummary: '你完成了完整商业活动，收入和曝光都很可观，但当天恢复时间明显不足。',
        playerDelta: { reputation: 5, mediaRelation: 4, fitness: -4 },
        cashDeltaEuro: 6_000,
      },
      {
        id: 'B',
        title: '活动40% · 训练60%',
        description: '只参加核心拍摄和球迷互动。',
        effectPreview: '现金+€3,500 · 关系与状态平衡',
        outcomeSummary: '品牌接受了精简安排，你保留了训练完整性，也完成了必要的公众露面。',
        playerDelta: { reputation: 2, mediaRelation: 2, form: 1, fitness: -1 },
        cashDeltaEuro: 3_500,
      },
      {
        id: 'C',
        title: '婉拒活动 · 完整训练',
        description: '不接这笔收入，维持竞技节奏。',
        effectPreview: '竞技、教练关系上升 · 无额外收入',
        outcomeSummary: '你放弃了商业收入，把完整时间留给训练。俱乐部认可这种阶段性取舍。',
        playerDelta: { form: 4, coachRelation: 3, mediaRelation: -1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
    ],
  },
  {
    id: 'AWAY_FAN_CONFRONTATION',
    groupId: 'FAN_CONFLICT',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 5,
    interactionKind: 'PERSON_TONE',
    eyebrow: '球迷 · 客场冲突',
    title: '客场离场时，一群球迷在通道旁激烈挑衅。',
    description: '安保人员已经介入，你仍要决定先照顾谁的情绪，以及采用什么态度。',
    weight: 5,
    isEligible: (state) =>
      hasFirstTeamRole(state, 'SUBSTITUTE') &&
      Boolean(
        state.player &&
          state.player.reputation >= 25 &&
          (state.lastReport?.stats.appearances ?? 0) > 0,
      ),
    setup: {
      prompt: '你准备先回应哪一边？',
      options: [
        {
          id: 'OWN_FANS',
          title: '先安抚随队球迷',
          description: '保护支持球队远征的人。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'SECURITY',
          title: '先配合安保离场',
          description: '避免任何直接对峙。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '停下感谢随队支持',
        description: '不回应挑衅，只向本队看台鼓掌。',
        effectPreview: '球迷、媒体关系上升',
        outcomeSummary: '你把注意力完全留给随队球迷，冲突没有升级，本队支持者也感到被尊重。',
        playerDelta: { fanRelation: 6, mediaRelation: 2, morale: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'B',
        title: '示意全队一起致谢',
        description: '把个人回应变成团队行动。',
        effectPreview: '队内、球迷关系明显上升',
        outcomeSummary: '你拉上队友共同向远征球迷致谢，现场情绪被团队动作重新引导。',
        playerDelta: { squadRelation: 5, fanRelation: 5, reputation: 2 },
        storyEffect: { tendencyDelta: { leadership: 1 } },
      },
      {
        id: 'C',
        title: '完全听从安保安排',
        description: '不在高风险通道停留。',
        effectPreview: '风险最低 · 关系基本稳定',
        outcomeSummary: '你没有给冲突留下继续升级的机会，顺利离场，事件也很快结束。',
        playerDelta: { morale: 1, coachRelation: 1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'D',
        title: '回头做出强硬回应',
        description: '用动作告诉对方挑衅没有效果。',
        effectPreview: '35%成为个性名场面 · 65%引发纪律争议',
        outcomeSummary: '你在离场前回头回应了挑衅。',
        playerDelta: { morale: 2 },
        outcomes: [
          {
            id: 'ICONIC',
            label: '成为个性名场面',
            weight: 35,
            summary: '动作没有越界，反而成为球迷喜欢的强硬画面，你的个人形象更加鲜明。',
            playerDelta: { fanRelation: 5, reputation: 6, mediaRelation: 3 },
            storyEffect: { publicPersona: 'OUTSPOKEN' },
          },
          {
            id: 'DISCIPLINE',
            label: '引发纪律争议',
            weight: 65,
            summary: '回应被解读为挑衅，俱乐部不得不公开降温，教练对你的判断感到不满。',
            playerDelta: { mediaRelation: -5, coachRelation: -4, fanRelation: -2, reputation: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'COACH_PROGRESS_REVIEW',
    groupId: 'COACH_REVIEW',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 10,
    interactionKind: 'DIALOGUE',
    eyebrow: '教练 · 阶段面谈',
    title: '教练安排了一次阶段个人面谈。',
    description: '教练希望重新核对你的场上特点和职业目标，你可以先决定这次谈话从哪里开始。',
    weight: 5,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 15 &&
      state.history.length >= 4 &&
      Boolean(state.player),
    setup: {
      prompt: '你准备先介绍自己的哪一面？',
      options: [
        {
          id: 'FOOTBALL',
          title: '先谈场上特点',
          description: '让教练理解你的使用方式。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'CAREER',
          title: '先谈职业目标',
          description: '让教练理解你的长期诉求。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '展示最擅长的职责',
        description: '先争取在熟悉位置证明自己。',
        effectPreview: '竞技、教练关系上升',
        outcomeSummary: '你用清楚的比赛片段说明自己的强项，教练重新确认了最合适的使用方式。',
        playerDelta: { form: 4, coachRelation: 4, morale: 2 },
      },
      {
        id: 'B',
        title: '强调战术适应能力',
        description: '愿意尝试不同职责，但不学习新位置。',
        effectPreview: '心理能力、职业倾向上升',
        outcomeSummary: '你表达了对不同任务的开放态度，教练把你列入了更多战术方案。',
        playerDelta: { attributes: { mental: 0.5 }, coachRelation: 3 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'C',
        title: '明确争取更高角色',
        description: '说明自己希望承担更多比赛责任。',
        effectPreview: '50%赢得欣赏 · 50%被要求先证明',
        outcomeSummary: '你向教练明确提出了下一阶段的角色目标。',
        playerDelta: { morale: 1 },
        outcomes: [
          {
            id: 'IMPRESSED',
            label: '主动性得到欣赏',
            weight: 50,
            summary: '教练欣赏你的清晰和自信，愿意在训练中认真评估更高角色。',
            playerDelta: { coachRelation: 5, form: 3, reputation: 2 },
          },
          {
            id: 'EARN',
            label: '被要求先证明',
            weight: 50,
            summary: '教练没有接受口头承诺，要求你先用训练和比赛重新建立位置。',
            playerDelta: { coachRelation: -1, morale: -2, form: 1 },
          },
        ],
      },
      {
        id: 'D',
        title: '先询问球队计划',
        description: '不急着谈自己，先理解新周期方向。',
        effectPreview: '教练关系、外交倾向上升',
        outcomeSummary: '你先听完下一阶段的球队计划，再寻找自己的位置，谈话因此保持了良好节奏。',
        playerDelta: { coachRelation: 4, morale: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1, professionalism: 1 } },
      },
    ],
  },
  {
    id: 'FORMER_TEAMMATE_REUNION',
    groupId: 'CAREER_REUNION',
    category: 'TEAM',
    priority: 'P4',
    cooldownWindows: 8,
    interactionKind: 'CHOICE',
    eyebrow: '关系 · 故人重逢',
    title: '赛后通道里，你遇见了一名昔日队友。',
    description: '你们如今效力不同俱乐部，这次重逢可以只停留在寒暄，也可以重新建立联系。',
    weight: 5,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 20 &&
      hasPlayedForAnotherClub(state) &&
      Boolean(state.player),
    choices: [
      {
        id: 'A',
        title: '赛后认真叙旧',
        description: '聊一聊各自离开后的经历。',
        effectPreview: '心理、队内关系上升',
        outcomeSummary: '一次没有镜头的长谈让你重新想起职业起点，也缓解了近期积累的压力。',
        playerDelta: { morale: 5, squadRelation: 2 },
      },
      {
        id: 'B',
        title: '交换比赛观察',
        description: '把重逢变成一次职业交流。',
        effectPreview: '心理能力、职业倾向上升',
        outcomeSummary: '你们交换了对比赛和联赛的观察，旧关系转化成了新的职业经验。',
        playerDelta: { attributes: { mental: 0.4 }, morale: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'C',
        title: '邀请公开合影',
        description: '让球迷看见旧队友情仍然存在。',
        effectPreview: '60%收获好评 · 40%被质疑不够专注',
        outcomeSummary: '你主动邀请旧队友合影。',
        playerDelta: { reputation: 1 },
        outcomes: [
          {
            id: 'WARM',
            label: '旧友情获得好评',
            weight: 60,
            summary: '照片被视为职业足球里难得的温暖画面，两边球迷都给予积极回应。',
            playerDelta: { fanRelation: 4, mediaRelation: 3, reputation: 3 },
          },
          {
            id: 'FOCUS',
            label: '被质疑比赛不专注',
            weight: 40,
            summary: '失利后的合影引发争议，一部分球迷认为你没有充分理解比赛结果。',
            playerDelta: { fanRelation: -4, mediaRelation: -2, morale: -1 },
          },
        ],
      },
    ],
  },
  {
    id: 'YOUNG_CHALLENGER_ARRIVES',
    groupId: 'POSITION_RIVALRY',
    category: 'TEAM',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'DIALOGUE',
    eyebrow: '更衣室 · 新人挑战',
    title: '一名年轻新援公开表示，希望竞争你的位置。',
    description: '你已经是球队稳定成员，可以先决定把他视作竞争者还是后辈，再选择具体回应。',
    weight: 6,
    isEligible: (state) =>
      playerAgeAtWindow(state.windowIndex) >= 23 &&
      hasFirstTeamRole(state, 'STARTER') &&
      currentClubFirstTeamWindows(state) >= 3 &&
      state.careerStory.club.rivalry === 'NONE',
    setup: {
      prompt: '你准备如何定义这段关系？',
      options: [
        {
          id: 'RIVAL',
          title: '先当作位置竞争',
          description: '明确首发必须靠表现争取。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'JUNIOR',
          title: '先当作年轻后辈',
          description: '竞争之外保留帮助和交流。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '训练场正面回应',
        description: '提高训练强度，不进行口头争执。',
        effectPreview: '竞技状态上升 · 身体消耗增加',
        outcomeSummary: '你用连续高质量训练回应挑战，竞争迅速升温，却仍保持在职业范围内。',
        playerDelta: { form: 5, fitness: -3, squadRelation: 1 },
        storyEffect: { club: { rivalry: 'HEALTHY' }, tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '公开强调现有地位',
        description: '提醒外界首发位置不是一句话就能拿走。',
        effectPreview: '45%稳住权威 · 55%制造更衣室对立',
        outcomeSummary: '你选择公开回应年轻球员的挑战。',
        playerDelta: { reputation: 2 },
        outcomes: [
          {
            id: 'AUTHORITY',
            label: '权威得到确认',
            weight: 45,
            summary: '随后比赛表现支撑了你的发言，队内竞争顺位暂时没有变化。',
            playerDelta: { form: 6, squadRelation: 3, fanRelation: 3 },
            storyEffect: { club: { rivalry: 'HEALTHY' }, publicPersona: 'OUTSPOKEN' },
          },
          {
            id: 'DIVIDE',
            label: '更衣室出现对立',
            weight: 55,
            summary: '公开回应让竞争变成人际冲突，队友开始被迫选择立场。',
            playerDelta: { squadRelation: -6, coachRelation: -3, morale: -2 },
            storyEffect: { club: { rivalry: 'HOSTILE' }, publicPersona: 'OUTSPOKEN' },
          },
        ],
      },
      {
        id: 'C',
        title: '主动分享球队经验',
        description: '帮助他理解战术和更衣室规则。',
        effectPreview: '队内关系、领导倾向上升',
        outcomeSummary: '你没有回避竞争，却主动帮助新人适应球队，关系逐渐变成相互推动。',
        playerDelta: { squadRelation: 6, coachRelation: 2, morale: 2 },
        storyEffect: { club: { rivalry: 'HEALTHY', mentorship: 'MENTOR' }, tendencyDelta: { leadership: 1 } },
      },
      {
        id: 'D',
        title: '保持礼貌但不额外帮助',
        description: '尊重新人，把全部精力留给自己。',
        effectPreview: '竞技、心理状态稳定上升',
        outcomeSummary: '你没有制造敌意，也没有主动扮演导师，竞争保持清楚而克制。',
        playerDelta: { form: 3, morale: 3, squadRelation: 1 },
        storyEffect: { club: { rivalry: 'HEALTHY' } },
      },
    ],
  },
  {
    id: 'FIRST_TEAM_DEBUT_REFLECTION',
    groupId: 'FIRST_TEAM_DEBUT',
    category: 'MILESTONE',
    priority: 'P2',
    cooldownWindows: 53,
    interactionKind: 'CHOICE',
    eyebrow: '里程碑 · 一线队首秀',
    title: '你的一线队首秀已经写入生涯履历。',
    description: '第一次正式登场不必完美，但你可以决定怎样保存这段起点。',
    weight: 7,
    isEligible: (state) =>
      firstTeamCareerTotals(state).appearances > 0 &&
      !hasCareerEvent(state, 'FIRST_TEAM_DEBUT_REFLECTION'),
    choices: [
      {
        id: 'A',
        title: '完整复盘首秀',
        description: '把每次触球和跑位重新看一遍。',
        effectPreview: '心理能力、教练关系上升',
        outcomeSummary: '你把首秀从纪念日变成了一堂比赛课，教练也看见了你的职业态度。',
        playerDelta: { attributes: { mental: 0.5 }, coachRelation: 3, morale: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '收藏首秀球衣',
        description: '留下一件只属于自己的纪念品。',
        effectPreview: '心理状态、俱乐部归属感上升',
        outcomeSummary: '你收起了首秀球衣，也记住了真正踏入职业赛场时的紧张和兴奋。',
        playerDelta: { morale: 6, clubAttachment: 3 },
      },
      {
        id: 'C',
        title: '感谢帮助过你的人',
        description: '把首秀归功于教练和队友的支持。',
        effectPreview: '教练、队内与球迷关系上升',
        outcomeSummary: '你没有把首秀包装成个人英雄故事，公开感谢让身边的人感到被尊重。',
        playerDelta: { coachRelation: 3, squadRelation: 4, fanRelation: 2 },
        storyEffect: { publicPersona: 'TEAM_FIRST' },
      },
    ],
  },
  {
    id: 'FIRST_SENIOR_GOAL_REACTION',
    groupId: 'FIRST_SENIOR_GOAL',
    category: 'MILESTONE',
    priority: 'P2',
    cooldownWindows: 53,
    interactionKind: 'CHOICE',
    eyebrow: '里程碑 · 职业首球',
    title: '你的第一粒一线队进球已经被记入数据。',
    description: '这个进球属于职业生涯，也属于参与其中的整支球队。',
    weight: 7,
    isEligible: (state) =>
      firstTeamCareerTotals(state).goals > 0 &&
      !hasCareerEvent(state, 'FIRST_SENIOR_GOAL_REACTION'),
    choices: [
      {
        id: 'A',
        title: '把比赛用球带回家',
        description: '保留这次突破的实体记忆。',
        effectPreview: '心理状态明显上升',
        outcomeSummary: '比赛用球被安静地收藏起来。以后每次看见它，你都会想起第一球来得多么不容易。',
        playerDelta: { morale: 7, reputation: 1 },
      },
      {
        id: 'B',
        title: '感谢送出助攻的队友',
        description: '把进球的功劳分享出去。',
        effectPreview: '队内关系、团队形象上升',
        outcomeSummary: '你第一时间提到送出助攻的队友，这个进球因此成为了更衣室共同的快乐。',
        playerDelta: { squadRelation: 6, fanRelation: 2, morale: 3 },
        storyEffect: { publicPersona: 'TEAM_FIRST' },
      },
      {
        id: 'C',
        title: '公开设定下一个目标',
        description: '把首球当作竞争更高位置的开始。',
        effectPreview: '55%延续势头 · 45%增加压力',
        outcomeSummary: '你没有停留在首球庆祝中，而是立刻谈到了下一阶段。',
        playerDelta: { reputation: 3 },
        outcomes: [
          {
            id: 'MOMENTUM',
            label: '目标转化为动力',
            weight: 55,
            summary: '清晰目标让训练更有方向，首球带来的信心延续到了后续比赛。',
            playerDelta: { form: 6, morale: 4, fanRelation: 3 },
          },
          {
            id: 'PRESSURE',
            label: '外界期待迅速升高',
            weight: 45,
            summary: '媒体开始用进球数字衡量你，下一场没有破门便引来了不必要的议论。',
            playerDelta: { morale: -3, mediaRelation: -2, reputation: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'SCORING_DROUGHT_RESPONSE',
    groupId: 'MATCH_FORM_PRESSURE',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'DIALOGUE',
    eyebrow: '比赛 · 进球荒',
    title: '连续两个阶段没有进球，外界开始讨论你的效率。',
    description: '你需要先确定问题来自比赛方式还是心理压力，再决定怎样回应。',
    weight: 7,
    isEligible: (state) => {
      const windows = latestCompletedFirstTeamWindows(state, 2)
      return Boolean(
        state.player &&
          ['ST', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(
            state.player.primaryPosition,
          ) &&
          windows.length === 2 &&
          windows.every(
            (entry) =>
              entry.stats.appearances >= 6 && entry.stats.goals === 0,
          ),
      )
    },
    setup: {
      prompt: '你认为最需要先处理什么？',
      options: [
        {
          id: 'FOOTBALL',
          title: '先调整比赛方式',
          description: '从跑位、射门选择和配合入手。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'MIND',
          title: '先减轻心理压力',
          description: '停止让每次触球都背负进球任务。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '增加禁区终结训练',
        description: '把额外时间集中到最直接的射门场景。',
        effectPreview: '进攻、竞技状态上升 · 身体消耗增加',
        outcomeSummary: '重复终结训练让动作重新变得自然，但额外负荷也带来了一些疲劳。',
        playerDelta: { attributes: { attack: 0.6 }, form: 4, fitness: -3 },
      },
      {
        id: 'B',
        title: '扩大无球和助攻贡献',
        description: '不把价值只压在进球数字上。',
        effectPreview: '心理能力、队内关系上升',
        outcomeSummary: '你开始用跑动和配合帮助全队，进球压力下降，整体比赛影响力反而更加稳定。',
        playerDelta: { attributes: { mental: 0.5 }, squadRelation: 4, morale: 3 },
      },
      {
        id: 'C',
        title: '暂时停止阅读评论',
        description: '把外界声音隔离在训练场之外。',
        effectPreview: '心理状态明显恢复 · 媒体关系下降',
        outcomeSummary: '你退出了进球荒的舆论循环，训练和比赛重新回到自己的节奏。',
        playerDelta: { morale: 7, form: 2, mediaRelation: -2 },
      },
      {
        id: 'D',
        title: '公开承担进球责任',
        description: '不回避压力，承诺用表现回应。',
        effectPreview: '45%强势反弹 · 55%压力继续累积',
        outcomeSummary: '你在采访中明确承担了进球责任。',
        playerDelta: { reputation: 2 },
        outcomes: [
          {
            id: 'REBOUND',
            label: '责任激活竞争心',
            weight: 45,
            summary: '公开承诺没有压垮你，反而让比赛专注度明显提高。',
            playerDelta: { form: 7, morale: 4, fanRelation: 3 },
          },
          {
            id: 'HEAVIER',
            label: '压力继续累积',
            weight: 55,
            summary: '每次射门都被放大讨论，进球荒暂时变成了更沉重的心理负担。',
            playerDelta: { morale: -5, form: -3, mediaRelation: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'SUSTAINED_HIGH_FORM',
    groupId: 'MATCH_FORM_REWARD',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'ALLOCATION',
    eyebrow: '比赛 · 连续高光',
    title: '连续两个阶段表现出色，额外关注和比赛负荷同时到来。',
    description: '时间和体能有限，你必须决定如何在比赛、恢复和公众活动之间分配精力。',
    weight: 7,
    isEligible: (state) => {
      const windows = latestCompletedFirstTeamWindows(state, 2)
      return (
        windows.length === 2 &&
        windows.every(
          (entry) =>
            entry.stats.appearances >= 8 &&
            entry.stats.averageRating >= 7.1,
        )
      )
    },
    choices: [
      {
        id: 'A',
        title: '比赛60% · 恢复40%',
        description: '继续冲击数据，但保证基本恢复。',
        effectPreview: '竞技、知名度上升 · 身体消耗增加',
        outcomeSummary: '你延续了高投入比赛节奏，状态仍然醒目，身体负荷也开始接近上限。',
        playerDelta: { form: 6, reputation: 4, fitness: -4 },
      },
      {
        id: 'B',
        title: '比赛45% · 恢复45% · 活动10%',
        description: '尽量维持竞技和公众影响的平衡。',
        effectPreview: '状态、关系与知名度均衡上升',
        outcomeSummary: '你没有把全部筹码压在数据上，竞技节奏、恢复和公众联系都保持了稳定。',
        playerDelta: { form: 3, fitness: 3, fanRelation: 3, reputation: 2 },
      },
      {
        id: 'C',
        title: '恢复60% · 比赛40%',
        description: '主动降低额外安排，为后续赛程蓄力。',
        effectPreview: '身体、心理状态明显上升',
        outcomeSummary: '你没有追逐短期热度，而是利用高光期建立更稳定的身体和心理基础。',
        playerDelta: { fitness: 7, morale: 5, form: -1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
    ],
  },
  {
    id: 'IMPACT_SUBSTITUTE_RECOGNITION',
    groupId: 'MATCH_ROLE_REWARD',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 5,
    interactionKind: 'RISK',
    eyebrow: '比赛 · 替补建功',
    title: '有限出场时间里连续制造进球，教练开始重新评估你。',
    description: '你可以稳步扩大角色，也可以利用这次表现直接要求更多首发机会。',
    weight: 7,
    isEligible: (state) => {
      const latest = latestCompletedFirstTeamWindows(state, 1)[0]
      return Boolean(
        latest &&
          ['SUBSTITUTE', 'ROTATION'].includes(latest.role) &&
          latest.stats.appearances >= 5 &&
          latest.stats.starts < latest.stats.appearances &&
          latest.stats.goals + latest.stats.assists >= 2 &&
          latest.stats.averageRating >= 6.8,
      )
    },
    setup: {
      prompt: '你准备先通过哪种方式表达诉求？',
      options: [
        {
          id: 'PRIVATE',
          title: '先与教练私下沟通',
          description: '把近期贡献放进球队内部讨论。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'PUBLIC',
          title: '先回应外界关注',
          description: '让球迷和媒体知道你已经准备好。',
          choiceIds: ['B', 'C'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '继续接受替补任务',
        description: '先证明这种贡献可以持续。',
        effectPreview: '教练、队内关系稳定上升',
        outcomeSummary: '你没有急着改变身份，而是继续把替补时间踢出价值，教练对你的信任更加稳定。',
        playerDelta: { coachRelation: 5, squadRelation: 3, morale: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '私下争取更多首发',
        description: '用近期数据要求扩大比赛责任。',
        effectPreview: '60%获得积极回应 · 40%被要求继续等待',
        outcomeSummary: '你带着比赛数据与教练讨论了下一阶段角色。',
        playerDelta: { morale: 1 },
        outcomes: [
          {
            id: 'EXPAND',
            label: '角色得到扩大',
            weight: 60,
            summary: '教练认可你的替补效率，开始在更多比赛计划中考虑首发使用。',
            playerDelta: { coachRelation: 5, form: 5, reputation: 2 },
          },
          {
            id: 'WAIT',
            label: '仍需继续等待',
            weight: 40,
            summary: '教练肯定了贡献，却认为目前的替补角色仍最适合球队。',
            playerDelta: { coachRelation: 1, morale: -3, form: 1 },
          },
        ],
      },
      {
        id: 'C',
        title: '公开表达首发愿望',
        description: '让外界知道你已经准备好承担更多。',
        effectPreview: '35%形成舆论支持 · 65%被认为施压',
        outcomeSummary: '你把首发愿望带到了公开采访中。',
        playerDelta: { reputation: 3 },
        outcomes: [
          {
            id: 'SUPPORT',
            label: '球迷支持扩大角色',
            weight: 35,
            summary: '近期表现为发言提供了依据，球迷开始期待你获得更多首发。',
            playerDelta: { fanRelation: 5, mediaRelation: 3, morale: 4 },
          },
          {
            id: 'PRESSURE',
            label: '被认为向教练施压',
            weight: 65,
            summary: '公开表达让内部角色讨论变成新闻，教练不满你绕过了私下沟通。',
            playerDelta: { coachRelation: -5, squadRelation: -2, mediaRelation: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'FIRST_LEAGUE_TITLE_REACTION',
    groupId: 'FIRST_LEAGUE_TITLE',
    category: 'MILESTONE',
    priority: 'P2',
    cooldownWindows: 53,
    interactionKind: 'RANKING',
    eyebrow: '荣誉 · 首次联赛夺冠',
    title: '你的第一座联赛冠军已经写入荣誉室。',
    description: '庆祝、感谢和重新设定目标都很重要，你要决定这三件事的先后。',
    weight: 7,
    isEligible: (state) =>
      hasCareerHonor(state, ['LEAGUE_TITLE']) &&
      !hasCareerEvent(state, 'FIRST_LEAGUE_TITLE_REACTION'),
    choices: [
      {
        id: 'A',
        title: '球队庆祝 ＞ 感谢 ＞ 新目标',
        description: '先完整享受共同赢得的冠军。',
        effectPreview: '队内、球迷与心理状态上升',
        outcomeSummary: '你把自己完全放进球队庆祝中，这座冠军因此首先成为一段共同记忆。',
        playerDelta: { squadRelation: 6, fanRelation: 5, morale: 6 },
        storyEffect: { publicPersona: 'TEAM_FIRST' },
      },
      {
        id: 'B',
        title: '感谢 ＞ 球队庆祝 ＞ 新目标',
        description: '先向教练、队友和家人表达感谢。',
        effectPreview: '教练、队内与公众关系上升',
        outcomeSummary: '你先感谢所有帮助过自己的人，冠军采访因此没有变成个人表功。',
        playerDelta: { coachRelation: 4, squadRelation: 4, mediaRelation: 3, fanRelation: 3 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '新目标 ＞ 庆祝 ＞ 感谢',
        description: '立即把注意力转向更高舞台。',
        effectPreview: '竞技、知名度上升 · 队友略感扫兴',
        outcomeSummary: '你在冠军之夜就谈到下一座奖杯，进取心赢得关注，也让部分队友觉得庆祝被匆忙跳过。',
        playerDelta: { form: 4, reputation: 4, squadRelation: -2, morale: 2 },
        storyEffect: { tendencyDelta: { leadership: 1 } },
      },
    ],
  },
  {
    id: 'FIRST_CUP_TITLE_REACTION',
    groupId: 'FIRST_CUP_TITLE',
    category: 'MILESTONE',
    priority: 'P2',
    cooldownWindows: 53,
    interactionKind: 'CHOICE',
    eyebrow: '荣誉 · 首次杯赛夺冠',
    title: '你第一次随队赢得了杯赛或洲际赛事冠军。',
    description: '淘汰赛冠军往往浓缩了许多关键时刻，你可以决定如何理解自己的贡献。',
    weight: 7,
    isEligible: (state) =>
      hasCareerHonor(state, ['DOMESTIC_CUP', 'CONTINENTAL_TITLE']) &&
      !hasCareerEvent(state, 'FIRST_CUP_TITLE_REACTION'),
    choices: [
      {
        id: 'A',
        title: '复盘关键比赛',
        description: '把冠军过程转化为大赛经验。',
        effectPreview: '心理能力、大赛倾向上升',
        outcomeSummary: '你重新看完淘汰赛的关键片段，冠军带来的不只是奖牌，还有处理压力的经验。',
        playerDelta: { attributes: { mental: 0.7 }, morale: 3 },
        storyEffect: { tendencyDelta: { clutch: 1, professionalism: 1 } },
      },
      {
        id: 'B',
        title: '与球迷共享奖杯',
        description: '参加完整的公开庆祝活动。',
        effectPreview: '球迷关系、知名度明显上升',
        outcomeSummary: '你把奖杯带到球迷面前，这段庆祝成为了彼此长期记住的画面。',
        playerDelta: { fanRelation: 7, reputation: 5, fitness: -2 },
      },
      {
        id: 'C',
        title: '安静陪伴替补队友',
        description: '关注那些贡献不容易被看见的人。',
        effectPreview: '队内关系、领导倾向明显上升',
        outcomeSummary: '你在庆祝中照顾到出场较少的队友，更衣室记住了这份体谅。',
        playerDelta: { squadRelation: 7, coachRelation: 2, morale: 3 },
        storyEffect: { tendencyDelta: { leadership: 1, diplomacy: 1 } },
      },
    ],
  },
  {
    id: 'FINAL_DEFEAT_RESPONSE',
    groupId: 'SEASON_FINAL_RESULT',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'DIALOGUE',
    eyebrow: '赛季 · 决赛失利',
    title: '球队在决赛中失利，赛季以距离奖杯一步之遥结束。',
    description: '失望是真实的，但你仍要决定先面对队友还是公众，再选择具体表达。',
    weight: 7,
    isEligible: (state) =>
      state.lastReport?.clubSeason?.domesticCupStage === 'RUNNER_UP' ||
      state.lastReport?.clubSeason?.continentalStage === 'RUNNER_UP',
    setup: {
      prompt: '你准备先面对谁？',
      options: [
        {
          id: 'TEAM',
          title: '先回到更衣室',
          description: '把注意力留给共同经历失利的队友。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'PUBLIC',
          title: '先面对球迷和媒体',
          description: '不让球队在失利后失去公开回应。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '承担失利责任',
        description: '先说自己可以做得更好。',
        effectPreview: '队内、领导倾向上升 · 心理承压',
        outcomeSummary: '你没有把责任推给任何人，更衣室因此更容易从相互指责中走出来。',
        playerDelta: { squadRelation: 6, morale: -3, reputation: 2 },
        storyEffect: { tendencyDelta: { leadership: 1 } },
      },
      {
        id: 'B',
        title: '让大家先停止复盘',
        description: '情绪最重的时候不急着寻找罪人。',
        effectPreview: '心理、队内关系稳定恢复',
        outcomeSummary: '你提议暂时停止争论，让所有人先从决赛情绪中恢复，再做完整复盘。',
        playerDelta: { morale: 5, squadRelation: 4, fitness: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '向球迷公开致歉',
        description: '承认结果令人失望，不寻找借口。',
        effectPreview: '球迷、媒体关系上升',
        outcomeSummary: '你的回应直接而克制，失望没有消失，但球迷认可球队没有逃避。',
        playerDelta: { fanRelation: 6, mediaRelation: 3, morale: -1 },
      },
      {
        id: 'D',
        title: '强调球队值得骄傲',
        description: '保护整个赛季的努力不被一场比赛抹掉。',
        effectPreview: '50%鼓舞球队 · 50%被批回避失败',
        outcomeSummary: '你在采访中强调球队走到决赛已经证明了价值。',
        playerDelta: { squadRelation: 2 },
        outcomes: [
          {
            id: 'INSPIRE',
            label: '表达鼓舞了球队',
            weight: 50,
            summary: '队友和球迷理解了你的本意，整个赛季没有被最后一场完全否定。',
            playerDelta: { morale: 5, squadRelation: 4, fanRelation: 3 },
          },
          {
            id: 'AVOID',
            label: '被批评回避失败',
            weight: 50,
            summary: '部分媒体认为你淡化了决赛结果，公开讨论继续围绕责任展开。',
            playerDelta: { mediaRelation: -4, fanRelation: -2, morale: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'INDIVIDUAL_AWARD_REACTION',
    groupId: 'SEASON_INDIVIDUAL_AWARD',
    category: 'MEDIA',
    priority: 'P2',
    cooldownWindows: 4,
    interactionKind: 'PERSON_TONE',
    eyebrow: '荣誉 · 个人奖项',
    title: '赛季个人奖项公布，你的名字出现在获奖名单中。',
    description: '关注集中到你身上，你要先确定感谢对象，再选择表达方式。',
    weight: 7,
    isEligible: (state) =>
      Boolean(
        state.lastReport?.honors?.some(
          (honor) => honor.scope === 'INDIVIDUAL',
        ),
      ),
    setup: {
      prompt: '你希望先感谢谁？',
      options: [
        {
          id: 'TEAM',
          title: '先感谢球队',
          description: '强调奖项来自共同创造的环境。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'SELF',
          title: '先谈个人付出',
          description: '诚实说明自己为此做出的努力。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '把奖项归于全队',
        description: '不突出自己的决定性作用。',
        effectPreview: '队内、球迷关系明显上升',
        outcomeSummary: '你把个人奖项称为团队工作的结果，队友愿意共同分享这份荣誉。',
        playerDelta: { squadRelation: 6, fanRelation: 4, reputation: 3 },
        storyEffect: { publicPersona: 'TEAM_FIRST' },
      },
      {
        id: 'B',
        title: '逐一感谢关键队友',
        description: '具体说出帮助过你的人。',
        effectPreview: '队内、媒体与外交倾向上升',
        outcomeSummary: '具体而真实的感谢让颁奖采访更有内容，也避免了空泛的客套。',
        playerDelta: { squadRelation: 5, mediaRelation: 4, reputation: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '坦率谈论长期努力',
        description: '承认自己确实为奖项付出了很多。',
        effectPreview: '知名度、心理状态上升',
        outcomeSummary: '你没有假装奖项毫无意义，而是坦率谈到背后的训练和坚持。',
        playerDelta: { reputation: 5, morale: 5, mediaRelation: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'D',
        title: '宣布追逐更高奖项',
        description: '把这次获奖定义为下一阶段起点。',
        effectPreview: '45%强化巨星形象 · 55%被批过度自信',
        outcomeSummary: '你在领奖时公开谈到下一个更高目标。',
        playerDelta: { reputation: 4 },
        outcomes: [
          {
            id: 'STAR',
            label: '巨星形象得到强化',
            weight: 45,
            summary: '自信表达与赛季表现相互支撑，外界开始用更高标准看待你。',
            playerDelta: { fanRelation: 5, mediaRelation: 4, morale: 4 },
            storyEffect: { publicPersona: 'OUTSPOKEN' },
          },
          {
            id: 'ARROGANT',
            label: '被批评过度自信',
            weight: 55,
            summary: '部分评论认为你还没有资格提前谈论更高荣誉，领奖后的争议超过了奖项本身。',
            playerDelta: { mediaRelation: -4, squadRelation: -2, morale: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'STRONG_SEASON_WITHOUT_TROPHY',
    groupId: 'SEASON_REVIEW',
    category: 'MATCH',
    priority: 'P3',
    cooldownWindows: 4,
    interactionKind: 'RANKING',
    eyebrow: '赛季 · 高水平无冠',
    title: '个人表现出色，但球队赛季结束时没有赢得冠军。',
    description: '你要在个人进步、球队差距和未来目标之间排出复盘顺序。',
    weight: 7,
    isEligible: (state) => {
      const report = state.lastReport
      const collectiveHonor = report?.honors?.some(
        (honor) => honor.scope !== 'INDIVIDUAL',
      )
      return Boolean(
        report?.clubSeason &&
          report.stats.appearances >= 10 &&
          report.stats.averageRating >= 7.2 &&
          !collectiveHonor,
      )
    },
    choices: [
      {
        id: 'A',
        title: '球队差距 ＞ 个人进步 ＞ 未来',
        description: '先研究为什么好表现没有变成奖杯。',
        effectPreview: '心理能力、教练关系上升',
        outcomeSummary: '你从球队整体差距开始复盘，个人数据被放回了更完整的比赛背景。',
        playerDelta: { attributes: { mental: 0.5 }, coachRelation: 4, morale: 1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '个人进步 ＞ 未来 ＞ 球队差距',
        description: '先确认这个赛季建立了什么能力。',
        effectPreview: '竞技、心理状态上升',
        outcomeSummary: '你承认赛季没有奖杯，也没有否定真实进步，下一阶段目标因此更加稳定。',
        playerDelta: { form: 4, morale: 5, reputation: 2 },
      },
      {
        id: 'C',
        title: '未来 ＞ 球队差距 ＞ 个人进步',
        description: '立即判断当前平台能否满足目标。',
        effectPreview: '经纪人、进取倾向上升 · 归属感下降',
        outcomeSummary: '你开始认真评估下一阶段平台，职业目标变得更清晰，俱乐部归属感却有所减弱。',
        playerDelta: { agentRelation: 4, clubAttachment: -3, reputation: 2 },
      },
    ],
  },
  {
    id: 'FIRST_TEAM_100_APPEARANCES',
    groupId: 'CAREER_APPEARANCE_MILESTONE',
    category: 'MILESTONE',
    priority: 'P2',
    cooldownWindows: 53,
    interactionKind: 'CHOICE',
    eyebrow: '里程碑 · 一线队百场',
    title: '你已经完成职业生涯第100次一线队出场。',
    description: '从首秀到百场，稳定本身已经成为一种职业能力。',
    weight: 7,
    isEligible: (state) =>
      firstTeamCareerTotals(state).appearances >= 100 &&
      !hasCareerEvent(state, 'FIRST_TEAM_100_APPEARANCES'),
    choices: [
      {
        id: 'A',
        title: '整理百场比赛档案',
        description: '回看角色和比赛方式的变化。',
        effectPreview: '心理能力、职业倾向上升',
        outcomeSummary: '你没有只挑选高光时刻，而是看见了自己如何从每一种角色中成长。',
        playerDelta: { attributes: { mental: 0.6 }, morale: 4 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '邀请队友共同纪念',
        description: '让百场不只是个人数字。',
        effectPreview: '队内、球迷关系明显上升',
        outcomeSummary: '百场纪念变成了球队共同参与的小型仪式，这个数字因此更有温度。',
        playerDelta: { squadRelation: 6, fanRelation: 5, morale: 4 },
        storyEffect: { publicPersona: 'TEAM_FIRST' },
      },
      {
        id: 'C',
        title: '把纪念留到退役后',
        description: '现在仍然只专注下一场比赛。',
        effectPreview: '竞技、教练关系上升',
        outcomeSummary: '你没有安排额外庆祝，百场只在更衣室短暂停留，随后注意力回到了下一场。',
        playerDelta: { form: 4, coachRelation: 3, morale: 2 },
      },
    ],
  },
  {
    id: 'LONG_SERVICE_RECOGNITION',
    groupId: 'CLUB_LONG_SERVICE',
    category: 'MILESTONE',
    priority: 'P3',
    cooldownWindows: 16,
    interactionKind: 'ALLOCATION',
    eyebrow: '里程碑 · 长期效力',
    title: '俱乐部准备为你的长期效力安排一次纪念活动。',
    description: '活动时间有限，你可以把重点留给球迷、青训球员或昔日队友。',
    weight: 7,
    isEligible: (state) =>
      currentClubTenureWindows(state) >= 16 &&
      Boolean(state.player) &&
      state.player!.clubAttachment >= 60,
    choices: [
      {
        id: 'A',
        title: '球迷60% · 青训25% · 故人15%',
        description: '把活动重点留给长期支持球队的人。',
        effectPreview: '球迷、俱乐部归属感明显上升',
        outcomeSummary: '你花最多时间与球迷交流，长期效力因此与看台记忆紧密联系在一起。',
        playerDelta: { fanRelation: 7, clubAttachment: 6, reputation: 3 },
      },
      {
        id: 'B',
        title: '青训50% · 球迷30% · 故人20%',
        description: '把经历分享给正在起步的年轻球员。',
        effectPreview: '队内、领导倾向明显上升',
        outcomeSummary: '你把纪念日的大部分时间留给青训球员，长期效力转化成了可以传递的经验。',
        playerDelta: { squadRelation: 6, coachRelation: 3, reputation: 2 },
        storyEffect: { tendencyDelta: { leadership: 1 } },
      },
      {
        id: 'C',
        title: '故人45% · 球迷35% · 青训20%',
        description: '邀请多位昔日队友回到俱乐部。',
        effectPreview: '心理、媒体与球迷关系上升',
        outcomeSummary: '旧队友的到来让纪念活动拥有完整时间线，也让你重新看见共同走过的阶段。',
        playerDelta: { morale: 6, mediaRelation: 4, fanRelation: 4 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
    ],
  },
  {
    id: 'RETURN_TO_FORMER_CLUB',
    groupId: 'CLUB_RETURN',
    category: 'MILESTONE',
    priority: 'P1',
    cooldownWindows: 12,
    interactionKind: 'DIALOGUE',
    eyebrow: '里程碑 · 重返旧主',
    title: '转会完成后，你重新走进了曾经熟悉的俱乐部。',
    description: '过去的关系和现在的角色并不相同，你要先决定如何面对这次回归。',
    weight: 7,
    isEligible: (state) => isReturnTransfer(state),
    setup: {
      prompt: '你希望回归首先意味着什么？',
      options: [
        {
          id: 'PAST',
          title: '先回应过去',
          description: '承认离开、成长和重逢的完整经历。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'PRESENT',
          title: '先面对现在',
          description: '不依靠旧关系，重新争取位置。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '公开感谢俱乐部接纳',
        description: '承认过去的联系仍然重要。',
        effectPreview: '球迷、归属感明显上升',
        outcomeSummary: '你没有回避这段共同历史，回归发布因此迅速恢复了与球迷的情感联系。',
        playerDelta: { fanRelation: 7, clubAttachment: 7, morale: 4 },
      },
      {
        id: 'B',
        title: '先联系昔日队友',
        description: '从仍在队中的熟人重新进入更衣室。',
        effectPreview: '队内、外交倾向上升',
        outcomeSummary: '旧关系帮助你理解球队已经发生的变化，回归没有停留在怀旧中。',
        playerDelta: { squadRelation: 6, coachRelation: 2, morale: 3 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '把自己当作全新球员',
        description: '不要求任何基于旧履历的优待。',
        effectPreview: '教练、职业倾向上升',
        outcomeSummary: '你从第一次训练开始重新证明自己，教练认可这种不依赖旧声望的态度。',
        playerDelta: { coachRelation: 5, form: 3, morale: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'D',
        title: '提出承担更高责任',
        description: '希望把外面的成长带回球队。',
        effectPreview: '50%赢得信任 · 50%被要求先证明',
        outcomeSummary: '你明确表示这次回来不是重复过去，而是准备承担更高责任。',
        playerDelta: { reputation: 2 },
        outcomes: [
          {
            id: 'TRUST',
            label: '成长得到认可',
            weight: 50,
            summary: '俱乐部认可你在外积累的经验，愿意让你参与更多球队事务。',
            playerDelta: { coachRelation: 5, squadRelation: 4, morale: 4 },
            storyEffect: { tendencyDelta: { leadership: 1 } },
          },
          {
            id: 'PROVE',
            label: '被要求重新证明',
            weight: 50,
            summary: '回归带来的情感欢迎没有转化成角色承诺，你仍要从比赛表现开始。',
            playerDelta: { coachRelation: 1, morale: -2, form: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'LONG_SERVICE_FAREWELL',
    groupId: 'CLUB_FAREWELL',
    category: 'MILESTONE',
    priority: 'P1',
    cooldownWindows: 10,
    interactionKind: 'PERSON_TONE',
    eyebrow: '里程碑 · 告别旧主',
    title: '长期效力之后，你需要正式告别上一家俱乐部。',
    description: '转会已经完成，你可以先决定告别对象，再选择表达方式。',
    weight: 7,
    isEligible: (state) =>
      state.transferDecision?.kind === 'TRANSFER' &&
      !isReturnTransfer(state) &&
      departedClubTenureWindows(state) >= 10,
    setup: {
      prompt: '你准备先向谁告别？',
      options: [
        {
          id: 'FANS',
          title: '先向球迷告别',
          description: '回应长期支持和共同记忆。',
          choiceIds: ['A', 'B'],
        },
        {
          id: 'CLUB',
          title: '先向俱乐部内部告别',
          description: '把话留给教练、队友和工作人员。',
          choiceIds: ['C', 'D'],
        },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '发布完整告别信',
        description: '认真回顾共同经历，不回避离开。',
        effectPreview: '球迷、媒体关系明显上升',
        outcomeSummary: '告别信具体而克制，球迷虽然遗憾，仍愿意把这段效力视作共同的好时光。',
        playerDelta: { fanRelation: 7, mediaRelation: 4, morale: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'B',
        title: '只发布简短感谢',
        description: '不解释转会细节，保留私人边界。',
        effectPreview: '风险较低 · 关系基本稳定',
        outcomeSummary: '你没有把转会过程公开化，告别不算轰动，也没有制造新的冲突。',
        playerDelta: { fanRelation: 2, mediaRelation: 1, morale: 2 },
      },
      {
        id: 'C',
        title: '逐一感谢队友和员工',
        description: '把最重要的话留在俱乐部内部。',
        effectPreview: '队内、心理与职业倾向上升',
        outcomeSummary: '你认真完成了每一次私人告别，离开没有切断长期建立的关系。',
        playerDelta: { squadRelation: 6, morale: 5, reputation: 1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'D',
        title: '坦率说明离开原因',
        description: '希望外界理解这次职业选择。',
        effectPreview: '40%获得理解 · 60%引发旧账讨论',
        outcomeSummary: '你在告别时谈到了决定离开的真实原因。',
        playerDelta: { reputation: 2 },
        outcomes: [
          {
            id: 'UNDERSTOOD',
            label: '选择得到理解',
            weight: 40,
            summary: '坦率说明没有攻击任何人，球迷理解职业生涯需要新的方向。',
            playerDelta: { fanRelation: 5, mediaRelation: 3, morale: 4 },
          },
          {
            id: 'OLD_WOUNDS',
            label: '旧矛盾重新被讨论',
            weight: 60,
            summary: '部分表述被截取放大，告别迅速变成了对旧问题的追问。',
            playerDelta: { mediaRelation: -4, fanRelation: -3, morale: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'VETERAN_ROLE_ADJUSTMENT',
    groupId: 'VETERAN_ROLE',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'ALLOCATION',
    eyebrow: '生涯 · 老将角色',
    title: '进入生涯后期，教练希望重新分配你的比赛和恢复时间。',
    description: '你仍然能够贡献，但必须在出场数量、关键比赛和身体恢复之间做出取舍。',
    weight: 7,
    isEligible: (state) => {
      const role = latestActualFirstTeamRole(state)
      return Boolean(
        state.player &&
          playerAgeAtWindow(state.windowIndex) >= 32 &&
          role &&
          ['FRINGE', 'SUBSTITUTE', 'ROTATION'].includes(role) &&
          completedFirstTeamHistory(state).length > 0,
      )
    },
    choices: [
      {
        id: 'A',
        title: '出场55% · 恢复30% · 指导15%',
        description: '继续争取尽可能多的比赛时间。',
        effectPreview: '竞技、知名度上升 · 身体消耗增加',
        outcomeSummary: '你仍把比赛放在首位，出场竞争力得到保持，恢复空间却更加有限。',
        playerDelta: { form: 5, reputation: 2, fitness: -4 },
      },
      {
        id: 'B',
        title: '关键比赛40% · 恢复40% · 指导20%',
        description: '减少普通消耗，把状态留给重要场次。',
        effectPreview: '身体、心理与大赛倾向上升',
        outcomeSummary: '你接受了更有选择的使用方式，常规出场减少，但重要比赛的准备更加完整。',
        playerDelta: { fitness: 6, morale: 3, form: 2 },
        storyEffect: { tendencyDelta: { clutch: 1, professionalism: 1 } },
      },
      {
        id: 'C',
        title: '指导45% · 恢复35% · 出场20%',
        description: '逐步把更多价值转向经验传递。',
        effectPreview: '队内、教练与领导倾向上升',
        outcomeSummary: '你开始接受角色变化，比赛数量不再是唯一价值，年轻队友也更愿意听取建议。',
        playerDelta: { squadRelation: 7, coachRelation: 5, fitness: 3, morale: 2 },
        storyEffect: { club: { mentorship: 'MENTOR' }, tendencyDelta: { leadership: 1 } },
      },
    ],
  },
]

export function validateCareerEventDefinitions(
  definitions: readonly CareerEventDefinition[] = CAREER_EVENTS,
): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const declaredIds = new Set<string>(CAREER_EVENT_IDS)

  for (const event of definitions) {
    if (ids.has(event.id)) errors.push(`事件ID重复：${event.id}`)
    ids.add(event.id)
    if (!declaredIds.has(event.id)) errors.push(`事件ID未登记：${event.id}`)
    if (!event.groupId.trim()) errors.push(`事件缺少分组：${event.id}`)
    if (event.weight <= 0) errors.push(`事件权重无效：${event.id}`)
    if (event.cooldownWindows < 0) errors.push(`事件冷却无效：${event.id}`)
    if (event.choices.length < 2 || event.choices.length > 5) {
      errors.push(`事件选项数量必须为2至5：${event.id}`)
    }
    const choiceIds = new Set<string>()
    for (const choice of event.choices) {
      if (choiceIds.has(choice.id)) {
        errors.push(`事件选项ID重复：${event.id}/${choice.id}`)
      }
      choiceIds.add(choice.id)
      if (!choice.title.trim() || !choice.description.trim()) {
        errors.push(`事件选项文案不完整：${event.id}/${choice.id}`)
      }
      if (choice.outcomes?.some((outcome) => outcome.weight <= 0)) {
        errors.push(`事件随机结果权重无效：${event.id}/${choice.id}`)
      }
      if (
        event.category === 'HEALTH' &&
        (choice.delayed || choice.outcomes?.some((outcome) => outcome.delayed))
      ) {
        errors.push(`健康事件不得创建跨窗口后果：${event.id}/${choice.id}`)
      }
    }
    const protocol = interactionProtocolFor(event.interactionKind)
    if (protocol === 'MULTI_STAGE' && !event.setup) {
      errors.push(`多阶段事件缺少首阶段：${event.id}`)
    }
    if (event.setup) {
      if (event.setup.options.length < 2 || event.setup.options.length > 3) {
        errors.push(`事件首阶段选项数量必须为2至3：${event.id}`)
      }
      const setupIds = new Set<string>()
      const routedChoiceIds = new Set<string>()
      for (const option of event.setup.options) {
        if (setupIds.has(option.id)) {
          errors.push(`事件首阶段选项ID重复：${event.id}/${option.id}`)
        }
        setupIds.add(option.id)
        if (!option.title.trim() || !option.description.trim()) {
          errors.push(`事件首阶段文案不完整：${event.id}/${option.id}`)
        }
        if (option.choiceIds.length < 2 || option.choiceIds.length > 3) {
          errors.push(`事件路线必须包含2至3个最终选项：${event.id}/${option.id}`)
        }
        for (const choiceId of option.choiceIds) {
          routedChoiceIds.add(choiceId)
          if (!choiceIds.has(choiceId)) {
            errors.push(`事件路线指向未知选项：${event.id}/${option.id}/${choiceId}`)
          }
        }
      }
      for (const choiceId of choiceIds) {
        if (!routedChoiceIds.has(choiceId)) {
          errors.push(`事件最终选项未被路线覆盖：${event.id}/${choiceId}`)
        }
      }
    }
    if (
      event.choices.some((choice) => (choice.cashDeltaEuro ?? 0) < 0) &&
      !event.choices.some((choice) => (choice.cashDeltaEuro ?? 0) >= 0)
    ) {
      errors.push(`付费事件缺少免费选项：${event.id}`)
    }
    if (
      event.interactionKind === 'CHOICE' &&
      protocol !== 'SINGLE_STAGE'
    ) {
      errors.push(`普通选择事件协议错误：${event.id}`)
    }
  }

  for (const id of CAREER_EVENT_IDS) {
    if (!ids.has(id)) errors.push(`已登记事件缺少定义：${id}`)
  }
  return errors
}

const definitionErrors = validateCareerEventDefinitions()
if (definitionErrors.length > 0) {
  throw new Error(`特殊事件定义无效：${definitionErrors.join('；')}`)
}

const eventMap = new Map(CAREER_EVENTS.map((event) => [event.id, event]))

export function getCareerEvent(id: CareerEventId): CareerEventDefinition {
  const event = eventMap.get(id)
  if (!event) throw new Error(`Unknown career event: ${id}`)
  return event
}

export function careerEventIsOnCooldown(
  state: GameState,
  event: CareerEventDefinition,
): boolean {
  return state.careerEventHistory.some((entry) => {
    const previousEvent = getCareerEvent(entry.eventId)
    const isSameStoryGroup = previousEvent.groupId === event.groupId
    const isSameEvent = entry.eventId === event.id
    return (
      (isSameEvent || isSameStoryGroup) &&
      state.windowIndex - entry.windowIndex <= event.cooldownWindows
    )
  })
}

export function leastSeenCareerEventPool(
  state: GameState,
  eligible: readonly CareerEventDefinition[],
): readonly CareerEventDefinition[] {
  if (eligible.length === 0) return []
  const counts = new Map<CareerEventId, number>()
  for (const entry of state.careerEventHistory) {
    counts.set(entry.eventId, (counts.get(entry.eventId) ?? 0) + 1)
  }
  const minimum = Math.min(
    ...eligible.map((event) => counts.get(event.id) ?? 0),
  )
  return eligible.filter((event) => (counts.get(event.id) ?? 0) === minimum)
}

export function selectCareerEvent(state: GameState): CareerEventId | null {
  if (!state.player || state.windowIndex === 0) return null
  const lastTwoCategories = state.careerEventHistory
    .slice(-2)
    .map((entry) => getCareerEvent(entry.eventId).category)
  const blockedCategory =
    lastTwoCategories.length === 2 &&
    lastTwoCategories[0] === lastTwoCategories[1]
      ? lastTwoCategories[0]
      : null
  const baseEligible = CAREER_EVENTS.filter((event) => event.isEligible(state))
  const eligible = baseEligible.filter(
    (event) =>
      !careerEventIsOnCooldown(state, event) &&
      event.category !== blockedCategory,
  )
  if (eligible.length === 0) return null

  const lastWindow = state.careerEventHistory.at(-1)?.windowIndex ?? -99
  const guaranteed =
    state.windowIndex === 1 ||
    (Boolean(state.contract) && state.windowIndex === 4) ||
    state.windowIndex - lastWindow >= 3
  const random = createRandom(
    state.careerSeed,
    'career-event',
    state.windowIndex,
  )
  const triggerChance = state.transferDecision ? 0.5 : 0.7
  if (!guaranteed && random.next() > triggerChance) return null

  const balancedPool = leastSeenCareerEventPool(state, eligible)
  return weightedPick(
    random,
    balancedPool.map((event) => ({ value: event.id, weight: 1 })),
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
  const relationshipKeys = new Set<(typeof ratingKeys)[number]>([
    'coachRelation',
    'squadRelation',
    'agentRelation',
    'fanRelation',
    'mediaRelation',
  ])
  for (const key of ratingKeys) {
    const delta = requested[key]
    if (delta === undefined) continue
    const before = next[key]
    const minimum = delta < 0 && relationshipKeys.has(key) ? 35 : 0
    const after = roundTenth(clamp(before + delta, minimum))
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
  careerStory: GameState['careerStory']
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
  const storyEffect = combineStoryEffects(
    choice.storyEffect,
    outcome?.storyEffect,
  )
  const record: CareerEventRecord = {
    eventId,
    choiceId,
    windowIndex: state.windowIndex,
    choiceTitle: choice.title,
    outcomeSummary: outcome?.summary ?? choice.outcomeSummary,
    ...(outcome ? { outcomeLabel: outcome.label } : {}),
    appliedDelta: resolved.appliedDelta,
    cashDeltaEuro,
    ...(storyEffect ? { storyEffect } : {}),
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
    careerStory: applyCareerStoryEffect(
      ensureStoryClub(state.careerStory, state.selectedClubId),
      record.storyEffect,
    ),
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
