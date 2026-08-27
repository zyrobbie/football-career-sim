import { ATTRIBUTE_LABELS, PRIORITY_LABELS } from '../data/balance'
import { playerAgeAtWindow } from '../engine/careerTime'
import { calculateOverall } from '../engine/player'
import { attributeKeys, type GameState, type SquadRole, type TeamLevel } from '../models/game'
import {
  firstTeamStatusLabel,
  overseasIntentLabel,
  preferredFootLabel,
  roleLabel,
} from '../ui/format'
import { visibleCareerWindowIndex } from '../ui/careerView'
import { AppShell } from '../components/AppShell'
import { CareerTopbar, currentCareerClub } from '../components/CareerTopbar'
import { ClubCrest } from '../components/ClubCrest'

export interface PlayerViewModel {
  age: number
  overall: number
  clubName: string
  clubShortMark: string
  clubId: string | null
  actualTeamLevel: TeamLevel
  actualRole: SquadRole | null
  contract: GameState['contract']
  actualContractTeamLevel: TeamLevel
  actualContractRole: SquadRole | null
}

export function buildPlayerViewModel(game: GameState): PlayerViewModel {
  const player = game.player!
  const currentClub = currentCareerClub(game)
  const actualRole = game.teamLevel === 'FIRST_TEAM'
    ? game.firstTeamRole
    : game.youthRole
  return {
    age: playerAgeAtWindow(visibleCareerWindowIndex(game)),
    overall: Math.round(calculateOverall(player.attributes, player.primaryPosition)),
    clubName: currentClub?.name ?? '还没有加入俱乐部',
    clubShortMark: currentClub?.shortMark ?? '足',
    clubId: currentClub?.id ?? null,
    actualTeamLevel: game.teamLevel,
    actualRole,
    contract: game.contract,
    actualContractTeamLevel: game.teamLevel,
    actualContractRole: actualRole,
  }
}

function teamLevelLabel(level: TeamLevel): string {
  return level === 'FIRST_TEAM' ? '一线队' : '青年队'
}

function remainingContractLabel(halfYears: number): string {
  return `${halfYears / 2}年`
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="player-screen__meter">
      <span>{label}</span>
      <strong>{Math.round(value)}</strong>
      <i aria-hidden="true"><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i>
    </div>
  )
}

export function PlayerScreen({ game }: { game: GameState }) {
  if (!game.player) return null
  const player = game.player
  const view = buildPlayerViewModel(game)
  const pathway = game.firstTeamProgress
  const isContracted = Boolean(view.contract)

  return (
    <AppShell topbar={<CareerTopbar game={game} sectionLabel="球员档案" />}>
      <main className="player-screen">
        <header className="player-screen__title">
          <span>球员</span>
          <small>生涯一览</small>
        </header>

        <section className="player-screen__identity" aria-label="球员身份摘要">
          <div className="player-screen__overall"><span>OVR</span><strong>{view.overall}</strong></div>
          <div>
            <h1>{player.name}</h1>
            <p>{view.age}岁 · #{player.jerseyNumber} · {player.primaryPosition} / {player.secondaryPosition} · {preferredFootLabel(player.preferredFoot)}</p>
            <strong className="player-screen__club">
              <ClubCrest clubId={view.clubId} shortMark={view.clubShortMark} className="club-crest--overview" />
              {view.clubName}
            </strong>
            <small>{teamLevelLabel(view.actualTeamLevel)} · {view.actualRole ? roleLabel(view.actualRole) : '角色还未确定'}</small>
          </div>
        </section>

        <section className="player-screen__section" aria-label="四项能力">
          <header><h2>四项能力</h2></header>
          <dl className="player-screen__attributes">
            {attributeKeys.map((key) => <div key={key}><dt>{ATTRIBUTE_LABELS[key]}</dt><dd>{Math.round(player.attributes[key])}</dd></div>)}
          </dl>
        </section>

        <section className="player-screen__section" aria-label="职业偏好">
          <header><h2>职业偏好</h2></header>
          <dl className="player-screen__preferences">
            <div><dt>职业追求</dt><dd>{player.priorities.map((priority, index) => <span key={priority}>{index + 1}. {PRIORITY_LABELS[priority]}</span>)}</dd></div>
            <div><dt>留洋倾向</dt><dd>{overseasIntentLabel(player.overseasIntent)}</dd></div>
            <div><dt>偏好联赛</dt><dd>{player.preferredLeagues.length > 0 ? player.preferredLeagues.slice(0, 3).join(' · ') : '还没有偏好联赛'}</dd></div>
          </dl>
        </section>

        {isContracted && view.contract ? (
          <section className="player-screen__section" aria-label="当前合同状态">
            <header><h2>当前合同</h2></header>
            <dl className="player-screen__contract-grid">
              <div><dt>合同剩余</dt><dd>{remainingContractLabel(view.contract.remainingHalfYears)}</dd></div>
              <div><dt>承诺队伍</dt><dd>{teamLevelLabel(view.contract.promisedTeamLevel)}</dd></div>
              <div><dt>承诺角色</dt><dd>{view.contract.promisedRole ? roleLabel(view.contract.promisedRole) : '无'}</dd></div>
              <div><dt>当前队伍</dt><dd>{teamLevelLabel(view.actualContractTeamLevel)}</dd></div>
              <div><dt>当前角色</dt><dd>{view.actualContractRole ? roleLabel(view.actualContractRole) : '待评估'}</dd></div>
            </dl>
          </section>
        ) : (
          <section className="player-screen__section" aria-label="距离一线队">
            <header><h2>距离一线队</h2><small>{firstTeamStatusLabel(pathway.status)}</small></header>
            <dl className="player-screen__pathway-grid">
              <div><dt>一线队关注</dt><dd>{Math.round(pathway.attention)}</dd></div>
              <div><dt>准备程度</dt><dd>{Math.round(pathway.readiness)}</dd></div>
              <div><dt>比赛表现</dt><dd>{Math.round(pathway.matchProof)}</dd></div>
              <div><dt>教练推荐</dt><dd>{Math.round(pathway.coachBacking)}</dd></div>
            </dl>
          </section>
        )}

        <section className="player-screen__section" aria-label="状态与关系">
          <header><h2>状态与关系</h2></header>
          <div className="player-screen__meters">
            <Meter label="竞技" value={player.form} /><Meter label="身体" value={player.fitness} /><Meter label="心理" value={player.morale} />
            <Meter label="教练" value={player.coachRelation} /><Meter label="队内" value={player.squadRelation} /><Meter label="球迷" value={player.fanRelation} />
          </div>
        </section>

        <section className="player-screen__section player-screen__tags" aria-label="生涯标签">
          <header><h2>生涯标签</h2></header>
          <p>你的生涯标签会在退役时揭晓。</p>
        </section>
      </main>
    </AppShell>
  )
}
