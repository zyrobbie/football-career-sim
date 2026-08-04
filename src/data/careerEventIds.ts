export const CAREER_EVENT_IDS = [
  'COACH_DEFENSIVE_TASK',
  'COACH_ROLE_TRIAL',
  'CAPTAIN_VIDEO_REVIEW',
  'TEAMMATE_RIVALRY',
  'DRESSING_ROOM_DISPUTE',
  'MEDIA_BREAKTHROUGH',
  'ONLINE_CRITICISM',
  'FAN_DAY_OR_REST',
  'FITNESS_WARNING',
  'KEY_MATCH_PAIN',
  'CONTRACT_ROLE_TALK',
  'TRANSFER_RUMOR',
] as const

export type CareerEventId = (typeof CAREER_EVENT_IDS)[number]

export const CAREER_EVENT_CATEGORIES = [
  'COACH',
  'TEAM',
  'MATCH',
  'HEALTH',
  'MEDIA',
  'CONTRACT',
  'NATIONAL',
] as const

export type CareerEventCategory =
  (typeof CAREER_EVENT_CATEGORIES)[number]

export const CAREER_EVENT_INTERACTION_KINDS = [
  'CHOICE',
  'DIALOGUE',
  'RISK',
  'ALLOCATION',
  'RANKING',
  'PERSON_TONE',
] as const

export type CareerEventInteractionKind =
  (typeof CAREER_EVENT_INTERACTION_KINDS)[number]

export type CareerEventInteractionProtocol =
  | 'SINGLE_STAGE'
  | 'MULTI_STAGE'

export function interactionProtocolFor(
  kind: CareerEventInteractionKind,
): CareerEventInteractionProtocol {
  return ['CHOICE', 'ALLOCATION', 'RANKING'].includes(kind)
    ? 'SINGLE_STAGE'
    : 'MULTI_STAGE'
}
