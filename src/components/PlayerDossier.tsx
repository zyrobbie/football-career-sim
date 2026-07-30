import {
  ATTRIBUTE_LABELS,
  POSITION_LABELS,
} from '../data/balance'
import { attributeKeys, type Player, type YouthRole } from '../models/game'
import { calculateOverall } from '../engine/player'
import { formatEuro, preferredFootLabel, roleLabel } from '../ui/format'

export function PlayerDossier({
  player,
  clubName,
  role,
  cashEuro,
}: {
  player: Player
  clubName: string
  role: YouthRole
  cashEuro: number
}) {
  return (
    <aside className="dossier">
      <header className="dossier__header">
        <h2>
          {player.name} <span>· 13岁 · {player.primaryPosition}</span>
        </h2>
        <p>{clubName}</p>
        <p>
          青年队 · {roleLabel(role)}
        </p>
      </header>

      <section className="overall-block">
        <div>
          <span>综合能力</span>
          <strong>
            {Math.round(
              calculateOverall(player.attributes, player.primaryPosition),
            )}
          </strong>
        </div>
        <dl className="attribute-lines">
          {attributeKeys.map((key) => (
            <div key={key}>
              <dt>{ATTRIBUTE_LABELS[key]}</dt>
              <dd>{Math.round(player.attributes[key])}</dd>
            </div>
          ))}
        </dl>
      </section>

      <dl className="dossier-list">
        <div>
          <dt>竞技状态</dt>
          <dd>{Math.round(player.form)}</dd>
        </div>
        <div>
          <dt>身体状态</dt>
          <dd>{Math.round(player.fitness)}</dd>
        </div>
        <div>
          <dt>心理状态</dt>
          <dd>{Math.round(player.morale)}</dd>
        </div>
      </dl>
      <dl className="dossier-list">
        <div>
          <dt>教练关系</dt>
          <dd>{Math.round(player.coachRelation)}</dd>
        </div>
        <div>
          <dt>队内关系</dt>
          <dd>{Math.round(player.squadRelation)}</dd>
        </div>
        <div>
          <dt>球迷关系</dt>
          <dd>{Math.round(player.fanRelation)}</dd>
        </div>
      </dl>
      <dl className="dossier-list dossier-list--single">
        <div>
          <dt>可支配现金</dt>
          <dd>{formatEuro(cashEuro)}</dd>
        </div>
      </dl>
      <div className="position-line">
        <span>
          主位置 <strong>{player.primaryPosition}</strong>
        </span>
        <span>
          副位置 <strong>{player.secondaryPosition}</strong>
        </span>
        <span>
          号码 <strong>#{player.jerseyNumber}</strong>
        </span>
        <span>
          惯用脚 <strong>{preferredFootLabel(player.preferredFoot)}</strong>
        </span>
      </div>
      <p className="sr-only">
        {POSITION_LABELS[player.primaryPosition]}，副位置
        {POSITION_LABELS[player.secondaryPosition]}，偏好号码
        {player.jerseyNumber}，惯用脚{preferredFootLabel(player.preferredFoot)}
      </p>
    </aside>
  )
}
