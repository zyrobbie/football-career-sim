# M-01执行前有限案例与政策

2026-09-07，先写后运行。仅冻结当前行为，未来目标不得作为当前通过结论。

已有：S0市场E-03原输入/100种子、TRANSFER_WINDOW、CONTRACT_EXPIRED、PRO_STAGE_COMPLETE等合法匿名档，T-04全部保护。先直接复用，不从新生涯搜索重做。

| 组 | 固定输入/案例 | 种子与数量 |
| --- | --- | --- |
| E-03 | 完整读取S0 market-baseline.player、currentClubId、window40；比较逐份全报价 | 原review-return-0..99，100次 |
| OVR/方向 | 常规，33岁海外tier3现队；79/80/84/85，每档STRONG/CONDITIONAL/DOMESTIC同属性同状态 | ceu-m01-boundary-0，12次 |
| 年龄/地区 | 常规，OVR84；17/18/33/37/40；国内与海外现队，CONDITIONAL | 同上，10次 |
| 到期 | OVR79/80/84/85、33岁、三方向同输入；另17/18/37/40、CONDITIONAL | 同上，16次 |
| 救济 | 海外tier1、OVR79/85、33岁、FRINGE三方向；SUBSTITUTE出场5/6成对；40岁边界 | 同上，9次；FRINGE与替补阈值分别记录 |

以上均明确构造生成输入，不是合法生涯采集档；完整入参/输出归档。源E-03球员匿名虚拟数据，能力统一OVR值、潜力90。到期contract与报告从合法S0合同到期档复用；救济只构造引擎入参，不导出私有函数。

采集优先：S0 TRANSFER_WINDOW原档直接v12加载→选择→谈判；CONTRACT_EXPIRED→openTransferWindow→续约；PRO_STAGE_COMPLETE→openTransferWindow。公开动作只读旧输入，真实save/load形成新envelope，独立Map Storage。谈判按报价目录顺序，每份从干净原市场分叉，SALARY、RELEASE_CLAUSE、合法ROLE依次尝试，收齐成功/失败/撤回就停。不能通过手改phase伪装采集。

若已有路径谈判未覆盖，限定构造起点种子ceu-m01-capture-0..9，每种子最多两个政策（SALARY、RELEASE_CLAUSE），由合法结束页仅改careerSeed后公开开市场；所有改字段另列。达到覆盖立即停止，不启动100种子全生涯搜索。

救济合法采集优先检查现有匿名档是否有海外tier≤2且FRINGE或SUBSTITUTE≤5。没有则报告自然档缺口，使用明确构造的结束页副本（现队、合同clubId、当前角色及报告contract/出场一致调整）通过公开openTransferWindow采集；全部字段差异与原因列入constructed目录，不称自然可达。

防重抽：各市场干净副本→选报价/谈判→save/load，比较draft、player方向、history、report、offers完整字段、selectedTransferChoiceId、cashEuro、事件。另复演reviewReport→advanceAfterReport→openTransferWindow，记录窗口/报价/谈判是否被改。空市场是单独构造输入，保留源SHA/全部差异，不声称真实无候选采集。

生成必须CEU_M01_CAPTURE=1，先比对全部既有src哈希和12/12，固定M-01/generated且目录不存在、所有文件wx写；默认只读重算比对已有证据。历史开关不使用。

采集执行记录：初次构造校验与错误测试预期失败保留在generated/r2/r3，按wx保护改用新目录generated-r4。补采使用独立supplement目录及CEU_M01_SUPPLEMENT保护。最终只读入口指向r4与supplement；没有覆盖前轮数据。实际补采为seed0..8，起点还修改失约次数2以走合法open(true)，全部差异见search.json。
