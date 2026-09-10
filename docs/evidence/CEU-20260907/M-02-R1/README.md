# ASTRA-M02-R1：MR-05补修交付（待验收）

2026-09-08。用户明确转交授权，仅补修合法稀缺到期市场被持久化清空的问题。M-02已改为**待验收**，MR-05为**补修待统筹验证**，未自行关闭。M-01及训练验收结论保持，M-03及后续未开始。

HEAD：`3f290407a299790665b58c4bc7c2bf8455d24bbd`；SAVE_VERSION/DATA_VERSION保持12/12。实际基线为带既有训练与市场修改的工作树，见[本批前哈希](before-hashes.json)，不以HEAD覆盖工作树。

## 修复前后与修改清单

| 位置／旧行为 | R1结果 |
| --- | --- |
| save.ts：续约1＋外部必须3，外部唯一数也必须3 | 接受续约1＋外部0–3；唯一数按实际数量判断 |
| 旧到期专项校验未完整检查报价成员与选择 | 恰好1份现队续约，其余全为FREE_TRANSFER且排除现队；外部俱乐部、全部报价ID唯一；当前选择必须对应未撤回报价且不是STAY |
| 撤回记录 | 保留未选中的完整withdrawn历史记录；不能选择已撤回报价绕过可签约要求 |
| 原schema最大4、年龄/退役、损坏修复 | 原样保留。异常到期仍修复至PRO_STAGE_COMPLETE，超总量仍拒绝写盘；不补报价、不重生成 |
| ceuMarketPoolConnection原3组MR-05反例断言 | 改为完整校验状态相等的目标断言；公开写盘/原始恢复/签约由新增R1测试覆盖。历史pool-connections.json及统筹反例不改 |

本批实际编辑：

- `src/persistence/save.ts`：唯一生产修改，仅到期TRANSFER_WINDOW局部。以[本批实际diff](save-r1.diff)区分既有训练迁移改动。
- `src/engine/__tests__/ceuMarketPoolConnection.test.ts`：替换上述3组旧缺陷断言。
- `src/store/gameStore.ceuM02R1.test.ts`：新增21项测试，38条明细结果；默认只读。
- `docs/01-product-spec.md`、`docs/02-data-dictionary.md`：更新到期持久化契约及历史阻塞说明；无新增格式。docs/05平衡参数未受影响，未修改。
- `docs/20-career-experience-upgrade-plan.md`、`docs/21-career-experience-upgrade-qa.md`：授权、当前状态、验证结果与停止点。
- 本目录新证据。工程命令另更新忽略的`tsconfig.app.tsbuildinfo`缓存并生成dist构建产物，不属于生产源码修改或冻结outputs。

[逐文件前后SHA](changed-files.json)列出全部编辑及构建缓存；[保护核验](protection-verification.json)：624份已有文件中617份未变、7份变化（6份授权编辑＋1构建缓存），另新增R1测试。433份既有证据与outputs全部逐字节不变。transfers.ts、gameStore.ts、models/game.ts及其他既有生产文件保持本批前身份。初次审计将tsbuildinfo作为未知变化拦截，核查为必要tsc生成缓存后单列，未恢复或清理工作区。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| 续约1＋外部0/1/2/3 | 4种数量、7独立起点，真实generateContractExpiryOffers调用；公开selectTransferChoice产生首次实际写盘envelope，内存／写盘／清空store后原始直读／continue／重存及三次重复加载完整相等 |
| 合法后继 | 0/1/2/3各1条续约，外部1/2/3各1条外部签约，共7条进入HALF_YEAR_PLAN；外部经过到队NONE及完成转会；球队与合同年限符合报价，窗口、cashEuro、history、事件、报告及draft不重复改变 |
| 公开谈判 | 复用M-01固定seed命名与0..8范围、两方向共18次：11成功、7失败。稀缺2外部市场完整字段和选择保存/恢复；不改薪资或抽取算法 |
| 撤回补证 | 有限18次没有撤回，停止搜索。复制M-01/supplement/withdrawn.json的5个谈判字段至真实生成的1外部稀缺市场，选续约并保存恢复完整相等。此例撤回状态明确为构造，只证明持久化，不冒称在本稀缺市场公开谈判产生 |
| 异常 | 11例：无/重复续约、重复外部clubId/报价ID、续约球队错误、外部含现队、混入其他合法schema类型、选择不存在、到期STAY、选中撤回、外部超3。前10例沿旧分支修复至结束页，最后1例由原最大4 schema拒绝且无写盘 |
| 有效合同空市场 | STAY保存恢复原样，未混用到期必须续约规则 |
| 原档兼容 | M-01/generated-r4七份＋supplement/withdrawn共8份：原envelope直接置入独立Storage、初始无backup，SHA/字节核对、load/continue全状态相等，合法确认/到队/计划后重复保存加载通过 |
| 保持项 | 年龄禁签、末期到期退役、11→12训练迁移及已有M-02资格/组合/抽取/稀缺生成测试继续通过；MR-03四类已知重入缺陷仍按行为覆盖 |
| 定向 | 9文件133项通过，含R1新增21项、persistence、市场/store及21档训练迁移 |
| 全量 | 64文件481项通过，14.12秒 |
| 工程 | typecheck、build退出0。主包852.45kB，>500kB警告保留 |

来源与调用边界：以冻结expiry.json完整data为构造基础，保留球员与窗口，在测试模块隔离balance依赖，使用原目录真实ID的“现队＋0/1/2/3外部”子集。只替换本期报价及选择；不改生产目录、不给生成器加测试开关。生成后恢复完整目录，再进入真实store与持久化；不把自然目录收窄当自然稀缺存档。首次原始envelope由公开动作保存，读取前不调用saveGame重编码，首次写盘没有backup。之后重复保存允许生成滚动backup，但每次实际current.data先完整对比，不能借backup掩盖损坏。

谈判构造额外修改careerSeed及contract.brokenPromiseWindows=2；生成报价沿同一固定基准，随后以这些固定输入调用公开counterTransferOffer。撤回补证只移植counterUsed、counterDirection、negotiationSucceeded、negotiationMessage、withdrawn，来源SHA、字段差异与完整状态均保存在results.json。

## 证据与复跑

- [results.json](results.json)：38条完整输入、首次envelope和实际结果；7条数量路径额外保留原始envelope字符串及最终完整状态；谈判与异常逐例记录。
- [summary.json](summary.json)：4种数量、7后继、首次envelope SHA、公开谈判统计。
- [targeted-command.json](targeted-command.json)、[targeted.txt](targeted.txt)：定向实际命令、原始日志及退出码。仅首次设置`CEU_M02_R1_EVIDENCE=1`，wx独占生成results.json。
- [engineering-commands.json](engineering-commands.json)、full.txt/typecheck.txt/build.txt：全量与工程实际命令、时间、退出码及原始日志。
- [old-envelopes-command.json](old-envelopes-command.json)、[old-envelopes.txt](old-envelopes.txt)：额外verbose复跑8旧档及4已知MR-03行为，12项通过。每份档的来源/预期SHA与合法动作可直接对照未修改的gameStore.ceuM01.test.ts；没有带旧采集开关。
- initial.txt、second.txt：初版同一命令`npm run test:run -- src/store/gameStore.ceuM02R1.test.ts`的原始失败日志。初版误用合同字段/字段位置/报价枚举，并把超4条schema拒绝误期望为修复，已按实际模型订正；第二次未得到撤回，依契约改为明确构造补证。未修改生产参数凑结果，没有整体skip。
- before-hashes.json、git-before.txt、save.before.ts.txt、save-r1.diff、changed-files.json、protection-verification.json、artifact-hashes.json：基线身份、唯一生产差异、保护及交付哈希。

日常复跑**不带任何采集／证据环境变量**：

```sh
npm run test:run -- src/store/gameStore.ceuM02R1.test.ts src/persistence/__tests__/save.test.ts src/engine/__tests__/ceuMarketPolicy.test.ts src/engine/__tests__/ceuMarketPoolConnection.test.ts src/engine/__tests__/transfers.test.ts src/store/gameStore.ceuM01.test.ts src/store/gameStore.ceuS0Baseline.test.ts src/store/gameStore.v1ClubWorkflows.test.ts src/store/gameStore.ceuT01.test.ts
npm run test:run
npm run typecheck
npm run build
```

旧M-02和统筹复核中的失败行为源码及JSON是历史证据，不能覆盖为新结果或要求其旧缺陷断言继续通过。新版用例替换其目标并保留来源。正常测试不写证据；不要删除已有结果来重开采集。

## 限制与停止

本批无UI修改，浏览器、模拟移动视口、真实手机、线上、旧客户端读取v12均**未执行**。构造稀缺与撤回补证不代表自然采集；未扩大种子或完整生涯搜索。未修改transfers.ts、生产gameStore、页面、训练规则、数据、依赖、版本或迁移。MR-03到期/空市场重抽及普通恢复节奏拒绝仍待M-03，不称已通过。

未创建代理，未访问用户真实浏览器存档，未提交、推送或部署。完成后停止。唯一下一动作：**用户转交Codex复核ASTRA-M02-R1**。
