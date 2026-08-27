import { Brand } from '../components/Brand'
import { Icon } from '../components/Icons'
import { useGameStore } from '../store/gameStore'

export const HOME_NEW_CAREER_CONFIRMATION = '开始新生涯会覆盖当前进度。确定重新开始吗？'
export const HOME_DELETE_CAREER_CONFIRMATION = '确定删除当前生涯吗？删除后无法恢复。'

export function startNewCareerIfConfirmed(
  hasSave: boolean,
  confirm: (message: string) => boolean,
  startNewCareer: () => void,
): boolean {
  if (hasSave && !confirm(HOME_NEW_CAREER_CONFIRMATION)) return false
  startNewCareer()
  return true
}

export function deleteCareerIfConfirmed(
  confirm: (message: string) => boolean,
  deleteCareer: () => void,
): boolean {
  if (!confirm(HOME_DELETE_CAREER_CONFIRMATION)) return false
  deleteCareer()
  return true
}

export function HomeScreen() {
  const hasSave = useGameStore((state) => state.hasSave)
  const startNewCareer = useGameStore((state) => state.startNewCareer)
  const continueCareer = useGameStore((state) => state.continueCareer)
  const deleteCareer = useGameStore((state) => state.deleteCareer)

  const handleNewCareer = () => {
    startNewCareerIfConfirmed(hasSave, window.confirm, startNewCareer)
  }

  const handleDelete = () => {
    deleteCareerIfConfirmed(window.confirm, deleteCareer)
  }

  return (
    <main className="home-screen">
      <section className="home-screen__content">
        <Brand />
        <p className="home-screen__date">{new Date().getFullYear()}年夏季</p>
        <h1>从13岁开始，踢完这一生。</h1>
        <p className="home-screen__lead">
          进入青训，争取首发，签下合同，奔赴更大的联赛。每半年一次选择，都可能改变你的职业生涯。
        </p>
        <div className="home-actions">
          {hasSave ? (
            <button
              type="button"
              className="button button--primary"
              onClick={continueCareer}
            >
              继续生涯
              <Icon name="arrow" />
            </button>
          ) : null}
          <button
            type="button"
            className={
              hasSave
                ? 'button button--secondary button--on-dark'
                : 'button button--primary'
            }
            onClick={handleNewCareer}
          >
            开始新生涯
            <Icon name="arrow" />
          </button>
          {hasSave ? (
            <button
              type="button"
              className="text-button text-button--danger"
              onClick={handleDelete}
            >
              删除生涯
            </button>
          ) : null}
        </div>
        <dl className="home-principles">
          <div>
            <dt>13岁</dt>
            <dd>从青训营出发</dd>
          </div>
          <div>
            <dt>半年</dt>
            <dd>做一次关键选择</dd>
          </div>
          <div>
            <dt>40岁</dt>
            <dd>最晚迎来职业终场</dd>
          </div>
        </dl>
      </section>
      <aside className="home-screen__field" aria-hidden="true">
        <div className="field-outline">
          <span className="field-outline__circle" />
          <span className="field-outline__box field-outline__box--top" />
          <span className="field-outline__box field-outline__box--bottom" />
        </div>
        <p>每一次选择，都在改变你最后会成为谁。</p>
      </aside>
    </main>
  )
}
