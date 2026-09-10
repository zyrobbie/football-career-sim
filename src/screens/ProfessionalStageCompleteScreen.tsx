import { ProfessionalReportActions } from '../components/ProfessionalReportActions'
import { CareerHub } from '../components/CareerHub'
import {
  canOpenTransferMarketAfterWindow,
} from '../engine/careerTime'
import {
  assessOverseasInterest,
} from '../engine/transfers'
import { useGameStore } from '../store/gameStore'
import { formatEuro, roleLabel } from '../ui/format'

export { RETIRE_NATIONAL_TEAM_CONFIRMATION, retireFromNationalTeamIfConfirmed } from '../components/ProfessionalReportActions'

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
  const isFirstProfessionalWindow = game.windowIndex === 4
  const transferMarketOpen = canOpenTransferMarketAfterWindow(
    game.windowIndex,
  )
  const overseasInterest = assessOverseasInterest({
    player: game.player,
    careerSeed: game.careerSeed,
    windowIndex: game.windowIndex + 1,
  })

  return (
    <CareerHub game={game} sectionLabel="半年结束">
      <section className="demo-complete demo-complete--hub">
        <span className="demo-complete__number">
          {String(game.history.length).padStart(2, '0')}
        </span>
        <div>
          <p className="decision-kicker">
            {isFirstProfessionalWindow ? '职业生涯，正式开始' : '又一个半年过去了'}
          </p>
          <h1>
            {professionalStageHeading(
              contractReport.promiseFulfilled,
              isFirstProfessionalWindow,
            )}
          </h1>
          <p>
            {actualTeamLevel === 'FIRST_TEAM'
              ? '这半年，你已经按一线队的训练和比赛节奏生活。实际角色、正式比赛表现和收入，都会影响接下来的续约与转会。'
              : '你已经签下职业合同，但这半年仍主要在青年队训练和比赛。你还有机会继续争取一线队席位。'}
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
          {transferMarketOpen && overseasInterest.visible ? (
            <p className="demo-complete__overseas-interest">
              <strong>海外关注</strong>
              <span>{overseasInterest.summary}</span>
            </p>
          ) : null}
          <ProfessionalReportActions game={game} allowReview />
        </div>
      </section>
    </CareerHub>
  )
}
