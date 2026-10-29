// Isolated SSR/component geometry only. No user data, save injection or gameplay claims.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
const root=resolve('.'),generated=resolve('qa/approved-edits/generated'),out=resolve('qa/approved-edits/artifacts')
await mkdir(out,{recursive:true})
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.includes('..'))throw Error('invalid path');const file=resolve(pathname.endsWith('.html')?generated:resolve(root,'public'),'.'+pathname);const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}})
await new Promise(r=>server.listen(4175,'127.0.0.1',r))
const report={scope:'Fresh synthetic SSR component layout; not interactive gameplay, not real iOS, not native save-to-album',results:[],passed:false}
let browser
const check=(condition,message)=>{if(!condition)throw Error(message)}
try{
 browser=await chromium.launch();report.browser=browser.version()
 const cases=JSON.parse(await readFile(resolve(generated,'cases.json'),'utf8'))
 for(const width of [320,375,390,430,520,521,600,760,820,821,1188])for(const scale of width<=430?[1,2]:[1])for(const name of cases){
  const row={name,width,textScale:scale,passed:false};report.results.push(row)
  const page=await browser.newPage({viewport:{width,height:844},locale:'zh-CN'})
  try{
   await page.goto(`http://127.0.0.1:4175/${name}.html`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready)
   if(scale===2)await page.evaluate(()=>{const sizes=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,size]of sizes)e.style.fontSize=`${size*2}px`})
   row.metrics=await page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{text:e.textContent.trim(),x:r.x,y:r.y,w:r.width,h:r.height,font:parseFloat(s.fontSize),scrollW:e.scrollWidth,clientW:e.clientWidth,scrollH:e.scrollHeight,clientH:e.clientHeight,paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,marginBottom:s.marginBottom,gap:s.rowGap,whiteSpace:s.whiteSpace,overflow:s.overflow,textOverflow:s.textOverflow}}
    const all=s=>[...document.querySelectorAll(s)].map(box)
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,identity:all('.career-overview__identity h1,.career-overview__identity > p,.career-overview__club,.career-overview__identity > small,.career-overview__cash strong'),stats:all('.career-overview__performance'),statItems:all('.career-overview__totals dl>div,.career-overview__attributes dl>div'),statChildren:all('.career-overview__totals,.career-overview__attributes'),academy:all('.offer-column'),arrival:all('.choice-list--arrival>button'),strategy:all('.path-choice [role=radiogroup]>button'),training:all('.choice-list--training-plan>button'),events:all('.special-event__choices button'),transfer:all('.transfer-offer-grid>button'),reportSection:all('.report-side>section'),active:all('.career-active'),workspace:all('.career-workspace'),titles:all('.choice-list--arrival strong,.path-choice button strong,.choice-list--training-plan strong'),effects:all('.choice-list--arrival em,.path-choice button em,.choice-list--training-plan small'),selection:all('.training-plan__selection')}
   })
   const m=row.metrics, mobile=width<=520
   const rows=xs=>new Set(xs.map(c=>Math.round(c.y))).size
   const noClip=xs=>xs.every(c=>c.scrollW<=c.clientW+2&&c.scrollH<=c.clientH+2)
   if(name==='arrival'&&width===1188){
    const baseline=await browser.newPage({viewport:{width,height:844},locale:'zh-CN'});
    await baseline.goto('http://127.0.0.1:4175/arrival-baseline.html',{waitUntil:'networkidle'});await baseline.evaluate(()=>document.fonts.ready);
    row.baseline=await baseline.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth,text:document.querySelector('.choice-list--arrival').innerText,buttons:[...document.querySelectorAll('.choice-list--arrival button,.career-decision__submit')].map(e=>({text:e.innerText,width:e.clientWidth,scrollWidth:e.scrollWidth}))}));
    await baseline.screenshot({path:resolve(out,'arrival-baseline-1188.png'),fullPage:true});await baseline.close();
    const sameText=(await page.locator('.choice-list--arrival').innerText())===row.baseline.text;
    row.preexistingDesktopOverflow=m.scrollWidth>width+1&&m.scrollWidth===row.baseline.scrollWidth&&sameText;
    check(m.scrollWidth<=width+1||row.preexistingDesktopOverflow,'new desktop arrival overflow (not baseline equivalent)');
   }else check(m.scrollWidth<=width+1,'horizontal document overflow')
   if(mobile){
    check(m.statItems.length===7,'overview must retain seven data columns');check(rows(m.statItems)===1,'seven overview columns no longer same row')
    check(m.stats[0]?.paddingTop==='8px'&&m.stats[0]?.paddingBottom==='8px','05 parent padding must be8px')
    check(m.statChildren.every(c=>c.paddingTop==='6px'&&c.paddingBottom==='6px'),'05 child padding6 unchanged')
    check(noClip(m.identity),'04A identity/cash cropped');check(m.identity.every(c=>c.textOverflow!=='ellipsis'),'04A text cannot ellipsize')
    const [person,age,club,role,cash]=m.identity;check(person&&club&&cash,'04A groups missing');check(club.x>person.x&&cash.x>club.x,'04A team must be between player and cash');check(Math.abs(person.y-club.y)<40*scale,'04A player/team must share upper row')
   }
   if(name==='academy'&&mobile){check(m.academy.length===3&&rows(m.academy)===1,'03 academy must stay3columns');check(noClip(m.academy),'03 offer content clipped');for(const text of await page.locator('.offer-column').allTextContents())for(const label of ['训练设施','青训环境','预计地位','一线队机会','年度津贴'])check(text.includes(label),'03 lost comparison '+label)}
   if(width>520&&width<=820){const o=await page.locator('.career-overview__overall').evaluate(e=>({w:e.clientWidth,scroll:e.scrollWidth}));check(o.scroll<=o.w+2,'tablet OVR squeezed by mobile columns')}
   if(name==='arrival'&&mobile){check(m.arrival.length===4&&rows(m.arrival)===2,'06 arrival must stay2x2');check(noClip(m.arrival),'06 arrival clipped');check((await page.locator('.choice-list--arrival').innerText()).includes('身体状态小幅下降'),'06 risk missing');check(m.titles.every(c=>c.font>=13*scale),'06 primary titles not13');check(m.effects.every(c=>c.font>=9*scale),'06 risk text shrunk')}
   if(name==='training'&&width<=760){check(m.strategy.length===3&&rows(m.strategy)===1,'07 strategy must remain3columns');check(m.training.length===6&&rows(m.training)===2,'07 training must remain3x2');check(noClip([...m.training,...m.strategy]),'07 card clipped');check(m.titles.every(c=>c.font>=12.5*scale),'07 title not12.5');check(m.effects.every(c=>c.font>=9.5*scale),'07 effect too small');const content=await page.locator('.training-plan').innerText();for(const t of ['32/100','身体负荷增加','成长稍慢'])check(content.includes(t),'07 lost '+t);check(m.selection.length===1&&m.selection[0].h>0&&m.selection[0].text.includes('重点练身体')&&m.selection[0].text.includes('稳住成长节奏'),'07 selected explanation missing')}
   if(name.startsWith('event-')&&mobile){check(m.events.length===(name==='event-two'?2:3)&&rows(m.events)===1,'unapproved event column change')}
   if(name==='transfer'&&mobile&&m.transfer.length>1)check(rows(m.transfer)===1,'unapproved single-column transfer redesign')
   if(name==='report'){
    check(await page.locator('.professional-report-actions button.button--primary').count()===1,'report actual next action missing')
    if(mobile){check(m.active[0].paddingTop==='8px','01 changed mobile report padding');check(m.reportSection.every(c=>c.paddingBottom==='5px'&&c.marginBottom==='0px'),'02 changed mobile sections')}
    else if(width<=820){check(m.active[0].paddingTop==='26px','01 changed legacy tablet padding');check(m.reportSection.every(c=>c.paddingBottom==='22px'&&c.marginBottom==='22px'),'02 changed legacy tablet sections')}
    else if(width>820){check(m.active[0].paddingTop==='14px'&&m.workspace[0].gap==='12px','01 desktop expected12/14');check(m.reportSection.every(c=>c.paddingBottom==='12px'&&c.marginBottom==='12px'),'02 desktop expected12/12')}
   }
   await page.screenshot({path:resolve(out,`${name}-${width}-${scale}x.png`),fullPage:true});row.passed=true
  }catch(e){row.failure=String(e);await page.screenshot({path:resolve(out,`${name}-${width}-${scale}x-FAIL.png`),fullPage:true}).catch(()=>{})}finally{await page.close()}
 }
 report.passed=report.results.every(r=>r.passed);if(!report.passed)process.exitCode=1
}finally{await browser?.close();server.close();await writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({scope:report.scope,passed:report.passed,total:report.results.length,failed:report.results.filter(r=>!r.passed).map(({name,width,textScale,failure})=>({name,width,textScale,failure}))},null,2))}
