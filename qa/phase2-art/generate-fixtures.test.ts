/** Fresh anonymous engine/factory fixtures. Never reads real saves or private data. */
import {test,expect} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createEntertainmentV3Game} from '../../src/testing/createEntertainmentV3Game'
import {KEY_MATCH_MOMENT_TEMPLATES} from '../../src/data/keyMatchMomentTemplates'
import {createRandom} from '../../src/engine/random'
import {canonicalSimulationBase,prepareReadySimulation} from '../../src/engine/simulationPreparation'
import {simulateProfessionalHalfYear} from '../../src/engine/simulateProfessionalHalfYear'
import {createKeyMatchMoment,resolveKeyMatchMoment,momentSnapshot} from '../../src/engine/keyMatchMoments'
import {getCareerEvent,eligibleCareerEventChoices,resolveCareerEventChoice} from '../../src/engine/careerEvents'
import {recordV3StoryChoice} from '../../src/engine/offPitchStories'
import {validateGameState} from '../../src/persistence/save'
import type {GameState} from '../../src/models/game'
const out=resolve('qa/phase2-art/generated');
const base=(seed='PHASE2-RELEASE-ANONYMOUS')=>{const g=createEntertainmentV3Game(26,'eng_arsenal',seed);g.player!.name='示例球员';g.draft.name='示例球员';g.trainingFocus='BALANCED';g.developmentApproach='STEADY';return g}
test('fresh schema-validated isolated browser fixtures using unchanged real engine',()=>{
 mkdirSync(out,{recursive:true});const cases:any[]=[];
 const write=(name:string,g:GameState,expectations:Record<string,unknown>)=>{const valid=validateGameState(g);writeFileSync(resolve(out,name+'.json'),JSON.stringify(valid));cases.push({name,...expectations})};
 for(const id of ['KM-FWD-08','KM-CRE-02']){
  const template=KEY_MATCH_MOMENT_TEMPLATES.find(t=>t.id===id)!;expect(template).toBeTruthy();let g=base();g.player!.primaryPosition=template.positions[0]!;
  const legal=KEY_MATCH_MOMENT_TEMPLATES.filter(t=>t.positions.includes(g.player!.primaryPosition));
  for(let i=0;i<1000;i++){const seed='PHASE2-RELEASE-'+id+'-'+i;if(createRandom(seed,g.windowIndex,'key-match-moment-template').pick(legal).id===id){g=base(seed);g.player!.primaryPosition=template.positions[0]!;break}}
  g.player!.positionFamiliarity[g.player!.primaryPosition]=100;g.player!.positionFamiliarity[g.player!.secondaryPosition]=92;g=canonicalSimulationBase(g);const prep=prepareReadySimulation(g),r=simulateProfessionalHalfYear({state:prep.simulationState,offer:prep.offer});const p=createKeyMatchMoment(g,r.report);expect(p?.templateId).toBe(id);g.pendingKeyMatchMoment=p;g.phase='KEY_MATCH_MOMENT';write(id,g,{kind:'match',image:id==='KM-FWD-08',title:p!.title});
  if(id==='KM-FWD-08'){const choice=p!.choices[0]!.id,resolution=resolveKeyMatchMoment(p!,choice),snapshot=momentSnapshot(g,p!,resolution);g.pendingKeyMatchMoment={...p!,selectedChoiceId:choice,resolution,snapshot};g.phase='KEY_MATCH_MOMENT_RESULT';write(id+'-result',g,{kind:'match-result',image:false,resultText:resolution.text,applied:snapshot.appliedStatsDelta})}
 }
 for(const legacy of [false,true]){const g=base();g.phase='SPECIAL_EVENT';g.cashEuro=legacy?100:200000;g.pendingCareerEvent={eventId:'V3_E01_PRESS_DRINK',interactionKind:'CHOICE',stepIndex:0,selections:[],variantId:null};const event=getCareerEvent('V3_E01_PRESS_DRINK',g);write(legacy?'press-legacy':'press-modern',g,{kind:legacy?'legacy':'modern',image:true,title:event.title});
  if(!legacy){const c=eligibleCareerEventChoices(g,event)[0]!,r=resolveCareerEventChoice({state:g,eventId:event.id,choiceId:c.id});Object.assign(g,{phase:'SPECIAL_EVENT_RESULT',player:r.player,careerStory:r.careerStory,cashEuro:r.cashEuro,careerEventHistory:[r.record]});g.pendingCareerEvent!.selections=[c.id];g.entertainmentV3!.stories=recordV3StoryChoice(g,r.record);write('press-result',g,{kind:'event-result',image:false,outcome:r.record.outcomeSummary})}
 }
 const g=base(),event=getCareerEvent('COACH_TACTICAL_MEETING',g);expect(event.setup).toBeTruthy();g.phase='SPECIAL_EVENT';g.pendingCareerEvent={eventId:event.id,interactionKind:event.interactionKind,stepIndex:0,selections:[],variantId:null};write('event-step1',g,{kind:'step1',image:true,title:event.title});g.pendingCareerEvent={...g.pendingCareerEvent,stepIndex:1,selections:[event.setup!.options[0]!.id],variantId:event.setup!.options[0]!.id};write('event-step2',g,{kind:'step2',image:true,title:event.title,choiceCount:eligibleCareerEventChoices(g,event).filter(c=>event.setup!.options[0]!.choiceIds.includes(c.id)).length});
 writeFileSync(resolve(out,'cases.json'),JSON.stringify(cases,null,2));
},60000)
