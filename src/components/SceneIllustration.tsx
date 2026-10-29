import { useState } from 'react'
import type { SceneIllustration as SceneIllustrationAsset } from '../ui/sceneIllustrations'

/** Decorative, pre-decision illustration. Text/actions render independently of image loading. */
export function SceneIllustration({ illustration }: { illustration: SceneIllustrationAsset | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!illustration || failedSrc === illustration.src) return null
  return <div className={`scene-illustration scene-illustration--${illustration.kind}`}
    data-scene-illustration={illustration.id}>
    <img src={illustration.src} width={illustration.width} height={illustration.height}
      alt="" loading="lazy" decoding="async" onError={() => setFailedSrc(illustration.src)} />
  </div>
}
