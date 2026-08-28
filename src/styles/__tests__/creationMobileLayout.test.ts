import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const stylesheet = readFileSync(new URL('../main.css', import.meta.url), 'utf8')
const creationScreen = readFileSync(new URL('../../screens/CreationScreen.tsx', import.meta.url), 'utf8')

function mobileRule(selector: string) {
  const mobileStarts = [...stylesheet.matchAll(/@media \(max-width: 520px\)/g)]
    .map((match) => match.index ?? -1)
  for (let index = mobileStarts.length - 1; index >= 0; index -= 1) {
    const mobileStart = mobileStarts[index]!
    const mobileEnd = mobileStarts[index + 1] ?? stylesheet.length
    const selectorIndex = stylesheet.indexOf(selector, mobileStart)
    if (selectorIndex < mobileStart || selectorIndex >= mobileEnd) continue
    const ruleStart = stylesheet.indexOf('{', selectorIndex)
    const ruleEnd = stylesheet.indexOf('}', ruleStart)
    if (ruleStart >= 0 && ruleEnd >= 0) {
      return stylesheet.slice(ruleStart + 1, ruleEnd)
    }
  }
  return ''
}

function academyOfferMobileRule(selector: string) {
  const selectorIndex = stylesheet.indexOf(selector)
  const mobileStart = stylesheet.lastIndexOf('@media (max-width: 520px)', selectorIndex)
  const ruleStart = stylesheet.indexOf('{', selectorIndex)
  const ruleEnd = stylesheet.indexOf('}', ruleStart)
  return selectorIndex >= mobileStart && ruleStart >= 0 && ruleEnd >= 0
    ? stylesheet.slice(ruleStart + 1, ruleEnd)
    : ''
}

describe('mobile creation layout safeguards', () => {
  it('does not auto-focus the identity input before an iPhone player chooses it', () => {
    expect(creationScreen).not.toMatch(/autoFocus/)
  })

  it('uses iOS-safe 16px editable controls and real shrink boundaries', () => {
    const editableRule = mobileRule('.field input,')
    expect(editableRule).toContain('font-size: 16px')
    expect(mobileRule('.field textarea')).toContain('font-size: 16px')
    expect(stylesheet).toMatch(/\.field input,\s*\.field select \{[\s\S]*?width: 100%;[\s\S]*?min-width: 0;/)
    for (const selector of ['.setup-shell', '.setup-header', '.setup-paper', '.field', '.identity-traits', '.foot-selector', '.position-pitch', '.position-detail', '.setup-actions']) {
      const match = stylesheet.match(new RegExp(`^${selector.replace('.', '\\.')}\\s*\\{`, 'm'))
      const index = match?.index ?? -1
      expect(index).toBeGreaterThanOrEqual(0)
      const rule = stylesheet.slice(stylesheet.indexOf('{', index), stylesheet.indexOf('}', stylesheet.indexOf('{', index)))
      expect(rule).toMatch(/min-width: 0|max-width: 100%/)
    }
  })

  it('stacks academy-offer labels above single-line values on narrow screens', () => {
    const valueRule = academyOfferMobileRule('.career-offers .offer-column__value')
    const strongRule = academyOfferMobileRule('.career-offers .offer-column__value strong')

    expect(valueRule).toContain('display: grid')
    expect(valueRule).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(strongRule).toContain('white-space: nowrap')
    expect(strongRule).toContain('text-overflow: clip')
    expect(strongRule).toContain('overflow: visible')
    expect(valueRule).not.toContain('justify-content: space-between')
  })
})
