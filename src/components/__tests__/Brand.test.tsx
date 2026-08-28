import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Brand } from '../Brand'

describe('Brand', () => {
  it('uses the official full standard asset and accessible full name', () => {
    const markup = renderToStaticMarkup(<Brand variant="full" tone="standard" />)

    expect(markup).toContain('/assets/brand/logo-full.svg')
    expect(markup).toContain('alt="上场 · TAKE THE FIELD"')
    expect(markup).not.toContain('brand__name')
    expect(markup).not.toContain('brand__english')
    expect(markup).not.toContain('绿茵生涯')
    expect(markup).not.toContain('FOOTBALL CAREER')
  })

  it('maps all official tone and variant combinations without hand-written brand text', () => {
    expect(renderToStaticMarkup(<Brand variant="full" tone="reverse" />))
      .toContain('/assets/brand/logo-full-reverse.svg')
    const compact = renderToStaticMarkup(<Brand variant="compact" tone="standard" />)
    expect(compact).toContain('/assets/brand/logo-compact.svg')
    expect(compact).toContain('alt="上场"')
    expect(renderToStaticMarkup(<Brand variant="compact" tone="reverse" />))
      .toContain('/assets/brand/logo-compact-reverse.svg')
    expect(renderToStaticMarkup(<Brand variant="icon" tone="standard" />))
      .toContain('/assets/brand/logo-mark.svg')
    expect(renderToStaticMarkup(<Brand variant="icon" tone="reverse" />))
      .toContain('/assets/brand/logo-mark.svg')
  })

  it('uses a picture source to select compact branding below 768px', () => {
    const markup = renderToStaticMarkup(<Brand variant="full" tone="reverse" collapseOnMobile />)

    expect(markup).toContain('<picture')
    expect(markup).toContain('media="(max-width: 767px)"')
    expect(markup).toContain('srcSet="/assets/brand/logo-compact-reverse.svg"')
    expect(markup).toContain('src="/assets/brand/logo-full-reverse.svg"')
    expect(markup).toContain('上场 · TAKE THE FIELD')
    expect(markup).toContain('>上场<')
  })

  it('marks only export-target logos for required export rasterization', () => {
    const markup = renderToStaticMarkup(<Brand variant="compact" tone="reverse" exportRasterize />)
    expect(markup).toContain('data-export-rasterize="brand-logo"')
  })
})
