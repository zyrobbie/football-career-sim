import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CareerPosterViewport } from '../CareerPosterViewport'

describe('readable career viewport', () => {
  it('renders a keyboard-scrollable vector reader with a complete text alternative', () => {
    const html = renderToStaticMarkup(<CareerPosterViewport previewUrl="blob:vector" playerName="Robbie" />)
    expect(html).toContain('data-career-viewer-scroll')
    expect(html).toContain('data-career-viewer-image')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('下方文字版档案')
  })
  it('has explicit loading and retry states instead of an empty image', () => {
    expect(renderToStaticMarkup(<CareerPosterViewport previewUrl={null} playerName="Robbie" />)).toContain('role="status"')
    const error = renderToStaticMarkup(<CareerPosterViewport previewUrl={null} playerName="Robbie" error />)
    expect(error).toContain('role="alert"')
    expect(error).toContain('重新载入长图')
  })
  it('uses a bounded viewport and natural image height, never a full-height-fit thumbnail', () => {
    const css = readFileSync(new URL('../../styles/main.css', import.meta.url), 'utf8')
    expect(css).toContain('height: min(76dvh, 920px)')
    expect(css).toContain('.career-poster-viewport img { display: block; width: 100%; height: auto; max-height: none;')
    expect(css).toContain('height: min(92dvh, 1100px)')
  })
})
