# CEU-20260907 ASTRA-M02交付（待验收，含统筹待决阻塞）

2026-09-08。用户本次明确转交授权M-02；M-01已由文档30验收。本批已实施市场资格、组合、确定性抽取并完成授权测试，停止交Codex审核。**发现稀缺到期结果的持久化阻塞MR-05，未越界改save.ts，不能把市场整体或稀缺到期端到端可用标为完成。**

HEAD仍为`3f290407a299790665b58c4bc7c2bf8455d24bbd`，SAVE_VERSION/DATA_VERSION=12/12。训练已有未提交改动作为实际源码基线保护，非仅使用HEAD。未提交/推送/部署，无代理，不访问用户浏览器存档。

## 实施范围

唯一生产改动：`src/engine/transfers.ts`。新增由生产实际调用的`selectTransferCandidates`纯选择层及`TransferCandidate`类型，导出`qualifiesForAdultMarket`供直接验证。未改gameStore生产动作、页面导航、持久化/版本、训练规则、球队目录或依赖。

- 成人资格：85+允许一级平台≤3或中国一级平台4；80–84一级平台≤4；两者不因intent排除中国。74–79、66–73、<66原档不变，兼容参数区分divisionLevel/platformTier与runtime club.tier。
- 国内方向两国内槽＋开放；综合方向国内/海外各1＋开放；海外方向首偏好海外/其他海外＋开放。85+ STRONG在前两槽内优先两份海外club.tier≤2，不额外插入第三个保底，也不截掉开放槽。
- 专属槽先分配，缺项再按同地区及全体剩余候选回退，开放槽最后。稳定目录顺序、首次ID去重、排除现队、不造队、最多3份。
- 权重仍interest×0.65+fit×0.35、首偏好×1.28、固定rotation0.65–1.35；使用原transfer-market-slot随机流加明确槽名/回退序号，不使用时间或非确定随机。薪资、潜力估计、承诺、合同、费用计算不变。
- 续约独立保留，外部沿用生成器并转FREE_TRANSFER、费用0，总数≤4；续约随机流不变。
- 救济触发保持FRINGE或（SUBSTITUTE且≤5场），FRINGE无额外出场限制；只选严格改善FIRST_TEAM角色的主池/回退。五大较低平台/发展联赛/国内ELITE三槽，DOMESTIC国内优先。不套普通高OVR资格。
- 未成年国内实际转会、16–17海外关注、40岁禁签、市场节奏/表现/失约限制保持。

## 核验结果

| 项目 | 实际结果 |
| --- | --- |
| E-03完整原输入 | 三方向各100固定种子，共900份完整报价；只改变intent，原player其他字段/currentClub/window/seed复用；确定性通过 |
| CONDITIONAL | 国内103、海外197；每窗国内1–2，全部窗口两地各至少1 |
| DOMESTIC | 国内203、海外97；每窗国内2–3 |
| STRONG | 国内3、海外297；每窗国内0–1，无国内必出频率要求；直接资格＋受控开放槽证明中国可选 |
| 47原边界 | 原完整输入直接读取，三路径、年龄17/18/33/37/40、OVR79/80/84/85、境内外与三方向；不重新构造替换冻结输入 |
| MR-02选择层稀缺池 | 16种池×3方向=48组；0/1/2、无国内/仅1国内/无海外、无首偏好/高平台不足、地区唯一候选、去重/现队排除、无/1/2严格改善及救济各槽缺失 |
| 生产连接 | 9组隔离依赖候选目录，经真实公共生成器及到期包装；原目录不修改，无运行时生产测试开关；非40岁空池验证 |
| 原始存档 | generated-r4七份＋supplement撤回，共8份；原envelope直接置入独立Storage且无backup，load/continue全state相等；合法确认/到队NONE/下一计划后save/reload三次相等，无重复现金/事件/history/report |
| MR-03重入 | 四类问题仍复现，按行为断言保留，不以新报价与旧快照不同当修复；未改生产store |
| MR-05新增阻塞 | 3组稀缺到期结果（外部0/1/2）被旧save校验清空并退回结束页；这是反例通过，不是稀缺保存成功 |
| 定向 | 6文件78项通过 |
| 全量 | 63文件460项通过，含已有训练断言；13.09秒 |
| 类型/构建 | typecheck/build退出0；主包约852kB，>500kB警告保留 |

在源码分层/测试证据上，MR-02的动态候选不足生成验证已交付，是否验收关闭由Codex决定；不能因为测试均绿而忽略MR-05。

## 证据目录

- [commands.json](commands.json)：最终原始命令、起止时间、退出码；targeted-final/full-final/typecheck-final/build-final.txt为原始日志。
- [e03-directions.json](e03-directions.json)：三方向完整输入、输出和分布；含原S0来源SHA。
- [boundaries.json](boundaries.json)：47组原完整输入、原输出及新输出。
- [scarcity.json](scarcity.json)：48组显式构造选择器输入（现有球队ID、受控promise/分数）、期望数量及结果；年龄/角色阈值与受控开放槽另见ceuMarketPolicy.test.ts。
- [pool-connections.json](pool-connections.json)：9组实际生成连接＋3组持久化反例，来源及完整输入输出。这里是受控依赖，不冒称自然生涯或真实稀缺档。
- [restore-results.json](restore-results.json)、restore-*.json：8份原始档SHA、完整前后状态、合法动作及实际saveGame写出的最终envelope。
- [m03-reentry.json](m03-reentry.json)：未修复的重抽/节奏拒绝，保留完整前后状态。
- [assertion-mapping.md](assertion-mapping.md)：逐项旧断言→新目标，说明历史采集/重复搜索改为直接旧档恢复；旧JSON/源码副本永久只读。
- [handoff-and-blocker.md](handoff-and-blocker.md)：MR-05具体复现与最小建议、M-03仍未实施事项及生产接口。
- [before-hashes.json](before-hashes.json)、[changed-files.json](changed-files.json)、[protection-verification.json](protection-verification.json)、[artifact-hashes.json](artifact-hashes.json)：前后文件身份、修改边界、旧证据与outputs保护及新产物哈希。
- transfers.before.ts.txt/transfers.test.before.ts.txt为本批前源码副本；M-01已有源码副本未改。[capture-guard.json](capture-guard.json)证明两个旧采集开关均提前拒绝；退出1是预期拒写，不列常规测试失败。

初次connections-initial.txt中transfers五个旧断言失败，是旧平台排除/固定第三海外与批准新规则不符；替换对应表列出每项原因，其他多样性/轮换/合同断言继续保留。typecheck-tests.txt记录新增测试对nullable角色的类型错误，已修复。所有旧快照未覆盖，没有整文件skip，没有调薪资或潜力公式凑地区结果。

正常复跑（不带生成/采集开关）：

```sh
npm run test:run -- src/engine/__tests__/ceuMarketPolicy.test.ts src/engine/__tests__/ceuMarketPoolConnection.test.ts src/engine/__tests__/transfers.test.ts src/store/gameStore.ceuM01.test.ts src/store/gameStore.ceuS0Baseline.test.ts src/store/gameStore.v1ClubWorkflows.test.ts
npm run test:run
npm run typecheck
npm run build
```

证据首次运行使用CEU_M02_EVIDENCE=1，以wx独占写入；当前结果已有，复跑不再带此开关，不删除文件来重开写入。

## 停止点与未执行

M-02标为待验收并携带MR-05阻塞，提交统筹决定；不自行转交修复给M-03，更不实施。M-03/M-04/F/Q/R保持未开始。新方向编辑/保存、防重抽、页面导航均未实现。

本批浏览器、模拟移动视口、真实手机、线上验证均**未执行**；自然救济档缺口沿用MR-01接受范围，未扩大完整生涯搜索。8份冻结档仍包含构造来源，不改称全为自然采集。

唯一下一动作：**用户转交Codex审核M-02**。
