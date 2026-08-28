import { useRef } from 'react'
import { Brand } from '../components/Brand'
import { CareerHub } from '../components/CareerHub'
import { ClubCrest } from '../components/ClubCrest'
import { HonorBadge } from '../components/HonorBadge'
import { Icon } from '../components/Icons'
import { RetirementRecordExportActions } from '../components/RetirementRecordExportActions'
import { runtimeClubById } from '../data/clubs/runtimeClubCatalog'
import { buildRetirementSummary } from '../engine/careerSummary'
import { aggregateCareerHonors, aggregateClubCareerHonors } from '../engine/honorAggregation'
import { playerAgeAtWindow } from '../engine/careerTime'
import { RETIREMENT_QR_ASSET_PATH, RETIREMENT_RECORD_URL } from '../export/retirementRecord'
import { useGameStore } from '../store/gameStore'
import { formatEuro, nationalStageLabel } from '../ui/format'

export function retirementNarrative(input: {
  age: number
  isFinal: boolean
  isAgeLimit: boolean
}): {
  kicker: string
  heading: string
  summary: string
} {
  const { age, isFinal, isAgeLimit } = input
  if (isFinal) {
    return {
      kicker: '终场之后',
      heading: '从第一次上场，到最后一次离场。',
      summary:
        '从13岁的青训少年，到最后一场职业比赛，每一次选择都留在这里。球员生涯结束了，这段故事属于你。',
    }
  }
  if (isAgeLimit) {
    return {
      kicker: '终场哨已经响了',
      heading: '是时候向球员生涯告别了。',
      summary:
        '从13岁走进青训营，到踢完最后一个赛季，你已经走完一名职业球员的全部旅程。现在，看看这一生留下了什么。',
    }
  }
  return {
    kicker: '决定权在你手里',
    heading: `你准备在${age}岁挂靴吗？`,
    summary:
      '如果确认，这会成为你的最后一个赛季；如果还有放不下的目标，你也可以回去继续踢。',
  }
}

export function retirementClubShortMarkFor(
  clubId: string,
  clubName: string,
): string {
  return runtimeClubById.get(clubId)?.shortMark ?? clubName.slice(0, 1)
}

function RetirementArchive({ onReturnHome }: { onReturnHome: () => void }) {
  const exportTargetRef = useRef<HTMLDivElement>(null)
  const game = useGameStore((state) => state.game)!
  const player = game.player!
  const summary = buildRetirementSummary(game)
  const narrative = retirementNarrative({
    age: summary.age,
    isFinal: true,
    isAgeLimit: game.retirementReason === 'AGE_LIMIT',
  })
  const clubHonors = summary.honors.filter((item) => item.scope === 'CLUB')
  const nationalHonors = summary.honors.filter(
    (item) => item.scope === 'NATIONAL',
  )
  const personalHonors = summary.honors.filter(
    (item) => item.scope === 'INDIVIDUAL',
  )

  return (
    <>
    <main className="retirement-archive">
      <div className="retirement-export-sheet" ref={exportTargetRef} data-retirement-export-target>
      <header className="retirement-archive__masthead">
        <Brand compact />
        <div>
          <span>球员生涯档案</span>
          <strong>{game.startYear}—{game.startYear + Math.floor(game.windowIndex / 2)}</strong>
        </div>
      </header>

      <article className="retirement-archive__paper">
        <header className="retirement-archive__hero">
          <div className="retirement-archive__ovr" aria-label={`退役能力 ${summary.finalOverall}`}>
            <small>FINAL OVR</small>
            <strong>{summary.finalOverall}</strong>
          </div>
          <div className="retirement-archive__identity">
            <p>{narrative.kicker}</p>
            <h1>{player.name}</h1>
            <span>{summary.age}岁 · #{player.jerseyNumber} · {player.primaryPosition}</span>
          </div>
          <div className="retirement-archive__ending">
            <small>生涯评价</small>
            <strong>{summary.evaluation.title}</strong>
            <p>{summary.evaluation.summary}</p>
          </div>
        </header>

        <section className="retirement-archive__snapshots" aria-label="生涯关键数据">
          <div>
            <span>一线队生涯</span>
            <strong>{summary.seniorTotals.appearances}场 · {summary.seniorTotals.goals}球 · {summary.seniorTotals.assists}助</strong>
            <small>另有青年队 {summary.youthTotals.appearances} 场</small>
          </div>
          <div>
            <span>能力轨迹</span>
            <strong>巅峰 {summary.peakOverall} · 退役 {summary.finalOverall}</strong>
            <small>{summary.peakAge}岁抵达巅峰</small>
          </div>
          <div>
            <span>估算身价</span>
            <strong>巅峰 {formatEuro(summary.peakMarketValueEuro)}</strong>
            <small>{summary.peakMarketValueAge}岁巅峰 · 退役 {formatEuro(summary.finalMarketValueEuro)}</small>
          </div>
        </section>

        <section className="retirement-archive__section retirement-national">
          <div className="retirement-archive__section-title">
            <div>
              <Icon name="player" />
              <h2>国家队生涯</h2>
            </div>
            <span>中国国家队</span>
          </div>
          <dl>
            <div><dt>出场</dt><dd>{summary.nationalTeam.appearances}</dd></div>
            <div><dt>进球</dt><dd>{summary.nationalTeam.goals}</dd></div>
            <div><dt>助攻</dt><dd>{summary.nationalTeam.assists}</dd></div>
            <div>
              <dt>世界杯最佳</dt>
              <dd>{summary.nationalTeam.worldCupBest ? nationalStageLabel(summary.nationalTeam.worldCupBest) : '无正赛记录'}</dd>
            </div>
            <div>
              <dt>亚洲杯最佳</dt>
              <dd>{summary.nationalTeam.asianCupBest ? nationalStageLabel(summary.nationalTeam.asianCupBest) : '无正赛记录'}</dd>
            </div>
          </dl>
        </section>

        <section className="retirement-archive__section">
          <div className="retirement-archive__section-title">
            <div>
              <Icon name="history" />
              <h2>俱乐部生涯</h2>
            </div>
            <span>{summary.clubCount}家俱乐部 · {summary.totals.appearances}场正式履历</span>
          </div>
          <div className="retirement-clubs" role="table" aria-label="逐俱乐部效力数据">
            <div className="retirement-clubs__head" role="row">
              <span>效力时间</span>
              <span>俱乐部 / 级别</span>
              <span>队伍</span>
              <span>出场</span>
              <span>进球</span>
              <span>助攻</span>
              <span>巅峰</span>
              <span>荣誉</span>
            </div>
            {summary.clubs.map((club) => (
              <div className="retirement-clubs__row" role="row" key={club.clubId}>
                <span className="retirement-clubs__service">
                  {club.serviceSpells.map((spell) => (
                    <span key={`${club.clubId}-${spell.firstWindowIndex}`}>{spell.label}</span>
                  ))}
                </span>
                <span className="retirement-clubs__club">
                  <strong>
                    <ClubCrest
                      clubId={club.clubId}
                      shortMark={retirementClubShortMarkFor(
                        club.clubId,
                        club.clubName,
                      )}
                      className="club-crest--retirement"
                    />
                    {club.clubName}
                  </strong>
                  <small>{club.country} · {club.levelLabel}</small>
                </span>
                <span>{club.teamLevelLabel}</span>
                <strong>{club.appearances}</strong>
                <strong>{club.goals}</strong>
                <strong>{club.assists}</strong>
                <strong>{club.peakOverall}</strong>
                <span className="retirement-clubs__honor">
                  {(() => {
                    const honors = aggregateClubCareerHonors(summary.honors, club.clubId)
                    return honors.length > 0
                      ? honors.map((honor) => <span className="retirement-honor-chip" key={honor.key}><HonorBadge honor={{ type: honor.type, competitionLabel: honor.competitionLabel, label: honor.displayLabel }} />{honor.displayLabel} ×{honor.count}</span>)
                      : '尚无'
                  })()}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="retirement-archive__lower-grid">
          <section className="retirement-archive__section retirement-evaluation">
            <div className="retirement-archive__section-title">
              <div>
                <Icon name="career" />
                <h2>生涯评价</h2>
              </div>
              <span>最终评分</span>
            </div>
            <div className="retirement-evaluation__score">
              <strong>{summary.evaluation.provisionalScore}</strong>
              <div>
                <span>{summary.evaluation.title}</span>
                <small>{summary.evaluation.completedPoints}/{summary.evaluation.completedPointsMaximum} 分</small>
              </div>
            </div>
            <dl>
              <div><dt>俱乐部表现</dt><dd>{summary.evaluation.dimensions.clubPerformance}/25</dd></div>
              <div><dt>国家队表现</dt><dd>{summary.evaluation.dimensions.nationalTeam}/15</dd></div>
              <div><dt>巅峰与平台</dt><dd>{summary.evaluation.dimensions.peakAndPlatform}/15</dd></div>
              <div><dt>职业寿命</dt><dd>{summary.evaluation.dimensions.longevity}/5</dd></div>
              <div><dt>集体荣誉</dt><dd>{summary.evaluation.dimensions.collectiveHonors}/25</dd></div>
              <div><dt>个人荣誉</dt><dd>{summary.evaluation.dimensions.personalHonors}/15</dd></div>
            </dl>
            <p>俱乐部与国家队表现、巅峰高度、职业长度和荣誉，一起构成这段生涯的最终评分。</p>
          </section>

          <section className="retirement-archive__section retirement-honors">
            <div className="retirement-archive__section-title">
              <div>
                <Icon name="check" />
                <h2>荣誉室</h2>
              </div>
              <span>{summary.honors.length}项</span>
            </div>
            <div className="retirement-honors__list">
              <HonorGroup label="俱乐部" honors={clubHonors} />
              <HonorGroup label="国家队" honors={nationalHonors} />
              <HonorGroup label="个人" honors={personalHonors} />
            </div>
          </section>
        </div>

        <section className="retirement-archive__section retirement-tags">
          <div className="retirement-archive__section-title">
            <div>
              <Icon name="player" />
              <h2>生涯标签</h2>
            </div>
            <span>{summary.tags.length}枚</span>
          </div>
          <div className="retirement-tags__list">
            {summary.tags.map((tag) => (
              <div key={tag.id}>
                <strong>{tag.label}</strong>
                <span>{tag.reason}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="retirement-archive__talent">
          <div>
            <span>隐藏潜力</span>
            <strong>{summary.potentialOverall}</strong>
          </div>
          <div>
            <span>巅峰能力</span>
            <strong>{summary.peakOverall}</strong>
          </div>
          <div>
            <span>天赋兑现率</span>
            <strong>{summary.fulfillmentPercent}%</strong>
          </div>
          <p>{narrative.heading} {narrative.summary}</p>
        </section>

        <footer className="retirement-archive__footer">
          <Icon name="save" />
          <span>这份退役档案已保存在本地</span>
        </footer>
      </article>
      <footer className="retirement-export-qr" aria-hidden="true">
        <div className="retirement-export-qr__sheet" data-retirement-export-end>
          <img src={RETIREMENT_QR_ASSET_PATH} alt="" data-export-required="qr" />
          <div>
            <strong>扫码，开始你的球员生涯</strong>
            <small>{RETIREMENT_RECORD_URL.replace('https://', '')}</small>
          </div>
        </div>
      </footer>
      </div>
    </main>
    <RetirementRecordExportActions
      targetRef={exportTargetRef}
      playerName={player.name}
      onReturnHome={onReturnHome}
    />
    </>
  )
}

function HonorGroup({
  label,
  honors,
}: {
  label: string
  honors: import('../models/game').CareerHonor[]
}) {
  const grouped = aggregateCareerHonors(honors)
  return (
    <div>
      <span>{label}</span>
      <p>
        {grouped.length > 0
          ? grouped.map((item) => <span className="retirement-honor-chip" key={item.key}><HonorBadge honor={{ type: item.type, competitionLabel: item.competitionLabel, label: item.displayLabel }} size={24} />{item.displayLabel} ×{item.count}</span>)
          : '尚无'}
      </p>
    </div>
  )
}

export function RetirementScreen() {
  const game = useGameStore((state) => state.game)
  const cancelRetirement = useGameStore((state) => state.cancelRetirement)
  const confirmRetirement = useGameStore((state) => state.confirmRetirement)
  const returnToHome = useGameStore((state) => state.returnToHome)

  if (!game?.player || !game.retirementReason) return null
  if (game.phase === 'CAREER_RETIRED') {
    return <RetirementArchive onReturnHome={returnToHome} />
  }

  const age = playerAgeAtWindow(game.windowIndex)
  const isAgeLimit = game.retirementReason === 'AGE_LIMIT'
  const narrative = retirementNarrative({ age, isFinal: false, isAgeLimit })

  return (
    <CareerHub game={game} layout="stack" sectionLabel="退役决定">
      <section className="demo-complete demo-complete--hub retirement-panel">
        <span className="demo-complete__number">{age}</span>
        <div>
          <p className="decision-kicker">{narrative.kicker}</p>
          <h1>{narrative.heading}</h1>
          <p>{narrative.summary}</p>
          <div className="demo-complete__actions">
            <button type="button" className="button button--primary" onClick={confirmRetirement}>
              就此退役
              <Icon name="arrow" />
            </button>
            {isAgeLimit ? (
              <span className="retirement-panel__locked">最后一个赛季已经落幕</span>
            ) : (
              <button type="button" className="button button--secondary" onClick={cancelRetirement}>
                我还想继续踢
              </button>
            )}
          </div>
        </div>
      </section>
    </CareerHub>
  )
}

export function canExportRetirementRecord(phase: string): boolean {
  return phase === 'CAREER_RETIRED'
}
