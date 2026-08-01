import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { assessDomesticTransferOpportunity } from '../engine/transfers'
import { useGameStore } from '../store/gameStore'
import { formatEuro, roleLabel } from '../ui/format'

export function ProfessionalStageCompleteScreen() {
  const game = useGameStore((state) => state.game)
  const reviewReport = useGameStore((state) => state.reviewReport)
  const openTransferWindow = useGameStore(
    (state) => state.openTransferWindow,
  )
  const continueProfessionalCareer = useGameStore(
    (state) => state.continueProfessionalCareer,
  )
  if (
    !game?.player ||
    !game.lastReport ||
    !game.contract ||
    !game.lastReport.contract
  ) {
    return null
  }
  const report = game.lastReport
  const contractReport = report.contract!
  const isFirstProfessionalWindow = game.windowIndex === 4
  const transferOpportunity = assessDomesticTransferOpportunity({
    player: game.player,
    latestReport: report,
    windowIndex: game.windowIndex,
  })

  return (
    <CareerHub game={game} sectionLabel="职业半年完成">
      <section className="demo-complete demo-complete--hub">
        <span className="demo-complete__number">
          {String(game.history.length).padStart(2, '0')}
        </span>
        <div>
          <p className="decision-kicker">
            {isFirstProfessionalWindow ? '职业生涯正式起步' : '职业窗口完成'}
          </p>
          <h1>
            {contractReport.promiseFulfilled
              ? '合同、训练与比赛已经开始联动。'
              : '第一个职业半年并不轻松。'}
          </h1>
          <p>
            {game.teamLevel === 'FIRST_TEAM'
              ? '本窗口已经使用一线队训练质量、实际角色、正式比赛出场和工资可支配收入完成结算，后续转会与续约会沿用同一份职业状态。'
              : '这一阶段已经按照职业合同结算青年队训练、比赛出场、工资可支配收入和角色承诺；你仍可继续竞争一线队席位。'}
          </p>
          <dl>
            <div>
              <dt>本窗口表现</dt>
              <dd>
                {report.stats.appearances}场 · {report.stats.goals}球 ·{' '}
                {report.stats.assists}助攻 · {report.stats.averageRating.toFixed(1)}分
              </dd>
            </div>
            <div>
              <dt>实际角色</dt>
              <dd>
                {game.teamLevel === 'FIRST_TEAM' ? '一线队' : '青年队'} ·{' '}
                {roleLabel(contractReport.actualRole).replace('球员', '')}
              </dd>
            </div>
            <div>
              <dt>合同兑现</dt>
              <dd>
                {contractReport.promiseFulfilled
                  ? '本窗口已兑现'
                  : `未兑现 · 连续${contractReport.brokenPromiseWindows}个窗口`}
              </dd>
            </div>
            <div>
              <dt>现金与合同</dt>
              <dd>
                {formatEuro(game.cashEuro)} · 剩余
                {game.contract.remainingHalfYears / 2}年
              </dd>
            </div>
          </dl>
          <p className="demo-complete__next">
            {transferOpportunity.summary}
          </p>
          <div className="demo-complete__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={
                transferOpportunity.available
                  ? openTransferWindow
                  : continueProfessionalCareer
              }
            >
              {transferOpportunity.available
                ? '查看转会报价'
                : '进入下一职业半年'}
              <Icon name="arrow" />
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={reviewReport}
            >
              复查职业半年报告
            </button>
          </div>
        </div>
      </section>
    </CareerHub>
  )
}
