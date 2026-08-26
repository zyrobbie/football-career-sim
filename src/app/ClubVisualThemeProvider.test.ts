import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appShellSource = readFileSync(new URL('../components/AppShell.tsx', import.meta.url), 'utf8')
const providerSource = readFileSync(new URL('./ClubVisualThemeProvider.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8')

describe('club visual theme shell boundary', () => {
  it('places theme data and custom properties only on the AppShell frame', () => {
    expect(appShellSource).toContain('data-club-theme={theme.key}')
    expect(appShellSource).toContain('style={themeCssProperties(theme)}')
    expect(appShellSource).not.toContain('document.')
    expect(providerSource).not.toContain('document.')
    expect(providerSource).not.toContain('localStorage')
    expect(providerSource).not.toContain('useEffect')
  })

  it('defines complete scoped and fixed semantic CSS token boundaries', () => {
    for (const token of [
      '--club-shell',
      '--club-accent',
      '--club-paper-ink',
      '--club-focus-ring',
      '--club-shell-pattern',
      '--semantic-success',
      '--semantic-danger',
      '--semantic-warning',
      '--gold-dark',
      '--gold-soft',
      '--ink-soft',
      '--negative',
    ]) {
      expect(styles).toContain(token)
    }
    expect(styles).toContain('.app-frame .club-crest[data-crest-state="fallback"]')
    expect(styles).toContain('--negative: var(--semantic-danger)')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
