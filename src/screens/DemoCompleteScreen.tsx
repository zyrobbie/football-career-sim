import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { clubDisplayNameForCompatibleId } from '../data/clubs/clubChineseNames'
import {
  careerWindowLabel,
  playerAgeAtWindow,
} from '../engine/careerTime'
import { useGameStore } from '../store/gameStore'
import { firstTeamStatusLabel } from '../ui/format'

export const DEMO_DELETE_CAREER_CONFIRMATION = '确定删除当前生涯并返回首页吗？删除后无法恢复。'

export function deleteDemoCareerIfConfirmed(
  confirm: (message: string) => boolean,
  deleteCareer: () => void,
): boolean {
  if (!confirm(DEMO_DELETE_CAREER_CONFIRMATION)) return false
  deleteCareer()
  return true
}

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
              : '两年青训结束了。'}
          </h1>
          <p>
            两年青训到这里告一段落。你的训练、比赛和每一次选择，决定了俱乐部现在怎么看你。下一步，是第一份职业合同。
          </p>
          <p className="demo-complete__next">
            {nextWindow}窗口 · {playerAgeAtWindow(nextWindowIndex)}岁
          </p>
          <dl>
            <div>
              <dt>当前俱乐部</dt>
              <dd>
                {clubDisplayNameForCompatibleId(
                  game.lastReport.clubId,
                  game.lastReport.clubName,
                )}
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
              <dd>已保存在此浏览器</dd>
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
              再看一次晋升评估
            </button>
            <button
              type="button"
              className="text-button text-button--danger demo-complete__delete"
              onClick={() => {
                deleteDemoCareerIfConfirmed(window.confirm, deleteCareer)
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
