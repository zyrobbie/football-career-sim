# CP-COMPACT-R2 发布记录

2026-09-11。仅求职方向区域微调，已上线；无英超或其他功能变更。统筹本地审图放行后，初次main推送被自动审批拒绝；没有绕过。用户随后在执行任务中直接回复“推送吧”，重新核验后获得审批并普通推送。

## 产品与部署

- 产品提交：`87d4e0ec93d4ea0d92de173b0de494968cfac1ed`；父提交：`13b38dd5a6dcf9cc22b7c3b33a557066268b8886`。
- 两文件：`src/components/CareerPreferencesEditor.tsx`、`src/styles/main.css`。箭头改独立“调整／收起”按钮；局部表单13px、hint12px，select/保存取消36px，联赛label36px；主题边框和紧凑密度与相邻区域协调。未改变方向、联赛上限、市场、回看、版本或存档逻辑。
- package `1.1.0`，SAVE/DATA `12/12`。
- [Pages 34589572180](https://github.com/zyrobbie/football-career-sim/actions/runs/34589572180)对应产品SHA，build/deploy成功。
- [线上游戏](https://footballcareer.zyrobbie.site/)普通URL：`index-BqHMsyP8.js` SHA `b02e4a61fa1d828d2e25d17dfd5c70ff4fd531db41d0cf24a04b76ccad945f92`；`index-BXyw3Raw.css` SHA `163aac24fbde1b940e63a09c6f950d97f2a972bef8c1c69df7b3d4fd3f20c41f`。均HTTP200，与干净候选逐字节相同，无cache-bust。
- 本记录后续独立skip-ci提交不改变部署产物。

## 验证与限制

干净父提交archive＋精确两文件候选：33项定向、72文件722项全量、typecheck、build通过。主JS863.80kB的>500kB警告保留；CI既有Actions Node20弃用/强制Node24运行注释保留，不在本批修改工作流。

本地7组：橙色320/390/430/1280、蓝色390、无报告320、市场390。实际按钮验证展开/收起/取消，计划和市场保存、第四联赛禁用、回看返回和刷新；完整game除两个当前方向字段外不变，报价谈判保持。统筹独立目视390/320/1280展开图并放行。执行者本地目视11图（含前图和初次市场图），其余仅生成图不冒称已看。

初次市场“保存”在最小滚动后中心被底栏覆盖，原失败日志保留；正常居中滚动后中心命中且真实保存通过。不能宣称任意滚动位置无遮挡或首轮全部通过。

本批线上隔离Chromium390×844/1280×720：新context入口身份正确且正文非空，匿名构造样本继续→调整→取消→普通刷新→继续，保存字节保持；无console error/warning。四张线上截图全部目视，横条含框46px、展开密度与本地一致。未访问用户profile或真实存档。临时浏览器和本地4269服务均已关闭。

真实iPhone、微信内置浏览器、Safari等其他浏览器的原生select外观未测。未重跑全部生涯或全站视觉；设备和滚动限制不因本批发布而豁免。

## 回退

远端注释标签`rollback/cp-compact-r2-20260911-before`，对象`b3ebb25fc9f1b35fe72ec8c3744918a0c36ac39c`，指向父提交`13b38dd5a6dcf9cc22b7c3b33a557066268b8886`。临时副本执行revert --no-commit产品提交后完整树等于父提交，未真正回退主工作区或线上。

需要实际回退时另获授权，在干净独立checkout核对main和两文件没有后续改动；有漂移或冲突即停，不覆盖：

```sh
git fetch origin main --tags
git switch main
git merge --ff-only origin/main
git revert --no-edit 87d4e0ec93d4ea0d92de173b0de494968cfac1ed
npm run test:run
npm run typecheck
npm run build
git push origin main
```

本产品提交不含文档，因此后续纯记录应保留。回退需核验对应Pages成功和线上身份，不以push成功替代部署验证，不用reset/force。

## 审计与保护

全部原始证据仅本地：`/tmp/CP-COMPACT-R2-20260911/`，包括before-hashes/candidate/各command.json与日志、pages-result和market-recheck、online-assets、release-browser-result、visual-review、rollback、remote-tag、push-blocked及push-authorized。匿名fixture引用上一批路径，未复制真实存档入仓库。

2410份既有文件核验仅两处授权源码变化；既有证据/outputs/未跟踪资料不清理、不覆盖。本次只精确提交两文件和本发布记录，不把截图、raw、dist或所有证据纳入发布包。
