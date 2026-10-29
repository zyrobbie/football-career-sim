// Isolated SSR/component geometry only. No user data, save injection or gameplay claims.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
const root=resolve('.'),generated=resolve('qa/approved-edits/generated'),out=resolve('qa/approved-baseline/artifacts')
await mkdir(out,{recursive:true})
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.includes('..'))throw Error('invalid path');const file=resolve(pathname.endsWith('.html')?generated:resolve(root,'public'),'.'+pathname);const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}})
await new Promise(r=>server.listen(4175,'127.0.0.1',r))
const report={scope:'Fresh synthetic SSR component layout; not interactive gameplay, not real iOS, not native save-to-album',results:[],passed:false}
let browser
const check=(condition,message)=>{if(!condition)throw Error(message)}
try{
 browser=await chromium.launch();const cases=JSON.parse(await readFile(resolve(generated,'cases.json'),'utf8'));
 const targets=[...cases.map(name=>({name,width:521})),...[600,760,820,821].map(width=>({name:'identity-long',width})),{name:'academy',width:821}];
 for(const target of targets){const row={...target};report.results.push(row);
  for(const variant of ['candidate','baseline']){const page=await browser.newPage({viewport:{width:target.width,height:844},locale:'zh-CN'});await page.goto(`http://127.0.0.1:4175/${target.name}${variant==='baseline'?'-baseline':''}.html`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   row[variant]=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,text:document.body.innerText,overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.trim().slice(0,80),right:e.getBoundingClientRect().right}))}));
   await page.screenshot({path:resolve(out,`${target.name}-${target.width}-${variant}.png`),fullPage:true});await page.close();
  }
  row.sameWidth=row.candidate.scrollWidth===row.baseline.scrollWidth;row.sameContent=row.candidate.text===row.baseline.text;row.noIncreasedOverflow=row.candidate.scrollWidth<=row.baseline.scrollWidth;
 }
 report.scope='Exact restored baseline and candidate comparison for17 failing non-mobile scenarios; no product changes or suppressed original failures';report.passed=report.results.every(r=>r.sameWidth&&r.sameContent);
}finally{await browser?.close();server.close();await writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.results.map(({name,width,sameWidth,sameContent,noIncreasedOverflow,candidate,baseline})=>({name,width,sameWidth,sameContent,noIncreasedOverflow,candidateWidth:candidate?.scrollWidth,baselineWidth:baseline?.scrollWidth})),null,2))}
