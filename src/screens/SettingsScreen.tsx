import { AppShell } from '../components/AppShell'
import { CareerTopbar } from '../components/CareerTopbar'
import { CLUBS } from '../data/balance'
import { DATA_VERSION, SAVE_VERSION, type GameState } from '../models/game'
import { useGameStore } from '../store/gameStore'

export const DELETE_CAREER_CONFIRMATION = '确定删除当前生涯吗？删除后无法恢复。'

export function buildSettingsView() {
  return {
    saveVersion: SAVE_VERSION,
    dataVersion: DATA_VERSION,
    clubCount: CLUBS.length,
    leagueCount: new Set(
      CLUBS.map((club) => club.leagueLabel.trim()).filter(Boolean),
    ).size,
  }
}

export function deleteCareerIfConfirmed(
  confirmDeletion: (message: string) => boolean,
  deleteCareer: () => void,
): boolean {
  if (!confirmDeletion(DELETE_CAREER_CONFIRMATION)) return false
  deleteCareer()
  return true
}

export function SettingsScreen({ game }: { game: GameState }) {
  const deleteCareer = useGameStore((state) => state.deleteCareer)
  const view = buildSettingsView()
  return (
    <AppShell topbar={<CareerTopbar game={game} sectionLabel="设置" />}>
      <main className="settings-screen">
        <header className="settings-screen__title"><span>设置</span><small>玩法与本地存档</small></header>
        <section><h2>怎么玩</h2><ul><li>每半年，你会选择一次训练方向和职业策略。</li><li>有些事件会改变状态和关系，也可能留下长期影响。</li><li>合同与转会，会改变你所在的平台、球队角色和成长空间。</li><li>比赛表现、能力成长、国家队经历和荣誉会由游戏根据你的选择模拟。</li></ul></section>
        <section><h2>存档</h2><p>当前生涯会自动保存在这个浏览器中，并保留一份内部恢复备份。</p><p>目前没有云同步、账号同步或多存档。清除浏览器数据可能会让这段生涯永久丢失。</p></section>
        <section><h2>版本信息</h2><dl><div><dt>存档版本</dt><dd>{view.saveVersion}</dd></div><div><dt>数据版本</dt><dd>{view.dataVersion}</dd></div><div><dt>俱乐部数据库</dt><dd>{view.clubCount} 家</dd></div><div><dt>当前数据库范围</dt><dd>{view.leagueCount} 个联赛</dd></div></dl></section>
        <section className="settings-screen__danger"><h2>删除生涯</h2><p>删除后，当前生涯和内部恢复备份都无法找回。</p><button type="button" onClick={() => deleteCareerIfConfirmed(window.confirm, deleteCareer)}>删除生涯</button></section>
      </main>
    </AppShell>
  )
}
