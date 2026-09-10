# CEU-20260907 最小实施方案（S0-03）

2026-09-07，ASTRA-S0-R1 修订；状态：**统筹技术审核通过，产品规则已获用户确认**。2026-09-07用户确认文档25并授权T-01；本批仅补采与基线，不含生产功能修改。实测基线与夹具见 [S0 证据](evidence/CEU-20260907/S0/README.md)，主台账见 [文档 20](20-career-experience-upgrade-plan.md)。本方案只提交一套首选规则，参数均为待开发验证的产品建议，不是修复后实测结果。

## 1. T：适龄训练

### 1.1 当前事实与分龄选项

当前 TrainingPlanScreen 不按年龄筛选：所有年龄均显示进攻、防守、身体、心理、均衡、适应六项，默认 physical。职业阶段只把“适应青训”换为“适应职业队”。职业策略另有 PUSH／STEADY／TEAM_FIRST。职业一线队 ADAPTATION 有倍率 0.9 和结算心理加 4，不能把它与五项普通训练一起称为完全无效。

当前成长池：13–15 为 7.5，16–18 为 6.5，19–21 为 5.5，22–24 为 4.5，25–27 为 2.8，28–30 为 1.4，31–33 为 0.8，34 起为 0。31 起 physical 不正常成长；34–36 mental 另有随机 0–0.1。衰退向量按 attack/defense/physical/mental：31–33 为 0/0/0.4/0；34–36 为 0.15/0.1/0.7/0；37 起为 0.4/0.3/1.1/0.1。当前管理系数 clamp(1.5−fitness×0.007, 0.8, 1.5)。这些均保留。

建议可见集合与默认项（年龄使用 playerAgeAtWindow，在本窗口开始时确定）：

| 年龄 | 显示选项 | 默认 |
| --- | --- | --- |
| 13–30 | 原六项、原名、原效果全部保留 | physical，保持当前行为 |
| 31–33 | 重点练进攻、重点练防守、重点练心理、均衡训练、身体维护、心理调适 | BODY_CARE |
| 34–36 | 身体维护、比赛状态、心理调适 | BODY_CARE |
| 37–40 | 身体维护、比赛状态、心理调适；说明衰退加快，不暗示还能正常成长 | BODY_CARE |

不新增必填决策组；职业策略原三项继续负责角色争取、关系和投入，训练负责训练分配／维护目标。

### 1.2 每项具体规则

所有变化作用于本次模拟一次；状态钳制 0–100，能力保留现有潜力上限与 20 下限。以下“收益”是训练直接作用，不是承诺报告最终净增长或赢球。成本也钳制于 0，不产生负状态。

| 选项／枚举 | 条件、输入 | 具体作用与代价 | 上限及报告用语 |
| --- | --- | --- | --- |
| 重点练进攻 attack | ≤33；位置权重、年龄、潜力差、质量、出场分钟、随机流 | 保留 weight×0.75 + 目标0.25 的份额；代价为挤占其他份额 | 不越潜力；“本期侧重进攻，实际变化见能力项”；31 起提醒身体不会正常成长 |
| 重点练防守 defense | ≤33，同上 | 同一公式，目标 defense | 同上，换为防守 |
| 重点练心理 mental | ≤33，同上 | 同一公式，目标 mental；不等于 morale | 同上，换为判断与专注能力 |
| 重点练身体 physical | ≤30，同上 | 原公式与训练成本保持 | 原文案与报告不变 |
| 均衡训练 BALANCED | ≤33，位置权重等 | 保留位置份额，无专项加成；代价为放弃专项集中 | 成长上限保持；31–33 显示“按位置分配，身体以自然维护为主” |
| 适应 ADAPTATION | ≤30 | 保留现有倍率0.9、结算心理+4等原路径；不为统一老将修改青年或年轻职业数值 | 原限幅、报告保留 |
| 身体维护 BODY_CARE | ≥31；准备后 fitness/form、衰退向量 | 比赛前 fitness增加 min(4,max(0,95−fitness))，form−2；physical 的本期衰退额×0.8；不加能力成长 | 身体额外恢复最多4、训练不把fitness抬过95；衰退至少保留80%（20下限除外）；“身体维护：训练准备身体+X、竞技−Y，身体衰退减缓Z” |
| 比赛状态 MATCH_SHARPNESS | ≥34；准备后form/fitness | 比赛前 form增加 min(4,max(0,95−form))，fitness−3；无额外成长或衰退豁免 | 最多4、训练不把form抬过95；“比赛准备：竞技+X、身体−Y；能力仍随年龄变化” |
| 心理调适 MENTAL_RESET | ≥31；准备后morale/form | 比赛前 morale增加 min(4,max(0,95−morale))，form−2；不提升 mental 能力 | 最多4、训练不把morale抬过95；“心理调适：心理状态+X、竞技−Y” |

若比赛状态／心理调适的目标状态已≥95，禁用并说明“已接近上限，请选择另一计划”；旧档已选择仍允许恢复，按实际0收益及实际成本解释，不能卡档。身体维护高fitness仍有衰退减缓，不禁用。能力达到潜力时不显示隐藏潜力值，只提示“近期这项能力成长空间有限”。老将不把三种维护的焦点份额交给旧 attributeKeys 索引；共享解析器明确给出位置份额，31–33 的新维护使用 ADAPTATION 同等的0.9成长倍率作为训练时间代价，34以后不制造新成长池。

### 1.3 顺序与叠加契约

```text
chooseTraining：保存选择 → 特殊事件选择并持久化即时效果
→ continueAfterCareerEvent / runReadySimulation
→ 消费已到期延迟后果（trainingQualityBonus沿现有规则累加）
→ 检查任一状态<46
   是：沿用低状态自动恢复（form+7 / fitness+10 / morale+8，仅低于46的项）；
       跳过职业策略和全部新增维护收益、成本、减衰退，报告说明“本期恢复优先”
   否：沿用职业策略（PUSH负荷、STEADY稳定、TEAM_FIRST关系）
       → 记录此刻fitness为本期衰退管理输入
       → 应用且仅应用一次维护准备收益和成本
→ 比赛与伤病 → 训练质量、分钟经验、正常成长及晚期心理微增
→ 年龄衰退（基准fitness管理系数；BODY_CARE仅身体衰退×0.8）
→ 现有比赛状态结算（老将MENTAL_RESET不再叠加旧ADAPTATION结算+4）
→ 国家队与其现有效果 → 写报告、历史、收入并保存
```

年轻路径保持原执行顺序、随机调用数和分支；上图新增步骤仅 age≥31 生效。衰退管理使用维护前fitness，避免身体准备+4与直接减衰退重复放大同一收益。事件／延迟后果仍按现有规则影响准备前状态；新增维护不重复消费 trainingQualityBonus，也不把事件的实际增益再次写回球员。报告 eventSummary 的固定“本期训练”段记录此次实际准备增量、实际减缓量，states/attributes仍记录整窗净变化，二者文案分清；旧报告不补算。

### 1.4 参数依据与待验证边界

+4 选择与现有自动恢复+7/+10/+8相比更小；BODY_CARE的form−2、MATCH_SHARPNESS的fitness−3与STEADY +2／PUSH −3处于同一量级。身体减衰退20%保留大部分老化。以准备前fitness=81为例，管理系数0.933，单独身体维护节省：31–33约0.075、34–36约0.131、37以后约0.205点/半年（四舍五入前）。这是公式算例，**不是成对模拟结果**；最终0.1精度可能掩盖某窗差异，不据此承诺每窗能力必然不同。

T-01/T-02分两组：代表性分布采用ST/CM/CB、35岁、三状态80、能力70/潜力90，使用100种子 `ceu-training-0..99`逐选项配对；边界组只用固定种子ceu-training-0，覆盖三位置与30/31/33/34/36/37/39岁，再逐一改变单项状态至45/46/95/100及能力=潜力，另列恢复/事件组合。不把全部状态、年龄、种子做巨大笛卡尔积。验收：直接准备收益/成本和衰退额度严格符合公式；适用且未饱和每项至少一个直接效果不同；低状态仅自动恢复；BODY_CARE衰退比率0.8且未归零；不要求比赛结果每次改善。13–30以相同输入逐字段对照原引擎，Player/stats完全相同。100种子统计均值、最小最大、胜负差异作为平衡审核材料，不事后改阈值伪造通过。

### 1.5 SR-01：稳定报告承载

首选复用现有必填字符串 `HalfYearReport.eventSummary`，不新增报告字段，不扩大hints上限。引擎生成报告时，把原preparation.summary和一个以“本期训练：”开头的段落拼为一个字符串；内容来自本次真实计算返回值，包括规范化计划名、实际状态增量/成本、身体衰退减缓量，或“自动恢复优先，计划X的维护收益与成本本期均未执行”，饱和时明确实际收益0。不得从净属性变化反推维护收益。

真实链路：simulateProfessionalHalfYear.ts的simulateFirstTeamHalfYear构造eventSummary → attachContractReport → gameStore.ts的runReadySimulation调用attachCareerEventToReport → attachNationalTeamToReport → commit lastReport → saveGame。后三个组装函数保留eventSummary；simulateHalfYear.ts的报告组装亦通过同一摘要格式器接入适龄分支，年轻原摘要不变。HalfYearReportScreen.tsx现有event-summary段落完整渲染该字符串；需要分段时按换行渲染/局部white-space处理，不设行数截断。特殊事件仍在specialEvent中独立保存和展示，不覆盖训练段。

旧报告没有“本期训练”段时直接显示旧eventSummary，不补算、不插入推测性维护解释；新报告保存后回看使用保存字符串。未来真实组装链测试同时触发国家队hint、现金上限hint、合同hint，断言最终lastReport与保存重载后的eventSummary包含实际维护/恢复原因；再验收页面可见且不被截断，不能只测格式器。

### 1.6 SR-02：选择前预判与最终恢复

UI仅在HALF_YEAR_PLAN读取当前持久化player三状态（事件前、延迟后果消费前）。age≥31且任一<46：展示唯一“本期先恢复”说明，不呈现可点击的三种维护收益卡；职业策略同样标为本期自动恢复优先、不要求再选。按钮“按恢复安排开始这半年”，使用BODY_CARE和STEADY作为内部确定默认值，不新增恢复枚举/资源；说明“暂记身体维护计划，是否执行以事件后状态为准”。31–33仍说明常规成长继续按现有规则计算，不承诺维护加成。若进入页面已有待选值，显示“原计划X，当前预计被恢复覆盖”，不要求重选。≤30页面与行为保持既有规则。

当前状态正常时显示适龄计划和成本；目标≥95的饱和项按1.2禁用，预判仅针对当前值。职业策略选择不会即时修改player；UI可用纯预览显示策略的预计状态变化，但不能据预览持久化恢复标志。

最终判断只在本期模拟入口、即时事件已保存且consumeCareerConsequences完成后、职业策略执行前，以同一组三状态<46判断一次。这是权威判定：事件或延迟后果使状态跌破阈值则覆盖维护与策略；若它们先把低状态治好，实际执行已保存的默认/原计划并按实际记录，不声称仍强制恢复。无需保存“选择时是否低状态”字段，报告写可验证原因如“结算准备时身体43，触发自动恢复”，并引用现有specialEvent/consequenceSummaries，不猜测哪项是唯一病因。

职业策略改变状态发生在判定之后，例如fitness46选择PUSH降至43，本期不再次触发自动恢复，维护仍执行；UI明确成本，不把同一次策略成本返还为自动恢复。下一窗口按届时状态重新判断。旧档已选饱和计划或被覆盖计划仍继续；SPECIAL_EVENT_RESULT不重做事件，最终计算如实说明0收益或覆盖。

未来用例：选择时45只有恢复入口；46正常可选且PUSH之后43不追加恢复；事件/延迟后果令正常值变45触发覆盖；事件令原45恢复到≥46执行已存计划；饱和旧选项可继续。分别验证UI所见时点、模拟判定时点及最终摘要，不能只靠事后文案。

## 2. M：当前求职方向与稳定市场

2026-09-08实施状态注：本节原方案措辞保留历史时点。M-02/R1及M-03已由文档32/33验收，资格/组合、稀缺保存、职业期updateCareerPreferences及防重抽均已实现；下文“当前无/缺少/未来断言”描述方案提出时，而非当前工作树。救济触发依文档30释义：FRINGE，或SUBSTITUTE且≤5场。M-04仅综合验收，结果见docs/21市场总表，不改变规则。

### 2.1 入口、字段及生效

当前入口只有 src/screens/CreationScreen.tsx 内的 PreferencesStep → submitPreferences；该动作会更新 draft 并重新 generatePlayer，**禁止在职业阶段复用**。当前无职业期偏好修改动作。draft保留开局档案；player.overseasIntent / preferredLeagues定义为当前方向，player.priorities／priorityValues保持原值，本批不扩展职业优先级编辑。

建议在 TrainingPlanScreen 和 TransferWindowScreen 放一个非必填“求职方向”入口，共用小编辑器，仍用 STRONG（优先海外）／CONDITIONAL（综合考虑）／DOMESTIC（优先国内）及最多3个现有联赛。新增 updateCareerPreferences(intent, leagues)，仅职业合同存在、非退役、非SIMULATION_READY/事件处理中允许；保存仅更新player这两个字段，不改phase/windowIndex/seed/draft/报告/报价。DOMESTIC清空当前preferredLeagues，联赛去重并验证现有合法值。

按钮“保存求职方向”；未生成市场提示“用于下一次生成的报价；不会立即开启市场”；已有报价提示“本次报价和谈判保持不变，下次市场生效”。编辑器未保存只在本地表单，取消/刷新丢弃；保存后刷新保留。连续保存相同值为无操作，反复改动只保存最后一次值，不生成报价或消耗随机流。player页展示“当前求职方向”，开局档案来自draft；历史选择不追溯变化。

### 2.2 资格 → 组合 → 固定种子

| 路径 | 资格规则 | 报价组合 | 抽取与不足回退 |
| --- | --- | --- | --- |
| 常规成人 | 去掉偏好对国内资格的硬限制：OVR≥85为一级且平台≤3，或中国一级平台4（无论intent）；80–84为一级且平台≤4（所有国家）；74–79、66–73、<66保留原档；排除当前队，年龄/可签约限制保持 | 外部最多3。DOMESTIC先国内2槽再开放1槽；CONDITIONAL在国内海外均有合格候选时各1槽，再开放1槽；STRONG先第一偏好联赛1槽、其他海外1槽，再开放1槽；OVR≥85且STRONG时先保留原有两份高平台海外目标，余槽开放 | 同现有权重 interest×0.65 + fit×0.35、首偏好×1.28和rotation；每槽独立固定namespace；先该槽池，再同地区其他合格队，再全体合格剩余队；无队则少于3，不重复、不造队 |
| 到期 | 复用成人外部资格（青年仍沿原年龄规则），并保留现队续约资格／不能40岁新签约 | 续约1另计，外部0–3份FREE_TRANSFER；总数≤4，费用0 | 外部复用常规组合，续约仍用当前固定续约种子；先保留续约，绝不整体slice(0,3) |
| 海外豪门低出场救济 | 保留现有触发：海外tier≤2，一线队FRINGE或SUBSTITUTE且出场≤5；候选必须承诺一线队且角色改善；不套高OVR常规平台门槛而排除低级别机会 | 保留五大联赛较低平台1、发展联赛1、国内ELITE1；总外部≤3。DOMESTIC先抽国内槽，其他方向顺序沿旧规则 | 同槽加权，槽不足回退到其他角色改善队，再不足就少给；不回退到角色更差队。偏好仅影响权重及顺序，不能取消角色改善门槛 |

未满18仍仅国内实际转会，16–17海外关注不变；不调整市场开放节奏和表现门槛。固定候选目录顺序、稳定id及每槽namespace，候选去重；不新增一次性刷新或搜索球队。偏好并非签约权利，候选不足或市场未开放时没有回国保证。

预先验收阈值：沿 E-03 100种子，CONDITIONAL合格国内/海外都有时100个窗口各至少1份国内、1份海外；DOMESTIC有≥2合格国内时每窗至少2份国内；STRONG要求国内进资格池、开放槽能通过控制随机值选中，100种子记录分布但不设置国内必出数。OVR79/80/84/85、境内/境外、三个intent、年龄17/18/33/37/40交叉测试；续约≤4外部≤3；救济每份角色严格改善。此为未来断言，当前300份国内0的旧缺陷测试在M开发时改成对应新断言，旧JSON证据不删除。

### 2.3 不重抽的最小修补

已生成指 TRANSFER_WINDOW 的 transferOffers 已保存，包括 withdrawn/counterUsed/counterDirection/negotiationSucceeded/message 及选择。非空报价只能复用；到期路径也要先复用再判断生成，当前openTransferWindow的“到期优先生成”分支不能直接沿用。禁止从市场用goToPhase/reviewReport回到结算阶段再进入；回看使用只读视图。空市场属于一次生成完毕：以TRANSFER_WINDOW的phase表示已生成（即使数组空），不能把数组空等同从未生成。下一计划清空旧报价仍沿原协议，新的生成只从未处理的结算上下文触发。

测试保存后连续修改三次、刷新/加载、反复打开编辑器、谈判成功/失败/撤回、到期续约均逐字段比对原报价及谈判。存档恢复不能重跑已完成市场。当前缺少独立市场窗口ID，本方案依靠phase及最后一条history.windowIndex守卫；若开发中证明旧合法档无法区分，停止交统筹补D-C1，不用猜测补id。

## 3. F：报告直接承载下一步

完整旧流程表与代码定位见 [流程基线](evidence/CEU-20260907/S0/flow-baseline.md)。建议共享纯函数 professionalNextAction(game) 产出按钮与动作类型，页面和store都消费；不要在两个页面复制条件。普通职业报告点击从2次降为1次；签合同、选择报价、退役确认保留。

| 场景／前置 | 旧链路 | 新报告主按钮→目标phase | 次要入口 | 推进时间 |
| --- | --- | --- | --- | --- |
| 青训未满4窗 | 报告→计划 | 保持“进入下一半年”→HALF_YEAR_PLAN | 只读回顾 | +1 |
| 第4青训窗 | 报告→CAREER_DASHBOARD→首份合同 | 保留原链路（不在此次职业结束页合并范围） | 原入口 | 本次报告不+1 |
| 普通职业窗，合同有效、无正式机会 | 报告→结束页→计划 | “进入下一职业半年”→HALF_YEAR_PLAN | 可用时退休/退出国家队 | +1 |
| 有正式机会/已生成报价 | 报告→结束页→市场 | “查看转会报价”→TRANSFER_WINDOW | 市场保留STAY | 首次生成+1，恢复已生成0 |
| 合同到期且可新签 | 报告→结束页→到期市场 | “处理合同到期”→TRANSFER_WINDOW | 续约及自由合同；无STAY | 首次+1；签约/完成转会不再+1 |
| 连续失约≥2，合同有效且市场可开 | 报告→结束页→申请市场 | “提出转会申请”→TRANSFER_WINDOW | “继续留队半年”；若同时有正式机会转市场并选中STAY，需确认；否则直接计划 | 两路径均至多+1 |
| 已选继续留队 | 市场确认→TRANSFER_STAGE_COMPLETE→计划 | 保持确认与完成转会路径，本批只省职业结束页 | 已生成结果只读 | 市场已+1，后续0 |
| 30–32；33–36冬窗；37+可自愿退役 | 报告→结束页→退役决定 | 按主场景按钮，次要“踢完这半年后退役”→RETIREMENT_DECISION | 确认；取消回同一职业报告/旧结束上下文 | 0 |
| 最终窗55强制退役 | 报告→结束页→退役决定 | “走向退役时刻”→RETIREMENT_DECISION | 复查只读；不可取消 | 0 |
| 39/40末期到期（剩余生涯≤2窗） | advanceAfterReport已直达退役决定 | 保持直达、AGE_LIMIT | 只读报告 | 0 |
| 最后一年合同仍有效、不可开市场 | 报告→结束页→计划 | “进入下一职业半年”→HALF_YEAR_PLAN，最终窗除外 | 合法退役入口 | +1 |
| ≥30、国家队caps>0、尚未退出、非强制退役 | 结束页确认退出 | 报告次要“退出中国国家队”，保留原不可撤回确认 | 不影响俱乐部继续 | 0，保留报告phase |
| 回看报告/切球员履历页 | reviewReport修改phase；导航自身只读 | 独立只读展示，仅“返回当前进度”，不显示推进按钮 | 返回原视图 | 0 |

优先级：已处理上下文只读/恢复 → 强制或末期到期退役 → 合同到期 → 连续失约 → 正式机会 → 普通下一计划。自愿退役为次要动作，不抢主按钮。取消自愿退役需回有效结算上下文；旧PRO_STAGE_COMPLETE继续显示兼容页并使用同一按钮判断，不自动推进或重新模拟。

### 防重复与窗口语义

新增 advanceProfessionalReport(action, expectedWindowIndex)，与原动作共享内部纯状态转移，不采用“先commit结束页，再调用旧动作”的双写拼接。提交前检查phase为HALF_YEAR_REPORT或PRO_STAGE_COMPLETE、history最后窗口等于当前已结算窗口、contract存在。预期windowIndex匹配且动作在当前条件允许才执行。市场已有报价的兼容恢复是独立分支，当前windowIndex可以是最后history+1；不把它再当已结算窗口。

普通继续一次commit设置计划/+1/清选择；市场一次commit保存报价/+1；第二次调用因phase或expectedWindow不匹配无操作。退役/国家队退出不推进、不模拟。给advanceAfterReport的青训路径也增加phase和已结算窗口守卫；chooseTraining仅允许HALF_YEAR_PLAN，避免陈旧按钮重复模拟；reviewReport改只读呈现，不再伪造phase。goToPhase的职业流程入口需收紧至合法导航，不能成为绕过守卫的后门（只改相关调用，不重构全站）。

刷新仍由continueCareer恢复：SPECIAL_EVENT_RESULT只展示已结算事件，点击继续才模拟；SIMULATION_READY沿已有恢复继续；报告/市场/结束页均不模拟。验收每条上述路径的双击、模拟陈旧回调、保存/加载与回看；比较cash/history/stats/国家队历史/事件记录，确认只有一次结算。将最后结算窗口和当前市场窗口分开判断，严禁统一写windowIndex+1。

## 4. 共享契约与待审核决定

| 决策 | 首选答案 | 状态 |
| --- | --- | --- |
| D-T1 | ≤30原六项；31–33以身体维护/心理调适替换身体/适应；34起三种维护，默认身体维护 | 用户已确认；2026-09-07，文档25 |
| D-T2 | +4状态、−2竞技或−3身体成本；BODY_CARE身体衰退×0.8；低状态优先且不叠加维护；先配对模拟再批准参数 | 用户已确认；2026-09-07，文档25 |
| D-M1 | draft开局；player当前；独立updateCareerPreferences，只更新两个字段 | 用户已确认；2026-09-07，文档25 |
| D-M2 | 成人国内资格去偏好硬限制；CONDITIONAL两地各一槽，外部≤3，续约另计≤4；保留救济角色改善 | 用户已确认；2026-09-07，文档25 |
| D-M3 | 只影响尚未生成市场，已生成报价/谈判不变；phase与结算窗口守卫阻止重抽 | 用户已确认；2026-09-07，文档25 |
| D-F1 | 报告承载分流，一次原子推进；旧结束页继续兼容；失约留队遇正式机会时转市场选STAY | 用户已确认；2026-09-07，文档25 |
| D-C1 | 开发时SAVE_VERSION/DATA_VERSION由11升12，明确新增训练枚举和当前偏好语义；历史/报告/报价不改 | 用户已确认；2026-09-07，文档25 |

**存档方案**：新增TrainingFocus枚举 BODY_CARE/MATCH_SHARPNESS/MENTAL_RESET，无新增顶层字段。迁移11→12只升级版本，保留既有trainingFocus原值、draft、player、报价及历史；运行时按当前年龄解释待模拟旧值：≤30完全旧行为；31–33 physical→BODY_CARE、ADAPTATION→MENTAL_RESET；≥34 attack/defense/BALANCED→MATCH_SHARPNESS、physical→BODY_CARE、mental/ADAPTATION→MENTAL_RESET。null仍是未选择。待结算窗口按第4.1节规范化后保存新枚举；已经结算的state焦点与历史中旧focus不映射重写。旧报告只按原数值展示，不能根据新映射声称当年执行维护。事件结果已有即时效果不再执行；未来模拟使用当前年龄别名规则。老档player偏好直接继承，不从draft覆盖当前值。

版本上涨用于明确规则及枚举边界，数据目录本身不改；SAVE_VERSION表达存档结构/枚举边界，DATA_VERSION表达规则数据兼容边界；二者不是因为当前同为11就必须一起升。现有save.ts的2至10及当前版本迁移沿用双版本递进，首选本次训练规则变化继续这一项目约定，建议12/12并分别校验；球队目录未变。该选择仍须D-C1确认。旧版本11客户端无法保证读回12，发布前必须说明备份/回退，而不是声称双向兼容。替代方案仅一项：不增枚举而复用全部旧词义，未选，因为同一枚举会在新历史里长期混淆能力训练和维护，不值得节省迁移。

### 4.1 SR-04：规范化焦点的唯一写入点

新增纯函数normalizePendingTraining(state)，仅处理未结算窗口，复用第4节年龄映射，满足N(N(s))=N(s)。由store的chooseTraining在接受新选择时调用；旧档由continueCareer在loadGame完成后、事件资格处理/runReadySimulation前调用并保存。runReadySimulation再幂等调用作为直接入口防线，得到本期canonicalState；消费延迟后果、调用引擎、最终commit的trainingFocus和新增history.trainingFocus均来自canonicalState，不能继续用闭包中原state.trainingFocus。两处职业/青年history写入一并核对。引擎接收此规范化值，不再自行采用另一套别名。

| 已保存phase | 加载后的处理 | 历史与事件 |
| --- | --- | --- |
| HALF_YEAR_PLAN，focus=null | 保留null，等用户选择；不自动模拟 | 不动 |
| HALF_YEAR_PLAN，focus非null | 规范化为本期默认选中值，用户确认后开始 | 不动 |
| SPECIAL_EVENT | 规范化focus并保存，保留pending的eventId/step/selections/variant及既有事件记录 | 继续原事件步骤，不重新选事件 |
| SPECIAL_EVENT_RESULT | 规范化focus并保存，保留已应用player/cash/事件记录与trainingQualityBonus | 不再resolveCareerEventChoice；点击继续才消费后果、模拟 |
| SIMULATION_READY | 先规范化并保存，再沿原恢复路径模拟一次 | 新history用相同规范值；加载最终报告不再模拟 |
| HALF_YEAR_REPORT、PRO_STAGE_COMPLETE、市场、退役等已结算上下文 | 不规范化旧focus，不因回看解释为新维护 | 旧history、lastReport、已生成报价不变 |

恢复覆盖不把history焦点伪写成“执行了维护”：它记录规范化的**本期计划**，eventSummary明确实际被恢复覆盖；执行引擎与history使用同一计划枚举。以前已结算history保持逐字段不变。11→12迁移本身不全局替换旧枚举；运行入口只规范化待结算状态。未来验收35岁旧attack待模拟变MATCH_SHARPNESS，新增history也为MATCH_SHARPNESS，旧history attack保留；重复加载事件结果时状态相同，事件记录数量/现金不变；报告回看不改焦点/摘要。

### 4.2 SR-03：冻结v11与迁移测试分离

S0目录为只读旧基线。现有gameStore.ceuS0Baseline.test.ts的逐字重演、硬编码11构造及两项缺陷断言只用于v11历史基线，不作为v12正确性断言。新开发批须把历史重演与当前回归套件明确分开：保留历史源码/结果用于锁定基线checkout复跑；当前套件用新规则测试替代旧缺陷断言，不无声跳过失败。当前版本测试构造用SAVE_VERSION/DATA_VERSION常量；真正的磁盘v11输入、历史工具中的11绝不机械替换。

新增迁移测试建议路径 `src/persistence/__tests__/ceuV11Migration.test.ts`（尚未创建）：直接枚举S0/fixtures磁盘envelope，先核对冻结SHA及字节数，再逐份建立全新Map localStorage和清空store，写入career_save_current，仅调用真实loadGame/continueCareer。**禁止先用v12引擎重演旧生涯。**保存加载后的v12初态，按phase采取下一个合法公开动作，必要时推进到下一报告；saveGame写v12后再loadGame/continueCareer，核验幂等、无重复结算与合法后继。每例结束清除stub/store，不让上一档成为下一档backup。

HALF_YEAR_PLAN选计划后继续；SPECIAL_EVENT_RESULT只确认既有结果；SIMULATION_READY首次continueCareer允许恰好一次模拟；报告/结束页只推进不重算；TRANSFER_WINDOW先核验全部报价及谈判字段不变再选STAY/合法报价；到期先选续约/新合同；临退按真实到期/年龄分流。所有档首先核验旧history前缀、旧lastReport、已生成结果完整保留；允许后续真实动作新增history、替换lastReport或消费已到期后果，但逐项断言变化与动作相符。事件结果加载前后不重复即时收益。再次加载最终保存状态不得新增收入/比赛/事件。v12结果和日志写 `docs/evidence/CEU-20260907/T/migration-v12/`，永不写S0。

生产修改前必须在锁定HEAD的v11环境补采：35岁HALF_YEAR_PLAN未选；35岁SPECIAL_EVENT已选attack/physical及已选路线；35岁SPECIAL_EVENT_RESULT已选attack/physical；35岁SIMULATION_READY；另加低状态及饱和旧选项各一份。公开路径优先：扩展匿名固定种子司机到window44，在选择和事件各步捕获；SIMULATION_READY用测试专用内存Storage保存钩子捕获commit(ready)写入的原始envelope（继续运行无需中断），不得手工把报告phase改回ready。若种子没遇到所需事件，使用预定有界种子ceu-v11-supplement-0..99查找并记录真实选择序列；若仍缺场景，报告缺口，不伪造已覆盖。

新增夹具另存 `docs/evidence/CEU-20260907/S0-v11-supplement/`，附独立manifest/哈希/源HEAD/命令；原七份不覆盖。低状态/饱和无法公开到达时，仅可另标“构造输入”的补充单元用例，不冒充旧生涯夹具，统筹决定是否接受缺口。补采目前**未执行**，为T-01生产修改前的门槛。

R1已关闭旧CEU_GENERATE写入开关：开启即在写文件前报错，保护所有S0原始数据，任何版本均不能覆盖。未来补采生成器须校验11/11与锁定源码基线，强制使用新目录及独占写入；新版本生成拒绝11输出目录。新迁移测试只读取冻结输入，无生成开关。

### 实际改动面（后续授权后）

| 文件 | 计划改动 |
| --- | --- |
| src/models/game.ts | 三个TrainingFocus枚举；SAVE/DATA常量12；不新增Player字段 |
| src/persistence/save.ts | 新枚举校验、11→12迁移；保留历史及旧phase；加载守卫测试 |
| src/engine/trainingPlan.ts（新） | 分龄选项、旧focus解析、收益/成本纯函数，共享给页面/引擎 |
| src/engine/simulateProfessionalHalfYear.ts、simulateHalfYear.ts、ageDevelopment.ts、trainingQuality.ts | 接入31+维护顺序及定向衰退输入；年轻保持原路径；ageCurve.ts只引用，不改表 |
| src/screens/TrainingPlanScreen.tsx、HalfYearReportScreen.tsx | 选项/默认/饱和提示；eventSummary固定训练段报告；报告动作与只读模式 |
| src/engine/transfers.ts | 资格、组合、到期与救济抽取；必要纯函数导出供直接资格测试 |
| src/store/gameStore.ts | updateCareerPreferences、advanceProfessionalReport；既有openTransferWindow/continueProfessionalCareer/retirement/chooseTraining等phase守卫与共享转移 |
| src/screens/TransferWindowScreen.tsx、PlayerScreen.tsx、新CareerPreferencesEditor.tsx | 当前方向编辑与提示、档案字段展示；开局CreationScreen.tsx的PreferencesStep不复用提交动作 |
| src/screens/ProfessionalStageCompleteScreen.tsx、src/ui/professionalNextAction.ts（新） | 兼容页复用动作判定，国家队确认复用 |
| src/app/App.tsx、必要的careerNavigation.tsx／careerView.ts | 只读报告视图与返回上下文；不把导航持久化成游戏阶段 |
| 对应engine/store/persistence/screens测试、docs/01-product-spec.md、02-data-dictionary.md、05-balance-tables.md及台账 | 同步真实行为与版本契约；完整生涯自动驾驶适配；CSS仅必要局部且验证移动端 |

## 5. 首个开发批次建议与执行交接

必须先S0-04审核七项决定，尤其维护参数与12版本兼容，再授权T开发，M/F不混入。

| 任务 | 下一批边界与验收 | 配置建议 |
| --- | --- | --- |
| T-01 | 旧年轻结果快照、七年龄×三位置配对基线、低状态/饱和矩阵；冻结种子及旧夹具，先完成4.2老将状态补采门槛，不改规则 | Astra轻度 |
| T-02 | 共享解析器、31+维护与执行顺序、版本12迁移一同落地；单窗公式/随机确定性/事件结果恢复及七夹具加载→继续→再存再读 | 迁移和恢复涉及共享状态，建议Astra中度 |
| T-03 | 分龄选项、默认与说明、实际报告eventSummary、两种屏幕代表尺寸；禁止顺手合并流程 | Astra轻度，在T-02接口稳定后 |
| T-04 | 完整T-A、全量测试/typecheck/build、旧训练枚举、13–30同输入原输出、桌面移动实页；文档与证据汇总 | Astra轻度；发现迁移/恢复失败交中度解决 |

可复制给下一执行者（**仅审核并获开发授权后使用**）：

```text
你执行《上场》CEU-20260907 的训练专项T-01至T-04，Codex统筹审核。
先检查git status、HEAD与AGENTS.md，保护README、既有outputs及S0交付；阅读docs/20的第4/5/10节与docs/23。
确认S0-04已归档七项决定及版本12规则；若仍是建议，停在统筹审核，不自行把方案当授权。
严格只做获批的训练分龄、维护参数、旧focus解释及其必要迁移；不做M转会或F流程功能。
先冻结年轻原输出和成对矩阵，再实现引擎与迁移，然后页面与报告，最后旧夹具加载继续再存再读及真实桌面移动验收。
复用S0固定种子与匿名存档，不能读取/覆盖用户浏览器生涯。S0缺陷相等断言在T修改时替换为获批差异断言，保留旧证据JSON。
低状态恢复不能叠加维护、身体维护不取消衰退、不增加年轻成长；报告写实际效果，不显示隐藏潜力。
更新主台账、参数文档和证据；未执行、失败、静态与真实页面分别记录。迁移复杂度建议中度。
完成T专项交统筹验收后停止；不自行进入M，不提交、推送或部署，除非另有明确授权。
```

## 6. ASTRA-S0-R1 统筹意见响应表

| 意见 | 修改位置 | 具体补正／未来验收 |
| --- | --- | --- |
| SR-01 | 1.3、1.5、改动面及T-03 | eventSummary稳定保存训练段；真实合同→事件→国家队组装组合测试及页面可见；旧报告不补算 |
| SR-02 | 1.6 | 当前低状态收起无效维护选择；区分UI/事件后/策略后三个时点；覆盖与饱和旧档可继续 |
| SR-03 | 4.2、T-01 | v11精确复演限旧基线；v12逐份直接读档隔离迁移；关闭S0生成写入；列明35岁补采门槛 |
| SR-04 | 4、4.1 | store入口统一规范化，canonicalState供引擎/保存/新history；分phase处理，旧历史/事件结果不改 |

其他意见：1.4分开种子分布与边界；2.1修正真实CreationScreen/PreferencesStep名称；第4节说明双版本递进是项目约定而非相等必然；原.log保留并新增等字节.txt副本，证据索引/validation更新。陈旧store动作只属接口复现，不宣称真实浏览器双击已复现。

R1交付时仅完成设计补正及旧生成器保护，未来验收用例尚未实施。2026-09-07统筹复审已通过，S0-03完成；七项D-*及参数仍待用户确认。当前以[文档25](25-s0-approval-and-training-handoff.md)的复审结论与T-01窄范围指令为准，未获得生产开发授权。

## 7. 当前确认记录

2026-09-07用户确认文档25第2节，授权向Astra轻度发送T-01。前文“待确认／待授权”为历史方案阶段措辞；当前状态以文档20和25为准。维护参数是已确认的首轮候选值，不代表平衡已验证。T-01仅补采与冻结基线，不得由此扩展为T-02至T-04整批生产开发。
