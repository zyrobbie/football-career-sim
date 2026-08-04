import { describe, expect, it } from 'vitest'
import {
  applyCareerStoryEffect,
  createCareerStoryState,
  ensureStoryClub,
  resetClubStory,
} from '../careerStory'

describe('career story state', () => {
  it('keeps a small set of persistent tendencies within 0 to 5', () => {
    const story = createCareerStoryState('club-a')
    const raised = applyCareerStoryEffect(story, {
      publicPersona: 'TEAM_FIRST',
      tendencyDelta: { leadership: 9, diplomacy: 2 },
    })
    const lowered = applyCareerStoryEffect(raised, {
      tendencyDelta: { leadership: -9 },
    })

    expect(raised.publicPersona).toBe('TEAM_FIRST')
    expect(raised.tendencies.leadership).toBe(5)
    expect(raised.tendencies.diplomacy).toBe(2)
    expect(lowered.tendencies.leadership).toBe(0)
  })

  it('resets club-local stories after a transfer but preserves career identity', () => {
    const story = applyCareerStoryEffect(createCareerStoryState('club-a'), {
      club: {
        leadership: 'CAPTAIN',
        rivalry: 'HEALTHY',
        mentorship: 'MENTOR',
      },
      publicPersona: 'LOW_KEY',
      tendencyDelta: { leadership: 4, professionalism: 3 },
    })
    const transferred = resetClubStory(story, 'club-b')

    expect(transferred.club).toEqual({
      clubId: 'club-b',
      leadership: 'NONE',
      rivalry: 'NONE',
      mentorship: 'NONE',
    })
    expect(transferred.publicPersona).toBe('LOW_KEY')
    expect(transferred.tendencies.leadership).toBe(4)
    expect(transferred.tendencies.professionalism).toBe(3)
    expect(ensureStoryClub(transferred, 'club-b')).toBe(transferred)
  })
})
