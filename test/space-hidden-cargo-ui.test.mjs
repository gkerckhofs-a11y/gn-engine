import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hiddenCargoHtml,customsDeskHtml,customsAdminHtml,customsInspectionHtml,hiddenCargoConfirmHtml,hiddenCargoRequest,hiddenCargoErrors} from '../web/space-hidden-cargo.mjs';
import {playerRoute} from '../web/player-spaces.mjs';

const session={id:'s',stage:'EN_JEU'},ship={id:'ship',name:'<img src=x>',capacity:20},lot={id:'lot',item:{name:'<script>Objet</script>',unit:'caisses',unitVolume:1},quantity:5,status:'AVAILABLE',concealed:false,discovered:true};
const owner={session,ship,hiddenCapacity:5,hiddenUsed:0,canMove:true,stock:[lot]},desk={session,level:2,ships:[{...ship,canInspect:true}],inspections:[]};
const admin={...desk,ports:[{id:'home',name:'Port'}],characters:[{id:'player',name:'Agent joueur',player:true,authority:{level:2,revision:7}},{id:'npc',name:'Agent PNJ',player:false,authority:{level:1,revision:2}}]};
test('Fret caché UI : volume inclus, lot entier, découverte conservée et contenu échappé',()=>{
 const h=hiddenCargoHtml(owner);assert.match(h,/0 \/ 5 unités dissimulées/);assert.match(h,/partie des 20 unités/);assert.match(h,/fractionnez-le/);assert.match(h,/déjà découvert/);assert.match(h,/prepareCargoConcealment/);assert.doesNotMatch(h,/<img|<script>|setCargoConcealment|name="quantity"/);
 const full=hiddenCargoHtml({...owner,hiddenUsed:5});assert.doesNotMatch(full,/prepareCargoConcealment/);const concealed=hiddenCargoHtml({...owner,hiddenUsed:5,stock:[{...lot,concealed:true}]});assert.match(concealed,/Sortir du compartiment/);
 for(const d of [{...owner,canMove:false},{...owner,stock:[{...lot,status:'CARGO_RESERVED'}]}])assert.doesNotMatch(hiddenCargoHtml(d),/<form/);
});
test('Fret caché UI : aperçu puis confirmation de manutention explicite, aucune disparition de découverte',()=>{
 const d={name:'<img>',volume:5,conceal:false,discovered:true,confirmation:'proof'},h=hiddenCargoConfirmHtml('prepareCargoConcealment',d,{sessionId:'s',shipId:'ship',lotId:'lot',conceal:false});assert.match(h,/Sortir du compartiment/);assert.match(h,/déplacement réel du lot entier/);assert.match(h,/La découverte reste enregistrée/);assert.match(h,/setCargoConcealment/);assert.doesNotMatch(h,/du le|<img>|name="(level|discovered|hiddenCargoVersion)"/);
});
test('Douanes UI : aperçu des coûts et seuils, pause et STOP sans démarrage',()=>{
 assert.match(customsDeskHtml(desk),/prepareCustomsInspection/);assert.match(customsDeskHtml(desk),/1D6 \+ niveau ≥ 7/);assert.doesNotMatch(customsDeskHtml(desk),/Agent PNJ|name="level"|startCustomsInspection/);
 for(const session of [{id:'s',stage:'PAUSE'},{id:'s',stage:'EN_JEU',safetyStopped:true}])assert.doesNotMatch(customsDeskHtml({...desk,session}),/<form/);assert.doesNotMatch(customsDeskHtml({...desk,ships:[{...ship,canInspect:false}]}),/<form/);
 const preview=hiddenCargoConfirmHtml('prepareCustomsInspection',{shipName:'Ship',kind:'DEEP',level:2,actionPoints:1,confirmation:'proof'},{});assert.match(preview,/1 PA réservé/);assert.match(preview,/startCustomsInspection/);assert.match(preview,/name="present"/);
 const ordinary=hiddenCargoConfirmHtml('prepareCustomsInspectionAdmin',{shipName:'Ship',kind:'ORDINARY',level:2,actionPoints:0,confirmation:'proof'},{});assert.match(ordinary,/0 PA/);assert.match(ordinary,/startCustomsInspectionAdmin/);assert.doesNotMatch(ordinary,/Succès sur/);
});
test('Douanes UI : fin personnelle, régie limitée au joueur, délai sans résolution automatique',()=>{
 const base={session,confirmation:'proof',inspection:{id:'job',shipName:'Ship',kind:'DEEP',status:'ACTIVE',pnj:false,remainingSeconds:10,canFinish:false,canCancel:true}};
 const waiting=customsInspectionHtml(base);assert.doesNotMatch(waiting,/finishCustomsInspection/);assert.match(waiting,/cancelCustomsInspection/);assert.match(waiting,/Aucune résolution automatique/);
 const ready=customsInspectionHtml({...base,inspection:{...base.inspection,remainingSeconds:0,canFinish:true}});assert.match(ready,/finishCustomsInspection/);assert.match(ready,/name="performed"/);
 const regie=customsInspectionHtml({...base,inspection:{...base.inspection,canFinish:true}},true);assert.doesNotMatch(regie,/finishCustomsInspectionAdmin/);assert.match(regie,/Seul l’agent joueur/);assert.match(regie,/cancelCustomsInspectionAdmin/);
});
test('Douanes UI : résultat distinct d’une absence de fraude, attestation ordinaire sans secret nouveau',()=>{
 const base={session,inspection:{id:'job',shipName:'Ship',kind:'DEEP',status:'COMPLETED',result:{roll:1,level:2,total:3,success:false,discovered:[]}}};let h=customsInspectionHtml(base);assert.match(h,/seuil non atteint/);assert.match(h,/Aucun nouveau lot découvert/);assert.doesNotMatch(h,/absence de fraude|aucune soute|<form/);
 h=customsInspectionHtml({...base,inspection:{...base.inspection,kind:'ORDINARY',result:{knownCargo:[lot]}}});assert.match(h,/Biens déjà connus/);assert.match(h,/ne valide ni l’authenticité/);assert.doesNotMatch(h,/<script>|D6/);
});
test('Douanes UI : régie, révisions et nouvelle tentative motivée, PNJ distinct des joueurs',()=>{
 const d={...admin,ships:[{...ship,confirmation:'shipProof',canRetry:true,attempt:{used:true}}]},h=customsAdminHtml(d);assert.match(h,/setCustomsAuthority/);assert.match(h,/Révoquer/);assert.match(h,/authorizeCustomsRetry/);assert.match(h,/prepareCustomsInspectionAdmin/);assert.match(h,/name="reason"/);assert.doesNotMatch(h,/finishCustomsInspectionAdmin|<img/);
 const fragment=h.slice(h.indexOf('name="agentId"'),h.indexOf('name="kind"'));assert.match(fragment,/Agent PNJ/);assert.doesNotMatch(fragment,/Agent joueur/);
 assert.doesNotMatch(customsAdminHtml({...d,session:{...session,safetyStopped:true}}),/<form/);
});
test('Douanes UI : protocole borné, chiffres éditables séparés des droits et du coût',()=>{
 const p={sessionId:'s',characterId:'player',authorityRevision:7};assert.deepEqual(hiddenCargoRequest('setCustomsAuthority',p,{level:'0',portId:'home',reason:'Fin du poste',authorityRevision:'99',die:'6'}),{...p,level:0,portId:'home',reason:'Fin du poste'});
 assert.deepEqual(hiddenCargoRequest('finishCustomsInspection',{sessionId:'s',inspectionId:'job',confirmation:'proof'},{present:'on',performed:'on',roll:'6',level:'5'}),{sessionId:'s',inspectionId:'job',confirmation:'proof',present:true,performed:true});
 for(const level of ['',undefined,'9','-1','2.5'])assert.throws(()=>hiddenCargoRequest('setCustomsAuthority',{}, {level}));assert.equal(hiddenCargoRequest('finishCustomsInspection',{},{}).present,false);assert.throws(()=>hiddenCargoRequest('setStage',{},{}));assert.match(hiddenCargoErrors.CUSTOMS_ATTEMPT_USED,/décision motivée/);
});
test('Douanes UI : parcours Terminal, routage existant et protection des réponses devenues obsolètes',()=>{
 for(const page of ['hidden-cargo','customs','customs-inspection'])assert.equal(playerRoute(page,'s').space,'terminal');for(const page of ['customs-admin','customs-inspection-admin'])assert.equal(playerRoute(page,'s'),null);
 const app=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(app,/async function hiddenCargoPage/);assert.match(app,/hiddenCargoRequest\(action,JSON.parse\(form.dataset.payload\),v\)/);assert.match(app,/modal\(hiddenCargoConfirmHtml/);const handler=app.slice(app.indexOf("if(kind==='hiddenCargoCommand')"),app.indexOf("if(kind==='moduleMandateCommand')"));assert.match(handler,/submitVersion!==routeVersion/);assert.match(handler,/await mutate\(action,p\)/);
});

test('Décision B UI : volume déjà caché conservé pendant panne, nouveau rangement fermé sans affichage 5/0',()=>{
 const h=hiddenCargoHtml({...owner,hiddenUsed:5,hiddenCapacity:0,hiddenInstalledCapacity:5,stock:[{...lot,concealed:true}]});assert.match(h,/5 \/ 5 unités dissimulées/);assert.match(h,/biens déjà rangés restent cachés/);assert.match(h,/inspections habituelles restent possibles/);assert.match(h,/Sortir du compartiment/);assert.doesNotMatch(h,/Ranger dans le compartiment|5 \/ 0 unités/);
});
