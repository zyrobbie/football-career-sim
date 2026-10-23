import type { CareerEventDefinition } from './careerEvents'
import type { CareerEventCategory, CareerEventId, CareerEventRecord, GameState } from '../models/game'
import type {
  ActiveOffPitchStory, ClosedOffPitchStory, OffPitchStoryEventId, OffPitchStoryState,
  PublicImpression, PublicImpressionId, RepresentativeOffPitchStory,
} from '../models/offPitchStories'
import { createOffPitchStoryState, V3_STORY_CHAINS, V3_STORY_EVENT_IDS } from '../models/offPitchStories'
import {
  activeStoryEventDefinitions, canMentorYoungTeammate, V3_STORY_EVENT_MAP, v3StoriesAreActive,
} from '../data/offPitchStories'
import { CLUBS } from '../data/balance'
import { createRandom, weightedPick } from './random'

export { createOffPitchStoryState, offPitchStoryStateSchema } from '../models/offPitchStories'

const storyIds = new Set<string>(V3_STORY_EVENT_IDS)
export function isV3StoryEventId(id: string): id is OffPitchStoryEventId {
  return storyIds.has(id)
}

function progress(state: GameState): OffPitchStoryState {
  return state.entertainmentV3?.stories ?? createOffPitchStoryState()
}

function sourceForEvent(state: GameState, id: OffPitchStoryEventId): ActiveOffPitchStory | ClosedOffPitchStory | null {
  const stories = progress(state)
  if (stories.activeChain?.followupEventId === id) return stories.activeChain
  return stories.closedChains.find((chain) => chain.followupEventId === id) ?? null
}

/** The saved original choice supplies context, never a newly invented sporting result. */
export function getV3StoryEvent(state: GameState, id: CareerEventId): CareerEventDefinition {
  if (!isV3StoryEventId(id)) throw new Error(`Not a V3 off-pitch event: ${id}`)
  const definition = V3_STORY_EVENT_MAP.get(id)
  if (!definition) throw new Error(`Unknown V3 off-pitch event: ${id}`)
  const source = sourceForEvent(state, id)
  if (!source) return definition
  const moved = source.clubId !== state.selectedClubId
  const origin = `你在${source.clubName}时选择了“${source.firstChoiceTitle}”。`
  const continuation = moved
    ? source.chainId === 'C01'
      ? '你已经换队，当时联系你的品牌通过远程联系发来新邀请，不要求你回到原俱乐部。'
      : source.chainId === 'C02'
        ? '你已经换队，记者通过远程采访回访当时的表达。'
        : '你已经换队，家乡训练营的来信仍是远程联系，不涉及原队安排。'
    : '这次回访延续的是当时真实留下的选择。'
  return {
    ...definition,
    description: `${origin}${continuation}${definition.description}`,
    choices: definition.choices.map((choice) => ({
      ...choice,
      outcomeSummary: `上次你选择“${source.firstChoiceTitle}”；这次${choice.outcomeSummary}`,
    })),
  }
}

function chainForFirst(id: OffPitchStoryEventId) {
  return Object.entries(V3_STORY_CHAINS).find(([, chain]) => chain.first === id)
}

/** A is recorded once; B can use W+1, W+2 or W+3, never the same slot as A. */
export function scheduleV3StoryFollowup(state: GameState, record: CareerEventRecord): OffPitchStoryState {
  const current = progress(state)
  if (!v3StoriesAreActive(state) || !isV3StoryEventId(record.eventId) ||
    record.windowIndex !== state.windowIndex || current.activeChain ||
    current.completedNodeIds.includes(record.eventId) || !state.selectedClubId) return current
  const pair = chainForFirst(record.eventId)
  const definition = V3_STORY_EVENT_MAP.get(record.eventId)
  if (!pair || !definition?.choices.some((choice) => choice.id === record.choiceId)) return current
  const [chainId, chain] = pair
  if (current.closedChains.some((closed) => closed.chainId === chainId)) return current
  const club = CLUBS.find((candidate) => candidate.id === state.selectedClubId)
  const activeChain: ActiveOffPitchStory = {
    chainId: chainId as ActiveOffPitchStory['chainId'],
    firstEventId: chain.first, followupEventId: chain.followup,
    firstWindowIndex: record.windowIndex,
    availableFromWindowIndex: record.windowIndex + 1,
    expiresAfterWindowIndex: record.windowIndex + 3,
    clubId: state.selectedClubId,
    clubName: club?.name ?? state.selectedClubId,
    sourceRole: state.firstTeamRole ?? state.youthRole ?? state.teamLevel,
    firstChoiceId: record.choiceId, firstChoiceTitle: record.choiceTitle,
    firstOutcomeSummary: record.outcomeSummary,
  }
  return { ...current, completedNodeIds: [...current.completedNodeIds, record.eventId], activeChain }
}

function factualClosure(source: ActiveOffPitchStory, windowIndex: number, reason: ClosedOffPitchStory['reason']): ClosedOffPitchStory {
  const explanation = {
    COMPLETED: '这段故事已经按实际选择收尾。',
    EXPIRED: '可回访的三个半年已经过去，这次没有继续安排。',
    CLUB_CHANGED: `你已离开${source.clubName}，与原队年轻队友的固定交流就此收尾。`,
    ROLE_CHANGED: '你的队内处境已经改变，原定的队友指导回访不再安排。',
    RETIRED: '你已经结束球员生涯，未发生的后续不再安排。',
  }[reason]
  return {
    ...source, closedAtWindowIndex: windowIndex, reason,
    summary: `当时你选择“${source.firstChoiceTitle}”。${explanation}这段经历仍留在你的履历里。`,
  }
}

/** Call with atReport after the W+3 slot has been used or skipped. No effects are applied. */
export function closeV3Story(state: GameState, options: { atReport?: boolean } = {}): OffPitchStoryState {
  const current = progress(state)
  const source = current.activeChain
  if (!source) return current
  // A retirement proposal is reversible. Only the confirmed terminal phase ends a story.
  if (state.phase === 'RETIREMENT_DECISION') return current
  let reason: ClosedOffPitchStory['reason'] | null = null
  if (state.phase === 'CAREER_RETIRED') reason = 'RETIRED'
  else if (V3_STORY_CHAINS[source.chainId].clubBound && source.clubId !== state.selectedClubId) reason = 'CLUB_CHANGED'
  else if (source.chainId === 'C03' && !canMentorYoungTeammate(state) && state.contract &&
    state.contract.remainingHalfYears > 0) reason = 'ROLE_CHANGED'
  else if (state.windowIndex > source.expiresAfterWindowIndex ||
    (options.atReport && state.windowIndex >= source.expiresAfterWindowIndex)) reason = 'EXPIRED'
  if (!reason) return current
  return { ...current, activeChain: null, closedChains: [...current.closedChains,
    factualClosure(source, state.windowIndex, reason)] }
}

/** Record alongside careerEventHistory in the same store transaction. Replays are no-ops. */
export function recordV3StoryChoice(state: GameState, record: CareerEventRecord): OffPitchStoryState {
  const current = progress(state)
  if (!v3StoriesAreActive(state) || !isV3StoryEventId(record.eventId) ||
    record.windowIndex !== state.windowIndex || current.completedNodeIds.includes(record.eventId)) return current
  const definition = V3_STORY_EVENT_MAP.get(record.eventId)
  if (!definition?.choices.some((choice) => choice.id === record.choiceId)) return current
  if (chainForFirst(record.eventId)) return scheduleV3StoryFollowup(state, record)
  const source = current.activeChain
  const followup = Object.values(V3_STORY_CHAINS).some((chain) => chain.followup === record.eventId)
  if (followup) {
    if (!source || source.followupEventId !== record.eventId ||
      state.windowIndex < source.availableFromWindowIndex || state.windowIndex > source.expiresAfterWindowIndex ||
      (V3_STORY_CHAINS[source.chainId].clubBound && source.clubId !== state.selectedClubId)) return current
    const closed: ClosedOffPitchStory = {
      ...source, closedAtWindowIndex: record.windowIndex, reason: 'COMPLETED',
      summary: record.outcomeSummary, followupChoiceId: record.choiceId,
      followupChoiceTitle: record.choiceTitle, followupOutcomeSummary: record.outcomeSummary,
    }
    return {
      completedNodeIds: [...current.completedNodeIds, record.eventId], activeChain: null,
      closedChains: [...current.closedChains, closed],
    }
  }
  return { ...current, completedNodeIds: [...current.completedNodeIds, record.eventId] }
}

/** Similar legacy topics may be suppressed for ON only, never removed from lookup. */
export const V3_REPLACED_ORDINARY_EVENT_IDS: readonly CareerEventId[] = [
  'INTERVIEW_MISQUOTE', 'FAN_DAY_OR_REST', 'OLD_SOCIAL_POST_REVISITED',
  'OVERSEAS_COMMUNICATION_PLAN', 'SPONSOR_APPEARANCE', 'LOW_KEY_COMMERCIAL_EXPOSURE',
  'OUTSPOKEN_PERSONA_REVIEW', 'TEAM_SPOKESPERSON_REQUEST',
  'YOUNG_TEAMMATE_MENTOR', 'MENTEE_BREAKTHROUGH', 'HOMETOWN_CHARITY_INVITATION',
]

const legacyTopic: Record<string, string> = {
  INTERVIEW_MISQUOTE: 'V3_E03_INTERVIEW_CLIP', FAN_DAY_OR_REST: 'V3_E04_FAN_SCHEDULE',
  OLD_SOCIAL_POST_REVISITED: 'V3_E05_OLD_POST', OVERSEAS_COMMUNICATION_PLAN: 'V3_E07_LANGUAGE_MIXUP',
  SPONSOR_APPEARANCE: 'C01', LOW_KEY_COMMERCIAL_EXPOSURE: 'C01',
  OUTSPOKEN_PERSONA_REVIEW: 'C02', TEAM_SPOKESPERSON_REQUEST: 'C02',
  YOUNG_TEAMMATE_MENTOR: 'C03', MENTEE_BREAKTHROUGH: 'C03', HOMETOWN_CHARITY_INVITATION: 'C04',
}

function topic(id: string): string {
  if (legacyTopic[id]) return legacyTopic[id]
  return Object.entries(V3_STORY_CHAINS).find(([, chain]) => chain.first === id || chain.followup === id)?.[0] ?? id
}

export interface V3StorySelectionInput {
  /** The caller has checked actual eligibility/cooldown of explicit urgent or transition events. */
  mandatoryEventId?: CareerEventId | null
  ordinaryEventId?: CareerEventId | null
  /** The original cadence has opened the existing slot. Stories never open a second one. */
  ordinaryOpportunity: boolean
  recentOrdinaryCategories?: readonly CareerEventCategory[]
  fullContent?: boolean
}

export function selectV3StoryEvent(state: GameState, input: V3StorySelectionInput): CareerEventId | null {
  if (!v3StoriesAreActive(state)) return input.ordinaryEventId ?? null
  if (input.mandatoryEventId) return input.mandatoryEventId
  if (!input.ordinaryOpportunity) return null
  const stories = closeV3Story(state)
  const effectiveState = stories === progress(state) || !state.entertainmentV3 ? state : {
    ...state, entertainmentV3: { ...state.entertainmentV3, stories },
  }
  const active = stories.activeChain
  if (active && state.windowIndex >= active.availableFromWindowIndex &&
    state.windowIndex <= active.expiresAfterWindowIndex &&
    V3_STORY_EVENT_MAP.get(active.followupEventId)?.isEligible(effectiveState)) return active.followupEventId
  const previousCategories = input.recentOrdinaryCategories ?? state.careerEventHistory
    .flatMap((record) => {
      const category = V3_STORY_EVENT_MAP.get(record.eventId)?.category
      return category ? [category] : []
    }).slice(-2)
  const blockedCategory = previousCategories.length >= 2 && previousCategories.at(-1) === previousCategories.at(-2)
    ? previousCategories.at(-1) : null
  const eligible = activeStoryEventDefinitions(input.fullContent).filter((definition) => {
    if (!definition.isEligible(effectiveState) || definition.category === blockedCategory) return false
    return !state.careerEventHistory.some((record) => state.windowIndex - record.windowIndex <= 6 &&
      topic(record.eventId) === topic(definition.id))
  })
  const ordinary = input.ordinaryEventId ?? null
  if (!eligible.length) return ordinary
  // One legacy candidate represents the old pool; equal bucket weight avoids swamping it with twenty new IDs.
  return weightedPick(createRandom(state.careerSeed, 'v3-offpitch-select', state.windowIndex), [
    ...eligible.map((definition) => ({ value: definition.id, weight: 1 })),
    ...(ordinary ? [{ value: ordinary, weight: eligible.length }] : []),
  ])
}

const labels: Record<PublicImpressionId, string> = {
  LOW_KEY: '低调务实', TEAM_FIRST: '愿意照顾队友', OUTSPOKEN: '直言不讳',
}

function savedImpression(record: CareerEventRecord): PublicImpressionId | null {
  const persona = record.storyEffect?.publicPersona
  return persona && persona !== 'NEUTRAL' ? persona : null
}

/** Display only. One event, an unplayed window, or a lone persona enum cannot create a label. */
export function publicImpressions(state: GameState): PublicImpression[] {
  if (!v3StoriesAreActive(state)) return []
  const lastSettledWindow = Math.max(-1, ...state.history.map((entry) => entry.windowIndex))
  if (lastSettledWindow < 0) return []
  const recent = state.careerEventHistory.filter((record) => record.windowIndex <= lastSettledWindow &&
    record.windowIndex >= lastSettledWindow - 7)
  return (Object.keys(labels) as PublicImpressionId[]).map((id) => {
    const evidence = recent.filter((record) => savedImpression(record) === id)
    const windows = new Set(evidence.map((record) => record.windowIndex))
    return { id, evidence, windows: windows.size, latest: Math.max(-1, ...windows) }
  }).filter((candidate) => candidate.windows >= 2)
    .sort((first, second) => second.windows - first.windows || second.latest - first.latest || first.id.localeCompare(second.id))
    .slice(0, 2).map(({ id, evidence, windows }) => ({
      id, label: labels[id], summary: `最近8个已结算半年中，${windows}个不同半年留下了同方向的选择。`,
      evidence: evidence.map((record) => ({
        eventId: record.eventId, windowIndex: record.windowIndex,
        choiceTitle: record.choiceTitle, outcomeSummary: record.outcomeSummary,
      })),
    }))
}

export function representativeOffPitchStories(state: GameState): RepresentativeOffPitchStory[] {
  if (!v3StoriesAreActive(state)) return []
  const stories = progress(state)
  const savedSourceTitle = (source: ActiveOffPitchStory | ClosedOffPitchStory): string =>
    state.careerEventHistory.find((record) => record.eventId === source.firstEventId &&
      record.windowIndex === source.firstWindowIndex)?.eventTitle ??
    V3_STORY_EVENT_MAP.get(source.firstEventId)?.title ?? '一段场外故事'
  const candidates: (RepresentativeOffPitchStory & { importance: number; topic: string })[] = []
  for (const closed of stories.closedChains) {
    candidates.push({
      id: closed.chainId, title: savedSourceTitle(closed),
      windowIndex: closed.firstWindowIndex, summary: closed.summary,
      originalChoiceTitle: closed.firstChoiceTitle,
      ...(closed.followupChoiceTitle ? {
        followupChoiceTitle: closed.followupChoiceTitle, followupWindowIndex: closed.closedAtWindowIndex,
      } : {}),
      completed: closed.reason === 'COMPLETED', importance: closed.reason === 'COMPLETED' ? 3 : 2,
      topic: closed.chainId,
    })
  }
  if (stories.activeChain) {
    const active = stories.activeChain
    candidates.push({
      id: active.chainId, title: savedSourceTitle(active),
      windowIndex: active.firstWindowIndex, summary: `${active.firstOutcomeSummary}后续尚未发生。`,
      originalChoiceTitle: active.firstChoiceTitle, completed: false, importance: 1, topic: active.chainId,
    })
  }
  for (const record of state.careerEventHistory) {
    if (!isV3StoryEventId(record.eventId) || topic(record.eventId).startsWith('C0')) continue
    candidates.push({
      id: `${record.eventId}:${record.windowIndex}`, title: record.eventTitle ?? V3_STORY_EVENT_MAP.get(record.eventId)?.title ?? '场外生活',
      windowIndex: record.windowIndex, summary: record.outcomeSummary,
      originalChoiceTitle: record.choiceTitle, completed: true, importance: 0, topic: topic(record.eventId),
    })
  }
  const selected: typeof candidates = []
  for (const candidate of candidates.sort((first, second) => second.importance - first.importance ||
    second.windowIndex - first.windowIndex || first.id.localeCompare(second.id))) {
    if (!selected.some((entry) => entry.topic === candidate.topic)) selected.push(candidate)
    if (selected.length === 3) break
  }
  return selected.sort((first, second) => first.windowIndex - second.windowIndex).map((candidate) => {
    const { importance, topic: _topic, ...story } = candidate
    void importance
    return story
  })
}

/** At most one report highlight, including an expiry that did not consume another slot. */
export function offPitchStoryReportHighlight(state: GameState, windowIndex = state.windowIndex): string | null {
  const stories = progress(state)
  const closed = stories.closedChains.find((chain) => chain.closedAtWindowIndex === windowIndex)
  if (closed) return closed.summary
  const record = state.careerEventHistory.find((entry) => entry.windowIndex === windowIndex && isV3StoryEventId(entry.eventId))
  return record?.outcomeSummary ?? null
}
