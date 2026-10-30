/** One PNG, fed by bounded RGBA strips. No full-image canvas or raw pixel buffer. */
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})
function chunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.length + 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, data.length)
  bytes.set([...type].map(char => char.charCodeAt(0)), 4)
  bytes.set(data, 8)
  let crc = 0xffffffff
  for (let i = 4; i < bytes.length - 4; i++) crc = crcTable[(crc ^ bytes[i]!) & 255]! ^ (crc >>> 8)
  view.setUint32(bytes.length - 4, (crc ^ 0xffffffff) >>> 0)
  return bytes
}
export async function encodeStripPng(width: number, height: number, strips: AsyncIterable<Uint8ClampedArray>): Promise<Blob> {
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n <= 0x7fffffff)) throw new Error('Invalid PNG size.')
  if (typeof CompressionStream === 'undefined') throw new Error('此浏览器不支持完整长图编码，请在新版 Safari 或系统浏览器中重试。')
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width); view.setUint32(4, height); header[8] = 8; header[9] = 6
  const parts: BlobPart[] = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header)]
  const compressor = new CompressionStream('deflate')
  const writer = compressor.writable.getWriter()
  const reader = compressor.readable.getReader()
  // Drain concurrently: awaiting writes without reading can deadlock on backpressure.
  const drain = (async () => {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      parts.push(chunk('IDAT', value))
    }
  })()
  // Attach a handler immediately, including while a strip renderer is still pending.
  void drain.catch(() => {})
  let rows = 0
  try {
    for await (const pixels of strips) {
      if (!pixels.length || pixels.length % (width * 4)) throw new Error('Invalid PNG strip size.')
      const count = pixels.length / (width * 4)
      if (rows + count > height) throw new Error('PNG strip exceeds image height.')
      const stride = width * 4
      const filtered = new Uint8Array((stride + 1) * count)
      for (let row = 0; row < count; row++) {
        const offset = row * stride, target = row * (stride + 1)
        filtered[target] = 1 // PNG Sub: preserve every byte, compress flat poster backgrounds efficiently.
        for (let x = 0; x < stride; x++) filtered[target + x + 1] = pixels[offset + x]! - (x >= 4 ? pixels[offset + x - 4]! : 0)
      }
      await writer.write(filtered)
      rows += count
    }
    if (rows !== height) throw new Error('PNG strips do not cover the full image.')
    await writer.close(); await drain
    parts.push(chunk('IEND', new Uint8Array()))
    return new Blob(parts, { type: 'image/png' })
  } catch (error) {
    await writer.abort(error).catch(() => {})
    await reader.cancel(error).catch(() => {})
    await drain.catch(() => {})
    throw error
  } finally { writer.releaseLock(); reader.releaseLock() }
}
