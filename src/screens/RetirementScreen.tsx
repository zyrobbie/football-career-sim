import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { playerAgeAtWindow } from '../engine/careerTime'
import { calculateOverall } from '../engine/player'
import { useGameStore } from '../store/gameStore'

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
            {isFinal ? '职业生涯已经结束' : '职业生涯终点'}
          </p>
          <h1>
            {isFinal
              ? '你的球员生涯已经定格。'
              : isAgeLimit
                ? '40岁赛季结束，现在必须退役。'
                : `你可以选择在${age}岁结束球员生涯。`}
          </h1>
          <p>
            {isFinal
              ? '日历、合同和比赛结算已经永久停止；这份本地存档将保留你的逐窗口履历与生涯数据。'
              : '确认后职业日历将永久停止，当前存档会进入只读的退役档案。'}
          </p>
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
              <dt>能力轨迹</dt>
              <dd>
                巅峰{peakOverall} · 退役{finalOverall}
              </dd>
            </div>
          </dl>
          {isFinal ? (
            <p className="demo-complete__next">
              荣誉、国家队与评价性标签接入后，会在同一份退役档案中补全主结局与天赋兑现率。
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
                  40岁强制退役，不能再进入下一窗口
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
