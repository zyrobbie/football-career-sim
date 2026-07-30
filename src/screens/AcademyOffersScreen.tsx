import { useState } from 'react'
import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import type { AcademyOffer } from '../models/game'
import { useGameStore } from '../store/gameStore'
import {
  chanceLabel,
  formatEuro,
  roleLabel,
} from '../ui/format'

export function AcademyOffersScreen() {
  const game = useGameStore((state) => state.game)
  const selectAcademy = useGameStore((state) => state.selectAcademy)
  const goToPhase = useGameStore((state) => state.goToPhase)
  const [selectedId, setSelectedId] = useState(
    game?.academyOffers[1]?.club.id ?? game?.academyOffers[0]?.club.id ?? '',
  )
  if (!game?.player || game.academyOffers.length !== 3) return null
  const selected = game.academyOffers.find(
    (offer) => offer.club.id === selectedId,
  ) as AcademyOffer

  return (
    <CareerHub game={game} layout="stack" sectionLabel="青训邀请">
      <section className="career-offers">
        <header className="career-panel-heading">
          <Icon name="career" />
          <h1>选择你的第一家俱乐部</h1>
        </header>
        <p className="career-panel-lead">
          训练条件越好，竞争也越激烈。你的选择将决定第一个半年的成长环境。
        </p>

        <div className="offer-table" role="radiogroup" aria-label="青训邀请">
          <div className="offer-table__labels" aria-hidden="true">
            <strong>对比项</strong>
            <span>训练设施</span>
            <span>青训环境</span>
            <span>预计地位</span>
            <span>一线队机会</span>
            <span>年度津贴</span>
          </div>
          {game.academyOffers.map((offer) => (
            <button
              key={offer.club.id}
              type="button"
              role="radio"
              aria-checked={selectedId === offer.club.id}
              className={`offer-column${
                selectedId === offer.club.id ? ' is-selected' : ''
              }`}
              onClick={() => setSelectedId(offer.club.id)}
            >
              {selectedId === offer.club.id ? (
                <span className="offer-column__selected">
                  <Icon name="check" />
                  已选择
                </span>
              ) : null}
              <header>
                <span className="club-monogram">{offer.club.shortMark}</span>
                <span>
                  <strong>{offer.club.name}</strong>
                  <small>{offer.club.leagueLabel}</small>
                  <small>
                    {offer.club.profile === 'ELITE'
                      ? '豪门青训'
                      : offer.club.profile === 'BALANCED'
                        ? '中型俱乐部'
                        : '小型俱乐部'}
                  </small>
                </span>
              </header>
              <OfferValue
                label="训练设施"
                value={`${offer.club.facilityTier}级`}
              />
              <OfferValue
                label="青训环境"
                value={`${offer.club.academyTier}级`}
              />
              <OfferValue
                label="预计地位"
                value={roleLabel(offer.expectedRole).replace('球员', '')}
              />
              <OfferValue
                label="一线队机会"
                value={chanceLabel(offer.firstTeamChance)}
              />
              <OfferValue
                label="年度津贴"
                value={formatEuro(offer.annualStipendEuro)}
              />
            </button>
          ))}
        </div>

        <section className="offer-confirmation">
          <span className="offer-confirmation__number">01</span>
          <div>
            <h2>{selected.club.name}</h2>
            <p>{selected.club.description}</p>
          </div>
          <div className="offer-confirmation__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => selectAcademy(selected.club.id)}
            >
              接受{selected.club.name}的邀请
              <Icon name="arrow" />
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => goToPhase('CREATE_PREFERENCES')}
            >
              返回调整职业偏好
            </button>
          </div>
        </section>
        <p className="career-offers__note">
          <Icon name="info" />
          国内俱乐部名称为虚构内容
        </p>
      </section>
    </CareerHub>
  )
}

function OfferValue({ label, value }: { label: string; value: string }) {
  return (
    <span className="offer-column__value">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}
