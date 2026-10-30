import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SceneIllustration } from '../SceneIllustration'
import { SCENE_ASSETS } from '../../ui/sceneIllustrations'

describe('progressive scene illustration initial render', () => {
  it('requests the current scene eagerly at high priority with a same-scene inline preview', () => {
    const asset = SCENE_ASSETS['M-04']!
    const html = renderToStaticMarkup(<SceneIllustration illustration={asset} />)
    expect(html).toContain('loading="eager"')
    expect(html).toContain('fetchPriority="high"')
    expect(html).toContain('decoding="async"')
    expect(html).toContain(`src="${asset.src}"`)
    expect(html).toContain(`width="${asset.width}"`)
    expect(html).toContain(`height="${asset.height}"`)
    expect(html).toContain('data-scene-loading="loading"')
    expect(html).toContain('data:image/webp;base64,')
    expect(html).toContain('alt=""')
  })
  it('provides an inline preview for every approved scene without remote placeholder requests', () => {
    for (const asset of Object.values(SCENE_ASSETS)) {
      const html = renderToStaticMarkup(<SceneIllustration illustration={asset} />)
      expect(html, asset.id).toContain('data:image/webp;base64,')
      expect(html, asset.id).not.toContain('loading="lazy"')
    }
  })
  it('keeps unknown scenes text-only', () => {
    expect(renderToStaticMarkup(<SceneIllustration illustration={null} />)).toBe('')
  })
})
