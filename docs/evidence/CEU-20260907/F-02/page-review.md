# 页面操作与目视结论

最终主脚本输出pages-r3：16组、30图，console error/warning均0。1280×720及390×844各普通、到期、无机会失约、有机会失约、自愿退役、国家队6组；320×568、430×932各失约按钮组和退役确认2组。普通/到期报告从2次变1次；必要市场/退役确认未删除。

真正双击另用pages-double：两主尺寸×普通/到期/两失约共8组，记录detail=1和detail=2两个真实click事件，16张图，写盘data与内存完全一致，报告事实及窗口符合一次推进。第二次点击发生在切换后的页面：桌面多落在静态区域；390到期/有机会失约落在已选续约/STAY卡。未产生额外签约、抽取、窗口或结算；不把第二个事件冒称再次调用同一报告按钮。重复报告动作无写盘由73项store测试单独验证。

每次点击先正常scrollIntoView，再检查按钮中心命中并执行真实click；仅种入匿名输入和读取状态使用模块探针，不用store调用替代操作。原raw先直读；expiry/optional/national为旧STAGE时仅在读取后明示构造phase=REPORT。所有完整输入/来源SHA/操作及最终状态在对应pages-result.json。

最终实际查看12张主图（下列清单），不是声称46张全部目视。桌面保持原报告两列与留白，主次按钮层级明确；窄屏职业末尾单列，摘要换行正常，320/430确认文字和按钮均可达，正常滚动后没有底栏覆盖点击中心。移动既有报告小字、长报告滚动、非任意滚动位置无遮挡的限制保持，不扩展视觉改造。

- pages-r3/K09-breach-opportunity-390-report.png
- pages-r3/national-390-report.png
- pages-r3/K09-breach-opportunity-320-report.png
- pages-r3/voluntary-430-report.png
- pages-r3/ordinary-1280-report.png
- pages-r3/expiry-390-report.png
- pages-r3/voluntary-1280-confirmation.png
- pages-r3/voluntary-390-confirmation.png
- pages-r3/voluntary-320-confirmation.png
- pages-r3/voluntary-430-confirmation.png
- pages-r3/ordinary-390-readonly.png
- pages-r3/K09-breach-opportunity-430-report.png

## 失败与修复

1. server.txt：沙箱listen EPERM，未进入页面；server-authorized.txt/后续server-r3.txt获扩大权限启动仅127.0.0.1:4192。
2. pages-initial.txt：沙箱Chromium MachPort权限拒绝，未进入页面；授权后新临时profile成功，不使用用户profile。
3. pages-r1操作通过但目视四图发现摘要被新增按钮组挤成逐字竖排。此版本不算页面通过；原30图保留。仅新增职业footer窄屏单列CSS修复。
4. pages-r2在首次刷新后模块探针读null（0完成组），没有覆盖旧结果。开发服务发生热更新，测试动态import与页面模块实例可能不一致；该原因是推断，不将其记为存档损坏。停止并干净重启服务后，同一输入/脚本pages-r3完整通过。源码最终状态下全量与构建均通过。
5. 早期脚本使用clickCount=2，不能据此证明两个click事件；已改为mouse.dblclick并记录事件，pages-double为有效双击证据。

最终Chromium context均关闭，本任务4192服务已停止。真实手机、Safari/Firefox、线上未执行；这些不是F-03/F-04专项验收结果。
