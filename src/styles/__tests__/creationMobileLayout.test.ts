import { describe, expect, it } from 'vitest'
// @ts-expect-error Vitest executes this file in Node; the app build intentionally omits Node globals.
import { readFileSync } from 'node:fs'

const stylesheet = readFileSync(new URL('../main.css', import.meta.url), 'utf8')
const creationScreen = readFileSync(new URL('../../screens/CreationScreen.tsx', import.meta.url), 'utf8')

function mobileRule(selector: string) {
  const mobileStart = stylesheet.lastIndexOf('@media (max-width: 520px)')
  const selectorIndex = stylesheet.indexOf(selector, mobileStart)
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
})
