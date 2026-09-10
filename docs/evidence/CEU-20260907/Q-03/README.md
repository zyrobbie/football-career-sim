# ASTRA-Q03 资料整理交付（待验收）

用户入口：[文档43](../../../43-career-experience-acceptance-package.md)。任务状态只看[docs20](../../../20-career-experience-upgrade-plan.md)，验证总表为[docs21](../../../21-career-experience-upgrade-qa.md)。T/M/F/Q-01/Q-02已验收，已关闭问题保持；本批Q-03待Codex终审，Q-04全部未执行，R未开始。

## 本批产物

- `before-hashes.json`、`git-before.txt`：本批前全部既有文件SHA和工作树状态；`baseline.json`：HEAD/package版本与初稿统计。
- `current-files-sha-final.json`：253项当前生产、资源、依赖、配置、正式测试身份；`change-attribution-final.json`：逐文件归属与T-02实施前SHA。两个无final文件为分类初稿，包含历史测试文本/系统缓存误归正式项，**仅以final为审查清单**；没有改变实际文件或测试。
- `working-tree.diff`：实际HEAD到本地生产/配置差异，尚未stage；该diff可能包含升级前工作，不代表已批准的发布范围。
- `evidence-reuse.json`：Q-02-R1的103产物哈希匹配，152个CSS以外源码/测试与其补修前身份一致，当前CSS实际差异与授权diff完全一致。Q-01的716结果由最终统筹核验链引用；没有在最终CSS上重跑716。后续35项/typecheck/build和实页均为已有结果引用。
- `reference-manifest.json`：用户包引用文件的路径、SHA、用途和来源；不复制匿名大raw/PNG。重要链接只读核对，不访问线上。
- `protection.json`、`changed-files.json`、`artifact-hashes.json`：本批实际差异、旧证据保护和新交付身份。

## 归属说明及不确定项

T-02/before-hashes是升级生产实施前可核验清单，不能无条件当作规划前快照。与其不同的已有生产文件列为“升级实施后修改”，但相对HEAD仍可能混入更早工作。新增共享训练/市场/报告模型和具名CEU测试按T/M/F/Q验收归档识别，正式测试与产品实现分列。

S0/protected-hashes记录了原README、指令和outputs等早期产物，证明它们早已存在并受保护；不因当前仍未跟踪就称本次功能。其余规划前准确归属缺少统一完整快照，列统筹确认，不能凭文件名补造历史。发布前应按对应专项变更和实际diff选择文件，不整体加入所有脏文件。

文档、冻结夹具/日志、验收脚本、outputs、dist、系统缓存是不同用途，均不默认纳入发布包；本批没有创建版本、tag或发布目标。构建产物未作为产品源身份清单；依赖及资源保持本地原状。

docs01/02仍含各阶段历史补记；如需把所有旧“待验收”措辞重整为单一当前产品说明，建议统筹另定范围。本批只在docs20风险摘要、docs21顶部和文档43澄清当前事实，不改产品/数据/平衡规则。

## 核验命令与限制

`git rev-parse HEAD`、`git status --short`、`git ls-files -z --cached --others --exclude-standard`、`git diff HEAD -- ...`只读；`python3 docs/evidence/CEU-20260907/Q-03/audit.py`退出0，输出见audit-command.txt。新脚本输出使用独占创建，默认再次运行拒绝覆盖。分类final修正仅纠正证据文本和缓存归类，不改旧证据。最终链接/哈希/保护核对记录见verification-command.txt。

本批不运行test/typecheck/build/页面/导出，不启动服务/浏览器或访问线上。来源全部已有匿名测试档及产品实际导出PNG，不含用户真实浏览器存档。真实手机/相册、其他浏览器/线上、旧客户端读v12及发布回退未测；现有小字、正常滚动、大包859.40kB和旧轨迹/平衡归因限制保留，决定人和阶段列在文档43。

HEAD 3f290407a299790665b58c4bc7c2bf8455d24bbd，SAVE/DATA12/12，package1.0.0。仅docs20/21、文档43和本目录变化，未提交/推送/部署，无代理。

唯一下一动作：用户转交Codex审核ASTRA-Q03。不开始Q-04或R。
