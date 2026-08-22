# 俱乐部与联赛数据库 V1 审核清单

> 状态：数据已审核并接入运行时目录、训练成长与转会市场；完整固定种子压力测试见 [第 10 号审计](10-full-career-balance-audit.md)。
> 数据快照：2026-08-13
> 范围：欧洲五大联赛前两级；荷兰、葡萄牙、比利时、日本、韩国、巴西、阿根廷顶级联赛；中国两级虚构联赛。

## 1. 总量与口径

| 区域 | 联赛数 | 俱乐部数 |
|---|---:|---:|
| 欧洲五大联赛顶级与次级 | 10 | 198 |
| 荷、葡、比顶级联赛 | 3 | 54 |
| 日、韩顶级联赛 | 2 | 32 |
| 巴西、阿根廷顶级联赛 | 2 | 50 |
| 中国虚构顶级与次级联赛 | 2 | 32 |
| **合计** | **19** | **366** |

本清单以当前真实参赛规模为准，不为了凑成“约350家”而删队。海外俱乐部仅使用名称、国家/地区和所属联赛；中国俱乐部全部虚构。参赛资格不会在玩家存档中逐赛季升降级，后续通过替换静态数据版本更新。

### 六档含义

1. 世界级豪门
2. 五大联赛强队／其他联赛顶级豪门
3. 五大联赛中游／欧洲次级联赛强队／南美强队
4. 五大联赛下游／亚洲强队／中国顶级豪门／五大联赛次级强队
5. 亚洲中游／中国顶级中游／欧洲次级联赛普通球队／南美普通球队
6. 中国次级联赛及其他低级别平台

档位表示综合职业平台，不直接等于训练质量、青训质量、工资或竞争难度。同档俱乐部仍使用独立的设施、青训、工资、曝光、一线队门槛和年轻球员倾向参数。

## 2. 英格兰（44家）

### Premier League（20）

- **T1（5）**：Arsenal、Chelsea、Liverpool、Manchester City、Manchester United
- **T2（3）**：Aston Villa、Newcastle United、Tottenham Hotspur
- **T3（7）**：AFC Bournemouth、Brentford、Brighton & Hove Albion、Crystal Palace、Everton、Fulham、Nottingham Forest
- **T4（5）**：Coventry City、Hull City、Ipswich Town、Leeds United、Sunderland

### EFL Championship（24）

- **T4（6）**：Burnley、Middlesbrough、Sheffield United、Southampton、West Ham United、Wolverhampton Wanderers
- **T5（18）**：Birmingham City、Blackburn Rovers、Bolton Wanderers、Bristol City、Cardiff City、Charlton Athletic、Derby County、Lincoln City、Millwall、Norwich City、Portsmouth、Preston North End、Queens Park Rangers、Stoke City、Swansea City、Watford、West Bromwich Albion、Wrexham

## 3. 西班牙（42家）

### LaLiga EA Sports（20）

- **T1（2）**：FC Barcelona、Real Madrid
- **T2（4）**：Athletic Club、Atlético de Madrid、Real Betis、Villarreal
- **T3（7）**：Celta de Vigo、Espanyol、Osasuna、Rayo Vallecano、Real Sociedad、Sevilla、Valencia
- **T4（7）**：Alavés、Deportivo La Coruña、Elche、Getafe、Levante、Málaga、Racing de Santander

### LaLiga Hypermotion（22）

- **T4（7）**：Almería、Girona、Granada、Las Palmas、Leganés、Mallorca、Real Valladolid
- **T5（9）**：Albacete、Burgos、Cádiz、Castellón、Córdoba、Eibar、Real Oviedo、Sporting de Gijón、Tenerife
- **T6（6）**：AD Ceuta、Andorra、Celta Fortuna、Eldense、Real Sociedad B、Sabadell

## 4. 意大利（40家）

### Serie A（20）

- **T1（3）**：Inter、AC Milan、Juventus
- **T2（4）**：Atalanta、Napoli、Roma、Como
- **T3（4）**：Bologna、Fiorentina、Lazio、Torino
- **T4（9）**：Cagliari、Frosinone、Genoa、Lecce、Monza、Parma、Sassuolo、Udinese、Venezia

### Serie B（20）

- **T4（6）**：Cremonese、Empoli、Hellas Verona、Palermo、Pisa、Sampdoria
- **T5（9）**：Avellino、Catanzaro、Cesena、Juve Stabia、L.R. Vicenza、Mantova、Modena、Padova、Südtirol
- **T6（5）**：Arezzo、Ascoli、Benevento、Carrarese、Virtus Entella

## 5. 德国（36家）

### Bundesliga（18）

- **T1（1）**：Bayern München
- **T2（4）**：Bayer Leverkusen、Borussia Dortmund、Eintracht Frankfurt、RB Leipzig
- **T3（4）**：Borussia Mönchengladbach、Freiburg、Hoffenheim、Stuttgart
- **T4（9）**：Augsburg、Elversberg、Hamburg、Köln、Mainz 05、Paderborn、Schalke 04、Union Berlin、Werder Bremen

### 2. Bundesliga（18）

- **T4（4）**：Bochum、Hertha BSC、St. Pauli、Wolfsburg
- **T5（12）**：Arminia Bielefeld、Braunschweig、Darmstadt 98、Dynamo Dresden、Greuther Fürth、Hannover 96、Heidenheim、Holstein Kiel、Kaiserslautern、Karlsruher SC、Magdeburg、Nürnberg
- **T6（2）**：Energie Cottbus、Osnabrück

## 6. 法国（36家）

### Ligue 1（18）

- **T1（1）**：Paris Saint-Germain
- **T2（3）**：AS Monaco、Marseille、Olympique Lyonnais
- **T3（6）**：Brest、Lens、Lille、Nice、Rennes、Strasbourg
- **T4（8）**：Angers、Auxerre、Le Havre、Le Mans、Lorient、Paris FC、Toulouse、Troyes

### Ligue 2（18）

- **T4（5）**：Metz、Montpellier、Nantes、Reims、Saint-Étienne
- **T5（11）**：Annecy、Clermont Foot、Dunkerque、Grenoble、Guingamp、Laval、Nancy、Pau、Red Star、Rodez、Sochaux
- **T6（2）**：Boulogne、Dijon

## 7. 荷兰（18家）

### Eredivisie（18）

- **T2（3）**：Ajax、Feyenoord、PSV
- **T3（4）**：AZ、NEC、Twente、Utrecht
- **T5（11）**：ADO Den Haag、Cambuur、Excelsior、Fortuna Sittard、Go Ahead Eagles、Groningen、Heerenveen、PEC Zwolle、Sparta Rotterdam、Telstar、Willem II

## 8. 葡萄牙（18家）

### Liga Portugal（18）

- **T2（3）**：Benfica、FC Porto、Sporting CP
- **T3（3）**：Braga、Famalicão、Vitória SC
- **T5（12）**：Académico de Viseu、Alverca、Arouca、Casa Pia、Estoril Praia、Estrela da Amadora、Gil Vicente、Marítimo、Moreirense、Nacional、Rio Ave、Santa Clara

## 9. 比利时（18家）

### Belgian Pro League（18）

- **T2（3）**：Anderlecht、Club Brugge、Union Saint-Gilloise
- **T3（3）**：Antwerp、Genk、Gent
- **T5（12）**：Cercle Brugge、Charleroi、Kortrijk、La Louvière、Lommel、Mechelen、OH Leuven、Sint-Truiden、Standard Liège、Waasland-Beveren、Westerlo、Zulte Waregem

## 10. 日本（20家）

### J1 League（20）

- **T4（10）**：Cerezo Osaka、Gamba Osaka、Kashima Antlers、Kashiwa Reysol、Kawasaki Frontale、Nagoya Grampus、Sanfrecce Hiroshima、Urawa Red Diamonds、Vissel Kobe、Yokohama F. Marinos
- **T5（10）**：Avispa Fukuoka、FC Tokyo、Fagiano Okayama、JEF United Chiba、Kyoto Sanga、Machida Zelvia、Mito HollyHock、Shimizu S-Pulse、Tokyo Verdy、V-Varen Nagasaki

## 11. 韩国（12家）

### K League 1（12）

- **T4（4）**：FC Seoul、Jeonbuk Hyundai Motors、Pohang Steelers、Ulsan HD
- **T5（8）**：Bucheon FC 1995、Daejeon Hana Citizen、FC Anyang、Gangwon FC、Gimcheon Sangmu、Gwangju FC、Incheon United、Jeju SK

## 12. 巴西（20家）

### Campeonato Brasileiro Série A（20）

- **T2（2）**：Flamengo、Palmeiras
- **T3（10）**：Atlético Mineiro、Botafogo、Corinthians、Cruzeiro、Fluminense、Grêmio、Internacional、Santos、São Paulo、Vasco da Gama
- **T5（8）**：Athletico Paranaense、Bahia、Chapecoense、Coritiba、Mirassol、Red Bull Bragantino、Remo、Vitória

## 13. 阿根廷（30家）

### Liga Profesional（30）

- **T2（2）**：Boca Juniors、River Plate
- **T3（9）**：Estudiantes de La Plata、Independiente、Lanús、Newell's Old Boys、Racing Club、Rosario Central、San Lorenzo、Talleres、Vélez Sarsfield
- **T5（19）**：Aldosivi、Argentinos Juniors、Atlético Tucumán、Banfield、Barracas Central、Belgrano、Central Córdoba、Defensa y Justicia、Deportivo Riestra、Estudiantes de Río Cuarto、Gimnasia La Plata、Gimnasia Mendoza、Huracán、Independiente Rivadavia、Instituto、Platense、Sarmiento、Tigre、Unión

## 14. 中国虚构联赛（32家）

中国队名只做现实城市与地域气质的改写，不使用现实俱乐部全名、队徽或品牌元素。

### 中国顶级联赛（16）

- **T4（7）**：上海东港、北京御华、山东泰岳、成都锦城、武汉江城、天津津门、浙江钱潮
- **T5（9）**：河南中原、长春北辰、大连滨城、青岛海湾、深圳鹏城、重庆山城、西安长安、南京金陵、广州南粤

### 中国次级联赛（16）

- **T6（16）**：广西联城、云南山河、辽宁铁城、石家庄燕赵、苏州吴门、无锡太湖、南通江海、合肥庐州、佛山岭南、梅州嘉应、厦门鹭岛、宁波甬江、陕西秦岭、贵州黔峰、新疆昆仑、呼和浩特青城

## 15. 同档差异化复核样本

这些样本用于后续数值表验收，避免“同档等于复制粘贴”。

| 对比 | 必须成立的差异 |
|---|---|
| Ajax vs 英超中游队 | Ajax青训与青年培养显著更高；英超队工资、曝光和一线队竞争更高 |
| 国际米兰 vs 中国顶级豪门 | 国际米兰训练质量、曝光和竞争门槛的领先幅度，至少不小于中国顶级豪门对中国次级队的领先幅度 |
| Ajax一线队轮换 vs 国际米兰青年队核心 | 综合成长效率前者不得更低；前者比赛经验更高，后者纯训练质量更高 |
| 同一俱乐部青年队 vs 一线队 | 一线队有稳定正式出场时成长更快；一线队零出场边缘球员不能稳定压过青年队核心 |
| 五大联赛降级队 vs 同国次级普通队 | 即使同处次级联赛，前者工资、曝光和阵容门槛通常更高 |

## 16. 队徽资产边界

队徽清单独立于 Club 与存档：`canonicalClubId`、资源路径、来源、授权状态和审核日期均只保存在只读资产层。当前已有12家样板记录：上海东港、北京御华、山东泰岳、成都锦城四家中国虚构俱乐部使用原创 SVG；八家真实俱乐部只保留可审计的官方身份参考，因商标授权待明确而不嵌入运行时队徽文件。

因此，绝大多数俱乐部仍使用 `shortMark` 文字回退。删除某个队徽文件不会影响存档、俱乐部身份或游戏逻辑；真实队徽不能因项目非商业化而视为可自由复制。

## 17. 数据来源与证据边界

优先使用各联赛官网的2026/27俱乐部页、赛程页或准入名单。阿根廷使用AFA文件确认30队规模，再以公开赛程名单补全队名；中国名单是本项目虚构设计。档位是游戏平衡判断，不是联赛官方评级。

- 英格兰：[Premier League 2026/27赛季构成](https://www.premierleague.com/en/news/4673099/the-202627-premier-league-season-officially-starts/)、[EFL 2026/27赛季说明](https://www.efl.com/news/2026/may/29/everything-you-need-to-know-about-the-2026-27-efl-season/)
- 西班牙：[LaLiga EA Sports俱乐部](https://www.laliga.com/en-US/laliga-easports/clubs)、[LaLiga Hypermotion俱乐部](https://www.laliga.com/en-GB/laliga-hypermotion/clubs)
- 意大利：[Serie A 2026/27二十队](https://en.legaseriea.it/serie-a/news/looking-forward-to-the-2026-27-serie-a-fixture-list)、[Serie B俱乐部](https://www.legab.it/seriebkt/squadre)
- 德国：[Bundesliga俱乐部](https://www.bundesliga.com/en/bundesliga/clubs)、[2. Bundesliga俱乐部](https://www.bundesliga.com/de/2bundesliga/clubs)
- 法国：[Ligue 1 2026/27俱乐部与赛程](https://ligue1.com/fr/articles/l1_article_5284-)、[Ligue 2 2026/27俱乐部与赛程](https://ligue1.com/fr/articles/l1_article_5281-)
- 荷兰：[Eredivisie俱乐部](https://eredivisie.com/competition/clubs/)
- 葡萄牙：[2026/27准入名单](https://www.ligaportugal.pt/backoffice/assets/Comunicado_Oficial_n_362_fba25aee39.pdf)
- 比利时：[Pro League 2026/27赛程与18队](https://www.proleague.be/nieuws/kalender-2026-2027-club-brugge-opent-tegen-kv-kortrijk-eerste-super-sunday-al-op-speeldag-4)
- 日本：[J1 2026俱乐部与积分榜](https://www.jleague.co/standings/j1/2026/)
- 韩国：[K League 1 2026官方积分榜文件](https://www.kleague.com/match/pdfDownload.do?gameId=101&meetSeq=1&year=2026)
- 巴西：[CBF Série A 2026俱乐部](https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026)
- 阿根廷：[AFA 2026赛季30队规模](https://assets1.afa.com.ar/2026/BOLETINES/Boletin-6845-Complementario-01-x-Reglamento-del-Torneo-de-Categorias-Juveniles-LPF-2026-%281%29.pdf)、[2026赛程参赛名单](https://www.espn.com.ar/futbol/argentina/nota/_/id/16067897/el-fixture-de-torneo-apertura-2026-fecha-hora-y-resultados-de-los-partidos)

## 18. 已完成接入与 V1 边界

1. 已完成名单、队名和六档平台审核。
2. 已完成 12 家样板及 366 家俱乐部六项参数。
3. 已建立联赛质量和一线队比赛经验成长参数。
4. 已转换为只读 TypeScript 数据，并接入运行时目录、训练成长、合同与转会市场。
5. 已完成公开 gameStore 工作流回归和 36 局固定种子完整生涯审计。
6. 队徽、真实阵容、真实赛程和动态升降级不属于 V1。
