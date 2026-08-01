import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { CLUBS } from '../data/balance'
import {
  canRequestHigherTransferRole,
  transferDinnerCost,
} from '../engine/transfers'
import {
  careerWindowLabel,
  playerAgeAtWindow,
} from '../engine/careerTime'
import type {
  CounterOfferDirection,
  TransferArrivalChoice,
  TransferOffer,
} from '../models/game'
import { useGameStore } from '../store/gameStore'
import { formatEuro, roleLabel } from '../ui/format'

const counterChoices: Array<{
  id: CounterOfferDirection
  title: string
}> = [
  { id: 'SALARY', title: '加薪' },
  { id: 'ROLE', title: '提高角色' },
  { id: 'RELEASE_CLAUSE', title: '降低解约金' },
]

const arrivalChoices: Array<{
  id: TransferArrivalChoice
  title: string
  note: string
}> = [
  {
    id: 'DINNER',
    title: '请全队聚餐',
    note: '大幅改善队内关系',
  },
  {
    id: 'LEADERS',
    title: '拜访教练与队长',
    note: '兼顾教练和更衣室',
  },
  {
    id: 'FANS',
    title: '参加球迷见面会',
    note: '提升球迷关系与知名度',
  },
  {
    id: 'NONE',
    title: '专心完成报到',
    note: '不花钱，但融入略慢',
  },
]

function clubName(clubId: string): string {
  return CLUBS.find((club) => club.id === clubId)?.name ?? '未知俱乐部'
}

function roleText(offer: TransferOffer): string {
  return `${
    offer.promisedTeamLevel === 'FIRST_TEAM' ? '一线队' : '青年队'
  } · ${
    offer.promisedRole
      ? roleLabel(offer.promisedRole).replace('球员', '')
      : '待定'
  }`
}

function trainingLabel(tier: number): string {
  if (tier <= 1) return '顶尖训练'
  if (tier <= 2) return '优秀训练'
  if (tier <= 4) return '扎实训练'
  return '基础训练'
}

export function TransferWindowScreen() {
  const game = useGameStore((state) => state.game)
  const selectTransferChoice = useGameStore(
    (state) => state.selectTransferChoice,
  )
  const counterTransferOffer = useGameStore(
    (state) => state.counterTransferOffer,
  )
  const confirmTransferChoice = useGameStore(
    (state) => state.confirmTransferChoice,
  )
  const chooseTransferArrival = useGameStore(
    (state) => state.chooseTransferArrival,
  )
  const continueAfterTransfer = useGameStore(
    (state) => state.continueAfterTransfer,
  )

  if (!game?.player || !game.contract || !game.selectedClubId) {
    return null
  }
  const contractExpired = game.contract.remainingHalfYears === 0

  if (game.phase === 'TRANSFER_ARRIVAL') {
    const dinnerCost = transferDinnerCost(game.cashEuro)
    return (
      <CareerHub game={game} sectionLabel="新援融入">
        <section className="transfer-arrival">
          <header className="career-panel-heading">
            <Icon name="team" />
            <h1>加盟后的第一步</h1>
            <span>关系事件</span>
          </header>
          <p className="career-panel-lead">
            知名度已经影响初始融入。现在选择如何认识
            {clubName(game.selectedClubId)}的新队友、教练和球迷。
          </p>
          <div className="transfer-arrival__grid">
            {arrivalChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => chooseTransferArrival(choice.id)}
              >
                <strong>{choice.title}</strong>
                <small>
                  {choice.id === 'DINNER'
                    ? `${formatEuro(dinnerCost)} · ${choice.note}`
                    : choice.note}
                </small>
              </button>
            ))}
          </div>
          <p className="transfer-footnote">
            聚餐费用直接从可支配现金扣除；其他日常开销已经包含在工资固定支出中。
          </p>
        </section>
      </CareerHub>
    )
  }

  if (
    game.phase === 'TRANSFER_STAGE_COMPLETE' &&
    game.transferDecision
  ) {
    const decision = game.transferDecision
    const currentWindow = careerWindowLabel(
      game.startYear,
      game.windowIndex,
    )
    const nextWindow = careerWindowLabel(
      game.startYear,
      game.windowIndex + 1,
    )
    const renewedCurrentClub =
      decision.kind === 'STAY' && game.contract.type === 'RENEWAL'
    return (
      <CareerHub game={game} sectionLabel="转会决定完成">
        <section className="transfer-complete">
          <div className="transfer-complete__mark">
            <Icon name="check" />
          </div>
          <div>
            <p className="decision-kicker">本次转会决定</p>
            <h1>
              {renewedCurrentClub
                ? `与${clubName(decision.toClubId)}完成续约。`
                : decision.kind === 'STAY'
                ? `继续留在${clubName(decision.toClubId)}。`
                : `正式加盟${clubName(decision.toClubId)}。`}
            </h1>
            <p>
              {renewedCurrentClub
                ? '新合同、球队层级和角色承诺已经写入存档，原有队内关系全部保留。'
                : decision.kind === 'STAY'
                ? '原合同与既有关系全部保留，下一窗口继续为当前俱乐部效力。'
                : '新合同、角色承诺与初始关系已经写入存档；转会费由俱乐部之间结算，不占用个人现金。'}
            </p>
            <dl>
              <div>
                <dt>合同</dt>
                <dd>
                  {formatEuro(game.contract.annualSalaryEuro)} / 年 ·{' '}
                  {game.contract.remainingHalfYears / 2}年
                </dd>
              </div>
              <div>
                <dt>角色</dt>
                <dd>
                  {game.contract.promisedTeamLevel === 'FIRST_TEAM'
                    ? '一线队'
                    : '青年队'}{' '}
                  ·{' '}
                  {game.contract.promisedRole
                    ? roleLabel(game.contract.promisedRole).replace(
                        '球员',
                        '',
                      )
                    : '待评估'}
                </dd>
              </div>
              <div>
                <dt>融入结果</dt>
                <dd>
                  教练 {Math.round(game.player.coachRelation)} · 队内{' '}
                  {Math.round(game.player.squadRelation)} · 球迷{' '}
                  {Math.round(game.player.fanRelation)}
                </dd>
              </div>
              <div>
                <dt>可支配现金</dt>
                <dd>{formatEuro(game.cashEuro)}</dd>
              </div>
            </dl>
            <p className="transfer-complete__next">
              下一步：进入{currentWindow}至{nextWindow}的职业半年，继续结算比赛、工资、合同和特殊事件。
            </p>
            <button
              type="button"
              className="button button--primary transfer-complete__continue"
              onClick={continueAfterTransfer}
            >
              开始新的职业半年
              <Icon name="arrow" />
            </button>
          </div>
        </section>
      </CareerHub>
    )
  }

  const selectedOffer =
    game.selectedTransferChoiceId &&
    game.selectedTransferChoiceId !== 'STAY'
      ? game.transferOffers.find(
          (offer) => offer.id === game.selectedTransferChoiceId,
        ) ?? null
      : null
  const currentClubName = clubName(game.selectedClubId)
  const age = playerAgeAtWindow(game.windowIndex)
  const windowLabel = careerWindowLabel(
    game.startYear,
    game.windowIndex,
  )

  return (
    <CareerHub
      game={game}
      sectionLabel={contractExpired ? '合同到期决定' : '国内转会机会'}
    >
      <section className="transfer-window">
        <header className="career-panel-heading">
          <Icon name="history" />
          <h1>{contractExpired ? '合同到期决定' : '国内转会机会'}</h1>
          <span>{age}岁 · {windowLabel.replace('年', '').replace('季', '')} · 国内</span>
        </header>
        <p className="career-panel-lead">
          {contractExpired
            ? '原合同已经结束。选择当前俱乐部的续约合同，或以自由身接受其他俱乐部邀请。'
            : '留队最稳定；三家俱乐部根据能力、近期表现、知名度与位置需求给出不同承诺。'}
        </p>

        {!contractExpired ? (
          <button
            type="button"
            className={`transfer-stay${
              game.selectedTransferChoiceId === 'STAY'
                ? ' is-selected'
                : ''
            }`}
            onClick={() => selectTransferChoice('STAY')}
          >
            <span>
              <strong>留在 {currentClubName}</strong>
              <small>保留合同、角色与全部既有关系</small>
            </span>
            <em>
              {formatEuro(game.contract.annualSalaryEuro)} / 年
            </em>
          </button>
        ) : null}

        <div className="transfer-offer-grid" aria-label="转会报价">
          {game.transferOffers.map((offer) => {
            const club = CLUBS.find(
              (candidate) => candidate.id === offer.clubId,
            )
            const selected =
              game.selectedTransferChoiceId === offer.id
            return (
              <button
                key={offer.id}
                type="button"
                className={`${selected ? 'is-selected' : ''}${
                  offer.withdrawn ? ' is-withdrawn' : ''
                }`}
                disabled={offer.withdrawn}
                onClick={() => selectTransferChoice(offer.id)}
              >
                <span>{club?.shortMark ?? '足'}</span>
                <strong>{club?.name ?? '未知俱乐部'}</strong>
                <small>
                  {club?.leagueLabel ?? '国内联赛'} ·{' '}
                  {trainingLabel(club?.facilityTier ?? 6)}
                </small>
                <dl>
                  <div>
                    <dt>年薪</dt>
                    <dd>{formatEuro(offer.annualSalaryEuro)}</dd>
                  </div>
                  <div>
                    <dt>
                      {offer.type === 'RENEWAL' ||
                      offer.type === 'FREE_TRANSFER'
                        ? '性质'
                        : '转会费'}
                    </dt>
                    <dd>
                      {offer.type === 'RENEWAL'
                        ? '续约'
                        : offer.type === 'FREE_TRANSFER'
                          ? '自由身'
                          : formatEuro(offer.transferFeeEuro)}
                    </dd>
                  </div>
                </dl>
                <em>
                  {offer.withdrawn
                    ? '报价已撤回'
                    : `${roleText(offer)} · 兴趣 ${offer.interestScore}`}
                </em>
              </button>
            )
          })}
        </div>

        {selectedOffer ? (
          <TransferOfferDetail
            offer={selectedOffer}
            onCounter={counterTransferOffer}
          />
        ) : !contractExpired ? (
          <p className="transfer-stay-note">
            选择留队不会触发重新谈判，原合同剩余
            {game.contract.remainingHalfYears / 2}年。
          </p>
        ) : null}

        <div className="transfer-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={confirmTransferChoice}
          >
            {selectedOffer
              ? selectedOffer.type === 'RENEWAL'
                ? `接受${clubName(selectedOffer.clubId)}续约`
                : `接受并加盟${clubName(selectedOffer.clubId)}`
              : `确认留在${currentClubName}`}
            <Icon name="arrow" />
          </button>
          <p>
            {contractExpired
              ? '每份合同仅可反报价一次；续约原报价不会因反报价失败而撤回。'
              : '每份报价仅可反报价一次；失败时有30%概率被撤回。转会费不会进入个人现金。'}
          </p>
        </div>
      </section>
    </CareerHub>
  )
}

function TransferOfferDetail({
  offer,
  onCounter,
}: {
  offer: TransferOffer
  onCounter: (direction: CounterOfferDirection) => void
}) {
  const higherRoleAvailable = canRequestHigherTransferRole(offer)
  return (
    <section className="transfer-offer-detail" aria-label="所选报价详情">
      <dl>
        <div>
          <dt>合同</dt>
          <dd>{offer.remainingHalfYears / 2}年</dd>
        </div>
        <div>
          <dt>解约金</dt>
          <dd>
            {offer.releaseClauseEuro === null
              ? '无'
              : formatEuro(offer.releaseClauseEuro)}
          </dd>
        </div>
        <div>
          <dt>球探判断</dt>
          <dd>
            {offer.estimatedPotential >= 83
              ? '极高潜力'
              : offer.estimatedPotential >= 76
                ? '留洋潜力'
                : '国内潜力'}
          </dd>
        </div>
      </dl>
      {offer.negotiationMessage ? (
        <p
          className={`contract-negotiation-result${
            offer.negotiationSucceeded ? ' is-success' : ' is-retained'
          }`}
          role="status"
        >
          <Icon
            name={offer.negotiationSucceeded ? 'check' : 'info'}
          />
          {offer.negotiationMessage}
        </p>
      ) : null}
      {!offer.counterUsed ? (
        <div className="transfer-counter-grid">
          {counterChoices.map((choice) => {
            const disabled =
              choice.id === 'ROLE' && !higherRoleAvailable
            return (
              <button
                key={choice.id}
                type="button"
                disabled={disabled}
                onClick={() => onCounter(choice.id)}
              >
                {disabled ? '角色已封顶' : choice.title}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
