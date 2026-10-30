import { describe, expect, it, vi } from 'vitest'
import { createSceneImagePreloader, resolvePendingSceneIllustrations } from './sceneImageLoading'
import { APPROVED_MATCH_SCENES, SCENE_ASSETS } from './sceneIllustrations'
import { createEntertainmentV3Game } from '../testing/createEntertainmentV3Game'
import type { PendingKeyMatchMoment } from '../models/keyMatchMoment'

function harness() {
  const images: HTMLImageElement[] = []
  const createImage = () => {
    const image = { src: '', onload: null, onerror: null, decoding: '', fetchPriority: '' } as unknown as HTMLImageElement
    images.push(image)
    return image
  }
  return { images, loader: createSceneImagePreloader(createImage) }
}
const sources = [...new Set(Object.values(SCENE_ASSETS).map(asset => asset.src))]
const finish = (image: HTMLImageElement, type: 'load' | 'error' = 'load') => {
  const handler = type === 'load' ? image.onload : image.onerror
  if (typeof handler === 'function') handler.call(image, new Event(type))
}

describe('bounded scene image warming', () => {
  it('starts at most two requests and deduplicates inflight and successful URLs', () => {
    const { images, loader } = harness()
    loader.preload([sources[0]!, sources[0]!, sources[1]!])
    expect(images).toHaveLength(2)
    loader.preload([sources[0]!, sources[1]!])
    expect(images).toHaveLength(2)
    images.forEach(image => finish(image))
    loader.preload([sources[0]!, sources[1]!])
    expect(images).toHaveLength(2)
  })
  it('bounds queued work even with a full catalog input', () => {
    const { images, loader } = harness()
    loader.preload(sources)
    expect(images).toHaveLength(2)
    finish(images[0]!)
    finish(images[1]!)
    expect(images.length).toBeLessThanOrEqual(4)
    for (const image of images.slice(2)) finish(image)
    expect(images.length).toBeLessThanOrEqual(4)
  })
  it('keeps only the latest queued demand and can cancel queued work on navigation', () => {
    const { images, loader } = harness()
    loader.preload(sources.slice(0, 2))
    loader.preload(sources.slice(2, 4))
    loader.preload(sources.slice(4, 6))
    finish(images[0]!)
    expect(images[2]!.src).toBe(sources[4])
    loader.preload([])
    finish(images[1]!)
    finish(images[2]!)
    expect(images).toHaveLength(3)
  })
  it('ignores unknown URLs and permits an explicit retry after failure', () => {
    const { images, loader } = harness()
    loader.preload(['https://example.invalid/pixel', '/not-a-scene.webp', 'data:image/webp;base64,AAAA'])
    expect(images).toHaveLength(0)
    loader.preload([sources[0]!])
    finish(images[0]!, 'error')
    loader.preload([sources[0]!])
    expect(images).toHaveLength(2)
  })
  it('bounds the success bookkeeping to sixteen URLs, allowing evicted URLs to warm again', () => {
    const { images, loader } = harness()
    for (const source of sources.slice(0, 17)) {
      loader.preload([source])
      finish(images.at(-1)!)
    }
    expect(images).toHaveLength(17)
    loader.preload([sources[0]!])
    expect(images).toHaveLength(18)
  })
})

describe('existing scene-only resolver', () => {
  it('does nothing without a pending scene and never mutates the game or consumes randomness', () => {
    const game = createEntertainmentV3Game(26, 'eng_arsenal', 'IMAGE-LOADING-QA')
    const before = JSON.stringify(game)
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('No image RNG') })
    try {
      expect(resolvePendingSceneIllustrations(null)).toEqual([])
      expect(resolvePendingSceneIllustrations(game)).toEqual([])
      expect(JSON.stringify(game)).toBe(before)
    } finally { random.mockRestore() }
  })
  it('resolves the exact approved pending match, including off-tab warming, without advancing it', () => {
    const game = createEntertainmentV3Game(26, 'eng_arsenal', 'IMAGE-LOADING-QA')
    const scene = APPROVED_MATCH_SCENES.find(scene => scene.id === 'KM-FWD-04')!
    game.player!.primaryPosition = 'ST'
    game.phase = 'KEY_MATCH_MOMENT'
    game.pendingKeyMatchMoment = {
      templateId: scene.id, templateRevision: scene.revision, title: scene.title, scene: scene.scene,
      selectedChoiceId: null, resolution: null,
    } as PendingKeyMatchMoment
    const before = JSON.stringify(game)
    expect(resolvePendingSceneIllustrations(game).map(asset => asset.id)).toEqual(['M-04'])
    expect(JSON.stringify(game)).toBe(before)
    game.phase = 'KEY_MATCH_MOMENT_RESULT'
    expect(resolvePendingSceneIllustrations(game)).toEqual([])
    game.phase = 'KEY_MATCH_MOMENT'
    game.pendingKeyMatchMoment.templateRevision = 999
    expect(resolvePendingSceneIllustrations(game)).toEqual([])
  })
})
