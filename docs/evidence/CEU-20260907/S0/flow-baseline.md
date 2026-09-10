# 半年流程基线（当前代码；不是新流程验收）

HEAD 3f290407a299790665b58c4bc7c2bf8455d24bbd，2026-09-07。以下为源码检查；public-action-trace.json为单条匿名公开store生涯的运行证据，不代表每个条件均经过真实页面操作。

| 起点／条件 | 当前按钮／store动作 | 目标phase／windowIndex | 必要性与边界 |
| --- | --- | --- | --- |
| HALF_YEAR_PLAN | 开始这半年／chooseTraining | SPECIAL_EVENT或HALF_YEAR_REPORT，同窗口 | 必要训练决策；无事件时同步模拟 |
| SPECIAL_EVENT_RESULT | 继续／continueAfterCareerEvent | SIMULATION_READY随后HALF_YEAR_REPORT，同窗口 | 事件即时效果已经保存；此处才模拟比赛 |
| 青训报告不足4窗 | 进入下一半年／advanceAfterReport | HALF_YEAR_PLAN，+1 | 必要进入下一计划 |
| 青训满4窗无职业合同 | 结束青训第二年／advanceAfterReport | CAREER_DASHBOARD，0 | openProfessionalContract→PRO_CONTRACT_OFFER；acceptProfessionalContract→PRO_CONTRACT_COMPLETE；startProfessionalCareer→职业计划 |
| 职业报告、非末期到期 | 结束这半年／advanceAfterReport | PRO_STAGE_COMPLETE，0 | 重复确认；结束页重复比赛、角色、合同、现金 |
| 职业报告、到期且剩余生涯1–2窗 | advanceAfterReport | RETIREMENT_DECISION，0，AGE_LIMIT | 必要强制分流，已绕过结束页 |
| 结束页、强制退休 | 走向退役时刻／requestRetirement | RETIREMENT_DECISION，0 | 最终窗55；confirmRetirement→CAREER_RETIRED，无新结算 |
| 结束页、到期且可市场 | 处理合同到期／openTransferWindow | TRANSFER_WINDOW，+1 | 续约+最多3份自由合同；STAY不可用 |
| 结束页、合同有效、连续失约≥2且可市场 | 提出转会申请／openTransferWindow(true) | TRANSFER_WINDOW，首次+1 | 绕过常规机会门槛但保留合同/年龄限制 |
| 同上次要入口 | 继续留队半年／continueProfessionalCareer | 无正式机会时HALF_YEAR_PLAN，+1 | **若同时opportunity.available则被store拒绝**，页面条件与动作不一致；源码核对，未独立构造运行 |
| 结束页、有正式机会 | 查看转会报价／openTransferWindow | TRANSFER_WINDOW；无已有报价+1，非到期且已有报价0 | 必须做去留决定；固定窗口报价复用，但到期分支目前优先重生成 |
| 结束页、无正式机会、合同有效 | 进入下一职业半年／continueProfessionalCareer | HALF_YEAR_PLAN，+1 | 清空旧市场与训练选择 |
| 最后一年有效合同 | continueProfessionalCareer | HALF_YEAR_PLAN，+1（最终窗不可继续） | openTransferWindow拒绝最后一年谈判 |
| TRANSFER_WINDOW | selectTransferChoice／confirmTransferChoice | STAY或续约→TRANSFER_STAGE_COMPLETE；换队→TRANSFER_ARRIVAL | 此时窗口已+1，确认不再推进；谈判有独立counter标志 |
| TRANSFER_ARRIVAL | chooseTransferArrival | TRANSFER_STAGE_COMPLETE，0 | 融入与花费决定 |
| TRANSFER_STAGE_COMPLETE | continueAfterTransfer | HALF_YEAR_PLAN，0 | 不能再+1，否则跳过半年 |
| 结束页、30–32任一窗、33–36冬窗、37+任一窗 | 踢完这半年后退役／requestRetirement | RETIREMENT_DECISION，0 | cancelRetirement仅VOLUNTARY回PRO_STAGE_COMPLETE；强制不可取消 |
| ≥30、caps>0、未退出且非强制退役显示 | 退出中国国家队／浏览器confirm后retireFromNationalTeam | 原phase，0 | 国家队退休标志永久；俱乐部生涯继续 |
| 结束页回看 | 复查职业半年报告／reviewReport | HALF_YEAR_REPORT，0 | 测试确认回看→advance返回结束页时cash/history/window不变 |
| 导航球员/履历/设置 | careerNavigation selectNav | 只改React视图，不改game.phase | 与reviewReport不同，不应混为同一路径 |

主要代码：gameStore.ts:551/679/699/733/831/933/1190/1212/1264，ProfessionalStageCompleteScreen.tsx（主按钮优先级），HalfYearReportScreen.tsx:198，careerTime.ts（年龄与市场边界）。行号仅对应上述HEAD。

新增定向测试实证：从HALF_YEAR_PLAN误调用advanceAfterReport仍会进入PRO_STAGE_COMPLETE；因此不能宣称当前所有报告按钮已具备防重入。chooseTraining也只检查game存在，没有phase检查。goToPhase允许直接写phase；下一阶段必须审视相关调用。S0不修复这些行为。

运行trace包含每步before/after的phase、窗口、历史条数、现金以及市场拒绝原因。单条生涯采用留队优先并续约，不能作为外部转会、失约、所有退役条件的运行覆盖；这些在上表为源码证据，后续F-A要逐项动态验证。
