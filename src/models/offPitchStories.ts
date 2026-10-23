import { z } from 'zod'

/** New identifiers never replace a V2 event or change a saved V2 choice. */
export const V3_STORY_EVENT_IDS = [
  'V3_E01_PRESS_DRINK',
  'V3_E02_AD_TEAMMATE',
  'V3_E03_INTERVIEW_CLIP',
  'V3_E04_FAN_SCHEDULE',
  'V3_E05_OLD_POST',
  'V3_E06_FAMILY_VISIT',
  'V3_E07_LANGUAGE_MIXUP',
  'V3_E08_NEW_NEIGHBOR',
  'V3_E09_LOCAL_RADIO',
  'V3_E10_TEAM_PHOTO',
  'V3_E11_COMMUTE',
  'V3_E12_FAN_GIFT',
  'V3_C01A_LOCAL_CAR',
  'V3_C01B_LOCAL_CAR_RETURN',
  'V3_C02A_PUBLIC_RESPONSE',
  'V3_C02B_PUBLIC_RESPONSE_RETURN',
  'V3_C03A_YOUNG_TEAMMATE',
  'V3_C03B_YOUNG_TEAMMATE_RETURN',
  'V3_C04A_HOMETOWN_CAMP',
  'V3_C04B_HOMETOWN_CAMP_RETURN',
] as const

export type OffPitchStoryEventId = (typeof V3_STORY_EVENT_IDS)[number]
export type V3StoryEventId = OffPitchStoryEventId
export const V3_STORY_CHAIN_IDS = ['C01', 'C02', 'C03', 'C04'] as const
export type OffPitchStoryChainId = (typeof V3_STORY_CHAIN_IDS)[number]

export const V3_STORY_CHAINS = {
  C01: { first: 'V3_C01A_LOCAL_CAR', followup: 'V3_C01B_LOCAL_CAR_RETURN', clubBound: false },
  C02: { first: 'V3_C02A_PUBLIC_RESPONSE', followup: 'V3_C02B_PUBLIC_RESPONSE_RETURN', clubBound: false },
  C03: { first: 'V3_C03A_YOUNG_TEAMMATE', followup: 'V3_C03B_YOUNG_TEAMMATE_RETURN', clubBound: true },
  C04: { first: 'V3_C04A_HOMETOWN_CAMP', followup: 'V3_C04B_HOMETOWN_CAMP_RETURN', clubBound: false },
} as const satisfies Record<OffPitchStoryChainId, {
  first: OffPitchStoryEventId
  followup: OffPitchStoryEventId
  clubBound: boolean
}>

const boundedWindow = z.number().int().min(0).max(200)
const activeStoryShape = {
  chainId: z.enum(V3_STORY_CHAIN_IDS),
  firstEventId: z.enum(V3_STORY_EVENT_IDS),
  followupEventId: z.enum(V3_STORY_EVENT_IDS),
  firstWindowIndex: boundedWindow,
  availableFromWindowIndex: boundedWindow,
  expiresAfterWindowIndex: boundedWindow,
  clubId: z.string().min(1).max(160),
  clubName: z.string().min(1).max(160),
  sourceRole: z.enum(['YOUTH', 'FIRST_TEAM', 'FRINGE', 'SUBSTITUTE', 'ROTATION', 'STARTER', 'CORE']),
  firstChoiceId: z.string().min(1).max(80),
  firstChoiceTitle: z.string().min(1).max(300),
  firstOutcomeSummary: z.string().min(1).max(1_200),
}

export const activeOffPitchStorySchema = z.object(activeStoryShape).strict()
export type ActiveOffPitchStory = z.infer<typeof activeOffPitchStorySchema>

export const closedOffPitchStorySchema = z.object({
  ...activeStoryShape,
  closedAtWindowIndex: boundedWindow,
  reason: z.enum(['COMPLETED', 'EXPIRED', 'CLUB_CHANGED', 'ROLE_CHANGED', 'RETIRED']),
  summary: z.string().min(1).max(1_200),
  followupChoiceId: z.string().min(1).max(80).optional(),
  followupChoiceTitle: z.string().min(1).max(300).optional(),
  followupOutcomeSummary: z.string().min(1).max(1_200).optional(),
}).strict()
export type ClosedOffPitchStory = z.infer<typeof closedOffPitchStorySchema>

export const offPitchStoryStateSchema = z.object({
  completedNodeIds: z.array(z.enum(V3_STORY_EVENT_IDS)).max(20),
  activeChain: activeOffPitchStorySchema.nullable(),
  closedChains: z.array(closedOffPitchStorySchema).max(4),
}).strict().superRefine((state, context) => {
  const completed = new Set(state.completedNodeIds)
  if (completed.size !== state.completedNodeIds.length) {
    context.addIssue({ code: 'custom', message: '场外节点不能重复完成。' })
  }
  const chains = [...state.closedChains, ...(state.activeChain ? [state.activeChain] : [])]
  const choiceIds = {
    C01: { first: ['FULL', 'SHORT', 'DECLINE'], followup: ['FULL', 'SHORT', 'CLOSE'] },
    C02: { first: ['DIRECT', 'TEAM', 'PRIVATE'], followup: ['CONTINUE', 'CHANGE', 'CLOSE'] },
    C03: { first: ['TIME', 'NOTES', 'INTRO'], followup: ['LISTEN', 'BOUNDARY', 'STAFF'] },
    C04: { first: ['DONATE', 'REMOTE', 'DECLINE'], followup: ['LETTER', 'SHARE', 'CLOSE'] },
  }
  if (new Set(chains.map((chain) => chain.chainId)).size !== chains.length) {
    context.addIssue({ code: 'custom', message: '一条场外故事只能有一份进度。' })
  }
  for (const chain of chains) {
    const definition = V3_STORY_CHAINS[chain.chainId]
    if (chain.firstEventId !== definition.first || chain.followupEventId !== definition.followup ||
      chain.availableFromWindowIndex !== chain.firstWindowIndex + 1 ||
      chain.expiresAfterWindowIndex !== chain.firstWindowIndex + 3 ||
      !choiceIds[chain.chainId].first.includes(chain.firstChoiceId) ||
      !completed.has(chain.firstEventId)) {
      context.addIssue({ code: 'custom', message: '场外故事来源或期限不一致。' })
    }
  }
  if (state.activeChain && completed.has(state.activeChain.followupEventId)) {
    context.addIssue({ code: 'custom', message: '已完成的后续不能仍在排队。' })
  }
  for (const chain of state.closedChains) {
    if (chain.closedAtWindowIndex < chain.firstWindowIndex ||
      (chain.reason === 'COMPLETED' &&
        (!completed.has(chain.followupEventId) || !chain.followupChoiceId ||
          !chain.followupChoiceTitle || !chain.followupOutcomeSummary ||
          !choiceIds[chain.chainId].followup.includes(chain.followupChoiceId) ||
          chain.closedAtWindowIndex < chain.availableFromWindowIndex ||
          chain.closedAtWindowIndex > chain.expiresAfterWindowIndex)) ||
      (chain.reason !== 'COMPLETED' && completed.has(chain.followupEventId)) ||
      (chain.reason === 'EXPIRED' && chain.closedAtWindowIndex < chain.expiresAfterWindowIndex)) {
      context.addIssue({ code: 'custom', message: '场外故事收尾缺少实际记录。' })
    }
  }
  for (const [chainId, definition] of Object.entries(V3_STORY_CHAINS)) {
    if (completed.has(definition.first) !== chains.some((chain) => chain.chainId === chainId) ||
      (completed.has(definition.followup) && !state.closedChains.some((chain) =>
        chain.chainId === chainId && chain.reason === 'COMPLETED'))) {
      context.addIssue({ code: 'custom', message: '已完成的场外节点与故事进度不一致。' })
    }
  }
})

export type OffPitchStoryState = z.infer<typeof offPitchStoryStateSchema>

export function createOffPitchStoryState(): OffPitchStoryState {
  return { completedNodeIds: [], activeChain: null, closedChains: [] }
}

export type PublicImpressionId = 'LOW_KEY' | 'TEAM_FIRST' | 'OUTSPOKEN'
export interface PublicImpression {
  id: PublicImpressionId
  label: string
  summary: string
  evidence: {
    eventId: string
    windowIndex: number
    choiceTitle: string
    outcomeSummary: string
  }[]
}

export interface RepresentativeOffPitchStory {
  id: string
  title: string
  windowIndex: number
  summary: string
  originalChoiceTitle: string
  followupChoiceTitle?: string
  followupWindowIndex?: number
  completed: boolean
}
