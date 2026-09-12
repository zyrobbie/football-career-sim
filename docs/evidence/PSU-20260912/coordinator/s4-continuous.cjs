const fs=require('fs'),assert=require('assert'),zlib=require('zlib');
const {chromium}=require('/Users/zhihu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const D='/tmp/PSU-20260912-coordinator/s4-continuous',origin='http://127.0.0.1:4289';fs.mkdirSync(D,{recursive:true});
const base=JSON.parse(fs.readFileSync('docs/evidence/PSU-20260912/S1/inputs-valid.json')).base.state;
const continuous=JSON.parse(zlib.gunzipSync(fs.readFileSync('docs/evidence/PSU-20260912/S2/continuous.json.gz')));
const scenarios=[{id:'young',width:1280,height:720,state:{...structuredClone(base),phase:'HALF_YEAR_PLAN',trainingFocus:null,developmentApproach:null}},{id:'veteran',width:390,height:844,state:continuous.find(r=>r.group.id==='veteran-sharp'&&r.approach==='PUSH').final}];
const results=[];
(async()=>{const browser=await chromium.launch({headless:true});try{for(const scenario of scenarios){const {width,height}=scenario;
 const c=await browser.newContext({viewport:{width,height}}),p=await c.newPage(),r={width,height,id:scenario.id,actions:[],errors:[],screens:[]};results.push(r);
 p.on('pageerror',e=>r.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')r.errors.push(m.text())});
 const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('career_save_current')).data);
 async function click(loc,label){await loc.scrollIntoViewIfNeeded();await loc.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const hit=await loc.evaluate(e=>{const b=e.getBoundingClientRect();return {width:b.width,height:b.height,centerHit:e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}});assert(hit.centerHit,label);await loc.click();r.actions.push({label,hit,after:await state()})}
 async function shot(name,loc){if(loc)await loc.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});const path=D+'/'+width+'-'+scenario.id+'-'+name+'.png';await p.screenshot({path});r.screens.push(path)}
 await p.goto(origin);await p.evaluate(async g=>{localStorage.clear();(await import('/src/persistence/save.ts')).saveGame(g)},scenario.state);await p.reload();await click(p.getByRole('button',{name:'继续生涯',exact:true}),'load preseeded save');
 for(let window=0;window<3;window++){scenario.approach=['PUSH','STEADY','TEAM_FIRST'][window];
 assert.equal((await state()).phase,'HALF_YEAR_PLAN');await shot(window+'-plan',p.locator('.training-plan'));
 r.before=await state();r.planText=await p.locator('.training-plan').innerText();
 if(await p.locator('.path-choice').count()){
  const target=p.locator('.path-choice');r.metrics={rect:await target.boundingBox(),buttons:await target.getByRole('radio').evaluateAll(es=>es.map(e=>({text:e.innerText,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})))};
  const title={PUSH:'主动争取出场',STEADY:'先站稳脚跟',TEAM_FIRST:'先服从球队安排'}[scenario.approach];await click(p.getByRole('radio',{name:new RegExp(title)}),'choose '+scenario.approach)
 }
 const focus=p.getByRole('radio',{name:/均衡训练|维护竞技状态/}).first();if(await focus.count())await click(focus,'visible training focus');
 await click(p.getByRole('button',{name:/开始这半年/}),'start half-year');
 for(let n=0;n<12&&['SPECIAL_EVENT','SPECIAL_EVENT_RESULT'].includes((await state()).phase);n++){
  if((await state()).phase==='SPECIAL_EVENT_RESULT')await click(p.getByRole('button',{name:/继续这半年/}),'confirm event');
  else await click(p.locator('.special-event__choices button').first(),'visible event choice');
 }
 r.after=await state();assert.equal(r.after.phase,'HALF_YEAR_REPORT');assert.equal(r.after.history.length,r.before.history.length+1);r.summary=await p.locator('.training-event-summary').innerText();
 assert(r.summary.includes('策略未执行')||r.summary.includes('本期策略：'));
 assert(!/\d+%|抽取范围|不能把一次伤病/.test(r.summary));await shot(window+'-report',p.locator('.training-event-summary'));
 await p.reload();await click(p.getByRole('button',{name:'继续生涯',exact:true}),'reload saved report');assert.deepStrictEqual(await state(),r.after);assert.equal(await p.locator('.training-event-summary').innerText(),r.summary);

 for(let n=0;n<10;n++){const s=await state();if(s.phase==='HALF_YEAR_PLAN')break;if(s.phase==='HALF_YEAR_REPORT'||s.phase==='PRO_STAGE_COMPLETE'){const stay=p.getByRole('button',{name:'继续留队半年',exact:true});await click(await stay.count()?stay:p.locator('.professional-report-actions .button--primary'),'report next')}else if(s.phase==='TRANSFER_WINDOW'){await click(p.locator('.transfer-stay'),'choose stay/renewal');await click(p.locator('.transfer-actions .button--primary'),'confirm stay/renewal')}else if(s.phase==='TRANSFER_ARRIVAL')await click(p.getByRole('button',{name:/专心完成报到/}),'arrival');else if(s.phase==='TRANSFER_STAGE_COMPLETE')await click(p.getByRole('button',{name:'开始下一个半年'}),'next plan');else throw Error('next '+s.phase)}
 const next=await state();assert.equal(next.phase,'HALF_YEAR_PLAN');assert.equal(next.history.length,r.after.history.length);assert.equal(next.cashEuro,r.after.cashEuro);
 await click(p.getByRole('button',{name:'回看上期报告'}),'review report');assert.equal(await p.locator('.training-event-summary').innerText(),r.summary);await click(p.getByRole('button',{name:'返回当前进度',exact:true}),'return from review');assert.deepStrictEqual(await state(),next);
 (r.windows??=[]).push({index:window,approach:scenario.approach,before:r.before,report:r.after,next});
 }
 assert.deepStrictEqual(r.errors,[]);r.identity={url:p.url(),title:await p.title()};await c.close();console.log(width,scenario.id,'PASS');
}}finally{await browser.close();fs.writeFileSync(D+'/results.json',JSON.stringify({browser:'Browser plugin not available; bundled isolated Playwright Chromium',origin,results},null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
