# 命令与结果

以下工程日志是本批既有运行，本次收口只读核对，没有重跑或改写日志。

| 命令 | 退出码 | 原始输出 |
|---|---|---|
| KMM_P1A_COLLECT=1 KMM_P1A_SOURCE_SHA=$(shasum -a 256 src/data/keyMatchMomentTemplates.ts \| cut -d ' ' -f1) npx vitest run src/engine/__tests__/keyMatchMomentCatalogue.test.ts src/store/gameStore.keyMatchMoment.test.ts | 0 | targeted.log，37通过 |
| npm run test:run | 0 | full.log，77文件784通过 |
| npm run typecheck | 0 | typecheck.log |
| npm run build | 0 | build.log，951.12kB警告 |
| node /tmp/KMM-20260913-P1-A/pages.cjs | 0 | pages.log及归档results.json，5例 |
| node /tmp/KMM-20260913-P1-A/scroll.cjs | 0 | 收口工具输出，无标准输出，新增320补图 |

复跑默认去掉KMM_P1A_COLLECT以只读运行测试。启用采集时目录校验SHA、wx拒覆盖原matrix。页面脚本输出目录必须改为全新目录；不改旧保护。closeout.py同样独占输出，正常复核读取现有manifest，不重复执行采集。
