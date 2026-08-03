import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { playerAgeAtWindow } from '../engine/careerTime'
import { calculateOverall } from '../engine/player'
import { useGameStore } from '../store/gameStore'

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

export function RetirementScreen() {
  const game = useGameStore((state) => state.game)
  const cancelRetirement = useGameStore((state) => state.cancelRetirement)
  const confirmRetirement = useGameStore((state) => state.confirmRetirement)

  if (!game?.player || !game.retirementReason) return null

  const age = playerAgeAtWindow(game.windowIndex)
  const totals = game.history.reduce(
    (sum, entry) => ({
      appearances: sum.appearances + entry.stats.appearances,
      goals: sum.goals + entry.stats.goals,
      assists: sum.assists + entry.stats.assists,
    }),
    { appearances: 0, goals: 0, assists: 0 },
  )
  const finalOverall = Math.round(
    calculateOverall(game.player.attributes, game.player.primaryPosition),
  )
  const peakOverall = Math.max(
    finalOverall,
    ...game.history.map((entry) =>
      Math.round(
        calculateOverall(
          entry.endingAttributes,
          game.player!.primaryPosition,
        ),
      ),
    ),
  )
  const clubCount = new Set(game.history.map((entry) => entry.clubId)).size
  const isFinal = game.phase === 'CAREER_RETIRED'
  const isAgeLimit = game.retirementReason === 'AGE_LIMIT'
  const narrative = retirementNarrative({ age, isFinal, isAgeLimit })

  return (
    <CareerHub
      game={game}
      layout="stack"
      sectionLabel={isFinal ? '退役档案' : '退役决定'}
    >
      <section className="demo-complete demo-complete--hub retirement-panel">
        <span className="demo-complete__number">{age}</span>
        <div>
          <p className="decision-kicker">
            {narrative.kicker}
          </p>
          <h1>{narrative.heading}</h1>
          <p>{narrative.summary}</p>
          <dl>
            <div>
              <dt>退役年龄</dt>
              <dd>{age}岁</dd>
            </div>
            <div>
              <dt>效力俱乐部</dt>
              <dd>{clubCount}家</dd>
            </div>
            <div>
              <dt>生涯数据</dt>
              <dd>
                {totals.appearances}场 · {totals.goals}球 · {totals.assists}助攻
              </dd>
            </div>
            <div>
              <dt>国家队数据</dt>
              <dd>
                {game.nationalTeam.caps}场 · {game.nationalTeam.goals}球 ·{' '}
                {game.nationalTeam.assists}助攻
              </dd>
            </div>
            <div>
              <dt>能力轨迹</dt>
              <dd>
                巅峰{peakOverall} · 退役{finalOverall}
              </dd>
            </div>
          </dl>
          {isFinal ? (
            <p className="demo-complete__next">
              你留下的不只是数字，还有每一次坚持、转身和重新出发。
            </p>
          ) : (
            <div className="demo-complete__actions">
              <button
                type="button"
                className="button button--primary"
                onClick={confirmRetirement}
              >
                确认退役
                <Icon name="arrow" />
              </button>
              {isAgeLimit ? (
                <span className="retirement-panel__locked">
                  最后一个赛季已经落幕
                </span>
              ) : (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={cancelRetirement}
                >
                  返回继续生涯
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </CareerHub>
  )
}
