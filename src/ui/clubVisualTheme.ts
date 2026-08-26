import type { CSSProperties } from 'react'
import type { GameState } from '../models/game'
import { resolveClubParametersId } from '../data/clubs/clubRepository'

export type ClubThemeKey =
  | 'DEFAULT'
  | 'ITA_INTER'
  | 'CN_BEIJING_YUHUA'
  | 'CN_SHANGHAI_DONGGANG'
  | 'ITA_AC_MILAN'

export interface ClubVisualThemeTokens {
  shell: string
  shellDeep: string
  shellText: string
  shellMuted: string
  accent: string
  accentAlt: string
  accentText: string
  paperInk: string
  paperMuted: string
  lineTint: string
  focusRing: string
  crestBackdrop: string
  buttonPrimary: string
  buttonPrimaryText: string
  activeSurface: string
  activeText: string
  shellPattern: string
  shellPatternOpacity: string
}

export interface ClubVisualTheme {
  key: ClubThemeKey
  canonicalClubId: string | null
  tokens: Readonly<ClubVisualThemeTokens>
}

export type ClubThemeCssProperties = CSSProperties & Readonly<{
  '--club-shell': string
  '--club-shell-deep': string
  '--club-shell-text': string
  '--club-shell-muted': string
  '--club-accent': string
  '--club-accent-alt': string
  '--club-accent-text': string
  '--club-paper-ink': string
  '--club-paper-muted': string
  '--club-line-tint': string
  '--club-focus-ring': string
  '--club-crest-backdrop': string
  '--club-button-primary': string
  '--club-button-primary-text': string
  '--club-active-surface': string
  '--club-active-text': string
  '--club-shell-pattern': string
  '--club-shell-pattern-opacity': string
}>

function createTheme(
  key: ClubThemeKey,
  canonicalClubId: string | null,
  tokens: ClubVisualThemeTokens,
): ClubVisualTheme {
  return Object.freeze({
    key,
    canonicalClubId,
    tokens: Object.freeze({ ...tokens }),
  })
}

export const DEFAULT_CLUB_VISUAL_THEME = createTheme('DEFAULT', null, {
  shell: '#082C23',
  shellDeep: '#05221B',
  shellText: '#EDE9DE',
  shellMuted: '#B7C1B8',
  accent: '#BD9D56',
  accentAlt: '#0D4939',
  accentText: '#1D291F',
  paperInk: '#12382D',
  paperMuted: '#6F716A',
  lineTint: '#C9C0AD',
  focusRing: '#E2C77F',
  crestBackdrop: '#12382D',
  buttonPrimary: '#12382D',
  buttonPrimaryText: '#D9BC75',
  activeSurface: 'rgb(189 157 86 / 0.12)',
  activeText: '#E2C77F',
  shellPattern: 'none',
  shellPatternOpacity: '0',
})

const CLUB_VISUAL_THEMES_BY_CANONICAL_ID: Readonly<Record<string, ClubVisualTheme>> = {
  ita_inter: createTheme('ITA_INTER', 'ita_inter', {
    shell: '#0B2346',
    shellDeep: '#07162D',
    shellText: '#F7F8FC',
    shellMuted: '#C8D2E1',
    accent: '#D4A72C',
    accentAlt: '#164A8A',
    accentText: '#10223D',
    paperInk: '#13294B',
    paperMuted: '#5B6574',
    lineTint: '#B8C4D4',
    focusRing: '#FFD76A',
    crestBackdrop: '#102A52',
    buttonPrimary: '#13294B',
    buttonPrimaryText: '#F7F8FC',
    activeSurface: 'rgb(212 167 44 / 0.18)',
    activeText: '#FFF3C7',
    shellPattern: 'none',
    shellPatternOpacity: '0',
  }),
  cn_beijing_yuhua: createTheme('CN_BEIJING_YUHUA', 'cn_beijing_yuhua', {
    shell: '#07552F',
    shellDeep: '#02351E',
    shellText: '#FFFDF4',
    shellMuted: '#D0E1D2',
    accent: '#F2C500',
    accentAlt: '#0E7A43',
    accentText: '#18351F',
    paperInk: '#174B2E',
    paperMuted: '#5C695E',
    lineTint: '#B9CABB',
    focusRing: '#FFD84A',
    crestBackdrop: '#0A4527',
    buttonPrimary: '#174B2E',
    buttonPrimaryText: '#FFFDF4',
    activeSurface: 'rgb(242 197 0 / 0.2)',
    activeText: '#FFF8C6',
    shellPattern: 'none',
    shellPatternOpacity: '0',
  }),
  cn_shanghai_donggang: createTheme('CN_SHANGHAI_DONGGANG', 'cn_shanghai_donggang', {
    shell: '#10283F',
    shellDeep: '#0C1E31',
    shellText: '#F7F4EA',
    shellMuted: '#CFD7DF',
    accent: '#1D5AA6',
    accentAlt: '#C91D2E',
    accentText: '#FFFFFF',
    paperInk: '#163654',
    paperMuted: '#5A6672',
    lineTint: '#BBC5CF',
    focusRing: '#F7D24D',
    crestBackdrop: '#10283F',
    buttonPrimary: '#163654',
    buttonPrimaryText: '#FFFFFF',
    activeSurface: 'rgb(29 90 166 / 0.36)',
    activeText: '#FFFFFF',
    shellPattern: 'linear-gradient(90deg, rgb(29 90 166 / var(--club-shell-pattern-opacity)) 0 50%, rgb(201 29 46 / var(--club-shell-pattern-opacity)) 50% 100%)',
    shellPatternOpacity: '0.18',
  }),
  ita1_ac_milan: createTheme('ITA_AC_MILAN', 'ita1_ac_milan', {
    shell: '#19171A',
    shellDeep: '#101012',
    shellText: '#FAF7F4',
    shellMuted: '#D7CCCE',
    accent: '#C92635',
    accentAlt: '#111112',
    accentText: '#FFFFFF',
    paperInk: '#4D1820',
    paperMuted: '#6A5C60',
    lineTint: '#D1B8BC',
    focusRing: '#FFD36A',
    crestBackdrop: '#251317',
    buttonPrimary: '#4D1820',
    buttonPrimaryText: '#FAF7F4',
    activeSurface: 'rgb(201 38 53 / 0.25)',
    activeText: '#FFFFFF',
    shellPattern: 'none',
    shellPatternOpacity: '0',
  }),
}

export const CLUB_VISUAL_THEME_REGISTRY: Readonly<Record<ClubThemeKey, ClubVisualTheme>> = {
  DEFAULT: DEFAULT_CLUB_VISUAL_THEME,
  ITA_INTER: requiredClubTheme('ita_inter'),
  CN_BEIJING_YUHUA: requiredClubTheme('cn_beijing_yuhua'),
  CN_SHANGHAI_DONGGANG: requiredClubTheme('cn_shanghai_donggang'),
  ITA_AC_MILAN: requiredClubTheme('ita1_ac_milan'),
}

function requiredClubTheme(canonicalClubId: string): ClubVisualTheme {
  const theme = CLUB_VISUAL_THEMES_BY_CANONICAL_ID[canonicalClubId]
  if (!theme) throw new Error(`Missing club visual theme for ${canonicalClubId}.`)
  return theme
}

/** Resolves only the current selected club; reports and offers are intentionally ignored. */
export function resolveClubVisualTheme(game: GameState | null): ClubVisualTheme {
  if (!game || game.phase === 'CAREER_RETIRED' || !game.selectedClubId) {
    return DEFAULT_CLUB_VISUAL_THEME
  }

  const canonicalClubId = resolveClubParametersId(game.selectedClubId)
  if (!canonicalClubId) return DEFAULT_CLUB_VISUAL_THEME
  return CLUB_VISUAL_THEMES_BY_CANONICAL_ID[canonicalClubId] ?? DEFAULT_CLUB_VISUAL_THEME
}

export function themeCssProperties(theme: ClubVisualTheme): ClubThemeCssProperties {
  const { tokens } = theme
  return {
    '--club-shell': tokens.shell,
    '--club-shell-deep': tokens.shellDeep,
    '--club-shell-text': tokens.shellText,
    '--club-shell-muted': tokens.shellMuted,
    '--club-accent': tokens.accent,
    '--club-accent-alt': tokens.accentAlt,
    '--club-accent-text': tokens.accentText,
    '--club-paper-ink': tokens.paperInk,
    '--club-paper-muted': tokens.paperMuted,
    '--club-line-tint': tokens.lineTint,
    '--club-focus-ring': tokens.focusRing,
    '--club-crest-backdrop': tokens.crestBackdrop,
    '--club-button-primary': tokens.buttonPrimary,
    '--club-button-primary-text': tokens.buttonPrimaryText,
    '--club-active-surface': tokens.activeSurface,
    '--club-active-text': tokens.activeText,
    '--club-shell-pattern': tokens.shellPattern,
    '--club-shell-pattern-opacity': tokens.shellPatternOpacity,
  }
}

function channelLuminance(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

/** Supports the opaque hexadecimal tokens used by the club theme registry. */
export function contrastRatio(foreground: string, background: string): number {
  const parse = (value: string): readonly [number, number, number] => {
    const match = /^#([0-9a-f]{6})$/i.exec(value)
    const hex = match?.[1]
    if (!hex) throw new Error(`Expected a six-digit hexadecimal color, received ${value}.`)
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ]
  }
  const weightedLuminance = (value: string): number => {
    const [red, green, blue] = parse(value)
    return channelLuminance(red) * 0.2126
      + channelLuminance(green) * 0.7152
      + channelLuminance(blue) * 0.0722
  }
  const foregroundLuminance = weightedLuminance(foreground)
  const backgroundLuminance = weightedLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}
