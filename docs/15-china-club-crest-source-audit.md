# 中国俱乐部原创队徽 V1：现实对应关系与配色来源审计

审计日期：2026-08-25。本文记录中国原创队徽 V1 的现实配色参考、原创边界与完成验收；不主张现实俱乐部继承、授权或官方关联。

## 结论先行

- 运行时目录中中国俱乐部共 **32 家**：中国顶级联赛 16 家、中国次级联赛 16 家。
- 32 家中国虚构俱乐部均已拥有本地原创 SVG：首批 4 枚、批量 A 14 枚、批量 B 14 枚均已完成正式 DOM 与正式退役 PNG 验收。
- `CLUB_CREST_MANIFEST` 共 40 条：32 条为可渲染的原创游戏资产，8 条为 `assetPath: null` 的现实俱乐部身份参考记录，不渲染真实队徽。
- 北京御华 → 北京国安为用户确认的唯一 `USER_CONFIRMED` 对应关系。
- 本审计现采用 `REFERENCE_APPROXIMATION`：参考用户指定现实俱乐部当前或指定历史时期的主／辅色，视觉接近即可；色值仅用于原创游戏俱乐部，不表述为现实俱乐部官方品牌色。最终取舍以用户对 SVG 成品的视觉审核为准。
- “对应关系较强”只说明游戏名称与城市、地域别称或现有职业俱乐部存在清晰的设计映射，**不等于**用户已确认，也不等于颜色已经可以使用。

## 审计口径

### 对应关系状态

| 状态 | 含义 | 数量 |
| --- | --- | ---: |
| `USER_CONFIRMED` | 用户已明确确认；含用户指定的产品视觉参考主体与时期 | 15 |
| `STRONG_MATCH` | 城市与地域别称、名称结构共同形成强映射；仍待用户确认 | 17 |
| `AMBIGUOUS` | 同城多队、历史继承或名称可指向多个主体 | 0 |
| `UNRESOLVED` | 无法可靠确定拟对应现实俱乐部 | 0 |

### 配色产品标准

| 状态 | 含义 | 数量 |
| --- | --- | ---: |
| `REFERENCE_APPROXIMATION` | 现实主体配色的产品视觉参考；不主张为官方品牌色 | 32 |

用于身份核对的官方页面包括：[北京国安官网](https://www.fcguoan.com/)、[上海海港官网](https://www.fcshanghaiport.com/)、[山东泰山官网](https://www.lnts.com.cn/club/39.html)、[成都蓉城官网](https://www.cdrcfc.com.cn/)。这些页面支持身份核对；本批色值均以 `REFERENCE_APPROXIMATION` 标注，而非现实主体官方色值。

## 首批 4 枚本地原创资产：仅记录，不作为现实配色来源

| 游戏 ID | 本地 SVG | 当前本地色值 | 审计结论 |
| --- | --- | --- | --- |
| `cn_shanghai_donggang` | `cn-shanghai-donggang.svg` | `#1D5AA6` / `#C91D2E` / `#F7F4EA` / `#10283F` | 上海申花／上海海港城市双色融合的原创纹章；蓝红仅为城市足球传统色彩参考，不主张现实俱乐部继承、合并、官方关联或品牌色。 |
| `cn_beijing_yuhua` | `cn-beijing-yuhua.svg` | `#08783E` / `#F6C81C` / `#F7F3E8` | 已废弃酒红金；绿黄京城方案，`REFERENCE_APPROXIMATION`。 |
| `chn1_shandong_taiyue` | `cn-shandong-taiyue.svg` | `#F58220` / `#173F86` / `#F7F4EA` | 橙蓝山岳方案，`REFERENCE_APPROXIMATION`。 |
| `cn_chengdu_jincheng` | `cn-chengdu-jincheng.svg` | `#B3202A` / `#F2BE32` / `#F7F3E8` | 红金文化纹样方案，`REFERENCE_APPROXIMATION`。 |

## 批量绘制 A：实际采用色值

以下均为 `REFERENCE_APPROXIMATION` 的原创游戏队徽色，不是现实俱乐部官方品牌色。

| 游戏俱乐部 | 现实配色参考 | 实际主／辅／中性色 | 原创地域主图 |
| --- | --- | --- | --- |
| 武汉江城 | 武汉三镇 | `#123D83` / `#F7F6EF` / `#D6A928` | 两江汇流、桥梁与江城水纹 |
| 天津津门 | 天津津门虎 | `#174D9C` / `#F7F6EF` / `#7E50A5` | 海河拱门与圆环 |
| 浙江钱潮 | 浙江职业 | `#126B43` / `#F2B830` / `#111C1B` | 钱塘潮、山水与拱桥 |
| 河南中原 | 河南足球俱乐部 | `#B9252E` / `#171A1D` / `#D5B65A` | 古鼎与黄河波纹 |
| 长春北辰 | 长春亚泰 | `#C72532` / `#171A1D` / `#F7F6EF` | 北斗星与冰晶感几何 |
| 大连滨城 | 大连实德（历史） | `#15549B` / `#F7F6EF` / `#0D2B55` | 灯塔、海浪与滨海天际线 |
| 青岛海湾 | 青岛海牛 | `#F18B24` / `#1761A8` / `#F7F6EF` | 栈桥帆形与海湾波纹 |
| 深圳鹏城 | 深圳新鹏城 | `#28AEE4` / `#123B7B` / `#F7F6EF` | 湾区天际线与城市速度线 |
| 重庆山城 | 重庆铜梁龙 | `#BF2330` / `#E7BC4C` / `#1C1A1B` | 两江、山城阶梯与轻轨横线 |
| 西安长安 | 陕西长安竞技（历史） | `#B92635` / `#173B75` / `#D9B956` | 城墙门楼与唐代几何 |
| 南京金陵 | 南京城市 | `#56449A` / `#D6B653` / `#F7F4EA` | 明城墙式天际线与长江波纹 |
| 广州南粤 | 广州队（历史） | `#C72331` / `#DDBA4C` / `#F7F4EA` | 广州塔、珠江波纹与木棉花瓣 |
| 广西联城 | 广西职业足球色彩印象 | `#E77D22` / `#1B1A19` / `#F7F4EA` | 喀斯特峰林与铜鼓圆心 |
| 云南山河 | 云南玉昆 | `#B72430` / `#1D1A1B` / `#D7B85C` | 雪山、梯田与山河层叠 |

## 完整 32 家审核表

色值均为 `REFERENCE_APPROXIMATION`，用于原创游戏队徽；不得写成现实俱乐部官方色。后续如需提升可审计性，可再记录官方页面或素材 URL、采样位置、HEX/RGB 与日期。

| 联赛 | 游戏 ID（workbook ID） | 游戏名称／短标 | 拟对应现实俱乐部 | 对应理由与歧义 | 对应状态 | 主色／辅色（HEX / RGB） | 来源类型／链接 | 地域元素候选 | 禁止直接复用元素 | 用户结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 顶级 | `cn_shanghai_donggang` (`chn1_shanghai_donggang`) | 上海东港／沪 | 上海申花／上海海港城市双色融合 | 用户确认的原创游戏城市双色设计；不代表两家现实俱乐部合并、继承、官方关联或授权。 | USER_CONFIRMED | 蓝 `#1D5AA6`／红 `#C91D2E`／米白 `#F7F4EA`／深轮廓 `#10283F` | REFERENCE_APPROXIMATION；城市足球色彩参考 | 港口吊机、江海交汇、桥梁天际线 | 两家现实主体的官方盾形、花形、鹰形、字母、字标及港口图形组合 | 产品参考已确认 |
| 顶级 | `cn_beijing_yuhua` (`chn1_beijing_yuhua`) | 北京御华／京 | 北京国安 | 用户明确确认。 | USER_CONFIRMED | 待官方取证 | UNVERIFIED；[官网](https://www.fcguoan.com/) | 城门、屋檐、银杏、工体外立面抽象 | 官方盾形、英文/汉字字标、既有足球与飘带组合 | 已确认对应；配色待官方取证 |
| 顶级 | `chn1_shandong_taiyue` (`chn1_shandong_taiyue`) | 山东泰岳／山 | 山东泰山 | “泰岳”与“泰山”同一地域山岳语义；名称结构明确。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；[官网](https://www.lnts.com.cn/club/39.html) | 泰山山脊、日出、黄河支流 | 官方盾形、泰山人物/文字、星形排列 | 山岳方向认可；配色待确认 |
| 顶级 | `cn_chengdu_jincheng` (`chn1_chengdu_jincheng`) | 成都锦城／蓉 | 成都蓉城 | “锦城”是成都别称，“蓉”短标与蓉城呼应。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；[官网](https://www.cdrcfc.com.cn/) | 太阳神鸟、锦江水纹、芙蓉 | 官方盾形、熊猫及其官方组合、队名字标 | 待确认 |
| 顶级 | `cn_wuhan_jiangcheng` (`chn1_wuhan_jiangcheng`) | 武汉江城／汉 | 武汉三镇 | 用户指定的产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 长江双桥、鹤、江汉汇流 | 官方盾形、字标、吉祥物 | 产品参考已确认 |
| 顶级 | `chn1_tianjin_jinmen` (`chn1_tianjin_jinmen`) | 天津津门／天 | 天津津门虎 | 名称直接同源，仅省去“虎”。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 海河、津门拱门、风筝魏抽象 | 虎头、官方盾形、条纹排列 | 待确认 |
| 顶级 | `chn1_zhejiang_qianchao` (`chn1_zhejiang_qianchao`) | 浙江钱潮／浙 | 浙江职业足球俱乐部 | “钱潮”指钱塘潮，浙江地域映射清晰。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 钱塘潮、拱宸桥、潮头 | 官方盾形、绿橙条纹、官方字标 | 待确认 |
| 顶级 | `chn1_henan_zhongyuan` (`chn1_henan_zhongyuan`) | 河南中原／豫 | 河南足球俱乐部 | 河南省域与“中原”别称直接对应。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 黄河、甲骨文抽象、嵩山 | 官方盾形、队名字标及官方图腾 | 待确认 |
| 顶级 | `chn1_changchun_beichen` (`chn1_changchun_beichen`) | 长春北辰／长 | 长春亚泰 | 城市一致；“北辰”是北方星象主题，并非现实名称直译。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 北斗、冰晶、长春市花君子兰 | 官方盾形、数字/字母、官方吉祥物 | 待确认 |
| 顶级 | `chn1_dalian_bincheng` (`chn1_dalian_bincheng`) | 大连滨城／大 | 大连实德（历史） | 用户指定的历史产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 海浪、灯塔、海鸥 | 官方盾形、字标、虎/船等组合 | 产品参考已确认 |
| 顶级 | `chn1_qingdao_haiwan` (`chn1_qingdao_haiwan`) | 青岛海湾／青 | 青岛海牛 | 用户指定的产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 栈桥、帆船、海湾、海鸥 | 牛、官方盾形、字标组合 | 产品参考已确认 |
| 顶级 | `chn1_shenzhen_pengcheng` (`chn1_shenzhen_pengcheng`) | 深圳鹏城／深 | 深圳新鹏城 | “鹏城”是深圳别称，名称直指当前主体。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 大鹏展翅、湾区天际线、红树林 | 官方盾形、鹏鸟官方轮廓、字标 | 待确认 |
| 顶级 | `chn1_chongqing_shancheng` (`chn1_chongqing_shancheng`) | 重庆山城／渝 | 重庆铜梁龙 | 用户指定的产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 两江汇流、山城阶梯、轻轨桥 | 龙形、官方盾形、字标 | 产品参考已确认 |
| 顶级 | `chn1_xian_changan` (`chn1_xian_changan`) | 西安长安／西 | 陕西长安竞技（历史） | 用户指定的历史产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 城墙、雁塔、唐纹、石榴 | 官方徽记 | 产品参考已确认 |
| 顶级 | `chn1_nanjing_jinling` (`chn1_nanjing_jinling`) | 南京金陵／宁 | 南京城市 | “金陵”是南京别称；名称与南京城市地域定位高度一致。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 城墙、梧桐、长江大桥、金陵云纹 | 官方盾形、字标、吉祥物 | 待确认 |
| 顶级 | `chn1_guangzhou_nanyue` (`chn1_guangzhou_nanyue`) | 广州南粤／穗 | 广州队（历史） | 用户指定的历史产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 五羊、珠江、骑楼、木棉 | 官方盾形、动物、条纹、字标 | 产品参考已确认 |
| 次级 | `cn_guangxi_liancheng` (`chn2_guangxi_liancheng`) | 广西联城／桂 | 广西平果等 | 广西地域明确；游戏名未直接指向现有单一主体。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 喀斯特峰林、壮锦、铜鼓 | 官方盾形、字标及民族图腾的官方组合 | 待确认 |
| 次级 | `cn_yunnan_shanhe` (`chn2_yunnan_shanhe`) | 云南山河／滇 | 云南玉昆 | 省域与山地语义对应，现有主体识别较强但非同名。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 雪山、梯田、孔雀、茶马古道 | 官方盾形、字标、动物官方轮廓 | 待确认 |
| 次级 | `chn2_liaoning_tiecheng` (`chn2_liaoning_tiecheng`) | 辽宁铁城／辽 | 辽宁铁人 | “铁城／铁人”与辽宁地域组合明显。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 钢铁炉火、工业齿轮抽象、辽河 | 官方盾形、字标及人物图形 | 待确认 |
| 次级 | `chn2_shijiazhuang_yanzhao` (`chn2_shijiazhuang_yanzhao`) | 石家庄燕赵／石 | 石家庄功夫 | 城市一致，“燕赵”为河北文化语义；现实名称不同。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 赵州桥、燕赵纹样、太行山 | 官方盾形、功夫人物或字标 | 待确认 |
| 次级 | `chn2_suzhou_wumen` (`chn2_suzhou_wumen`) | 苏州吴门／苏 | 苏州东吴 | “吴门／东吴”同属苏州吴地文化，映射清晰。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 园林窗棂、拱桥、太湖石 | 官方盾形、字标、官方建筑组合 | 待确认 |
| 次级 | `chn2_wuxi_taihu` (`chn2_wuxi_taihu`) | 无锡太湖／锡 | 无锡吴钩 | 城市一致；“太湖”地域强，“吴钩”是另一吴文化称谓。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 太湖波纹、鼋头渚、江南屋脊 | 官方盾形、吴钩兵器字形、字标 | 待确认 |
| 次级 | `chn2_nantong_jianghai` (`chn2_nantong_jianghai`) | 南通江海／通 | 南通支云 | “江海”对应南通江海门户；非同名但地域设计意图清晰。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 长江入海口、海门大桥、云浪 | 官方盾形、云纹/海浪官方组合、字标 | 待确认 |
| 次级 | `chn2_hefei_luzhou` (`chn2_hefei_luzhou`) | 合肥庐州／合 | 安徽九方（历史） | 用户指定的历史产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 逍遥津、巢湖、庐州城门 | 官方徽记 | 产品参考已确认 |
| 次级 | `chn2_foshan_lingnan` (`chn2_foshan_lingnan`) | 佛山岭南／佛 | 佛山南狮 | 用户指定的产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 醒狮、岭南窗花、陶瓷 | 南狮官方头部轮廓、官方盾形、字标 | 产品参考已确认 |
| 次级 | `chn2_meizhou_jiaying` (`chn2_meizhou_jiaying`) | 梅州嘉应／梅 | 梅州客家 | “嘉应”为梅州旧称，映射清晰。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 围龙屋、客家围屋、梅花 | 官方盾形、客家字标、官方建筑组合 | 待确认 |
| 次级 | `chn2_xiamen_ludao` (`chn2_xiamen_ludao`) | 厦门鹭岛／厦 | 厦门蓝狮（历史） | 用户指定的历史产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 白鹭、鼓浪屿、海湾 | 官方徽记 | 产品参考已确认 |
| 次级 | `chn2_ningbo_yongjiang` (`chn2_ningbo_yongjiang`) | 宁波甬江／甬 | 宁波职业 | 用户指定的产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 甬江、天一阁、港桥 | 官方徽记 | 产品参考已确认 |
| 次级 | `chn2_shaanxi_qinling` (`chn2_shaanxi_qinling`) | 陕西秦岭／陕 | 陕西联合 | 省域与秦岭意象同向，能对应陕西联合但仍非同名。 | STRONG_MATCH | 待官方取证 | UNVERIFIED；— | 秦岭山脊、城墙、朱鹮 | 官方盾形、字标、官方动物组合 | 待确认 |
| 次级 | `chn2_guizhou_qianfeng` (`chn2_guizhou_qianfeng`) | 贵州黔峰／贵 | 贵州恒丰（历史） | 用户指定的历史产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 喀斯特峰林、苗绣、梯田 | 官方盾形、字标、民族图腾组合 | 产品参考已确认 |
| 次级 | `chn2_xinjiang_kunlun` (`chn2_xinjiang_kunlun`) | 新疆昆仑／新 | 新疆天山雪豹（历史） | 用户指定的历史产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 昆仑雪峰、胡杨、天山 | 官方徽记 | 产品参考已确认 |
| 次级 | `chn2_hohhot_qingcheng` (`chn2_hohhot_qingcheng`) | 呼和浩特青城／呼 | 内蒙古中优（历史） | 用户指定的历史产品视觉参考；不代表继承关系。 | USER_CONFIRMED | 参考近似，待绘制时定稿 | REFERENCE_APPROXIMATION；— | 草原、敕勒川、马头琴、青城门 | 官方盾形、字标、马匹图形 | 产品参考已确认 |

## 分流清单

### 可进入原创绘制审核的小样阶段

北京御华、上海东港、山东泰岳、成都锦城、天津津门、浙江钱潮、河南中原、长春北辰、深圳鹏城、南京金陵、广西联城、云南山河、辽宁铁城、石家庄燕赵、苏州吴门、无锡太湖、南通江海、梅州嘉应、陕西秦岭。

其中已进入本批样板的 4 家：

1. **北京御华**：北京国安绿黄的产品参考，使用原创城门与屋檐节奏。
2. **山东泰岳**：保留获认可的山岳方向，改为橙蓝产品参考。
3. **成都锦城**：使用独立的红金文化纹样，避免熊猫与官方盾形。
4. **上海东港**：采用左蓝右红的城市双色纹章，以米白港口吊机、江海波纹跨越中线，明确区别于成都的红金文化纹样。

### 已按用户指定解决的产品参考关系

武汉江城→武汉三镇、大连滨城→大连实德（历史）、青岛海湾→青岛海牛、重庆山城→重庆铜梁龙、广州南粤→广州队（历史）、佛山岭南→佛山南狮、贵州黔峰→贵州恒丰（历史）、呼和浩特青城→内蒙古中优（历史）、西安长安→陕西长安竞技（历史）、合肥庐州→安徽九方（历史）、厦门鹭岛→厦门蓝狮（历史）、宁波甬江→宁波职业、新疆昆仑→新疆天山雪豹（历史）。这些仅是原创游戏队徽的产品视觉参考，不表述为现实俱乐部继承关系。

## 下一步受控要求

用户确认各歧义主体后，后续工作仅可按单俱乐部执行以下顺序：

1. 固定现实产品视觉参考与采用时期；
2. 选择 `REFERENCE_APPROXIMATION` 主／辅色，并记录其仅为游戏原创资产色；
3. 审核“禁止复用元素”；
4. 绘制原创 SVG 并交由用户审核。

审计与绘制均未下载、保存或嵌入任何现实俱乐部 Logo。当前 32 枚中国本地 SVG 均为原创游戏资产；中国运行时俱乐部不再使用文字短标兜底。海外俱乐部仍保持既有文字短标。

## 32 枚本地原创资产的徽章与主图腾审计

批量 A 已废止“外轮廓必须唯一”的试验性规则。以下信息只服务于视觉审核：每枚都使用完整、封闭的足球队徽边界；差异化集中于内部 `primaryMotif`，而不是把城市图形直接当作徽章轮廓。

| 游戏俱乐部 | badgeShape | primaryMotif | 实际配色 | 用户审核状态 |
| --- | --- | --- | --- | --- |
| 北京御华 | `SHIELD` | 城门屋檐 | `#08783E` / `#F6C81C` / `#F7F3E8` | 已锁定 |
| 山东泰岳 | `SHIELD` | 山岳山脊 | `#F58220` / `#173F86` / `#F7F4EA` | 已锁定 |
| 成都锦城 | `ROUND` | 太阳神鸟文化纹样 | `#B3202A` / `#F2BE32` / `#F7F3E8` | 已锁定 |
| 上海东港 | `HERALDIC_SHIELD` | 港口吊机与江海波纹 | `#1D5AA6` / `#C91D2E` / `#F7F4EA` / `#10283F` | 已锁定 |
| 武汉江城 | `SHIELD` | 两江汇流＋跨江桥 | `#123D83` / `#F7F6EF` / `#D6A928` | QA 已通过（DOM／PNG） |
| 天津津门 | `ROUND` | 津门拱门＋海河圆环 | `#174D9C` / `#F7F6EF` / `#7E50A5` | QA 已通过（DOM／PNG） |
| 浙江钱潮 | `SHIELD` | 三层钱塘潮头 | `#126B43` / `#F2B830` / `#111C1B` | QA 已通过（DOM／PNG） |
| 河南中原 | `SHIELD` | 古鼎／中原青铜器＋黄河负形 | `#B9252E` / `#171A1D` / `#D5B65A` | QA 已通过（DOM／PNG） |
| 长春北辰 | `ROUND` | 北辰星＋冰晶分叉 | `#C72532` / `#171A1D` / `#F7F6EF` | QA 已通过（DOM／PNG） |
| 大连滨城 | `SHIELD` | 灯塔＋放射灯光＋海面 | `#15549B` / `#F7F6EF` / `#0D2B55` | QA 已通过（DOM／PNG） |
| 青岛海湾 | `SHIELD` | 主帆＋栈桥 | `#F18B24` / `#1761A8` / `#F7F6EF` | QA 已通过（DOM／PNG） |
| 深圳鹏城 | `ROUND` | 城市天际线＋速度折线 | `#28AEE4` / `#123B7B` / `#F7F6EF` | QA 已通过（DOM／PNG） |
| 重庆山城 | `SHIELD` | 山城层叠＋轻轨穿行 | `#BF2330` / `#E7BC4C` / `#1C1A1B` | QA 已通过（DOM／PNG） |
| 西安长安 | `SHIELD` | 城墙垛口＋雁塔 | `#B92635` / `#173B75` / `#D9B956` | QA 已通过（DOM／PNG） |
| 南京金陵 | `SHIELD` | 长江桥拱＋梧桐叶 | `#56449A` / `#D6B653` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 广州南粤 | `ROUND` | 广州塔抽象＋珠江 | `#C72331` / `#DDBA4C` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 广西联城 | `SHIELD` | 喀斯特峰林＋铜鼓太阳纹 | `#E77D22` / `#1B1A19` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 云南山河 | `SHIELD` | 雪山＋梯田层级 | `#B72430` / `#1D1A1B` / `#D7B85C` | QA 已通过（DOM／PNG） |

## 批量 B：次级联赛 14 枚原创徽章

全部为 `REFERENCE_APPROXIMATION`：色值用于原创游戏资产，仅参考对应现实俱乐部的色彩印象，不表述为官方品牌色、继承关系或授权。

| 游戏俱乐部 | 现实配色参考 | badgeShape | primaryMotif | 实际主辅色 | 当前审核状态 |
| --- | --- | --- | --- | --- | --- |
| 辽宁铁城 | 辽宁铁人 | `SHIELD` | 钢铁桁架＋炉火 | `#B6212B` / `#171A1D` / `#D6B653` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 石家庄燕赵 | 石家庄功夫 | `ROUND` | 赵州桥单孔石拱＋燕赵回纹 | `#18529D` / `#D6B653` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 苏州吴门 | 苏州东吴 | `SHIELD` | 园林月洞门＋太湖石 | `#B62431` / `#171A1D` / `#D6B653` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 无锡太湖 | 无锡吴钩 | `ROUND` | 镂空太湖石＋湖面倒影 | `#1961A8` / `#E45B36` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 南通江海 | 南通支云 | `SHIELD` | 南通板鹞风筝＋江海风线 | `#51499B` / `#E47C32` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 合肥庐州 | 安徽九方（历史） | `SHIELD` | 巢湖水滴＋银鱼负形 | `#1C5CA8` / `#F1C534` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 佛山岭南 | 佛山南狮 | `ROUND` | 原创醒狮面具＋岭南窗花 | `#167348` / `#D7B448` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 梅州嘉应 | 梅州客家 | `SHIELD` | 客家围龙屋俯视结构 | `#B72735` / `#174C91` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 厦门鹭岛 | 厦门蓝狮（历史） | `ROUND` | 白鹭＋鼓浪屿海浪 | `#1762A8` / `#F18B24` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 宁波甬江 | 宁波职业 | `SHIELD` | 天一阁书页＋甬江水线 | `#185AA5` / `#28A9B5` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 陕西秦岭 | 陕西联合 | `SHIELD` | 秦岭山脊＋朱鹮飞翼 | `#B92736` / `#163C79` / `#D9B956` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 贵州黔峰 | 贵州恒丰（历史） | `ROUND` | 苗族银饰冠形＋刺绣旋纹 | `#782B3C` / `#D2AA52` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 新疆昆仑 | 新疆天山雪豹（历史） | `SHIELD` | 胡杨树＋昆仑日轮 | `#E67928` / `#171A1D` / `#F7F4EA` | QA 已通过（DOM／PNG） |
| 呼和浩特青城 | 内蒙古中优（历史） | `ROUND` | 马头琴＋草原地平线 | `#176E69` / `#D4B453` / `#F7F4EA` | QA 已通过（DOM／PNG） |

## V1 正式验收证据

- 正式履历页与退役页在 390×844、1280×720 均为 `asset = 32`、`fallback = 0`；32 个队徽图片全部完成加载。
- 正式退役 PNG 为 `1793×6633`、11,892,969 像素、990,191 bytes；Sharp 完整 RGBA 解码成功，jsQR 解码为 `https://zyrobbie.github.io/football-career-sim/`。
- PNG 包含 32 家俱乐部与全部原创多色队徽；最后一家履历、二维码、页脚边框和扫码文案完整，二维码后无大块白边或深绿边。
