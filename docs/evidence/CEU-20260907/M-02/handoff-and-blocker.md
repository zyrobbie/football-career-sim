# M-02接口与统筹待决事项

## MR-05：受控稀缺到期市场的持久化阻塞

**不能将稀缺到期市场端到端可用标为通过。** 本批允许改生成引擎、不允许改save.ts/gameStore生产动作，因此保留阻塞交统筹，未擅自转入M-03或修改版本。

复现来源：M-01/generated-r4/fixtures/expiry.json的合法当前状态，仅在测试模块中把俱乐部目录依赖收窄为现队＋0/1/2个外部候选；实际调用generateContractExpiryOffers得到续约1＋外部0/1/2。将生成结果放回该原状态并调用真实validateGameState，结果phase从TRANSFER_WINDOW变PRO_STAGE_COMPLETE，transferOffers清空。

原因：src/persistence/save.ts的validExpiryMarket仍要求renewals.length===1、externalOffers.length===3、uniqueExternalClubs.size===3。此逻辑在本批前已存在，本批未改。证据在pool-connections.json的existing-persistence-scarcity-0/1/2，包含完整构造输入和实际校验结果。用例位于ceuMarketPoolConnection.test.ts，明确是已知失败行为，不是“校验成功即产品通过”。

本次静态目录、E-03和47组正常输入未触发该稀缺持久化路径；8份冻结存档恢复及后继全通过。受控生成器算法和到期包装的0/1/2候选测试通过，仅证明生成层正确，不能替代持久化支持。

最小建议（**未执行，需统筹授权归批**）：在适当的存档/市场整合批中允许到期外部0–3并按实际长度校验去重，保留一份现队续约、有效选中项与年龄限制；再验证saveGame/loadGame/store完整往返。不得只删除旧恢复保护，也不需要本批擅自加存档字段。是否放入M-03或要求M-02返工由Codex决定。

## M-03仍未完成

MR-03四类行为继续存在：到期回看重抽、空市场经合法失约入口重抽、普通市场恢复被节奏拒绝、普通空市场恢复被节奏拒绝。本批仅改新生成输出，未改phase/window/报价复用。方向编辑动作、保存幂等、完整报价与谈判保护、空数组也算已生成、回看语义均未实现。

生产接口保持generateTransferOffers / generateDomesticTransferOffers / generateContractExpiryOffers签名与TransferOffer结构不变。新增export qualifiesForAdultMarket(player,club)，以及真正被生成器调用的selectTransferCandidates(input,candidatePool,domesticOnly=false)和TransferCandidate类型；后者保留目录顺序，以ID去重并排除现队。没有生产测试开关或目录改动。

不得重启M-01采集；旧存档以原始envelope直接读取。M-02结果由CEU_M02_EVIDENCE=1首次独占写入，当前目录已存在，复跑测试须不带开关。

唯一下一动作：**用户转交Codex审核M-02**。
