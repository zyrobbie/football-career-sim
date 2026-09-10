# ASTRA-M03交付：当前求职方向与可靠市场恢复（待验收）

2026-09-08。用户明确授权本批M-03，M-02及R1已由文档32验收、MR-05保持关闭。当前M-03为**待验收**，MR-03为**修复待统筹验证**，不自行关闭。完成后停止，M-04/F/Q/R未开始。

HEAD：`3f290407a299790665b58c4bc7c2bf8455d24bbd`；SAVE_VERSION/DATA_VERSION=12/12。实际基线是带既有训练与市场修改的工作树，不能用HEAD代替。未提交、推送、部署，无代理，未读取用户浏览器存档。

## 已实现

- 新增`updateCareerPreferences(intent, leagues)`，只改两个player字段，保留draft开局档案、职业优先级及其他事实。与页面共享枚举/合法联赛、去重、最多3项、DOMESTIC清空及phase允许表。重复规范化同值无写盘、无随机或报价生成。
- 训练计划与市场复用可选小编辑器；取消/未保存刷新丢弃表单，保存刷新保留。尚未生成与已有市场分别显示批准的生效提示；球员页区分当前与开局方向。
- 共享旧状态解释先识别市场/签约/下一计划，再执行新市场门槛。普通空市场也算已生成；已有报价、选择及成功/失败/撤回谈判原样复用，到期0–3外部不重抽。真正新开仍走原节奏、表现、失约、年龄及合同限制。
- 回看只用非持久视图标志；报告显示“返回当前进度”，不写phase。导航、刷新、换生涯清除。goToPhase只保留开局回退边与只读回看；advance、开市、谈判和确认守卫阻止过期动作推进/重签。正常青训、职业推进及下一半年继续可用。
- 没有改存档结构/版本/迁移，没有改transfers.ts、save.ts、训练公式、目录或依赖。F的结束页合并、报告主动作重排、退役和国家队流程不在本批。

实现前的[状态与动作字段契约](state-contract.md)列明W/H、phase、选择、transferDecision与合同依据。无history的最小兼容输入只按明确结束phase＋空市场标记走原新开条件，不猜测历史；没有发现合法档关键字段相同却要求相反处理的反例，不添加marketId。默认测试不写证据。

## 分层验证结果

| 层次 | 实际结果 |
| --- | --- |
| 新增测试 | gameStore.ceuM03.test.ts共29项；循环子例不重复算Vitest项 |
| 偏好字段/输入 | 三方向、联赛去重/3项上限/非法值/DOMESTIC清空、连续三次修改、同值无操作与禁止phase；完整state仅两个player字段变化；生成器与createRandom观察均无调用 |
| 原始市场档 | M-01/generated-r4七份＋supplement/withdrawn共8份，逐份SHA核对，原始envelope直接置入全新Storage且无backup，load/continue完整data相等；没有先重存data |
| 稀缺市场档 | 直接复用R1实际首次写盘的7个原始envelope，外部0/1/2/3、4续约与3外部选择支路；三次方向修改、回看、重复开市、重存重载、合法签约/NONE到队/下一计划，报价与现金/history/事件/报告/窗口保持合同允许变化 |
| 旧回看恢复 | 四类冻结MR-03市场起点×旧报告/结束phase=8构造例；实际公开签约/到队/下一计划×2旧phase=6构造例，原始写盘后直接load/continue恢复正确，不把已处理市场重新激活 |
| 谈判与重复 | 成功/失败/撤回旧字段和选择完整保留；已用反报价再谈不改状态，签约/到队完成后过期确认/谈判/推进不改state、不重复花费 |
| 下一市场生效 | 固定完整输入，以最新保存方向直接对照真实generateTransferOffers输出；正常新开仅调用一次、窗口+1一次；之后真实继续训练/事件/报告，history新增1条。无机会或失约不足仍拒绝新开 |
| 最终定向 | 15文件197项通过：store、persistence、导航/view、市场、R1、训练迁移/训练计划回归 |
| 最终全量 | 65文件510项通过，14.10秒；typecheck/build退出0 |
| 构建限制 | 主包857.65kB，>500kB警告保留，没有以包体修改扩大范围 |
| 实际页面 | 1280×720、390×844、320×568、430×932：8组普通市场/计划完整操作＋4组35岁训练联赛/按钮/换生涯＋两主尺寸8组稀缺到期页面，共20组；独立Chromium/origin，无用户profile |

原始loadGame会把某些冻结envelope的排版规范化并写滚动backup，这是既有持久化行为；测试要求data逐字段不变，没有错误要求加载字节绝不变化。重复同值保存和非法编辑仍严格要求无写入，开始观察前仅清空spy调用记录，不清空/重写原始存档。

页面检查与store检查互不替代。[页面记录](page-review.md)列明14张已实际查看的截图、视觉限制及主机失败。24张首轮完整全页＋12张补查完整视口图；另10张中断补查图只作失败记录，合计46张，不全部称人工验收。

430宽度个别滚动位置下，固定底栏会盖到保存按钮。首轮hit test失败保留；正常滚动后保存/返回按钮完整露出，中心命中及真实点击通过。没有隐藏底栏或把“无横向溢出”当成可用性结论。已有长页、小字与桌面留白保持，不扩大视觉改造。

## 文件修改清单

| 文件 | 本批用途 |
| --- | --- |
| src/store/gameStore.ts | 偏好动作、视图标志、恢复及入口守卫；训练结算未改 |
| src/store/marketContext.ts（新） | W/H与phase/选择/decision共享解释，新开与已生成判定 |
| src/store/careerPreferences.ts（新） | 允许表与原子输入规范化 |
| src/components/CareerPreferencesEditor.tsx（新） | 本地表单、保存/取消、生效提示、回看入口 |
| src/screens/TrainingPlanScreen.tsx、TransferWindowScreen.tsx | 最小编辑器接入，既有训练卡片/市场报价逻辑保留 |
| src/screens/PlayerScreen.tsx | 当前方向及draft开局方向区分 |
| src/screens/HalfYearReportScreen.tsx | 可选只读模式、旧报告窗口标题、返回动作 |
| src/app/App.tsx、careerNavigation.tsx | 按视图标志显示报告、导航清除回看 |
| src/styles/main.css | 仅career-preferences局部样式；不增加全局版式覆盖 |
| src/store/gameStore.ceuM03.test.ts（新） | 29项新回归与独占证据输出 |
| src/store/gameStore.ceuM01.test.ts、gameStore.ceuS0Baseline.test.ts | 替换4类MR-03缺陷和S0过期报告断言，其他有效检查保留 |
| docs/01、02、20、21 | 当前规则/字段/状态及验收证据；docs/05参数未变，未修改 |

[旧断言→目标对应表](assertion-mapping.md)解释每个替换；没有整文件skip、修改冻结快照或重新生成旧档。

[最终逐文件前后哈希](changed-files-final.json)是本批编辑权威清单；changed-files.json为文案最终纠错前中间审计，保留不覆盖。[保护核验](protection-verification.json)：650份已有文件，635份未变；15份变化为14份授权编辑＋tsconfig.app.tsbuildinfo构建缓存，另新增4个源码/测试文件。457份既有冻结证据和outputs逐字节不变。dist由要求的构建生成，不属于冻结outputs。新证据只在M-03目录。

## 证据索引与命令

- [store-results.json](store-results.json)：25条完整记录，含15原始envelope、三次方向编辑、签约/到队/最终状态，8旧phase恢复，允许表与下一市场生效。首次28项测试时输出；后补第29项的6组完整结果单独写[legacy-successors.json](legacy-successors.json)，不覆盖前产物。
- [commands-final-r2.json](commands-final-r2.json)：最终197/510/typecheck/build命令、起止时间、退出码，对应`*-final-r2.txt`原始日志。此前commands.json及196/509结果保留；r2仅增加真实旧签约后继恢复测试，生产代码未再改变。
- [pages.json](pages.json)：8组页面操作、完整前后state、布局及截图列表。[pages-supplement-r2.json](pages-supplement-r2.json)：4组35岁计划保存/返回hit test、联赛上限与换生涯，8组稀缺市场页面，完整state及实际结果。
- [page-commands.json](page-commands.json)：页面启动、沙箱失败、获权运行及补查结果；原始日志`pages-initial/second/supplement/supplement-r2.txt`保留。成功日志无输出不代表未执行，退出码及JSON结果同时核对。
- `pages.cjs`、`pages-supplement.cjs`、`pages-supplement-r2.cjs`：实际使用的隔离脚本，所有截图/JSON独占写入；不可对已有路径覆盖重跑。
- `git-before.txt`、`before-hashes.json`、四份`*.before.txt`与`*.diff`：区别本批增量和已有未提交训练/市场改动。`artifact-hashes.json`记录本批证据SHA及字节。

正常回归不带任何历史采集开关：

```sh
npm run test:run -- src/store/gameStore.ceuM03.test.ts src/store/gameStore.ceuM01.test.ts src/store/gameStore.ceuM02R1.test.ts src/store/gameStore.ceuS0Baseline.test.ts src/store/gameStore.v1ClubWorkflows.test.ts src/store/gameStore.test.ts src/store/gameStore.ceuT01.test.ts src/store/gameStore.trainingPlan.test.ts src/persistence/__tests__/save.test.ts src/engine/__tests__/transfers.test.ts src/engine/__tests__/ceuMarketPolicy.test.ts src/engine/__tests__/ceuMarketPoolConnection.test.ts src/app/careerNavigation.test.ts src/screens/__tests__/PlayerScreen.test.ts src/ui/trainingPlanView.test.ts
npm run test:run
npm run typecheck
npm run build
```

首次输出用CEU_M03_EVIDENCE=1、后补独立文件用CEU_M03_EXTRA_EVIDENCE=1；wx确保已有证据不可覆盖，日常不设置。页面重验需把脚本E改成M-03下新建的独占子目录，保留B指向冻结来源，不删除已有文件来重开采集。

初轮测试/类型失败与修正：报告自身没有windowIndex，改取history；最小兼容状态没有history时沿原结束phase与空标记，不进行旧回看推断；旧缺陷断言改为获批目标；原始envelope加载规范化写入与偏好保存写入分开统计。相关日志原样保留，未放宽完整Player/报价/状态比较。技能与工具只用于本批局部前端检查，不扩展产品范围。

## 停止点

真实手机、Safari/Firefox、线上、旧客户端读取v12未执行。模拟视口及独立Chromium不能代表真实设备。未执行M-04综合市场验收或F/Q/R，没有宣布市场专项整体完成。报告结束页/退役/国家队流程保持，主包警告保留。验证完成后已停止本批独立本地开发服务。

**唯一下一动作：用户转交Codex审核ASTRA-M03。**
