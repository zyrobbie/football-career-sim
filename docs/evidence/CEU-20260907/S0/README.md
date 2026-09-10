# S0 基线证据与复跑说明

执行：ASTRA-S0-01／任务01a07a1f-d1f8-7f43-a89a-4a75d75a0c2d，2026-09-07。
代码：main／3f290407a299790665b58c4bc7c2bf8455d24bbd，与规划一致。未发现仓库内AGENTS.md文件；遵守用户提供的AGENTS指令与docs/22。本批仅测试、夹具、证据、方案及台账，不改生产行为。

## 结果

- E-02：review-veteran，CAM，window44/35岁，实际青训及合同俱乐部`chn1_qingdao_haiwan`。五焦点返回完整Player及stats相同；能力69.9/69.9/69.3/70，与历史结论一致。完整输入和输出见training-baseline.json。
- E-03：review-return-home生成CM，window40/33岁，当前队`eng1_afc_bournemouth`（当前CLUBS第一支非中国tier3队）。review-return-0..99共300份报价，国内0，与历史结论一致。每份报价id/clubId/国家及参数见market-baseline.json。不是完整市场、到期或救济验收。
- 流程：见flow-baseline.md及public-action-trace.json。新增flow-guards.json记录陈旧报告动作可改写计划phase，以及合法报告复查往返不改结算。不能把当前全量测试通过解释为已经防重入。
- 匿名夹具：7/7，均经saveGame生成带checksum的原生envelope；loadGame、validateGameState和公开continueCareer恢复成功，继续公开操作最终退役。常规测试逐字比较重生成envelope与持久夹具，再加载磁盘envelope。内存Map模拟window.localStorage；从未连接浏览器、读取或覆盖用户存档。

## 命令与日志

工作目录为项目根。已有依赖可用，未安装依赖。

```sh
# 历史生成命令已禁用：CEU_GENERATE=1现在立即报错，禁止覆盖冻结S0。
# 只读比对冻结夹具与当前规则复现
npm run test:run -- src/store/gameStore.ceuS0Baseline.test.ts
npm run test:run
npm run typecheck
```

最终生成：generation.txt，退出0，1文件/4测试通过。全量：full-tests.txt，退出0，54文件/368测试通过（原53文件/364 + 新增1文件/4）；包含当前全生涯审计。typecheck.txt，退出0。定向只读执行见targeted-tests.txt，退出0，1文件/4测试通过。命令与退出码亦见validation.json。

原本全量第一次运行时仅新增3项，共367通过；随后增加真实防重入缺口测试，已重跑全量以最终368为准。无失败测试；不用历史通过代替本轮。

## 夹具清单

固定种子`ceu-s0-fixture-0`，固定时钟2026-09-07T00:00:00Z，起始年份2026，姓名“匿名基线球员”，CM/CDM，CONDITIONAL/意大利，均衡+STEADY、固定首个合法事件选项、留队优先及到期续约。完整生成动作见测试，全部为公开store动作，不手改生涯状态。初始测试store清空与随机种子mock不属于用户存档操作。

| 文件（fixtures/） | phase | windowIndex | 合同剩余半年 |
| --- | --- | --- | --- |
| HALF_YEAR_PLAN.json | HALF_YEAR_PLAN | 4 | 8 |
| SPECIAL_EVENT_RESULT.json | SPECIAL_EVENT_RESULT | 4 | 8 |
| HALF_YEAR_REPORT.json | HALF_YEAR_REPORT | 4 | 7 |
| PRO_STAGE_COMPLETE.json | PRO_STAGE_COMPLETE | 4 | 7 |
| TRANSFER_WINDOW.json | TRANSFER_WINDOW | 6 | 6 |
| CONTRACT_EXPIRED.json | PRO_STAGE_COMPLETE | 11 | 0 |
| NEAR_RETIREMENT.json | PRO_STAGE_COMPLETE | 52（39岁） | 1 |

全部saveVersion/dataVersion=11/11，俱乐部chn1_shenzhen_pengcheng。精确UTF-8字节数与元数据见fixture-manifest.json，SHA-256见fixture-hashes.json。文件是存储键career_save_current的值，不是任意原始GameState。已生成报价夹具在window6，属于未成年国内市场，足以验证原生已生成报价结构；**尚无成人海外或已谈判夹具**，M阶段须补充，不把此夹具当成全部转会兼容矩阵。

## 保护与局限

protected-hashes.json记录原README、docs/22及先前outputs目录所有文件的SHA-256，结束核对一致。docs/20为获授权更新台账。没有修改原outputs目录、用户存档、生产源码/配置/依赖；未提交、推送、部署。

未执行：build、真实浏览器/手机/视觉验收、升级后迁移与数值效果（尚未实施）、多版本读回、完整M/F条件动态覆盖。规则复现的构造状态与公开store夹具明确分离；不声称35岁引擎构造样本是公开路径到达的同一生涯。

建议参数未做新规则成对模拟，仅有现状复现和公式算例。统筹先审docs/23七项D-*，再决定S0-04与训练开发授权。本批结束于此。

## ASTRA-S0-R1补正记录

四份.txt均由同名原始.log逐字节复制；原.log、七份v11夹具和全部原始结果JSON未改。validation.json只增加可交付副本引用及原件名，原执行结果保持。生成开关已关闭，定向测试仍按v11基线只读比对；未来迁移直接逐份读取冻结envelope，不用v12复演旧生涯。老将补采门槛、规范化焦点与报告承载见[修订方案](../../../23-career-experience-implementation-proposal.md)第1.5/1.6/4.1/4.2节。R1本轮验证见[补正验证](../S0-R1/README.md)，不把原全量测试当作R1重跑。
