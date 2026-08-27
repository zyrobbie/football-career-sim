import type { ReactNode } from 'react'
import { Brand } from './Brand'
import { Icon } from './Icons'
import {
  careerNavPresentation,
  CAREER_NAV_ITEMS,
  useCareerNavigation,
} from '../app/careerNavigation'
import { useClubVisualTheme } from '../app/ClubVisualThemeProvider'
import { themeCssProperties } from '../ui/clubVisualTheme'

function NavigationButton({
  item,
  mobile = false,
}: {
  item: (typeof CAREER_NAV_ITEMS)[number]
  mobile?: boolean
}) {
  const { activeNav, selectNav } = useCareerNavigation()
  const active = activeNav === item.key
  const presentation = careerNavPresentation(activeNav, item)
  const className = mobile
    ? active ? 'is-active' : ''
    : `sidebar__item${active ? ' is-active' : ''}`
  return (
    <button
      type="button"
      className={className}
      disabled={presentation.disabled}
      aria-current={presentation.ariaCurrent}
      onClick={() => selectNav(item.key)}
    >
      <Icon name={item.icon} />
      <span>{item.label}</span>
    </button>
  )
}

export function AppShell({
  topbar,
  children,
}: {
  topbar: ReactNode
  children: ReactNode
}) {
  const theme = useClubVisualTheme()
  return (
    <main
      className="app-frame"
      data-club-theme={theme.key}
      style={themeCssProperties(theme)}
    >
      <aside className="sidebar">
        <Brand />
        <nav aria-label="主导航" className="sidebar__nav">
          {CAREER_NAV_ITEMS.map((item) => <NavigationButton key={item.key} item={item} />)}
        </nav>
        <div className="sidebar__pitch" aria-hidden="true">
          <span />
        </div>
        <div className="sidebar__save">
          <span>进度已自动保存</span>
          <small>本机存档</small>
        </div>
      </aside>
      <section className="app-surface">
        <header className="topbar">{topbar}</header>
        {children}
      </section>
      <nav className="mobile-nav" aria-label="移动端主导航">
        {CAREER_NAV_ITEMS.map((item) => <NavigationButton key={item.key} item={item} mobile />)}
      </nav>
    </main>
  )
}
