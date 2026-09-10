# 实际命令与原始日志

- 本地服务：`npm run dev -- --host 127.0.0.1 --port 4199 --strictPort`；server.txt。仅本机origin，临时无profile Chromium，非本地请求拒绝。
- 修改前：`R1_MODE=before node docs/evidence/CEU-20260907/Q-02-R1/pages.cjs`，before-command.txt，退出0，六组；两主尺寸真实导出。修改后同命令R1_MODE=after，after-command.txt，退出0，六组真实导出。两个browser及全部context由finally关闭。
- 离线：`node docs/evidence/CEU-20260907/Q-02-R1/check.cjs`，check.txt，退出0。实际PNG原分辨率RGBA→jsQR；无QR裁切、重绘或线上访问。另输出目视用分段图。
- 定向：`python3 docs/evidence/CEU-20260907/Q-02-R1/run-check.py targeted npm run test:run -- src/export/__tests__/retirementRecord.test.ts src/components/__tests__/RetirementRecordExportActions.test.tsx src/components/__tests__/HonorBadge.test.ts src/screens/__tests__/RetirementScreen.test.ts`。4文件35项通过。
- `python3 docs/evidence/CEU-20260907/Q-02-R1/run-check.py typecheck npm run typecheck`，退出0。
- `python3 docs/evidence/CEU-20260907/Q-02-R1/run-check.py build npm run build`，退出0。

工程原始日志及开始时间/完整参数/退出码分别保留于*.txt和*-command.json。浏览器逐动作与保存见before/after/result.json（10/18次真实点击，共28次；继续生涯12次，生成8次，关闭8次）。无新增半年、无store写入代替操作。

服务收尾Ctrl-C，进程退出130（主动关闭，非测试失败）。无依赖安装、新正式测试或全量重跑；核验Q01全量日志/源码身份后复用716项。build保留859.40kB主包及>500kB警告。本批没有测试失败或主机重试。

脚本独占证据目录，pages默认不采集、已存在mode目录拒绝；check在任何分段产物前独占创建comparison.json，重复运行会拒写。不得删除目录或覆盖旧产物以重跑。
