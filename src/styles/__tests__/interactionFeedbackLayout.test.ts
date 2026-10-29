import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const css = readFileSync(new URL('../main.css', import.meta.url), 'utf8')
const phase1 = readFileSync(new URL('../phase1.css', import.meta.url), 'utf8')
const screen = readFileSync(new URL('../../screens/SpecialEventScreen.tsx', import.meta.url), 'utf8')
// Scope event typography assertions to its patch, not unrelated later viewer styles.
const patch = css.slice(css.indexOf('/* Shared compact event scale:')).split('/* V3.1.1:')[0]!
describe('user feedback: compact horizontal choices and unified scale', () => {
  it('uses actual visible option count, including both multistep stages', () => {
    expect(screen).toContain("'--event-choice-count': setup.options.length")
    expect(screen).toContain("'--event-choice-count': visibleChoices.length")
    expect(patch).toContain('grid-template-columns: repeat(var(--event-choice-count, 3), minmax(0, 1fr))')
    expect(css).not.toContain('.v3-event .special-event__choices { grid-template-columns: minmax(0,1fr)')
  })
  it('keeps complete copy in details and readable horizontal choice labels', () => {
    expect(screen).toContain('查看各选项的完整说明')
    expect(screen).toContain('{option.description}')
    expect(phase1).toContain('.special-event__choices strong { font-size: var(--font-body)')
    expect(phase1).toContain('.special-event__choices em, .special-event__choices small')
    expect(patch).not.toContain('overflow: hidden')
    expect(patch).not.toContain('line-clamp')
  })
  it('uses saved result headings rather than relabeling historical choices', () => {
    expect(screen).toContain('record?.eventTitle ?? event.title')
    expect(screen).toContain('qualitativeEventPreview(choice.effectPreview)')
    expect(screen).toContain('record.cashDeltaEuro.toLocaleString()')
  })
})
