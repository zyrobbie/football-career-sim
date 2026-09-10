# M-04独立统筹复核

2026-09-08，Codex；结论：M-04验收通过，M专项按批准范围收口。完整结论及下一批边界见[文档34](../../../34-m04-acceptance-and-f01-instructions.md)。

- `hash-and-summary-audit.json`：验收写入前核对56交付产物、877既有文件/584冻结与outputs；连续记录54窗/15市场/9分支；inputEnvelope为最终存档的字段语义核对。
- 定向16文件207项及typecheck本轮独立通过，原始输出在本会话工具结果，未另存完整原始日志。全量520/build只引用已核验的[M-04原日志](../M-04/README.md)，未在本轮重跑。
- `pages.cjs`、`pages-detail.cjs`：原脚本改输出至本目录，连续来源仍指M-04/results.json，原断言保持。使用本地4189与独立Chromium context，匿名数据，未读用户profile。本地服务和浏览器已关闭。
- `pages-result.json`、`pages-detail.json`及`page-summary.json`：5主组＋2补充CTA，25图逐字节一致。本轮实际查看四张代表图，文件名见page-summary；主5组console为空，补充2组未收集console。
- 1280/390/430本轮复跑，320复用既有核验证据。430正常滚动后可达，不承诺任意位置无遮挡。真实手机、其他浏览器、线上、旧客户端v12及发布回退未执行。

原M-04证据保持只读，本轮仅更新docs/20、21并新增文档34及本目录。HEAD和生产代码未变，未提交推送部署。
