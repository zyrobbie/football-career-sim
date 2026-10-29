// Official CI only: disposable anonymous browser contexts, never an existing user profile.
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {resolve} from 'node:path'
const root=resolve('.'),out=resolve('qa/phase2-art/artifacts'),generated=resolve('qa/phase2-art/generated');await mkdir(out,{recursive:true});
const url='http://127.0.0.1:4173/';const report={scope:'fresh isolated factory browser scenarios; not real iOS or user saves',results:[],passed:false};let server,browser;
async function seed(page,game){await page.goto(url);await page.evaluate(g=>{const s=JSON.stringify(g);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}localStorage.setItem('career_save_current',JSON.stringify({checksum:(h>>>0).toString(16).padStart(8,'0'),data:g}))},game);await page.reload();await page.getByRole('button',{name:'继续生涯',exact:true}).click();await page.locator('.key-moment,.special-event').waitFor()}
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],{cwd:root,stdio:'pipe'});let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
 for(let i=0;i<60;i++){try{if((await fetch(url)).ok)break}catch{}await new Promise(r=>setTimeout(r,250));if(i===59)throw Error('preview not ready:'+log)}
 browser=await chromium.launch();report.browser=browser.version();const cases=JSON.parse(await readFile(resolve(generated,'cases.json'),'utf8'));const sources={};
 for(const c of cases){const row={name:c.name,width:390,passed:false};report.results.push(row);const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN'}),page=await context.newPage();const requests=[];page.on('request',r=>{if(/\.webp(?:\?|$)/.test(r.url()))requests.push(r.url())});
 try{
  await seed(page,JSON.parse(await readFile(resolve(generated,c.name+'.json'),'utf8')));const frame=page.locator('[data-scene-illustration]');
  if(c.image){await frame.waitFor();const img=frame.locator('img');await img.evaluate(el=>el.decode());sources[c.name]=await img.getAttribute('src');assert(await img.isVisible());row.image=await img.evaluate(e=>({src:e.getAttribute('src'),w:e.naturalWidth,h:e.naturalHeight,renderWidth:e.getBoundingClientRect().width,renderHeight:e.getBoundingClientRect().height}));assert(row.image.w>0&&row.image.h>0)}else assert.equal(await frame.count(),0,'uncovered/results have no generic image or blank frame');
  const region=page.locator('.key-moment,.special-event');row.text=await region.innerText();row.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert(!row.overflow,'new horizontal overflow');
  if(c.kind==='modern'){assert.deepEqual(await page.locator('.special-event__choices em').allTextContents(),Array(3).fill('媒体关系 · 赞助收入'));assert(row.text.includes('仅提示影响指标'));assert.equal(await page.locator('.special-event__deltas').count(),0)}
  if(c.kind==='legacy'){assert(row.text.includes('挡住话筒'));assert(!(await page.locator('.special-event__choices em').allTextContents()).every(t=>t==='媒体关系 · 赞助收入'));assert.notEqual(sources['press-modern'],sources['press-legacy'])}
  if(c.kind==='match'){assert.equal(await page.locator('.key-moment__choice button').count(),3);assert.equal(await page.locator('.key-moment-summary').count(),0);assert(row.text.includes('失误风险'))}
  if(c.kind==='match-result'){assert(row.text.includes(c.resultText));assert(row.text.includes('这次处理已经保存'));assert.equal(await page.locator('.key-moment__finish').count(),1);row.contribution=await page.locator('.key-moment-summary__contribution').innerText();if(c.applied.goals)assert(row.contribution.includes('进球 +'+c.applied.goals));if(!c.applied.averageRating)assert(row.contribution.includes('预计显示不变'))}
  if(c.kind==='event-result'){assert(row.text.includes(c.outcome));assert.equal(await page.locator('.special-event__reveal').count(),1)}
  if(c.kind==='step1')assert(row.text.includes('第1步'));if(c.kind==='step2'){assert(row.text.includes('第2步'));assert.equal(await page.locator('.special-event__choices button').count(),c.choiceCount)}
  row.imageRequests=[...new Set(requests)];assert(row.imageRequests.length<=1,'one scene must not preload56illustrations');await page.screenshot({path:resolve(out,c.name+'-390.png'),fullPage:true});row.passed=true;
 }catch(e){row.error=String(e);await page.screenshot({path:resolve(out,c.name+'-FAIL.png'),fullPage:true}).catch(()=>{})}finally{await context.close()}}
 for(const mode of ['failed','delayed']){const row={name:'image-'+mode,passed:false};report.results.push(row);const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();let release;const held=new Promise(r=>release=r);await page.route('**/*.webp',async route=>{if(mode==='delayed')await held;await route.abort()});
 try{await seed(page,JSON.parse(await readFile(resolve(generated,'press-modern.json'),'utf8')));const choice=page.locator('.special-event__choices button').first();assert(await choice.isEnabled());if(mode==='failed')await page.locator('[data-scene-illustration]').waitFor({state:'detached'});await choice.click();await page.locator('.special-event__reveal').waitFor();release();assert.equal(await page.locator('[data-scene-illustration]').count(),0);assert(await page.getByRole('button',{name:/继续这半年/}).isEnabled());await page.screenshot({path:resolve(out,'image-'+mode+'-action-completed.png'),fullPage:true});row.passed=true}catch(e){row.error=String(e);release()}finally{await context.close()}}
 report.passed=report.results.every(r=>r.passed);if(!report.passed)process.exitCode=1;
}finally{await browser?.close();server?.kill();await writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.results.map(({name,passed,error})=>({name,passed,error})),null,2))}
