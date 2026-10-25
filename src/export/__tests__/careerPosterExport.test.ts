import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState } from '../../models/game'

const buildSvg = vi.hoisted(() => vi.fn(() => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', width: 900, height: 2500 })))
vi.mock('../careerPosterSvg', () => ({ buildCareerPosterSvg: buildSvg, careerPosterAssetPaths: () => ['/crest.svg'] }))
import { loadCareerPosterAsset, renderCareerPosterPng, prepareCareerPoster, planCareerPosterPages, renderCareerPosterPage, careerPosterPageSvg } from '../careerPosterExport'

const game = { player: { name: 'Example' } } as GameState
let canvas: { width: number; height: number; getContext: ReturnType<typeof vi.fn>; toBlob: ReturnType<typeof vi.fn> }
let failImage = false
const revoke = vi.fn()
const draw = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  failImage = false
  buildSvg.mockReturnValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', width: 900, height: 2500 })
  vi.stubGlobal('window', { location: { href: 'https://example.test/app/', origin: 'https://example.test' } })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }) })))
  vi.stubGlobal('FileReader', class {
    result: string | null = null
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    readAsDataURL() { this.result = 'data:image/svg+xml;base64,PHN2Zy8+'; queueMicrotask(() => this.onload?.()) }
  })
  vi.stubGlobal('Image', class {
    naturalWidth = 900
    naturalHeight = 2500
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_value: string) { queueMicrotask(() => failImage ? this.onerror?.() : this.onload?.()) }
  })
  canvas = { width: 0, height: 0, getContext: vi.fn(() => ({ drawImage: draw })), toBlob: vi.fn(callback => callback(new Blob(['png'], { type: 'image/png' }))) }
  vi.stubGlobal('document', { fonts: { ready: Promise.resolve() }, createElement: vi.fn(() => canvas) })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:vector-poster')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revoke)
})

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('vector poster export pipeline', () => {
  it('embeds assets and generates a 2x lossless PNG from the actual SVG builder', async () => {
    const blob = await renderCareerPosterPng(game)
    expect(blob.type).toBe('image/png')
    expect(buildSvg).toHaveBeenCalledWith(game, { '/crest.svg': 'data:image/svg+xml;base64,PHN2Zy8+' })
    expect(draw).toHaveBeenCalledWith(expect.anything(), 0, 0, 1800, 5000)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
    expect(revoke).toHaveBeenCalledWith('blob:vector-poster')
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  })
  it('rejects external asset origins before fetching', async () => {
    await expect(loadCareerPosterAsset('https://evil.example/asset.svg')).rejects.toThrow('same-origin')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('fails on missing images rather than silently exporting missing crests or QR', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response)
    await expect(renderCareerPosterPng(game)).rejects.toThrow('404')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('rejects an HTML error response masquerading as an asset', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, blob: async () => new Blob(['error'], { type: 'text/html' }) } as Response)
    await expect(loadCareerPosterAsset('/crest.svg')).rejects.toThrow('not an image')
  })
  it('does not silently lower resolution below the readable canvas budget', async () => {
    buildSvg.mockReturnValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', width: 900, height: 10000 })
    await expect(renderCareerPosterPng(game)).rejects.toThrow('individually selected')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('cleans up the SVG URL and bitmap when the browser cannot decode it', async () => {
    failImage = true
    await expect(renderCareerPosterPng(game)).rejects.toThrow('rendering failed')
    expect(revoke).toHaveBeenCalledWith('blob:vector-poster')
    expect(canvas.width).toBe(0)
    expect(draw).not.toHaveBeenCalled()
  })
  it('rejects an empty PNG and still releases resources', async () => {
    canvas.toBlob.mockImplementation(callback => callback(null))
    await expect(renderCareerPosterPng(game)).rejects.toThrow('PNG generation failed')
    expect(revoke).toHaveBeenCalledWith('blob:vector-poster')
    expect(canvas.width).toBe(0)
  })
})


describe('scrollable preview and bounded selected-part output', () => {
  it('prepares the complete oversized vector without attempting any canvas or PNG', async () => {
    buildSvg.mockReturnValue({ svg: '<svg width="780" height="19543" viewBox="0 0 780 19543"><text>完整档案</text></svg>', width: 780, height: 19543 })
    const poster = await prepareCareerPoster(game)
    expect(poster.height).toBe(19543)
    expect(poster.svg).toContain('完整档案')
    expect(document.createElement).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('preserves the approved ordinary 8-club image as one adaptive readable PNG', () => {
    const pages = planCareerPosterPages({ svg: '', width: 780, height: 9640 })
    expect(pages).toEqual([{ y: 0, height: 9640, scale: 1.26 }])
  })
  it('splits only oversized archives at semantic boundaries at 2x with complete coverage', () => {
    const poster = { svg: '', width: 780, height: 19543, pageBreaks: Array.from({ length: 19 }, (_, i) => (i + 1) * 1000) }
    const pages = planCareerPosterPages(poster)
    expect(pages.length).toBeGreaterThan(1)
    expect(pages[0]!.y).toBe(0)
    pages.forEach((page, i) => {
      expect(page.scale).toBe(2)
      expect(Math.floor(poster.width * page.scale) * Math.floor(page.height * page.scale)).toBeLessThanOrEqual(12_000_000)
      if (i) expect(page.y).toBe(pages[i - 1]!.y + pages[i - 1]!.height)
      if (i < pages.length - 1) expect(poster.pageBreaks).toContain(page.y + page.height)
    })
    expect(pages.at(-1)!.y + pages.at(-1)!.height).toBe(poster.height)
  })
  it('overlaps an unsplittable legacy record by 80 units rather than losing split lines', () => {
    const pages = planCareerPosterPages({ svg: '', width: 780, height: 20000 })
    pages.slice(1).forEach((page, i) => expect(page.y).toBe(pages[i]!.y + pages[i]!.height - 80))
    expect(pages.at(-1)!.y + pages.at(-1)!.height).toBe(20000)
  })
  it('decodes a cropped SVG viewport, never a full tall image, and renders only the selected part', async () => {
    const poster = { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="780" height="19543" viewBox="0 0 780 19543"><text y="4000">full data retained</text></svg>', width: 780, height: 19543 }
    const page = { y: 3000, height: 3000, scale: 2 }
    await renderCareerPosterPage(poster, page)
    expect(draw).toHaveBeenCalledWith(expect.anything(), 0, 0, 1560, 6000)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const source = await (vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob).text()
    expect(source).toContain('height="3000" viewBox="0 3000 780 3000"')
    expect(source).not.toContain('height="19543"')
    expect(source).toContain('full data retained')
  })
  it('rejects unsafe or out-of-bounds requested parts before allocating a bitmap', () => {
    const poster = { svg: '<svg width="780" height="19543"></svg>', width: 780, height: 19543 }
    expect(() => careerPosterPageSvg(poster, { y: -1, height: 100, scale: 2 })).toThrow('Invalid')
    expect(() => careerPosterPageSvg(poster, { y: 19000, height: 1000, scale: 2 })).toThrow('Invalid')
    expect(() => careerPosterPageSvg(poster, { y: 0, height: 19000, scale: 2 })).toThrow('memory budget')
    expect(() => careerPosterPageSvg(poster, { y: 0, height: 100, scale: 1 })).toThrow('Invalid')
    expect(() => planCareerPosterPages({ svg: '', width: 780, height: Infinity })).toThrow('Invalid')
  })
})
