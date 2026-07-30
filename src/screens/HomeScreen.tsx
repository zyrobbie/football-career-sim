import { Brand } from '../components/Brand'
import { Icon } from '../components/Icons'
import { useGameStore } from '../store/gameStore'

export function HomeScreen() {
  const hasSave = useGameStore((state) => state.hasSave)
  const startNewCareer = useGameStore((state) => state.startNewCareer)
  const continueCareer = useGameStore((state) => state.continueCareer)
  const deleteCareer = useGameStore((state) => state.deleteCareer)

  const handleNewCareer = () => {
    if (
      hasSave &&
      !window.confirm('新建生涯会覆盖当前进度。确定重新开始吗？')
    ) {
      return
    }
    startNewCareer()
  }

  const handleDelete = () => {
    if (window.confirm('确定删除当前本地生涯吗？这个操作不能撤销。')) {
      deleteCareer()
    }
  }

  return (
    <main className="home-screen">
      <section className="home-screen__content">
        <Brand />
        <p className="home-screen__date">{new Date().getFullYear()}年夏季</p>
        <h1>从青训营开始，书写属于你的职业生涯。</h1>
        <p className="home-screen__lead">
          每半年作出一次选择。训练、出场、关系和合同，会把同样的天赋带向完全不同的终点。
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
            新建生涯
            <Icon name="arrow" />
          </button>
          {hasSave ? (
            <button
              type="button"
              className="text-button text-button--danger"
              onClick={handleDelete}
            >
              删除本地生涯
            </button>
          ) : null}
        </div>
        <dl className="home-principles">
          <div>
            <dt>13岁</dt>
            <dd>从职业青训营起步</dd>
          </div>
          <div>
            <dt>半年</dt>
            <dd>一次关键职业选择</dd>
          </div>
          <div>
            <dt>40岁</dt>
            <dd>最晚结束球员生涯</dd>
          </div>
        </dl>
      </section>
      <aside className="home-screen__field" aria-hidden="true">
        <div className="field-outline">
          <span className="field-outline__circle" />
          <span className="field-outline__box field-outline__box--top" />
          <span className="field-outline__box field-outline__box--bottom" />
        </div>
        <p>每一个窗口，都是一段生涯的转折。</p>
      </aside>
    </main>
  )
}
