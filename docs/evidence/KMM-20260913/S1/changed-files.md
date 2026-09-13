# S1修改清单

逐文件前后SHA见protection-candidate.json；新源码见candidate-source-sha.json。

- docs/football-career-key-match-moment-upgrade-v1.1.md
- src/app/App.tsx
- src/app/careerNavigation.tsx
- src/engine/__tests__/careerEvents.test.ts
- src/engine/__tests__/careerSummary.test.ts
- src/engine/__tests__/ceuMarketPoolConnection.test.ts
- src/engine/__tests__/ceuTrainingBaselineFixture.ts
- src/engine/__tests__/eligibility.test.ts
- src/engine/__tests__/honors.test.ts
- src/engine/__tests__/professionalSimulation.test.ts
- src/engine/simulateProfessionalHalfYear.ts
- src/engine/trainingPlan.ts
- src/models/game.ts
- src/persistence/__tests__/v11Backup.test.ts
- src/persistence/save.ts
- src/screens/CareerHistoryScreen.tsx
- src/screens/HalfYearReportScreen.tsx
- src/store/gameStore.ceuF01.test.ts
- src/store/gameStore.ceuF02.test.ts
- src/store/gameStore.ceuF03.test.ts
- src/store/gameStore.ceuM01.test.ts
- src/store/gameStore.ceuM02R1.test.ts
- src/store/gameStore.ceuM03.test.ts
- src/store/gameStore.ceuQ01Career.test.ts
- src/store/gameStore.ceuQ01Matrix.test.ts
- src/store/gameStore.ceuT01.test.ts
- src/store/gameStore.fullCareerAudit.test.ts
- src/store/gameStore.test.ts
- src/store/gameStore.trainingPlan.test.ts
- src/store/gameStore.ts
- src/store/gameStore.v1ClubWorkflows.test.ts
- src/styles/main.css
- src/testing/createCopyAuditGame.test.ts
- src/testing/createCopyAuditGame.ts
- src/testing/createRetirementVisualAuditGame.ts

新增源码：KeyMatchMomentSummary、KeyMatchMomentScreen、keyMatchMoment类型/模板/引擎/schema、simulationPreparation、专项测试和测试helper。所有冻结证据/既有outputs无变化，无丢失。统筹并行修改主执行指令属于其授权记录，不计为本批独立产出。
