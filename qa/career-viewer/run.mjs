// Cloud CI browser regression for the retirement viewer.
// Explicit synthetic fixtures only; no genuine user saves or credentials.
import { chromium, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import jsQR from 'jsqr'
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..'),out=resolve(here,'artifacts')
await mkdir(resolve(out,'downloads'),{recursive:true})
const url=process.env.BASE_URL||'http://127.0.0.1:4173/'
const report={synthetic:true,url,started:new Date().toISOString(),results:[],browser:null,passed:false}
let server,browser
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function shot(page,name){await page.screenshot({path:resolve(out,name+'.png'),fullPage:false})}
async function inspectPngTarget(dialog){
 const data=await dialog.locator('[data-png-save-preview]').evaluate(async img=>{
  await img.decode();const blob=await(await fetch(img.src)).blob(),bytes=new Uint8Array(await blob.arrayBuffer())
  const digest=await crypto.subtle.digest('SHA-256',bytes),original=document.querySelector('[data-png-original]'),originalBlob=await(await fetch(original.href)).blob(),originalBytes=new Uint8Array(await originalBlob.arrayBuffer()),originalDigest=await crypto.subtle.digest('SHA-256',originalBytes)
  const box=img.getBoundingClientRect(),region=img.closest('[data-career-preview-scroll]').getBoundingClientRect()
  const x=Math.max(box.left,region.left)+Math.min(box.width,region.width)/2,y=Math.max(box.top,region.top)+Math.min(region.height,80)/2
  return {pngContextMenuAllowed:img.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})),originalMime:originalBlob.type,originalTarget:original.target,originalSha256:[...new Uint8Array(originalDigest)].map(v=>v.toString(16).padStart(2,'0')).join(''),mime:blob.type,srcPrefix:img.src.slice(0,30),magic:[...bytes.slice(0,8)],width:img.naturalWidth,height:img.naturalHeight,sha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join(''),hitImage:document.elementFromPoint(x,y)===img,pointerEvents:getComputedStyle(img).pointerEvents,touchCallout:getComputedStyle(img).getPropertyValue('-webkit-touch-callout')}
 })
 assert(data.pngContextMenuAllowed,'PNG native long-press/context menu is not cancelled');assert.equal(data.originalMime,'image/png');assert.equal(data.originalTarget,'_blank');assert.equal(data.originalSha256,data.sha256,'original link is same complete PNG');assert.equal(data.mime,'image/png');assert(data.srcPrefix.startsWith('data:image/png;base64,'));assert.deepEqual(data.magic,[137,80,78,71,13,10,26,10]);assert(data.width>=900&&data.height>data.width);assert(data.hitImage,'long-press target is image, not toolbar/overlay');assert.notEqual(data.pointerEvents,'none');assert.notEqual(data.touchCallout,'none');return data
}
async function downloadPng(page,dialog,name){
 const target=await inspectPngTarget(dialog),shareBefore=await page.evaluate(()=>window.__shareCalls.length)
 const wait=page.waitForEvent('download',{timeout:60000})
 await dialog.locator('[data-png-download]').click()
 const download=await wait;assert.equal(await download.failure(),null)
 const path=resolve(out,'downloads',name+'.png');await download.saveAs(path)
 const bytes=await readFile(path),meta=await sharp(bytes).metadata()
 assert.equal(await page.evaluate(()=>window.__shareCalls.length),shareBefore,'download must not invoke share');assert.equal(createHash('sha256').update(bytes).digest('hex'),target.sha256,'download equals actual PNG img, not visible page screenshot');assert.equal(meta.width,target.width);assert.equal(meta.height,target.height);assert.equal(meta.format,'png');assert(meta.width>=900);assert(meta.width*meta.height<=12000000)
 return {path:'downloads/'+name+'.png',bytes:bytes.length,width:meta.width,height:meta.height,sha256:createHash('sha256').update(bytes).digest('hex')}
}
async function openOriginalImage(page,dialog,label){
 const expected=await inspectPngTarget(dialog),pending=page.waitForEvent('popup',{timeout:30000})
 await dialog.locator('[data-png-original]').click();const popup=await pending
 try{
  await popup.waitForLoadState('domcontentloaded');const img=popup.locator('img').first();await img.waitFor();await img.evaluate(el=>el.decode())
  const actual=await img.evaluate(async el=>{const blob=await(await fetch(el.src)).blob(),digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return {mime:blob.type,width:el.naturalWidth,height:el.naturalHeight,sha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')}})
  assert.equal(actual.mime,'image/png');assert.equal(actual.sha256,expected.sha256);assert.equal(actual.width,expected.width);assert.equal(actual.height,expected.height)
  assert.equal(await popup.locator('[role="dialog"],button,[data-career-preview-scroll]').count(),0,'raw PNG tab must not contain app toolbar or preview frame')
  await shot(popup,label+'-original-png-tab');return {...actual,standaloneNoAppToolbar:true,notNativePhotoLibraryTest:true}
 }finally{await popup.close()}
}
async function exerciseSharing(page,dialog){
 const share=dialog.locator('[data-png-system-save]'),before=await page.evaluate(()=>window.__shareCalls.length)
 let automaticDownloads=0;const listener=()=>automaticDownloads++;page.on('download',listener)
 for(const mode of ['cancel','fail']){
  await page.evaluate(mode=>{window.__shareMode=mode},mode);await share.click();await page.waitForTimeout(150)
  assert(await share.isEnabled(),mode+' leaves retry available');assert(await dialog.locator('[data-png-download]').isVisible());assert.equal(automaticDownloads,0,mode+' must not silently download')
 }
 await page.evaluate(()=>{window.__shareMode='pending'});await share.click();assert(await share.isDisabled(),'share reentry disabled while sheet pending')
 await share.evaluate(el=>el.click());assert.equal(await page.evaluate(()=>window.__shareCalls.length),before+3,'no duplicate share')
 await page.evaluate(()=>window.__shareResolve());await page.waitForTimeout(100);assert(await share.isEnabled())
 const calls=await page.evaluate(before=>window.__shareCalls.slice(before),before)
 assert.equal(calls.length,3);for(const call of calls){assert.deepEqual(call.keys,['files']);assert.equal(call.files.length,1);assert.equal(call.files[0].type,'image/png');assert(call.files[0].size>10000);assert(call.files[0].name.endsWith('.png'))}
 const fileHash=await page.evaluate(async()=>{const digest=await crypto.subtle.digest('SHA-256',await window.__lastSharedFile.arrayBuffer());return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')});assert.equal(fileHash,(await inspectPngTarget(dialog)).sha256,'share File equals original PNG');page.off('download',listener);return {stubbed:true,notNativePhotoLibraryTest:true,cancelNoDownload:true,errorNoDownload:true,reentryPrevented:true,calls}
}
async function decodeFooter(png){
 const path=resolve(out,png.path),meta=await sharp(path).metadata(),height=Math.min(1200,meta.height)
 const {data,info}=await sharp(path).extract({left:0,top:meta.height-height,width:meta.width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 return jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data
}
async function seed(page,game){
 await page.goto(url,{waitUntil:'networkidle'})
 await page.evaluate(g=>{localStorage.clear();const s=JSON.stringify(g);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}localStorage.setItem('career_save_current',JSON.stringify({checksum:(h>>>0).toString(16).padStart(8,'0'),data:g}))},game)
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'继续生涯',exact:true}).click();await page.locator('[data-retirement-export-target]').waitFor({state:'attached'});await page.locator('[data-career-viewer-image]').waitFor();await page.locator('[data-career-viewer-image]').evaluate(el=>el.decode())
}
async function open(page){
 await page.getByRole('button',{name:'保存我的职业生涯',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'职业生涯长图预览',exact:true});await dialog.waitFor({timeout:90000})
 const image=dialog.locator('img');await image.waitFor();await image.evaluate(async el=>{await el.decode()});return dialog
}
async function inspectVector(page,game,label){
 const prevented=await page.locator('[data-career-viewer-image]').evaluate(img=>!img.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})));assert(prevented,'SVG reader must not masquerade as save target')
 const evidence=await page.locator('[data-career-viewer-image]').evaluate(async img=>{
  const svg=await(await fetch(img.src)).text(),doc=new DOMParser().parseFromString(svg,'image/svg+xml')
  return {svg,text:[...doc.querySelectorAll('text')].map(n=>n.textContent).join(''),unsafe:doc.querySelectorAll('script,foreignObject,parsererror').length,external:[...doc.querySelectorAll('image')].filter(n=>!n.getAttribute('href')?.startsWith('data:image/')).length,width:Number(doc.documentElement.getAttribute('width')),height:Number(doc.documentElement.getAttribute('height')),imageCount:doc.querySelectorAll('image').length}
 })
 assert.equal(evidence.unsafe,0);assert.equal(evidence.external,0);assert(evidence.imageCount>=2)
 assert(evidence.text.includes(game.player.name));for(const club of new Set(game.history.map(h=>h.clubName).filter(Boolean)))assert(evidence.text.includes(club),'missing club '+club)
 assert(!/退款|执行期|终止期/.test(evidence.text));await writeFile(resolve(out,label+'.svg'),evidence.svg)
 const {svg,...summary}=evidence;return summary
}
async function viewerGeometry(page,dialog,width,label,main=false){
 const scroll=dialog.locator(main?'[data-career-viewer-scroll]':'[data-career-preview-scroll]'),img=dialog.locator(main?'[data-career-viewer-image]':'img')
 const g=await scroll.evaluate(el=>({clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY,top:el.scrollTop}))
 const box=await img.boundingBox();assert(box);assert(box.width>=Math.min(width-72,500),`image fit-to-height/unreadable: ${box.width}`)
 assert(g.scrollHeight>g.clientHeight*2,'long image must vertically scroll');assert(g.scrollWidth<=g.clientWidth+2,'no horizontal clipping');assert(['auto','scroll'].includes(g.overflow));assert(g.clientHeight<await page.evaluate(()=>innerHeight))
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
 await shot(page,label+'-top');await scroll.evaluate(el=>{el.scrollTop=el.scrollHeight});await page.waitForTimeout(100)
 const bottom=await scroll.evaluate(el=>({top:el.scrollTop,remaining:el.scrollHeight-el.scrollTop-el.clientHeight}));assert(bottom.top>0);assert(bottom.remaining<=2);await shot(page,label+'-bottom')
 await scroll.focus();await scroll.evaluate(el=>{el.scrollTop=0});await page.keyboard.press('PageDown');await page.waitForTimeout(200);assert(await scroll.evaluate(el=>el.scrollTop)>0,'keyboard PageDown scrolls viewer')
 return {...g,imageWidth:box.width,bottom}
}
try{
 if(!process.env.BASE_URL){server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',c=>logs+=c);server.stderr.on('data',c=>logs+=c);server.on('exit',()=>void writeFile(resolve(out,'server.log'),logs));for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break}catch{}if(i===99)throw Error('preview server unavailable');await sleep(200)}}
 for(const [engine,kind,sizes] of [['chromium',chromium,[[390,844],[768,1024],[1280,900]]],['webkit',webkit,[[390,844]]]]){
 browser=await kind.launch({headless:true});report.browser=browser.version()
 for(const [width,height] of sizes){
  const row={engine,viewport:[width,height],errors:[],failedRequests:[],passed:false};report.results.push(row)
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',acceptDownloads:true});await context.addInitScript(()=>{
   window.__shareCalls=[];window.__shareMode='cancel';window.__shareResolve=null
   Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>Array.isArray(data?.files)&&data.files.every(f=>f instanceof File&&f.type==='image/png')})
   Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__lastSharedFile=data.files?.[0];window.__shareCalls.push({keys:Object.keys(data),files:data.files?.map(f=>({name:f.name,type:f.type,size:f.size}))});if(window.__shareMode==='pending')return await new Promise(resolve=>window.__shareResolve=resolve);if(window.__shareMode==='cancel')throw new DOMException('Synthetic user cancelled','AbortError');if(window.__shareMode==='fail')throw new DOMException('Synthetic blocked','NotAllowedError')}})
  });const page=await context.newPage()
  page.on('pageerror',e=>row.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')row.errors.push(m.text())});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))row.failedRequests.push({url:r.url(),status:r.status()})})
  try{
   const game=JSON.parse(await readFile(resolve(here,'generated-fixtures/retired-8clubs.json'),'utf8'));await seed(page,game)
   row.vector=await inspectVector(page,game,engine+'-'+width+'-vector');row.title=await page.title();assert(row.title);assert.equal(await page.locator('vite-error-overlay').count(),0)
   row.initialControls=[]
   for(const label of ['保存我的职业生涯','回到初始界面']){const control=page.getByRole('button',{name:label,exact:true}),box=await control.boundingBox();assert(box,label+' must render');assert(box.y>=0&&box.y+box.height<=height,label+' must be initially reachable without scrolling poster');row.initialControls.push({label,box})}
   row.archiveGeometry=await viewerGeometry(page,page,width,engine+'-'+width+'-archive',true)
   const stored=await page.evaluate(()=>localStorage.getItem('career_save_current'));await shot(page,`${engine}-${width}-archive`)
   let dialog=await open(page);row.geometry=await viewerGeometry(page,dialog,width,`${engine}-${width}-viewer`)
   assert.equal(await page.evaluate(()=>document.fonts.status),'loaded')
   await dialog.getByRole('button',{name:'关闭生涯长图预览',exact:true}).focus();await page.keyboard.press('Shift+Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)),'focus trap backwards');await page.keyboard.press('Tab');assert(await dialog.getByRole('button',{name:'关闭生涯长图预览',exact:true}).evaluate(el=>el===document.activeElement),'focus trap forwards')
   row.pngTarget=await inspectPngTarget(dialog);row.share=await exerciseSharing(page,dialog);
   if(width===390)row.originalTab=await openOriginalImage(page,dialog,engine+'-'+width);
   row.download=await downloadPng(page,dialog,`${engine}-${width}-actual-8clubs`);row.qr=await decodeFooter(row.download);assert.equal(row.qr,'https://footballcareer.zyrobbie.site/')
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert(await page.getByRole('button',{name:'保存我的职业生涯',exact:true}).evaluate(el=>el===document.activeElement),'focus restored')
   dialog=await open(page);await dialog.getByRole('button',{name:'关闭生涯长图预览',exact:true}).click();await dialog.waitFor({state:'hidden'})
   assert.equal(await page.evaluate(()=>localStorage.getItem('career_save_current')),stored,'export must not alter career save')
   await page.getByRole('button',{name:'回到初始界面',exact:true}).click();await page.getByRole('button',{name:'继续生涯',exact:true}).waitFor()
   page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'开始新生涯',exact:true}).click();await page.getByRole('button',{name:'继续生涯',exact:true}).waitFor()
   page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'开始新生涯',exact:true}).click();await page.getByText('球员姓名',{exact:true}).waitFor();await shot(page,`${engine}-${width}-new-career`)
   if(engine==='chromium'&&width===390){
    const longGame=JSON.parse(await readFile(resolve(here,'generated-fixtures/retired-32clubs.json'),'utf8'))
    longGame.player.name='DemoPlayer <>&"'+"'"+' LongNameABCDEFGHIJKLMNOPQRSTUVWXYZ'
    await seed(page,longGame);const longStored=await page.evaluate(()=>localStorage.getItem('career_save_current'))
    row.longVector=await inspectVector(page,longGame,'32clubs-adversarial-vector')
    row.longGeometry=await viewerGeometry(page,page,width,'32clubs-archive',true)
    const longDialog=await open(page),select=longDialog.getByRole('combobox',{name:'选择生涯图片',exact:true})
    await select.waitFor();const count=await select.locator('option').count();assert(count>1);row.parts=[]
    for(let i=0;i<count;i++){
     if(i){await select.selectOption(String(i));await longDialog.locator('[data-png-download]').waitFor({timeout:90000});await longDialog.locator('img').evaluate(el=>el.decode())}
     assert.equal(await select.inputValue(),String(i));await shot(page,'32clubs-part-'+(i+1))
     row.parts.push(await downloadPng(page,longDialog,'32clubs-part-'+(i+1)))
    }
    const totalPixelHeight=row.parts.reduce((sum,p)=>sum+p.height,0)
    assert(totalPixelHeight>=row.longVector.height*2-count,'parts must cover entire career')
    assert(totalPixelHeight<row.longVector.height*2+count*160,'no excessive repeated/corrupt pages')
    row.longQr=await decodeFooter(row.parts.at(-1));assert.equal(row.longQr,'https://footballcareer.zyrobbie.site/')
    await page.keyboard.press('Escape');await longDialog.waitFor({state:'hidden'})
    assert.equal(await page.evaluate(()=>localStorage.getItem('career_save_current')),longStored)
   }
   assert.deepEqual(row.errors,[]);assert.deepEqual(row.failedRequests,[]);row.passed=true
  }catch(e){row.failure=String(e);await shot(page,`${engine}-${width}-FAIL`).catch(()=>{});throw e}finally{await context.close()}
 }
 await browser.close();browser=null
 }
 report.passed=true
}catch(e){report.failure=String(e);process.exitCode=1}finally{await browser?.close();server?.kill('SIGTERM');await writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))}
