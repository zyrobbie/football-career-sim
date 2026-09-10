# ASTRA-M01市场变更前基线（待验收）

2026-09-07，GPT-6 Astra轻度；用户明确转交授权M-01。仅基线、测试与证据，未改生产行为；不进入M-02/M-03/F/Q，不提交、推送、部署，不创建代理。训练T-01至T-04已验收，本批未发现训练回归、未重开其结论。

HEAD `3f290407a299790665b58c4bc7c2bf8455d24bbd`；当前12/12。未提交训练改动由[采集前全部src哈希](production-hashes.json)保护，不以HEAD替代源码身份。

## 交付索引

| 入口 | 内容 |
| --- | --- |
| [事实/目标/后续断言](facts-and-handoff.md) | 三路径、资格→组合→固定抽取的源码位置；已知缺陷/正确行为/未来目标/缺口；M-02/M-03精确改动交接 |
| [运行前有限案例](case-plan.md) | E-03原100种子、47边界与谈判补采政策 |
| [E-03新复跑](generated-r4/e03.json) | 直接读S0完整原入参；100份完整报价与原JSON逐字段相等，300外部0国内 |
| [47边界入参/结果](generated-r4/boundaries.json)、[可读摘要](boundary-results.md) | OVR79/80/84/85、年龄17/18/33/37/40、国内/海外、三方向、三路径，代表组合而非全排列 |
| [最终7份存档manifest](generated-r4/manifest.json) | 逐份来源SHA、类型、动作、种子/phase/window、cashEuro、完整报价与选择、存档SHA/字节 |
| [撤回补采](supplement/search.json)、[第8份envelope](supplement/withdrawn.json) | 9固定种子×2策略=18尝试即停；构造seed/失约起点后真实公开谈判撤回、保存重载/后继 |
| [恢复结果](generated-r4/restore.json) | 7份独立Storage/store加载→确认/到队NONE→下一计划→保存重载；报价选择和谈判原样加载，事件/历史/报告/现金不重结算 |
| [回看重入](generated-r4/reentry.json) | 到期12→13重生成；普通市场节奏拒绝；空市场构造及失约强制重入6→7；完整前后state与动作 |
| [构造救济起点](generated-r4/constructed/rescue-input.json) | 全部字段差异与原因、真实save/load接受后openTransferWindow(true)；未手改phase伪造完成 |
| [构造空市场](generated-r4/constructed/empty-input.json)、[强制入口版本](generated-r4/constructed/empty-forced-input.json) | 空数组＋合法STAY，以及明确失约次数2；不冒称自然候选不足档 |
| [已有源覆盖](source-inventory.json) | 59份源SHA/国家/平台/角色，无自然海外豪门低出场救济起点 |
| [测试源码副本](gameStore.ceuM01.test.ts.txt) | 与src/store/gameStore.ceuM01.test.ts同字节；正常运行只读，生成开关拒绝覆盖 |
| [命令](commands.json)、[保护核验](protection-verification.json)、[改动](changed-files.json)、[产物哈希](artifact-hashes.json) | 原始日志、SHA、当前改动边界 |

**有效最终目录是generated-r4与supplement。** generated、generated-r2、generated-r3保留初次中断产物，仅作失败过程记录，不纳入8份最终覆盖、不要作为后续实施输入。原S0/T专项从未覆盖。

## 已证实的当前行为

- E-03仍为硬资格排除；OVR≥80且非DOMESTIC在私有资格源码排除中国。47样本中OVR79某些方向也没抽中国，这仅是该种子输出，不能倒推79国内无资格。
- 正常生成外部≤3、去重/排除现队，17岁外部均国内；到期≤4含独立续约，40岁生成0报价。救济在SUBSTITUTE出场5→6改变分支，角色改善在源码约束及构造公开市场通过。
- 到期回看后重新开市场产生新窗口和报价，谈判重置；history与cash未增加。空TRANSFER_WINDOW在有合法失约入口时同样可误判为未生成，窗口前进再生成。普通空市场未满足机会门槛时会拒绝，不夸大为所有入口均能刷新。
- 新存档通过真实save/load；选择、谈判字段等保存重载一致，后续合法确认不重复模拟、收入、history或事件。现金记录使用cashEuro，所有步骤都有实际数字。

## 运行与保护

项目根正常复跑（**不带任何生成开关**）：

```sh
npm run test:run -- src/store/gameStore.ceuM01.test.ts src/store/gameStore.ceuS0Baseline.test.ts src/engine/__tests__/transfers.test.ts src/store/gameStore.v1ClubWorkflows.test.ts
npm run typecheck
```

最终定向4文件38项通过，typecheck退出0；[targeted-final.txt](targeted-final.txt)、[typecheck-final-r2.txt](typecheck-final-r2.txt)。全量/build/浏览器/真实手机未执行；无生产改动，定向已覆盖新测试与既有市场/store模块，不扩大到全项目验收。既有>500kB构建警告保留，未声称本批重新构建通过。

生成工具是新增测试内的独立分支：CEU_M01_CAPTURE=1只允许固定generated-r4目录不存在时执行；校验12/12和production-hashes全部既有源码；每个写入wx，目录存在即拒绝。CEU_M01_SUPPLEMENT=1同样对固定supplement目录校验及拒写。默认只读重算/比较，不写冻结输入。恢复8份最终档的测试均使用新Map localStorage和空store，无上一例backup，不访问用户浏览器。覆写保护实测日志[overwrite-guard.txt](overwrite-guard.txt)退出1为预期拒绝，不列常规测试通过。

当前已知缺陷断言标注在新增测试中。M-02实现后应将E-03/边界旧行为比较替换为已批准目标断言，M-03替换重入缺陷断言；旧JSON仍只读保留，禁止为绿灯覆盖基线。

## 失败记录与范围差异

- typecheck-initial：测试误写不存在的REGULAR角色；改为现有STARTER。typecheck及typecheck-final：构造报告字符串类型过宽；明确FirstTeamRole/HalfYearReport类型后通过，未修改生产类型或规则。
- capture：救济构造漏同步careerStory.club.clubId，真实保存校验拒绝；补齐构造差异后写新目录r2。
- capture-r2：空市场选择null被校验拒绝；现有合同合法选择应为STAY，改构造后写r3，保留被拒样本日志。
- capture-r3：测试错误预期普通回看一定重开。实际cadence拒绝、window不变。r4保留该真实行为断言；另增加明确brokenPromiseWindows2的构造，公开open(true)证明空市场重抽风险。没有放宽产品正确性断言掩盖失败。
- 既有存档分叉只找到成功和失败。随后有限撤回补采采用seed0..8及两个政策；为了让既有window4结束页进入市场，起点同时构造brokenPromiseWindows=2（运行前政策原只提seed，实际差异完整记录于supplement/search.json）。这是构造补证，不是自然采集承诺，也不扩展为新生涯搜索。

## 缺口与审核停止点

最终8份中5份为真实匿名来源公开继续，3份为明确构造补证。没有自然救济档、自然候选不足/空市场档；没有实施未来偏好编辑及防重抽，也未做页面交互验收。低候选fallback以源码佐证，不能称所有稀缺池动态通过。phase/window/history在本次样本可识别已开市场，但未证明全体旧档均可唯一判断；未编造marketId。

M-01待验收，以上缺口请统筹判断，不能自行放行。下一步仅用户转Codex审核：

```text
请审核ASTRA-M01，先读M-01/README及facts-and-handoff，核对production/before/protection/artifact哈希。
确认E-03原100输入完整相等、47有限边界、5份真实来源继续＋3份构造补证、8份存档save/load/合法后继、到期及空市场重入缺陷、18次有界撤回搜索。
原缺陷通过不代表新市场功能通过。请判断自然救济/稀缺候选缺口并明确M-02/M-03实施范围；本批未修改生产，不自动启动后续。
```
