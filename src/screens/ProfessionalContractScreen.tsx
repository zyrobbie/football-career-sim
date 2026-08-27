import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { clubDisplayNameForCompatibleId } from '../data/clubs/clubChineseNames'
import { canRequestHigherRole } from '../engine/contracts'
import type {
  CounterOfferDirection,
  ProfessionalContractOffer,
} from '../models/game'
import { useGameStore } from '../store/gameStore'
import { formatEuro, roleLabel } from '../ui/format'

const counterChoices: Array<{
  id: CounterOfferDirection
  title: string
  effect: string
}> = [
  {
    id: 'SALARY',
    title: '提高年薪',
    effect: '争取约18%涨幅',
  },
  {
    id: 'ROLE',
    title: '提高角色',
    effect: '承诺提升一级',
  },
  {
    id: 'RELEASE_CLAUSE',
    title: '降低解约金',
    effect: '保留转会空间',
  },
]

export function ProfessionalContractScreen() {
  const game = useGameStore((state) => state.game)
  const counterProfessionalOffer = useGameStore(
    (state) => state.counterProfessionalOffer,
  )
  const acceptProfessionalContract = useGameStore(
    (state) => state.acceptProfessionalContract,
  )
  const startProfessionalCareer = useGameStore(
    (state) => state.startProfessionalCareer,
  )
  if (!game?.player || !game.professionalOffer) return null
  const offer = game.professionalOffer
  const club = game.academyOffers.find(
    (candidate) => candidate.club.id === offer.clubId,
  )?.club
  if (!club) return null
  const clubName = clubDisplayNameForCompatibleId(club.id, club.name)

  if (game.phase === 'PRO_CONTRACT_COMPLETE' && game.contract) {
    return (
      <CareerHub game={game} sectionLabel="职业合同已签">
        <section className="contract-complete">
          <div className="contract-complete__mark">
            <Icon name="check" />
          </div>
          <div>
            <p className="decision-kicker">首份职业合同</p>
            <h1>签下名字，你正式成为职业球员。</h1>
            <p>
              {clubName}已经为你完成注册。从下个半年开始，合同里的角色承诺会真正影响你的出场、收入和续约。
            </p>
            <ContractTerms
              offer={offer}
              clubName={clubName}
              compact
            />
            <p className="contract-complete__next">
              先踢完职业生涯的第一个半年。之后，转会市场会真正向你打开。
            </p>
            <button
              type="button"
              className="button button--primary"
              onClick={startProfessionalCareer}
            >
              开始职业生涯
              <Icon name="arrow" />
            </button>
          </div>
        </section>
      </CareerHub>
    )
  }

  const higherRoleAvailable = canRequestHigherRole(offer)

  return (
    <CareerHub game={game} sectionLabel="首份职业合同">
      <section className="contract-stage">
        <header className="career-panel-heading">
          <Icon name="history" />
          <h1>你的首份职业合同</h1>
          <span>你只有一次反报价机会</span>
        </header>
        <p className="career-panel-lead">
          {offer.promisedTeamLevel === 'FIRST_TEAM'
            ? '俱乐部决定把你升入一线队，并在合同里承诺了你的角色。'
            : '你已经成为职业球员，但会暂时留在青年队，继续争取一线队席位。'}
        </p>

        <ContractTerms offer={offer} clubName={clubName} />

        {offer.negotiationMessage ? (
          <p
            className={`contract-negotiation-result${
              offer.negotiationSucceeded
                ? ' is-success'
                : ' is-retained'
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
          <div
            className="contract-counter-grid"
            aria-label="选择反报价方向"
          >
            {counterChoices.map((choice) => {
              const disabled =
                choice.id === 'ROLE' && !higherRoleAvailable
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => counterProfessionalOffer(choice.id)}
                  disabled={disabled}
                >
                  <strong>{choice.title}</strong>
                  <small>
                    {disabled ? '已经是当前层级的最高角色' : choice.effect}
                  </small>
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="contract-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={acceptProfessionalContract}
          >
            {offer.counterUsed ? '接受最终合同并签约' : '接受合同并签约'}
            <Icon name="arrow" />
          </button>
          <p>
            工资会扣除税费、经纪人佣金和日常生活支出；页面显示的是你真正可以支配的现金。
          </p>
        </div>
      </section>
    </CareerHub>
  )
}

function ContractTerms({
  offer,
  clubName,
  compact = false,
}: {
  offer: ProfessionalContractOffer
  clubName: string
  compact?: boolean
}) {
  return (
    <section
      className={`contract-sheet${compact ? ' contract-sheet--compact' : ''}`}
      aria-label="合同条款"
    >
      <header>
        <strong>{clubName}</strong>
        <span>
          {offer.promisedTeamLevel === 'FIRST_TEAM'
            ? '一线队合同'
            : '青年队职业合同'}
        </span>
      </header>
      <dl>
        <ContractTerm
          label="税前年薪"
          value={formatEuro(offer.annualSalaryEuro)}
        />
        <ContractTerm
          label="合同年限"
          value={`${offer.remainingHalfYears / 2}年`}
        />
        <ContractTerm
          label="角色承诺"
          value={
            offer.promisedRole
              ? roleLabel(offer.promisedRole).replace('球员', '')
              : '未承诺'
          }
        />
        <ContractTerm
          label="解约金"
          value={
            offer.releaseClauseEuro === null
              ? '无'
              : formatEuro(offer.releaseClauseEuro)
          }
        />
        <ContractTerm
          label="俱乐部选项"
          value={
            offer.clubOptionYears > 0
              ? `延长${offer.clubOptionYears}年`
              : '无'
          }
        />
      </dl>
    </section>
  )
}

function ContractTerm({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
