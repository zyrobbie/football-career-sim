# 命令与有限复跑

每条工程命令、退出码见对应*-command.json，原始stdout/stderr在同名.log。

- 定向：`npx vitest run src/engine/__tests__/keyMatchMomentCatalogue.test.ts src/store/gameStore.keyMatchMoment.test.ts`。首轮COLLECT环境开启、目录SHA验证、wx采集matrix成功，但残留size26失败；r2改数量后出现“前锋接球破门”关键词误判；r3补准确表达后37通过。r2/r3默认只读，不重写matrix。原矩阵目录SHA与最终源码相同。
- `npm run test:run`：77文件784通过（本批最终候选一次）。
- `npm run typecheck`、`npm run build`：exit0。962.89kB主包警告保留。
- `node /tmp/KMM-20260913-P1-B/pages.cjs`：exit1，前两例已完成，MID08正面固定30种子无命中。
- `node /tmp/KMM-20260913-P1-B/pages-r2.cjs`：exit0，仅后三例；MID08改为负面，同样30种子范围。
- `node /tmp/KMM-20260913-P1-B/scroll.cjs`：exit0，320说明滚动，无新增半年。

采集器run.py/run-r2.py/run-r3.py及页面脚本保留；正常测试不带KMM_P1B_COLLECT。重采必须使用新目录，不覆盖本批或旧证据。没有依赖安装，没有重跑S4审计。
