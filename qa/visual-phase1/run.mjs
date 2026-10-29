// Isolated SSR/component geometry only. No user data, save injection or gameplay claims.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
const root=resolve('.'),generated=resolve('qa/visual-phase1/generated'),out=resolve('qa/visual-phase1/artifacts')
await mkdir(out,{recursive:true})
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.includes('..'))throw Error('invalid path');const file=resolve(pathname.endsWith('.html')?generated:resolve(root,'public'),'.'+pathname);const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}})
await new Promise(r=>server.listen(4175,'127.0.0.1',r))
const report={scope:'Fresh synthetic SSR component layout; not interactive gameplay, not real iOS, not native save-to-album',results:[],passed:false}
let browser
const check=(condition,message)=>{if(!condition)throw Error(message)}
try{
 browser=await chromium.launch();report.browser=browser.version()
 const cases=JSON.parse(await readFile(resolve(generated,'cases.json'),'utf8'))
 for(const width of [320,375,390,430])for(const scale of [1,2])for(const name of cases){
  const row={name,width,textScale:scale,passed:false};report.results.push(row)
  const page=await browser.newPage({viewport:{width,height:844},locale:'zh-CN'})
  try{
   await page.goto(`http://127.0.0.1:4175/${name}.html`,{waitUntil:'networkidle'})
   await page.evaluate(()=>document.fonts.ready)
   // Text-only resize approximation in a disposable test document; measure before applying.
   if(scale===2)await page.evaluate(()=>{const sizes=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,size]of sizes)e.style.fontSize=`${size*2}px`})
   row.metrics=await page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{text:e.textContent.trim().slice(0,80),x:r.x,y:r.y,w:r.width,h:r.height,font:parseFloat(s.fontSize),scrollW:e.scrollWidth,clientW:e.clientWidth,scrollH:e.scrollHeight,clientH:e.clientHeight}}
    const visible=e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,task:document.querySelector('.career-active')?.getBoundingClientRect().y,cards:[...document.querySelectorAll('.special-event__choices button')].map(box),offers:[...document.querySelectorAll('.transfer-offer-grid > button')].map(box),type:[...document.querySelectorAll('.career-panel-lead,.special-event__choices strong,.special-event__choices em,.training-plan__selection,.transfer-offer-grid strong,.report-story p')].filter(visible).map(box),clipped:[...document.querySelectorAll('button,summary')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2).map(box)}
   })
   const m=row.metrics;check(m.scrollWidth<=width+1,'horizontal document overflow')
   check(m.clipped.length===0,'clipped button/summary content')
   if(name.startsWith('event-')){const expected=name==='event-two'?2:3;check(m.cards.length===expected,'wrong choice count');check(Math.max(...m.cards.map(c=>c.y))-Math.min(...m.cards.map(c=>c.y))<2,'career interaction cards must remain one horizontal row');check(m.cards.every(c=>c.scrollW<=c.clientW+2&&c.scrollH<=c.clientH+2),'clipped career interaction card');check(!/[+−-]\s*\d/.test((await page.locator('.special-event__choices em').allTextContents()).join(' ')),'numeric effect delta before choosing')}
   if(name==='transfer'&&m.offers.length>1)check(new Set(m.offers.map(c=>Math.round(c.y))).size===m.offers.length,'mobile transfer offers not independent rows')
   if(scale===1)check(m.type.every(t=>t.font>=14),'primary decision/support content under14px')
   await page.screenshot({path:resolve(out,`${name}-${width}-${scale}x.png`),fullPage:true})
   // Native details must remain readable after expanding, independent of React event handlers.
   await page.locator('details').evaluateAll(es=>es.forEach(e=>e.open=true))
   row.expandedOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)
   check(!row.expandedOverflow,'horizontal overflow after expanding details')
   row.passed=true
  }catch(e){row.failure=String(e);await page.screenshot({path:resolve(out,`${name}-${width}-${scale}x-FAIL.png`),fullPage:true}).catch(()=>{})}finally{await page.close()}
 }
 report.passed=report.results.every(r=>r.passed);if(!report.passed)process.exitCode=1
}finally{await browser?.close();server.close();await writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({scope:report.scope,passed:report.passed,total:report.results.length,failed:report.results.filter(r=>!r.passed).map(({name,width,textScale,failure})=>({name,width,textScale,failure}))},null,2))}
