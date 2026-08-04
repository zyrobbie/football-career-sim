import { describe, expect, it } from 'vitest'
// @ts-expect-error Vitest executes this file in Node; the app build intentionally omits Node globals.
import { readFileSync } from 'node:fs'

const stylesheet = readFileSync(new URL('../main.css', import.meta.url), 'utf8')

function latestRule(selector: string) {
  const selectorIndex = stylesheet.lastIndexOf(selector)
  const ruleStart = stylesheet.indexOf('{', selectorIndex)
  const ruleEnd = stylesheet.indexOf('}', ruleStart)

  return selectorIndex >= 0 && ruleStart >= 0 && ruleEnd >= 0
    ? stylesheet.slice(ruleStart + 1, ruleEnd)
    : ''
}

describe('mobile special-event copy layout', () => {
  it.each([
    '.special-event .career-panel-heading h1',
    '.special-event__step strong',
    '.special-event__choices strong',
  ])('keeps %s visible instead of replacing it with an ellipsis', (selector) => {
    const rule = latestRule(selector)

    expect(rule).toContain('white-space: normal')
    expect(rule).toContain('overflow-wrap: anywhere')
    expect(rule).not.toContain('text-overflow: ellipsis')
    expect(rule).not.toContain('white-space: nowrap')
  })

  it.each([
    '.special-event .career-panel-lead',
    '.special-event__choices small',
    '.special-event__choices em',
  ])('does not line-clamp %s', (selector) => {
    const rule = latestRule(selector)

    expect(rule).toContain('overflow-wrap: anywhere')
    expect(rule).not.toContain('-webkit-line-clamp')
    expect(rule).not.toContain('overflow: hidden')
  })
})
