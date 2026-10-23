import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const css = readFileSync(new URL('../main.css', import.meta.url), 'utf8')
const screen = readFileSync(new URL('../../screens/SpecialEventScreen.tsx', import.meta.url), 'utf8')
const patch = css.slice(css.indexOf('/* Shared compact event scale:'))
describe('user feedback: compact horizontal choices and unified scale', () => {
  it('uses actual visible option count, including both multistep stages', () => {
    expect(screen).toContain("'--event-choice-count': setup.options.length")
    expect(screen).toContain("'--event-choice-count': visibleChoices.length")
    expect(patch).toContain('grid-template-columns: repeat(var(--event-choice-count, 3), minmax(0, 1fr))')
    expect(css).not.toContain('.v3-event .special-event__choices { grid-template-columns: minmax(0,1fr)')
  })
  it('keeps complete supporting copy and compact shared mobile typography', () => {
    expect(patch).toContain('.special-event__choices small { font-size: 10px;')
    expect(patch).toContain('.special-event__choices em { font-size: 10px;')
    expect(patch).toContain('.special-event__choices strong { font-size: 11px;')
    expect(patch).not.toContain('overflow: hidden')
    expect(patch).not.toContain('line-clamp')
    expect(patch).not.toContain('grid-template-columns: minmax(0,1fr)')
  })
  it('uses saved result headings rather than relabeling historical choices', () => {
    expect(screen).toContain('record?.eventTitle ?? event.title')
    expect(screen).toContain('qualitativeEventPreview(choice.effectPreview)')
    expect(screen).toContain('record.cashDeltaEuro.toLocaleString()')
  })
})
