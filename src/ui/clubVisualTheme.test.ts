import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { GamePhase, HalfYearReport } from '../models/game'
import { createRetirementVisualAuditGame } from '../testing/createRetirementVisualAuditGame'
import {
  CLUB_VISUAL_THEME_PRESETS,
  contrastRatio,
  effectiveActiveSurface,
  resolveClubVisualTheme,
  themeCssProperties,
} from './clubVisualTheme'

const mainCss = readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8')

function gameAt(phase: GamePhase, selectedClubId: string | null) {
  return {
    ...createRetirementVisualAuditGame(['ita_inter']),
    phase,
    selectedClubId,
  }
}

function reportFor(clubId: string): HalfYearReport {
  const unchanged = { before: 50, after: 50, delta: 0 }
  return {
    fromLabel: '2026年夏季', toLabel: '2026年冬季', clubId, clubName: '上一窗口俱乐部',
    roleBefore: 'ROTATION', roleAfter: 'ROTATION',
    stats: { appearances: 8, starts: 5, minutes: 480, goals: 1, assists: 1, yellowCards: 0, redCards: 0, averageRating: 6.8 },
    attributes: { attack: unchanged, defense: unchanged, physical: unchanged, mental: unchanged },
    states: { form: unchanged, fitness: unchanged, morale: unchanged },
    relations: { coach: unchanged, squad: unchanged, fans: unchanged },
    firstTeam: { attention: unchanged, readiness: unchanged, matchProof: unchanged, coachBacking: unchanged, statusBefore: 'WATCHLIST', statusAfter: 'PROMOTED', outcomeSummary: '上一窗口。' },
    stipendEuro: 0, expenseEuro: 0, cashAfterEuro: 0, injury: null, eventSummary: '无。', hints: [],
  }
}

describe('club visual theme resolver', () => {
  it('uses DEFAULT only for absent, unknown, or retired boundaries', () => {
    expect(resolveClubVisualTheme(null).key).toBe('DEFAULT')
    expect(resolveClubVisualTheme(gameAt('ACADEMY_OFFERS', null)).key).toBe('DEFAULT')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'unknown-club')).key).toBe('DEFAULT')
    expect(resolveClubVisualTheme(gameAt('CAREER_RETIRED', 'eng_arsenal')).key).toBe('DEFAULT')
  })

  it('resolves anchors and compatible workbook IDs through the canonical map', () => {
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'ita_inter')).key).toBe('BLUE_BLACK')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'cn_beijing_yuhua')).key).toBe('GREEN_YELLOW')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'cn_shanghai_donggang')).key).toBe('BLUE_RED')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'ita1_ac_milan')).key).toBe('RED_BLACK')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'ita1_inter')).key).toBe('BLUE_BLACK')
    expect(resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'chn1_beijing_yuhua')).key).toBe('GREEN_YELLOW')
  })

  it('reads selectedClubId only and ignores reports, offers, and transfer targets', () => {
    const academyOffers = gameAt('ACADEMY_OFFERS', null)
    expect(academyOffers.academyOffers).not.toHaveLength(0)
    expect(resolveClubVisualTheme(academyOffers).key).toBe('DEFAULT')

    expect(resolveClubVisualTheme(gameAt('TRANSFER_WINDOW', 'ita_inter')).key).toBe('BLUE_BLACK')
    const conflictingReport = { ...gameAt('TRANSFER_ARRIVAL', 'cn_beijing_yuhua'), lastReport: reportFor('ita_inter') }
    expect(resolveClubVisualTheme(conflictingReport).key).toBe('GREEN_YELLOW')
  })

  it('switches synchronously without mutating GameState', () => {
    const game = gameAt('SPECIAL_EVENT', 'cn_shanghai_donggang')
    const before = structuredClone(game)
    expect(resolveClubVisualTheme(game).key).toBe('BLUE_RED')
    expect(resolveClubVisualTheme({ ...game, selectedClubId: 'ita1_ac_milan' }).key).toBe('RED_BLACK')
    expect(game).toEqual(before)
  })

  it('reuses the immutable preset token object for clubs in the same family', () => {
    const arsenal = resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'eng_arsenal'))
    const bayern = resolveClubVisualTheme(gameAt('HALF_YEAR_PLAN', 'ger_bayern'))
    expect(arsenal.key).toBe('RED_WHITE')
    expect(arsenal.tokens).toBe(bayern.tokens)
    expect(arsenal.tokens).toBe(CLUB_VISUAL_THEME_PRESETS.RED_WHITE.tokens)
  })
})

describe('club visual theme presets', () => {
  it('preserves the four V3 anchor token sets exactly', () => {
    expect(CLUB_VISUAL_THEME_PRESETS.BLUE_BLACK.tokens).toEqual({
      shell: '#0B2346', shellDeep: '#07162D', shellText: '#F7F8FC', shellMuted: '#C8D2E1',
      accent: '#D4A72C', accentAlt: '#164A8A', accentText: '#10223D', paperInk: '#13294B',
      paperMuted: '#5B6574', lineTint: '#B8C4D4', focusRing: '#FFD76A', crestBackdrop: '#102A52',
      buttonPrimary: '#13294B', buttonPrimaryText: '#F7F8FC', activeSurface: 'rgb(212 167 44 / 0.18)',
      activeText: '#FFF3C7', shellPattern: 'none', shellPatternOpacity: '0',
    })
    expect(CLUB_VISUAL_THEME_PRESETS.GREEN_YELLOW.tokens).toEqual({
      shell: '#07552F', shellDeep: '#02351E', shellText: '#FFFDF4', shellMuted: '#D0E1D2',
      accent: '#F2C500', accentAlt: '#0E7A43', accentText: '#18351F', paperInk: '#174B2E',
      paperMuted: '#5C695E', lineTint: '#B9CABB', focusRing: '#FFD84A', crestBackdrop: '#0A4527',
      buttonPrimary: '#174B2E', buttonPrimaryText: '#FFFDF4', activeSurface: 'rgb(242 197 0 / 0.2)',
      activeText: '#FFF8C6', shellPattern: 'none', shellPatternOpacity: '0',
    })
    expect(CLUB_VISUAL_THEME_PRESETS.BLUE_RED.tokens).toEqual({
      shell: '#10283F', shellDeep: '#0C1E31', shellText: '#F7F4EA', shellMuted: '#CFD7DF',
      accent: '#1D5AA6', accentAlt: '#C91D2E', accentText: '#FFFFFF', paperInk: '#163654',
      paperMuted: '#5A6672', lineTint: '#BBC5CF', focusRing: '#F7D24D', crestBackdrop: '#10283F',
      buttonPrimary: '#163654', buttonPrimaryText: '#FFFFFF', activeSurface: 'rgb(29 90 166 / 0.36)',
      activeText: '#FFFFFF',
      shellPattern: 'linear-gradient(90deg, rgb(29 90 166 / var(--club-shell-pattern-opacity)) 0 50%, rgb(201 29 46 / var(--club-shell-pattern-opacity)) 50% 100%)',
      shellPatternOpacity: '0.18',
    })
    expect(CLUB_VISUAL_THEME_PRESETS.RED_BLACK.tokens).toEqual({
      shell: '#19171A', shellDeep: '#101012', shellText: '#FAF7F4', shellMuted: '#D7CCCE',
      accent: '#C92635', accentAlt: '#111112', accentText: '#FFFFFF', paperInk: '#4D1820',
      paperMuted: '#6A5C60', lineTint: '#D1B8BC', focusRing: '#FFD36A', crestBackdrop: '#251317',
      buttonPrimary: '#4D1820', buttonPrimaryText: '#FAF7F4', activeSurface: 'rgb(201 38 53 / 0.25)',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    })
  })

  it('provides complete CSS properties and critical WCAG AA contrast for every preset', () => {
    for (const theme of Object.values(CLUB_VISUAL_THEME_PRESETS)) {
      const css = themeCssProperties(theme)
      expect(Object.values(css).every((value) => value !== undefined && value !== '')).toBe(true)
      expect(contrastRatio(theme.tokens.shellText, theme.tokens.shell)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.tokens.accentText, theme.tokens.accent)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.tokens.paperInk, '#F3F0E8')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.tokens.buttonPrimaryText, theme.tokens.buttonPrimary)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.tokens.activeText, effectiveActiveSurface(theme))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('defines every club CSS variable consumed by the production stylesheet', () => {
    const consumedVariables = new Set(
      [...mainCss.matchAll(/--club-[a-z-]+/g)].map(([variable]) => variable),
    )
    const providedVariables = new Set(Object.keys(themeCssProperties(CLUB_VISUAL_THEME_PRESETS.DEFAULT)))
    expect([...consumedVariables].every((variable) => providedVariables.has(variable))).toBe(true)
  })

  it('does not place fixed semantic colors in the dynamic token registry', () => {
    const tokenText = JSON.stringify(CLUB_VISUAL_THEME_PRESETS)
    expect(tokenText).not.toContain('--semantic-danger')
    expect(tokenText).not.toContain('--semantic-success')
  })
})
