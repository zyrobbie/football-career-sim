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
export const CAREER_POSTER_PAGE_OVERLAP = 80

/** Keep approved single images when readable; only oversized archives need bounded parts. */
export function planCareerPosterPages(poster: CareerPosterSvg): CareerPosterPage[] {
  const { width, height } = poster
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new Error('Invalid poster size.')
  const singleScale = calculateRetirementExportScale({ width, height })
  if (singleScale !== null) return [{ y: 0, height, scale: singleScale }]
  const pixelWidth = Math.floor(width * CAREER_POSTER_PAGE_SCALE)
  const maxHeight = Math.floor(RETIREMENT_MAX_CANVAS_PIXELS / pixelWidth / CAREER_POSTER_PAGE_SCALE)
  if (maxHeight <= CAREER_POSTER_PAGE_OVERLAP * 2) throw new Error('Canvas width exceeds the readable export budget.')
  const breaks = (poster.pageBreaks ?? [])
    .filter(value => Number.isFinite(value) && value > 0 && value < height)
    .sort((left, right) => left - right)
  const pages: CareerPosterPage[] = []
  let y = 0
  while (y < height) {
    const maximumEnd = Math.min(height, y + maxHeight)
    if (maximumEnd === height) {
      pages.push({ y, height: height - y, scale: CAREER_POSTER_PAGE_SCALE })
      break
    }
    const boundary = breaks.filter(value => value > y + Math.min(256, maxHeight / 2) && value <= maximumEnd).at(-1)
    const end = boundary ?? maximumEnd
    pages.push({ y, height: end - y, scale: CAREER_POSTER_PAGE_SCALE })
    // Oversized records without a usable boundary overlap, preserving any split line.
    y = boundary ?? end - CAREER_POSTER_PAGE_OVERLAP
  }
  return pages
}

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
export async function renderCareerPosterPage(poster: CareerPosterSvg, page: CareerPosterPage): Promise<Blob> {
  const svg = careerPosterPageSvg(poster, page)
  const dimensions = retirementExportCanvasDimensions(poster.width, page.height, page.scale)
  const canvas = document.createElement('canvas')
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable.')
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout)
        image.onload = null
        image.onerror = null
      }
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
      image.src = objectUrl
    })
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob?.size ? resolve(blob) : reject(new Error('Canvas PNG generation failed.')), 'image/png')
    })
  } finally {
    image.onload = null
    image.onerror = null
    URL.revokeObjectURL(objectUrl)
    canvas.width = 0
    canvas.height = 0
  }
}

/** Compatibility helper for callers which explicitly need a single bitmap. */
export async function renderCareerPosterPng(game: GameState): Promise<Blob> {
  const poster = await prepareCareerPoster(game)
  const pages = planCareerPosterPages(poster)
  if (pages.length !== 1) throw new Error('Canvas size requires individually selected high-resolution parts.')
  return renderCareerPosterPage(poster, pages[0]!)
}
