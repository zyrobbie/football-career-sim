import { CareerHub } from '../components/CareerHub'
import { HonorBadge } from '../components/HonorBadge'
import { Icon } from '../components/Icons'
import { ATTRIBUTE_LABELS } from '../data/balance'
import {
  canAdvanceBeyondWindow,
  DEMO_WINDOW_COUNT,
  playerAgeAtWindow,
} from '../engine/careerTime'
import { attributeKeys } from '../models/game'
import type {
  CareerHonor,
  ClubCompetitionStage,
  ClubSeasonResult,
} from '../models/game'
import { useGameStore } from '../store/gameStore'
import {
  firstTeamStatusLabel,
  formatEuro,
  nationalCompetitionLabel,
  nationalStageLabel,
  nationalTeamRoleLabel,
  roleLabel,
} from '../ui/format'

export function HalfYearReportScreen() {
  const game = useGameStore((state) => state.game)
  const advanceAfterReport = useGameStore(
    (state) => state.advanceAfterReport,
  )
  if (!game?.player || !game.lastReport) return null
  const report = game.lastReport
  const stats = report.stats
  const isProfessionalWindow =
    Boolean(game.contract) && game.windowIndex >= DEMO_WINDOW_COUNT
  const isDemoComplete =
    !isProfessionalWindow && game.history.length >= DEMO_WINDOW_COUNT
  const isCareerFinalWindow =
    isProfessionalWindow && !canAdvanceBeyondWindow(game.windowIndex)
  const age = playerAgeAtWindow(
    isCareerFinalWindow ? game.windowIndex : game.windowIndex + 1,
  )
  const reportTitle = halfYearReportTitle(game.windowIndex)
  const reportRole = report.contract?.actualRole ?? report.roleAfter

  return (
    <CareerHub
      game={game}
      layout="stack"
      sectionLabel={reportTitle}
    >
      <article className="report-page career-report">
        <header className="career-panel-heading">
          <Icon name="history" />
          <h1>{reportTitle}</h1>
          <span>
            {isCareerFinalWindow
              ? `${report.fromLabel} · 最后一个半年`
              : `${report.fromLabel} — ${report.toLabel}`}{' '}
            · {age}岁 ·{' '}
            {roleLabel(reportRole)}
          </span>
        </header>
        <div className="report-grid">
          <section className="report-main">
            <dl className="stat-strip">
              <Stat label="出场" value={stats.appearances} />
              <Stat label="首发" value={stats.starts} />
              <Stat label="进球" value={stats.goals} />
              <Stat label="助攻" value={stats.assists} />
              <Stat label="平均评分" value={stats.averageRating.toFixed(1)} />
            </dl>
            <div className="attribute-table" role="table" aria-label="这半年能力变化">
              <div role="row" className="attribute-table__head">
                <span role="columnheader">能力</span>
                <span role="columnheader">半年前</span>
                <span role="columnheader">现在</span>
                <span role="columnheader">变化</span>
              </div>
              {attributeKeys.map((key) => {
                const change = report.attributes[key]
                return (
                  <div key={key} role="row">
                    <strong role="cell">{ATTRIBUTE_LABELS[key]}</strong>
                    <span role="cell">{Math.round(change.before)}</span>
                    <span role="cell">{Math.round(change.after)}</span>
                    <Change value={change.delta} />
                  </div>
                )
              })}
            </div>
            {attributeKeys.some((key) => {
              const change = report.attributes[key]
              return change.delta > 0 && Math.round(change.before) === Math.round(change.after)
            }) ? (
              <p className="progress-note">
                部分能力已经在积累进步，只是还没有跨过下一个整数等级。
              </p>
            ) : null}
          </section>

          <aside className="report-side">
            {report.clubSeason || report.honors?.length ? (
              <SeasonHonorsReport
                season={report.clubSeason ?? null}
                honors={report.honors ?? []}
              />
            ) : null}
            {report.nationalTeam ? (
              <NationalTeamReport record={report.nationalTeam} />
            ) : null}
            {report.specialEvent ? (
              <section className="special-event-result">
              <h2>半年故事</h2>
                <strong>{report.specialEvent.title}</strong>
                <span>{report.specialEvent.choiceTitle}</span>
                <p>{report.specialEvent.outcomeSummary}</p>
              </section>
            ) : null}
            {report.consequenceSummaries?.length ? (
              <section className="consequence-result">
                <h2>持续影响</h2>
                {report.consequenceSummaries.map((summary) => (
                  <p key={summary}>{summary}</p>
                ))}
              </section>
            ) : null}
            <section className="report-side__states">
              <h2>状态与关系</h2>
              <ReportChange label="竞技状态" change={report.states.form} />
              <ReportChange label="身体状态" change={report.states.fitness} />
              <ReportChange label="心理状态" change={report.states.morale} />
              <ReportChange label="教练关系" change={report.relations.coach} />
              <ReportChange label="队内关系" change={report.relations.squad} />
              <ReportChange label="球迷关系" change={report.relations.fans} />
            </section>
            <section className="report-side__finance">
              <h2>收入与现金</h2>
              <MoneyRow
                label={report.incomeLabel ?? '青训津贴'}
                value={report.stipendEuro}
                positive
              />
              <MoneyRow label="额外支出" value={report.expenseEuro} />
              <MoneyRow label="可支配现金" value={report.cashAfterEuro} />
            </section>
            {report.contract ? (
              <ContractReport contract={report.contract} />
            ) : (
              <section className="first-team-report">
                <h2>距离一线队</h2>
                <ReportChange
                  label="关注度"
                  change={report.firstTeam.attention}
                />
                <div className="first-team-report__metrics">
                  <span>准备程度 {Math.round(report.firstTeam.readiness.after)}</span>
                  <span>比赛表现 {Math.round(report.firstTeam.matchProof.after)}</span>
                  <span>教练推荐 {Math.round(report.firstTeam.coachBacking.after)}</span>
                </div>
                <strong>
                  {firstTeamStatusLabel(report.firstTeam.statusAfter)}
                </strong>
                <p>{report.firstTeam.outcomeSummary}</p>
              </section>
            )}
            {report.injury ? (
              <section className="injury-note">
                <h2>身体情况</h2>
                <p>这半年经历了一次轻微伤病，缺阵约{report.injury.weeks}周。</p>
              </section>
            ) : null}
          </aside>
        </div>

        <section className="report-footer">
          <div>
            <h2>
              {isCareerFinalWindow ? '最后一个赛季结束了' : `接下来：${report.toLabel}`}
            </h2>
            <p className="event-summary">{report.eventSummary}</p>
            {isCareerFinalWindow ? (
              <ul>
                <li>最后一个赛季已经结束。看完这份回顾，你将正式走向退役。</li>
              </ul>
            ) : (
              <ul>
                {report.hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            )}
            <p className="autosave-line">
              <Icon name="save" />
              进度已保存
            </p>
          </div>
          <button
            type="button"
            className="button button--primary"
            onClick={advanceAfterReport}
          >
            {isProfessionalWindow
              ? isCareerFinalWindow
                ? '结束最后一个半年'
                : '结束这半年'
              : isDemoComplete
              ? '结束青训第二年'
              : `进入${report.toLabel}`}
            <Icon name="arrow" />
          </button>
        </section>
      </article>
    </CareerHub>
  )
}

function clubStageLabel(stage: ClubCompetitionStage): string {
  return {
    NOT_ENTERED: '未参赛',
    EARLY_EXIT: '早期出局',
    ROUND_OF_16: '16强',
    QUARTER_FINAL: '8强',
    SEMI_FINAL: '4强',
    RUNNER_UP: '亚军',
    CHAMPION: '冠军',
  }[stage]
}

function SeasonHonorsReport({
  season,
  honors,
}: {
  season: ClubSeasonResult | null
  honors: CareerHonor[]
}) {
  return (
    <section className="season-honors-report">
      <h2>{season?.seasonLabel ?? '这半年拿到的荣誉'}</h2>
      {season ? (
        <dl className="season-honors-report__results">
          <div>
            <dt>联赛</dt>
            <dd>第{season.leaguePosition}名</dd>
          </div>
          <div>
            <dt>国内杯赛</dt>
            <dd>{clubStageLabel(season.domesticCupStage)}</dd>
          </div>
          <div>
            <dt>{season.continentalLabel ?? '洲际赛事'}</dt>
            <dd>{clubStageLabel(season.continentalStage)}</dd>
          </div>
        </dl>
      ) : null}
      <div className="season-honors-report__awards">
        {honors.length > 0 ? (
          honors.map((item) => <strong key={item.id}><HonorBadge honor={item} size={24} />{item.label}</strong>)
        ) : (
          <span>这赛季还没有新增荣誉</span>
        )}
      </div>
    </section>
  )
}

function NationalTeamReport({
  record,
}: {
  record: NonNullable<
    import('../models/game').HalfYearReport['nationalTeam']
  >
}) {
  return (
    <section className="national-team-report">
      <h2>中国国家队</h2>
      {record.calledUp && record.role ? (
        <>
          <div className="national-team-report__summary">
            <strong>{nationalTeamRoleLabel(record.role)}</strong>
            <span>
              {nationalCompetitionLabel(record.competition)}
              {record.stage ? ` · ${nationalStageLabel(record.stage)}` : ''}
            </span>
          </div>
          <dl>
            <div><dt>出场</dt><dd>{record.appearances}</dd></div>
            <div><dt>首发</dt><dd>{record.starts}</dd></div>
            <div><dt>进球</dt><dd>{record.goals}</dd></div>
            <div><dt>助攻</dt><dd>{record.assists}</dd></div>
          </dl>
          <p>{record.summary}</p>
        </>
      ) : (
        <>
          <strong>这半年没有入选</strong>
          <p>{record.summary}</p>
        </>
      )}
    </section>
  )
}

function halfYearReportTitle(windowIndex: number): string {
  if (windowIndex === DEMO_WINDOW_COUNT) {
    return '职业生涯第一个半年'
  }
  return [
    '第一个半年回顾',
    '青训第一年回顾',
    '第二年上半程回顾',
    '能进一线队了吗？',
  ][windowIndex] ?? `第${windowIndex + 1}次半年回顾`
}

function ContractReport({
  contract,
}: {
  contract: NonNullable<
    import('../models/game').HalfYearReport['contract']
  >
}) {
  return (
    <section className="contract-window-report">
      <h2>承诺兑现情况</h2>
      <dl>
        <div>
          <dt>合同承诺</dt>
          <dd>
            {contract.promisedTeamLevel === 'FIRST_TEAM'
              ? '一线队'
              : '青年队'}
            {' · '}
            {contract.promisedRole
              ? roleLabel(contract.promisedRole).replace('球员', '')
              : '没有角色承诺'}
          </dd>
        </div>
        <div>
          <dt>实际角色</dt>
          <dd>
            {contract.actualTeamLevel === 'FIRST_TEAM'
              ? '一线队'
              : '青年队'}
            {' · '}
            {roleLabel(contract.actualRole).replace('球员', '')}
          </dd>
        </div>
        <div>
          <dt>剩余合同</dt>
          <dd>{contract.remainingHalfYears / 2}年</dd>
        </div>
      </dl>
      <strong
        className={
          contract.promiseFulfilled ? 'is-positive' : 'is-negative'
        }
      >
        {contract.promiseFulfilled ? '已兑现' : '未兑现'}
      </strong>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function Change({ value }: { value: number }) {
  const rounded = Math.round(value * 10) / 10
  return (
    <span
      role="cell"
      className={rounded > 0 ? 'is-positive' : rounded < 0 ? 'is-negative' : ''}
    >
      {rounded > 0 ? '+' : ''}
      {rounded}
      {rounded > 0 ? ' ▲' : rounded < 0 ? ' ▼' : ' —'}
    </span>
  )
}

function ReportChange({
  label,
  change,
}: {
  label: string
  change: { before: number; after: number; delta: number }
}) {
  return (
    <div className="report-change">
      <span>{label}</span>
      <strong>
        {Math.round(change.before)}
        <i>→</i>
        <em
          className={
            change.delta > 0
              ? 'is-positive'
              : change.delta < 0
                ? 'is-negative'
                : ''
          }
        >
          {Math.round(change.after)}
        </em>
      </strong>
    </div>
  )
}

function MoneyRow({
  label,
  value,
  positive = false,
}: {
  label: string
  value: number
  positive?: boolean
}) {
  return (
    <div className="report-change">
      <span>{label}</span>
      <strong className={positive ? 'is-positive' : ''}>
        {positive ? '+' : ''}
        {formatEuro(value)}
      </strong>
    </div>
  )
}
