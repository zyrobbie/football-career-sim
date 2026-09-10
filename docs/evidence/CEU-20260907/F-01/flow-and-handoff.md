# F-01 当前流程 → 批准目标及F-02交接

2026-09-08。只做设计/基线；F-02未开始。以文档34、25的D-F1及当前未提交工作树为准。W=game.windowIndex，H=history最后条目的windowIndex；报告对象没有窗口字段。cash均指cashEuro。

## 字段变化与计数约定

A：已结算事实不变，即history（含前缀）、cashEuro、lastReport、careerEventHistory、nationalTeam均不变。转移只改phase及明确的计划/市场字段。B：训练模拟允许新增恰好1条history、收入/支出、状态、报告及国家队当窗记录；事件选择已发生的效果不重复。C：退出国家队仅retired=true/currentRole=null，其他国家队记录与A其余事实不变。D：签约只改合同、球队、角色/融入及transferDecision；到队费用按选项，NONE无支出，不产生新半年history/报告/国家队记录。

点击数为报告可见后到下一实质决定，刷新/登录“继续生涯”不计入产品路径，另记验证操作。退役确认、报价选择/谈判、STAY/续约确认及到队均保留，不计作可删除冗余。

## 当前 → 目标总表

| 案例/输入及条件 | 当前页面/动作与实际目标 | 允许变化/保存恢复 | 当前→目标主动操作 | F-02职责与证据 |
| --- | --- | --- | --- | --- |
| youth-2，REPORT W=H=2，无合同 | 进入下一半年/advanceAfterReport→PLAN W3 | A，清训练/事件选择；重载不模拟 | 1→1 | 保持青训；results-final-r2 |
| youth-4，REPORT W=H=3，4条history，无合同 | 结束青训第二年→DASHBOARD→openProfessionalContract→OFFER→accept→COMPLETE→start→PLAN W4 | A；首次合同生成/接受允许合同和角色变化；首次推进仅最后+1 | 2→2到首合同；到计划4→4 | 不扩展青训合并；构造报告，结果记录公开动作 |
| ordinary/old-stage，REPORT或旧STAGE W=H=4，合同7，无正式机会；首职业窗 | 结束这半年→STAGE，进入下一职业半年→PLAN W5；次要复查 | A；报告到结束0，进入计划+1；清旧市场与训练选择 | 报告2→1，旧结束1→1 | 去掉必经结束页，保留首职业报告内容；两视口实页 |
| opportunity，REPORT W=H=5，10场7.5分，合同有效 | 报告→STAGE→查看报价/open→MARKET W6 | A；首次生成报价/默认STAY，+1一次 | 2→1到去留决定 | professionalNextAction直接市场，完整现队排除/报价参数不改 |
| expiry，STAGE W=H=11，合同0，可签 | 页面处理合同到期→MARKET W12；continue拒绝；无普通STAY | A；续约1另计＋外部0–3；新报价一次+1 | 从构造报告2→1；已有结束1→1 | 两主尺寸实页；R1/M03七raw后继复用；续约必须confirm |
| breach-no-opportunity，REPORT W=H=4，连续失约2，无正式机会 | 主申请→强制失约市场；次“继续留队半年”→PLAN W5 | A；两分支最多+1一次 | 报告至分流当前1；选留队后总2→目标报告直接提供分流，留队1 | 目标无机会直接计划；本批只验证继续分支，申请另用breach-request |
| K09-breach-opportunity，REPORT W=H=5，连续失约2且有正式机会 | 主申请有效；次“继续留队半年”实际报“这半年已经有正式转会机会，请先决定去留”，仍STAGE | A，无报价生成/W不变；错误不写档 | 当前2次后拒绝；目标留队1次到MARKET/STAY，仍需确认 | K-09具体缺陷，结果+390真实点击；不把拒绝当未来正确性 |
| 已生成市场 W=H+1，空/非空/到期，selection非null，无decision | 直接MARKET；旧REPORT/STAGE经restoreMarketContext恢复MARKET；回看只读 | A，完整报价/顺序/谈判/选择不变，0推进 | 恢复自动0；回看返回1→1 | **M-03已完成**，禁止重新抽取；15raw/14旧phase本批定向复跑 |
| 已签约后继 W=H+1，有decision | TRANSFER且arrival null→ARRIVAL；否则COMPLETE；完成→PLAN W不变 | D；下一计划清旧报价/训练选择；重复确认不重复签约 | 保留到队/完成各1；STAY仍确认+完成 | **M-03已完成**，复用marketContext，不按W=H重开 |
| optional-cancel/confirm，STAGE W=H=52，39岁 | 次退役→DECISION VOLUNTARY；确认→RETIRED，取消固定STAGE | A，0推进；取消reason=null；重载决定保留 | 报告至确认页2→1（次入口）；确认/取消各1保留 | 新入口来自报告时取消应回原报告；旧结束来源仍回旧结束 |
| young-retire-denied W4/15岁 | UI无退役，store拒绝 | A/0；年龄纯表另验 | 无合法入口→保持 | 不因合并扩大年龄资格 |
| mandatory-55 W=H=55，40岁冬结束 | REPORT→STAGE→退役决定AGE_LIMIT；无取消，仅确认 | A/0；不可推进56或开市 | 2→1到确认；确认1保留 | 强制优先；国家队次入口不应出现 |
| late-expiry-53/54，W=H=53/54，合同0，余2/1窗 | REPORT advance直达AGE_LIMIT；旧STAGE save/load规范化为DECISION | A/0；不能续约或STAY；取消拒绝 | 报告1→1；旧结束恢复0 | save.ts1038已兼容；不能从open分支先拒绝就声称旧档卡住 |
| last-valid-53/54，合同1，39冬/40夏 | 无新市场，REPORT→STAGE→PLAN W+1；W55为强制边界 | A；不改合同年限，不提前退役 | 2→1 | 同一优先级区分有效合同和到期 |
| national-confirm，STAGE W52，≥30、caps>0、未退出 | 次退出→浏览器不可撤回确认；取消无操作；确认C；俱乐部继续PLAN W53 | C/0；重复退出拒绝；保存后永久；俱乐部推进另A/+1 | 报告到确认2→1；确认1保留 | 390真实取消/接受/刷新/继续，保留文案与确认 |
| national-no-caps/already/young | UI无入口，store拒绝 | A/0，合法构造经save/load | 不可用→保持 | 三资格反例；不通过修改caps而留矛盾history制造假档 |
| national-mandatory-store，W55、caps>0 | UI因mandatory隐藏，store只查年龄/caps/retired/phase，仍接受直接退出 | C/0；不是重结算 | 页面无可用按钮；陈旧store回调缺守卫 | 交F-02统一判定覆盖，禁止强制退役上下文退出；本批不修 |
| SPECIAL_EVENT_RESULT W4/H3 | load/continueCareer原样；“继续这半年”→READY自动模拟→REPORT W4/H4 | B，事件已记不重复；重复continueAfterCareerEvent不再模拟 | 事件结果1→1，不可被报告动作越过 | 原raw直接load，定向结果；不改事件路线 |
| READY_attack（原v11瞬态）W/H记录见结果 | loadGame只读迁移；continueCareer首次runReadySimulation→REPORT；再次continue不重算 | B一次，之后全字段稳定 | 恢复自动0，不计用户点击 | 原raw独立Storage；不得把READY与已结算报告同一断言 |
| 只读回看/导航 | isReviewingReport非持久，App只读报告/返回；不改phase | A/0；刷新清视图，不重模拟 | 返回1→1 | M-03已完成；F-02只复用，不退回持久化phase旧做法 |

年龄：13+floor(W/2)。W34–39对应30–32两季可选；33–36岁夏窗40/42/44/46不可、冬窗41/43/45/47可；37+可；W55强制。新合同按下一窗口年龄<40，即W53开始不再开市；末期到期只有W53/54（剩余2/1），W55由强制分支。纯函数有限12行表是边界证据，不冒称每个年龄实页。

## 源码定位（本批工作树）

- HalfYearReportScreen.tsx:199：唯一主按钮，readOnly返回；当前职业报告调用advanceAfterReport。
- ProfessionalStageCompleteScreen.tsx:15/69/95/163/205/223/232：国家队确认、机会与年龄资格、主次按钮优先、失约留队、自愿退役/国家队。
- gameStore.ts:395/560/695/708/743/825/845/862/955/1008/1080/1189/1220/1241/1262/1279/1292：恢复、训练、事件、报告、回看、合同、开市、继续、签约、到队、退役及国家队。
- marketContext.ts:4/9/29：H及W=H+1恢复，未开市场判定；careerTime.ts:13–68：年龄、退役/合同终点。
- persistence/save.ts:1038：末期到期旧结束页规范化；RetirementScreen.tsx:326–360：确认与自愿取消；App.tsx:43–99：导航/只读/各阶段渲染。
- transfers.ts:111：正式机会cadence与表现门槛，F不改其计算；TransferWindowScreen.tsx:124/238/303/321/425：到队、完成、STAY、续约和确认。

## F-02最小实现交接（仅设计）

1. 新增共享`professionalNextAction`纯判定（建议src/store/professionalNextAction.ts）。输入完整GameState，先复用restoreMarketContext识别旧已处理上下文；再判断pending事件、W/H/合同/年龄。输出主动作、合法次动作、禁用原因及是否真正推进。顺序固定：已处理恢复→强制/末期到期→到期→连续失约→正式机会→普通计划。页面和store共用，不能各抄条件。
2. gameStore.ts新增受控`advanceProfessionalReport(action, expectedWindowIndex)`。仅当真实REPORT或旧STAGE、W=H、合同/player/现队存在、无pending事件、非只读且expectedWindow匹配时允许新推进。处理前重新判定动作；纯转移计算next，一次commit。禁止“commit结束页→再调用openTransferWindow/continueProfessionalCareer”的双写。内部复用市场生成/清计划逻辑，不调用旧公开动作串接。恢复已有市场只复用，无新生成/W+1。
3. HalfYearReportScreen渲染共享主次动作及生效说明；普通直接计划；市场/合同直达实质去留；退役/国家队保留确认。ProfessionalStageCompleteScreen保留为旧档兼容入口，消费同一模型，不能自动推进或重新模拟。TransferWindowScreen的选择、谈判、确认/到队保持原职责。App维持现有只读层，只做必要接线，禁止提前改全站导航或样式。
4. 失约“留队”：有正式机会一次生成MARKET且默认STAY，用户仍须确认；无正式机会直接PLAN；到期绝不能STAY。没有“跳过有效报价”或自动签约。
5. 退役取消来源建议采用**不新增持久字段**方案：新报告上的自愿退役确认作为非持久受控视图，原game保持REPORT；取消/刷新返回原REPORT；确认时一次commit RETIRED/VOLUNTARY。旧已持久RETIREMENT_DECISION保持现有兼容并取消回STAGE。此方案可明确区分新报告与旧结束来源，不伪造历史来源；需统筹认可具体UI接线。若要求刷新后仍保留新确认页且精确原来源，现有phase/reason无法同时表达两来源，届时先提交最小持久字段提议，不猜来源、不自行升级版本。
6. 必要守卫：advance的phase/W/H/expected/只读；chooseTraining当前仅检查game存在，F-02应限PLAN并校验预期窗口，防陈旧训练回调；事件结果继续只允RESULT（已有）；市场confirm/到队/完成现有守卫保留；国家队动作按共享合法次入口，强制退役禁止；退休确认/取消校验当前来源与phase。不扩大首合同流程重构。

## F-02断言 / F-03页面验证清单

- 普通/首职业报告一次commit到PLAN，W+1，A不变；双击及旧expectedWindow回调不再写盘/发薪/history；旧STAGE同语义仍可用。
- 正式/到期/失约各一次commit到对应MARKET，外部0–3与续约契约不变；重复不生成，比较完整报价/选择/谈判。失约无机会留队直接PLAN，有机会留队MARKET/STAY，必须再确认。
- W53/54到期退役、有效合同继续、W55强制；自愿资格/取消/刷新来源；强制不能取消/退出国家队。国家队确认false零变化，true只C，俱乐部可继续。
- 旧15raw/14旧phase复用；REPORT W=H与market W=H+1分离；READY首次恰好B一次，事件结果不自动B，待事件不可推进。不要放宽旧数值/覆盖冻结输入。
- F-03在两主视口重新计数：普通2→1、正式/到期2→1、失约两条分流、确认/取消、双击、导航/刷新/陈旧回调；真实按钮中心命中和保存后继，不能仅spy证明结算安全。真实手机仍单列。

当前M-03已完成：只读回看不改phase、旧市场/签约恢复、报价不重抽、市场动作phase守卫。F-02待做：报告分流合并、共享判定/单提交、K-09、退役返回来源、国家队及训练陈旧动作相关守卫。F-01不实现上述代码。没有证据要求更改训练/市场规则或迁移版本。
