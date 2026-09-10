# M-01统筹复核证据

2026-09-07，结论及下一批指令见[文档30](../../../30-m01-review-and-m02-instructions.md)。本目录只记录统筹新增复核，不改执行者冻结目录。

- 独立定向命令：`npm run test:run -- src/store/gameStore.ceuM01.test.ts src/store/gameStore.ceuS0Baseline.test.ts src/engine/__tests__/transfers.test.ts src/store/gameStore.v1ClubWorkflows.test.ts`。21:10:18，4文件38项通过，退出0。`npm run typecheck`退出0；`python3 docs/evidence/CEU-20260907/M-01/audit.py`退出0。此处为工具输出摘要，未另存这三次运行的原始终端日志。
- [独立哈希审计](hash-audit.json)：72项产物哈希/字节、485项之前文件，483项不变，docs/20、21符合交付after哈希；HEAD核对通过。该结果为统筹修改台账之前的检查。
- [原始envelope直读检查源码](raw-envelopes.test.ts.txt)、[原始日志](raw-envelopes.txt)：8项通过。每例新Map/无backup，直接加载原字节并经过store恢复，再存再读完整状态一致；未访问浏览器。

复跑直读检查：将源码副本复制到项目根目录一个不存在的`ceu-m01-review-temporary.test.ts`，在根目录执行`npm run test:run -- ceu-m01-review-temporary.test.ts`，结束后删除本次临时副本。源码中的导入相对于项目根；不将证据目录加入日常测试扫描。本次已删除临时文件。

没有独立复跑全量/build/浏览器/真实手机，本批没有生产改动。已有38项负责公开后继流程；新增8项只补原始envelope不预先重存的读取验证。
