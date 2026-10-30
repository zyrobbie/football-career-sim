import { getCareerEvent } from '../engine/careerEvents'
import type { GameState } from '../models/game'
import { resolveCareerEventIllustration, resolveMatchIllustration, SCENE_ASSETS, type SceneIllustration } from './sceneIllustrations'

/** Read already-created pending state only. Never select/generate an event or advance RNG. */
export function resolvePendingSceneIllustrations(game: GameState | null): SceneIllustration[] {
  if (!game?.player) return []
  const illustrations: SceneIllustration[] = []
  if ((game.phase === 'KEY_MATCH_MOMENT' || game.phase === 'SIMULATION_READY') && game.pendingKeyMatchMoment) {
    const illustration = resolveMatchIllustration(game.pendingKeyMatchMoment, game.player.primaryPosition)
    if (illustration) illustrations.push(illustration)
  }
  if (game.phase === 'SPECIAL_EVENT' && game.pendingCareerEvent) {
    // Invalid/older scene definitions must not make optional prefetch break the app.
    try {
      const illustration = resolveCareerEventIllustration(getCareerEvent(game.pendingCareerEvent.eventId, game), game)
      if (illustration) illustrations.push(illustration)
    } catch { /* Unknown historical context remains text-only. */ }
  }
  return illustrations
}

const allowedSources = new Set(Object.values(SCENE_ASSETS).map(asset => asset.src))

/** No persistent storage or image buffers retained: browsers own HTTP cache policy.
 * At most 2 in flight, 2 latest queued URLs, and 16 successful URL dedupe entries.
 */
export function createSceneImagePreloader(createImage: () => HTMLImageElement = () => new Image()) {
  const active = new Map<string, HTMLImageElement>()
  const recent = new Set<string>()
  let queue: string[] = []
  function pump() {
    while (active.size < 2 && queue.length) {
      const src = queue.shift()!
      if (active.has(src) || recent.has(src)) continue
      const image = createImage()
      active.set(src, image)
      const finish = (success: boolean) => {
        if (active.get(src) !== image) return
        image.onload = null
        image.onerror = null
        active.delete(src)
        if (success) {
          recent.add(src)
          if (recent.size > 16) recent.delete(recent.values().next().value!)
        }
        pump()
      }
      image.onload = () => finish(true)
      image.onerror = () => finish(false)
      image.decoding = 'async'
      image.fetchPriority = 'low'
      image.src = src
      if (image.complete && image.naturalWidth > 0) finish(true)
    }
  }
  return {
    preload(sources: readonly string[]) {
      queue = [...new Set(sources)].filter(src => allowedSources.has(src) && !active.has(src) && !recent.has(src)).slice(0, 2)
      pump()
    },
  }
}

export const sceneImagePreloader = createSceneImagePreloader()
