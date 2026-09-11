# CLR 意甲资产回退

基线：`16b8ddf2c14dbc36f7832a58d96ab18da1b53825`，生产与此前成功部署321f747一致。带说明tag `rollback/clr-ita-20260911-before` 已由统筹推送并核验远端peeled提交为上述基线。tag对象 `0f956ce24ec0347e5de025fa1f7f604bcd74c161`。

当前发布提交尚未创建，不能执行下列回退。发布后将占位符替换为**本批真实产品发布SHA**，不把纯文档skip提交当成产品提交：

```sh
git fetch origin main refs/tags/rollback/clr-ita-20260911-before:refs/tags/rollback/clr-ita-20260911-before
git switch main
git merge --ff-only origin/main
git revert --no-edit <CLR_ITA_RELEASE_COMMIT>
npm run test:run
npm run typecheck
npm run build
git push origin main
```

必须在独立、干净的发布副本操作，避免触碰用户正在开发的工作树。提交后等待新SHA对应Pages workflow成功，再核对普通线上URL。20资产变化整体反向应用：8旧图/旧清单恢复，12新图移除，相关测试恢复；组件、CSS、业务、SAVE/DATA及用户存档无需修改。

本批将先在临时副本进行 `git revert --no-commit` 演练，逐文件核对生产树与tag基线一致。演练不推送、不实际回退线上，不reset主工作树、不force push。遇到后续重叠提交冲突，停止并由统筹审定最小冲突解决范围，不能覆盖后续功能。
