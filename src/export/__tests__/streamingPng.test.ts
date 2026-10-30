import { inflateSync } from 'node:zlib'
import { describe, expect, it, vi } from 'vitest'
import { encodeStripPng } from '../streamingPng'

async function decode(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const chunks: Uint8Array[] = []
  const view = new DataView(bytes.buffer)
  const width = view.getUint32(16), height = view.getUint32(20)
  for (let offset = 8; offset < bytes.length;) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8))
    if (type === 'IDAT') chunks.push(bytes.slice(offset + 8, offset + 8 + length))
    offset += 12 + length
  }
  const filtered = inflateSync(Buffer.concat(chunks))
  expect(filtered.length).toBe((width * 4 + 1) * height)
  const pixels = new Uint8Array(width * height * 4)
  for (let row = 0; row < height; row++) {
    const start = row * (width * 4 + 1), target = row * width * 4
    expect(filtered[start]).toBe(1)
    for (let x = 0; x < width * 4; x++) pixels[target + x] = filtered[start + x + 1]! + (x >= 4 ? pixels[target + x - 4]! : 0)
  }
  return { width, height, pixels }
}

describe('streaming single PNG encoder', () => {
  it('losslessly joins nonoverlapping strips including the last partial row group', async () => {
    const width = 11, height = 1027
    const expected = Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => (i * 37 + Math.floor(i / 44)) % 256)
    async function* strips() {
      for (let row = 0; row < height; row += 512) yield expected.slice(row * width * 4, Math.min(row + 512, height) * width * 4)
    }
    const image = await decode(await encodeStripPng(width, height, strips()))
    expect(image.width).toBe(width); expect(image.height).toBe(height)
    expect(image.pixels).toEqual(new Uint8Array(expected))
  })
  it('handles a long phone-width image without a full raw-image allocation', async () => {
    const width = 975, height = 24428
    let allocations = 0
    async function* strips() {
      for (let row = 0; row < height; row += 512) {
        const pixels = new Uint8ClampedArray(width * Math.min(512, height - row) * 4)
        pixels.fill(255); allocations++
        expect(pixels.byteLength).toBeLessThanOrEqual(975 * 512 * 4)
        yield pixels
      }
    }
    const png = await encodeStripPng(width, height, strips())
    expect(allocations).toBe(48)
    expect(png.size).toBeLessThan(500_000)
    // Independent native PNG decoder also validates CRC and the zlib stream.
    const sharp = (await import('sharp')).default
    const metadata = await sharp(Buffer.from(await png.arrayBuffer()), { limitInputPixels: false }).metadata()
    expect(metadata).toMatchObject({ format: 'png', width, height })
    await expect(sharp(Buffer.from(await png.arrayBuffer())).raw().toBuffer()).resolves.toHaveLength(width * height * 4)
  })
  it('rejects missing/excess rows instead of returning a cropped image; a retry succeeds', async () => {
    async function* short() { yield new Uint8ClampedArray(4) }
    await expect(encodeStripPng(1, 2, short())).rejects.toThrow('full image')
    await expect(encodeStripPng(1, 1, short())).resolves.toMatchObject({ type: 'image/png' })
    async function* excess() { yield new Uint8ClampedArray(12) }
    await expect(encodeStripPng(1, 2, excess())).rejects.toThrow('exceeds')
    async function* failure() { yield new Uint8ClampedArray(4); throw new Error('render failed') }
    await expect(encodeStripPng(1, 2, failure())).rejects.toThrow('render failed')
  })
  it('does not silently split or lower quality on unsupported browsers', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    try {
      async function* strips() { yield new Uint8ClampedArray(4) }
      await expect(encodeStripPng(1, 1, strips())).rejects.toThrow('新版 Safari')
    } finally { vi.unstubAllGlobals() }
  })
})
