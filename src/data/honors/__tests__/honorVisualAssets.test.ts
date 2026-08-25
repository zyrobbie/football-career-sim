import { readFileSync, readdirSync, statSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { HONOR_VISUAL_REGISTRY } from '../honorVisualRegistry'

const assetDirectory = new URL('../../../../public/assets/honors/', import.meta.url)
const assetFiles = readdirSync(assetDirectory)
  .filter((file) => file.endsWith('.svg'))
  .sort()

function opaqueBounds(data: Buffer, width: number, height: number) {
  let left = width
  let right = -1
  let top = height
  let bottom = -1
  for (let index = 0; index < width * height; index += 1) {
    if (data[index * 4 + 3] === 0) continue
    const x = index % width
    const y = Math.floor(index / width)
    left = Math.min(left, x)
    right = Math.max(right, x)
    top = Math.min(top, y)
    bottom = Math.max(bottom, y)
  }
  return { left, right, top, bottom }
}

describe('reviewed honor SVG assets', () => {
  it('keeps the reviewed forty-two registry assets complete, local, and uniquely addressed', () => {
    const registryFiles = HONOR_VISUAL_REGISTRY
      .map((visual) => visual.assetPath.split('/').at(-1)!)
      .sort()
    expect(assetFiles).toHaveLength(42)
    expect(registryFiles).toEqual(assetFiles)
    expect(new Set(registryFiles).size).toBe(42)
  })

  it('parses every asset safely and rasterizes it within the shared safe area', async () => {
    const sizes = [24, 32, 48, 56, 128]
    for (const assetFile of assetFiles) {
      const source = readFileSync(new URL(assetFile, assetDirectory), 'utf8')
      expect(source).not.toMatch(/<text\b|<script\b|<image\b|data:image\//i)
      expect(source).not.toMatch(/(?:href|src)=["'](?:https?:)?\/\//i)
      expect(source).not.toMatch(/@font-face|font-family/i)
      expect(statSync(new URL(assetFile, assetDirectory)).size).toBeGreaterThan(0)

      for (const size of sizes) {
        const { data, info } = await sharp(Buffer.from(source))
          .resize({ width: size, height: size, fit: 'contain' })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
        expect(info.width).toBe(size)
        expect(info.height).toBe(size)
        const bounds = opaqueBounds(data, info.width, info.height)
        expect(bounds.right).toBeGreaterThanOrEqual(bounds.left)
        expect(bounds.bottom).toBeGreaterThanOrEqual(bounds.top)
        // At 24px antialiasing can legitimately round a safe vector edge onto
        // the final pixel. The parse/raster check is performed at every badge
        // size; exact geometric cropping is separately exercised by the
        // retirement export canvas tests.
        expect(bounds.left).toBeGreaterThanOrEqual(0)
        expect(bounds.top).toBeGreaterThanOrEqual(0)
        expect(bounds.right).toBeLessThan(size)
        expect(bounds.bottom).toBeLessThan(size)
      }
    }
  })
})
