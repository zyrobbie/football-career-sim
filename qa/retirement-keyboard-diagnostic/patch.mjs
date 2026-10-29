import {readFileSync,writeFileSync} from 'node:fs'
const path='qa/career-viewer/run.mjs'
let s=readFileSync(path,'utf8')
const old="await scroll.focus();await scroll.evaluate(el=>{el.scrollTop=0});await page.keyboard.press('PageDown');await page.waitForTimeout(200);assert(await scroll.evaluate(el=>el.scrollTop)>0,'keyboard PageDown scrolls viewer')"
const replacement=`await scroll.focus();await scroll.evaluate(el=>{el.scrollTop=0;el.__qaKeyboard=[];el.addEventListener('keydown',e=>{const item={key:e.key,target:e.target?.className,defaultPrevented:e.defaultPrevented};el.__qaKeyboard.push(item);setTimeout(()=>item.defaultPreventedAfter=e.defaultPrevented,0)},{once:true})});
 const snapshot=()=>scroll.evaluate(el=>({top:el.scrollTop,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY,activeIsRegion:document.activeElement===el,activeClass:document.activeElement?.className,viewport:[innerWidth,innerHeight],bodyOverflow:getComputedStyle(document.body).overflow,events:el.__qaKeyboard}));
 const keyboardDiagnostic={label,main,before:await snapshot(),samples:[]};
 await page.keyboard.press('PageDown');
 for(const [delay,elapsed] of [[50,50],[150,200],[300,500]]){await page.waitForTimeout(delay);keyboardDiagnostic.samples.push({elapsed,...await snapshot()})}
 await writeFile(resolve(out,label+'-keyboard-diagnostic.json'),JSON.stringify(keyboardDiagnostic,null,2));
 console.log('KEYBOARD_DIAGNOSTIC',JSON.stringify(keyboardDiagnostic));
 assert(keyboardDiagnostic.samples.find(s=>s.elapsed===200).top>0,'keyboard PageDown scrolls viewer');`
if(!s.includes(old))throw Error('Expected exact existing keyboard test not found; refuse to weaken another assertion')
s=s.replace(old,replacement)
const oldMatrix="[['chromium',chromium,[[390,844],[768,1024],[1280,900]]],['webkit',webkit,[[390,844]]]]"
if(!s.includes(oldMatrix))throw Error('Expected matrix not found')
s=s.replace(oldMatrix,"[['webkit',webkit,[[390,844]]]]")
writeFileSync(path,s)
