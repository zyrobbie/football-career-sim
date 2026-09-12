# PSU S4 精确候选 — 待统筹审核

S1–S3已验收；本批只准备精确候选、紧凑证据和回退，不改生产，不stage/commit/push用户仓库。统筹已独立完成并验收两条连续3半年实页（6窗55次点击），WP-09已验收，紧凑证据纳入候选；不计为执行者重跑。

候选：13个生产/测试/package文件＋必要PSU文档、固定输入、脚本及紧凑结果；逐文件SHA/bytes/用途见本地`candidate-manifest.json`。旧未追踪资料、outputs、dist、node_modules、运行日志和S3两份25MB JSON排除，原件保留本地。S3压缩结果2.55MB与25.38MB原件逐字节一致，原始来源与用途仍可追溯。历史artifact-hashes记录的是采集时完整清单，不意味着每个调试日志都要随候选发布。

[发布说明](release-notes.md)、[回退方案](rollback-plan.md)。候选清单和隔离验证日志是本地审核资料，不将循环引用的manifest或仍在增长的日志纳入产品提交。工程源码与S3最终SHA一致，S3 744/typecheck/build可复用；隔离候选另做独立完整工程检查和revert树比对，结果见本地`isolated-validation.json`。仅复用当前安装的同lock依赖，未重新联网npm ci；GitHub CI发布时仍会npm ci。

基线HEAD2570017，当前main无staged变更；远端main只读检查一致。拟定回退标签尚未创建。真实手机、其他浏览器/微信/Safari、相册未测；保留893.46kB大包警告。发布范围、连续体验和正式上线由统筹决定，本阶段不推送。

按S4续令通过共享文件与本任务final交付，不再尝试被自动审批拒绝的任务消息。当前唯一下一动作：统筹审核精确候选与连续体验，明确发布续令。

隔离构建实证：744项/typecheck/build通过，183个运行产物与S3逐字节一致；S3原dist中的两个.DS_Store为macOS目录元数据，干净候选自动不含，差异单列保留，未将它们加入候选。

审核脚本过程记录：全范围diff --check标出了原始日志末空行、Vite尾空格和.patch上下文空格，原始证据不修改；生产/脚本/Markdown检查通过。首次revert树已完全等于基线，收尾检查因测试依赖软链接显示为未跟踪而中断，已只移除/tmp中的软链接（不动原node_modules），保留日志。最终候选和回退验证见revert-drill.json。用户仓库始终无暂存。
