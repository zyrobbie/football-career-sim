# PSU S2：已由统筹验收

默认参数冻结，0轮调参。HEAD2570017，package1.1.0、SAVE/DATA12/12；未提交/推送/部署S2。

- [完整主结果](outputs.json.gz)：1500配对＋62边界；ROTATION主动争取较稳健多1.71场，STARTER稳健仍比FRINGE主动多9.74场。[对照](comparison.json)。不以100种子伤病率解释概率参数。
- [伤病](injury-summary.json)：5组×3×1000。仅维护组按统筹要求扩到10000固定种子/策略，[扩展](injury-maintenance-10000-summary.json)为370/150/150次，原1000完全重合；合计42000不重复组合，10000独特伤病种子。
- [连续观察](continuous.json.gz)：4起点×3策略×4窗=48，公开store动作，均可继续，实际恢复0次。mature/PUSH与veteran-sharp/PUSH末身体41，留S3真实页面验证第5窗恢复。事件/市场轨迹分歧见[first-divergence](first-divergence.json)，不称严格单变量全生涯对照。
- 年轻恢复TEAM_FIRST额外关系+2残留消除；正常比赛奖励保留。[恢复对比](recovery-fixed.json)。身体维护抵消部分负荷但仍有相对STEADY的状态机会成本和伤病风险，不证明最终平衡。

工程：[定向29](targeted-final.txt)、[全量74文件741项](full-final.txt)、[typecheck](typecheck-final-r2.txt)通过。统筹独立重演四runner及维护扩样通过（/tmp/PSU-20260912-coordinator/s2-replay.txt、s2-injury-extended-replay.txt）。本批未做页面/build。

旧断言调整：职业STEADY准备身体+1→+2、竞技+2→+3；PUSH身体−3→−4；TEAM心理+2→+3。维护输入82替代81，身体衰退公式不变。年轻青训期望保留原规则。Ajax497→499分钟及45.9→46攻击来自[独立公式推导](ajax-derivation.json)。旧288职业样本只比较授权字段以外的完整输出，并核对分钟/身体及无伤病分支；36青训结果仍完整相等。到期后果PUSH准备43→42；冻结JSON均未改。initial/r2失败日志保留。

复演：`npx vitest run --config docs/evidence/PSU-20260912/S2/balance.config.ts`（默认只读）。扩样加`PSU_INJURY_EXTEND=1`并指定injury.runner.ts。后续S3摘要改变时先按[source-snapshot](source-snapshot/README.md)在独立旧checkout还原，不能刷新本批output。生产身份见[engine-candidate](engine-candidate.json)，保护见[final-protection](final-protection.json)。

S3交接：数值不改；报告真实执行归因、青年隔离、手机可见取舍、同源1.9.0；旧30raw及两个41身体后继。真实设备、最终平衡未测。统筹验收依据为professional-strategy-v1.9-s3-instructions.md。
