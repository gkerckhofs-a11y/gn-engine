import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTerminal,terminalItems,personalTerminalHtml} from '../web/player-terminal.mjs';
const own=(classId='COM')=>({session:{id:'s',stage:'EN_JEU',spaceOutlaws:{shopsVersion:1,missionsVersion:1,bountyVersion:1,navigationVersion:1,logisticsVersion:1,combatVersion:1,hiddenCargoVersion:1,towingWorkVersion:1,moduleMandatesVersion:1,intelligenceVersion:1}},character:{id:'c',primaryClassId:classId,abilities:{skills:[]}},economyEnabled:true,groups:[],wallet:{account:{available:42}}});
const ids=(o,d)=>terminalItems(o,d).map(x=>x.id);
test('Terminal : prime exclusivement à la classe principale, pas aux compétences secondaires',()=>{
 const d={bounties:{bounties:[]}},o=own('TRA');assert.ok(ids(o,d).includes('bounties'));
 for(const cl of ['COM','MED','MEC','PIL','COU','INF','ROG']){o.character.primaryClassId=cl;o.character.abilities.skills=[{id:'TRA-03',level:5}];assert.ok(!ids(o,d).includes('bounties'));assert.doesNotMatch(personalTerminalHtml(o,d),/Primes ouvertes/);}
});
test('Terminal : Marché réservé au Courtier, boutiques et portefeuille ouverts aux autres classes',()=>{
 for(const cl of ['COU','MED']){const o=own(cl),d={shops:{shops:[{id:'s'}]},market:{economyEnabled:true}};assert.deepEqual(ids(o,d),cl==='COU'?['shops','wallet','market']:['shops','wallet']);assert.doesNotMatch(personalTerminalHtml(o,d),/licence|COU-03/);}
});
test('Terminal : propriétaire non pilote et pilote mandaté utilisent uniquement les projections autorisées',()=>{
 for(const cl of ['COM','PIL']){const o=own(cl);assert.ok(!ids(o,{}).includes('spaceport'));const d={ships:{ships:[{id:'ship',pilotId:cl==='PIL'?'c':'other'}]}};assert.ok(ids(o,d).includes('spaceport'));assert.doesNotMatch(personalTerminalHtml(o,d),/data-action=".*(Pilot|Flight)|SECRET/);}
});
test('Terminal : MEC secondaire et propriétaire suivent les interventions reçues, pas des travaux fictifs',()=>{
 const o=own();o.character.abilities.skills=[{id:'MEC-02',level:2}];assert.ok(!ids(o,{}).includes('space-maintenance'));
 const d={maintenance:{jobs:[{status:'OFFERED'}]},modules:{jobs:[{status:'APPROVED'}]},towing:{jobs:[{status:'TOWING_ACTIVE'}]}};
 for(const cl of ['MEC','COM']){o.character.primaryClassId=cl;assert.ok(ids(o,d).includes('space-maintenance'));assert.ok(ids(o,d).includes('module-mandates'));assert.ok(ids(o,d).includes('towing'));}
});
test('Terminal : consentements des propriétaires distincts de l’habilitation douanière',()=>{
 const o=own('TRA');o.character.abilities.skills=[{id:'TRA-03',level:5}];assert.ok(!ids(o,{}).includes('customs'));
 const d={consents:{eligible:[{lotId:'l'}]}};assert.ok(ids(o,d).includes('customs-consents'));assert.ok(!ids(o,d).includes('customs'));
 for(const cl of ['COM','COU']){o.character.primaryClassId=cl;assert.ok(ids(o,{customs:{level:1}}).includes('customs'));}
});
test('Terminal : passager sans droit de fret et membre sans mandat financier ne voient aucun stock ni caisse',()=>{
 const o=own();o.groups=[{id:'g',permissions:{}}];const d={ships:{ships:[{id:'ship'}]},cargo:{holds:[],transfers:[]},accounts:{accounts:[{kind:'CHARACTER'}]}};assert.ok(!ids(o,d).includes('cargo'));assert.ok(!ids(o,d).includes('accounts'));
 assert.ok(ids(o,{accounts:{accounts:[{kind:'GROUP'}]}}).includes('accounts'));assert.ok(ids(o,{cargo:{holds:[{id:'h'}]}}).includes('cargo'));
});
test('Terminal : historique conservé, pause expliquée, cartes ouvrant la route finale',()=>{
 const o=own(),d={contracts:{contracts:[{status:'SETTLED'}]},receipts:{receipts:[{status:'RETURNED'}]}};o.session.stage='PAUSE';const items=terminalItems(o,d);assert.equal(items.find(i=>i.id==='contracts').state,'READ_ONLY');assert.equal(items.find(i=>i.id==='wallet').state,'BLOCKED');
 assert.match(personalTerminalHtml(o,d),/#\/contracts\/s/);assert.match(personalTerminalHtml(o,d),/#\/customs-receipts\/s/);assert.match(personalTerminalHtml(o,d),/42 crédits/);
});
test('Terminal : Sabacc activé, registre autorisé et dossiers en cours uniquement',()=>{
 const o=own();assert.ok(!ids(o,{}).includes('sabacc'));assert.ok(!ids(o,{}).includes('directory'));o.directoryAllowed=true;
 const d={sabacc:{enabled:true},combats:{combats:[{status:'ACTIVE'}]},rescues:{rescues:[{status:'OFFERED'}]}};assert.ok(ids(o,d).includes('directory'));assert.ok(ids(o,d).includes('sabacc'));assert.match(personalTerminalHtml(o,d),/1 dossier\(s\) à suivre/);
});
test('Terminal : chargement sans droit inventé, modules éteints, erreurs explicites et recalcul de session',async()=>{
 const calls=[],api=async(a,p)=>{calls.push([a,p]);if(a==='customsDesk')throw Object.assign(Error(),{code:'FORBIDDEN'});if(a==='shops')throw Object.assign(Error(),{code:'NETWORK_ERROR'});return {};};
 const o=own('MED');let d=await loadTerminal(api,o);assert.ok(!calls.some(([a])=>a==='bounties'||a==='myAccounts'||a==='market'));assert.equal(d.customs,undefined);assert.deepEqual(d.errors,['shops']);
 calls.length=0;o.session={id:'other',spaceOutlaws:{}};o.economyEnabled=false;d=await loadTerminal(api,o);assert.deepEqual(calls,[['sabaccHome',{}]]);assert.equal(d.shops,undefined);
 calls.length=0;const t=own('TRA');t.groups=[{permissions:{readWallet:true}}];await loadTerminal(api,t);assert.ok(calls.some(([a,p])=>a==='bounties'&&p.sessionId==='s'));assert.ok(calls.some(([a])=>a==='myAccounts'));
});
