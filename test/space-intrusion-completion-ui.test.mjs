import test from 'node:test';
import assert from 'node:assert/strict';
import {soIntrusionHtml,soIntrusionAdminHtml} from '../web/space-intrusion.mjs';
import {centralFieldTargetPayload} from '../web/central-field-targets.mjs';
import {centralFieldTargetInput,centralFieldTargetEditable} from '../src/core/central-field-targets.mjs';
import {soReleaseDefinitionChecks} from '../src/core/space-outlaws-release-check.mjs';
const raw={kind:'INTRUSION',title:'Serrure',description:'Fiction',gmNotes:'',intrusionCategory:'LOCK',intrusionLevel:'1',intrusionThreshold:'6',intrusionSuccess:'Ouvert fictivement',intrusionFailure:'Fermé',intrusionMode:'D6',intrusionBonus:'probe',intrusionConsumable:'circuit',intrusionQuantity:'2',intrusionLock:'300'};
test('INF-01 : préparation et refus du matériel incohérent, indices conservés par édition',()=>{
 const t=centralFieldTargetInput(centralFieldTargetPayload(raw),'lock');assert.deepEqual(t.intrusion.bonusItemIds,['probe']);assert.equal(t.intrusion.consumable.quantity,2);assert.equal(t.failureLockSeconds,300);
 const ch={id:'fieldTarget_lock',entityId:'lock',type:'fieldTarget',operation:'UPSERT',data:t};assert.ok(soReleaseDefinitionChecks([ch]).definitions.some(b=>b.code==='SO_INF01_ITEM'));
 const k=centralFieldTargetInput(centralFieldTargetPayload({...raw,intrusionMode:'CODE',intrusionHints:'first | 3 | Indice réservé',intrusionPrompt:'Trouver le code',intrusionAnswerCode:'ABCD',intrusionDuration:'90'}),'lock');
 assert.equal(k.intrusion.bonusItemIds,undefined);assert.equal(k.intrusion.consumable,undefined);assert.equal(k.failureLockSeconds,0);assert.equal(k.intrusion.hints[0].minLevel,3);
 assert.deepEqual(centralFieldTargetInput(centralFieldTargetEditable(k),'lock',k).intrusion,k.intrusion);
 for(const patch of [{hints:[{id:'bad',minLevel:2,text:'Trop tôt'}]},{bonusItemIds:['probe']},{consumable:{itemId:'circuit',quantity:1}}])assert.throws(()=>centralFieldTargetInput({...centralFieldTargetEditable(k),intrusion:{...k.intrusion,...patch}},'lock'));
});
test('INF-01 : parcours ordinaire, indice unique et annulation même après perte de compétence',()=>{
 const d={enabled:true,level:3,target:{id:'t',title:'Coffre',category:'SAFE',minLevel:1,threshold:6},session:{stage:'EN_JEU'},bonusLots:[{id:'probe',name:'Sonde'}],consumable:{quantity:2},consumableLots:[{id:'kit',name:'Circuit',quantity:3}],aidOffers:[{id:'aid',helperName:'Ali'}]};
 const h=soIntrusionHtml(d,'s');for(const name of ['bonusLotId','consumableLotId','aidOfferId'])assert.match(h,new RegExp('name="'+name+'"'));
 const active=soIntrusionHtml({...d,enabled:false,active:{id:'a',targetId:'t',mode:'CODE',status:'RUNNING',remainingMs:0},hints:[{id:'hint',minLevel:3,used:false}]},'s');assert.match(active,/soIntrusionCancel/);assert.match(active,/soIntrusionHint/);assert.doesNotMatch(active,/name="bonusLotId"/);
 const admin=soIntrusionAdminHtml({actions:[{id:'a',characterName:'<Nom>',remainingMs:1}]},'s');assert.match(admin,/soIntrusionCancelMJ/);assert.match(admin,/name="reason"/);assert.doesNotMatch(admin,/<Nom>/);
});
