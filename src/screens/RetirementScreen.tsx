import { Brand } from '../components/Brand'
import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { buildRetirementSummary } from '../engine/careerSummary'
import { playerAgeAtWindow } from '../engine/careerTime'
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
      heading: '这段绿茵岁月，已经写成了你的故事。',
      summary:
        '从青训营到最后一场比赛，每一次选择都已经留在履历里。球员生涯结束了，但属于你的足球故事不会消失。',
    }
  }
  if (isAgeLimit) {
    return {
      kicker: '最后一场比赛已经结束',
      heading: '是时候向球员生涯告别了。',
      summary:
        '从13岁走进青训营，到今天完成最后一个赛季，你已经走完了职业球员的全部旅程。现在，为这段生涯写下结尾。',
    }
  }
  return {
    kicker: '把决定交给你',
    heading: `你准备在${age}岁挂靴吗？`,
    summary:
      '如果确认，这个赛季将成为你的最后一季；如果心里还有未完成的目标，你也可以回到球场。',
  }
}

function RetirementArchive() {
  const game = useGameStore((state) => state.game)!
  const player = game.player!
  const summary = buildRetirementSummary(game)
  const narrative = retirementNarrative({
    age: summary.age,
    isFinal: true,
    isAgeLimit: game.retirementReason === 'AGE_LIMIT',
  })

  return (
    <main className="retirement-archive">
      <header className="retirement-archive__masthead">
        <Brand compact />
        <div>
          <span>球员退役档案</span>
          <strong>{game.startYear}—{game.startYear + Math.floor(game.windowIndex / 2)}</strong>
        </div>
      </header>

      <article className="retirement-archive__paper">
        <header className="retirement-archive__hero">
          <div className="retirement-archive__ovr" aria-label={`退役能力 ${summary.finalOverall}`}>
            <small>RET. OVR</small>
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
                  <strong>{club.clubName}</strong>
                  <small>{club.country} · {club.levelLabel}</small>
                </span>
                <span>{club.teamLevelLabel}</span>
                <strong>{club.appearances}</strong>
                <strong>{club.goals}</strong>
                <strong>{club.assists}</strong>
                <strong>{club.peakOverall}</strong>
                <span className="retirement-clubs__honor">
                  {club.honors.length > 0 ? club.honors.join('、') : '待荣誉系统接入'}
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
              <span>现阶段评分</span>
            </div>
            <div className="retirement-evaluation__score">
              <strong>{summary.evaluation.provisionalScore}</strong>
              <div>
                <span>{summary.evaluation.title}</span>
                <small>当前 {summary.evaluation.provisionalScore}/100 · 已完成维度 {summary.evaluation.completedPoints}/{summary.evaluation.completedPointsMaximum}</small>
              </div>
            </div>
            <dl>
              <div><dt>俱乐部表现</dt><dd>{summary.evaluation.dimensions.clubPerformance}/25</dd></div>
              <div><dt>国家队表现</dt><dd>{summary.evaluation.dimensions.nationalTeam}/15</dd></div>
              <div><dt>巅峰与平台</dt><dd>{summary.evaluation.dimensions.peakAndPlatform}/15</dd></div>
              <div><dt>职业寿命</dt><dd>{summary.evaluation.dimensions.longevity}/5</dd></div>
            </dl>
            <p>集体荣誉与个人荣誉共 {summary.evaluation.reservedPoints} 分已预留；荣誉系统完成后将形成最终百分制评价。</p>
          </section>

          <section className="retirement-archive__section retirement-honors">
            <div className="retirement-archive__section-title">
              <div>
                <Icon name="check" />
                <h2>荣誉室</h2>
              </div>
              <span>预留模块</span>
            </div>
            <div className="retirement-honors__placeholder">
              <span>奖杯、个人奖项与国家队荣誉</span>
              <strong>将在荣誉系统接入后陈列于此</strong>
              <small>本页结构已经预留，不会影响现有存档。</small>
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
          <span>退役档案已写入本地生涯存档</span>
        </footer>
      </article>
    </main>
  )
}

export function RetirementScreen() {
  const game = useGameStore((state) => state.game)
  const cancelRetirement = useGameStore((state) => state.cancelRetirement)
  const confirmRetirement = useGameStore((state) => state.confirmRetirement)

  if (!game?.player || !game.retirementReason) return null
  if (game.phase === 'CAREER_RETIRED') return <RetirementArchive />

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
              确认退役
              <Icon name="arrow" />
            </button>
            {isAgeLimit ? (
              <span className="retirement-panel__locked">最后一个赛季已经落幕</span>
            ) : (
              <button type="button" className="button button--secondary" onClick={cancelRetirement}>
                返回继续生涯
              </button>
            )}
          </div>
        </div>
      </section>
    </CareerHub>
  )
}
