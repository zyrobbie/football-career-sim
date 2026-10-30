import { encodeStripPng } from './streamingPng'
import type { GameState } from '../models/game'
import { buildCareerPosterSvg, careerPosterAssetPaths, type CareerPosterSvg } from './careerPosterSvg'
import {
  calculateRetirementExportScale,
  RETIREMENT_MAX_CANVAS_PIXELS,
  MIN_EXPORT_SCALE,
  retirementExportCanvasDimensions,
  waitForExportFonts,
} from './retirementRecord'

const ASSET_TIMEOUT_MS = 10_000
const RENDER_TIMEOUT_MS = 15_000

/** Inline every asset so the exported SVG has no network or cross-origin dependencies. */
export async function loadCareerPosterAsset(path: string): Promise<string> {
  const url = new URL(path, window.location.href)
  if (url.origin !== window.location.origin) throw new Error('Poster asset must be same-origin.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ASSET_TIMEOUT_MS)
  try {
    const response = await fetch(url.href, { signal: controller.signal, credentials: 'same-origin' })
    if (!response.ok) throw new Error(`Poster asset failed (${response.status}).`)
    const blob = await response.blob()
    if (!blob.size || !blob.type.startsWith('image/')) throw new Error('Poster asset is not an image.')
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Poster asset encoding failed.'))
      reader.onerror = () => reject(new Error('Poster asset encoding failed.'))
      reader.readAsDataURL(blob)
    })
  } finally {
    clearTimeout(timeout)
  }
}

/** Builds the complete scrollable vector archive independently of bitmap size limits. */
export async function prepareCareerPoster(game: GameState): Promise<CareerPosterSvg> {
  if (!game.player) throw new Error('Poster requires a player.')
  const fontStatus = await waitForExportFonts(document.fonts)
  if (fontStatus !== 'READY') throw new Error('Poster fonts are not ready.')
  const paths = [...new Set(careerPosterAssetPaths(game))]
  const entries = await Promise.all(paths.map(async path => [path, await loadCareerPosterAsset(path)] as const))
  return buildCareerPosterSvg(game, Object.fromEntries(entries))
}

export interface CareerPosterPage { y: number; height: number; scale: number }
export const CAREER_POSTER_PAGE_SCALE = 2
/** Clip the vector viewport BEFORE decoding to avoid allocating a full oversized bitmap. */
export function careerPosterPageSvg(poster: CareerPosterSvg, page: CareerPosterPage): string {
  if (![poster.width, poster.height, page.y, page.height, page.scale].every(Number.isFinite)
    || poster.width <= 0 || poster.height <= 0 || page.y < 0 || page.height <= 0
    || page.y + page.height > poster.height + .001 || page.scale < MIN_EXPORT_SCALE || page.scale > CAREER_POSTER_PAGE_SCALE) {
    throw new Error('Invalid poster page size.')
  }
  const dimensions = retirementExportCanvasDimensions(poster.width, page.height, page.scale)
  if (dimensions.width * dimensions.height > RETIREMENT_MAX_CANVAS_PIXELS) throw new Error('Canvas page exceeds memory budget.')
  const root = poster.svg.match(/^<svg\b[^>]*>/)?.[0]
  if (!root) throw new Error('Invalid poster SVG root.')
  const attributes = root.replace(/\s(?:width|height|viewBox)="[^"]*"/g, '').slice(0, -1)
  return `${attributes} width="${poster.width}" height="${page.height}" viewBox="0 ${page.y} ${poster.width} ${page.height}">${poster.svg.slice(root.length)}`
}

/** Rasterize only the selected part; callers must not auto-download all planned parts. */
async function rasterizeCareerPosterPage<T>(poster: CareerPosterSvg, page: CareerPosterPage, consume: (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => Promise<T>, exactHeight?: number, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted()
  const svg = careerPosterPageSvg(poster, page)
  const dimensions = retirementExportCanvasDimensions(poster.width, page.height, page.scale)
  const canvas = document.createElement('canvas')
  canvas.width = dimensions.width
  canvas.height = exactHeight ?? dimensions.height
  const context = canvas.getContext('2d')
  if (!context) { canvas.width = 0; canvas.height = 0; throw new Error('Canvas context unavailable.') }
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout)
        image.onload = null
        image.onerror = null
        signal?.removeEventListener('abort', abort)
      }
      const abort = () => { cleanup(); reject(new DOMException('Export cancelled.', 'AbortError')) }
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Poster image rendering timed out.'))
      }, RENDER_TIMEOUT_MS)
      image.onload = () => {
        cleanup()
        image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve() : reject(new Error('Poster image is empty.'))
      }
      image.onerror = () => {
        cleanup()
        reject(new Error('Poster image rendering failed.'))
      }
      signal?.addEventListener('abort', abort, { once: true })
      image.src = objectUrl
      if (signal?.aborted) abort()
    })
    signal?.throwIfAborted()
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await consume(canvas, context)
  } finally {
    image.onload = null
    image.onerror = null
    URL.revokeObjectURL(objectUrl)
    canvas.width = 0
    canvas.height = 0
  }
}

/** Existing bounded renderer, also useful for testing individual strip fidelity. */
export function renderCareerPosterPage(poster: CareerPosterSvg, page: CareerPosterPage, signal?: AbortSignal): Promise<Blob> {
  return rasterizeCareerPosterPage(poster, page, canvas => new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob?.size ? resolve(blob) : reject(new Error('Canvas PNG generation failed.')), 'image/png')
  }), undefined, signal)
}

export const CAREER_POSTER_STRIP_ROWS = 512
/** Short images retain their existing quality. Long images use the existing readable
 * minimum (975 px for the 780 px design), not a 61+ MP 2x bitmap on a phone. */
export function careerPosterSingleImageDimensions(poster: CareerPosterSvg) {
  if (![poster.width, poster.height].every(value => Number.isFinite(value) && value > 0)) throw new Error('Invalid poster size.')
  const scale = calculateRetirementExportScale(poster) ?? MIN_EXPORT_SCALE
  return { ...retirementExportCanvasDimensions(poster.width, poster.height, scale), scale }
}

export async function renderPreparedCareerPosterPng(poster: CareerPosterSvg, signal?: AbortSignal): Promise<Blob> {
  signal?.throwIfAborted()
  const dimensions = careerPosterSingleImageDimensions(poster)
  if (dimensions.width * dimensions.height <= RETIREMENT_MAX_CANVAS_PIXELS) {
    return renderCareerPosterPage(poster, { y: 0, height: poster.height, scale: dimensions.scale }, signal)
  }
  // Integer output rows cover the archive exactly once. The last viewport uses the
  // same effective scale as all other strips, including fractional original heights.
  const scaleY = dimensions.height / poster.height
  async function* strips() {
    for (let row = 0; row < dimensions.height; row += CAREER_POSTER_STRIP_ROWS) {
      signal?.throwIfAborted()
      const rows = Math.min(CAREER_POSTER_STRIP_ROWS, dimensions.height - row)
      const page = { y: row / scaleY, height: rows / scaleY, scale: dimensions.scale }
      const pixels = await rasterizeCareerPosterPage(poster, page, async (canvas, context) => {
        return context.getImageData(0, 0, canvas.width, canvas.height).data
      }, rows, signal)
      yield pixels
      // Let close/navigation/paint run between bounded chunks; no gameplay mutations.
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  return encodeStripPng(dimensions.width, dimensions.height, strips())
}

export async function renderCareerPosterPng(game: GameState): Promise<Blob> {
  return renderPreparedCareerPosterPng(await prepareCareerPoster(game))
}
