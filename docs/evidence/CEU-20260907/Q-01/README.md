# ASTRA-Q01：待验收

2026-09-09，仅执行综合工程、旧档与完整生涯确定性验收。HEAD `3f290407a299790665b58c4bc7c2bf8455d24bbd`，SAVE_VERSION/DATA_VERSION 12/12。未修改生产代码、CSS、规则、迁移、依赖或球队数据；未提交、推送、部署，未启动服务/浏览器或访问用户存档。

## 实际结果

- 最终全量 **71文件/716项通过**（既有626项＋新90项）；typecheck/build退出0。定向3项当前生涯、87项矩阵及初次typecheck均通过。原始日志及命令见`*-command.json`、对应txt；最终全量通过`CEU_Q01_CAPTURE=1`独占捕获本目录，新测试默认只读。没有启用历史采集开关。
- 原36固定种子全部合法退休：W53/54/55分别6/1/29；原6组确定性重放通过。全量实际执行36＋12＋36＝84局，仍是36独特种子。源码、原种子/策略/日期/断言与HEAD一致。
- 当前入口3种子各重复一次，最终全量6局；此前定向也执行6局。动作292/291/302，均W55、56条history、AGE_LIMIT。完整最终game、每一步状态及写盘SHA、关键raw逐字一致，无排除元数据。上限1000未扩大。主动三维护焦点、31/34边界、准备说明、公开偏好编辑及实际下一市场生成均有记录。三局实际留洋且后来回国；这是结果，不是种子挑选目标。
- 完整生涯统计口径：本批上述驱动合计96次执行，**39独特种子**；最终全量为90次。其他单元/分布测试输入不冒充完整生涯样本。
- **69独特原始raw、87分支**全部通过：v11 21份，v12 48份。每分支独立无backup原raw加载，公开合法后继、真实写盘、清空内存重复重载。额外旧自愿决定由公开动作生成的中间raw另列，不计入冻结原raw数。允许迁移/规范化与历史前缀保护由测试断言；已有市场/谈判保留，零外部续约可继续。

## 证据与来源

| 文件 | 内容 |
| --- | --- |
| case-plan.md | 执行前固定种子/策略、1000动作与90分支/25步上限 |
| raw-matrix.json、branch-matrix.json | 原始路径/SHA、去重、分支、版本/phase、自然/构造/中间状态分类；以branch-matrix分类说明为准 |
| matrix-results.json | 87分支真实加载/动作/完整game与Storage写入/重复恢复记录；约51MB，保留完整证据 |
| full-career-36.json | 本次FULL_CAREER_AUDIT_JSON原样解析 |
| baseline-provenance.json、aggregate-comparison.md | 原源码与文档10同来源SHA、升级前后汇总及归因限制 |
| career-0/1/2.json | 3当前入口生涯及重放完整证据、关键raw |
| current-career-summary.json、travel-outcomes.json | 生涯/维护/方向/市场统计；实际球队目录查国别及回国窗口 |
| q02-real-35-overseas-plan.json、q02-sample-source.json | 第三局真实35岁比利时PLAN保存原字节及来源，无构造字段 |
| q02-handoff.md | 下批候选与组合实页、375×667、退役导出/二维码、设备限制 |
| before-hashes.json、protection-verification.json、changed-files.json、artifact-hashes.json | 前后保护、实际修改及新产物SHA |
| git-before.txt、git-after.txt | 脏工作区与HEAD证据，不将HEAD当现有生产完整基线 |
| run-check.py、index-matrix.py、summarize.py | 本批命令/索引/汇总脚本；不要在已有证据路径重新采集 |

## 修改与限制

新增正式测试`src/store/gameStore.ceuQ01Career.test.ts`（3项）及`src/store/gameStore.ceuQ01Matrix.test.ts`（87项）；更新docs20/21及本目录证据。构建可能更新tsconfig.app.tsbuildinfo，单列于哈希差异，非生产源码修改。原证据、outputs、原测试与生产逐文件保护结果见protection-verification。

未发现本次覆盖范围内生产反例。可比原材料仅文档10汇总，缺旧逐种子轨迹；原自动驾驶按动作数选事件，F减少动作会改变后续路线，不能精确拆分所有数值差异的T/M/F贡献。小样本不能宣布最终平衡。原兼容重放比较详细汇总，新3局才比较完整game及写盘记录。

build保留主包859.40kB（gzip238.68kB）及超过500kB警告。store验证不是UI验收。本批未做浏览器、真实手机、线上、组合实页、375×667、退役档案/图片/二维码，也未测试旧客户端读取v12或降级回写。无需要关闭的临时服务或浏览器上下文。T/M/F验收及已关闭问题不变，Q-02及后续未开始。

唯一下一动作：**用户转交Codex审核ASTRA-Q01**。
