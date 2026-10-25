import { describe, expect, it } from 'vitest'
import { createRetirementVisualAuditGame } from '../../testing/createRetirementVisualAuditGame'
import { CLUBS } from '../../data/clubs/runtimeClubCatalog'
import { buildRetirementSummary } from '../../engine/careerSummary'
import { buildCareerPosterSvg, careerPosterAssetPaths } from '../careerPosterSvg'
import { careerPosterPageSvg, planCareerPosterPages } from '../careerPosterExport'

const asset = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
function archive(count: number) {
  const game = createRetirementVisualAuditGame(CLUBS.slice(0, count).map(club => club.id))
  const before = JSON.stringify(game)
  const poster = buildCareerPosterSvg(game, Object.fromEntries(careerPosterAssetPaths(game).map(path => [path, asset])))
  expect(JSON.stringify(game)).toBe(before)
  return { game, poster }
}

describe('real career archive pagination without changing approved layout', () => {
  it('keeps an ordinary 8-club archive complete in one readable image', () => {
    const { game, poster } = archive(8)
    expect(buildRetirementSummary(game).clubs).toHaveLength(8)
    const pages = planCareerPosterPages(poster)
    expect(pages).toHaveLength(1)
    expect(pages[0]!.scale).toBeGreaterThanOrEqual(1.25)
    expect(pages[0]!.y).toBe(0)
    expect(pages[0]!.height).toBe(poster.height)
  })
  it('keeps the whole 32-club preview and exports every semantic block without clipped text', () => {
    const { game, poster } = archive(32)
    expect(buildRetirementSummary(game).clubs).toHaveLength(32)
    const pages = planCareerPosterPages(poster)
    expect(pages.length).toBeGreaterThan(1)
    const textBounds = [...poster.svg.matchAll(/<text\b([^>]*)>/g)].map(([, attributes]) => {
      const y = Number(attributes!.match(/ y="([^"]+)"/)?.[1])
      const size = Number(attributes!.match(/ font-size="([^"]+)"/)?.[1])
      return [y - size * .88, y + size * .25]
    })
    pages.forEach((page, index) => {
      expect(page.scale).toBe(2)
      expect(Math.floor(poster.width * page.scale) * Math.floor(page.height * page.scale)).toBeLessThanOrEqual(12_000_000)
      if (index) expect(page.y).toBe(pages[index - 1]!.y + pages[index - 1]!.height)
      const clipped = careerPosterPageSvg(poster, page)
      // Root viewport only: all source vectors, assets and text remain byte-for-byte unchanged.
      expect(clipped.slice(clipped.indexOf('>') + 1)).toBe(poster.svg.slice(poster.svg.indexOf('>') + 1))
      if (index < pages.length - 1) {
        const cut = page.y + page.height
        expect(poster.pageBreaks).toContain(cut)
        for (const [top, bottom] of textBounds) expect(cut > top! && cut < bottom!).toBe(false)
      }
    })
    expect(pages[0]!.y).toBe(0)
    expect(pages.at(-1)!.y + pages.at(-1)!.height).toBe(poster.height)
    expect(poster.svg).toContain('扫码，开始你的球员生涯')
  })
})
