# 意甲队徽发布回退

可用远端回退标签：`rollback/clr-ita-20260911-before`。标签对象 `0f956ce24ec0347e5de025fa1f7f604bcd74c161`，对应基线提交 `16b8ddf2c14dbc36f7832a58d96ab18da1b53825`；生产代码与此前成功部署 `321f747c3a06e41ed4fc2868778e0aa3a3d9134a` 相同。

本次已上线产品提交：`d0e5565482d671224a11ea62f8f1509c07d27e57`。回退只恢复[23条生产/测试路径](rollback-files.txt)，保留发布文档、其他功能和用户存档。纯文档收尾后直接revert产品提交可能发生文档修改/删除冲突，所以采用明确白名单恢复、普通提交和推送；不reset、不force push。

以下命令是未来需要回退时使用，**本轮没有执行线上回退**。在新的终端、独立干净副本运行，任何错误立即停止。先验证远端标签仍指向上述完整基线SHA。

```sh
set -e
clr_rollback_dir=$(mktemp -d /tmp/clr-ita-rollback.XXXXXX)
git clone https://github.com/zyrobbie/football-career-sim.git "$clr_rollback_dir"
cd "$clr_rollback_dir"
git fetch origin tag rollback/clr-ita-20260911-before
test "$(git rev-parse rollback/clr-ita-20260911-before^{commit})" = 16b8ddf2c14dbc36f7832a58d96ab18da1b53825
git switch -c codex/rollback-clr-ita-20260911 origin/main

# 若这些路径已有后续修改（例如英超接入），立即停止并交统筹审查。
git diff --exit-code d0e5565482d671224a11ea62f8f1509c07d27e57 HEAD -- public/assets/clubs/crests src/data/clubs/clubCrests.ts src/data/clubs/__tests__/clubCrests.test.ts src/components/__tests__/ClubCrest.test.ts

git restore --source=refs/tags/rollback/clr-ita-20260911-before --staged --worktree --pathspec-from-file=docs/evidence/CLR-20260911/release/rollback-files.txt
git diff --cached --name-status
npm ci
npm run test:run
npm run typecheck
npm run build
git commit -m "revert: restore pre-CLR Italian club crests"
git push origin HEAD:main
```

推送后必须等待新提交对应Pages部署成功，再逐一核对8份旧意甲图/旧清单、12份新图的移除及正常页面。若远端期间前进，普通push应拒绝；不得force，重新审查变更。

临时演练包括：执行者从产品提交直接revert后完整树等于基线；统筹在保留最终文档状态的临时副本运行上述白名单restore，验证23条路径与基线一致、12新增图移除、文档保持。详细演练日志仅本地保留，精简结果见[README](README.md)。无需改写玩家存档，SAVE/DATA仍为12/12。
