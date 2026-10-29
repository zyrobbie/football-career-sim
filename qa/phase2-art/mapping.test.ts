/** Review-public mapping expectations only; no hidden outcome/delta registry. */
import {test,expect} from 'vitest'
import contexts from './approved-contexts.json'
import {resolveCareerEventIllustration,resolveMatchIllustration} from '../../src/ui/sceneIllustrations'
import {createEntertainmentV3Game} from '../../src/testing/createEntertainmentV3Game'
import {getCareerEvent,resolveCareerEventChoice} from '../../src/engine/careerEvents'
import {recordV3StoryChoice} from '../../src/engine/offPitchStories'
import {KEY_MATCH_MOMENT_TEMPLATES} from '../../src/data/keyMatchMomentTemplates'
import type {CareerEventId} from '../../src/models/game'
import type {PendingKeyMatchMoment} from '../../src/models/keyMatchMoment'
const base=()=>createEntertainmentV3Game(26,'eng_arsenal','PHASE2-PUBLIC-MAPPING-EXPECTATIONS')
for(const row of contexts.filter(r=>r.entityType==='event'))test('approved event context '+row.variantKey,()=>{
 const g=base(),guard=row.contextGuard as Record<string,unknown>|undefined;
 if(guard?.firstEventId){const r=resolveCareerEventChoice({state:g,eventId:guard.firstEventId as CareerEventId,choiceId:guard.firstChoiceId as never});g.careerEventHistory=[r.record];g.player=r.player;g.cashEuro=r.cashEuro;g.careerStory=r.careerStory;g.entertainmentV3!.stories=recordV3StoryChoice(g,r.record);g.windowIndex++;if(guard.clubRelation==='moved-club')g.selectedClubId='ger_bayern'}
 g.phase='SPECIAL_EVENT';g.pendingCareerEvent={eventId:row.entityId as CareerEventId,interactionKind:'CHOICE',stepIndex:0,selections:[],variantId:null};if(row.variantKey.endsWith('@legacy-pending'))g.cashEuro=100;
 const event=getCareerEvent(row.entityId as CareerEventId,g);g.pendingCareerEvent.interactionKind=event.interactionKind;
 const image=resolveCareerEventIllustration(event,g);expect(image?.id).toBe(row.artGroup);expect(image?.kind).toBe('event');expect(image?.src).toMatch(/\.webp$/);
 expect(resolveCareerEventIllustration({...event,title:event.title+'未知旧版本'},g)).toBeNull();
 expect(resolveCareerEventIllustration({...event,description:'未经审核的新场景'},g)).toBeNull();
})
test('all13approved match templates guard semantic snapshot and position; unknown/no generic fallback',()=>{
 const approved=['KM-FWD-01','KM-FWD-02','KM-FWD-03','KM-FWD-04','KM-FWD-05','KM-FWD-06','KM-FWD-07','KM-FWD-08','KM-CRE-01','KM-MID-01','KM-CB-01','KM-CB-02','KM-FB-04'];
 for(const id of approved){const t=KEY_MATCH_MOMENT_TEMPLATES.find(t=>t.id===id)!;const p={templateId:id,templateRevision:t.revision,title:t.title,scene:t.scene} as PendingKeyMatchMoment;expect(resolveMatchIllustration(p,t.positions[0]!)?.kind).toBe('match');expect(resolveMatchIllustration({...p,templateRevision:999},t.positions[0]!)).toBeNull();expect(resolveMatchIllustration({...p,scene:'未知旧存档语义'},t.positions[0]!)).toBeNull();const other=(['ST','CAM','CB','LB'] as const).find(pos=>!t.positions.includes(pos));if(other)expect(resolveMatchIllustration(p,other)).toBeNull()}
 const t=KEY_MATCH_MOMENT_TEMPLATES.find(t=>t.id==='KM-CRE-02')!;expect(resolveMatchIllustration({templateId:t.id,templateRevision:t.revision,title:t.title,scene:t.scene} as PendingKeyMatchMoment,t.positions[0]!)).toBeNull();
})
test('audit set remains104eventIDs203branches plus8FWD; modern and legacy bottle resolve independently',()=>{
 const events=contexts.filter(r=>r.entityType==='event');expect(events).toHaveLength(203);expect(new Set(events.map(r=>r.entityId)).size).toBe(104);expect(contexts.filter(r=>r.entityType==='match')).toHaveLength(8);
 const g=base();g.phase='SPECIAL_EVENT';g.pendingCareerEvent={eventId:'V3_E01_PRESS_DRINK',interactionKind:'CHOICE',stepIndex:0,selections:[],variantId:null};expect(resolveCareerEventIllustration(getCareerEvent('V3_E01_PRESS_DRINK',g),g)?.id).toBe('E-34');g.cashEuro=100;expect(resolveCareerEventIllustration(getCareerEvent('V3_E01_PRESS_DRINK',g),g)?.id).toBe('E-43');
})

test('followup art is unavailable without the factual originating chain or outside its real window',()=>{
 const g=base(),r=resolveCareerEventChoice({state:g,eventId:'V3_C01A_LOCAL_CAR',choiceId:'FULL'});g.careerEventHistory=[r.record];g.player=r.player;g.cashEuro=r.cashEuro;g.careerStory=r.careerStory;g.entertainmentV3!.stories=recordV3StoryChoice(g,r.record);g.windowIndex++;const event=getCareerEvent('V3_C01B_LOCAL_CAR_RETURN',g);expect(resolveCareerEventIllustration(event,g)).not.toBeNull();
 const expired=structuredClone(g);expired.windowIndex+=3;expect(resolveCareerEventIllustration(event,expired)).toBeNull();
 const missing=structuredClone(g);missing.entertainmentV3!.stories.activeChain=null;expect(resolveCareerEventIllustration(event,missing)).toBeNull();
})
