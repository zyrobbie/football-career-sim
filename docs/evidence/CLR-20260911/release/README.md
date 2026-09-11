# 意甲20枚原创队徽已发布

2026-09-11。产品提交 [`d0e5565482d671224a11ea62f8f1509c07d27e57`](https://github.com/zyrobbie/football-career-sim/commit/d0e5565482d671224a11ea62f8f1509c07d27e57) 已由统筹普通推送main，[Pages运行34580160876](https://github.com/zyrobbie/football-career-sim/actions/runs/34580160876)构建与部署成功。[线上游戏](https://footballcareer.zyrobbie.site/)已提供20枚新意甲队徽。英超未接入，package1.1.0、SAVE/DATA12/12保持。

## 发布与核验

- 执行者 Astra 轻准备精确29文件：20SVG、清单、2份相关测试、docs46/47/48及精简发布记录。干净临时副本来自已跟踪基线加明确候选覆盖；72文件/722测试、typecheck、build全部通过。统筹独立核验23份生产/测试文件与验收版本一致、提交仅包含29文件。
- 统筹核验本次SHA对应Pages成功，普通URL的20枚SVG全部HTTP200且SHA与原件一致；首页JS `index-CqnJNu5T.js` 和CSS `index-DSx3aor_.css`与本地验收构建逐字节一致，中国两份代表图保持。详见[线上资源核验](coordinator-online-verification.json)。无随机查询参数绕过缓存。
- 统筹CUA对发布前已打开的线上入口普通刷新，JS从`index-BD1ydlda.js`更新到新文件，正文/title正常、无console warning/error；已打开的国米SVG普通刷新显示新图。[浏览器范围](coordinator-browser-verification.json)严格限于只读入口和直接资源，不访问或更改用户存档，不冒称完整线上生涯、真机或所有用户缓存已刷新。
- I-04已验收的1280/390/320页面、60图和实际退休PNG沿用本地证据；上线本轮未重新运行完整生涯/退休导出或真机相册检查。大包警告和已有窄屏小字/履历省略保留。

## 回退点

远端带说明标签 `rollback/clr-ita-20260911-before`：对象`0f956ce24ec0347e5de025fa1f7f604bcd74c161`，peeled基线`16b8ddf2c14dbc36f7832a58d96ab18da1b53825`。基线与此前部署321f747的生产树一致；原部署[34456233963](https://github.com/zyrobbie/football-career-sim/actions/runs/34456233963)，旧8图/清单SHA见[baseline.json](baseline.json)。标签已由统筹推送并远端核验，不只是本地备份。

[回退步骤](rollback.md)使用[明确23路径](rollback-files.txt)恢复基线，再普通提交推main，保留发布文档；12份新增图移除，8份旧图和清单/相关测试恢复。不改业务和存档，不force/reset。临时副本已验证原产品提交直接revert全树等于基线，并补验包含最终文档的白名单恢复；没有实际回退线上。精简结果见[回退验证](rollback-verification.json)。

## 授权、证据与交接

用户明确要求本轮推送部署并保留回退点。执行者首次远端写入被自动审批拒绝，完全未执行；统筹在持有原始用户授权的任务中创建并推送标签/main，操作获审通过。执行者完成本地发布提交及初始回退演练后，后续回复回到旧Q-03任务范围并停止；统筹完成部署、线上、最终回退检查及文档收口，没有要求用户重复确认，也没有修改旧CEU状态。

详细候选日志、I-04截图、匿名raw、保护清单及临时演练保留本地，未整体推入仓库；历史本地证据链接不保证远端可见。发布后纯文档收尾提交使用`[skip ci]`：main可比上述产品SHA多一个文档提交，实际部署仍以上述成功run和产品SHA为准。临时页面已关闭，未更改用户常用存档。
