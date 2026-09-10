# 命令、主机限制与运行记录

执行跨2026-09-09/10（Asia/Shanghai）；browser-commands.jsonl逐命令UTC时间可直接换算。没有安装依赖、启用历史采集或执行生成球队/二维码资源命令。

| 实际命令/调用 | 结果/退出码 | 原始记录 |
| --- | --- | --- |
| git rev-parse HEAD / git status --short | 0，预期HEAD | git-before/after.txt |
| npm run dev -- --host 127.0.0.1 --port 4197 --strictPort（沙箱） | 1，listen EPERM | server.txt |
| 同命令一次权限重试 | 服务启动成功；结束Ctrl-C退出130 | server-authorized.txt；exec session91904 |
| 已安装Playwright动态import index.mjs | 模块导出错误，没有页面动作 | 下方主机/脚本说明 |
| 改用createRequire载入已安装Playwright后，沙箱chromium.launch | MachPort Permission denied，浏览器未开页 | 下方说明；工具原始诊断 |
| Q02_CAPTURE=1 node docs/evidence/CEU-20260907/Q-02/browser.cjs（一次权限重试） | Chromium151.0.7922.34；9组完成；CLOSE后关闭browser，EOF退出0 | browser-commands.jsonl记录实际命令及脚本异常；逐action原始JSON、groups.json保存全部观察与页面console |
| node .../Q-02/qr-check.cjs > .../Q-02/qr-check.txt 2>&1 | 0；3份实际PNG解码目标一致 | qr-check.txt、qr-results.json |
| node scripts/verify-retirement-qr.mjs > .../Q-02/qr-source-verify.txt 2>&1 | 0；只读源SVG | qr-source-verify.txt |
| python3 .../Q-02/summarize.py > .../Q-02/summarize.txt 2>&1 | 0；9组统计与逐步保存/history断言 | summarize.txt、action-summary、image-inventory、raw-sources |
| Python只读检查64个未结算动作的history/lastReport/事件/国家队/draft | 0 | state-preservation.json |
| Python SHA核验Q01工程、F04/R1来源及本批前保护 | 0 | reuse-verification、protection-verification |

浏览器stdout由工具返回；本地持久化的是带UTC时间的实际输入命令/异常journal及每步完整状态记录，不伪造一份未捕获的stdout。浏览器控制过程的各断言异常若出现会进入journal；本轮唯一运行脚本异常是初次在AsyncFunction环境使用require时ReferenceError，发生在读脚本前、没有产品动作，随后读取flow.cjs并执行即恢复。一次较长TTY命令超过行缓冲，未进入journal且未执行；Ctrl-U清空后把原逻辑写入finish-desktop.js再执行，W仍46/n25验证无额外操作。未提高动作/半年上限，未回滚游戏或修改期望。

首次Node模块加载提示“The requested module './index.js' does not provide an export named 'default'”；改用安装路径createRequire，非安装新版本。沙箱Chromium诊断关键行为“bootstrap_check_in ... Permission denied (1100)”且SIGTRAP；后续仅一次权限启动，成功使用临时profile。与产品缺陷分开。

关闭：browser的CLOSE命令保留于journal，调用browser.close；EOF后进程退出0。服务Ctrl-C退出130；lsof本地4197无监听输出。ps进程列表因沙箱权限不可读，未为此升级遍历用户进程。没有用户profile、线上访问或持久浏览器上下文。

本批未新增正式测试，未重跑全量/typecheck/build。按用户允许，复用经SHA确认与当前源码/依赖一致的Q01最终71文件716项、typecheck、build日志；大包859.40kB警告保持。
