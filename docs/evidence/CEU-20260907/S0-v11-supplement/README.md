# 冻结v11老将补充存档

ASTRA-T01，2026-09-07。源HEAD `3f290407a299790665b58c4bc7c2bf8455d24bbd`，save/data=11/11。生产文件逐一匹配该HEAD；详见provenance.json和[生产哈希](../T-01/production-hashes.json)。原S0目录完全未动。

所有fixtures均为真实saveGame写入的checksum envelope，全部来自匿名公开store操作；内存Storage保存钩子仅观察career_save_current，不修改phase、不修改player、不触碰浏览器。window44为35岁夏窗，45为35岁冬窗。

| 文件（fixtures/*.json） | phase | seed后缀／窗口 | 说明 |
| --- | --- | --- | --- |
| PLAN_35 | HALF_YEAR_PLAN | 0／44 | focus=null |
| EVENT_attack | SPECIAL_EVENT | 0／45 | 已选attack，NATIONAL_CLUB_LOAD_CONFLICT |
| RESULT_attack | SPECIAL_EVENT_RESULT | 0／45 | 即时事件效果已保存 |
| READY_attack | SIMULATION_READY | 0／44 | 无事件路径的瞬时真实保存 |
| EVENT_physical | SPECIAL_EVENT | 0／44 | 已选physical，STARTING_ROLE_LOST |
| ROUTE_physical | SPECIAL_EVENT | 0／44 | setup路线已经选择，pending.selections保留 |
| RESULT_physical | SPECIAL_EVENT_RESULT | 0／44 | 事件结果已保存 |
| READY_physical | SIMULATION_READY | 0／44 | 事件确认后、模拟前真实保存 |
| LOW_35 | HALF_YEAR_PLAN | 1／45 | fitness43、form76.1、morale77.5，低状态可达 |
| ROUTE_attack | SPECIAL_EVENT | 1／45 | 低状态且旧attack已选，TEAMMATE_CONTRACT_TENSION路线已选 |

种子完整前缀ceu-v11-supplement-。manifest.json记录每份版本、phase/window、焦点、实际俱乐部ID、状态、事件、SHA-256、字节数；同名actions/*.json记录从新生涯开始到保存调用的真实公开动作及参数。SIMULATION_READY的最后一个公开动作会继续结算，因此复演通过保存钩子观察中间值，不要求最终store停在ready。

搜索完整限定0..99，每种子attack和physical两条生涯，共200条，使用STEADY与首个合法事件选项、留队及续约优先，到window45后结束。search.json记录每条找到的新增覆盖。未找到old attack所对应form≥95的35岁饱和待结算档；这只是限定搜索未找到，不能证明全部玩法不可达。未扩大种子或伪造状态。纯构造饱和边界另见T-01/training-v11，不属于此存档集。

逐份使用新Map/空store加载，继续到同窗报告，旧history前缀和事件记录前缀保留，恰好新增一窗，重新保存/加载幂等；verification.json记录动作与数量。另对每份actions完整复演，确认能观察到完全相同的原始envelope。最终定向验证日志见[本批索引](../T-01/README.md)。这是v11恢复通过，不是v12迁移通过。

原生成命令见provenance.json。当前目录已存在，再执行CEU_T01_CAPTURE=1会在写入前拒绝；勿删除目录来使生产升级后的生成通过。复跑使用不带开关的定向测试，只读现有夹具。若必须独立重建，只能在仍为锁定生产HEAD、具备同版测试工具和manifest的新隔离副本中运行，新副本最初不得存在该输出目录；无需、也不应改动本仓库冻结目录。
