# ASTRA-KMM-P1C / KM-09：待统筹验收

近期四次合法避重复及退化已接入，40目录/规则/存档schema不改。HEAD `7421b442983d27bc17f535cf741a7f065b1ee87e`；package2.0.0、SAVE/DATA13/13。未提交、推送、部署，未进入最终发布。

## 审阅入口

- [实施与旧快照](implementation-and-reuse.md)：S1旧15raw和公开后继；P1A/P1B共10条旧Pending/Result/实际捕获READY→完整原报告通过。[旧来源索引](legacy-fixtures/index.json)。
- [100条合成摘要](synthetic-summary.json)、[2400选择明细](synthetic.json)：100/100覆盖8，单模板最多5；小池/换位置单独验证。不是自然样本。
- [自然影响与观察线](impact-review.md)、[位置政策表](position-table.md)、[完整统计](analysis.json)：300/300完整运行、9/9复演、100 OFF与S4最终SHA相等；每ON4824普通窗，44.27%/75.33%。
- [五条预选路径](natural-paths.md)、[场景/属性/理由与结果](natural-paths.json)、[584份真实保存原档](natural-raw-manifest.json)。146次Moment、各≥20、全部8/8、最短重复间隔5。
- [实页回放](page-review.md)、[输入SHA](page-inputs.json)、[9张全部目视](screenshot-manifest.json)、[页面归档](page-archive.json)。3条已有自然路径回放，非新增种子。
- [运行前政策锁](audit-policy-lock.json)、[与S4审计差异](audit-diff.patch)、[命令退出码](commands.json)、[409候选文件](candidate-source.json)、[保护](protection.json)、[输入清单](required-inputs.json)、[所有大型输出SHA](output-manifest.json)。

## 工程及待决定

49项定向、全量78文件796项、typecheck/build均通过；独立自然审计1项执行300+9，约387秒。主包963.03kB警告保留。没有放宽原数值期望，没有覆盖旧夹具或输出。

CDM-ROTATE进球224→248（+10.71%）超过8%观察线，直接19球、出场+22、总差余5球不能单独精确归因；交统筹判断，不自行调参或宣称最终平衡通过。五路径边后卫A/C倾向已公开。其余工程/保存未见反例。

真机、其他浏览器、线上未执行；不虚报真人阅读时长。正常测试不启用采集开关，显式重跑须新输出目录，保护原SHA。旧目录采集开关未开启。当前唯一下一动作：Codex统筹验收P1-C，再决定最终2.5.0发布；执行者到此停止。
