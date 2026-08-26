import { describe, expect, it } from 'vitest'
import type { GamePhase, HalfYearReport } from '../models/game'
import { createRetirementVisualAuditGame } from '../testing/createRetirementVisualAuditGame'
import {
  CLUB_VISUAL_THEME_REGISTRY,
  contrastRatio,
  resolveClubVisualTheme,
  themeCssProperties,
} from './clubVisualTheme'

function gameAt(
  phase: GamePhase,
  selectedClubId: string | null,
) {
  return {
    ...createRetirementVisualAuditGame(['ita_inter']),
    phase,
    selectedClubId,
  }
}

function reportFor(clubId: string): HalfYearReport {
  const unchanged = { before: 50, after: 50, delta: 0 }
  return {
    fromLabel: '2026年夏季',
    toLabel: '2026年冬季',
    clubId,
    clubName: '上一窗口俱乐部',
    roleBefore: 'ROTATION',
    roleAfter: 'ROTATION',
    stats: { appearances: 8, starts: 5, minutes: 480, goals: 1, assists: 1, yellowCards: 0, redCards: 0, averageRating: 6.8 },
    attributes: { attack: unchanged, defense: unchanged, physical: unchanged, mental: unchanged },
    states: { form: unchanged, fitness: unchanged, morale: unchanged },
    relations: { coach: unchanged, squad: unchanged, fans: unchanged },
    firstTeam: {
      attention: unchanged,
      readiness: unchanged,
      matchProof: unchanged,
      coachBacking: unchanged,
      statusBefore: 'WATCHLIST',
      statusAfter: 'PROMOTED',
      outcomeSummary: '上一窗口。',
    },
    stipendEuro: 0,
    expenseEuro: 0,
    cashAfterEuro: 0,
    injury: null,
    eventSummary: '无。',
    hints: [],
  }
}

describe('club visual theme resolver', () => {
  it('uses DEFAULT for missing, unselected, unknown, or legal unregistered clubs', () => {
    expect(resolveClubVisualTheme(null).key).toBe('DEFAULT')
    expect(resolveClubVisualTheme(gameAt('ACADEMY_OFFERS', null)).key).toBe('DEFAULT')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'unknown-club')).key).toBe('DEFAULT')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'eng_arsenal')).key).toBe('DEFAULT')
  })

  it('resolves only the four registered canonical identities and compatible workbook IDs', () => {
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'ita_inter')).key).toBe('ITA_INTER')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'cn_beijing_yuhua')).key).toBe('CN_BEIJING_YUHUA')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'cn_shanghai_donggang')).key).toBe('CN_SHANGHAI_DONGGANG')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'ita1_ac_milan')).key).toBe('ITA_AC_MILAN')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'ita1_inter')).key).toBe('ITA_INTER')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'chn1_beijing_yuhua')).key).toBe('CN_BEIJING_YUHUA')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'chn1_shanghai_donggang')).key).toBe('CN_SHANGHAI_DONGGANG')
  })

  it('ignores academy candidates, historical reports, and unconfirmed transfer targets', () => {
    const academyOffers = gameAt('ACADEMY_OFFERS', null)
    expect(academyOffers.academyOffers).not.toHaveLength(0)
    expect(resolveClubVisualTheme(academyOffers).key).toBe('DEFAULT')

    const transferWindow = gameAt('TRANSFER_WINDOW', 'ita_inter')
    expect(resolveClubVisualTheme(transferWindow).key).toBe('ITA_INTER')

    const conflictingReport = {
      ...gameAt('TRANSFER_ARRIVAL', 'cn_beijing_yuhua'),
      lastReport: reportFor('ita_inter'),
    }
    expect(resolveClubVisualTheme(conflictingReport).key).toBe('CN_BEIJING_YUHUA')
  })

  it('switches synchronously when selectedClubId changes and keeps the retired archive default', () => {
    expect(resolveClubVisualTheme(gameAt('ARRIVAL_EVENT', 'cn_beijing_yuhua')).key)
      .toBe('CN_BEIJING_YUHUA')
    expect(resolveClubVisualTheme(gameAt('TRANSFER_ARRIVAL', 'ita1_ac_milan')).key)
      .toBe('ITA_AC_MILAN')
    expect(resolveClubVisualTheme(gameAt('RETIREMENT_DECISION', 'ita_inter')).key).toBe('ITA_INTER')
    expect(resolveClubVisualTheme(gameAt('CAREER_RETIRED', 'ita_inter')).key).toBe('DEFAULT')
  })

  it('is deterministic and does not mutate the input state', () => {
    const game = gameAt('SPECIAL_EVENT', 'cn_shanghai_donggang')
    const before = structuredClone(game)
    expect(resolveClubVisualTheme(game)).toEqual(resolveClubVisualTheme(game))
    expect(game).toEqual(before)
  })
})

describe('club visual theme tokens', () => {
  it('provides complete named CSS properties for every registered theme', () => {
    for (const theme of Object.values(CLUB_VISUAL_THEME_REGISTRY)) {
      const css = themeCssProperties(theme)
      expect(Object.values(css).every((value) => value !== undefined && value !== '')).toBe(true)
      expect(css['--club-shell']).toBe(theme.tokens.shell)
      expect(css['--club-accent']).toBe(theme.tokens.accent)
    }
  })

  it('keeps critical text combinations at WCAG AA contrast or better', () => {
    for (const theme of Object.values(CLUB_VISUAL_THEME_REGISTRY)) {
      expect(contrastRatio(theme.tokens.shellText, theme.tokens.shell)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.tokens.accentText, theme.tokens.accent)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.tokens.paperInk, '#F3F0E8')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.tokens.buttonPrimaryText, theme.tokens.buttonPrimary)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps semantic colors outside the dynamic theme registry', () => {
    const tokenText = JSON.stringify(CLUB_VISUAL_THEME_REGISTRY)
    expect(tokenText).not.toContain('--semantic-danger')
    expect(tokenText).not.toContain('--semantic-success')
  })
})
