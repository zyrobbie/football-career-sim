import { AppShell } from '../components/AppShell'
import { CareerTopbar } from '../components/CareerTopbar'
import { CLUBS } from '../data/balance'
import { DATA_VERSION, SAVE_VERSION, type GameState } from '../models/game'
import { useGameStore } from '../store/gameStore'

export const DELETE_CAREER_CONFIRMATION = '确定删除当前本地生涯吗？这个操作不能撤销。'

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
        <header className="settings-screen__title"><span>设置</span><small>本地生涯与玩法说明</small></header>
        <section><h2>怎么玩</h2><ul><li>每半年选择训练方向。</li><li>特殊事件会影响状态、关系与职业故事。</li><li>合同和转会决定会影响平台、角色与成长空间。</li><li>比赛、能力成长、国家队与荣誉由系统结算。</li></ul></section>
        <section><h2>存档</h2><p>当前生涯自动保存在此浏览器本地。只保留当前存档及内部恢复备份。</p><p>没有云同步、账号同步或多存档槽；清除浏览器数据可能导致存档丢失。</p></section>
        <section><h2>版本信息</h2><dl><div><dt>存档版本</dt><dd>{view.saveVersion}</dd></div><div><dt>数据版本</dt><dd>{view.dataVersion}</dd></div><div><dt>俱乐部数据库</dt><dd>{view.clubCount} 家</dd></div><div><dt>当前数据库范围</dt><dd>{view.leagueCount} 个联赛</dd></div></dl></section>
        <section className="settings-screen__danger"><h2>危险操作</h2><p>删除后无法恢复当前本地生涯及内部恢复备份。</p><button type="button" onClick={() => deleteCareerIfConfirmed(window.confirm, deleteCareer)}>删除当前生涯</button></section>
      </main>
    </AppShell>
  )
}
