import { readFileSync, statSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const assetDirectory = new URL('../../../public/assets/brand/', import.meta.url)
const assetNames = [
  'logo-full.svg',
  'logo-full-reverse.svg',
  'logo-compact.svg',
  'logo-compact-reverse.svg',
  'logo-mark.svg',
] as const

const expectedColors: Record<(typeof assetNames)[number], string[]> = {
  'logo-full.svg': ['#082C23', '#BD9D56'],
  'logo-full-reverse.svg': ['#F3F0E8'],
  'logo-compact.svg': ['#082C23', '#BD9D56'],
  'logo-compact-reverse.svg': ['#F3F0E8'],
  'logo-mark.svg': ['#082C23', '#BD9D56'],
}

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

describe('official brand SVG assets', () => {
  it('keeps all five official assets local, parseable, and free of unsafe SVG features', async () => {
    for (const assetName of assetNames) {
      const assetUrl = new URL(assetName, assetDirectory)
      const source = readFileSync(assetUrl, 'utf8')
      const viewBox = source.match(/viewBox=["']([^"']+)["']/i)?.[1]

      expect(statSync(assetUrl).size).toBeGreaterThan(0)
      expect(viewBox?.trim().split(/\s+/)).toHaveLength(4)
      expect(source).not.toMatch(/<text\b|<image\b|<script\b|<filter\b|<linearGradient\b|<radialGradient\b/i)
      expect(source).not.toMatch(/(?:href|src)=['"](?:https?:)?\/\//i)
      expect(source).not.toMatch(/data:image\/|@font-face|font-family/i)

      const colors = [...source.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(([color]) => color.toUpperCase())
      expect(new Set(colors)).toEqual(new Set(expectedColors[assetName]))

      const { data, info } = await sharp(Buffer.from(source))
        .resize({ width: 256, height: 256, fit: 'contain' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const bounds = opaqueBounds(data, info.width, info.height)
      expect(bounds.right).toBeGreaterThanOrEqual(bounds.left)
      expect(bounds.bottom).toBeGreaterThanOrEqual(bounds.top)
      expect(bounds.right - bounds.left + 1).toBeGreaterThan(96)
      expect(bounds.bottom - bounds.top + 1).toBeGreaterThan(48)
    }
  })

  it('keeps the browser title and favicon pointed at the official brand', () => {
    const documentSource = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')
    expect(documentSource).toContain('<title>上场 · TAKE THE FIELD</title>')
    expect(documentSource).toContain('name="application-name" content="上场"')
    expect(documentSource).toContain('property="og:title" content="上场 · TAKE THE FIELD"')
    expect(documentSource).toContain('href="/assets/brand/logo-mark.svg"')
  })
})
