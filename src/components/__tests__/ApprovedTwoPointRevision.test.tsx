import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { ProfessionalReportActions } from '../ProfessionalReportActions'
import { CareerHub } from '../CareerHub'
import { CareerNavigationProvider } from '../../app/careerNavigation'
import { ClubVisualThemeProvider } from '../../app/ClubVisualThemeProvider'
import { createEntertainmentV3Game } from '../../testing/createEntertainmentV3Game'

const model = vi.hoisted(() => ({ summary: '', primary: null, secondary: [], stayOpensMarket: false }))
vi.mock('../../store/professionalNextAction', () => ({ professionalNextAction: () => model }))
vi.mock('../../store/gameStore', () => ({ useGameStore: (select: (state: unknown) => unknown) => select({ advanceProfessionalReport: () => {}, reviewReport: () => {} }) }))

describe('approved V3.1.4 two-point presentation revision', () => {
  it('preserves actual club names even when they contain 青年队, without adding a squad suffix', () => {
    for (const teamLevel of ['YOUTH', 'FIRST_TEAM'] as const) {
      const game = createEntertainmentV3Game(26, 'eng_arsenal', 'TWO-POINT-CLUB')
      game.teamLevel = teamLevel
      game.youthRole = 'ROTATION'
      game.firstTeamRole = 'ROTATION'
      game.selectedClubId = 'test-actual-club-name'
      game.academyOffers[0] = { ...game.academyOffers[0]!, club: { ...game.academyOffers[0]!.club, id: game.selectedClubId, name: '真实青年队足球俱乐部' } }
      const html = renderToStaticMarkup(<CareerNavigationProvider careerKey="two-point"><ClubVisualThemeProvider game={game}><CareerHub game={game} sectionLabel="测试"><div /></CareerHub></ClubVisualThemeProvider></CareerNavigationProvider>)
      const title = html.match(/<strong class="career-overview__club">([\s\S]*?)<\/strong>/)?.[1]
      expect(title).toContain('<span>真实青年队足球俱乐部</span>')
      expect(title).not.toContain('俱乐部青年队')
      expect(title).not.toContain('俱乐部一线队')
      expect(html).toContain(teamLevel === 'FIRST_TEAM' ? '一线队 ·' : '青年队 ·')
    }
  })
  it('styles only the market-watching note and preserves dynamic wording verbatim', () => {
    const game = createEntertainmentV3Game(26, 'eng_arsenal', 'TWO-POINT-NOTE')
    for (const windows of [1, 3]) {
      model.summary = `经纪团队正在持续观察市场。转会机会不会每半年出现，下一次集中评估约在${windows}个窗口后。`
      const html = renderToStaticMarkup(<ProfessionalReportActions game={game} />)
      expect(html).toContain(`<p class="professional-report-actions__market-note">${model.summary}</p>`)
    }
    model.summary = '合同已经到期。先续约或接受新的自由身合同，再开始下一个半年。'
    expect(renderToStaticMarkup(<ProfessionalReportActions game={game} />)).not.toContain('professional-report-actions__market-note')
  })
  it('only compacts the mobile finance row and the targeted market note typography', () => {
    const css = readFileSync(new URL('../../styles/main.css', import.meta.url), 'utf8')
    const finance = css.match(/\.career-report \.report-side__finance \.report-change \{([^}]+)\}/)?.[1]
    expect(finance).toContain('min-height: 31px')
    expect(finance).toContain('padding: 0 4px')
    expect(finance).not.toContain('font-size')
    expect(css).toContain('.professional-report-actions > .professional-report-actions__market-note { font-size: 12px; line-height: 1.45; }')
  })
})
