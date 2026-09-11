# CLR 意甲发布记录

2026-09-11，发布准备进行中。已验收意甲20枚，英超未接入；产品版本1.1.0，SAVE/DATA12/12保持。资产批次用发布Git提交标识，不另改版本。

发布前main为 `16b8ddf2c14dbc36f7832a58d96ab18da1b53825`，实际成功部署提交 `321f747c3a06e41ed4fc2868778e0aa3a3d9134a`，两者生产树一致；原[Pages运行34456233963](https://github.com/zyrobbie/football-career-sim/actions/runs/34456233963)。原树和旧8图/清单SHA见 [baseline.json](baseline.json)。

远端回退tag `rollback/clr-ita-20260911-before` 已由Codex统筹创建并推送，annotated对象 `0f956ce24ec0347e5de025fa1f7f604bcd74c161`，peeled提交 `16b8ddf2c14dbc36f7832a58d96ab18da1b53825`。执行者首次远端操作被自动审批拒绝且未执行，随后由具有原始用户授权的统筹完成，未绕过审批。产品发布提交/部署结果仍待实际完成。

精确候选范围：20个意甲SVG、clubCrests.ts、2个直接测试、docs46/47/48与本目录精简README/rollback/baseline。没有把旧CEU、outputs、匿名raw、大量截图、临时脚本或整份未跟踪工作树打包。I-04页面、60图、实际PNG及本轮详细工程日志均保留本地，未随产品提交；网页仓库中的历史证据链接可能仅本地可见。

发布前执行统筹review/audit成功。精确29文件覆盖已跟踪基线的干净临时目录，72文件/722测试、typecheck、build全部通过，20份构建SVG与原件逐字节一致。当前线上旧8图与回退基线匹配。新部署、线上20SVG/浏览器及临时回退演练仍待执行；不把本地通过当作上线。日志与候选清单仅本地保留。

本地验证范围与限制沿用I-04：真实手机/相册、其他浏览器未测，旧窄屏小字/320履历省略/正常滚动保持；大包警告保留。线上当前尚未验证本批，缓存刷新范围不可泛化。

回退方法见 [rollback.md](rollback.md)。不使用reset/force push，不改写玩家存档。
