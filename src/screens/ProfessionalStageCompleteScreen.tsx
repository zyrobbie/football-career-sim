import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { retirementAvailabilityAfterWindow } from '../engine/careerTime'
import {
  assessDomesticTransferOpportunity,
  assessOverseasInterest,
} from '../engine/transfers'
import { useGameStore } from '../store/gameStore'
import { formatEuro, roleLabel } from '../ui/format'

export function professionalStageHeading(
  promiseFulfilled: boolean,
  isFirstProfessionalWindow: boolean,
): string {
  if (promiseFulfilled) return '合同、训练与比赛已经开始联动。'
  return isFirstProfessionalWindow
    ? '第一个职业半年并不轻松。'
    : '本次职业半年未达预期。'
}

export function ProfessionalStageCompleteScreen() {
  const game = useGameStore((state) => state.game)
  const reviewReport = useGameStore((state) => state.reviewReport)
  const openTransferWindow = useGameStore(
    (state) => state.openTransferWindow,
  )
  const continueProfessionalCareer = useGameStore(
    (state) => state.continueProfessionalCareer,
  )
  const requestRetirement = useGameStore((state) => state.requestRetirement)
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
  const completedHistory = game.history[game.history.length - 1]
  const actualTeamLevel =
    completedHistory?.teamLevel ?? contractReport.actualTeamLevel
  const actualRole = completedHistory?.role ?? contractReport.actualRole
  const contractExpired = game.contract.remainingHalfYears === 0
  const isFirstProfessionalWindow = game.windowIndex === 4
  const canRequestTransfer =
    !contractExpired && game.contract.brokenPromiseWindows >= 2
  const transferOpportunity = assessDomesticTransferOpportunity({
    player: game.player,
    latestReport: report,
    windowIndex: game.windowIndex,
  })
  const overseasInterest = assessOverseasInterest({
    player: game.player,
    careerSeed: game.careerSeed,
    windowIndex: game.windowIndex + 1,
  })
  const retirementAvailability = retirementAvailabilityAfterWindow(
    game.windowIndex,
  )
  const retirementMandatory = retirementAvailability === 'MANDATORY'
  const retirementOptional = retirementAvailability === 'OPTIONAL'

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
            {professionalStageHeading(
              contractReport.promiseFulfilled,
              isFirstProfessionalWindow,
            )}
          </h1>
          <p>
            {actualTeamLevel === 'FIRST_TEAM'
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
                {actualTeamLevel === 'FIRST_TEAM' ? '一线队' : '青年队'} ·{' '}
                {roleLabel(actualRole).replace('球员', '')}
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
          {overseasInterest.visible ? (
            <p className="demo-complete__overseas-interest">
              <strong>海外关注</strong>
              <span>{overseasInterest.summary}</span>
            </p>
          ) : null}
          <p className="demo-complete__next">
            {retirementMandatory
              ? '最后一个赛季已经落幕。现在，去为这段漫长的球员生涯写下结尾。'
              : contractExpired
              ? '合同已经到期。你必须先完成续约或接受新的自由身合同，才能进入下一职业半年。'
              : canRequestTransfer
                ? '球队已经连续两个窗口没有兑现角色承诺。你可以正式提出转会申请，或选择再留队半年等待改善。'
                : transferOpportunity.summary}
          </p>
          <div className="demo-complete__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                if (retirementMandatory) {
                  requestRetirement()
                  return
                }
                if (canRequestTransfer) {
                  openTransferWindow(true)
                  return
                }
                if (contractExpired || transferOpportunity.available) {
                  openTransferWindow()
                  return
                }
                continueProfessionalCareer()
              }}
            >
              {retirementMandatory
                ? '走向退役时刻'
                : canRequestTransfer
                ? '提出转会申请'
                : contractExpired
                ? '处理合同到期'
                : transferOpportunity.available
                ? '查看转会报价'
                : '进入下一职业半年'}
              <Icon name="arrow" />
            </button>
            {retirementMandatory ? (
              <button
                type="button"
                className="button button--secondary"
                onClick={reviewReport}
              >
                复查最后半年报告
              </button>
            ) : canRequestTransfer ? (
              <button
                type="button"
                className="button button--secondary"
                onClick={continueProfessionalCareer}
              >
                继续留队半年
              </button>
            ) : (
              <button
                type="button"
                className="button button--secondary"
                onClick={reviewReport}
              >
                复查职业半年报告
              </button>
            )}
          </div>
          {retirementOptional ? (
            <button
              type="button"
              className="retirement-option"
              onClick={requestRetirement}
            >
              选择在本窗口后退役
            </button>
          ) : null}
        </div>
      </section>
    </CareerHub>
  )
}
