import { describe, expect, it } from 'vitest'
import { createRetirementVisualAuditGame } from '../../testing/createRetirementVisualAuditGame'
import { CLUBS } from '../../data/clubs/runtimeClubCatalog'
import { buildRetirementSummary } from '../../engine/careerSummary'
import { buildCareerPosterSvg, careerPosterAssetPaths } from '../careerPosterSvg'
import { careerPosterSingleImageDimensions } from '../careerPosterExport'

const asset = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
function archive(count: number) {
  const game = createRetirementVisualAuditGame(CLUBS.slice(0, count).map(club => club.id))
  const before = JSON.stringify(game)
  const poster = buildCareerPosterSvg(game, Object.fromEntries(careerPosterAssetPaths(game).map(path => [path, asset])))
  expect(JSON.stringify(game)).toBe(before)
  return { game, poster }
}

describe('complete career archive output without changing approved layout', () => {
  for (const count of [8, 32]) it(`keeps every block of a ${count}-club archive in one readable image`, () => {
    const { game, poster } = archive(count)
    expect(buildRetirementSummary(game).clubs).toHaveLength(count)
    const image = careerPosterSingleImageDimensions(poster)
    expect(image.scale).toBeGreaterThanOrEqual(1.25)
    expect(image.width).toBe(Math.floor(poster.width * image.scale))
    expect(image.height).toBe(Math.floor(poster.height * image.scale))
    expect(poster.svg).toContain('扫码，开始你的球员生涯')
    if (count === 32) expect(image.width * image.height).toBeGreaterThan(12_000_000)
  })
})
