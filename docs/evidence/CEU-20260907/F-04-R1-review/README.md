# ASTRA-F04-R1独立复核

2026-09-09，Codex。**补修通过，F04-V01关闭，F-04已完成，F专项收口；Q/R未开始。** [文档39](../../../39-f04-acceptance-and-q01-instructions.md)记录完整判断、范围与下一批指令。

- `hash-audit.json`：56交付产物、1462既有文件、1158冻结证据/outputs核验。151源码/测试仅main.css授权三条声明变化，移除三条后与补修前CSS哈希相等。
- `targeted.txt`/`targeted-command.json`：独立11文件181项退出0；`typecheck.txt`/命令退出0。本轮未重复全量/build，核验R1原日志与源码后复用build及F-03全量626，859.40kB警告保留。
- `pages.cjs`：原R1最终脚本只改新输出目录及4196端口，来源和断言保持。`R1_CAPTURE=after node docs/evidence/CEU-20260907/F-04-R1-review/pages.cjs`升级沙箱权限后退出0。
- `host-launch-note.txt`及空`after-launch-failed/`：首次沙箱内Chromium因MachPort Permission denied退出，未打开页面；一次权限重试成功，不算产品失败。
- `after/result.json`、`page-audit.json`：七组五尺寸、30真实点击，输入/每次点击/game/saved/最终状态与原R1记录相等；文案/字体与原before相等。环境文字完整、console无错误警告。两外部签约/一续约均到计划且刷新保存一致。
- 23截图中21张与原R1图字节相同。两张完成图有渐变/颜色等截图时点差异，已与原图目视比较；内容与按钮未见新增问题，状态相等，未独立诊断动画成因。实际目视9张本轮图，另3张原图作对照，清单见page-audit.json，不宣称全部重新目视。
- `final-protection.json`：统筹结束再次核验原交付、源码、全部冻结保护及本轮既有文档改动。

环境为本地4196、安装好的Playwright、隔离Chromium。Browser plugin not available；未安装依赖，未访问用户profile。服务/浏览器关闭。30次点击不是双击证明，重复输入不增加独特自然档数量。真实手机/其他浏览器/线上/旧客户端v12及回退未执行。

本轮仅docs20/21、新文档39与独立证据；未改生产。HEAD `3f290407a299790665b58c4bc7c2bf8455d24bbd`，SAVE/DATA12/12，未提交推送部署，无代理。
