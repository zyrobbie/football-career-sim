import { useState, type ReactNode } from 'react'
import { ATTRIBUTE_LABELS, CLUBS } from '../data/balance'
import { clubDisplayNameForCompatibleId } from '../data/clubs/clubChineseNames'
import { ClubCrest } from './ClubCrest'
import { careerWindowLabel, playerAgeAtWindow } from '../engine/careerTime'
import { calculateOverall } from '../engine/player'
import {
  attributeKeys,
  type Attributes,
  type GameState,
  type HalfYearStats,
  type SquadRole,
  type TeamLevel,
} from '../models/game'
import {
  firstTeamStatusLabel,
  formatEuro,
  roleLabel,
} from '../ui/format'
import { AppShell } from './AppShell'
import { CareerTopbar, currentCareerClub } from './CareerTopbar'
import { Icon } from './Icons'
import { visibleCareerWindowIndex } from '../ui/careerView'

type CareerHubLayout = 'split' | 'stack'

interface CareerHubProps {
  game: GameState
  children: ReactNode
  layout?: CareerHubLayout
  sectionLabel: string
}

interface LedgerRow {
  key: string
  clubId: string
  windowIndex: number
  clubName: string
  shortMark: string
  role: SquadRole | null
  attributes: Attributes
  stats: HalfYearStats | null
  teamLevel: TeamLevel
  current: boolean
}

function clubNameFor(game: GameState, clubId: string): string {
  const fallback =
    CLUBS.find((club) => club.id === clubId)?.name ??
    game.academyOffers.find((offer) => offer.club.id === clubId)?.club.name ??
    '未知俱乐部'
  return clubDisplayNameForCompatibleId(clubId, fallback)
}

function clubShortMarkFor(game: GameState, clubId: string, clubName: string): string {
  return (
    CLUBS.find((club) => club.id === clubId)?.shortMark ??
    game.academyOffers.find((offer) => offer.club.id === clubId)?.club.shortMark ??
    clubName.slice(0, 1)
  )
}

function buildLedgerRows(game: GameState): LedgerRow[] {
  if (!game.player) return []
  const rows: LedgerRow[] = game.history.map((entry, index) => {
    const clubName = clubDisplayNameForCompatibleId(
      entry.clubId,
      entry.clubName ?? clubNameFor(game, entry.clubId),
    )
    return {
      key: `${entry.windowIndex}-${entry.clubId}-${index}`,
      clubId: entry.clubId,
      windowIndex: entry.windowIndex,
      clubName,
      shortMark: clubShortMarkFor(game, entry.clubId, clubName),
      role: entry.role,
      attributes: entry.endingAttributes,
      stats: entry.stats,
      teamLevel: entry.teamLevel ?? 'YOUTH',
      current: index === game.history.length - 1,
    }
  })

  const shouldShowPending =
    ![
      'HALF_YEAR_REPORT',
      'CAREER_DASHBOARD',
      'PRO_CONTRACT_OFFER',
      'PRO_CONTRACT_COMPLETE',
      'PRO_STAGE_COMPLETE',
    ].includes(game.phase) &&
    !game.history.some((entry) => entry.windowIndex === game.windowIndex)

  if (shouldShowPending) {
    const clubId = game.selectedClubId ?? ''
    const clubName = clubId
      ? clubNameFor(game, clubId)
      : '等待选择俱乐部'
    rows.push({
      key: `pending-${game.windowIndex}`,
      clubId,
      windowIndex: game.windowIndex,
      clubName,
      shortMark: clubShortMarkFor(game, clubId, clubName),
      role:
        game.teamLevel === 'FIRST_TEAM'
          ? game.firstTeamRole
          : game.youthRole,
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
  const currentWindowIndex = visibleCareerWindowIndex(game)
  const currentClub = currentCareerClub(game)
  const clubName = currentClub
    ? `${currentClub.name}${
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
      topbar={<CareerTopbar game={game} sectionLabel={sectionLabel} />}
    >
      <div className="career-hub">
        <PlayerOverview
          game={game}
          age={playerAgeAtWindow(currentWindowIndex)}
          clubId={currentClub?.id ?? null}
          clubShortMark={currentClub?.shortMark ?? '足'}
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
  clubId,
  clubShortMark,
  clubName,
  overall,
  totalStats,
}: {
  game: GameState
  age: number
  clubId: string | null
  clubShortMark: string
  clubName: string
  overall: number
  totalStats: { appearances: number; goals: number; assists: number }
}) {
  const player = game.player!
  const latest = game.phase.startsWith('TRANSFER_')
    ? null
    : game.lastReport

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
        <strong className="career-overview__club">
          <ClubCrest clubId={clubId} shortMark={clubShortMark} className="club-crest--overview" />
          {clubName}
        </strong>
        <small>
          {game.teamLevel === 'FIRST_TEAM'
            ? game.firstTeamRole
              ? `一线队 · ${roleLabel(game.firstTeamRole)}`
              : '一线队球员'
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
      <div className="career-overview__performance">
        <div className="career-overview__totals">
          <p>
            {game.history.some((entry) => entry.teamLevel === 'FIRST_TEAM')
              ? '生涯累计'
              : '生涯累计（青年队）'}
          </p>
          <dl>
            <OverviewNumber label="出场" value={totalStats.appearances} />
            <OverviewNumber label="进球" value={totalStats.goals} />
            <OverviewNumber label="助攻" value={totalStats.assists} />
          </dl>
          {game.nationalTeam.caps > 0 || game.nationalTeam.retired ? (
            <p className="career-overview__national">
              <strong>中国队</strong>
              <span>
                {game.nationalTeam.caps}场 · {game.nationalTeam.goals}球 ·{' '}
                {game.nationalTeam.assists}助
              </span>
              {game.nationalTeam.retired ? <em>已退出</em> : null}
            </p>
          ) : null}
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
  const latest = game.phase.startsWith('TRANSFER_')
    ? null
    : game.lastReport
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
  if (game.contract) {
    const currentRole =
      game.teamLevel === 'FIRST_TEAM'
        ? game.firstTeamRole
        : game.youthRole
    const isCompletedWindow =
      game.phase === 'HALF_YEAR_REPORT' ||
      game.phase === 'PRO_STAGE_COMPLETE'
    const actualRole = isCompletedWindow
      ? game.lastReport?.contract?.actualRole ?? currentRole
      : currentRole
    const promisedRole = game.contract.promisedRole
    const transferContractLength = game.transferOffers.find(
      (offer) =>
        offer.clubId === game.contract?.clubId &&
        !offer.withdrawn,
    )?.remainingHalfYears
    const contractProgress = Math.max(
      0,
      Math.min(
        100,
        (game.contract.remainingHalfYears /
          Math.max(
            transferContractLength ??
              game.professionalOffer?.remainingHalfYears ??
              game.contract.remainingHalfYears,
            1,
          )) *
          100,
      ),
    )
    const fulfilled =
      (game.phase.startsWith('TRANSFER_')
        ? null
        : game.lastReport?.contract?.promiseFulfilled) ??
      (game.contract.brokenPromiseWindows === 0)

    return (
      <section className="first-team-path" aria-label="职业合同状态">
        <div className="first-team-path__summary">
          <span>合同剩余</span>
          <strong className="first-team-path__contract-term">
            {game.contract.remainingHalfYears / 2}
            <small>年</small>
          </strong>
          <em className={fulfilled ? 'is-positive' : 'is-negative'}>
            {fulfilled ? '承诺正常' : '承诺未兑现'}
          </em>
        </div>
        <i className="first-team-path__bar" aria-hidden="true">
          <b style={{ width: `${contractProgress}%` }} />
        </i>
        <dl>
          <div>
            <dt>合同层级</dt>
            <dd>
              {game.contract.promisedTeamLevel === 'FIRST_TEAM'
                ? '一线队'
                : '青年队'}
            </dd>
          </div>
          <div>
            <dt>承诺角色</dt>
            <dd>
              {promisedRole
                ? roleLabel(promisedRole).replace('球员', '')
                : '无'}
            </dd>
          </div>
          <div>
            <dt>实际角色</dt>
            <dd>
              {actualRole
                ? roleLabel(actualRole).replace('球员', '')
                : '待评估'}
            </dd>
          </div>
        </dl>
      </section>
    )
  }

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
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleRows = isExpanded ? rows : rows.slice(-1)

  return (
    <section className="career-ledger">
      <header>
        <Icon name="history" />
        <h2>生涯履历</h2>
        <span>{rows.length}个窗口</span>
      </header>
      <div
        className={`career-ledger__details${isExpanded ? ' is-open' : ''}`}
      >
        <CareerLedgerTable game={game} rows={visibleRows} />
        {rows.length > 1 ? (
          <button
            aria-expanded={isExpanded}
            className="career-ledger__toggle"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            type="button"
          >
            {isExpanded
              ? '▲ 收起完整履历'
              : `▼ 查看全部${rows.length}个窗口`}
          </button>
        ) : null}
      </div>
      <p>
        每个半年保留当时的俱乐部、地位、能力和青年队比赛数据。
      </p>
    </section>
  )
}

function CareerLedgerTable({
  game,
  rows,
}: {
  game: GameState
  rows: LedgerRow[]
}) {
  return (
    <div className="career-ledger__scroll">
      <table>
        <thead>
          <tr>
            <th>窗口</th>
            <th>年龄</th>
            <th>俱乐部</th>
            <th>队伍级别</th>
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
              <td>
                <span className="career-ledger__club">
                  <ClubCrest clubId={row.clubId} shortMark={row.shortMark} className="club-crest--ledger" />
                  {row.clubName}
                </span>
              </td>
              <td>
                {row.teamLevel === 'FIRST_TEAM' ? '一线队' : '青年队'}
              </td>
              <td>
                {row.role
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
  )
}
