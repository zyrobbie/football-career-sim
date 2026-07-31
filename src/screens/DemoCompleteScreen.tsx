import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import {
  careerWindowLabel,
  playerAgeAtWindow,
} from '../engine/careerTime'
import { useGameStore } from '../store/gameStore'
import { firstTeamStatusLabel } from '../ui/format'

export function DemoCompleteScreen() {
  const game = useGameStore((state) => state.game)
  const reviewReport = useGameStore((state) => state.reviewReport)
  const openProfessionalContract = useGameStore(
    (state) => state.openProfessionalContract,
  )
  const deleteCareer = useGameStore((state) => state.deleteCareer)
  if (!game?.player || !game.lastReport) return null
  const nextWindowIndex = game.windowIndex + 1
  const nextWindow = careerWindowLabel(game.startYear, nextWindowIndex)
  const totalAppearances = game.history.reduce(
    (total, entry) => total + entry.stats.appearances,
    0,
  )
  const totalGoals = game.history.reduce(
    (total, entry) => total + entry.stats.goals,
    0,
  )
  const totalAssists = game.history.reduce(
    (total, entry) => total + entry.stats.assists,
    0,
  )

  return (
    <CareerHub
      game={game}
      sectionLabel="青训第二年完成"
    >
      <section className="demo-complete demo-complete--hub">
        <span className="demo-complete__number">04</span>
        <div>
          <p className="decision-kicker">青训第二年完成</p>
          <h1>
            {game.teamLevel === 'FIRST_TEAM'
              ? '你敲开了一线队的大门。'
              : '四个半年已经写入你的生涯。'}
          </h1>
          <p>
            从首次入队到第二年晋升评估，成长、比赛、关系与一线队关注已经连续运行。下一阶段将从职业合同和正式一线队竞争开始。
          </p>
          <p className="demo-complete__next">
            {nextWindow}窗口 · {playerAgeAtWindow(nextWindowIndex)}岁
          </p>
          <dl>
            <div>
              <dt>当前俱乐部</dt>
              <dd>
                {game.lastReport.clubName}
                {game.teamLevel === 'FIRST_TEAM' ? '一线队' : '青年队'}
              </dd>
            </div>
            <div>
              <dt>两年数据</dt>
              <dd>{totalAppearances}场 · {totalGoals}球 · {totalAssists}助攻</dd>
            </div>
            <div>
              <dt>一线队结果</dt>
              <dd>
                {firstTeamStatusLabel(game.firstTeamProgress.status)} · 关注度
                {game.firstTeamProgress.attention}
              </dd>
            </div>
            <div>
              <dt>存档状态</dt>
              <dd>已保存到本地浏览器</dd>
            </div>
          </dl>
          <div className="demo-complete__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={openProfessionalContract}
            >
              查看首份职业合同
              <Icon name="arrow" />
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={reviewReport}
            >
              复查晋升评估
            </button>
            <button
              type="button"
              className="text-button text-button--danger demo-complete__delete"
              onClick={() => {
                if (window.confirm('确定删除当前Demo生涯并返回首页吗？')) {
                  deleteCareer()
                }
              }}
            >
              删除生涯
            </button>
          </div>
        </div>
      </section>
    </CareerHub>
  )
}
