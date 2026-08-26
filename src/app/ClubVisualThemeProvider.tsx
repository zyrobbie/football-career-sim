import { createContext, useContext, type ReactNode } from 'react'
import type { GameState } from '../models/game'
import {
  resolveClubVisualTheme,
  type ClubVisualTheme,
} from '../ui/clubVisualTheme'

const ClubVisualThemeContext = createContext<ClubVisualTheme | null>(null)

export function ClubVisualThemeProvider({
  game,
  children,
}: {
  game: GameState | null
  children: ReactNode
}) {
  const theme = resolveClubVisualTheme(game)
  return (
    <ClubVisualThemeContext.Provider value={theme}>
      {children}
    </ClubVisualThemeContext.Provider>
  )
}

export function useClubVisualTheme(): ClubVisualTheme {
  const theme = useContext(ClubVisualThemeContext)
  if (!theme) {
    throw new Error('useClubVisualTheme must be used within ClubVisualThemeProvider.')
  }
  return theme
}
