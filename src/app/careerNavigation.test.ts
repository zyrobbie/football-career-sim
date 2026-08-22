import { describe, expect, it } from 'vitest'
import {
  canUseCareerNavigation,
  careerNavigationKey,
  careerNavPresentation,
  CAREER_NAV_ITEMS,
  nextCareerNav,
} from './careerNavigation'

describe('career navigation V1', () => {
  it('enables all four read-only career navigation destinations', () => {
    expect(CAREER_NAV_ITEMS.map(({ key, enabled }) => [key, enabled])).toEqual([
      ['CAREER', true],
      ['PLAYER', true],
      ['HISTORY', true],
      ['SETTINGS', true],
    ])
    expect(nextCareerNav('CAREER', 'PLAYER')).toBe('PLAYER')
    expect(nextCareerNav('PLAYER', 'HISTORY')).toBe('HISTORY')
    expect(nextCareerNav('HISTORY', 'SETTINGS')).toBe('SETTINGS')
  })

  it('opens player navigation only on phases that already render CareerHub', () => {
    expect(canUseCareerNavigation('HALF_YEAR_PLAN')).toBe(true)
    expect(canUseCareerNavigation('SPECIAL_EVENT')).toBe(true)
    expect(canUseCareerNavigation('TRANSFER_WINDOW')).toBe(true)
    expect(canUseCareerNavigation('RETIREMENT_DECISION')).toBe(true)
    expect(canUseCareerNavigation('CREATE_IDENTITY')).toBe(false)
    expect(canUseCareerNavigation('PLAYER_REVEAL')).toBe(false)
    expect(canUseCareerNavigation('CAREER_RETIRED')).toBe(false)
  })

  it('keeps active and aria-current presentation aligned for both navigation surfaces', () => {
    const career = CAREER_NAV_ITEMS[0]!
    const player = CAREER_NAV_ITEMS[1]!
    const history = CAREER_NAV_ITEMS[2]!
    const settings = CAREER_NAV_ITEMS[3]!

    expect(careerNavPresentation('PLAYER', career)).toEqual({
      disabled: false,
      ariaCurrent: undefined,
    })
    expect(careerNavPresentation('PLAYER', player)).toEqual({
      disabled: false,
      ariaCurrent: 'page',
    })
    expect(careerNavPresentation('PLAYER', history)).toEqual({
      disabled: false,
      ariaCurrent: undefined,
    })
    expect(careerNavPresentation('PLAYER', settings)).toEqual({
      disabled: false,
      ariaCurrent: undefined,
    })
    expect(careerNavPresentation('HISTORY', history)).toEqual({
      disabled: false,
      ariaCurrent: 'page',
    })
    expect(careerNavPresentation('SETTINGS', settings)).toEqual({
      disabled: false,
      ariaCurrent: 'page',
    })
  })

  it('uses a fresh UI navigation key for each career and after deletion', () => {
    expect(careerNavigationKey('career-one')).toBe('career-one')
    expect(careerNavigationKey('career-two')).toBe('career-two')
    expect(careerNavigationKey('career-one')).not.toBe(careerNavigationKey('career-two'))
    expect(careerNavigationKey(undefined)).toBe('no-career')
  })
})
