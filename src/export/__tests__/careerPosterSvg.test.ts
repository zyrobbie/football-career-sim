import { describe, expect, it } from 'vitest'
import { createRetirementVisualAuditGame } from '../../testing/createRetirementVisualAuditGame'
import { buildCareerPosterSvg, careerPosterAssetPaths, posterTextWidth, wrapPosterText } from '../careerPosterSvg'
import { buildRetirementSummary } from '../../engine/careerSummary'
const asset = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
const fixture = () => createRetirementVisualAuditGame(['ita_inter', 'ita_juventus'])
const assetsFor = (game: ReturnType<typeof fixture>) => Object.fromEntries(careerPosterAssetPaths(game).map(path => [path, asset]))
describe('canonical vector career poster', () => {
  it('renders deterministic self-contained SVG from real summary without mutating the game', () => {
    const game = fixture(), before = JSON.stringify(game)
    const result = buildCareerPosterSvg(game, assetsFor(game))
    expect(result).toEqual(buildCareerPosterSvg(game, assetsFor(game)))
    expect(result.width).toBe(780)
    expect(result.height).toBeGreaterThan(1000)
    expect(result.svg).toContain(`viewBox="0 0 780 ${result.height}"`)
    expect(result.svg).not.toMatch(/foreignObject|<script|href="https?:/)
    expect(JSON.stringify(game)).toBe(before)
    expect(result.svg).toContain('国际米兰')
    expect(result.svg).toContain('尤文图斯')
    expect(result.svg).toContain(`${buildRetirementSummary(game).seniorTotals.appearances}场`)
  })
  it('keeps phone typography readable, a safe top inset, and major sections vertically stacked', () => {
    const result = buildCareerPosterSvg(fixture(), assetsFor(fixture()))
    const nodes = [...result.svg.matchAll(/<text\b([^>]*)>(.*?)<\/text>/g)]
    const attribute = (attributes: string, name: string) => Number(attributes.match(new RegExp(` ${name}="([^"]+)"`))?.[1])
    nodes.forEach(([, attributes]) => {
      const size = attribute(attributes!, 'font-size')
      expect(size * 390 / result.width).toBeGreaterThanOrEqual(13)
      expect(attribute(attributes!, 'y') - size * .88).toBeGreaterThanOrEqual(96)
    })
    const headings = ['国家队生涯', '俱乐部生涯', '生涯评价', '荣誉室', '生涯标签']
      .map(label => nodes.find(([, attributes, content]) => content === label && attribute(attributes!, 'font-size') === 38)!)
    expect(headings.every(Boolean)).toBe(true)
    headings.forEach((node, index) => {
      expect(attribute(node[1]!, 'x')).toBe(44)
      if (index) expect(attribute(node[1]!, 'y')).toBeGreaterThan(attribute(headings[index - 1]![1]!, 'y'))
    })
  })
  it('escapes user-controlled text and preserves every character of a long name', () => {
    const game = fixture()
    game.player!.name = '<script>&"超长名字超长名字超长名字'
    const result = buildCareerPosterSvg(game, assetsFor(game))
    expect(result.svg).toContain('&lt;script&gt;')
    expect(result.svg).not.toContain('<script>')
    expect(result.svg).toContain('&amp;')
  })
  it('does not include financial receipts or raw operational summaries', () => {
    const result = buildCareerPosterSvg(fixture(), assetsFor(fixture()))
    expect(result.svg).not.toMatch(/退款|已执行|已终止|支付合计|completedPoints/)
    expect(result.svg).toContain('国家队生涯')
    expect(result.svg).not.toContain('场外生涯记忆')
  })
  it('wraps CJK, Latin and emoji without truncation and within conservative width', () => {
    const input = 'Robbie的足球人生😀跨越山海的长长名字'
    const rows = wrapPosterText(input, 24, 120)
    expect(rows.join('')).toBe(input)
    expect(rows.length).toBeGreaterThan(1)
    rows.forEach(row => expect(posterTextWidth(row, 24)).toBeLessThanOrEqual(120))
  })
  it('requires brand and QR assets instead of silently producing a broken share image', () => {
    expect(() => buildCareerPosterSvg(fixture(), {})).toThrow('Required poster asset missing')
    expect(new Set(careerPosterAssetPaths(fixture())).size).toBe(careerPosterAssetPaths(fixture()).length)
  })
  it('rejects a non-retired save rather than exporting incomplete results', () => {
    const game = fixture(); game.phase = 'HALF_YEAR_PLAN'
    expect(() => buildCareerPosterSvg(game, assetsFor(game))).toThrow('retired player')
  })
})
