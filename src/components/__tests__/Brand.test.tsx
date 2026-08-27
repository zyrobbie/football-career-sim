import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Brand } from '../Brand'

describe('Brand', () => {
  it('uses the player-facing 上场 / TAKE THE FIELD brand consistently', () => {
    const markup = renderToStaticMarkup(<Brand />)

    expect(markup).toContain('上场')
    expect(markup).toContain('TAKE THE FIELD')
    expect(markup).not.toContain('绿茵生涯')
    expect(markup).not.toContain('FOOTBALL CAREER')
  })
})
