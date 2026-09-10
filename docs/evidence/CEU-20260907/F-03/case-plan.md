# F-03 预定有限计划（执行前）

六个store分支各推进**一个**新结算半年，然后验证新报告可进入合法下一决定即停：ordinary/PLAN，opportunity/MARKET→STAY，breach-no-opportunity/STAY，K09-breach-opportunity/STAY，到期MARKET→续约，到期MARKET→第一外部。最多6个新半年，无种子搜索。两主视口各补ordinary真实点击到新报告（各1），共8次计划观察，不超过12；定向/全量只读重放同输入不计新独特样本。不做第二个新半年、市场54窗或训练90窗。

原始源是F-01/results-final-r2的raw，先独立Storage无backup读取；expiry原STAGE加载后仅phase改REPORT，明确构造并实际save/load。相同seed/状态复用，不称六个自然独立样本。F-02已验证同原输入的单提交、29raw、令牌和门槛，本批先核验产物/源码身份后运行精准回归。

训练政策：trainingPlanView合法默认（低状态BODY_CARE）＋STEADY；事件首条合法路线及该路线首条合法选择；到队NONE。不修改phase推进。逐动作完整before/after及所有实际Storage写入data；计划/市场动作不变已结算事实，事件只执行一次，新history前缀及窗口对应正确。

每分支在报告提交后和新计划处分别检查旧报告回调/错误phase、过期窗口、错误生涯的无保存/随机；训练陈旧上下文无模拟。真实dblclick另记detail1/2和第二目标，不等同同报告回调。

页面1280×720、390×844：ordinary完整报告→计划→事件→新报告→合法下一步；expiry一步到市场并保留续约确认；失约两分支引用核验过F-02实页及本批store连续。320/430引用F-02新增区域，F-04再综合视觉。边界/令牌/国家队/旧档直接复用F-02精准用例；事件RESULT/READY复用F-01/T原档测试。
