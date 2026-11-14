import test from 'node:test';
import assert from 'node:assert/strict';
import {tracePolicyHtml,tracePolicyPayload,traceSelectionHtml,traceConsentsHtml,traceResultHtml} from '../web/fictional-traces.mjs';
import {actionMenuItems,selectedTargetPath} from '../web/player-action-menu.mjs';
import {resolveCharacterInputs} from '../web/character-codes.mjs';
test('Traces : cartes selon compétences et intention conservée pour QR terrain, intrusion ou atelier',()=>{
 const own={session:{id:'s',stage:'EN_JEU',spaceOutlaws:{actionsVersion:1,fictionalTracesVersion:1}},character:{abilities:{skills:[{id:'FIL-01',level:1},{id:'EFF-01',level:3}]}}};const cards=actionMenuItems(own);for(const id of ['FIL-01','EFF-01']){const c=cards.find(c=>c.id===id);assert.ok(c);for(const kind of ['field','intrusion','forgery'])assert.equal(selectedTargetPath('https://gn.test/#/'+kind+'/s/point',c,'https://gn.test','s'),'point');assert.throws(()=>selectedTargetPath('https://gn.test/#/field/else/point',c,'https://gn.test','s'));}
});
test('Traces : accord explicite, alias personnage et fausse piste autorisée',async()=>{
 assert.match(traceSelectionHtml({title:'<point>',traceTargetId:'p',candidates:[{id:'t',name:'Moi',own:true}],falseLeads:[]},'s'),/name="traceId"/);assert.match(traceConsentsHtml({sessionId:'s',traces:[{id:'t',title:'Point'}],consents:[]}),/name="present" type="checkbox" required/);
 const input=await resolveCharacterInputs(async(a,v)=>{assert.equal(a,'resolveCharacterCode');assert.equal(v.code,'ABC123');return {characterId:'canonical'};},'consentTraceErasure',{sessionId:'s',recipientId:'ABC123'});assert.equal(input.recipientId,'canonical');
 assert.throws(()=>tracePolicyPayload({traceEnabled:'on',traceFalseLeads:'id | nom | texte'}));const p=tracePolicyPayload({traceEnabled:'on',traceMinLevel:'2',traceActions:'ANALYZE',traceFalseLeads:'id | nom | texte',traceLeadAuthorized:'on'});assert.equal(p.falseLeads[0].scenarioAuthorized,true);assert.equal(tracePolicyPayload({}),null);assert.match(tracePolicyHtml({kind:'INTRUSION'}),/INTRUSION/);
});
test('Traces : projection sans identité technique ni heure sous N2',()=>{
 assert.equal(traceResultHtml({found:false}), '');const h=traceResultHtml({found:true,characterName:'<nom>'});assert.match(h,/&lt;nom&gt;/);assert.doesNotMatch(h,/1970|undefined|UID/);
});

test('Traces spatiales : carte N4, données préparées et parcours sans seconde sélection',async()=>{
 const {pursuitSelectionHtml,spatialTraceResultHtml,shipTraceBindingsHtml}=await import('../web/fictional-traces.mjs');
 const own={session:{id:'s',stage:'EN_JEU',spaceOutlaws:{actionsVersion:1,fictionalTracesVersion:1}},character:{abilities:{skills:[{id:'FIL-01',level:3}]}}};assert.ok(!actionMenuItems(own).some(i=>i.pursuit));own.character.abilities.skills[0].level=4;assert.ok(actionMenuItems(own).find(i=>i.id==='FIL-01-pursuit').pursuit);
 assert.match(pursuitSelectionHtml({ships:[{id:'aboard',name:'<vaisseau>'}]},'s','beacon'),/data-target="beacon"/);assert.match(pursuitSelectionHtml({ships:[]},'s','beacon'),/embarquer/);
 const p=tracePolicyPayload({traceEnabled:'on',traceMinLevel:'1',traceActions:'DEPARTURE',traceRoutes:'out | Secteur voisin | fenêtre prévue'});assert.deepEqual(p.routes,[{routeId:'out',nextSegment:'Secteur voisin',arrivalWindow:'fenêtre prévue'}]);assert.match(tracePolicyHtml({tracePolicy:p}),/Secteur voisin/);
 assert.match(spatialTraceResultHtml({pursuit:{success:true,roll:6,total:10,current:false,nextSegment:'<secret>'}}),/n’est plus actuelle/);assert.match(spatialTraceResultHtml({pursuit:{success:true,nextSegment:'<secret>'}}),/&lt;secret&gt;/);
 assert.equal(shipTraceBindingsHtml({parent:{}}),'');assert.match(shipTraceBindingsHtml({parent:{tracesReady:true},fieldTargets:[{id:'b',title:'Balise',tracePolicy:p}],traceShips:[{id:'s',name:'Vaisseau'}]}),/data-field-form="traceBind"/);
});


test('Filature depuis le quai : préparation native, balise conservée et manifeste autorisé',async()=>{
 const {pursuitLaunchPath,pursuitLaunchShips,pursuitLaunchHtml,pursuitSelectionHtml}=await import('../web/fictional-traces.mjs');
 const ships=[{shipId:'mine',pilotId:'pilot',name:'<Cargo>',journey:null},{shipId:'passenger',pilotId:'other',name:'Transport',operation:{manifest:[{id:'pilot'}]}},{shipId:'owner-only',pilotId:'other',ownerId:'pilot'},{shipId:'moving',pilotId:'pilot',journey:{id:'voyage'}},{shipId:'wreck',pilotId:'pilot',wreckSpacePosition:{}}];
 assert.deepEqual(pursuitLaunchShips({ships},'pilot').map(s=>s.shipId),['mine','passenger']);
 const path=pursuitLaunchPath('session','beacon','mine');assert.equal(path,'#/act/session/FIL-01-pursuit/beacon?launchShipId=mine');
 const html=pursuitSelectionHtml({ships:[]},'session','beacon',pursuitLaunchShips({ships},'pilot'));
 assert.match(html,/Partir depuis le quai/);assert.match(html,/beacon\?launchShipId=mine/);assert.match(html,/&lt;Cargo&gt;/);assert.doesNotMatch(html,/owner-only|moving|wreck/);
 const launch=pursuitLaunchHtml('session','beacon','mine');assert.match(launch,/data-action="refresh"/);assert.match(launch,/pilote confirme son trajet/);assert.match(launch,/beacon\?launchShipId=mine/);
});
