# 求职方向横向条修复发布记录

2026-09-11。用户在本任务直接回复“同意”，授权两文件修复提交、推送 main 和既有 Pages 自动上线。本次发布已完成；不包含英超或其他功能。

## 结果与身份

- 产品提交：`f2c7b305ff8b01472ab46dc4b3534eeae80359fa`；父提交：`e998268a898c9afbfdf376162879ab1cd2cec22f`。
- 只修改 `src/components/CareerPreferencesEditor.tsx` 和 `src/styles/main.css`：默认横向条，按需展开现有方向编辑器，保留回看报告。
- package `1.1.0`；SAVE/DATA `12/12`，业务规则、迁移、依赖及队徽未改。
- [Pages运行34586447545](https://github.com/zyrobbie/football-career-sim/actions/runs/34586447545)：对应本产品提交，build/deploy均成功。
- [线上入口](https://footballcareer.zyrobbie.site/)普通URL已验证：`index-Clae4tfX.js`、`index-QEkf2_FN.css`均HTTP200并与干净候选逐字节一致，无cache-bust。后续纯文档skip-ci提交不改变部署产物。

## 验证范围

干净临时候选由父提交archive加精确两文件形成：72测试文件、722项全量通过，typecheck/build通过。构建主JS 863.96 kB，大于500 kB警告保留。复用统筹本地320/390/430/1280页面、两主题、保存/取消/回看及市场报价保持的验收，不写成新一轮页面全量。

本批新增线上隔离Chromium：390×844、1280×720，入口非空/title正确，匿名构造样本继续→横向条展开→取消→普通刷新→继续；保存数据逐字节不变，控制台无error/warning，四张截图全部实际目视。默认条均46px；长表单正常滚动，未发现本次区域新增截断或遮罩。截图和匿名输入仅保存在本地临时证据，不发布真实存档。

初次资源探针因只匹配`/assets`而未识别实际`./assets`，有限修正探针后通过，未改生产。真实手机、其他浏览器、全部生涯流程和用户已有缓存均未覆盖；本次不新增全生涯或全站布局结论。临时浏览器已关闭，本批未启动本地服务。

## 回退

远端已核验的注释标签：`rollback/cp-compact-20260911-before`。
标签对象：`06b944c445a37efaa83b100b8dc0a3cc03bdf697`，指向父提交`e998268a898c9afbfdf376162879ab1cd2cec22f`。

临时副本已执行`git revert --no-commit f2c7b305ff8b01472ab46dc4b3534eeae80359fa`，完整索引树等于父提交树；未回退主工作区或线上。后续发布记录只修改本文，不触及两处产品路径，因此该revert保留记录。

如需实际回退，须另获授权，在干净独立checkout操作；先核对这两文件没有后续改动、远端main身份与预期一致。出现新改动或冲突即停止审查，不覆盖。

```sh
git fetch origin main --tags
git switch main
git merge --ff-only origin/main
git revert --no-edit f2c7b305ff8b01472ab46dc4b3534eeae80359fa
npm run test:run
npm run typecheck
npm run build
git push origin main
```

回退同样须等待对应Pages成功并核验线上资源，不使用reset/force push，不仅以push成功为上线依据。

## 证据与保护

完整命令、候选身份、前后哈希、回退演练、部署JSON和线上结果在本目录本地审计文件；本记录单独提交，原始日志/截图/匿名raw不自动进入发布范围。原页面证据位于`/tmp/career-preferences-compact-20260911/`，本目录保存引用SHA清单。

发布开始后2387份既有文件逐一SHA核验无变化（包括发布前已修改的两文件）；更早统筹259份src/public核验只有这两文件变化，其他257份不变。旧CEU/CLR证据、outputs和未跟踪资料均保留；无用户profile或真实存档访问。
