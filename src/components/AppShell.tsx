import type { ReactNode } from 'react'
import { Brand } from './Brand'
import { Icon, type IconName } from './Icons'

const navItems: Array<{ label: string; icon: IconName; active?: boolean }> = [
  { label: '生涯', icon: 'career', active: true },
  { label: '球员', icon: 'player' },
  { label: '履历', icon: 'history' },
  { label: '设置', icon: 'settings' },
]

export function AppShell({
  topbar,
  children,
}: {
  topbar: ReactNode
  children: ReactNode
}) {
  return (
    <main className="app-frame">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="游戏导航" className="sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`sidebar__item${item.active ? ' is-active' : ''}`}
              disabled={!item.active}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__pitch" aria-hidden="true">
          <span />
        </div>
        <div className="sidebar__save">
          <span>进度已自动保存</span>
          <small>本地生涯存档</small>
        </div>
      </aside>
      <section className="app-surface">
        <header className="topbar">{topbar}</header>
        {children}
      </section>
      <nav className="mobile-nav" aria-label="手机游戏导航">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={item.active ? 'is-active' : ''}
            disabled={!item.active}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}
