import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
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

  if (game.phase === 'PRO_CONTRACT_COMPLETE' && game.contract) {
    return (
      <CareerHub game={game} sectionLabel="职业合同已签署">
        <section className="contract-complete">
          <div className="contract-complete__mark">
            <Icon name="check" />
          </div>
          <div>
            <p className="decision-kicker">首份职业合同</p>
            <h1>签字完成，职业生涯正式开始。</h1>
            <p>
              {club.name}已完成注册。合同与角色承诺会从下一窗口开始影响收入、出场和续约判断。
            </p>
            <ContractTerms
              offer={offer}
              clubName={club.name}
              compact
            />
            <p className="contract-complete__next">
              下一阶段先完成首个职业半年；随后将进入正式转会窗口，评估留队或转会机会。
            </p>
            <button
              type="button"
              className="button button--primary"
              onClick={startProfessionalCareer}
            >
              进入第一个职业半年
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
          <span>仅可反报价一次</span>
        </header>
        <p className="career-panel-lead">
          {offer.promisedTeamLevel === 'FIRST_TEAM'
            ? '俱乐部确认你的晋升，并给出一线队角色承诺。'
            : '你将以职业球员身份留在青年队，继续竞争一线队席位。'}
        </p>

        <ContractTerms offer={offer} clubName={club.name} />

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
            aria-label="反报价方向"
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
                    {disabled ? '当前层级已是最高角色' : choice.effect}
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
            {offer.counterUsed ? '接受最终报价并签约' : '接受原报价并签约'}
            <Icon name="arrow" />
          </button>
          <p>
            税费、经纪人佣金、住房与日常生活支出将统一扣除；游戏现金只记录可支配部分。
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
