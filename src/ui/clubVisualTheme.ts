import type { CSSProperties } from 'react'
import type { GameState } from '../models/game'
import {
  CLUB_THEME_PRESET_BY_CANONICAL_ID,
  type ClubThemePresetKey,
} from '../data/clubs/clubThemeAssignments'
import { resolveClubParametersId } from '../data/clubs/clubRepository'

export type ClubThemeKey = 'DEFAULT' | ClubThemePresetKey

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

function createPreset(key: ClubThemeKey, tokens: ClubVisualThemeTokens): ClubVisualTheme {
  return Object.freeze({
    key,
    canonicalClubId: null,
    tokens: Object.freeze({ ...tokens }),
  })
}

/** Fixed no-club and retirement-archive boundary; never selected for a known club. */
export const DEFAULT_CLUB_VISUAL_THEME = createPreset('DEFAULT', {
  shell: '#082C23', shellDeep: '#05221B', shellText: '#EDE9DE', shellMuted: '#B7C1B8',
  accent: '#BD9D56', accentAlt: '#0D4939', accentText: '#1D291F', paperInk: '#12382D',
  paperMuted: '#6F716A', lineTint: '#C9C0AD', focusRing: '#E2C77F', crestBackdrop: '#12382D',
  buttonPrimary: '#12382D', buttonPrimaryText: '#D9BC75', activeSurface: 'rgb(189 157 86 / 0.12)',
  activeText: '#E2C77F', shellPattern: 'none', shellPatternOpacity: '0',
})

/** Four V3 anchors retain their exact token values; other clubs share preset tokens. */
export const CLUB_VISUAL_THEME_PRESETS: Readonly<Record<ClubThemeKey, ClubVisualTheme>> =
  Object.freeze({
    DEFAULT: DEFAULT_CLUB_VISUAL_THEME,
    BLUE_BLACK: createPreset('BLUE_BLACK', {
      shell: '#0B2346', shellDeep: '#07162D', shellText: '#F7F8FC', shellMuted: '#C8D2E1',
      accent: '#D4A72C', accentAlt: '#164A8A', accentText: '#10223D', paperInk: '#13294B',
      paperMuted: '#5B6574', lineTint: '#B8C4D4', focusRing: '#FFD76A', crestBackdrop: '#102A52',
      buttonPrimary: '#13294B', buttonPrimaryText: '#F7F8FC', activeSurface: 'rgb(212 167 44 / 0.18)',
      activeText: '#FFF3C7', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    BLACK_WHITE: createPreset('BLACK_WHITE', {
      shell: '#F3F1EA', shellDeep: '#DDE2DD', shellText: '#192622', shellMuted: '#56645E',
      accent: '#1B2724', accentAlt: '#CBD4CD', accentText: '#FFFFFF', paperInk: '#1B2A25',
      paperMuted: '#66716C', lineTint: '#AEB9B1', focusRing: '#0A6D57', crestBackdrop: '#23322C',
      buttonPrimary: '#1B2724', buttonPrimaryText: '#FFFFFF', activeSurface: '#D3DDD6',
      activeText: '#15231D', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    SKY_BLUE: createPreset('SKY_BLUE', {
      shell: '#0B3556', shellDeep: '#072842', shellText: '#F7FBFD', shellMuted: '#CEE0EA',
      accent: '#78C8EF', accentAlt: '#1C668B', accentText: '#102B42', paperInk: '#163D58',
      paperMuted: '#5B6C78', lineTint: '#B7CCD7', focusRing: '#AEE7FF', crestBackdrop: '#123E60',
      buttonPrimary: '#123E60', buttonPrimaryText: '#FFFFFF', activeSurface: '#1C668B',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    ROYAL_BLUE: createPreset('ROYAL_BLUE', {
      shell: '#19468A', shellDeep: '#12326A', shellText: '#FAFCFF', shellMuted: '#D0DCF3',
      accent: '#B9D8FF', accentAlt: '#0F356F', accentText: '#102D5B', paperInk: '#173C78',
      paperMuted: '#5A6B80', lineTint: '#B7C8DD', focusRing: '#D7EBFF', crestBackdrop: '#193E7A',
      buttonPrimary: '#153D7B', buttonPrimaryText: '#FFFFFF', activeSurface: '#0F356F',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    RED_BLACK: createPreset('RED_BLACK', {
      shell: '#19171A', shellDeep: '#101012', shellText: '#FAF7F4', shellMuted: '#D7CCCE',
      accent: '#C92635', accentAlt: '#111112', accentText: '#FFFFFF', paperInk: '#4D1820',
      paperMuted: '#6A5C60', lineTint: '#D1B8BC', focusRing: '#FFD36A', crestBackdrop: '#251317',
      buttonPrimary: '#4D1820', buttonPrimaryText: '#FAF7F4', activeSurface: 'rgb(201 38 53 / 0.25)',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    RED_WHITE: createPreset('RED_WHITE', {
      shell: '#8B1A2A', shellDeep: '#62101B', shellText: '#FFF9F7', shellMuted: '#E9CED2',
      accent: '#F1D2D6', accentAlt: '#A92335', accentText: '#4C0F19', paperInk: '#661322',
      paperMuted: '#746066', lineTint: '#D8BEC2', focusRing: '#FFD2D9', crestBackdrop: '#731727',
      buttonPrimary: '#721524', buttonPrimaryText: '#FFFFFF', activeSurface: '#A92335',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    BLUE_RED: createPreset('BLUE_RED', {
      shell: '#10283F', shellDeep: '#0C1E31', shellText: '#F7F4EA', shellMuted: '#CFD7DF',
      accent: '#1D5AA6', accentAlt: '#C91D2E', accentText: '#FFFFFF', paperInk: '#163654',
      paperMuted: '#5A6672', lineTint: '#BBC5CF', focusRing: '#F7D24D', crestBackdrop: '#10283F',
      buttonPrimary: '#163654', buttonPrimaryText: '#FFFFFF', activeSurface: 'rgb(29 90 166 / 0.36)',
      activeText: '#FFFFFF',
      shellPattern: 'linear-gradient(90deg, rgb(29 90 166 / var(--club-shell-pattern-opacity)) 0 50%, rgb(201 29 46 / var(--club-shell-pattern-opacity)) 50% 100%)',
      shellPatternOpacity: '0.18',
    }),
    GREEN_YELLOW: createPreset('GREEN_YELLOW', {
      shell: '#07552F', shellDeep: '#02351E', shellText: '#FFFDF4', shellMuted: '#D0E1D2',
      accent: '#F2C500', accentAlt: '#0E7A43', accentText: '#18351F', paperInk: '#174B2E',
      paperMuted: '#5C695E', lineTint: '#B9CABB', focusRing: '#FFD84A', crestBackdrop: '#0A4527',
      buttonPrimary: '#174B2E', buttonPrimaryText: '#FFFDF4', activeSurface: 'rgb(242 197 0 / 0.2)',
      activeText: '#FFF8C6', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    YELLOW_BLACK: createPreset('YELLOW_BLACK', {
      shell: '#23241E', shellDeep: '#171813', shellText: '#FFFDF5', shellMuted: '#D8D3BD',
      accent: '#F2C500', accentAlt: '#4D4824', accentText: '#1F241C', paperInk: '#303020',
      paperMuted: '#6E6B55', lineTint: '#D3CBA8', focusRing: '#FFE37A', crestBackdrop: '#302F1F',
      buttonPrimary: '#303020', buttonPrimaryText: '#FFFFFF', activeSurface: '#4D4824',
      activeText: '#FFF8C6', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    CLARET_BLUE: createPreset('CLARET_BLUE', {
      shell: '#5C2035', shellDeep: '#3F1425', shellText: '#FFF9F7', shellMuted: '#E5CCD4',
      accent: '#82BBD0', accentAlt: '#214F6A', accentText: '#102F42', paperInk: '#62253A',
      paperMuted: '#725D66', lineTint: '#D6BBC5', focusRing: '#C6EDFC', crestBackdrop: '#532035',
      buttonPrimary: '#62253A', buttonPrimaryText: '#FFFFFF', activeSurface: '#214F6A',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    ORANGE: createPreset('ORANGE', {
      shell: '#402818', shellDeep: '#2C1A0E', shellText: '#FFF9F4', shellMuted: '#E6D3C4',
      accent: '#E47A2E', accentAlt: '#82451D', accentText: '#351A09', paperInk: '#7B3513',
      paperMuted: '#746258', lineTint: '#D8C1B0', focusRing: '#FFD39B', crestBackdrop: '#4C2C18',
      buttonPrimary: '#783411', buttonPrimaryText: '#FFFFFF', activeSurface: '#82451D',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    PURPLE_PINK: createPreset('PURPLE_PINK', {
      shell: '#3B214E', shellDeep: '#281336', shellText: '#FFF9FE', shellMuted: '#E2D3E8',
      accent: '#CA8AE3', accentAlt: '#693A86', accentText: '#321546', paperInk: '#512367',
      paperMuted: '#6C5F72', lineTint: '#D3BDDB', focusRing: '#EDC7FF', crestBackdrop: '#43235A',
      buttonPrimary: '#512367', buttonPrimaryText: '#FFFFFF', activeSurface: '#693A86',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    YELLOW_BLUE: createPreset('YELLOW_BLUE', {
      shell: '#102B55', shellDeep: '#091C3B', shellText: '#FFFDF5', shellMuted: '#D7E0EE',
      accent: '#F2C500', accentAlt: '#1F4D86', accentText: '#1B2E45', paperInk: '#183D70',
      paperMuted: '#5D6B7C', lineTint: '#BDCAE0', focusRing: '#FFE37A', crestBackdrop: '#153660',
      buttonPrimary: '#183D70', buttonPrimaryText: '#FFFFFF', activeSurface: '#1F4D86',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
    RED_GOLD: createPreset('RED_GOLD', {
      shell: '#621927', shellDeep: '#42101A', shellText: '#FFF9F1', shellMuted: '#E8D5C9',
      accent: '#E4B945', accentAlt: '#8E361E', accentText: '#3A1A08', paperInk: '#6C1B28',
      paperMuted: '#705E58', lineTint: '#D7C0B4', focusRing: '#FFE28A', crestBackdrop: '#651D29',
      buttonPrimary: '#6C1B28', buttonPrimaryText: '#FFFFFF', activeSurface: '#8E361E',
      activeText: '#FFFFFF', shellPattern: 'none', shellPatternOpacity: '0',
    }),
  })

const CLUB_VISUAL_THEMES_BY_CANONICAL_ID: Readonly<Record<string, ClubVisualTheme>> =
  Object.freeze(Object.fromEntries(
    Object.entries(CLUB_THEME_PRESET_BY_CANONICAL_ID).map(([canonicalClubId, presetKey]) => {
      const preset = CLUB_VISUAL_THEME_PRESETS[presetKey]
      return [canonicalClubId, Object.freeze({
        key: preset.key,
        canonicalClubId,
        tokens: preset.tokens,
      })]
    }),
  ))

/** Resolves only the selected club; reports, offers, and transfer targets are ignored. */
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
    '--club-shell': tokens.shell, '--club-shell-deep': tokens.shellDeep,
    '--club-shell-text': tokens.shellText, '--club-shell-muted': tokens.shellMuted,
    '--club-accent': tokens.accent, '--club-accent-alt': tokens.accentAlt,
    '--club-accent-text': tokens.accentText, '--club-paper-ink': tokens.paperInk,
    '--club-paper-muted': tokens.paperMuted, '--club-line-tint': tokens.lineTint,
    '--club-focus-ring': tokens.focusRing, '--club-crest-backdrop': tokens.crestBackdrop,
    '--club-button-primary': tokens.buttonPrimary, '--club-button-primary-text': tokens.buttonPrimaryText,
    '--club-active-surface': tokens.activeSurface, '--club-active-text': tokens.activeText,
    '--club-shell-pattern': tokens.shellPattern, '--club-shell-pattern-opacity': tokens.shellPatternOpacity,
  }
}

type Rgb = readonly [number, number, number]

function channelLuminance(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

function parseOpaqueHex(value: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(value)
  const hex = match?.[1]
  if (!hex) throw new Error(`Expected a six-digit hexadecimal color, received ${value}.`)
  return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)]
}

function colorLuminance(value: string): number {
  const [red, green, blue] = parseOpaqueHex(value)
  return channelLuminance(red) * 0.2126 + channelLuminance(green) * 0.7152 + channelLuminance(blue) * 0.0722
}

/** Supports opaque hexadecimal colors used by the theme tokens. */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(colorLuminance(foreground), colorLuminance(background))
  const darker = Math.min(colorLuminance(foreground), colorLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

/** Resolves opaque or rgb alpha active surfaces against their actual shell backing. */
export function effectiveActiveSurface(theme: ClubVisualTheme): string {
  const rgb = /^rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\)$/.exec(theme.tokens.activeSurface)
  if (!rgb) return theme.tokens.activeSurface
  const background = parseOpaqueHex(theme.tokens.shell)
  const [, redText, greenText, blueText, alphaText] = rgb
  if (!redText || !greenText || !blueText || !alphaText) return theme.tokens.activeSurface
  const alpha = Number.parseFloat(alphaText)
  const red = Math.round(Number.parseInt(redText, 10) * alpha + background[0] * (1 - alpha))
  const green = Math.round(Number.parseInt(greenText, 10) * alpha + background[1] * (1 - alpha))
  const blue = Math.round(Number.parseInt(blueText, 10) * alpha + background[2] * (1 - alpha))
  const blended: Rgb = [red, green, blue]
  return `#${blended.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}
