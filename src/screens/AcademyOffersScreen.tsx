import { useState } from 'react'
import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { clubDisplayNameForCompatibleId } from '../data/clubs/clubChineseNames'
import type { AcademyOffer } from '../models/game'
import { useGameStore } from '../store/gameStore'
import {
  academyQualityLabel,
  chanceLabel,
  formatEuro,
  roleLabel,
  trainingQualityLabel,
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
          <h1>你的第一站，选哪一家？</h1>
        </header>
        <p className="career-panel-lead">
          更好的训练条件，往往也意味着更激烈的竞争。第一站会影响你的成长速度和机会。
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
                  <strong>{clubDisplayNameForCompatibleId(offer.club.id, offer.club.name)}</strong>
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
                value={trainingQualityLabel(offer.club)}
              />
              <OfferValue
                label="青训环境"
                value={academyQualityLabel(offer.club)}
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
            <h2>{clubDisplayNameForCompatibleId(selected.club.id, selected.club.name)}</h2>
            <p>{selected.club.description}</p>
          </div>
          <div className="offer-confirmation__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => selectAcademy(selected.club.id)}
            >
              接受{clubDisplayNameForCompatibleId(selected.club.id, selected.club.name)}的邀请
              <Icon name="arrow" />
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => goToPhase('CREATE_PREFERENCES')}
            >
              调整职业偏好
            </button>
          </div>
        </section>
        <p className="career-offers__note">
          <Icon name="info" />
          国内俱乐部均为虚构名称
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
