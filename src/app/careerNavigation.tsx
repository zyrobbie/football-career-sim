import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import type { GamePhase } from '../models/game'

export type CareerNavKey = 'CAREER' | 'PLAYER' | 'HISTORY' | 'SETTINGS'

interface CareerNavigationValue {
  activeNav: CareerNavKey
  selectNav: (key: CareerNavKey) => void
}

const CareerNavigationContext = createContext<CareerNavigationValue | null>(null)

function CareerNavigationState({ children }: { children: ReactNode }) {
  const [activeNav, setActiveNav] = useState<CareerNavKey>('CAREER')
  const selectNav = useCallback((key: CareerNavKey) => {
    setActiveNav((current) => nextCareerNav(current, key))
    window.scrollTo(0, 0)
  }, [])

  return (
    <CareerNavigationContext.Provider value={{ activeNav, selectNav }}>
      {children}
    </CareerNavigationContext.Provider>
  )
}

export function CareerNavigationProvider({
  careerKey,
  children,
}: {
  careerKey: string
  children: ReactNode
}) {
  return <CareerNavigationState key={careerKey}>{children}</CareerNavigationState>
}

/** A career owns its view-only tab state; no career means the default tab. */
export function careerNavigationKey(careerSeed: string | undefined): string {
  return careerSeed ?? 'no-career'
}

export function useCareerNavigation(): CareerNavigationValue {
  const value = useContext(CareerNavigationContext)
  if (!value) {
    throw new Error('useCareerNavigation must be used within CareerNavigationProvider.')
  }
  return value
}

export const CAREER_NAV_ITEMS: readonly {
  key: CareerNavKey
  label: string
  icon: import('../components/Icons').IconName
  enabled: boolean
}[] = [
  { key: 'CAREER', label: '生涯', icon: 'career', enabled: true },
  { key: 'PLAYER', label: '球员', icon: 'player', enabled: true },
  { key: 'HISTORY', label: '履历', icon: 'history', enabled: true },
  { key: 'SETTINGS', label: '设置', icon: 'settings', enabled: true },
]

export function nextCareerNav(
  current: CareerNavKey,
  requested: CareerNavKey,
): CareerNavKey {
  return CAREER_NAV_ITEMS.find((item) => item.key === requested)?.enabled
    ? requested
    : current
}

export function careerNavPresentation(
  activeNav: CareerNavKey,
  item: (typeof CAREER_NAV_ITEMS)[number],
): { disabled: boolean; ariaCurrent: 'page' | undefined } {
  return {
    disabled: !item.enabled,
    ariaCurrent: activeNav === item.key ? 'page' : undefined,
  }
}

const CAREER_NAVIGATION_PHASES = new Set<GamePhase>([
  'ACADEMY_OFFERS',
  'ARRIVAL_EVENT',
  'HALF_YEAR_PLAN',
  'SPECIAL_EVENT',
  'SPECIAL_EVENT_RESULT',
  'SIMULATION_READY',
  'HALF_YEAR_REPORT',
  'CAREER_DASHBOARD',
  'PRO_CONTRACT_OFFER',
  'PRO_CONTRACT_COMPLETE',
  'PRO_STAGE_COMPLETE',
  'TRANSFER_WINDOW',
  'TRANSFER_ARRIVAL',
  'TRANSFER_STAGE_COMPLETE',
  'RETIREMENT_DECISION',
])

export function canUseCareerNavigation(phase: GamePhase | undefined): boolean {
  return phase !== undefined && CAREER_NAVIGATION_PHASES.has(phase)
}
