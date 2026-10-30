import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState } from '../../models/game'

const buildSvg = vi.hoisted(() => vi.fn(() => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', width: 900, height: 2500 })))
vi.mock('../careerPosterSvg', () => ({ buildCareerPosterSvg: buildSvg, careerPosterAssetPaths: () => ['/crest.svg'] }))
import { loadCareerPosterAsset, renderCareerPosterPng, prepareCareerPoster, careerPosterSingleImageDimensions, renderCareerPosterPage, careerPosterPageSvg, renderPreparedCareerPosterPng } from '../careerPosterExport'

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
  canvas = { width: 0, height: 0, getContext: vi.fn(() => ({ drawImage: draw, getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }) })), toBlob: vi.fn(callback => callback(new Blob(['png'], { type: 'image/png' }))) }
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


describe('complete preview and bounded internal rasterization', () => {
  it('prepares the complete oversized vector without attempting any canvas or PNG', async () => {
    buildSvg.mockReturnValue({ svg: '<svg width="780" height="19543" viewBox="0 0 780 19543"><text>完整档案</text></svg>', width: 780, height: 19543 })
    const poster = await prepareCareerPoster(game)
    expect(poster.height).toBe(19543)
    expect(poster.svg).toContain('完整档案')
    expect(document.createElement).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('preserves readable resolution while producing ONE complete long image', () => {
    expect(careerPosterSingleImageDimensions({ svg: '', width: 780, height: 9640 })).toEqual({ width: 982, height: 12146, scale: 1.26 })
    expect(careerPosterSingleImageDimensions({ svg: '', width: 780, height: 19543 })).toEqual({ width: 975, height: 24428, scale: 1.25 })
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
    expect(() => careerPosterSingleImageDimensions({ svg: '', width: 780, height: Infinity })).toThrow('Invalid')
  })
})


describe('single long PNG bounded rasterization and interruption', () => {
  it('creates one complete PNG with bounded strips, not a full-image canvas', async () => {
    const poster = { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="10001"></svg>', width: 900, height: 10001 }
    const png = await renderPreparedCareerPosterPng(poster)
    const header = new DataView(await png.slice(0, 24).arrayBuffer())
    expect(header.getUint32(16)).toBe(1125)
    expect(header.getUint32(20)).toBe(12501)
    expect(draw.mock.calls.length).toBe(25)
    for (const call of draw.mock.calls) {
      expect(call[3]).toBe(1125)
      expect(call[4]).toBeLessThanOrEqual(512)
    }
    expect(draw.mock.calls.reduce((rows, call) => rows + call[4], 0)).toBe(12501)
    expect(canvas.toBlob).not.toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledTimes(25)
    expect(canvas.width).toBe(0)
  })
  it('releases resources on cancellation and permits a fresh render', async () => {
    const controller = new AbortController()
    draw.mockImplementationOnce(() => controller.abort())
    const poster = { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="10001"></svg>', width: 900, height: 10001 }
    await expect(renderPreparedCareerPosterPng(poster, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(draw).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledTimes(1)
    expect(canvas.width).toBe(0)
    await expect(renderPreparedCareerPosterPng({ ...poster, height: 100 })).resolves.toMatchObject({ type: 'image/png' })
  })
  it('does not allocate when already cancelled', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(renderPreparedCareerPosterPng({ svg: '', width: 780, height: 20000 }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(document.createElement).not.toHaveBeenCalled()
  })
})
