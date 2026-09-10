# ASTRA-T03 交付索引（待验收）

2026-09-07。用户本次明确转交授权“只做T-03”，GPT-6 Astra轻度；完成后由用户转Codex统筹验收。本批未进入T-04/M/F，无代理、提交、推送、部署。HEAD：`3f290407a299790665b58c4bc7c2bf8455d24bbd`，版本12/12及T-02首轮参数保持。

## 修改对应表

| 要求 | 交付与验证 |
| --- | --- |
| 分龄选项、默认、禁用 | `src/ui/trainingPlanView.ts`集中生成，使用playerAgeAtWindow及共享normalizeTrainingFocus；30/31、33/34、36/37边界测试 |
| 恢复预判 | 当前31+任一状态<46隐藏两组可选卡，提交BODY_CARE＋STEADY；三个状态45/46测试，实页点击核验 |
| 合法选择、旧计划与跨窗口 | `TrainingPlanScreen.tsx`局部草稿按生涯/窗口/已保存计划隔离；普通重渲染与返回保留，新窗口重置；旧attack映射比赛状态在饱和时可继续；提交防重入 |
| 饱和与成本说明 | 新选在form/morale≥95禁用；fitness≥95身体维护仍可选；95/100自动化与实页验证；明确直接收益、成本、恢复优先及非整窗净变化 |
| 实际报告 | `HalfYearReportScreen.tsx`直接渲染已保存eventSummary，局部pre-wrap、取消截断；`trainingEventSummary`仅简化文案、约数与旧文案断言，计算不变 |
| 可读性 | `main.css`仅训练卡、老将策略说明与报告摘要局部调整；说明14px且允许换行；年轻长训练文案限制在自身网格内 |
| 文档 | 主台账顶部/任务行/第10节均待验收；产品说明01补充当前行为 |

新增测试为`trainingPlanView.test.ts`及`trainingSummary.test.ts`。本批前306个文件中299个字节不变、7个授权文件变化、0缺失，详见[保护核验](protection-verification.json)；新增文件另见[最终清单](artifact-hashes.json)。所有本批前冻结证据和outputs未变。存档/版本、状态准备、年龄曲线及迁移文件均未修改。工作区原有T-02等改动保留。

## 命令与结果

| 层次 | 命令／结果 | 日志 |
| --- | --- | --- |
| 定向 | `npm run test:run -- src/ui/trainingPlanView.test.ts src/ui/trainingSummary.test.ts src/engine/__tests__/trainingPlan.test.ts src/store/gameStore.trainingPlan.test.ts src/store/gameStore.ceuT01.test.ts src/engine/__tests__/ceuTrainingBaseline.test.ts`；6文件49项通过 | [定向](targeted-final.txt) |
| 全量 | `npm run test:run`；60文件415项通过，18.52秒 | [全量](full.txt) |
| 类型 | `npm run typecheck`通过 | [类型](typecheck.txt) |
| 构建 | `npm run build`通过；仍提示>500kB包体 | [构建](build.txt) |
| 实页 | `npm run dev -- --host 127.0.0.1 --port 4183`；`node /tmp/ceu-t03-qa.cjs`最终退出0 | [脚本](browser-qa.cjs)、[逐场景结果](browser-results.json) |

初轮定向有1项旧措辞断言失败，保留[targeted.txt](targeted.txt)，只更新措辞断言后通过，未改数值期望或冻结输入。浏览器首轮发现年轻桌面训练说明造成16px横向溢出，局部换行修正后所有场景无横向溢出；不将无溢出单独认定为视觉通过。最初截图采用scrollIntoViewIfNeeded时按钮可能处于固定底栏后方，最终submit截图采用滚动居中，确认正常滚动可使按钮完整显示且可点击。无需隐藏说明或缩小字体。

Browser插件不可用，按前端验证Skill回退到已有Playwright 1.62.1。系统Chromium启动最初受沙箱MachPort限制，经授权在沙箱外运行隔离上下文成功；未安装依赖。脚本引用本机缓存Playwright绝对路径，其他机器复跑需替换该路径。没有使用用户浏览器profile。

## 页面场景来源与操作

统一访问本地4183；每次运行创建全新headless Chromium上下文并关闭。视口为桌面1280×720、模拟移动390×844。

1. 训练卡场景以冻结匿名`S0-v11-supplement/fixtures/PLAN_35.json`经validateGameState载入的副本为基础，在测试内存中设定windowIndex、三状态、focus及独立careerSeed。年轻30、31、33、35、37、fitness45恢复、fitness100/form95/morale100饱和、form100＋旧attack共8类。年龄构造用于页面验证，历史并未重新生成，不冒充真实年轻生涯档或真实饱和采集档。
2. 每个场景在两个视口分别保存top、plan、submit截图。top/submit是真实视口截图；plan是完整元素截图，用于读完整文字，不能据其固定底栏位置判断最终可点击性。最终按钮位置以submit及真实click断言为准。
3. 实页选择心理调适，触发普通重渲染，导航“球员→生涯”，选择保留；同一按钮连续调用两次点击只收到一次当前选择；切换下一窗口恢复身体维护默认。内存spy核对恢复提交BODY_CARE/STEADY及旧饱和attack提交MATCH_SHARPNESS/STEADY。spy仅用于动作次数/参数，不充当引擎结算证明。
4. reload清除spy；将原始v11 PLAN_35 envelope写入这个隔离上下文的测试存储，通过真实continueCareer→开始这半年→事件处理→报告。核对实际保存摘要、换行、非内部术语，reload后逐字一致。
5. 用冻结T-02 `migration-v12/real-veteran-LOW_35.json`继续已有报告，两个视口显示112字、含换行的恢复说明，逐字等于旧eventSummary；旧措辞原样保留，不重算、不改写。

### 代表性实页证据与人工检查

| 场景 | 桌面 | 模拟移动 | 检查结论 |
| --- | --- | --- | --- |
| 年轻 | [30岁](screenshots/young30-1280-submit.png) | [30岁](screenshots/young30-390-submit.png) | 六项保留，长文案换行，不挤出图标 |
| 31—33 | [31岁](screenshots/age31-1280-plan.png) | [33岁](screenshots/age33-390-plan.png) | 六项与身体停止普通成长说明可读 |
| 35岁 | [完整卡](screenshots/age35-1280-plan.png) | [滚动至按钮](screenshots/age35-390-submit.png) | 策略、直接收益、成本完整，不隐藏长说明；正常滚动后CTA在底栏上方 |
| 37岁 | [37岁](screenshots/age37-1280-plan.png) | [37岁](screenshots/age37-390-submit.png) | 衰退加快说明保留 |
| 恢复 | [恢复](screenshots/recovery-1280-submit.png) | [恢复](screenshots/recovery-390-submit.png) | 无可点击收益卡；事件前预判与开始按钮清楚 |
| 饱和／旧计划 | [旧计划](screenshots/old-plan-1280-plan.png) | [饱和](screenshots/saturation-390-submit.png) | 禁用原因显示；旧选继续路径保留 |
| 新报告 | [报告](screenshots/report-1280.png) | [报告](screenshots/report-390.png) | 保存原文换行呈现，摘要不截断 |
| 旧长报告 | [旧报告](screenshots/long-old-report-1280.png) | [旧报告](screenshots/long-old-report-390.png) | 长恢复说明逐行可读、与旧保存字符串一致 |

已人工查看代表图的文字层级、换行、图标边界及滚动后的按钮，未发现T-03内容重叠或截断。移动页面可滚动，未承诺所有信息一屏容纳。原报告其他统计区的小字号与全站桌面留白未重做。

## 限制与T-04待验事项（未执行）

- 以上是本地实际Chromium页面＋模拟移动视口；真实手机、Safari/Firefox、线上部署未执行。
- T-04由统筹独立核对全训练矩阵、各旧存档训练阶段的连续推进、长期选择价值及多窗口体验；本批不开展扩大参数实验或调整参数。
- 更多屏幕尺寸、真实触屏与整体页面验收仍待T-04/Q；构造饱和场景不能替代真实采集档。
- 持久v11备份、旧客户端读取v12及发布回退保障仍需后续专项确认；未触碰用户真实存档。

当前停止点：T-03待验收，请用户转Codex审核。
