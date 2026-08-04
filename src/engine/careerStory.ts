import type {
  CareerStoryEffect,
  CareerStoryState,
} from '../models/game'

const TENDENCY_MIN = 0
const TENDENCY_MAX = 5

function clampTendency(value: number): number {
  return Math.min(TENDENCY_MAX, Math.max(TENDENCY_MIN, value))
}

export function createCareerStoryState(
  clubId: string | null = null,
): CareerStoryState {
  return {
    club: {
      clubId,
      leadership: 'NONE',
      rivalry: 'NONE',
      mentorship: 'NONE',
    },
    publicPersona: 'NEUTRAL',
    tendencies: {
      leadership: 0,
      diplomacy: 0,
      professionalism: 0,
      clutch: 0,
    },
  }
}

export function resetClubStory(
  story: CareerStoryState,
  clubId: string | null,
): CareerStoryState {
  return {
    ...story,
    club: createCareerStoryState(clubId).club,
  }
}

export function ensureStoryClub(
  story: CareerStoryState,
  clubId: string | null,
): CareerStoryState {
  return story.club.clubId === clubId
    ? story
    : resetClubStory(story, clubId)
}

export function applyCareerStoryEffect(
  story: CareerStoryState,
  effect?: CareerStoryEffect,
): CareerStoryState {
  if (!effect) return story
  const next = structuredClone(story)
  if (effect.club) {
    next.club = { ...next.club, ...effect.club }
  }
  if (effect.publicPersona) {
    next.publicPersona = effect.publicPersona
  }
  for (const [key, delta] of Object.entries(effect.tendencyDelta ?? {})) {
    const tendency = key as keyof CareerStoryState['tendencies']
    next.tendencies[tendency] = clampTendency(
      next.tendencies[tendency] + (delta ?? 0),
    )
  }
  return next
}
