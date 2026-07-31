import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { AcademyOffersScreen } from '../screens/AcademyOffersScreen'
import { ArrivalScreen } from '../screens/ArrivalScreen'
import { CreationScreen } from '../screens/CreationScreen'
import { DemoCompleteScreen } from '../screens/DemoCompleteScreen'
import { HalfYearReportScreen } from '../screens/HalfYearReportScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { PlayerRevealScreen } from '../screens/PlayerRevealScreen'
import { ProfessionalContractScreen } from '../screens/ProfessionalContractScreen'
import { ProfessionalStageCompleteScreen } from '../screens/ProfessionalStageCompleteScreen'
import { TrainingPlanScreen } from '../screens/TrainingPlanScreen'

export function App() {
  const game = useGameStore((state) => state.game)
  const error = useGameStore((state) => state.error)
  const clearError = useGameStore((state) => state.clearError)
  const phase = game?.phase

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase])

  let screen = <HomeScreen />

  if (game) {
    if (
      [
        'CREATE_IDENTITY',
        'CREATE_POSITION',
        'CREATE_PRIORITIES',
        'CREATE_PREFERENCES',
      ].includes(game.phase)
    ) {
      screen = <CreationScreen />
    } else if (game.phase === 'PLAYER_REVEAL') {
      screen = <PlayerRevealScreen />
    } else if (game.phase === 'ACADEMY_OFFERS') {
      screen = <AcademyOffersScreen />
    } else if (game.phase === 'ARRIVAL_EVENT') {
      screen = <ArrivalScreen />
    } else if (
      game.phase === 'HALF_YEAR_PLAN' ||
      game.phase === 'SIMULATION_READY'
    ) {
      screen = <TrainingPlanScreen />
    } else if (game.phase === 'HALF_YEAR_REPORT') {
      screen = <HalfYearReportScreen />
    } else if (game.phase === 'CAREER_DASHBOARD') {
      screen = <DemoCompleteScreen />
    } else if (
      game.phase === 'PRO_CONTRACT_OFFER' ||
      game.phase === 'PRO_CONTRACT_COMPLETE'
    ) {
      screen = <ProfessionalContractScreen />
    } else if (game.phase === 'PRO_STAGE_COMPLETE') {
      screen = <ProfessionalStageCompleteScreen />
    }
  }

  return (
    <>
      {screen}
      {error ? (
        <div className="error-toast" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="关闭错误提示">
            ×
          </button>
        </div>
      ) : null}
    </>
  )
}
