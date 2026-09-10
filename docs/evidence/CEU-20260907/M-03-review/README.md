# M-03独立复核证据

2026-09-08。M-03验收通过，MR-03关闭，详见[文档33](../../../33-m03-acceptance-and-m04-instructions.md)。本目录不覆盖执行者产物。

- 独立定向使用M-03 README中的完整15文件命令，12:13:44，197项通过；`npm run typecheck`退出0。这两项为工具输出摘要，未另存原始终端日志。未重复全量/build，引用已核验哈希的最终r2日志510项及build通过。
- [哈希审计](hash-audit.json)：92项交付产物、650旧文件、635不变、15项声明变化含1构建缓存，457冻结证据及outputs保持。使用changed-files-final.json核对，不使用中间清单。该审计在本轮协调文档修改之前取得。
- [页面摘要](page-summary.json)：独立执行[主脚本](pages.cjs)和[补查脚本](pages-supplement-r2.cjs)，只改输出E到本目录，输入B和断言不改。输出[8组主流程](pages.json)、[12组补查](pages-supplement-r2.json)，36图全部与原交付同名图逐字节一致。
- 环境`http://127.0.0.1:4187/`，四视口1280×720、390×844、320×568、430×932，临时Chromium contexts。Browser plugin not available，使用现有Playwright，不安装依赖。首次沙箱Chromium MachPort失败发生在进入页面之前；获权后两脚本退出0。主机失败原始工具输出保留在本轮对话，此处为摘要。两脚本成功时无stdout，JSON和截图为实际结果证据。
- 主流程error为空；补查error/warning为空。脚本提供页面身份、遮罩、完整state、保存/刷新、导航、联赛上限、换生涯、稀缺市场及按钮中心命中/真实点击断言。服务器已停止。
- 本轮目视检查四张：[430保存](veteran-430-save-viewport-r2.png)、[320保存](veteran-320-save-viewport-r2.png)、[390报告返回](veteran-390-return-viewport-r2.png)、[1280首屏](veteran-1280-first-viewport-r2.png)。其余生成图未称独立逐张目视验收。430正常滚动后按钮可达，保留固定底栏在个别滚动位置覆盖内容的限制。

复跑脚本必须改E到新的不存在输出目录，保留B，不删除或覆盖本目录证据。没有访问用户存档/profile，未改生产代码，真实手机/Safari/Firefox/线上/旧客户端读v12均未执行。
