# ASTRA-T02：适龄训练、规范化与 v12 恢复

2026-09-07；状态：**待验收**。本次用户直接转交完整T-02指令授权实施，指定GPT-6 Astra中度，由用户转交Codex统筹审核。HEAD仍为 `3f290407a299790665b58c4bc7c2bf8455d24bbd`，本地未提交改动；代码save/data已为12/12。不进入T-03/M/F，不创建并行代理，不提交、推送、部署。未访问用户浏览器存档。

## 交付与规则

- `src/engine/trainingPlan.ts`：共享focus映射、位置份额、0.9训练倍率、实际维护记录及持久摘要格式器。normalizePendingTraining只处理四种未结算phase，null、已结算旧focus和history不改写。
- `src/engine/simulateHalfYear.ts`、`simulateProfessionalHalfYear.ts`、`trainingQuality.ts`、`ageDevelopment.ts`：两引擎复用维护解释；原恢复/策略先执行，恢复判定取准备输入；维护前fitness管理衰退，仅身体维护衰退×0.8；低于46跳过所有维护。年轻原顺序与随机源不变。
- `src/store/gameStore.ts`：chooseTraining、continueCareer、runReadySimulation共用规范化，runReadySimulation的局部state即规范化结果，引擎、最终保存和青年/职业新增history均来自该state。
- `src/models/game.ts`、`src/persistence/save.ts`：三个新枚举，11→12显式升级；10→11链仍显式保留。旧到期错误计划恢复规则延续到12，未改市场生成规则。
- **必要标签适配单列**：仅`src/ui/format.ts`增加三个新枚举名称，供现有报告/履历调用；未改布局、训练卡片、默认或禁用交互，不能称UI完成。
- 数据字典、平衡附录及文档20台账已同步。其他现有测试仅将当前构造态/迁移目标版本改用SAVE_VERSION/DATA_VERSION常量；不改冻结JSON的11或期望Player/stats。

## 证据入口

| 文件 | 内容 |
| --- | --- |
| [validation.json](validation.json) | 最终命令、开始/结束时间、退出码 |
| [before-hashes.json](before-hashes.json) | 本批前src/docs/outputs/README逐文件SHA |
| [protection-verification.json](protection-verification.json) | 原始证据、outputs及非授权文档一致性；原历史源码副本一致性 |
| [constructed-v11/manifest.json](constructed-v11/manifest.json) | TR-01四份**构造输入**的源SHA、全部字段差异、checksum前后值、原因与v11加载验证 |
| [tr01-v11-load.txt](tr01-v11-load.txt) | 生产仍为v11时真实loadGame通过，1文件1项 |
| [migration-results.json](migration-results.json) | 21份逐档哈希、phase合法动作、规范化、本期实际执行、前缀保护、重载结果 |
| migration-v12/*.json | 21份实际saveGame写出的最终v12 envelope，独占写入 |
| [young-comparison.json](young-comparison.json) | 冻结54输入／324输出，全输出精确相等（包括Player、stats、摘要），无其他字段差异 |
| [maintenance-pairs.json](maintenance-pairs.json) | 三位置35岁100种子共900次维护；逐次直接收益/成本/衰退及均值、范围、高平低计数 |
| [historical-v11/README.md](historical-v11/README.md) | 原v11生成/逐字复演源码、helper、隔离复跑说明与禁止覆盖保护 |
| [changed-files.json](changed-files.json)、[artifact-hashes.json](artifact-hashes.json) | 本批修改文件范围与最终产物哈希 |

`src/store/gameStore.ceuT01.test.ts`文件名保留，但当前内容已替换为21份磁盘v11直接迁移测试；每份重置模块、全新Map Storage及store。第一次loadGame只允许版本改变；第一次continue额外允许待结算focus规范化，以及READY恰好一次结算。后续合法操作允许新报告替换、消费到期后果、真实事件/市场选择及恰好一窗新增history；旧history和事件记录前缀、draft、player偏好保护。保存重载三次整个最终state相等，无重复收入/事件/history。

## TR-01实际结果

form95/100取READY_attack，morale95/100取READY_physical并把待选focus明确改为旧mental。没有将构造档称作真实档；没有调用v12 saveGame制造v11来源。四份当前均按实际准备状态得到0维护收益，成本分别为fitness−3、form−2，报告明确饱和原因；这是本次四份路径的结果，不是从加载输入95/100推定所有路径为零。事件使45→49/46→45、到期后果使45→46/46→45及PUSH后46→43不重判的独立测试同时覆盖。

## 最终工程验证

项目根执行（正常复跑**不带**CEU_T02_EVIDENCE）：

```sh
npm run test:run -- src/engine/__tests__/trainingPlan.test.ts src/engine/__tests__/ceuTrainingBaseline.test.ts src/store/gameStore.ceuT01.test.ts src/store/gameStore.trainingPlan.test.ts src/store/gameStore.ceuS0Baseline.test.ts src/persistence/__tests__/save.test.ts
npm run test:run
npm run typecheck
npm run build
```

最终分别为6文件51项通过、58文件402项通过、类型检查退出0、构建退出0；最终日志为targeted-final-r2/full-final-r2/typecheck-final-r2/build-final-r2.txt（上一轮日志保留）。首次证据运行带CEU_T02_EVIDENCE=1，用wx写入新结果；目录现在已冻结，不要重复开启以覆盖结果。

规则覆盖30/31/33/34/36/37/39、单项45/46/95/100、潜力上限、20下限、三策略、恢复优先、两引擎及重复加载。事件/到期后果/训练质量奖励只消费一次。完整store组装用例同时保留合同hint、现金上限hint、国家队hint和specialEvent；最终lastReport与重载后的eventSummary仍含实际维护/恢复说明。

早期失败日志保留：initial typecheck为当前构造态版本及新标签缺项；targeted-initial为S0哈希索引路径读取错误；report-order-initial为测试把consequenceSummaries误放进specialEvent；full-initial为旧迁移目标11断言；后续暴露的到期错误计划恢复版本覆盖已延续到12。收尾另发现并修复老将恢复时比赛后TEAM_FIRST关系/青年晋升策略加成残留，新增三策略在恢复窗完整输出相同的回归；年轻不变。均已修复并通过最终全量，不隐藏失败记录，也未改旧快照/Player期望值来消除回归。

构建成功但仍有“minified chunk >500kB”警告（主包约848kB）；本批不扩展为拆包专项。

## 配对统计与限制

900次均验证直接准备收益/成本公式。代表输入三状态80、STEADY后fitness81：BODY_CARE身体衰退从0.6531减至0.52248，实际取整前减缓0.13062，最终身体69.5（冻结普通训练69.3）。

| 位置 | 计划 | 评分差均值 | 评分高/平/低（各100种子） |
| --- | --- | --- | --- |
| ST | BODY_CARE | +0.002 | 2/98/0 |
| ST | MATCH_SHARPNESS | −0.001 | 0/99/1 |
| ST | MENTAL_RESET | 0 | 0/100/0 |
| CM | BODY_CARE | +0.001 | 1/99/0 |
| CM | MATCH_SHARPNESS | +0.001 | 1/99/0 |
| CM | MENTAL_RESET | 0 | 0/100/0 |
| CB | 三项各自 | 0 | 各0/100/0 |

评分总体差异范围−0.1至+0.1；其他指标范围见JSON。对照为相同冻结输入的v11 BALANCED（与该组其余四项普通训练相同）。现有HalfYearStats无逐场胜负，不报告虚构比赛胜率，高/平/低只代表各指标配对差异。未调整锁定参数，**不宣布最终平衡通过**。

浏览器、模拟移动视口、真实手机、页面可见性、线上及v11读取v12：**未执行**。v11客户端不保证支持v12；正式发布前需要旧档备份/回退约定。本批只提供内存Storage和真实load/save/store链路验证，不冒称真实用户设备验收。

## T-03接口与剩余工作

- `normalizeTrainingFocus(focus, age)`／`normalizePendingTraining(state)`：纯函数，后者返回原对象或新规范化对象；只在待结算窗口使用。引擎调用者须传本期规范值，禁止重映射旧报告/history。
- `MAINTENANCE_LABELS`、`MaintenanceFocus`、`isMaintenanceFocus`；新增枚举BODY_CARE/MATCH_SHARPNESS/MENTAL_RESET。无新增持久字段。
- `resolveTrainingPlan(position, focus)`返回shares与multiplier；`applyTrainingMaintenance`为引擎内部执行记录，不能在UI上提前持久化收益或恢复判断。
- 摘要为原eventSummary + 换行 + `本期训练：计划；训练准备…；实际身体衰退减缓…/恢复覆盖/饱和原因`，只显示保存值。不要从整窗净变化反推收益，不补算旧报告，不转放hints。
- 待做：年龄选项集合与默认BODY_CARE、31–33普通成长说明、37+衰退提示、低状态唯一恢复入口及STEADY默认、目标≥95禁用说明（身体维护不禁用）、旧选择可继续、换行显示与桌面/手机可读性验收。均须T-02经Codex审核后另行授权。

交统筹可复制：

```text
审核CEU-20260907 ASTRA-T02，生产基线HEAD 3f290407a299790665b58c4bc7c2bf8455d24bbd，改动未提交。
先读文档26与T-02/README，核对artifact-hashes及protection-verification；正常复跑不带CEU_T02_EVIDENCE和任何v11生成开关。
审查共享训练、事件/后果→恢复→策略→维护→衰退顺序、11→12仅版本迁移、待结算canonical state及新history一致、21档真实load/save/continue结果、年轻54/324精确对照和900次配对统计。
重点核查实际说明落在eventSummary、三hint组装后持久、旧报告不补算；UI仅新增标签，不作为页面完成验收。
若通过由主台账标完成，再另发T-03授权；否则给T-02明确返工项。禁止自动进入M/F、提交推送部署。
```
