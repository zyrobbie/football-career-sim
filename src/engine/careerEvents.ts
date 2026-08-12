import type {
  CareerConsequence,
  CareerEventCategory,
  CareerEventChoiceId,
  CareerEventId,
  CareerEventRecord,
  CareerPriority,
  CareerStoryEffect,
  FirstTeamRole,
  GameState,
  HalfYearReport,
  Player,
  PlayerEventDelta,
} from '../models/game'
import { CLUBS } from '../data/balance'
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
  priorityOrder?: readonly CareerPriority[]
  isEligible?: (state: GameState) => boolean
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
  timing?: 'TRANSITION'
  transitionPriority?: number
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
  latestCurrentClubReport(state)?.stats.averageRating ?? 6.6

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
  const history = settledHistory(state)
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]
    if (!entry || entry.clubId !== state.selectedClubId) break
    if (entry.teamLevel === 'FIRST_TEAM' && entry.stats.appearances > 0) {
      windows += 1
    }
  }
  return windows
}

function settledHistory(state: GameState) {
  return state.history.filter((entry) => entry.windowIndex < state.windowIndex)
}

function latestSettledHistory(state: GameState) {
  const latest = settledHistory(state).at(-1) ?? null
  return latest?.windowIndex === state.windowIndex - 1 ? latest : null
}

function latestCurrentClubReport(state: GameState) {
  const latest = latestSettledHistory(state)
  const report = state.lastReport
  return latest && report && latest.clubId === state.selectedClubId &&
      (!report.clubId || report.clubId === latest.clubId)
    ? report
    : null
}

function hasCareerEvent(state: GameState, eventId: CareerEventId): boolean {
  return state.careerEventHistory.some((entry) => entry.eventId === eventId)
}

function hasPlayedForAnotherClub(state: GameState): boolean {
  return settledHistory(state).some(
    (entry) => entry.clubId !== state.selectedClubId,
  )
}

function completedFirstTeamHistory(state: GameState) {
  return settledHistory(state).filter(
    (entry) =>
      entry.windowIndex < state.windowIndex &&
      entry.teamLevel === 'FIRST_TEAM' &&
      entry.stats.appearances > 0,
  )
}

function latestCompletedFirstTeamWindows(
  state: GameState,
  count: number,
) {
  if (latestSettledHistory(state)?.clubId !== state.selectedClubId) return []
  return completedFirstTeamHistory(state)
    .filter((entry) => entry.clubId === state.selectedClubId)
    .slice(-count)
}

function currentClubTenureWindows(state: GameState): number {
  if (!state.selectedClubId) return 0
  let windows = 0
  const history = settledHistory(state)
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]
    if (!entry || entry.clubId !== state.selectedClubId) break
    windows += 1
  }
  return windows
}

function isReturnTransfer(state: GameState): boolean {
  const decision = state.transferDecision
  if (
    decision?.kind !== 'TRANSFER' ||
    decision.toClubId !== state.selectedClubId
  ) {
    return false
  }
  if (latestSettledHistory(state)?.clubId !== decision.fromClubId) return false
  return settledHistory(state).some(
    (entry) =>
      entry.windowIndex < state.windowIndex &&
      entry.clubId === decision.toClubId,
  )
}

function isFreshTransfer(state: GameState): boolean {
  const decision = state.transferDecision
  return Boolean(
    decision?.kind === 'TRANSFER' &&
      decision.toClubId === state.selectedClubId &&
      latestSettledHistory(state)?.clubId === decision.fromClubId,
  )
}

function departedClubTenureWindows(state: GameState): number {
  const decision = state.transferDecision
  if (decision?.kind !== 'TRANSFER') return 0
  return settledHistory(state).filter(
    (entry) => entry.clubId === decision.fromClubId,
  ).length
}

function latestNationalWindow(state: GameState) {
  return latestCurrentClubReport(state)?.nationalTeam ?? null
}

function currentClub(state: GameState) {
  return CLUBS.find((club) => club.id === state.selectedClubId) ?? null
}

function isAtOverseasClub(state: GameState): boolean {
  const club = currentClub(state)
  return Boolean(club && club.country !== '中国')
}

function firstTeamTransition(state: GameState) {
  const latest = latestSettledHistory(state)
  const previous = completedFirstTeamHistory(state).filter(
    (entry) => entry.windowIndex !== latest?.windowIndex,
  )
  const before = previous.reduce(
    (totals, entry) => ({
      appearances: totals.appearances + entry.stats.appearances,
      goals: totals.goals + entry.stats.goals,
      assists: totals.assists + entry.stats.assists,
    }),
    { appearances: 0, goals: 0, assists: 0 },
  )
  const latestStats =
    latest?.teamLevel === 'FIRST_TEAM' && latest.stats.appearances > 0
      ? latest.stats
      : null
  return {
    latest,
    latestStats,
    before,
    after: {
      appearances: before.appearances + (latestStats?.appearances ?? 0),
      goals: before.goals + (latestStats?.goals ?? 0),
      assists: before.assists + (latestStats?.assists ?? 0),
    },
  }
}

function firstTeamDebutThisWindow(state: GameState): boolean {
  const transition = firstTeamTransition(state)
  return Boolean(
    transition.latestStats &&
      transition.before.appearances === 0 &&
      transition.after.appearances > 0,
  )
}

function firstSeniorGoalThisWindow(state: GameState): boolean {
  const transition = firstTeamTransition(state)
  return Boolean(
    transition.latestStats &&
      transition.before.goals === 0 &&
      transition.latestStats.goals > 0,
  )
}

function firstHonorTransition(
  state: GameState,
  types: readonly string[],
): boolean {
  const latest = latestSettledHistory(state)
  if (!latest?.honors?.some((honor) => types.includes(honor.type))) return false
  return !settledHistory(state).some(
    (entry) =>
      entry.windowIndex !== latest.windowIndex &&
      entry.honors?.some((honor) => types.includes(honor.type)),
  )
}

function currentClubSettledWindows(state: GameState) {
  return settledHistory(state).filter(
    (entry) => entry.clubId === state.selectedClubId,
  )
}

function firstTeamRoleRank(role: GameState['firstTeamRole'] | null): number {
  return role ? FIRST_TEAM_ROLE_ORDER.indexOf(role) : -1
}

function latestCurrentClubRoleTransition(state: GameState) {
  const windows = currentClubSettledWindows(state)
  const latest = windows.at(-1) ?? null
  const previous = windows.at(-2) ?? null
  return {
    latest,
    previous,
    latestRank:
      latest?.teamLevel === 'FIRST_TEAM'
        ? firstTeamRoleRank(latest.role as GameState['firstTeamRole'])
        : -1,
    previousRank:
      previous?.teamLevel === 'FIRST_TEAM'
        ? firstTeamRoleRank(previous.role as GameState['firstTeamRole'])
        : -1,
  }
}

function isOverseasEliteClub(state: GameState): boolean {
  const club = currentClub(state)
  return Boolean(
    club && club.country !== '中国' && club.profile === 'ELITE' && club.tier <= 2,
  )
}

function latestNationalTransition(state: GameState) {
  const latest = latestNationalWindow(state)
  const before = state.nationalTeam.history
    .filter((entry) => entry.windowIndex < (latest?.windowIndex ?? -1))
    .reduce(
      (totals, entry) => ({
        caps: totals.caps + entry.appearances,
        goals: totals.goals + entry.goals,
      }),
      { caps: 0, goals: 0 },
    )
  return {
    latest,
    before,
    after: {
      caps: before.caps + (latest?.appearances ?? 0),
      goals: before.goals + (latest?.goals ?? 0),
    },
  }
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
        isEligible: (state) => !isAtOverseasClub(state),
      },
      {
        id: 'D',
        title: '公开谈论新的挑战',
        description: '表示未来愿意考虑新的联赛体验或更合适的竞技角色。',
        effectPreview: '心理、市场关注上升 · 现俱乐部关系下降',
        outcomeSummary:
          '你没有再谈留洋梦想，而是坦率表示愿意考虑新的联赛和竞技角色，市场关注升温，现俱乐部也开始重新判断你的长期态度。',
        playerDelta: { morale: 3, reputation: 3, agentRelation: 2, clubAttachment: -3, coachRelation: -2 },
        isEligible: isAtOverseasClub,
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
            (latestCurrentClubReport(state)?.stats.appearances ?? 0) >= 12),
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
          (latestCurrentClubReport(state)?.stats.appearances ?? 0) > 0,
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
    timing: 'TRANSITION',
    transitionPriority: 60,
    isEligible: (state) =>
      firstTeamDebutThisWindow(state) && !firstSeniorGoalThisWindow(state),
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
    timing: 'TRANSITION',
    transitionPriority: 65,
    isEligible: firstSeniorGoalThisWindow,
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
    timing: 'TRANSITION',
    isEligible: (state) => firstHonorTransition(state, ['LEAGUE_TITLE']),
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
    timing: 'TRANSITION',
    isEligible: (state) =>
      firstHonorTransition(state, ['DOMESTIC_CUP', 'CONTINENTAL_TITLE']),
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
      latestCurrentClubReport(state)?.clubSeason?.domesticCupStage === 'RUNNER_UP' ||
      latestCurrentClubReport(state)?.clubSeason?.continentalStage === 'RUNNER_UP',
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
        latestCurrentClubReport(state)?.honors?.some(
          (honor) =>
            honor.scope === 'INDIVIDUAL' && honor.type !== 'BALLON_DOR',
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
      const report = latestCurrentClubReport(state)
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
    timing: 'TRANSITION',
    isEligible: (state) => {
      const transition = firstTeamTransition(state)
      return Boolean(
        transition.latestStats &&
          transition.before.appearances < 100 &&
          transition.after.appearances >= 100,
      )
    },
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
      isFreshTransfer(state) &&
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
  {
    id: 'DRESSING_ROOM_DEFEAT_REVIEW',
    groupId: 'DRESSING_ROOM_REVIEW',
    category: 'TEAM',
    priority: 'P3',
    cooldownWindows: 4,
    interactionKind: 'DIALOGUE',
    eyebrow: '队内 · 赛后复盘',
    title: '一次糟糕表现后，更衣室需要有人先把话说清楚。',
    description: '教练没有点名批评任何人，但沉默正在把一次失利变成更长的压力。',
    weight: 10,
    isEligible: (state) => Boolean(
      state.player &&
      latestActualTeamLevel(state) === 'FIRST_TEAM' &&
      (latestCurrentClubReport(state)?.stats.appearances ?? 0) >= 5 &&
      latestRating(state) <= 6.9,
    ),
    setup: {
      prompt: '你准备先从哪一层问题谈起？',
      options: [
        { id: 'SELF', title: '先谈自己的责任', description: '用个人态度打开复盘。', choiceIds: ['A', 'B'] },
        { id: 'TEAM', title: '先谈全队的下一步', description: '避免把问题变成相互指责。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '主动承担表现责任',
        description: '承认自己没有达到要求，但不替所有问题背锅。',
        effectPreview: '教练、队内关系上升 · 心理压力增加',
        outcomeSummary: '你的坦率让复盘有了起点，队友愿意继续讨论问题，压力也暂时集中到了你身上。',
        playerDelta: { coachRelation: 5, squadRelation: 4, morale: -2 },
        delayed: { delayWindows: 1, playerDelta: { form: 3, morale: 2 }, summary: '承担责任后的训练回应得到认可，你重新找回了比赛节奏。' },
        storyEffect: { tendencyDelta: { leadership: 1, professionalism: 1 } },
      },
      {
        id: 'B',
        title: '把讨论拉回具体问题',
        description: '只谈跑位、沟通和下一场安排。',
        effectPreview: '教练、竞技与职业倾向稳定上升',
        outcomeSummary: '讨论没有继续滑向情绪对抗，几项具体问题被写进了下一周训练。',
        playerDelta: { coachRelation: 3, squadRelation: 2, form: 2 },
        trainingBonus: 1,
        storyEffect: { tendencyDelta: { professionalism: 1, diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '保护被集中批评的队友',
        description: '提醒大家失利不该由一个人承担。',
        effectPreview: '队内、心理上升 · 教练关系小幅承压',
        outcomeSummary: '你阻止了更衣室寻找替罪羊，队友记住了这份支持，教练则希望你别回避竞技问题。',
        playerDelta: { squadRelation: 6, morale: 3, coachRelation: -2 },
        storyEffect: { tendencyDelta: { diplomacy: 1, leadership: 1 } },
      },
    ],
  },
  {
    id: 'PLAYER_COUNCIL_VOTE',
    groupId: 'PLAYER_COUNCIL',
    category: 'TEAM',
    priority: 'P2',
    cooldownWindows: 20,
    interactionKind: 'RISK',
    eyebrow: '队内 · 球员委员会',
    title: '更衣室准备推选新的球员委员会成员。',
    description: '这不是队长袖标，但入选者需要代表队友与教练组沟通日常问题。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      playerAgeAtWindow(state.windowIndex) >= 21 &&
      hasFirstTeamRole(state, 'STARTER') &&
      currentClubFirstTeamWindows(state) >= 4 &&
      state.player.squadRelation >= 58 &&
      state.careerStory.club.leadership === 'NONE' &&
      !hasCareerEvent(state, 'PLAYER_COUNCIL_VOTE'),
    ),
    setup: {
      prompt: '你愿意把自己放到这次推选中吗？',
      options: [
        { id: 'RUN', title: '主动接受推选', description: '承担落选和额外责任。', choiceIds: ['A', 'B'] },
        { id: 'QUIET', title: '保持低调参与', description: '不把委员会当作个人地位。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '认真说明参选理由',
        description: '承诺只处理具体问题，不把委员会变成个人舞台。',
        effectPreview: '65%成功入选 · 35%暂未当选',
        outcomeSummary: '你正式参加了球员委员会推选。',
        playerDelta: { reputation: 1 },
        outcomes: [
          { id: 'ELECTED', label: '成功入选', weight: 65, summary: '队友认可你的稳定和沟通方式，你成为球员委员会的一员。', playerDelta: { squadRelation: 6, coachRelation: 4, morale: 4 }, storyEffect: { club: { leadership: 'CANDIDATE' }, tendencyDelta: { leadership: 1, diplomacy: 1 } } },
          { id: 'NOT_ELECTED', label: '暂未当选', weight: 35, summary: '资历更深的队友获得席位，你的态度仍然得到尊重。', playerDelta: { squadRelation: 2, morale: -1 }, storyEffect: { tendencyDelta: { professionalism: 1 } } },
        ],
      },
      {
        id: 'B',
        title: '接受提名但不拉票',
        description: '让长期相处自然决定结果。',
        effectPreview: '队内、职业倾向稳定上升',
        outcomeSummary: '你没有把推选变成竞争，队友对你的分寸感评价不错。',
        playerDelta: { squadRelation: 4, coachRelation: 2, morale: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1, professionalism: 1 } },
      },
      {
        id: 'C',
        title: '推荐更合适的资深队友',
        description: '继续专注比赛，需要时再提供帮助。',
        effectPreview: '队内、心理上升 · 暂不进入领导路线',
        outcomeSummary: '你把席位让给更有资历的队友，也明确表示愿意协助委员会工作。',
        playerDelta: { squadRelation: 5, morale: 3 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
    ],
  },
  {
    id: 'TEAMMATE_CONTRACT_TENSION',
    groupId: 'TEAMMATE_CONTRACT',
    category: 'TEAM',
    priority: 'P3',
    cooldownWindows: 5,
    interactionKind: 'PERSON_TONE',
    eyebrow: '队内 · 合同风波',
    title: '一名队友的续约争议开始影响更衣室气氛。',
    description: '有人认为俱乐部不够尊重球员，也有人担心公开讨论会拖累比赛。',
    weight: 10,
    isEligible: (state) => Boolean(
      state.player &&
      playerAgeAtWindow(state.windowIndex) >= 18 &&
      latestActualTeamLevel(state) === 'FIRST_TEAM' &&
      state.contract &&
      state.player.squadRelation >= 45,
    ),
    setup: {
      prompt: '你准备先和谁沟通？',
      options: [
        { id: 'PLAYER', title: '先找当事队友', description: '了解真实诉求再判断。', choiceIds: ['A', 'B'] },
        { id: 'STAFF', title: '先找队长或教练', description: '先控制对全队的影响。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '私下支持队友表达诉求',
        description: '支持合理沟通，但劝他不要在比赛日前公开施压。',
        effectPreview: '队内关系上升 · 教练关系小幅下降',
        outcomeSummary: '队友感受到支持，也暂时停止了公开抱怨，教练组仍察觉你站得更靠近球员一边。',
        playerDelta: { squadRelation: 6, coachRelation: -2, morale: 2 },
        delayed: { delayWindows: 1, playerDelta: { squadRelation: 2 }, summary: '续约争议降温后，当事队友仍记得你当时的支持。' },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'B',
        title: '只帮助双方传递事实',
        description: '不评价合同对错，只减少误解。',
        effectPreview: '教练、队内和职业倾向上升',
        outcomeSummary: '几条被夸大的消息得到澄清，争议没有彻底消失，但不再控制更衣室。',
        playerDelta: { coachRelation: 3, squadRelation: 3, morale: 1 },
        storyEffect: { tendencyDelta: { diplomacy: 1, professionalism: 1 } },
      },
      {
        id: 'C',
        title: '要求所有人先专注比赛',
        description: '明确合同问题不应继续进入训练场。',
        effectPreview: '教练、竞技上升 · 队内关系承压',
        outcomeSummary: '训练秩序迅速恢复，但部分队友认为你忽略了球员真实处境。',
        playerDelta: { coachRelation: 5, form: 3, squadRelation: -3 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
    ],
  },
  {
    id: 'OVERSEAS_COMMUNICATION_PLAN',
    groupId: 'OVERSEAS_ADAPTATION',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 20,
    interactionKind: 'ALLOCATION',
    eyebrow: '留洋 · 沟通适应',
    title: '海外生活已经开始，但语言和战术术语仍会拖慢反应。',
    description: '额外时间有限，你需要决定先解决生活沟通、战术理解，还是训练场默契。',
    weight: 9,
    isEligible: (state) => Boolean(
      state.player &&
      isAtOverseasClub(state) &&
      currentClubTenureWindows(state) >= 1 &&
      currentClubTenureWindows(state) <= 4 &&
      !hasCareerEvent(state, 'OVERSEAS_COMMUNICATION_PLAN'),
    ),
    choices: [
      {
        id: 'A',
        title: '语言50% · 战术30% · 训练20%',
        description: '先让日常交流和更衣室沟通顺畅起来。',
        effectPreview: '队内、心理与融入明显上升',
        outcomeSummary: '你投入时间学习当地语言，生活压力下降，队友也更愿意主动与你交流。',
        playerDelta: { squadRelation: 7, morale: 5, coachRelation: 2, clubAttachment: 3 },
        storyEffect: { tendencyDelta: { diplomacy: 1, professionalism: 1 } },
      },
      {
        id: 'B',
        title: '战术50% · 语言30% · 训练20%',
        description: '优先掌握教练组最常用的指令和录像语言。',
        effectPreview: '教练、竞技与训练收益上升',
        outcomeSummary: '你暂时还不能轻松聊天，但已经很少因为指令理解错误错过跑位。',
        playerDelta: { coachRelation: 6, form: 4, morale: 2 },
        trainingBonus: 1,
      },
      {
        id: 'C',
        title: '训练45% · 战术35% · 语言20%',
        description: '先用球场表现建立最直接的信任。',
        effectPreview: '竞技、身体上升 · 融入速度较慢',
        outcomeSummary: '你把多数精力留给训练，用表现弥补交流不足，但生活适应仍需要时间。',
        playerDelta: { form: 5, fitness: 3, squadRelation: 1, morale: -1 },
        delayed: { delayWindows: 1, playerDelta: { squadRelation: -2, morale: -1 }, summary: '语言学习投入偏少，场外沟通仍偶尔让你感到疲惫。' },
      },
    ],
  },
  {
    id: 'EARLY_SUBSTITUTION_REACTION',
    groupId: 'MATCH_ROLE_REACTION',
    category: 'MATCH',
    priority: 'P3',
    cooldownWindows: 4,
    interactionKind: 'DIALOGUE',
    eyebrow: '比赛 · 提前换下',
    title: '一次首发只踢了半场，教练便示意你离场。',
    description: '你对换人理由并不清楚，镜头和替补席都在等待你的第一反应。',
    weight: 10,
    isEligible: (state) => Boolean(
      state.player &&
      latestActualTeamLevel(state) === 'FIRST_TEAM' &&
      (latestCurrentClubReport(state)?.stats.starts ?? 0) >= 3 &&
      latestRating(state) <= 6.9,
    ),
    setup: {
      prompt: '你准备什么时候处理这次换人？',
      options: [
        { id: 'NOW', title: '先控制场边反应', description: '镜头仍在记录。', choiceIds: ['A', 'C'] },
        { id: 'LATER', title: '赛后再谈原因', description: '把比赛留给场上队友。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '坐下继续为球队助威',
        description: '不让失望演变成公开冲突。',
        effectPreview: '队内、教练关系上升 · 心理小幅下降',
        outcomeSummary: '你压下了即时情绪，替补席没有出现新的问题，失望只能留到赛后消化。',
        playerDelta: { squadRelation: 4, coachRelation: 3, morale: -2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '赛后要求具体解释',
        description: '请教练用录像说明换人原因。',
        effectPreview: '教练、竞技与训练收益上升',
        outcomeSummary: '谈话没有变成质问，教练指出了几个可以立即修正的问题。',
        playerDelta: { coachRelation: 4, form: 2, morale: 1 },
        trainingBonus: 1,
      },
      {
        id: 'C',
        title: '直接表达不满',
        description: '让教练知道你无法接受这种使用方式。',
        effectPreview: '45%获得解释 · 55%矛盾扩大',
        outcomeSummary: '你没有隐藏对换人的不满。',
        playerDelta: { morale: 2 },
        outcomes: [
          { id: 'CLEAR_TALK', label: '教练当场解释', weight: 45, summary: '教练理解你的竞争心，也把换人原因说得很清楚。', playerDelta: { coachRelation: 2, form: 2 } },
          { id: 'CONFLICT', label: '矛盾公开化', weight: 55, summary: '场边交流被镜头捕捉，赛后话题从比赛转向你和教练的关系。', playerDelta: { coachRelation: -5, mediaRelation: -3, squadRelation: -2 } },
        ],
      },
    ],
  },
  {
    id: 'TEMPORARY_TACTICAL_ROLE',
    groupId: 'COACH_ROLE_TRIAL',
    category: 'COACH',
    priority: 'P3',
    cooldownWindows: 5,
    interactionKind: 'DIALOGUE',
    eyebrow: '教练 · 临时职责',
    title: '教练想让你在接下来的比赛里临时承担陌生职责。',
    description: '这是短期战术安排，不会占用职业生涯唯一的新位置学习名额。',
    weight: 10,
    isEligible: (state) => Boolean(
      state.player &&
      hasFirstTeamRole(state, 'ROTATION') &&
      state.player.fitness >= 50,
    ),
    setup: {
      prompt: '你最想先问清哪一点？',
      options: [
        { id: 'TASK', title: '先问具体职责', description: '确认跑位和比赛任务。', choiceIds: ['A', 'B'] },
        { id: 'RISK', title: '先谈对原角色的影响', description: '避免临时安排变成长期错位。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '完整接受临时安排',
        description: '把战术适应当作扩大出场方式的机会。',
        effectPreview: '教练、竞技上升 · 身体消耗增加',
        outcomeSummary: '你认真完成了陌生职责，教练看到了更多使用方式，训练负荷也明显增加。',
        playerDelta: { coachRelation: 6, form: 3, fitness: -3 },
        trainingBonus: 1,
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '接受两场限定试用',
        description: '先用短期比赛检验是否真正合适。',
        effectPreview: '教练、心理稳定上升',
        outcomeSummary: '双方约定只先尝试两场，角色边界清楚，你也有空间判断这项安排。',
        playerDelta: { coachRelation: 4, morale: 3, form: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '坚持主要职责不变',
        description: '愿意应急，但不接受连续改变定位。',
        effectPreview: '心理、竞技上升 · 教练关系下降',
        outcomeSummary: '你清楚表达了职业判断，原有训练保持稳定，教练对你的适应意愿有所保留。',
        playerDelta: { morale: 4, form: 2, coachRelation: -3 },
      },
    ],
  },
  {
    id: 'PROTECT_LEAD_OR_CHASE_STATS',
    groupId: 'MATCH_DECISION',
    category: 'MATCH',
    priority: 'P3',
    cooldownWindows: 4,
    interactionKind: 'RISK',
    eyebrow: '比赛 · 临场选择',
    title: '球队领先进入最后阶段，你仍有机会继续制造个人数据。',
    description: '教练要求全队保持纪律，但场上空间也在不断出现。',
    weight: 11,
    isEligible: (state) => Boolean(
      state.player &&
      latestActualTeamLevel(state) === 'FIRST_TEAM' &&
      (latestCurrentClubReport(state)?.stats.appearances ?? 0) >= 6 &&
      ((latestCurrentClubReport(state)?.stats.goals ?? 0) +
        (latestCurrentClubReport(state)?.stats.assists ?? 0)) >= 2,
    ),
    setup: {
      prompt: '你准备把最后阶段的风险放在哪里？',
      options: [
        { id: 'TEAM', title: '先确保球队守住结果', description: '降低个人数据机会。', choiceIds: ['A', 'B'] },
        { id: 'SELF', title: '保留一次主动进攻', description: '承担失位风险。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '完全执行控场要求',
        description: '不再追求额外数据，优先保护球队结构。',
        effectPreview: '教练、队内与职业倾向上升',
        outcomeSummary: '你减少了无谓冒险，球队平稳结束比赛，教练和队友都看到了纪律性。',
        playerDelta: { coachRelation: 5, squadRelation: 4, form: 1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '只在明确机会时前插',
        description: '先保持位置，等真正安全的进攻窗口。',
        effectPreview: '竞技、教练关系平衡上升',
        outcomeSummary: '你没有放弃进攻判断，也没有破坏球队结构，比赛在可控范围内结束。',
        playerDelta: { form: 3, coachRelation: 3, morale: 2 },
        storyEffect: { tendencyDelta: { clutch: 1 } },
      },
      {
        id: 'C',
        title: '主动寻找下一次进攻',
        description: '尝试用个人贡献彻底结束比赛。',
        effectPreview: '40%锁定胜局 · 60%留下防守风险',
        outcomeSummary: '你选择继续向前寻找决定比赛的机会。',
        playerDelta: { morale: 1 },
        outcomes: [
          { id: 'DECISIVE', label: '制造制胜贡献', weight: 40, summary: '你的前插直接制造了进球，比赛就此失去悬念。', playerDelta: { form: 7, reputation: 4, fanRelation: 4, coachRelation: 2 }, storyEffect: { tendencyDelta: { clutch: 1 } } },
          { id: 'EXPOSED', label: '身后空间暴露', weight: 60, summary: '这次冒险没有形成进球，球队被迫在最后阶段承受反击压力。', playerDelta: { coachRelation: -5, squadRelation: -3, form: -2 } },
        ],
      },
    ],
  },
  {
    id: 'CONGESTED_SCHEDULE_PRIORITIES',
    groupId: 'SCHEDULE_MANAGEMENT',
    category: 'MATCH',
    priority: 'P3',
    cooldownWindows: 4,
    interactionKind: 'RANKING',
    eyebrow: '比赛 · 密集赛程',
    title: '连续比赛压缩了训练、恢复和个人准备的时间。',
    description: '体能团队让你明确接下来最重要的优先顺序。',
    weight: 11,
    isEligible: (state) => Boolean(
      state.player &&
      latestActualTeamLevel(state) === 'FIRST_TEAM' &&
      ((latestCurrentClubReport(state)?.stats.appearances ?? 0) >= 8 || state.player.fitness < 70),
    ),
    choices: [
      {
        id: 'A',
        title: '出场 ＞ 恢复 ＞ 训练',
        description: '尽量不缺席比赛，再管理身体消耗。',
        effectPreview: '竞技、知名度上升 · 身体下降',
        outcomeSummary: '你把比赛放在第一位，维持了连续出场，疲劳也在窗口末段逐渐积累。',
        playerDelta: { form: 5, reputation: 2, fitness: -5 },
      },
      {
        id: 'B',
        title: '恢复 ＞ 出场 ＞ 训练',
        description: '接受部分轮换，保证后续身体状态。',
        effectPreview: '身体、心理与教练关系上升',
        outcomeSummary: '你接受了计划性轮换，短期曝光减少，但身体和重要比赛准备更加稳定。',
        playerDelta: { fitness: 7, morale: 3, coachRelation: 3, form: -1 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'C',
        title: '训练 ＞ 恢复 ＞ 出场',
        description: '利用轮换期修正长期能力短板。',
        effectPreview: '训练收益明显上升 · 即时竞技下降',
        outcomeSummary: '你主动减少即时比赛负荷，把密集赛程变成了一段针对性训练期。',
        playerDelta: { fitness: 3, form: -3, morale: 2 },
        trainingBonus: 2,
      },
    ],
  },
  {
    id: 'FAN_EXPECTATION_SURGE',
    groupId: 'PUBLIC_EXPECTATION',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 5,
    interactionKind: 'CHOICE',
    eyebrow: '球迷 · 期待升温',
    title: '连续好表现后，球迷开始期待你承担更重要的责任。',
    description: '赞誉会带来动力，也可能把一段好状态迅速变成必须维持的标准。',
    weight: 11,
    isEligible: (state) => Boolean(
      state.player &&
      latestActualTeamLevel(state) === 'FIRST_TEAM' &&
      ((latestRating(state) >= 7.1) ||
        ((latestCurrentClubReport(state)?.stats.goals ?? 0) +
          (latestCurrentClubReport(state)?.stats.assists ?? 0)) >= 5),
    ),
    choices: [
      {
        id: 'A',
        title: '公开接受更高目标',
        description: '告诉球迷，你愿意承担更大的比赛责任。',
        effectPreview: '名气、球迷关系上升 · 心理压力增加',
        outcomeSummary: '你的表态进一步推高期待，球迷回应热烈，接下来的每场表现也会被更仔细审视。',
        playerDelta: { reputation: 5, fanRelation: 6, morale: -2 },
        delayed: { delayWindows: 1, playerDelta: { form: -2, morale: -1 }, summary: '持续升高的公众期待让普通表现也承受了额外审视。' },
      },
      {
        id: 'B',
        title: '强调稳定比口号重要',
        description: '接受赞誉，但不承诺具体数据和荣誉。',
        effectPreview: '球迷、竞技与职业倾向稳定上升',
        outcomeSummary: '你的回应没有制造新的口号，却让外界感受到清醒和专注。',
        playerDelta: { fanRelation: 4, form: 3, morale: 2 },
        storyEffect: { publicPersona: 'LOW_KEY', tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'C',
        title: '把关注留给全队',
        description: '强调好状态来自队友和球队体系。',
        effectPreview: '队内、球迷与团队形象上升',
        outcomeSummary: '队友欢迎你把聚光灯分给全队，球迷也接受了这份团队式回应。',
        playerDelta: { squadRelation: 5, fanRelation: 4, mediaRelation: 2 },
        storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1 } },
      },
    ],
  },
  {
    id: 'OLD_SOCIAL_POST_REVISITED',
    groupId: 'MEDIA_ARCHIVE',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 20,
    interactionKind: 'DIALOGUE',
    eyebrow: '媒体 · 旧内容',
    title: '一条少年时期的社交媒体内容突然重新受到关注。',
    description: '内容并不严重，但脱离原来语境后，正在被解释成你现在的态度。',
    weight: 10,
    isEligible: (state) => Boolean(
      state.player &&
      playerAgeAtWindow(state.windowIndex) >= 18 &&
      !hasCareerEvent(state, 'OLD_SOCIAL_POST_REVISITED'),
    ),
    setup: {
      prompt: '你准备先控制传播，还是先解释语境？',
      options: [
        { id: 'PRIVATE', title: '先交给俱乐部沟通', description: '降低即时热度。', choiceIds: ['A', 'B'] },
        { id: 'PUBLIC', title: '直接面对公众解释', description: '争取主动，也承担更多讨论。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '删除内容并简短说明',
        description: '承认少年时期表达不成熟，不继续争论。',
        effectPreview: '媒体关系上升 · 名气小幅下降',
        outcomeSummary: '说明没有继续放大争议，话题很快失去热度，你也接受了一点形象损耗。',
        playerDelta: { mediaRelation: 4, reputation: -1, morale: 2 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '保留原文并补充完整语境',
        description: '不假装过去不存在，但说明现在的真实立场。',
        effectPreview: '媒体、心理与坦率形象上升',
        outcomeSummary: '完整语境让多数讨论回到事实，你没有否认过去，也清楚说明了变化。',
        playerDelta: { mediaRelation: 3, morale: 4, reputation: 2 },
        storyEffect: { publicPersona: 'OUTSPOKEN', tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '发布视频正面回应',
        description: '直接说明观点，接受镜头和追问。',
        effectPreview: '45%赢得认可 · 55%延长争议',
        outcomeSummary: '你选择用自己的声音回应旧内容。',
        playerDelta: { reputation: 2 },
        outcomes: [
          { id: 'ACCEPTED', label: '回应得到认可', weight: 45, summary: '坦率回应没有回避问题，公众看到了你态度的变化。', playerDelta: { mediaRelation: 5, fanRelation: 4, morale: 4 } },
          { id: 'EXTENDED', label: '争议继续延长', weight: 55, summary: '更多采访只截取了最有冲突的部分，话题又持续了几天。', playerDelta: { mediaRelation: -4, morale: -3, form: -2 } },
        ],
      },
    ],
  },
  {
    id: 'TEAMMATE_RANKING_INTERVIEW',
    groupId: 'TEAMMATE_INTERVIEW',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 5,
    interactionKind: 'PERSON_TONE',
    eyebrow: '媒体 · 队友评价',
    title: '记者要求你公开选出队内表现最好的几名球员。',
    description: '任何具体排名都可能制造话题，完全回避也可能被认为缺少诚意。',
    weight: 11,
    isEligible: (state) => Boolean(
      state.player &&
      playerAgeAtWindow(state.windowIndex) >= 18 &&
      latestActualTeamLevel(state) === 'FIRST_TEAM' &&
      (latestCurrentClubReport(state)?.stats.appearances ?? 0) >= 5,
    ),
    setup: {
      prompt: '你准备先保护更衣室，还是先满足采访需求？',
      options: [
        { id: 'TEAM', title: '先保护队内关系', description: '避免公开制造高低之分。', choiceIds: ['A', 'B'] },
        { id: 'MEDIA', title: '先给出有效回答', description: '接受具体表态带来的风险。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '拒绝给队友排名',
        description: '只谈不同球员对球队的具体价值。',
        effectPreview: '队内、职业倾向上升 · 媒体关系小幅下降',
        outcomeSummary: '你没有给出记者想要的名单，却让每一类队友都感受到尊重。',
        playerDelta: { squadRelation: 6, mediaRelation: -2, morale: 2 },
        storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'B',
        title: '点出几名关键队友但不排序',
        description: '给出具体内容，同时避免比较高低。',
        effectPreview: '媒体、队内关系平衡上升',
        outcomeSummary: '采访有了可以使用的内容，被提到和未被提到的队友也没有产生明显不满。',
        playerDelta: { mediaRelation: 4, squadRelation: 3, reputation: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '坦率给出个人前三名',
        description: '用真实判断回应，不隐藏自己的标准。',
        effectPreview: '40%赢得坦率评价 · 60%引发队内议论',
        outcomeSummary: '你给出了清晰具体的队内排名。',
        playerDelta: { mediaRelation: 2 },
        outcomes: [
          { id: 'RESPECTED', label: '坦率得到尊重', weight: 40, summary: '你的理由具体且公平，队友把排名视为正常竞技评价。', playerDelta: { reputation: 4, squadRelation: 2, morale: 3 } },
          { id: 'DEBATE', label: '更衣室出现议论', weight: 60, summary: '名单之外的队友开始讨论你的标准，采访比预想更长久地留在更衣室里。', playerDelta: { squadRelation: -5, morale: -2, mediaRelation: 2 } },
        ],
      },
    ],
  },
  {
    id: 'SETTLE_IN_CURRENT_CITY',
    groupId: 'CAREER_SETTLEMENT',
    category: 'CONTRACT',
    priority: 'P3',
    cooldownWindows: 8,
    interactionKind: 'CHOICE',
    eyebrow: '生涯 · 城市归属',
    title: '家人问你，是否准备把当前城市当作长期生活的地方。',
    description: '答案不会直接决定转会，但会影响你面对下一份合同时的真实倾向。',
    weight: 10,
    isEligible: (state) => Boolean(
      state.player &&
      playerAgeAtWindow(state.windowIndex) >= 21 &&
      state.contract &&
      currentClubTenureWindows(state) >= 3,
    ),
    choices: [
      {
        id: 'A',
        title: '认真考虑长期留下',
        description: '把稳定生活和俱乐部归属放到更重要的位置。',
        effectPreview: '归属、心理与球迷关系上升',
        outcomeSummary: '你开始把这里视为职业之外的生活所在，留下不再只是合同问题。',
        playerDelta: { clubAttachment: 8, morale: 5, fanRelation: 4 },
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'B',
        title: '保持开放，不提前承诺',
        description: '享受当下生活，但不排除未来的新机会。',
        effectPreview: '心理、经纪人关系上升 · 归属小幅增加',
        outcomeSummary: '家人理解职业足球的不确定性，你既没有否定现在，也没有锁死未来。',
        playerDelta: { morale: 4, agentRelation: 3, clubAttachment: 2 },
        storyEffect: { tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '明确还想寻找新环境',
        description: '把更高平台或不同联赛继续放在前面。',
        effectPreview: '经纪人、动力上升 · 归属和球迷关系下降',
        outcomeSummary: '你没有隐藏继续探索的愿望，经纪人开始更积极地观察市场。',
        playerDelta: { agentRelation: 5, form: 3, clubAttachment: -5, fanRelation: -2 },
      },
    ],
  },
  {
    id: 'THREE_YEAR_CAREER_DIRECTION',
    groupId: 'CAREER_DIRECTION',
    category: 'CONTRACT',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'RANKING',
    eyebrow: '经纪人 · 三年规划',
    title: '经纪人要求你重新确定未来三年的职业优先级。',
    description: '这次排序会直接改写现有四项职业追求，后续合同与转会仍使用同一套模型。',
    weight: 10,
    isEligible: (state) => Boolean(
      state.player &&
      playerAgeAtWindow(state.windowIndex) >= 20 &&
      latestActualTeamLevel(state) === 'FIRST_TEAM' &&
      state.contract,
    ),
    choices: [
      {
        id: 'A',
        title: '出场 ＞ 稳定 ＞ 平台 ＞ 收入',
        description: '先确保自己在关键成长阶段持续比赛。',
        effectPreview: '职业优先级改为出场导向',
        outcomeSummary: '你把稳定比赛放在第一位，经纪人会以明确角色作为筛选机会的首要条件。',
        playerDelta: { agentRelation: 4, morale: 3 },
        priorityOrder: ['PLAYING_TIME', 'STABILITY', 'COMPETITIVE_LEVEL', 'SALARY'],
      },
      {
        id: 'B',
        title: '平台 ＞ 出场 ＞ 稳定 ＞ 收入',
        description: '愿意承担竞争，优先争取更高水平环境。',
        effectPreview: '职业优先级改为平台导向',
        outcomeSummary: '你接受更激烈的竞争，把高水平联赛和俱乐部平台放到了未来规划首位。',
        playerDelta: { agentRelation: 4, reputation: 2, morale: 1 },
        priorityOrder: ['COMPETITIVE_LEVEL', 'PLAYING_TIME', 'STABILITY', 'SALARY'],
      },
      {
        id: 'C',
        title: '稳定 ＞ 出场 ＞ 收入 ＞ 平台',
        description: '优先考虑长期合同、生活和明确计划。',
        effectPreview: '职业优先级改为稳定导向',
        outcomeSummary: '你希望下一阶段减少无谓变化，经纪人会优先寻找计划清晰的长期环境。',
        playerDelta: { agentRelation: 3, morale: 5, clubAttachment: 3 },
        priorityOrder: ['STABILITY', 'PLAYING_TIME', 'SALARY', 'COMPETITIVE_LEVEL'],
      },
      {
        id: 'D',
        title: '收入 ＞ 稳定 ＞ 出场 ＞ 平台',
        description: '职业寿命有限，开始重视合同价值。',
        effectPreview: '职业优先级改为收入导向',
        outcomeSummary: '你要求经纪人更认真衡量合同价值，未来机会不再只按竞技吸引力排序。',
        playerDelta: { agentRelation: 5, reputation: 1 },
        priorityOrder: ['SALARY', 'STABILITY', 'PLAYING_TIME', 'COMPETITIVE_LEVEL'],
      },
    ],
  },
  {
    id: 'NATIONAL_ROLE_MISMATCH',
    groupId: 'NATIONAL_ROLE',
    category: 'NATIONAL',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'ALLOCATION',
    eyebrow: '国家队 · 战术适应',
    title: '国家队和俱乐部要求你承担不同的战术职责。',
    description: '比赛理解可以互相促进，但训练时间不足以同时强化所有细节。',
    weight: 10,
    isEligible: (state) => {
      const national = latestNationalWindow(state)
      return Boolean(
        state.player &&
        latestActualTeamLevel(state) === 'FIRST_TEAM' &&
        national?.calledUp &&
        national.appearances > 0 &&
        national.role,
      )
    },
    choices: [
      {
        id: 'A',
        title: '国家队55% · 俱乐部30% · 恢复15%',
        description: '优先适应国家队的短期战术要求。',
        effectPreview: '心理、名气与国家队准备上升 · 身体下降',
        outcomeSummary: '你迅速适应了国家队要求，比赛日准备更充分，回到俱乐部后需要重新切换。',
        playerDelta: { morale: 5, reputation: 4, fitness: -3, coachRelation: -1 },
        storyEffect: { tendencyDelta: { clutch: 1 } },
      },
      {
        id: 'B',
        title: '两套职责各40% · 恢复20%',
        description: '用录像和分组训练维持两边的理解。',
        effectPreview: '竞技、心理与职业倾向平衡上升',
        outcomeSummary: '你没有在任何一边完全重练，而是建立了一套清晰的职责切换方式。',
        playerDelta: { form: 4, morale: 3, coachRelation: 2 },
        trainingBonus: 1,
        storyEffect: { tendencyDelta: { professionalism: 1 } },
      },
      {
        id: 'C',
        title: '俱乐部50% · 国家队25% · 恢复25%',
        description: '保持长期位置特点，只做必要适应。',
        effectPreview: '俱乐部教练、身体上升 · 国家队曝光较少',
        outcomeSummary: '你把长期发展留在俱乐部体系内，在国家队只执行最必要的战术变化。',
        playerDelta: { coachRelation: 5, fitness: 4, form: 2, reputation: -1 },
      },
    ],
  },
  {
    id: 'NATIONAL_DEFEAT_RESPONSE',
    groupId: 'NATIONAL_REACTION',
    category: 'NATIONAL',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'RISK',
    eyebrow: '国家队 · 失利回应',
    title: '国家队表现不佳，赛后采访要求球员给出解释。',
    description: '公众需要回应，但任何一句话都可能改变责任落点。',
    weight: 10,
    isEligible: (state) => {
      const national = latestNationalWindow(state)
      const earlyExit = national?.stage === 'NOT_QUALIFIED' || national?.stage === 'GROUP_STAGE'
      return Boolean(
        state.player &&
        national?.calledUp &&
        national.appearances > 0 &&
        ((national.averageRating ?? 7) <= 6.8 || earlyExit),
      )
    },
    setup: {
      prompt: '你准备先保护球队，还是先回应公众情绪？',
      options: [
        { id: 'TEAM', title: '先保护球队内部', description: '减少公开归责。', choiceIds: ['A', 'B'] },
        { id: 'PUBLIC', title: '先正面回应失望', description: '承担更大的公开压力。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      {
        id: 'A',
        title: '主动承担自己的责任',
        description: '只谈自己能改进的部分，不评价队友。',
        effectPreview: '国家队声誉、媒体关系上升 · 心理下降',
        outcomeSummary: '你没有逃避个人表现，外界接受了这份态度，压力也更多落在了你身上。',
        playerDelta: { reputation: 5, mediaRelation: 4, morale: -3 },
        delayed: { delayWindows: 1, playerDelta: { form: 3, morale: 2 }, summary: '国家队失利后的责任感转化成了俱乐部训练动力。' },
        storyEffect: { tendencyDelta: { leadership: 1, professionalism: 1 } },
      },
      {
        id: 'B',
        title: '强调球队会共同复盘',
        description: '不寻找个人替罪羊，也不回避结果。',
        effectPreview: '队内、媒体与心理稳定上升',
        outcomeSummary: '回应没有提供刺激标题，却让责任保持在团队内部，舆论逐渐回到比赛本身。',
        playerDelta: { squadRelation: 4, mediaRelation: 2, morale: 2 },
        storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1 } },
      },
      {
        id: 'C',
        title: '直接承诺下一场回应',
        description: '用明确目标接住公众失望。',
        effectPreview: '45%激发反弹 · 55%压力继续累积',
        outcomeSummary: '你把下一场表现变成了公开承诺。',
        playerDelta: { reputation: 2 },
        outcomes: [
          { id: 'REBOUND', label: '承诺激发反弹', weight: 45, summary: '明确目标让训练更集中，外界也愿意等待下一次国家队比赛。', playerDelta: { form: 6, morale: 4, fanRelation: 3 }, storyEffect: { tendencyDelta: { clutch: 1 } } },
          { id: 'PRESSURE', label: '压力持续累积', weight: 55, summary: '公开承诺被反复引用，接下来的俱乐部比赛也背上了额外压力。', playerDelta: { morale: -5, form: -3, mediaRelation: -2 } },
        ],
      },
    ],
  },
  {
    id: 'STARTING_ROLE_LOST',
    groupId: 'STARTING_ROLE_LOST',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 4,
    interactionKind: 'DIALOGUE',
    eyebrow: '队内地位 · 位置动摇',
    title: '你刚刚失去了原本稳定的主力位置。',
    description: '角色变化已经发生。现在需要弄清原因，并决定怎样回应。',
    weight: 9,
    timing: 'TRANSITION',
    transitionPriority: 50,
    isEligible: (state) => {
      const role = latestCurrentClubRoleTransition(state)
      return Boolean(
        role.latest &&
          role.previous &&
          role.latestRank >= 0 &&
          role.previousRank >= firstTeamRoleRank('STARTER') &&
          role.latestRank <= firstTeamRoleRank('ROTATION'),
      )
    },
    setup: {
      prompt: '你先从哪里寻找答案？',
      options: [
        { id: 'COACH', title: '先找教练', description: '直接确认竞技和战术原因。', choiceIds: ['A', 'B'] },
        { id: 'SELF', title: '先从自己开始', description: '先用行动回应角色变化。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      { id: 'A', title: '要求一份明确改进清单', description: '让教练说明重回主力需要做到什么。', effectPreview: '教练、职业倾向上升', outcomeSummary: '谈话把模糊的不满变成了几项可以执行的要求，你重新掌握了努力方向。', playerDelta: { coachRelation: 5, morale: 2 }, trainingBonus: 1, storyEffect: { tendencyDelta: { professionalism: 1 } } },
      { id: 'B', title: '接受竞争并沉默加练', description: '暂时不争论，用训练重新赢得位置。', effectPreview: '竞技、身体与心理上升', outcomeSummary: '你没有把失位变成公开冲突，而是提高了训练强度，竞争重新开始。', playerDelta: { form: 5, fitness: -2, morale: 3 } },
      { id: 'C', title: '公开表达自己的不解', description: '让外界知道你并不认同这次变化。', effectPreview: '舆论关注上升 · 教练关系下降', outcomeSummary: '你的不满很快成为新闻，支持者替你发声，教练却认为内部问题被带到了场外。', playerDelta: { reputation: 3, mediaRelation: 3, fanRelation: 2, coachRelation: -6 }, storyEffect: { publicPersona: 'OUTSPOKEN' } },
    ],
  },
  {
    id: 'FIRST_TEAM_ROLE_SECURED',
    groupId: 'FIRST_TEAM_ROLE_SECURED',
    category: 'MILESTONE',
    priority: 'P2',
    cooldownWindows: 53,
    interactionKind: 'RANKING',
    eyebrow: '里程碑 · 坐稳主力',
    title: '你第一次真正成为了一线队主力。',
    description: '位置只是开始，你要决定用什么方式守住它。',
    weight: 8,
    timing: 'TRANSITION',
    transitionPriority: 50,
    isEligible: (state) => {
      const role = latestCurrentClubRoleTransition(state)
      const latest = role.latest
      const hadEstablishedRole = settledHistory(state).some(
        (entry) =>
          entry.windowIndex !== latest?.windowIndex &&
          entry.teamLevel === 'FIRST_TEAM' &&
          firstTeamRoleRank(entry.role as GameState['firstTeamRole']) >= firstTeamRoleRank('STARTER'),
      )
      return Boolean(
        latest &&
          role.previous &&
          role.previousRank >= firstTeamRoleRank('FRINGE') &&
          role.previousRank <= firstTeamRoleRank('ROTATION') &&
          role.latestRank >= firstTeamRoleRank('STARTER') &&
          !hadEstablishedRole,
      )
    },
    choices: [
      { id: 'A', title: '表现 ＞ 纪律 ＞ 帮助球队', description: '先用数据证明自己配得上主力。', effectPreview: '竞技、进攻与名气上升', outcomeSummary: '你把主力位置当作表现责任，训练和比赛都更主动。', playerDelta: { form: 5, attributes: { attack: 0.5 }, reputation: 2 } },
      { id: 'B', title: '纪律 ＞ 帮助球队 ＞ 表现', description: '先确保自己完全执行战术。', effectPreview: '教练、心理与职业倾向上升', outcomeSummary: '你没有急于放大个人数据，而是先成为教练可以稳定信任的一环。', playerDelta: { coachRelation: 6, attributes: { mental: 0.5 }, morale: 2 }, storyEffect: { tendencyDelta: { professionalism: 1 } } },
      { id: 'C', title: '帮助球队 ＞ 表现 ＞ 纪律', description: '主动承担更多队内责任。', effectPreview: '队内、球迷与领导倾向上升', outcomeSummary: '你把位置提升转化为对全队的责任，队友更愿意在场上寻找你。', playerDelta: { squadRelation: 6, fanRelation: 3, morale: 3 }, storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { leadership: 1 } } },
    ],
  },
  {
    id: 'ELITE_CLUB_FRINGE_REVIEW',
    groupId: 'ELITE_CLUB_ADAPTATION',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 5,
    interactionKind: 'ALLOCATION',
    eyebrow: '豪门竞争 · 突破计划',
    title: '豪门训练质量很高，但你仍徘徊在阵容边缘。',
    description: '教练组给出额外方案，有限精力必须用于最可能改变位置的方向。',
    weight: 9,
    isEligible: (state) => {
      const recent = currentClubSettledWindows(state).slice(-2)
      return Boolean(
        isOverseasEliteClub(state) &&
          recent.length === 2 &&
          recent.every(
            (entry) =>
              entry.teamLevel === 'FIRST_TEAM' &&
              firstTeamRoleRank(entry.role as GameState['firstTeamRole']) <= firstTeamRoleRank('SUBSTITUTE') &&
              entry.stats.appearances <= 6,
          ),
      )
    },
    choices: [
      { id: 'A', title: '专项60% · 战术25% · 恢复15%', description: '集中突破最能制造比赛差异的能力。', effectPreview: '主能力明显提升 · 身体承压', outcomeSummary: '你把豪门资源集中用于专项突破，训练强度和成长同时提高。', playerDelta: { attributes: { attack: 0.8, physical: 0.3 }, fitness: -4, coachRelation: 2 }, trainingBonus: 1 },
      { id: 'B', title: '战术50% · 专项30% · 恢复20%', description: '优先减少体系理解和执行误差。', effectPreview: '心理、教练与训练收益上升', outcomeSummary: '你开始更快理解高水平比赛的细节，教练对你的可靠性评价提高。', playerDelta: { attributes: { mental: 0.7 }, coachRelation: 6, morale: 2 }, trainingBonus: 1, storyEffect: { tendencyDelta: { professionalism: 1 } } },
      { id: 'C', title: '恢复45% · 战术35% · 专项20%', description: '先维持长期训练质量，等待机会。', effectPreview: '身体、心理状态上升 · 突破较慢', outcomeSummary: '你没有在焦虑中透支身体，状态逐渐稳定，但位置竞争不会立刻改变。', playerDelta: { fitness: 7, morale: 5, form: 1 } },
    ],
  },
  {
    id: 'CORE_TACTICAL_DISAGREEMENT',
    groupId: 'COACH_TACTICAL_AUTHORITY',
    category: 'COACH',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'PERSON_TONE',
    eyebrow: '战术 · 核心分歧',
    title: '你和教练对自己的战术职责产生了明显分歧。',
    description: '你的地位足以提出意见，但表达方式会决定它是建议还是挑战。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      playerAgeAtWindow(state.windowIndex) >= 21 &&
      hasFirstTeamRole(state, 'STARTER') &&
      currentClubFirstTeamWindows(state) >= 4 &&
      state.player.coachRelation <= 62,
    ),
    setup: {
      prompt: '你准备在哪里提出分歧？',
      options: [
        { id: 'PRIVATE', title: '私下找教练', description: '避免把权威问题带进全队。', choiceIds: ['A', 'B'] },
        { id: 'TEAM', title: '战术会上说明', description: '让队友共同理解问题。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      { id: 'A', title: '用比赛片段提出替代方案', description: '只谈具体跑位和得失。', effectPreview: '教练、心理和职业倾向上升', outcomeSummary: '证据让讨论保持专业，教练没有全部接受，却愿意调整部分职责。', playerDelta: { coachRelation: 5, attributes: { mental: 0.4 }, morale: 3 }, storyEffect: { tendencyDelta: { professionalism: 1, diplomacy: 1 } } },
      { id: 'B', title: '先执行，再约定复盘', description: '暂时服从安排，用结果继续讨论。', effectPreview: '竞技、教练关系稳定上升', outcomeSummary: '你维护了比赛准备的统一，也为赛后重新讨论留下了空间。', playerDelta: { form: 4, coachRelation: 3, squadRelation: 2 } },
      { id: 'C', title: '明确表示现方案限制了自己', description: '在全队面前要求改变。', effectPreview: '名气上升 · 教练和队内关系承压', outcomeSummary: '你的强硬立场迅速获得关注，也让战术分歧变成了权威问题。', playerDelta: { reputation: 4, mediaRelation: 2, coachRelation: -7, squadRelation: -3 }, storyEffect: { publicPersona: 'OUTSPOKEN' } },
    ],
  },
  {
    id: 'CAPTAIN_PUBLIC_CONFLICT',
    groupId: 'CAPTAIN_LEADERSHIP_TEST',
    category: 'TEAM',
    priority: 'P1',
    cooldownWindows: 7,
    interactionKind: 'DIALOGUE',
    eyebrow: '队长职责 · 公开矛盾',
    title: '两名队友的矛盾已经从更衣室蔓延到公开场合。',
    description: '作为队长，你不能回避，但先听谁、怎样定调会改变结果。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      state.careerStory.club.leadership === 'CAPTAIN' &&
      playerAgeAtWindow(state.windowIndex) >= 23 &&
      hasFirstTeamRole(state, 'STARTER') &&
      currentClubFirstTeamWindows(state) >= 4,
    ),
    setup: {
      prompt: '你准备先采取哪一步？',
      options: [
        { id: 'PLAYERS', title: '分别听取两名队友', description: '先弄清各自真实不满。', choiceIds: ['A', 'B'] },
        { id: 'STAFF', title: '先与教练统一底线', description: '先控制对球队的影响。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      { id: 'A', title: '安排面对面和解', description: '让双方当面确认事实和边界。', effectPreview: '队内、领导与外交倾向上升', outcomeSummary: '你没有替任何一方裁决，而是促成了直接沟通，公开矛盾逐渐降温。', playerDelta: { squadRelation: 7, coachRelation: 2, morale: 3 }, storyEffect: { tendencyDelta: { leadership: 1, diplomacy: 1 } } },
      { id: 'B', title: '宣布全队共同遵守的规则', description: '不公开细节，只明确以后不能越过的边界。', effectPreview: '教练、队内与职业倾向上升', outcomeSummary: '清楚的规则停止了矛盾扩散，你的队长权威也更加具体。', playerDelta: { coachRelation: 5, squadRelation: 4, reputation: 2 }, storyEffect: { tendencyDelta: { leadership: 1, professionalism: 1 } } },
      { id: 'C', title: '支持教练组强制处分', description: '用纪律尽快结束争议。', effectPreview: '教练关系明显上升 · 队内反应不一', outcomeSummary: '争议被迅速压下，但部分队友认为你更像教练组的代表。', playerDelta: { coachRelation: 7, form: 2, squadRelation: -4 }, storyEffect: { tendencyDelta: { leadership: 1 } } },
    ],
  },
  {
    id: 'RIVALRY_CROSSROADS',
    groupId: 'POSITION_RIVALRY',
    category: 'TEAM',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'RISK',
    eyebrow: '更衣室 · 竞争转折',
    title: '你与同位置队友的敌对竞争已经走到十字路口。',
    description: '继续对抗、主动和解或公开摊牌，都可能彻底改变这段关系。',
    weight: 8,
    isEligible: (state) => state.careerStory.club.rivalry === 'HOSTILE',
    setup: {
      prompt: '你希望这段竞争走向哪里？',
      options: [
        { id: 'REPAIR', title: '尝试修复关系', description: '承认彼此都被竞争消耗。', choiceIds: ['A', 'B'] },
        { id: 'FIGHT', title: '继续正面对抗', description: '接受竞争必然有输赢。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      { id: 'A', title: '主动邀请对方共同训练', description: '用足球重新建立最基本的信任。', effectPreview: '65%转为良性竞争 · 35%遭到拒绝', outcomeSummary: '你主动迈出了缓和关系的一步。', playerDelta: { morale: 1 }, outcomes: [
        { id: 'REPAIRED', label: '转为良性竞争', weight: 65, summary: '共同训练让敌意逐渐回到足球本身，你们重新成为互相推动的竞争者。', playerDelta: { squadRelation: 8, form: 3 }, storyEffect: { club: { rivalry: 'HEALTHY' }, tendencyDelta: { diplomacy: 1 } } },
        { id: 'REJECTED', label: '对方拒绝缓和', weight: 35, summary: '对方认为这只是姿态，敌意没有消失，你至少明确了自己的态度。', playerDelta: { squadRelation: -2, morale: -2 }, storyEffect: { tendencyDelta: { diplomacy: 1 } } },
      ] },
      { id: 'B', title: '只在训练和比赛中竞争', description: '停止场外针锋相对。', effectPreview: '竞技、职业倾向上升', outcomeSummary: '你把所有冲突限制在足球范围内，关系仍冷淡，但不再持续伤害全队。', playerDelta: { form: 5, squadRelation: 2, morale: 2 }, storyEffect: { club: { rivalry: 'HEALTHY' }, tendencyDelta: { professionalism: 1 } } },
      { id: 'C', title: '公开要求教练明确取舍', description: '让竞争尽快产生一个输赢结果。', effectPreview: '50%赢得位置 · 50%关系反噬', outcomeSummary: '你把竞争推到了必须决定的程度。', playerDelta: { reputation: 2 }, outcomes: [
        { id: 'WON', label: '竞争激发主力表现', weight: 50, summary: '强硬表态转化成了训练表现，你在竞争中暂时占据上风。', playerDelta: { form: 7, coachRelation: 2, squadRelation: -2 } },
        { id: 'BACKFIRE', label: '公开施压引发反感', weight: 50, summary: '教练和队友都不满你把个人竞争公开化，处境反而更加困难。', playerDelta: { coachRelation: -6, squadRelation: -6, morale: -4 } },
      ] },
    ],
  },
  {
    id: 'MENTEE_BREAKTHROUGH',
    groupId: 'CLUB_MENTORSHIP',
    category: 'TEAM',
    priority: 'P3',
    cooldownWindows: 8,
    interactionKind: 'CHOICE',
    eyebrow: '队内 · 导师回响',
    title: '你帮助过的年轻队友开始在一线队崭露头角。',
    description: '他的成长也让外界重新评价你在更衣室里的作用。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      state.careerStory.club.mentorship === 'MENTOR' &&
      hasFirstTeamRole(state, 'STARTER') &&
      currentClubFirstTeamWindows(state) >= 3,
    ),
    choices: [
      { id: 'A', title: '公开把功劳留给他', description: '强调成长来自他的努力。', effectPreview: '队内、球迷与外交倾向上升', outcomeSummary: '你没有把年轻人的突破包装成自己的功劳，他和队友都记住了这份分寸。', playerDelta: { squadRelation: 6, fanRelation: 4, morale: 3 }, storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1 } } },
      { id: 'B', title: '提高训练和比赛要求', description: '提醒他一次突破不代表已经站稳。', effectPreview: '教练、职业与领导倾向上升', outcomeSummary: '你继续以一线队标准要求他，教练认可这种不被短期成绩冲昏头脑的态度。', playerDelta: { coachRelation: 5, squadRelation: 3, form: 2 }, storyEffect: { tendencyDelta: { leadership: 1, professionalism: 1 } } },
      { id: 'C', title: '逐渐退出导师角色', description: '让他独立面对新的竞争。', effectPreview: '心理、竞技上升 · 导师关系结束', outcomeSummary: '你开始把空间完整交还给他，双方关系仍然良好，但导师阶段已经结束。', playerDelta: { morale: 4, form: 3, squadRelation: 1 }, storyEffect: { club: { mentorship: 'NONE' } } },
    ],
  },
  {
    id: 'DISCIPLINE_AFFECTS_SELECTION',
    groupId: 'MATCH_DISCIPLINE',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 5,
    interactionKind: 'RANKING',
    eyebrow: '比赛 · 纪律警报',
    title: '你的纪律记录开始影响教练的出场安排。',
    description: '对抗强度、位置纪律和稳定出场无法同时放在第一位。',
    weight: 9,
    isEligible: (state) => {
      const stats = latestCurrentClubReport(state)?.stats
      return Boolean(
        stats &&
          latestActualTeamLevel(state) === 'FIRST_TEAM' &&
          (stats.redCards > 0 || stats.yellowCards >= 4),
      )
    },
    choices: [
      { id: 'A', title: '纪律 ＞ 出场 ＞ 对抗', description: '先减少不必要犯规和停赛风险。', effectPreview: '心理、教练关系上升 · 对抗贡献收缩', outcomeSummary: '你开始更早判断危险位置，纪律明显改善，比赛侵略性也有所收敛。', playerDelta: { attributes: { mental: 0.6, defense: 0.2 }, coachRelation: 5, form: -1 }, storyEffect: { tendencyDelta: { professionalism: 1 } } },
      { id: 'B', title: '出场 ＞ 纪律 ＞ 对抗', description: '在保证可用性的前提下保持比赛强度。', effectPreview: '竞技、教练和身体平衡上升', outcomeSummary: '你没有完全改变踢法，而是把最危险的动作从比赛中移除。', playerDelta: { form: 4, coachRelation: 3, fitness: 2 } },
      { id: 'C', title: '对抗 ＞ 出场 ＞ 纪律', description: '坚持侵略性是自己不可替代的一部分。', effectPreview: '防守、身体上升 · 教练关系承压', outcomeSummary: '你继续保持强硬对抗，比赛影响力上升，教练仍担心下一张牌何时到来。', playerDelta: { attributes: { defense: 0.5, physical: 0.4 }, form: 2, coachRelation: -4 } },
    ],
  },
  {
    id: 'CLUTCH_EXPECTATION_PRESSURE',
    groupId: 'CLUTCH_PRESSURE',
    category: 'MATCH',
    priority: 'P2',
    cooldownWindows: 6,
    interactionKind: 'ALLOCATION',
    eyebrow: '比赛 · 关键先生压力',
    title: '“关键先生”的期待正在变成新的压力。',
    description: '球队希望你继续承担关键时刻，但心理恢复和日常表现同样重要。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      state.careerStory.tendencies.clutch >= 3 &&
      hasFirstTeamRole(state, 'STARTER') &&
      latestCurrentClubReport(state)?.stats.appearances,
    ),
    choices: [
      { id: 'A', title: '关键球55% · 日常30% · 恢复15%', description: '继续主动承担决定比赛的责任。', effectPreview: '大赛、名气上升 · 心理与身体承压', outcomeSummary: '你继续把最重要的时刻留给自己，外界期待更高，压力也更集中。', playerDelta: { form: 5, reputation: 4, morale: -3, fitness: -2 }, storyEffect: { tendencyDelta: { clutch: 1 } } },
      { id: 'B', title: '日常45% · 恢复35% · 关键球20%', description: '先保证稳定表现和长期状态。', effectPreview: '身体、心理与教练关系上升', outcomeSummary: '你不再把每场比赛都变成英雄叙事，稳定性和恢复质量明显提高。', playerDelta: { fitness: 6, morale: 5, coachRelation: 3 }, storyEffect: { tendencyDelta: { professionalism: 1 } } },
      { id: 'C', title: '分担40% · 日常35% · 恢复25%', description: '让更多队友参与关键决策。', effectPreview: '队内、心理与领导倾向上升', outcomeSummary: '你开始主动与队友分担关键责任，球队不再只等待一个人解决问题。', playerDelta: { squadRelation: 6, morale: 4, fanRelation: 2 }, storyEffect: { tendencyDelta: { leadership: 1, diplomacy: 1 } } },
    ],
  },
  {
    id: 'FORM_REBOUND_WINDOW',
    groupId: 'FORM_CYCLE',
    category: 'MATCH',
    priority: 'P3',
    cooldownWindows: 5,
    interactionKind: 'RISK',
    eyebrow: '比赛 · 低谷反弹',
    title: '你刚刚踢出了一个真正的反弹窗口。',
    description: '反弹可以成为转折，也可能因为急于证明自己而再次失控。',
    weight: 9,
    timing: 'TRANSITION',
    transitionPriority: 40,
    isEligible: (state) => {
      const reports = latestCompletedFirstTeamWindows(state, 2)
      return Boolean(
        reports.length === 2 &&
          reports[0]!.stats.averageRating <= 6.6 &&
          reports[1]!.stats.averageRating >= 7.2,
      )
    },
    setup: {
      prompt: '你怎样延续这次反弹？',
      options: [
        { id: 'PUSH', title: '继续加速', description: '趁状态上升扩大表现。', choiceIds: ['A', 'B'] },
        { id: 'CONTROL', title: '控制节奏', description: '避免重新掉入波动。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      { id: 'A', title: '延续高负荷训练', description: '继续用更大投入追赶失去的时间。', effectPreview: '60%延续高光 · 40%身体反噬', outcomeSummary: '你选择继续推动状态上限。', playerDelta: { morale: 2 }, outcomes: [
        { id: 'SURGE', label: '高光继续', weight: 60, summary: '反弹没有停在一个窗口，训练和比赛信心继续上升。', playerDelta: { form: 7, reputation: 3, fitness: -2 } },
        { id: 'FATIGUE', label: '身体出现反噬', weight: 40, summary: '持续加码让恢复速度下降，竞技信心还在，身体却开始报警。', playerDelta: { form: 2, fitness: -7, morale: -2 } },
      ] },
      { id: 'B', title: '保持现有训练节奏', description: '把反弹变成可以复制的日常。', effectPreview: '竞技、心理和职业倾向稳定上升', outcomeSummary: '你没有追逐更夸张的数据，而是把有效做法固定成了习惯。', playerDelta: { form: 4, morale: 4, coachRelation: 2 }, storyEffect: { tendencyDelta: { professionalism: 1 } } },
      { id: 'C', title: '公开回应此前质疑', description: '把反弹变成一次舆论翻身。', effectPreview: '名气、媒体上升 · 重新增加压力', outcomeSummary: '你正面回应了低谷期的质疑，关注迅速回到自己身上。', playerDelta: { reputation: 5, mediaRelation: 4, fanRelation: 3, morale: -2 }, storyEffect: { publicPersona: 'OUTSPOKEN' } },
    ],
  },
  {
    id: 'TEAM_SPOKESPERSON_REQUEST',
    groupId: 'TEAM_PUBLIC_LEADERSHIP',
    category: 'TEAM',
    priority: 'P2',
    cooldownWindows: 7,
    interactionKind: 'PERSON_TONE',
    eyebrow: '更衣室 · 代表全队',
    title: '更衣室希望你代表全队与俱乐部沟通。',
    description: '议题涉及赛程、训练和球员权益，你必须决定先代表谁的声音。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      state.careerStory.publicPersona === 'TEAM_FIRST' &&
      state.player.squadRelation >= 65 &&
      playerAgeAtWindow(state.windowIndex) >= 22 &&
      hasFirstTeamRole(state, 'STARTER') &&
      currentClubFirstTeamWindows(state) >= 4,
    ),
    setup: {
      prompt: '你先与谁统一诉求？',
      options: [
        { id: 'PLAYERS', title: '先听不同队友', description: '确认问题不是少数人的抱怨。', choiceIds: ['A', 'B'] },
        { id: 'CLUB', title: '先了解俱乐部限制', description: '确认哪些条件真的可以改变。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      { id: 'A', title: '坚定提出全队共同诉求', description: '把球员一致意见完整带到管理层。', effectPreview: '队内、领导上升 · 教练关系承压', outcomeSummary: '队友认可你没有删减他们的声音，俱乐部则要求你为后续影响负责。', playerDelta: { squadRelation: 8, reputation: 3, coachRelation: -3 }, storyEffect: { tendencyDelta: { leadership: 1 } } },
      { id: 'B', title: '提出可执行的折中方案', description: '把诉求拆成可以立即调整的部分。', effectPreview: '教练、队内与外交倾向上升', outcomeSummary: '沟通没有停在立场表态，几项具体安排获得调整，双方都接受了结果。', playerDelta: { coachRelation: 5, squadRelation: 6, morale: 3 }, storyEffect: { tendencyDelta: { diplomacy: 1, leadership: 1 } } },
      { id: 'C', title: '劝队友接受现实限制', description: '避免矛盾继续影响比赛准备。', effectPreview: '教练、竞技上升 · 队内关系下降', outcomeSummary: '训练和赛程争议很快降温，但部分队友认为你没有真正代表他们。', playerDelta: { coachRelation: 7, form: 3, squadRelation: -5 } },
    ],
  },
  {
    id: 'LOW_KEY_COMMERCIAL_EXPOSURE',
    groupId: 'PUBLIC_PERSONA_COMMERCIAL',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 7,
    interactionKind: 'ALLOCATION',
    eyebrow: '公众形象 · 商业曝光',
    title: '你的低调形象开始遇上越来越多商业邀请。',
    description: '曝光会带来收入和知名度，也会占用恢复与私人时间。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      state.careerStory.publicPersona === 'LOW_KEY' &&
      state.player.reputation >= 55,
    ),
    choices: [
      { id: 'A', title: '曝光10% · 训练55% · 私人35%', description: '只保留必要合作，继续维持低调生活。', effectPreview: '身体、心理和低调形象上升', outcomeSummary: '你拒绝了多数邀约，把商业活动压缩到最低限度，生活节奏保持稳定。', playerDelta: { fitness: 5, morale: 5, reputation: -1 }, storyEffect: { publicPersona: 'LOW_KEY', tendencyDelta: { professionalism: 1 } } },
      { id: 'B', title: '曝光35% · 训练40% · 私人25%', description: '选择少量符合自身形象的合作。', effectPreview: '现金、媒体与心理平衡上升', outcomeSummary: '你只接受与自己形象一致的合作，曝光增加，却没有完全改变生活方式。', playerDelta: { mediaRelation: 4, reputation: 3, morale: 2 }, cashDeltaEuro: 15_000 },
      { id: 'C', title: '曝光60% · 训练25% · 私人15%', description: '主动经营快速增长的商业价值。', effectPreview: '现金、名气明显上升 · 身体下降', outcomeSummary: '商业活动迅速扩大了知名度和收入，恢复时间则被明显压缩。', playerDelta: { reputation: 6, mediaRelation: 6, fitness: -5, morale: -2 }, cashDeltaEuro: 45_000, storyEffect: { publicPersona: 'NEUTRAL' } },
    ],
  },
  {
    id: 'OUTSPOKEN_PERSONA_REVIEW',
    groupId: 'PUBLIC_PERSONA_REVIEW',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 7,
    interactionKind: 'DIALOGUE',
    eyebrow: '公众形象 · 强硬标签',
    title: '直言不讳正在成为外界对你的固定印象。',
    description: '你可以巩固这种形象，也可以重新决定表达的边界。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      state.careerStory.publicPersona === 'OUTSPOKEN' &&
      (state.player.reputation >= 52 || state.player.mediaRelation >= 58),
    ),
    setup: {
      prompt: '你希望公众先看见什么？',
      options: [
        { id: 'POSITION', title: '先看见清晰立场', description: '不因争议放弃表达。', choiceIds: ['A', 'B'] },
        { id: 'TEAM', title: '先看见球队责任', description: '减少个人与俱乐部的对立。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      { id: 'A', title: '继续坚持原有表达方式', description: '接受争议也是影响力的一部分。', effectPreview: '名气、媒体和强硬形象上升', outcomeSummary: '你没有收回锋芒，公众对你的立场更加确定，争议也继续伴随而来。', playerDelta: { reputation: 5, mediaRelation: 3, fanRelation: 2, coachRelation: -2 }, storyEffect: { publicPersona: 'OUTSPOKEN' } },
      { id: 'B', title: '保留立场但调整语气', description: '把批评变成更具体的建议。', effectPreview: '媒体、教练和外交倾向上升', outcomeSummary: '你仍然表达真实看法，却不再让语气掩盖内容，俱乐部也更愿意回应。', playerDelta: { mediaRelation: 5, coachRelation: 3, squadRelation: 2 }, storyEffect: { publicPersona: 'NEUTRAL', tendencyDelta: { diplomacy: 1 } } },
      { id: 'C', title: '主动把话题拉回球队', description: '减少个人立场，强调共同目标。', effectPreview: '队内、球迷与团队形象上升', outcomeSummary: '你开始把公开发言更多交给球队目标，强硬标签逐渐被团队责任取代。', playerDelta: { squadRelation: 5, fanRelation: 5, coachRelation: 2 }, storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1 } } },
    ],
  },
  {
    id: 'HOMETOWN_CHARITY_INVITATION',
    groupId: 'PUBLIC_WELFARE',
    category: 'MEDIA',
    priority: 'P3',
    cooldownWindows: 10,
    interactionKind: 'ALLOCATION',
    eyebrow: '场外 · 家乡公益',
    title: '留洋成名后，家乡邀请你支持一项青少年足球计划。',
    description: '捐款、亲自参与和低调支持需要投入不同的金钱与时间。',
    weight: 7,
    isEligible: (state) => Boolean(
      state.player &&
      isAtOverseasClub(state) &&
      state.player.reputation >= 60 &&
      state.cashEuro >= 25_000,
    ),
    choices: [
      { id: 'A', title: '资金60% · 时间20% · 宣传20%', description: '提供一笔真正能改善训练条件的捐款。', effectPreview: '花费€60,000 · 声誉与球迷关系明显上升', outcomeSummary: '资金很快转化为训练场地和装备，家乡球迷把这次支持视为真正的回馈。', playerDelta: { reputation: 7, fanRelation: 8, mediaRelation: 3, morale: 3 }, cashDeltaEuro: -60_000, storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1 } }, isEligible: (state) => state.cashEuro >= 60_000 },
      { id: 'B', title: '时间50% · 资金30% · 宣传20%', description: '亲自回去参加训练营并投入适度资金。', effectPreview: '花费€25,000 · 球迷与心理明显上升 · 身体略降', outcomeSummary: '孩子们真正见到了你，活动的意义不再只是一张支票，密集行程也消耗了恢复时间。', playerDelta: { fanRelation: 9, morale: 6, reputation: 4, fitness: -3 }, cashDeltaEuro: -25_000, storyEffect: { tendencyDelta: { leadership: 1, diplomacy: 1 } }, isEligible: (state) => state.cashEuro >= 25_000 },
      { id: 'C', title: '低调提供远程支持', description: '不投入现金，通过录像课程和训练建议帮助项目。', effectPreview: '免费方案 · 心理与低调形象上升', outcomeSummary: '你没有把公益活动变成个人宣传，而是整理了训练课程和建议，影响保持安静而真实。', playerDelta: { morale: 5, fanRelation: 3 }, storyEffect: { publicPersona: 'LOW_KEY' } },
    ],
  },
  {
    id: 'FINAL_MAJOR_CONTRACT_PRIORITIES',
    groupId: 'CAREER_DIRECTION',
    category: 'CONTRACT',
    priority: 'P2',
    cooldownWindows: 8,
    interactionKind: 'RANKING',
    eyebrow: '经纪人 · 生涯后期合同',
    title: '经纪人请你定义职业生涯最后一份重要合同。',
    description: '这次排序会直接改写后续报价匹配，不新增另一套合同规则。',
    weight: 8,
    isEligible: (state) => Boolean(
      state.player &&
      playerAgeAtWindow(state.windowIndex) >= 31 &&
      state.contract &&
      state.contract.remainingHalfYears <= 2 &&
      latestActualTeamLevel(state) === 'FIRST_TEAM',
    ),
    choices: [
      { id: 'A', title: '出场 ＞ 稳定 ＞ 收入 ＞ 平台', description: '确保生涯后期仍能持续比赛。', effectPreview: '职业优先级改为出场导向', outcomeSummary: '你希望最后几年仍由比赛定义，经纪人会首先核对真实角色。', playerDelta: { agentRelation: 4, morale: 4 }, priorityOrder: ['PLAYING_TIME', 'STABILITY', 'SALARY', 'COMPETITIVE_LEVEL'] },
      { id: 'B', title: '平台 ＞ 出场 ＞ 稳定 ＞ 收入', description: '继续争取最高水平的竞技挑战。', effectPreview: '职业优先级改为平台导向', outcomeSummary: '你仍愿意承担竞争，把最高水平舞台留在职业规划首位。', playerDelta: { reputation: 3, agentRelation: 3, morale: 2 }, priorityOrder: ['COMPETITIVE_LEVEL', 'PLAYING_TIME', 'STABILITY', 'SALARY'] },
      { id: 'C', title: '稳定 ＞ 出场 ＞ 收入 ＞ 平台', description: '减少迁徙，选择清晰而长期的计划。', effectPreview: '职业优先级改为稳定导向', outcomeSummary: '你希望最后阶段拥有清楚计划，经纪人会优先寻找长期信任。', playerDelta: { clubAttachment: 5, morale: 5, agentRelation: 3 }, priorityOrder: ['STABILITY', 'PLAYING_TIME', 'SALARY', 'COMPETITIVE_LEVEL'] },
      { id: 'D', title: '收入 ＞ 稳定 ＞ 出场 ＞ 平台', description: '把职业生涯积累转化为合同价值。', effectPreview: '职业优先级改为收入导向', outcomeSummary: '你明确要求最后一份重要合同体现多年积累，收入成为首要条件。', playerDelta: { agentRelation: 6, reputation: 1 }, priorityOrder: ['SALARY', 'STABILITY', 'PLAYING_TIME', 'COMPETITIVE_LEVEL'] },
    ],
  },
  {
    id: 'FIRST_NATIONAL_GOAL_REACTION',
    groupId: 'NATIONAL_FIRST_GOAL',
    category: 'NATIONAL',
    priority: 'P1',
    cooldownWindows: 53,
    interactionKind: 'CHOICE',
    eyebrow: '国家队 · 生涯首球',
    title: '你的第一粒国家队进球已经写入生涯。',
    description: '这个进球属于个人，也属于帮助它发生的整支球队。',
    weight: 8,
    timing: 'TRANSITION',
    transitionPriority: 80,
    isEligible: (state) => {
      const latest = latestCurrentClubReport(state)
      const transition = latestNationalTransition(state)
      return Boolean(
        latest &&
        transition.latest?.calledUp &&
          transition.latest.windowIndex === latestNationalWindow(state)?.windowIndex &&
          transition.latest.goals > 0 &&
          transition.before.goals === 0,
      )
    },
    choices: [
      { id: 'A', title: '收藏比赛用球和球衣', description: '把首球留作个人生涯纪念。', effectPreview: '心理状态、国家队归属上升', outcomeSummary: '你把比赛用球和球衣交给家人保存，这个夜晚成为职业生涯的重要坐标。', playerDelta: { morale: 7, fanRelation: 3 } },
      { id: 'B', title: '公开感谢助攻和全队', description: '让首球首先成为团队故事。', effectPreview: '队内、球迷与团队形象上升', outcomeSummary: '你没有独占首球的聚光灯，队友和球迷都记住了这份感谢。', playerDelta: { squadRelation: 6, fanRelation: 6, reputation: 3 }, storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1 } } },
      { id: 'C', title: '公开设立国家队新目标', description: '把首球当作更高目标的起点。', effectPreview: '名气、大赛倾向上升 · 压力增加', outcomeSummary: '你立即谈到下一届大赛和更多进球，雄心获得关注，期待也随之提高。', playerDelta: { reputation: 6, form: 3, morale: -2 }, storyEffect: { tendencyDelta: { clutch: 1 }, publicPersona: 'OUTSPOKEN' } },
    ],
  },
  {
    id: 'NATIONAL_FIFTY_CAPS',
    groupId: 'NATIONAL_FIFTY_CAPS',
    category: 'MILESTONE',
    priority: 'P1',
    cooldownWindows: 53,
    interactionKind: 'RANKING',
    eyebrow: '国家队 · 五十场',
    title: '你完成了国家队生涯第50次出场。',
    description: '五十场意味着个人纪念，也意味着开始承担传承责任。',
    weight: 8,
    timing: 'TRANSITION',
    transitionPriority: 70,
    isEligible: (state) => {
      const latest = latestCurrentClubReport(state)
      const transition = latestNationalTransition(state)
      return Boolean(
        latest &&
        transition.latest?.calledUp &&
          transition.latest.windowIndex === latestNationalWindow(state)?.windowIndex &&
          transition.before.caps < 50 &&
          transition.after.caps >= 50,
      )
    },
    choices: [
      { id: 'A', title: '纪念 ＞ 新人 ＞ 大赛', description: '先完整保存这段国家队履历。', effectPreview: '心理、球迷与国家声誉上升', outcomeSummary: '你和家人、队友共同纪念了第50场，这个数字有了具体的人和回忆。', playerDelta: { morale: 7, fanRelation: 5, reputation: 4 } },
      { id: 'B', title: '新人 ＞ 大赛 ＞ 纪念', description: '把经验主动交给新进入国家队的队友。', effectPreview: '队内、领导与外交倾向上升', outcomeSummary: '你把五十场经验整理给年轻队友，资历开始真正转化为传承。', playerDelta: { squadRelation: 7, reputation: 3, morale: 3 }, storyEffect: { tendencyDelta: { leadership: 1, diplomacy: 1 } } },
      { id: 'C', title: '大赛 ＞ 新人 ＞ 纪念', description: '把注意力全部转向下一届大赛。', effectPreview: '竞技、大赛与名气上升', outcomeSummary: '你没有停留在数字上，而是把第50场变成冲击下一届大赛的起点。', playerDelta: { form: 5, reputation: 5, morale: 2 }, storyEffect: { tendencyDelta: { clutch: 1, professionalism: 1 } } },
    ],
  },
  {
    id: 'FIRST_BALLON_DOR_NIGHT',
    groupId: 'INDIVIDUAL_AWARD',
    category: 'MILESTONE',
    priority: 'P1',
    cooldownWindows: 53,
    interactionKind: 'PERSON_TONE',
    eyebrow: '最高荣誉 · 金球奖之夜',
    title: '你第一次捧起了金球奖。',
    description: '领奖台上的表达会决定这座奖杯如何被写进你的时代。',
    weight: 8,
    timing: 'TRANSITION',
    transitionPriority: 100,
    isEligible: (state) => firstHonorTransition(state, ['BALLON_DOR']),
    setup: {
      prompt: '你希望先把掌声献给谁？',
      options: [
        { id: 'TEAM', title: '先献给球队和家人', description: '强调个人荣誉来自共同支持。', choiceIds: ['A', 'B'] },
        { id: 'ERA', title: '先谈自己的道路和时代', description: '说明这座奖杯对个人意味着什么。', choiceIds: ['B', 'C'] },
      ],
    },
    choices: [
      { id: 'A', title: '感谢球队、教练与家人', description: '把金球奖放回整个生涯共同体。', effectPreview: '队内、教练、球迷和团队形象明显上升', outcomeSummary: '你的领奖感言没有把金球奖写成独角戏，身边所有人都被带进了这个夜晚。', playerDelta: { squadRelation: 8, coachRelation: 6, fanRelation: 7, reputation: 6 }, storyEffect: { publicPersona: 'TEAM_FIRST', tendencyDelta: { diplomacy: 1, leadership: 1 } } },
      { id: 'B', title: '强调多年坚持和职业选择', description: '谈论低谷、训练和从未放弃的目标。', effectPreview: '名气、心理能力与职业倾向明显上升', outcomeSummary: '你用漫长的职业道路解释了这座奖杯，金球奖成为坚持的结果。', playerDelta: { reputation: 9, morale: 7, attributes: { mental: 0.8 } }, storyEffect: { tendencyDelta: { professionalism: 2 } } },
      { id: 'C', title: '公开谈论属于自己的时代', description: '把目标指向更多最高荣誉。', effectPreview: '世界声誉、大赛倾向上升 · 舆论压力增加', outcomeSummary: '你没有把这座金球奖当作终点，而是公开宣告继续定义这个时代。', playerDelta: { reputation: 12, mediaRelation: 6, morale: -3, fanRelation: 4 }, storyEffect: { publicPersona: 'OUTSPOKEN', tendencyDelta: { clutch: 2, leadership: 1 } } },
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
        choice.priorityOrder &&
        (choice.priorityOrder.length !== 4 ||
          new Set(choice.priorityOrder).size !== 4)
      ) {
        errors.push(`职业优先级排序无效：${event.id}/${choice.id}`)
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

export function eligibleCareerEventChoices(
  state: GameState,
  event: CareerEventDefinition,
): readonly CareerEventChoice[] {
  return event.choices.filter((choice) => choice.isEligible?.(state) ?? true)
}

export function careerEventIsEligible(
  state: GameState,
  event: CareerEventDefinition,
): boolean {
  return event.isEligible(state) && eligibleCareerEventChoices(state, event).length >= 2
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
  const baseEligible = CAREER_EVENTS.filter((event) =>
    careerEventIsEligible(state, event),
  )
  const eligible = baseEligible.filter(
    (event) =>
      !careerEventIsOnCooldown(state, event) &&
      (event.timing === 'TRANSITION' || event.category !== blockedCategory),
  )
  if (eligible.length === 0) return null

  const transitionEvents = eligible.filter(
    (event) => event.timing === 'TRANSITION',
  )
  const highestTransitionPriority = Math.max(
    0,
    ...transitionEvents.map((event) => event.transitionPriority ?? 0),
  )
  const prioritizedTransitionEvents = transitionEvents.filter(
    (event) => (event.transitionPriority ?? 0) === highestTransitionPriority,
  )

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
  // The three-window safety guarantee raises the observed rate above the raw
  // roll. 67.5% keeps the full-career result close to the intended 70%.
  const triggerChance = isFreshTransfer(state) ? 0.5 : 0.675
  if (transitionEvents.length === 0 && !guaranteed && random.next() > triggerChance) {
    return null
  }

  const balancedPool = leastSeenCareerEventPool(
    state,
    transitionEvents.length > 0 ? prioritizedTransitionEvents : eligible,
  )
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
  const choice = eligibleCareerEventChoices(state, event).find(
    (candidate) => candidate.id === choiceId,
  )
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
  const resolvedPlayer = structuredClone(resolved.player)
  if (choice.priorityOrder) {
    resolvedPlayer.priorities = [...choice.priorityOrder]
    resolvedPlayer.priorityValues = Object.fromEntries(
      choice.priorityOrder.map((priority, index) => [
        priority,
        [85, 70, 55, 40][index],
      ]),
    ) as Player['priorityValues']
  }
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
    player: resolvedPlayer,
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
