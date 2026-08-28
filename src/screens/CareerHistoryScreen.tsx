import { AppShell } from '../components/AppShell'
import { CareerTopbar } from '../components/CareerTopbar'
import { ClubCrest } from '../components/ClubCrest'
import { HonorBadge } from '../components/HonorBadge'
import { aggregateCareerHonors } from '../engine/honorAggregation'
import { Icon } from '../components/Icons'
import type { CareerHonor, GameState, TeamLevel } from '../models/game'
import { nationalStageLabel, roleLabel } from '../ui/format'
import { buildCareerHistoryView } from '../ui/careerHistoryView'

function teamLevelLabel(level: TeamLevel): string {
  return level === 'FIRST_TEAM' ? '一线队' : '青年队'
}

function HonorGroup({ label, honors }: { label: string; honors: CareerHonor[] }) {
  const grouped = aggregateCareerHonors(honors)
  return (
    <section className="history-honors__group">
      <h3>{label}</h3>
      {grouped.length > 0 ? (
        <ul>{grouped.map((honor) => <li key={honor.key}><HonorBadge honor={{ type: honor.type, competitionLabel: honor.competitionLabel, label: honor.displayLabel }} />{honor.displayLabel} ×{honor.count}<small>{honor.seasons.join('、')}</small></li>)}</ul>
      ) : <p>尚无</p>}
    </section>
  )
}

export function CareerHistoryScreen({ game }: { game: GameState }) {
  if (!game.player) return null
  const view = buildCareerHistoryView(game)

  return (
    <AppShell topbar={<CareerTopbar game={game} sectionLabel="履历" />}>
      <main className="history-screen">
        <header className="history-screen__title">
          <span>履历</span>
          <small>你踢过的每个完整赛季，都留在这里。</small>
        </header>

        <section className="history-screen__overview" aria-label="生涯概览">
          <div><span>完成半年</span><strong>{view.completedWindows}</strong></div>
          <div><span>效力俱乐部</span><strong>{view.clubCount}</strong></div>
          <div><span>俱乐部出场</span><strong>{view.totals.appearances}</strong></div>
          <div><span>俱乐部进球</span><strong>{view.totals.goals}</strong></div>
          <div><span>俱乐部助攻</span><strong>{view.totals.assists}</strong></div>
          <p>青年队 {view.totals.youthAppearances} 场 · 一线队 {view.totals.seniorAppearances} 场 · 国家队 {view.totals.nationalAppearances} 场</p>
        </section>

        <section className="history-screen__section" aria-label="生涯时间线">
          <header><Icon name="history" /><h2>生涯时间线</h2></header>
          {view.seasons.length === 0 ? (
            <p className="history-screen__empty">完成一个完整赛季后，你的生涯时间线会从这里开始。</p>
          ) : (
            <>
              <div className="history-windows" role="table" aria-label="生涯时间线表格">
                <div className="history-windows__head" role="row"><span>赛季</span><span>年龄</span><span>俱乐部</span><span>赛季末队伍</span><span>赛季末角色</span><span>OVR</span><span>出场</span><span>进球</span><span>助攻</span></div>
                {view.seasons.map((entry) => (
                  <article className="history-windows__row" role="row" key={entry.endWindowIndex}>
                    <span>{entry.seasonLabel}</span><span>{entry.age}岁</span><strong title={entry.clubName}>{entry.clubName}</strong><span>{teamLevelLabel(entry.teamLevel)}</span><span>{roleLabel(entry.role)}</span><strong>{entry.overall}</strong><span>{entry.appearances}</span><span>{entry.goals}</span><span>{entry.assists}</span>
                  </article>
                ))}
              </div>
              <div className="history-windows__mobile" aria-label="生涯时间线移动端列表">
                {view.seasons.map((entry) => (
                  <article key={entry.endWindowIndex}>
                    <div><span>{entry.seasonLabel} · {entry.age}岁</span><strong title={entry.clubName}>{entry.clubName}</strong><span>{teamLevelLabel(entry.teamLevel)}</span></div>
                    <div><span>{roleLabel(entry.role)}</span><strong>OVR {entry.overall}</strong><span>{entry.appearances}场 · {entry.goals}球 · {entry.assists}助</span></div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="history-screen__section" aria-label="俱乐部生涯数据汇总">
          <header><Icon name="career" /><h2>俱乐部生涯</h2></header>
          {view.clubs.length === 0 ? <p className="history-screen__empty">你的俱乐部履历还没有开始。</p> : (
            <div className="history-clubs">
              {view.clubs.map((club) => (
                <article key={club.clubId}>
                  <header><ClubCrest clubId={club.clubId} shortMark={club.shortMark} className="club-crest--overview" /><div><h3>{club.clubName}</h3><p>{club.country} · {club.levelLabel} · {club.teamLevelLabel}</p></div></header>
                  <p className="history-clubs__spells">{club.serviceSpells.map((spell) => <span key={`${club.clubId}-${spell.firstWindowIndex}`}>{spell.label}</span>)}</p>
                  <dl><div><dt>出场</dt><dd>{club.appearances}</dd></div><div><dt>进球</dt><dd>{club.goals}</dd></div><div><dt>助攻</dt><dd>{club.assists}</dd></div><div><dt>峰值 OVR</dt><dd>{club.peakOverall}</dd></div></dl>
                  <div className="history-clubs__honors">{club.honors.length > 0 ? <><span>俱乐部荣誉：</span>{aggregateCareerHonors(club.honors).map((honor) => <span className="history-clubs__honor" key={honor.key}><HonorBadge honor={{ type: honor.type, competitionLabel: honor.competitionLabel, label: honor.displayLabel }} />{honor.displayLabel} ×{honor.count}</span>)}</> : '俱乐部荣誉：还没有'}</div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="history-screen__section history-screen__national" aria-label="国家队生涯">
          <header><Icon name="player" /><h2>国家队生涯</h2></header>
          {view.nationalTeam.appearances === 0 ? <p className="history-screen__empty">你还没有入选中国国家队。</p> : (
            <dl><div><dt>出场</dt><dd>{view.nationalTeam.appearances}</dd></div><div><dt>进球</dt><dd>{view.nationalTeam.goals}</dd></div><div><dt>助攻</dt><dd>{view.nationalTeam.assists}</dd></div><div><dt>世界杯最佳</dt><dd>{view.nationalTeam.worldCupBest ? nationalStageLabel(view.nationalTeam.worldCupBest) : '无正赛记录'}</dd></div><div><dt>亚洲杯最佳</dt><dd>{view.nationalTeam.asianCupBest ? nationalStageLabel(view.nationalTeam.asianCupBest) : '无正赛记录'}</dd></div></dl>
          )}
        </section>

        <section className="history-screen__section" aria-label="荣誉室">
          <header><Icon name="check" /><h2>荣誉室</h2></header>
          <div className="history-honors"><HonorGroup label="俱乐部" honors={view.honors.club} /><HonorGroup label="国家队" honors={view.honors.national} /><HonorGroup label="个人" honors={view.honors.individual} /></div>
        </section>
      </main>
    </AppShell>
  )
}
