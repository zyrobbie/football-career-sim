# ASTRA-KMM-S3 / KM-04 待验收

2026-09-13。12模板（FWD3/CRE2/MID2/FB2/CB3）、11位置、36选项、108结果已交付；不是40模板最终版。package2.0.0，SAVE/DATA13/13。HEAD7421b442983d27bc17f535cf741a7f065b1ee87e；未提交、推送、部署。

## 交付入口

- [有限计划](case-plan.md)
- [完整内容表与逐行语义审阅](content-review.md)
- [540行矩阵说明/选择理由](matrix-review.md)、matrix-candidate.json原始结果（绑定目录SHA）
- [页面与失败记录](page-review.md)、page-summary.json、viewed.json
- protection.json、candidate-source-sha.json：前后保护与候选身份。
- required-test-inputs.json：S0基线与15份S1 raw必须可在最终干净checkout/CI读取，不可随意排除整个证据目录。
- 大证据归档 `outputs/KMM-20260913-S3/local-evidence.tar.gz`，路径/SHA见artifact-manifest.json。未覆盖旧输出。

## 实现及结论

生产仅模板目录与KeyMatchMomentSummary：新增九模板、PRESSING_GAMBLE优秀R+.10/普通+.05/失误黄牌1与R-.08；旧三模板所有数值不变。CRE01改“防线身后”并revision2；FWD02修正为传中前决策以消除时序冲突。pending结果卡去重复标题和比分，所选动作/结果/贡献保留；报告履历完整。

矩阵5画像×3状态×36选项=540行，含1620次构造tier原引擎评分差；无全样本固定支配。没有依据本矩阵再调参数。成功概率、奖励和黄牌单列，不推算胜率/长期平衡。所有108结果逐行核对过，关键词仅辅助（入网/送进空门两次误报原日志保留）。旧S1五Pending公开选择/完成后的完整保存结果与原S1报告全等，15raw校验不改内容；没有先重编码旧raw。

定向目录+关键时刻37项通过（compatibility-final.log）；受影响六文件首次104/106，两项为旧spy计数；修正后最终全量77文件784项通过（full-final.log），typecheck-final.log成功。build.log成功939.21kB（gzip254.46kB），大包警告保留；构建后只改测试驱动，生产身份相同。原失败输出保留，未改生产引擎来迎合旧测试。

## 六处旧测试适配

1. F01 READY/RESULT：新增位置会暂停，使用公开选择/完成再断言history+1和旧前缀。
2. M03下一市场：训练后的新暂停走完后才断言报告；原方向/报价/生成一次断言保留。
3. M04连续窗口：switch新增两phase，公开操作后继续原现金/历史/窗口断言。
4. T01迁移：纯维护函数为冻结校验多次调用，不是多次应用；最终history+1、bonus归零、规范化focus、恢复数值不变。保存重载前后spy次数必须相同。
5. trainingPlan：先完成新暂停，仍检查后果只消费到期项、未来队列保留、bonus归零、事件历史不重放、真实恢复数值；重载前后模拟次数不得增长。
6. V1ClubWorkflows：原用例无Storage，新增CM事件要求保存时停READY；安装独立Storage并公开处理暂停。没有绕过保存校验。最初失败未另采store.error，原因依据原测试未装Storage和保存实现判定，不能将其称为已单独采集的错误文本。

## 停点

本批5个新半年、35个中心命中操作，首次载入与刷新“继续生涯”另计；26张图全部目视。真实手机/其他浏览器/线上、人类阅读时间未测。桌面30seed内优秀未命中，有限改普通正向；没有新增搜索。S4长生涯/1000窗口及P1扩40未执行，统筹预备S4输入不是本批结果。

当前唯一下一动作：Codex统筹验收ASTRA-KMM-S3，再派S4。一次中途发往统筹任务的消息被自动审批因目的地身份/内部信息拒绝，未绕过发送；交付文档仍可由统筹在共享项目读取。

4313服务已关闭，所有浏览器由脚本finally关闭。通知尝试两次均被自动审批拒绝；第二次已用list_threads核实同本地项目同统筹任务ID，仍以缺少用户对具体目的地/载荷授权拒绝。两次消息均未发送，未换工具绕过。待用户明确授权向「游戏策略 Astra」发送本交付索引，或统筹自行读取共享文件；S3本地交付已完成。
