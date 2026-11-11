import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hiddenCargoHtml,customsConsentsHtml,customsDeskHtml,customsAdminHtml,customsInspectionHtml,hiddenCargoConfirmHtml,customsLicenseQuoteHtml,customsLicenseScopeHtml,hiddenCargoRequest,hiddenCargoErrors,submitHiddenCargo} from '../web/space-hidden-cargo.mjs';
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
 for(const page of ['hidden-cargo','customs-consents','customs','customs-inspection'])assert.equal(playerRoute(page,'s').space,'terminal');for(const page of ['customs-admin','customs-inspection-admin'])assert.equal(playerRoute(page,'s'),null);
 const app=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(app,/async function hiddenCargoPage/);assert.match(app,/submitHiddenCargo\(form.dataset.command,JSON.parse\(form.dataset.payload\),v/);const handler=app.slice(app.indexOf("if(kind==='hiddenCargoCommand')"),app.indexOf("if(kind==='moduleMandateCommand')"));assert.match(handler,/isCurrent:\(\)=>submitVersion===routeVersion/);assert.match(handler,/read:api,write:mutate/);
});

test('Décision B UI : volume déjà caché conservé pendant panne, nouveau rangement fermé sans affichage 5/0',()=>{
 const h=hiddenCargoHtml({...owner,hiddenUsed:5,hiddenCapacity:0,hiddenInstalledCapacity:5,stock:[{...lot,concealed:true}]});assert.match(h,/5 \/ 5 unités dissimulées/);assert.match(h,/biens déjà rangés restent cachés/);assert.match(h,/inspections habituelles restent possibles/);assert.match(h,/Sortir du compartiment/);assert.doesNotMatch(h,/Ranger dans le compartiment|5 \/ 0 unités/);
});

test('Douanes UI : contrôleur ignore un aperçu ou reçu arrivé après navigation',async()=>{
 for(const action of ['prepareCustomsInspection','finishCustomsInspection']){let current=true,release;const pending=new Promise(r=>release=r),calls=[],hooks={read:()=>pending,write:()=>pending,isCurrent:()=>current,confirm:()=>calls.push('modal'),close:()=>calls.push('close'),announce:()=>calls.push('notice'),navigate:()=>calls.push('navigate'),refresh:()=>calls.push('refresh')},request=submitHiddenCargo(action,{sessionId:'s'},{shipId:'ship',kind:'DEEP',present:'on',performed:'on'},hooks);current=false;release({id:'job'});await request;assert.deepEqual(calls,[]);}
});
test('Douanes UI : interruption secondaire séparée de la fin et attestations tactiles',()=>{
 const h=customsInspectionHtml({session,confirmation:'proof',inspection:{id:'job',shipName:'Ship',kind:'DEEP',status:'ACTIVE',canFinish:true,canCancel:true,remainingSeconds:0,pnj:false}});assert.match(h,/class="customs-cancel"/);assert.match(h,/Aucun résultat ne sera appliqué/);assert.match(h,/<button class="quiet">Interrompre le contrôle/);assert.match(h,/<button class="primary">Confirmer le contrôle/);const css=readFileSync(new URL('../web/galactic.css',import.meta.url),'utf8');assert.match(css,/\.cargo-customs \.check\{min-height:44px/);
});

test('Douanes UI : une seconde inspection distingue les anciens lots des nouvelles découvertes',()=>{
 const known={...lot,id:'old',item:{...lot.item,name:'<script>ancien</script>'}};
 const d={session,inspection:{id:'job',shipName:'Ship',kind:'DEEP',
  status:'COMPLETED',result:{roll:6,level:5,total:11,success:true,discovered:[],knownCargo:[known]}}};
 const html=customsInspectionHtml(d);
 assert.match(html,/Nouveaux lots découverts/);
 assert.match(html,/Aucun nouveau lot découvert/);
 assert.match(html,/Lots déjà découverts lors d’un contrôle antérieur/);
 assert.ok(html.includes('&lt;script&gt;ancien'));
 assert.doesNotMatch(html,/<script>/);
});

test('Douanes UI : devis LIC-02 distinct du paiement et sans données joueur',async()=>{
 const html=customsAdminHtml(admin);
 assert.match(html,/customsLicenseQuote/);
 assert.match(html,/LIC-01/);
 assert.match(html,/LIC-02/);
 assert.match(html,/LIC-03/);
 assert.match(html,/name="shipId"/);
 assert.doesNotMatch(customsAdminHtml({...admin,session:{...session,safetyStopped:true}}),/customsLicenseQuote/);
 assert.doesNotMatch(customsDeskHtml(desk),/customsLicenseQuote/);
 const payload=hiddenCargoRequest('customsLicenseQuote',{sessionId:'s'},
  {code:'LIC-02',referenceValue:'2501',die:'6',fee:'1'});
 assert.deepEqual(payload,{sessionId:'s',code:'LIC-02',referenceValue:2501});
 assert.deepEqual(hiddenCargoRequest('customsLicenseQuote',{sessionId:'s'},
  {code:'LIC-02',referenceValue:'2501',shipId:'ship'}),{sessionId:'s',code:'LIC-02',referenceValue:2501,shipId:'ship'});
 const output=customsLicenseQuoteHtml({code:'LIC-02',title:'Permis réglementé',
  exactFeeCr:'50.02',referenceValue:2501,scope:'Cargaison et voyage autorisés'});
 assert.match(output,/50,02 Cr/);
 assert.match(output,/Aucun crédit n’a été prélevé/);
 assert.doesNotMatch(output,/name="fee"|name="die"|<script>/);
 const linked=customsLicenseQuoteHtml({code:'LIC-02',title:'Permis',exactFeeCr:'50.02',scope:'Fret',
  cargoContext:{ship:{id:'ship',name:'<img src=x>',portId:'home'},journey:null,
   lots:[{id:'lot',name:'<script>secret</script>',quantity:2,unit:'caisse',status:'AVAILABLE',referenceUnitValueCr:320}]}});
 assert.match(linked,/Fret réel rattaché/);
 assert.match(linked,/Aucun voyage engagé/);
 assert.doesNotMatch(linked,/<img|<script>/);
 assert.match(linked,/&lt;img/);
 assert.match(linked,/320 Cr \/ unité/);
 const assessed=customsLicenseQuoteHtml({code:'LIC-02',title:'Permis',exactFeeCr:'50.02',scope:'Fret',
  cargoContext:{ship:{id:'ship',name:'<script>Port</script>',portId:'home'},voyage:null,portPolicy:{status:'PUBLISHED'},
   lots:[{name:'Bacta <script>',quantity:2,unit:'caisses',status:'AVAILABLE',referenceUnitValueCr:320,referenceTotalCr:'640',customsStatus:'REGULATED'}],
   regulatedKnownSubtotalCr:'640',regulatedLots:1,regulatedMissingReference:0,unclassifiedLots:0,prohibitedLots:0}});
 assert.match(assessed,/classification publiée du port/);
 assert.match(assessed,/réglementée/);
 assert.match(assessed,/640 Cr/);
 assert.match(assessed,/ne constitue pas une assiette fiscale certifiée/);
 assert.doesNotMatch(assessed,/<script>/);
});
test('Douanes UI : sélection des lots entiers réglementés, liaison publiée et valeurs protégées',()=>{
 const q={code:'LIC-02',title:'Permis',exactFeeCr:'50',scope:'Fret',requiredEvidence:[],
  cargoContext:{sessionId:'s',ship:{id:'ship',name:'Vaisseau',portId:'home'},portPolicy:{status:'PUBLISHED'},voyage:null,
   routeChoices:[{id:'out',name:'Route <script>',toPort:'away'}],
   lots:[{id:'a',name:'Bacta <img>',status:'AVAILABLE',customsStatus:'REGULATED',quantity:2,unit:'caisses',referenceTotalCr:'640',referenceUnitValueCr:320},
    {id:'b',name:'Libre',status:'AVAILABLE',customsStatus:'FREE',quantity:3,unit:'lot',referenceTotalCr:'150'}],
   regulatedLots:1,regulatedKnownSubtotalCr:'640',regulatedMissingReference:0,unclassifiedLots:0,prohibitedLots:0}};
 const h=customsLicenseQuoteHtml(q);
 assert.match(h,/name="lot_a"/);assert.doesNotMatch(h,/name="lot_b"/);
 assert.match(h,/name="routeId"/);assert.match(h,/customsLicenseScopePreview/);
 assert.match(h,/Prévisualiser le périmètre/);assert.doesNotMatch(h,/<script>|<img>/);
 const payload=hiddenCargoRequest('customsLicenseScopePreview',{sessionId:'s',shipId:'ship'},
  {routeId:'out',lot_a:'on',lot_b:'',fee:'0',amountPaid:'on'});
 assert.deepEqual(payload,{sessionId:'s',shipId:'ship',routeId:'out',lotIds:['a']});
 assert.doesNotMatch(customsLicenseQuoteHtml({...q,cargoContext:{...q.cargoContext,portPolicy:{status:'VERSION_MISMATCH'}}}),/name="lot_a"/);
});
test('Douanes UI : aperçu de périmètre et contrôle de lecture purement MJ',async()=>{
 const result={code:'LIC-02',ship:{id:'ship',name:'<script>Vaisseau</script>',portId:'home'},
  route:{id:'out',name:'Vers <img>',fromPort:'home',toPort:'away'},selectedLots:[{name:'<script>Bacta</script>',quantity:5,unit:'caisses',ownerId:'owner',referenceTotalCr:'1600'}],
  totalReferenceCr:'1600',exactFeeCr:'50',issued:false};
 const html=customsLicenseScopeHtml(result);
 assert.match(html,/périmètre proposé/);assert.match(html,/1600 Cr/);
 assert.match(html,/aucun crédit prélevé/);assert.match(html,/Ce n’est pas une autorisation douanière/);
 assert.doesNotMatch(html,/<script>|<img>|Délivrer|name="fee"/);
 const calls=[],hooks={read:async(a,p)=>{calls.push(['read',a,p]);return result;},write:()=>{throw Error('No write allowed');},
  isCurrent:()=>true,confirm:x=>calls.push(['confirm',x]),close:()=>{throw Error('No close');},
  announce:()=>{throw Error('No success');},refresh:()=>{throw Error('No refresh');}};
 await submitHiddenCargo('customsLicenseScopePreview',{sessionId:'s',shipId:'ship'},
  {routeId:'out',lot_a:'on',lot_b:'on',fee:'1'},hooks);
 assert.deepEqual(calls[0],['read','customsLicenseScopePreview',{sessionId:'s',shipId:'ship',routeId:'out',lotIds:['a','b']}]);
 assert.match(calls[1][1],/périmètre proposé/);
});
test('Douanes UI : identité du titulaire et droits de tiers affichés sans mandat ni données privées',()=>{
 const q={code:'LIC-02',title:'Permis',exactFeeCr:'50',scope:'Fret',requiredEvidence:[],
  cargoContext:{sessionId:'s',ship:{id:'ship',name:'Cargo',portId:'home'},portPolicy:{status:'PUBLISHED'},
   routeChoices:[{id:'out',name:'Route',toPort:'away'}],applicantChoices:[{id:'player',name:'Ada <script>'}],
   lots:[{id:'lot',name:'Caisses',status:'AVAILABLE',customsStatus:'REGULATED',quantity:2,unit:'caisse',referenceTotalCr:'640'}]}};
 const html=customsLicenseQuoteHtml(q);
 assert.match(html,/name="applicantCharacterId"/);
 assert.match(html,/Ada &lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.deepEqual(hiddenCargoRequest('customsLicenseScopePreview',{sessionId:'s',shipId:'ship'},
  {lot_lot:'on',routeId:'out',applicantCharacterId:'player',fee:'1',mandateVerified:'on'}),
  {sessionId:'s',shipId:'ship',routeId:'out',applicantCharacterId:'player',lotIds:['lot']});
 const display=customsLicenseScopeHtml({code:'LIC-02',ship:{id:'ship',name:'Cargo',portId:'home'},
  route:{id:'out',name:'Route',fromPort:'home',toPort:'away'},
  applicant:{id:'player',name:'Ada <script>'},
  selectedLots:[{id:'lot',name:'Caisses',quantity:2,unit:'caisse',ownerId:'other',referenceTotalCr:'640'}],
  ownershipEvidence:[{lotId:'lot',ownerType:'CHARACTER',ownerId:'other',relation:'THIRD_PARTY',mandateVerified:false}],
  shipOwnershipEvidence:{relation:'THIRD_PARTY',mandateVerified:false},
  voyageScopeEvidence:{sourcePortVisitId:'visited-123',masterVersionId:'v1',actualVoyageId:null,validityWindowDefined:false,departureAuthorized:false},
  totalReferenceCr:'640',exactFeeCr:'50'});
 assert.match(display,/Titulaire pressenti actif/);
 assert.match(display,/propriétaire différent, mandat nécessaire/);
 assert.match(display,/Période de validité du permis non définie/);
 assert.match(display,/Escale de référence : visited-123/);
 assert.doesNotMatch(display,/<script>|mandat validé|Autoriser le voyage/);
});
test('Douanes UI : terminal du propriétaire, accord révisable et preuve explicite',async()=>{
 const data={session:{id:'s',stage:'EN_JEU'},eligible:[{lotId:'lot',shipId:'ship',shipName:'Vaisseau <script>',lotName:'Bacta <img>',quantity:2,unit:'caisses',referenceTotalCr:'640',
  routeChoices:[{id:'out',name:'Route <script>',toPort:'away'}]}],
  applicantChoices:[{id:'applicant',name:'Ada <img>'}],consents:[]};
 const html=customsConsentsHtml(data);
 assert.match(html,/Mes consentements douaniers/);
 assert.match(html,/prepareCustomsLotConsent/);
 assert.match(html,/name="applicantCharacterId"/);
 assert.match(html,/name="routeId"/);
 assert.doesNotMatch(html,/<script>|<img>/);
 assert.doesNotMatch(customsConsentsHtml({...data,session:{id:'s',stage:'PAUSE'}}),/prepareCustomsLotConsent/);
 const payload=hiddenCargoRequest('prepareCustomsLotConsent',{sessionId:'s',lotId:'lot',shipId:'ship'},
  {applicantCharacterId:'applicant',routeId:'out',referenceValue:'0',consent:'on'});
 assert.deepEqual(payload,{sessionId:'s',lotId:'lot',shipId:'ship',routeId:'out',applicantCharacterId:'applicant'});
 const p={sessionId:'s',lotId:'lot',shipId:'ship',routeId:'out',applicantCharacterId:'applicant'};
 const confirm=hiddenCargoConfirmHtml('prepareCustomsLotConsent',{lotName:'Bacta <script>',referenceTotalCr:'640',shipName:'Vaisseau',
  applicantName:'Ada',routeName:'Route',confirmation:'proof'},p);
 assert.match(confirm,/grantCustomsLotConsent/);
 assert.match(confirm,/name="consent"/);
 assert.doesNotMatch(confirm,/<script>|name="fee"/);
 assert.deepEqual(hiddenCargoRequest('grantCustomsLotConsent',{...p,confirmation:'proof'},{
  consent:'on',amount:'1000'}),{...p,confirmation:'proof',consent:true});
 const approved={...data,eligible:[],consents:[{lotId:'lot',applicantId:'applicant',routeId:'out',status:'GRANTED',revision:1,confirmation:'revokeProof'}]};
 const ownerHtml=customsConsentsHtml(approved);
 assert.match(ownerHtml,/revokeCustomsLotConsent/);
 assert.match(ownerHtml,/name="confirmed"/);
 assert.deepEqual(hiddenCargoRequest('revokeCustomsLotConsent',{sessionId:'s',lotId:'lot',confirmation:'revokeProof'},{confirmed:'on'}),
 {sessionId:'s',lotId:'lot',confirmation:'revokeProof',confirmed:true});
 const revoked=customsConsentsHtml({...approved,consents:[{...approved.consents[0],status:'REVOKED'}]});
 assert.doesNotMatch(revoked,/revokeCustomsLotConsent/);
 const app=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');
 assert.match(app,/customs-consents/);
 assert.match(app,/myCustomsConsents/);
});
test('Douanes UI : vérification de l’accord dans le rapport MJ sans confusion avec licence',()=>{
 const q={code:'LIC-02',title:'Permis',scope:'Fret',exactFeeCr:'50',
  ship:{id:'ship',name:'Vaisseau',portId:'home'},route:{id:'out',name:'Route',fromPort:'home',toPort:'away'},
  applicant:{id:'applicant',name:'Ada'},selectedLots:[{id:'lot',name:'Bacta',quantity:2,unit:'caisses',ownerId:'owner',referenceTotalCr:'640'}],
  ownershipEvidence:[{lotId:'lot',ownerType:'CHARACTER',ownerId:'owner',relation:'THIRD_PARTY',consentVerified:true,mandateVerified:false}],
  shipOwnershipEvidence:{relation:'THIRD_PARTY',mandateVerified:false},
  voyageScopeEvidence:{sourcePortVisitId:'INITIAL:ship',masterVersionId:'v1',actualVoyageId:null,validityWindowDefined:false,departureAuthorized:false},
  totalReferenceCr:'640'};
 const current=customsLicenseScopeHtml(q);
 assert.match(current,/consentement personnel courant vérifié/);
 assert.match(current,/aucun titre n’est émis/);
 const missing=customsLicenseScopeHtml({...q,ownershipEvidence:[{...q.ownershipEvidence[0],consentVerified:false}]});
 assert.match(missing,/consentement absent, révoqué ou caduc/);
 assert.doesNotMatch(current,/<form|Paiement confirmé|Délivrer/);
});
test('Douanes UI : estimation LIC-03 en lecture seule, sans écriture ni reçu trompeur',async()=>{
 const calls=[];
 const hooks={read:async(name,p)=>{calls.push(['read',name,p]);return {
  code:'LIC-03',title:'Autorisation exceptionnelle',exactFeeCr:null,
  scope:'Mission, biens et durée définis par le MJ'};},
  write:()=>{throw Error('Aucune écriture pour un devis');},
  isCurrent:()=>true,confirm:html=>calls.push(['confirm',html]),
  close:()=>{throw Error('Pas de clôture de transaction');},
  announce:()=>{throw Error('Pas de succès de transaction');},
  refresh:()=>{throw Error('Pas de mutation')},
 };
 await submitHiddenCargo('customsLicenseQuote',{sessionId:'s'},{code:'LIC-03'},hooks);
 assert.equal(calls[0][0],'read');
 assert.equal(calls[1][0],'confirm');
 assert.match(calls[1][1],/à fixer par le MJ/);
 assert.match(calls[1][1],/aucun titre n’a été délivré/i);
});

test('Douanes UI : devis de licence affiche les justificatifs sans certifier leur vérification',()=>{
 const html=customsLicenseQuoteHtml({code:'LIC-03',title:'Autorisation exceptionnelle',
  exactFeeCr:null,scope:'Mission',requiredEvidence:['Mission <script>interdite</script>']});
 assert.match(html,/Éléments à vérifier avant toute délivrance/);
 assert.match(html,/aucun élément n’est automatiquement vérifié/);
 assert.ok(html.includes('&lt;script&gt;interdite'));
 assert.doesNotMatch(html,/<script>|Délivrer la licence|Paiement confirmé/);
});
