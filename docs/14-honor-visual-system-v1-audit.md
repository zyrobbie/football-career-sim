# 荣誉视觉系统 V1 验收

## 覆盖结论

当前运行时荣誉视觉注册表包含 **42 个唯一 key**，并对应 42 个本地 SVG：19 项联赛冠军、13 项国内杯赛冠军、4 项洲际俱乐部赛事冠军、世界杯、亚洲杯，以及金球奖、金靴、赛季最佳阵容、联赛最佳球员。

验收测试从 `competitionLabelsForClub()` 对 366 家运行时俱乐部的真实输出推导身份集合：19 个联赛、13 个国内杯赛、4 个洲际赛事。每个具体生产身份只命中一个视觉项；三项按类型匹配的个人奖项在全部当前联赛标签下均稳定命中各自共享图标。未知赛事仍回退为类别短标。

## 资产与安全

- SVG：42 个，60,540 bytes；最大单文件为 `csl-title.svg`（2,512 bytes）。
- 全部通过 Sharp 解析，并在 24、32、48、56、128px 完成栅格化。
- 静态检查确认没有 `text`、脚本、外链、嵌入位图或外部字体；所有路径唯一且未内联进主 JavaScript。
- 阿甲、巴西杯、法国杯、葡萄牙杯原先的画布边缘会承接主体笔画。本轮仅扩展其 SVG `viewBox` 留白以避免潜在裁切；没有改动任何 path、颜色或奖杯构图。

## 自动化结果

- 荣誉注册表、HonorBadge、聚合、导出定向测试：4 文件、36 项通过。
- 全量测试：43 文件、318 项通过。
- `generate:clubs:check`：通过（366 家俱乐部参数与工作簿一致）。
- `verify:retirement-qr`：通过，二维码源文件哈希未改变。
- `npm audit --omit=dev`：0 个漏洞。

已删除 `src/styles/__tests__/creationMobileLayout.test.ts` 与 `src/styles/__tests__/specialEventLayout.test.ts` 中两条失效的 Node 导入 `@ts-expect-error` 注释；未修改测试逻辑、TypeScript 配置或生产代码。随后 `npm run typecheck` 与 `npm run build` 均通过。

## 聚合口径

聚合键为 `scope + type + competitionLabel`。相同意甲冠军显示为“意甲冠军 ×N”；不同联赛、不同 scope 不合并。按俱乐部汇总先过滤 `clubId`，不会把另一支俱乐部的奖项带入小结。半年报告仍逐项显示当窗口新荣誉；履历页与退役档案显示聚合后的“图标＋名称＋×N”。

## 本地浏览器验收

在隔离 origin `http://127.0.0.1:4187/__honor-visual-audit` 中，以临时内存状态实际挂载正式 `HalfYearReportScreen`、`CareerHistoryScreen` 与 `RetirementScreen`。夹具包含全部 42 项视觉身份和一项重复意甲冠军，验收后已删除，未读取、覆盖或删除任何既有浏览器存档。

| 页面 | 390×844 | 1280×720 | 已知荣誉短标降级 |
| --- | --- | --- | --- |
| 半年报告 | 43 个资产图标（含重复项），390/390，无横向溢出 | 43 个，1280/1280 | 0 |
| 履历 | 42 个聚合图标，意甲显示 ×2，390/390 | 42 个，1280/1280 | 0 |
| 退役档案 | 42 个聚合图标与三组 scope，390/390 | 42 个，1280/1280 | 0 |

本地验收页控制台没有生产组件的新增 error/warn。一次临时 PNG 桥接器的跨端口响应头缺失曾产生夹具 fetch 错误；修正临时桥接后以新标签页重新验收，控制台为空。该桥接器及夹具均不在仓库中。

## PNG 与二维码

通过正式流程 `RetirementScreen → 保存我的生涯记录 → RetirementRecordExportActions → renderRetirementRecordPng()` 生成审核 PNG：

- `/tmp/honor-visual-system-v1-audit.png`
- PNG：2360 × 3698，8,727,280 像素，851 KB，小于 12,000,000 像素预算。
- Sharp 独立读取元数据并完整解码为 RGBA（4 通道）。
- 对完整 RGBA 使用 jsQR 解码，结果严格为 `https://zyrobbie.github.io/football-career-sim/`。
- 可见图标、名称、×N、三组荣誉与二维码完整；二维码页脚后无大块白边或深绿色空白。

## 边界与剩余风险

本次没有修改荣誉结算概率、比赛、成长、合同、转会、事件、国家队、GameState、存档、版本号、俱乐部数据、依赖或部署配置。

上述页面验证为本地桌面浏览器的指定响应式视口验收，不等同于真实设备。真实 iPhone Safari 与 Android Chrome 的触摸、内存和字体渲染仍应在发布前实机复验。
