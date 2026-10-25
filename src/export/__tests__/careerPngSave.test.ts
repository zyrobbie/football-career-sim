import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareCareerPngSaveAsset, shareCareerPng } from '../careerPngSave'
const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])
const png = () => new Blob([bytes], { type: 'image/png' })
beforeEach(() => {
  vi.stubGlobal('FileReader', class {
    result: string | null = null
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    onabort: (() => void) | null = null
    abort() { this.onabort?.() }
    readAsDataURL(blob: Blob) { void blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onload?.() }) }
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('mobile PNG save assets', () => {
  it('prepares the identical PNG bytes as a named File and persistent data image, never SVG or page markup', async () => {
    const asset = await prepareCareerPngSaveAsset(png(), '生涯-2-4.png')
    expect(asset.file.name).toBe('生涯-2-4.png')
    expect(asset.file.type).toBe('image/png')
    expect(new Uint8Array(await asset.file.arrayBuffer())).toEqual(bytes)
    expect(asset.dataUrl).toBe(`data:image/png;base64,${Buffer.from(bytes).toString('base64')}`)
  })
  it('rejects SVG, HTML, empty output and mislabelled screenshot data', async () => {
    for (const blob of [new Blob(['<svg/>'], { type: 'image/svg+xml' }), new Blob(['<html/>'], { type: 'image/png' }), new Blob([], { type: 'image/png' })]) {
      await expect(prepareCareerPngSaveAsset(blob, 'a.png')).rejects.toThrow()
    }
  })
  it('calls native share synchronously from the click turn with only the prepared PNG file', async () => {
    const { file } = await prepareCareerPngSaveAsset(png(), 'career.png')
    const share = vi.fn().mockResolvedValue(undefined), canShare = vi.fn().mockReturnValue(true)
    const result = shareCareerPng(file, { share, canShare })
    expect(share).toHaveBeenCalledExactlyOnceWith({ files: [file] })
    expect(share.mock.calls[0]![0]).not.toHaveProperty('url')
    expect(share.mock.calls[0]![0]).not.toHaveProperty('text')
    await expect(result).resolves.toBe('HANDED_OFF')
  })
  it('does not conflate cancellation with success or trigger an automatic download', async () => {
    const { file } = await prepareCareerPngSaveAsset(png(), 'career.png')
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    await expect(shareCareerPng(file, { canShare: () => true, share })).resolves.toBe('CANCELLED')
    expect(share).toHaveBeenCalledTimes(1)
  })
  it('returns explicit unsupported and permission-failure outcomes while retaining the file', async () => {
    const { file } = await prepareCareerPngSaveAsset(png(), 'career.png')
    const share = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    await expect(shareCareerPng(file, { canShare: () => false, share })).resolves.toBe('UNSUPPORTED')
    expect(share).not.toHaveBeenCalled()
    await expect(shareCareerPng(file, { canShare: () => true, share })).resolves.toBe('ERROR')
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes)
  })
  it('handles synchronous API refusal without losing the PNG or throwing from the UI event', async () => {
    const { file } = await prepareCareerPngSaveAsset(png(), 'career.png')
    await expect(shareCareerPng(file, { canShare: () => { throw new Error('blocked') }, share: vi.fn() })).resolves.toBe('ERROR')
  })
})
