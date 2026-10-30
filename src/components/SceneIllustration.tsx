import { useEffect, useRef, useState } from 'react'
import type { SceneIllustration as SceneIllustrationAsset } from '../ui/sceneIllustrations'
import previews from '../ui/scenePreviews.json'

/** Each URL owns its load state; late events from a previous scene cannot reveal the new one. */
function SceneImage({ illustration }: { illustration: SceneIllustrationAsset }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const image = useRef<HTMLImageElement>(null)
  const preview = (previews as Record<string, string>)[illustration.id]
  useEffect(() => {
    // A warm browser cache can finish before React attaches its load listener.
    if (image.current?.complete && image.current.naturalWidth > 0) setStatus('ready')
  }, [])
  return <div className={`scene-illustration scene-illustration--${illustration.kind}`}
    data-scene-illustration={illustration.id} data-scene-loading={status}
    style={preview ? { backgroundImage: `url("${preview}")` } : undefined}>
    <img ref={image} src={illustration.src} width={illustration.width} height={illustration.height}
      alt="" loading="eager" fetchPriority="high" decoding="async"
      onLoad={() => setStatus('ready')} onError={() => setStatus('failed')} />
  </div>
}

/** Decorative only. Neither downloading nor failure gates text, decisions, or navigation. */
export function SceneIllustration({ illustration }: { illustration: SceneIllustrationAsset | null }) {
  return illustration ? <SceneImage key={illustration.src} illustration={illustration} /> : null
}
