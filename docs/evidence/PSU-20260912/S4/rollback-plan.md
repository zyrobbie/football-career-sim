# V1.9 发布后回退方案

基线 `2570017bd4da05aa2c1db11b9ca4e70c98d40427`；已推送标签 `rollback/psu-v1.9-before` 指向该基线。产品提交为 `690de955bc69f295bce8f39cb359f0dbf2fd64ac`，随后还会有独立文档提交。

## 保留审计文档的正常回退

在最新正式HEAD的独立干净分支操作，先检查基线、发布提交及此后的代码变动。仅把正式产品提交相对其父提交的13个代码/正式测试/package路径差异反向应用到index，并形成新的正常回退提交。13路径由已批准candidate-manifest.json中purpose=production/test/package获得；先核对manifest SHA cbd2c8ee4252c566e8bb6a836d7d49cb3ff5b1d4452fd3775bf042b66df12506及路径数13，再生成 `git diff 690de95^ 690de95 -- <精确13路径>`，以 `git apply --reverse --index` 应用。

这会撤销本次引擎、文案、版本及对应测试，保留所有PSU审计文档和后续收口提交。检查src、public、package/lock与配置树等于基线，且文档SHA在回退前后不变；正常commit/push触发CI部署。不得reset、force-push或覆盖用户脏工作区。若发布后已有其他代码改动，先评估冲突和依赖，不能机械套用本演练。

另一选择是按逆序先revert后续文档提交，再revert产品提交，可恢复整个旧树，但会撤销新审计文档，不作为默认路线。仅对产品SHA直接做整提交revert可能与后续文档变化冲突，不应盲用。

隔离演练在/tmp副本模拟“正式产品提交＋这5份最终收口文档”后，反向应用13路径并验证生产树回基线、文档保留；实证见本地`docs-closeout/rollback-after-docs.json`。该演练不会修改用户仓库、线上或用户存档，也不代表线上已回退。

## 数据边界与验证

SAVE/DATA保持12/12；恢复旧代码不撤销已经结算的球员状态、比赛或收入，不把正常代码回退写成游戏历程回滚。保留v11原文备份，禁止删除或覆盖真实生涯。发布/回退后仍需检查CI、线上资产和代表性页面；真机、微信/Safari、相册未测试。893.46kB大包警告与有限样本的平衡限制保留。
