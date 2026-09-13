# 精确发布与回退准备（未执行提交）

100条发布路径以release-files-final.json及release-paths.txt为准；包含版本、全部本升级已改跟踪文件、11个新增src文件、48个默认CI依赖（其中1个已跟踪）及必要文档。S0/before哈希核对表明本升级所改既有src在开工前与HEAD一致，不把其他未跟踪历史产物归为新功能。源码以现有工作树值入候选，未按HEAD误覆盖未提交KMM实现。

排除全部无关CEU/PSU/队徽旧截图、巨量audit outputs、node_modules、dist、所有不在明确清单的证据/临时产物。docs/evidence下只纳入默认测试实际依赖48份，不打包本次本地页面与300生涯轨迹。原跟踪HEAD里已存在的历史资料保持基线，非本次新增。README只更新版本候选与KMM入口，其余历史规则/资产叙述未在本批重审；本次资产清单没有改动。

干净候选构造：git archive HEAD +明确清单覆盖/新增，node_modules仅复用本机已安装目录的符号链接；没有拷贝全部脏工作区，也不声称新联网npm ci。默认796项、typecheck、build成功，说明所需未跟踪测试原档已精确携带。首次Python tarfile参数不兼容在解包前退出，新candidate-r2成功；原记录保留。干净构建后仅同步主台账收口文字，代码/测试/输入不变，最终SHA另记，不重复工程检查。

## 等待统筹口令后的步骤

1. 再核对HEAD、远端main及release-files-final逐文件SHA；若漂移先记录具体文件，不强推。
2. 按release-paths.txt逐条stage（含未跟踪必要输入），确认cached路径完全等于清单中相对HEAD实际差异，不用git add .。
3. 为V2.0基线7421b442983d27bc17f535cf741a7f065b1ee87e建立建议回退标记`rollback/pre-kmm-v2.5.0`，先检查同名标签，禁止覆盖。提交并推送main由统筹最终口令执行。
4. 确认远端commit与Pages build/deploy成功，再核对线上版本/资源身份、隔离匿名关键时刻及保存恢复。当前没有执行这些发布动作。

## 隔离回退演练

在/tmp隔离副本反向应用本次跟踪文件patch，删除仅清单新增文件；没有当前main/index/commit修改。810文件SHA与git archive基线完全相等，package2.0.0、SAVE/DATA12/12。第一次ls-tree中文文件名转义导致复制阶段停止，改用-z并新目录复跑成功；失败记录保留。此验证是源文件回退，不冒称完成线上切换或用户档降级。

V13当前档应先完整另存；独立career_save_v12_backup只保留升级前V12。旧客户端不能无损读回V13，使用V12备份会丢失升级后进度，不自动替换用户当前档。标签尚未创建，线上旧客户端读回与线上回滚未执行。
