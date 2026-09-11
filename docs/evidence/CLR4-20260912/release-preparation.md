# CLR4授权发布准备（2026-09-12）

用户明确要求推送，Codex转交授权本批精确提交、普通push main及既有Pages自动部署。Q已通过；本记录是准备时点，不冒称尚未执行的上线成功。

基线：main/远端main均为`6ca977ee452c9572db60ac0d229638071de1c705`。版本1.1.0、SAVE/DATA12/12不变。候选仅76SVG、clubCrests清单、两份相关测试、docs46/49及CLR4精简证据；不纳入旧证据/outputs/用户raw/tmp图。

回退标签：`rollback/clr4-20260912-before`，指向上述基线。发布后若确认需要回退，由统筹在干净分支使用`git revert <本批产品提交>`生成反向提交，审核精确路径后普通push；不得reset整个工作区或force push。独立候选反向演练记录在`/tmp/CLR4-20260912/release/rollback-drill.json`。素材不改存档，不因此证明旧客户端读回或存档降级。

工程735项/typecheck/build引用已验收候选，源码/依赖SHA未变；另在精确干净候选构建并比对产物，不重跑全部页面。最终产品提交、匹配Pages运行、线上76SVG/JS/CSS和隔离页面结果保存于本地`/tmp/CLR4-20260912/release/release-result.json`并回传统筹。CI可在GitHub仓库Actions按产品提交查询。避免为写入自身SHA追加循环文档提交。

保留890.48kB大包警告、真实手机/微信/Safari/相册未测及既有小字/正常滚动限制。线上抽验与本地全量分开记录。
