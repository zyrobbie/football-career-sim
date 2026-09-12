const fs=require('fs'),assert=require('assert'),zlib=require('zlib');
const {chromium}=require('/Users/zhihu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const D='/tmp/PSU-20260912-coordinator/online',origin='https://footballcareer.zyrobbie.site/';fs.mkdirSync(D,{recursive:true});
const archived=JSON.parse(zlib.gunzipSync(fs.readFileSync('docs/evidence/PSU-20260912/coordinator/ui-results.json.gz')));
const valid=archived.results.find(r=>r.id==='STEADY'&&r.width===390).before;
const scenarios=[{id:'STEADY',state:valid,approach:'STEADY'}];
function encode(data){let hash=2166136261;const payload=JSON.stringify(data);for(let i=0;i<payload.length;i++){hash^=payload.charCodeAt(i);hash=Math.imul(hash,16777619)}return JSON.stringify({checksum:(hash>>>0).toString(16).padStart(8,'0'),data})}
const results=[];
(async()=>{const browser=await chromium.launch({headless:true});try{for(const [width,height] of [[390,844]])for(const scenario of scenarios){
 const c=await browser.newContext({viewport:{width,height}}),p=await c.newPage(),r={width,height,id:scenario.id,actions:[],errors:[],screens:[]};results.push(r);
 p.on('pageerror',e=>r.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')r.errors.push(m.text())});
 const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('career_save_current')).data);
 async function click(loc,label){await loc.scrollIntoViewIfNeeded();await loc.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const hit=await loc.evaluate(e=>{const b=e.getBoundingClientRect();return {width:b.width,height:b.height,centerHit:e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}});assert(hit.centerHit,label);await loc.click();r.actions.push({label,hit,after:await state()})}
 async function shot(name,loc){if(loc)await loc.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});const path=D+'/'+width+'-'+scenario.id+'-'+name+'.png';await p.screenshot({path});r.screens.push(path)}
 await p.goto(origin);await p.evaluate(raw=>{localStorage.clear();localStorage.setItem('career_save_current',raw)},encode(scenario.state));await p.reload();await click(p.getByRole('button',{name:'继续生涯',exact:true}),'load preseeded save');
 assert.equal((await state()).phase,'HALF_YEAR_PLAN');await shot('plan',p.locator('.training-plan'));
 r.before=await state();r.planText=await p.locator('.training-plan').innerText();
 if(await p.locator('.path-choice').count()){
  const target=p.locator('.path-choice');r.metrics={rect:await target.boundingBox(),buttons:await target.getByRole('radio').evaluateAll(es=>es.map(e=>({text:e.innerText,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})))};
  const title={PUSH:'主动争取出场',STEADY:'先站稳脚跟',TEAM_FIRST:'先服从球队安排'}[scenario.approach];await click(p.getByRole('radio',{name:new RegExp(title)}),'choose '+scenario.approach)
 }
 if(!scenario.id.includes('recovery'))await click(p.getByRole('radio',{name:/均衡训练/}),'BALANCED');
 await click(p.getByRole('button',{name:/开始这半年/}),'start half-year');
 for(let n=0;n<12&&['SPECIAL_EVENT','SPECIAL_EVENT_RESULT'].includes((await state()).phase);n++){
  if((await state()).phase==='SPECIAL_EVENT_RESULT')await click(p.getByRole('button',{name:/继续这半年/}),'confirm event');
  else await click(p.locator('.special-event__choices button').first(),'visible event choice');
 }
 r.after=await state();assert.equal(r.after.phase,'HALF_YEAR_REPORT');assert.equal(r.after.history.length,r.before.history.length+1);r.summary=await p.locator('.training-event-summary').innerText();
 if(scenario.id.includes('recovery'))assert(r.summary.includes('策略未执行'),r.summary);else assert(r.summary.includes('本期策略：'));
 assert(!/\d+%|抽取范围|不能把一次伤病/.test(r.summary));await shot('report',p.locator('.training-event-summary'));
 await p.reload();await click(p.getByRole('button',{name:'继续生涯',exact:true}),'reload saved report');assert.deepStrictEqual(await state(),r.after);assert.equal(await p.locator('.training-event-summary').innerText(),r.summary);
 if(scenario.id==='STEADY'){
  await click(p.getByRole('button',{name:'设置',exact:true}),'settings');await p.getByText('版本信息',{exact:true}).waitFor();r.settings=await p.locator('.settings-screen').innerText();assert(r.settings.includes('1.9.0'));await shot('settings',p.locator('.settings-screen'));assert.deepStrictEqual(await state(),r.after);
 }
 assert.deepStrictEqual(r.errors,[]);r.identity={url:p.url(),title:await p.title()};await c.close();console.log(width,scenario.id,'PASS');
}}finally{await browser.close();fs.writeFileSync(D+'/results.json',JSON.stringify({browser:'Browser plugin not available; bundled isolated Playwright Chromium',origin,results},null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
