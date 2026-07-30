import type { ReactNode } from 'react'
import { ATTRIBUTE_LABELS } from '../data/balance'
import {
  careerWindowLabel,
  playerAgeAtWindow,
} from '../engine/careerTime'
import { calculateOverall } from '../engine/player'
import {
  attributeKeys,
  type Attributes,
  type GameState,
  type HalfYearStats,
  type TeamLevel,
  type YouthRole,
} from '../models/game'
import {
  firstTeamStatusLabel,
  formatEuro,
  roleLabel,
} from '../ui/format'
import { AppShell } from './AppShell'
import { Icon } from './Icons'

type CareerHubLayout = 'split' | 'stack'

interface CareerHubProps {
  game: GameState
  children: ReactNode
  layout?: CareerHubLayout
  sectionLabel: string
}

interface LedgerRow {
  key: string
  windowIndex: number
  clubName: string
  role: YouthRole | null
  attributes: Attributes
  stats: HalfYearStats | null
  teamLevel: TeamLevel
  current: boolean
}

function visibleWindowIndex(game: GameState): number {
  return game.phase === 'HALF_YEAR_REPORT' ||
    game.phase === 'CAREER_DASHBOARD'
    ? game.windowIndex + 1
    : game.windowIndex
}

function clubNameFor(game: GameState, clubId: string): string {
  return (
    game.academyOffers.find((offer) => offer.club.id === clubId)?.club.name ??
    '未知俱乐部'
  )
}

function buildLedgerRows(game: GameState): LedgerRow[] {
  if (!game.player) return []
  const rows: LedgerRow[] = game.history.map((entry, index) => ({
    key: `${entry.windowIndex}-${entry.clubId}-${index}`,
    windowIndex: entry.windowIndex,
    clubName: entry.clubName ?? clubNameFor(game, entry.clubId),
    role: entry.role,
    attributes: entry.endingAttributes,
    stats: entry.stats,
    teamLevel: entry.teamLevel ?? 'YOUTH',
    current: index === game.history.length - 1,
  }))

  const shouldShowPending =
    !['HALF_YEAR_REPORT', 'CAREER_DASHBOARD'].includes(game.phase) &&
    !game.history.some((entry) => entry.windowIndex === game.windowIndex)

  if (shouldShowPending) {
    rows.push({
      key: `pending-${game.windowIndex}`,
      windowIndex: game.windowIndex,
      clubName: game.selectedClubId
        ? clubNameFor(game, game.selectedClubId)
        : '等待选择俱乐部',
      role: game.youthRole,
      attributes: game.player.attributes,
      stats: null,
      teamLevel: game.teamLevel,
      current: true,
    })
  }

  return rows.map((row, index) => ({
    ...row,
    current: index === rows.length - 1,
  }))
}

export function CareerHub({
  game,
  children,
  layout = 'split',
  sectionLabel,
}: CareerHubProps) {
  if (!game.player) return null
  const player = game.player
  const currentWindowIndex = visibleWindowIndex(game)
  const currentOffer = game.selectedClubId
    ? game.academyOffers.find(
        (offer) => offer.club.id === game.selectedClubId,
      )
    : null
  const clubName = currentOffer
    ? `${currentOffer.club.name}${
        game.teamLevel === 'FIRST_TEAM' ? '一线队' : '青年队'
      }`
    : '等待选择第一家俱乐部'
  const totalStats = game.history.reduce(
    (totals, entry) => ({
      appearances: totals.appearances + entry.stats.appearances,
      goals: totals.goals + entry.stats.goals,
      assists: totals.assists + entry.stats.assists,
    }),
    { appearances: 0, goals: 0, assists: 0 },
  )
  const overall = Math.round(
    calculateOverall(player.attributes, player.primaryPosition),
  )
  const ledgerRows = buildLedgerRows(game)

  return (
    <AppShell
      topbar={
        <>
          <span className="topbar__time">
            <Icon name="calendar" />
            {careerWindowLabel(game.startYear, currentWindowIndex)}窗口
          </span>
          <span className="topbar__save-state">
            <i aria-hidden="true" />
            自动保存中
          </span>
          <span>{currentOffer ? `当前俱乐部：${clubName}` : sectionLabel}</span>
        </>
      }
    >
      <div className="career-hub">
        <PlayerOverview
          game={game}
          age={playerAgeAtWindow(currentWindowIndex)}
          clubName={clubName}
          overall={overall}
          totalStats={totalStats}
        />
        <CareerMeters game={game} />
        <FirstTeamPath game={game} />
        <div
          className={`career-workspace${
            layout === 'stack' ? ' career-workspace--stack' : ''
          }`}
        >
          <CareerLedger
            game={game}
            rows={ledgerRows}
          />
          <section className="career-active" aria-label={sectionLabel}>
            {children}
          </section>
        </div>
      </div>
    </AppShell>
  )
}

function PlayerOverview({
  game,
  age,
  clubName,
  overall,
  totalStats,
}: {
  game: GameState
  age: number
  clubName: string
  overall: number
  totalStats: { appearances: number; goals: number; assists: number }
}) {
  const player = game.player!
  const latest = game.lastReport

  return (
    <section className="career-overview" aria-label="球员总览">
      <div className="career-overview__overall">
        <span>OVR</span>
        <strong>{overall}</strong>
      </div>
      <div className="career-overview__identity">
        <h1>{player.name}</h1>
        <p>
          {age}岁 · #{player.jerseyNumber} · {player.primaryPosition}
        </p>
        <strong>{clubName}</strong>
        <small>
          {game.teamLevel === 'FIRST_TEAM'
            ? '一线队球员'
            : game.youthRole
              ? `青年队 · ${roleLabel(game.youthRole)}`
              : '自由球员'}
        </small>
      </div>
      <div className="career-overview__cash">
        <span>可支配现金</span>
        <strong>{formatEuro(game.cashEuro)}</strong>
        {latest ? (
          <small>
            本窗口{' '}
            {latest.stipendEuro - latest.expenseEuro >= 0 ? '+' : ''}
            {formatEuro(latest.stipendEuro - latest.expenseEuro)}
          </small>
        ) : null}
      </div>
      <div className="career-overview__totals">
        <p>生涯累计（青年队）</p>
        <dl>
          <OverviewNumber label="出场" value={totalStats.appearances} />
          <OverviewNumber label="进球" value={totalStats.goals} />
          <OverviewNumber label="助攻" value={totalStats.assists} />
        </dl>
      </div>
      <div className="career-overview__attributes">
        <p>核心属性</p>
        <dl>
          {attributeKeys.map((key) => {
            const delta = latest?.attributes[key].delta ?? 0
            return (
              <div key={key}>
                <dt>{ATTRIBUTE_LABELS[key]}</dt>
                <dd>{Math.round(player.attributes[key])}</dd>
                {latest ? (
                  <small
                    className={
                      delta > 0
                        ? 'is-positive'
                        : delta < 0
                          ? 'is-negative'
                          : ''
                    }
                  >
                    {delta > 0 ? '+' : ''}
                    {Math.round(delta * 10) / 10}
                  </small>
                ) : null}
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}

function OverviewNumber({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div>
      <dd>{value}</dd>
      <dt>{label}</dt>
    </div>
  )
}

function CareerMeters({ game }: { game: GameState }) {
  const player = game.player!
  const latest = game.lastReport
  const meters = [
    ['竞技状态', player.form, latest?.states.form.delta],
    ['身体状态', player.fitness, latest?.states.fitness.delta],
    ['心理状态', player.morale, latest?.states.morale.delta],
    ['教练关系', player.coachRelation, latest?.relations.coach.delta],
    ['队内关系', player.squadRelation, latest?.relations.squad.delta],
    ['球迷关系', player.fanRelation, latest?.relations.fans.delta],
  ] as const

  return (
    <section className="career-meters" aria-label="状态与关系">
      {meters.map(([label, value, delta]) => (
        <div className="career-meter" key={label}>
          <span>
            {label}
            {delta !== undefined ? (
              <em
                className={
                  delta > 0
                    ? 'is-positive'
                    : delta < 0
                      ? 'is-negative'
                      : ''
                }
              >
                {delta > 0 ? '+' : ''}
                {Math.round(delta * 10) / 10}
              </em>
            ) : null}
            <strong>{Math.round(value)}</strong>
          </span>
          <i aria-hidden="true">
            <b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
          </i>
        </div>
      ))}
    </section>
  )
}

function FirstTeamPath({ game }: { game: GameState }) {
  const progress = game.firstTeamProgress
  const latest = game.lastReport?.firstTeam
  const metrics = [
    ['培养准备', progress.readiness, latest?.readiness.delta],
    ['比赛证明', progress.matchProof, latest?.matchProof.delta],
    ['教练推荐', progress.coachBacking, latest?.coachBacking.delta],
  ] as const

  return (
    <section className="first-team-path" aria-label="一线队通道">
      <div className="first-team-path__summary">
        <span>一线队关注度</span>
        <strong>{Math.round(progress.attention)}</strong>
        {latest ? (
          <em
            className={
              latest.attention.delta > 0
                ? 'is-positive'
                : latest.attention.delta < 0
                  ? 'is-negative'
                  : ''
            }
          >
            {latest.attention.delta > 0 ? '+' : ''}
            {Math.round(latest.attention.delta)}
          </em>
        ) : null}
        <small>{firstTeamStatusLabel(progress.status)}</small>
      </div>
      <i className="first-team-path__bar" aria-hidden="true">
        <b style={{ width: `${progress.attention}%` }} />
      </i>
      <dl>
        {metrics.map(([label, value, delta]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{Math.round(value)}</dd>
            {delta !== undefined ? (
              <small
                className={
                  delta > 0
                    ? 'is-positive'
                    : delta < 0
                      ? 'is-negative'
                      : ''
                }
              >
                {delta > 0 ? '+' : ''}
                {Math.round(delta)}
              </small>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  )
}

function CareerLedger({
  game,
  rows,
}: {
  game: GameState
  rows: LedgerRow[]
}) {
  return (
    <section className="career-ledger">
      <header>
        <Icon name="history" />
        <h2>生涯履历</h2>
      </header>
      <div className="career-ledger__scroll">
        <table>
          <thead>
            <tr>
              <th>窗口</th>
              <th>年龄</th>
              <th>俱乐部</th>
              <th>地位</th>
              <th>能力</th>
              <th>出场</th>
              <th>进球</th>
              <th>助攻</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className={row.current ? 'is-current' : ''} key={row.key}>
                <td>
                  {careerWindowLabel(game.startYear, row.windowIndex)
                    .replace('年', '')
                    .replace('季', '')}
                </td>
                <td>{playerAgeAtWindow(row.windowIndex)}</td>
                <td>{row.clubName}</td>
                <td>
                  {row.teamLevel === 'FIRST_TEAM'
                    ? '一线队'
                    : row.role
                    ? roleLabel(row.role).replace('球员', '')
                    : '待选择'}
                </td>
                <td>
                  {Math.round(
                    calculateOverall(
                      row.attributes,
                      game.player!.primaryPosition,
                    ),
                  )}
                </td>
                <td>{row.stats?.appearances ?? '—'}</td>
                <td>{row.stats?.goals ?? '—'}</td>
                <td>{row.stats?.assists ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        每个半年保留当时的俱乐部、地位、能力和青年队比赛数据。
      </p>
    </section>
  )
}
