import { CareerHub } from '../components/CareerHub'
import { ClubCrest } from '../components/ClubCrest'
import { Icon } from '../components/Icons'
import { CLUBS, isOverseasClub } from '../data/balance'
import { clubDisplayNameForCompatibleId } from '../data/clubs/clubChineseNames'
import {
  canRequestHigherTransferRole,
  transferDinnerCost,
} from '../engine/transfers'
import {
  careerWindowLabel,
  playerAgeAtWindow,
} from '../engine/careerTime'
import type {
  ContractType,
  CounterOfferDirection,
  TransferArrivalChoice,
  TransferDecision,
  TransferOffer,
} from '../models/game'
import { useGameStore } from '../store/gameStore'
import {
  clubLevelLabel,
  formatEuro,
  integrationDifficultyLabel,
  roleLabel,
  trainingQualityLabel,
} from '../ui/format'

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
  return clubDisplayNameForCompatibleId(
    clubId,
    CLUBS.find((club) => club.id === clubId)?.name ?? '未知俱乐部',
  )
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

export function isCompletedRenewal(input: {
  decisionKind: TransferDecision['kind']
  contractType: ContractType
  selectedTransferChoiceId: 'STAY' | string | null
}): boolean {
  return (
    input.decisionKind === 'STAY' &&
    input.contractType === 'RENEWAL' &&
    Boolean(input.selectedTransferChoiceId) &&
    input.selectedTransferChoiceId !== 'STAY'
  )
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
      <CareerHub game={game} sectionLabel="加盟报到">
        <section className="transfer-arrival">
          <header className="career-panel-heading">
            <Icon name="team" />
            <h1>新球队，第一天。</h1>
            <span>融入球队</span>
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
            全队聚餐会从可支配现金中扣款；其他日常开销已经计入固定生活支出。
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
      isCompletedRenewal({
        decisionKind: decision.kind,
        contractType: game.contract.type,
        selectedTransferChoiceId: game.selectedTransferChoiceId,
      })
    return (
      <CareerHub game={game} sectionLabel="去向已定">
        <section className="transfer-complete">
          <div className="transfer-complete__mark">
            <Icon name="check" />
          </div>
          <div>
            <p className="decision-kicker">转会窗口</p>
            <h1>
              {renewedCurrentClub
                ? `原合同到期后，与${clubName(decision.toClubId)}签下新约。`
                : decision.kind === 'STAY'
                ? `继续留在${clubName(decision.toClubId)}。`
                : `正式加盟${clubName(decision.toClubId)}。`}
            </h1>
            <p>
              {renewedCurrentClub
                ? '新合同已经生效，角色承诺也已经确定；你在队内建立的关系会继续保留。'
                : decision.kind === 'STAY'
                ? '原合同和已经建立的关系都会保留。下个半年，你继续为这家俱乐部效力。'
                : '新合同和角色承诺已经生效；转会费由俱乐部之间结算，不会从你的现金中扣除。'}
            </p>
            <dl>
              <div>
                <dt>{renewedCurrentClub ? '新合同' : '合同'}</dt>
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
              接下来是{currentWindow}到{nextWindow}。比赛、工资、合同和新的故事都会继续。
            </p>
            <button
              type="button"
              className="button button--primary transfer-complete__continue"
              onClick={continueAfterTransfer}
            >
              开始下一个半年
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
  const renewalOffer = contractExpired
    ? game.transferOffers.find(
        (offer) =>
          offer.type === 'RENEWAL' &&
          offer.clubId === game.selectedClubId,
      ) ?? null
    : null
  const externalOffers = contractExpired
    ? game.transferOffers.filter((offer) => offer.type !== 'RENEWAL')
    : game.transferOffers
  const overseasOfferCount = externalOffers.filter((offer) => {
    const club = CLUBS.find((candidate) => candidate.id === offer.clubId)
    return club ? isOverseasClub(club) : false
  }).length
  const marketTitle = overseasOfferCount > 0 ? '国内与海外转会机会' : '国内转会机会'
  const age = playerAgeAtWindow(game.windowIndex)
  const windowLabel = careerWindowLabel(
    game.startYear,
    game.windowIndex,
  )

  return (
    <CareerHub
      game={game}
      sectionLabel={contractExpired ? '合同到期决定' : marketTitle}
    >
      <section className="transfer-window">
        <header className="career-panel-heading">
          <Icon name="history" />
          <h1>{contractExpired ? '合同到期决定' : marketTitle}</h1>
          <span>
            {age}岁 · {windowLabel.replace('年', '').replace('季', '')} ·{' '}
            {overseasOfferCount > 0 ? `海外${overseasOfferCount}份` : '国内'}
          </span>
        </header>
        <p className="career-panel-lead">
          {contractExpired
            ? '原合同已经结束。你可以接受老东家的续约，也可以以自由球员身份选择新的邀请。'
            : '留下最熟悉，但不一定是最好。三家俱乐部会根据你的能力、表现和职业偏好给出不同角色。'}
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
              <small>保留现有合同、角色和在队内建立的关系</small>
            </span>
            <em>
              {formatEuro(game.contract.annualSalaryEuro)} / 年
            </em>
          </button>
        ) : renewalOffer ? (
          <button
            type="button"
            className={`transfer-stay${
              game.selectedTransferChoiceId === renewalOffer.id
                ? ' is-selected'
                : ''
            }`}
            onClick={() => selectTransferChoice(renewalOffer.id)}
          >
            <span>
              <strong>与 {currentClubName} 续约</strong>
              <small>
                新合同 {renewalOffer.remainingHalfYears / 2}年 ·{' '}
                {roleText(renewalOffer)}
              </small>
            </span>
            <em>{formatEuro(renewalOffer.annualSalaryEuro)} / 年</em>
          </button>
        ) : null}

        <div
          className="transfer-offer-grid"
          aria-label={contractExpired ? '自由身合同' : '转会报价'}
        >
          {externalOffers.map((offer) => {
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
                <ClubCrest
                  clubId={club?.id}
                  shortMark={club?.shortMark ?? '足'}
                  className="club-crest--transfer"
                />
                <strong>{club?.name ?? '未知俱乐部'}</strong>
                <small className="transfer-offer-grid__region">
                  {club?.country ?? '中国'}
                </small>
                <small className="transfer-offer-grid__level">
                  {club
                    ? clubLevelLabel(club)
                    : '俱乐部信息暂时无法读取'}
                </small>
                {club ? (
                  <small className="transfer-offer-grid__environment">
                    {trainingQualityLabel(club)} · 融入
                    {integrationDifficultyLabel(club)}
                  </small>
                ) : null}
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
              ? '每份合同你只有一次反报价机会；即使续约反报价失败，原报价仍然有效。'
              : '每份报价你只有一次反报价机会。谈崩时有30%概率让对方撤回报价；转会费归俱乐部，不会进入你的现金。'}
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
    <section className="transfer-offer-detail" aria-label="当前选择的报价详情">
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
                ? '高水平潜质'
                : '职业潜质'}
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
                {disabled ? '已经是最高承诺角色' : choice.title}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
