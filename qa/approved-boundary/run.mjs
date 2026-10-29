// Isolated SSR/component geometry only. No user data, save injection or gameplay claims.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
const root=resolve('.'),generated=resolve('qa/approved-edits/generated'),out=resolve('qa/approved-boundary/artifacts')
await mkdir(out,{recursive:true})
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.includes('..'))throw Error('invalid path');const file=resolve(pathname.endsWith('.html')?generated:resolve(root,'public'),'.'+pathname);const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}})
await new Promise(r=>server.listen(4175,'127.0.0.1',r))
const report={scope:'Read-only breakpoint diagnosis of approved product candidate; metrics/screenshots only, not an acceptance pass or real iOS',results:[],passed:false}
let browser
const check=(condition,message)=>{if(!condition)throw Error(message)}
try{
 browser=await chromium.launch();report.browser=browser.version()
 const cases=['academy','arrival','training','report']
 for(const width of [520,521,600,760,761,820,821])for(const scale of [1])for(const name of cases){
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
   row.boundary=await page.evaluate(()=>{
    const pick=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,font:c.fontSize,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,columns:c.gridTemplateColumns,padding:c.padding,margin:c.margin}};
    return Object.fromEntries(['.career-overview','.career-overview__overall','.career-overview__overall strong','.career-overview__identity','.career-overview__club','.career-overview__cash','.career-overview__performance','.offer-table','.choice-list--arrival','.choice-list--training-plan','.path-choice>div','.career-active','.report-side'].map(s=>[s,pick(s)]));
   });
   await page.screenshot({path:resolve(out,`${name}-${width}-${scale}x.png`),fullPage:true});row.passed=true
  }catch(e){row.failure=String(e);await page.screenshot({path:resolve(out,`${name}-${width}-${scale}x-FAIL.png`),fullPage:true}).catch(()=>{})}finally{await page.close()}
 }
 report.passed=report.results.every(r=>r.passed);if(!report.passed)process.exitCode=1
}finally{await browser?.close();server.close();await writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({scope:report.scope,passed:report.passed,total:report.results.length,failed:report.results.filter(r=>!r.passed).map(({name,width,textScale,failure})=>({name,width,textScale,failure}))},null,2))}
