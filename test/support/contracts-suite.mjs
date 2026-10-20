import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inventoryFixture} from './inventory-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
export const contractCommands=['sessionContracts','sessionContract','prepareMissionContract','proposeMissionContract','prepareContractReview','reviewContract','prepareContractClosure','closeContract','myContracts','contractDetail','prepareContractAcceptance','acceptContract','declineContract','prepareContractProof','submitContractProof','markContractRead'];
export async function contractFixture(makeStore){
  const f=await inventoryFixture(makeStore,null),sid=f.sessionId;
  await f.cmd('saveSessionEconomy',f.owner,{sessionId:sid,revision:(await f.session()).revision,rules:{enabled:true,name:'Crédits synthétiques',unit:'cr'},reason:'Test'});
  const credit=async(amount=100)=>{const p={sessionId:sid,revision:(await f.session()).revision,characterId:f.characters[0],mode:'CREDIT',amount,memo:'Fonds synthétiques',reason:'Test'},d=await f.read('prepareCreditAdjustment',f.owner,p);return f.cmd('applyCreditAdjustment',f.owner,{...p,confirmation:d.confirmation});};await credit();
  const values={sessionId:sid,revision:0,title:'Mission synthétique',category:'ESCORT',mode:'ASSIGNMENT',description:'Conduire un convoi fictif',sponsorKind:'NPC',sponsorName:'Comptoir couvert',rewardType:'NEGOTIABLE',rewardText:'À convenir',places:1,conditions:'Conditions de départ',proofExpected:'Récit au MJ',briefing:'BRIEFING_CONTRAT_RESERVE',gmNotes:'SECRET_MJ_JAMAIS_COPIE',publication:'PUBLISHED',opensAt:100000,deadline:1000000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'MOTIF_TECHNIQUE_MJ'};
  const d=await f.read('prepareAnnouncement',f.owner,values),{id:aid}=await f.cmd('saveAnnouncement',f.owner,{...values,confirmation:d.confirmation});
  const announcement=async()=> (await f.read('sessionAnnouncements',f.owner,{sessionId:sid})).announcements.find(a=>a.id===aid);
  const edit=async patch=>{const p={...await announcement(),...patch,sessionId:sid,announcementId:aid,reason:'Modification de test'},d=await f.read('prepareAnnouncement',f.owner,p);return f.cmd('saveAnnouncement',f.owner,{...p,confirmation:d.confirmation});};
  const apply=async(who=f.bob,intent='APPLICATION')=>{const p={sessionId:sid,announcementId:aid,intent,body:'Candidature privée',proposedReward:'37 crédits'},d=await f.read('prepareAnnouncementResponse',who,p);return f.cmd('respondAnnouncement',who,{...p,confirmation:d.confirmation});};
  const application=await apply();
  const prepare=async(patch={},who=f.owner)=>{const input={sessionId:sid,applicationId:application.id,amount:37,durationMinutes:10,funding:'ACCOUNT',sourceAccountId:accountId(f.characters[0]),advance:0,guarantee:0,conditions:'Escorter le convoi',proofExpected:'Décrire son arrivée au MJ',confidentiality:'Briefing réservé au titulaire',failureTerms:'Le MJ peut annuler et libérer les fonds sans paiement',reason:'MOTIF_FINANCEMENT_MJ',...patch};return {input,result:await f.read('prepareMissionContract',who,input)};};
  const propose=(p,who=f.owner,patch={})=>f.cmd('proposeMissionContract',who,{...p.input,confirmation:p.result.confirmation,...patch});
  const detail=(id,who=f.bob)=>f.read('contractDetail',who,{sessionId:sid,contractId:id});
  const adminDetail=(id,who=f.owner)=>f.read('sessionContract',who,{sessionId:sid,contractId:id});
  const prepareAccept=(id,who=f.bob)=>f.read('prepareContractAcceptance',who,{sessionId:sid,contractId:id});
  const accept=(id,p,who=f.bob,patch={})=>f.cmd('acceptContract',who,{sessionId:sid,contractId:id,confirmation:p.confirmation,...patch});
  const accepted=async(patch={})=>{const r=await propose(await prepare(patch));await accept(r.id,await prepareAccept(r.id));return r.id;};
  const prepareProof=async(id,body='Le convoi est arrivé',who=f.bob)=>{const input={sessionId:sid,contractId:id,body};return {input,result:await f.read('prepareContractProof',who,input)};};
  const submit=(p,who=f.bob,patch={})=>f.cmd('submitContractProof',who,{...p.input,confirmation:p.result.confirmation,...patch});
  const prepareReview=async(id,patch={},who=f.owner)=>{const input={sessionId:sid,contractId:id,decision:'PAY',reason:'Preuve vérifiée par le MJ',...patch};return {input,result:await f.read('prepareContractReview',who,input)};};
  const review=(p,who=f.owner,patch={})=>f.cmd('reviewContract',who,{...p.input,confirmation:p.result.confirmation,...patch});
  const prepareClose=async(id,patch={})=>{const input={sessionId:sid,contractId:id,decision:'CANCEL',reason:'Annulation expliquée au candidat',...patch};return {input,result:await f.read('prepareContractClosure',f.owner,input)};};
  const close=(p,patch={})=>f.cmd('closeContract',f.owner,{...p.input,confirmation:p.result.confirmation,...patch});
  const account=(who=f.alice)=>f.read('myWallet',who,{sessionId:sid});
  return {...f,aid,application,values,credit,announcement,edit,apply,prepareContract:prepare,propose,detail,adminDetail,prepareAccept,accept,accepted,prepareProof,submit,prepareReview,review,prepareClose,close,account};
}
export function contractsSuite(makeStore,prefix='Contrats'){
  const fixture=()=>contractFixture(makeStore);
  test(`${prefix} : proposition sans réservation, conditions privées et briefing verrouillé`,async()=>{
    const f=await fixture(),p=await f.prepareContract(),before=(await f.account()).account,r=await f.propose(p),d=await f.detail(r.id);assert.deepEqual((await f.account()).account,before);assert.equal(d.contract.status,'PROPOSED');assert.equal(d.contract.terms.amount,37);assert.equal(d.contract.briefing,null);assert.equal((await f.announcement()).assignedCount,0);
    for(const hidden of ['BRIEFING_CONTRAT_RESERVE','SECRET_MJ_JAMAIS_COPIE','MOTIF_FINANCEMENT_MJ',f.owner.email,f.owner.uid,accountId(f.characters[0]),'sourceAccountId','approvedBy'])assert.equal(JSON.stringify(d).includes(hidden),false,hidden);
    await assert.rejects(f.detail(r.id,f.eve),{code:'FORBIDDEN'});assert.equal((await f.read('myContracts',f.eve,{sessionId:f.sessionId})).contracts.length,0);
  });
  test(`${prefix} : acceptation réserve exactement le montant et ouvre le briefing sans notes MJ`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id),requestId=randomUUID(),result=await f.accept(r.id,p,f.bob,{requestId});assert.deepEqual(await f.accept(r.id,p,f.bob,{requestId}),result);
    const d=await f.detail(r.id),a=(await f.account()).account;assert.equal(d.contract.briefing,'BRIEFING_CONTRAT_RESERVE');assert.equal(JSON.stringify(d).includes('SECRET_MJ'),false);assert.equal(d.contract.remainingGameMs,600000);assert.equal(a.balance,100);assert.equal(a.reserved,37);assert.equal(a.available,63);assert.equal((await f.account(f.bob)).account.balance,0);assert.equal((await f.announcement()).status,'FILLED');
    assert.equal((await f.store.list(`sessions/${f.sessionId}/ledger`)).filter(e=>e.kind==='CONTRACT_RESERVE').length,1);
    await assert.rejects(f.cmd('withdrawApplication',f.bob,{sessionId:f.sessionId,applicationId:f.application.id,confirmation:'x'}),{code:'APPLICATION_CLOSED'});
  });
  test(`${prefix} : deux candidats pour la dernière place, une seule attribution`,async()=>{
    const f=await fixture(),other=await f.apply(f.eve),a=await f.propose(await f.prepareContract()),b=await f.propose(await f.prepareContract({applicationId:other.id,amount:53})),ap=await f.prepareAccept(a.id),bp=await f.prepareAccept(b.id,f.eve);
    const rs=await Promise.allSettled([f.accept(a.id,ap),f.accept(b.id,bp,f.eve)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.announcement()).assignedCount,1);assert.ok([37,53].includes((await f.account()).account.reserved));
  });
  test(`${prefix} : deux places acceptent deux accords distincts sans révéler le concurrent`,async()=>{
    const f=await fixture();await f.edit({places:2});const other=await f.apply(f.eve),a=await f.propose(await f.prepareContract()),b=await f.propose(await f.prepareContract({applicationId:other.id,amount:53}));await f.accept(a.id,await f.prepareAccept(a.id));await f.accept(b.id,await f.prepareAccept(b.id,f.eve),f.eve);assert.equal((await f.account()).account.reserved,90);assert.equal((await f.announcement()).assignedCount,2);assert.equal((await f.read('myContracts',f.bob,{sessionId:f.sessionId})).contracts.length,1);const visible=await f.detail(a.id);assert.equal(visible.contract.terms.amount,37);assert.equal(visible.contract.applicant.id,f.characters[1]);for(const hidden of [b.id,other.id,f.eve.uid,'Secours'])assert.equal(JSON.stringify(visible).includes(hidden),false,hidden);
  });
  test(`${prefix} : seconde proposition active interdite et contre-offre requiert une nouvelle validation`,async()=>{
    const f=await fixture(),p=await f.prepareContract(),r=await f.propose(p);await assert.rejects(f.prepareContract(),{code:'CONTRACT_EXISTS'});const before=await f.prepareAccept(r.id);await f.close(await f.prepareClose(r.id));const next=await f.propose(await f.prepareContract({amount:45}));await assert.rejects(f.accept(next.id,before),{code:'STALE_REVISION'});assert.equal((await f.account()).account.reserved,0);
  });
  test(`${prefix} : modifier l’annonce invalide une offre mais conserve le contrat accepté`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id);await f.edit({rewardText:'Nouvelle récompense',briefing:'NOUVEAU_BRIEFING'});await assert.rejects(f.accept(r.id,p),{code:'STALE_CONTRACT'});await f.close(await f.prepareClose(r.id));const id=await f.accepted();await f.edit({title:'Titre changé',briefing:'BRIEFING_PLUS_RECENT',publication:'CANCELLED',audience:{kind:'TARGETED',characterIds:[f.characters[2]],groupIds:[]}});const d=await f.detail(id);assert.equal(d.contract.title,'Mission synthétique');assert.equal(d.contract.terms.amount,37);assert.equal(d.contract.briefing,'NOUVEAU_BRIEFING');assert.equal(d.canSubmit,true);
  });
  test(`${prefix} : capacité et mode ne peuvent contredire les attributions déjà acceptées`,async()=>{
    const f=await fixture();await f.edit({places:2});await f.accepted();await assert.rejects(f.edit({mode:'OPEN_BOUNTY'}),{code:'MISSION_PLACES_LOCKED'});await assert.rejects(f.edit({places:0}));await f.edit({places:1});assert.equal((await f.announcement()).status,'FILLED');
  });
  test(`${prefix} : aucune acceptation après échéance ou retrait de l’audience`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id);await f.edit({audience:{kind:'TARGETED',characterIds:[f.characters[2]],groupIds:[]}});await assert.rejects(f.accept(r.id,p),{code:'FORBIDDEN'});assert.equal((await f.read('myContracts',f.bob,{sessionId:f.sessionId})).contracts.length,0);assert.equal((await f.account()).account.reserved,0);
    await f.close(await f.prepareClose(r.id));await f.edit({audience:f.values.audience});const next=await f.propose(await f.prepareContract()),np=await f.prepareAccept(next.id);f.advance(900000);await assert.rejects(f.accept(next.id,np),{code:'ANNOUNCEMENT_CLOSED'});
  });
  test(`${prefix} : argent devenu insuffisant ne réserve ni fonds ni place`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id),input={sessionId:f.sessionId,recipientId:f.characters[2],amount:90,memo:'Dépense antérieure'},pay=await f.read('preparePayment',f.alice,input);await f.cmd('payCredits',f.alice,{...input,confirmation:pay.confirmation});await assert.rejects(f.accept(r.id,p),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.account()).account.reserved,0);assert.equal((await f.announcement()).assignedCount,0);
  });
  test(`${prefix} : crédits réservés indisponibles aux paiements et corrections MJ`,async()=>{
    const f=await fixture();await f.accepted();await assert.rejects(f.read('preparePayment',f.alice,{sessionId:f.sessionId,recipientId:f.characters[2],amount:64,memo:'Trop'}),{code:'INSUFFICIENT_FUNDS'});await assert.rejects(f.read('prepareCreditAdjustment',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[0],mode:'DEBIT',amount:64,memo:'Trop',reason:'Test'}),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.account()).account.reserved,37);
  });
  test(`${prefix} : preuve puis règlement concurrent et rejoué ne paient qu’une fois`,async()=>{
    const f=await fixture(),id=await f.accepted();await assert.rejects(f.prepareReview(id),{code:'CONTRACT_NOT_SUBMITTED'});const proof=await f.prepareProof(id);await f.submit(proof);const p=await f.prepareReview(id),requestId=randomUUID(),rs=await Promise.allSettled([f.review(p,f.owner,{requestId}),f.review(p)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);const winner=rs[0].status==='fulfilled';if(winner)assert.deepEqual(await f.review(p,f.owner,{requestId}),rs[0].value);
    assert.equal((await f.account()).account.balance,63);assert.equal((await f.account()).account.reserved,0);assert.equal((await f.account(f.bob)).account.balance,37);assert.equal((await f.detail(id)).contract.status,'PAID');assert.equal((await f.announcement()).assignedCount,1);const ledger=await f.store.list(`sessions/${f.sessionId}/ledger`);assert.equal(ledger.filter(e=>e.kind==='CONTRACT_PAY').length,1);const event=ledger.find(e=>e.kind==='CONTRACT_PAY');assert.equal(event.entries.reduce((n,e)=>n+e.delta,0),0);assert.equal(event.contractId,id);assert.equal(event.createdCurrency,0);assert.ok((await f.account(f.bob)).entries.some(e=>e.contractId===id));
  });
  test(`${prefix} : financement extérieur identifié comme création de crédits au seul règlement`,async()=>{
    const f=await fixture(),id=await f.accepted({funding:'GM_EXTERNAL'});assert.equal((await f.account()).account.reserved,0);await f.submit(await f.prepareProof(id));const p=await f.prepareReview(id);assert.equal(p.result.createdCurrency,37);await f.review(p);assert.equal((await f.account()).account.balance,100);assert.equal((await f.account(f.bob)).account.balance,37);const e=(await f.store.list(`sessions/${f.sessionId}/ledger`)).find(e=>e.kind==='GM_CONTRACT_PAY');assert.equal(e.createdCurrency,37);assert.equal(e.entries.length,1);
  });
  test(`${prefix} : horloge de jeu figée en pause, échéance bloque preuve et expiration libère une fois`,async()=>{
    const f=await fixture(),id=await f.accepted({durationMinutes:1});f.advance(30000);await f.stage('PAUSE');f.advance(120000);assert.equal((await f.detail(id)).contract.remainingGameMs,30000);await assert.rejects(f.prepareProof(id),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');f.advance(30000);assert.equal((await f.detail(id)).contract.status,'OVERDUE');await assert.rejects(f.prepareProof(id),{code:'CONTRACT_OVERDUE'});const p=await f.prepareClose(id,{decision:'EXPIRE'}),requestId=randomUUID();await f.close(p,{requestId});await f.close(p,{requestId});assert.equal((await f.account()).account.reserved,0);assert.equal((await f.account()).account.balance,100);assert.equal((await f.announcement()).assignedCount,0);assert.equal((await f.detail(id)).contract.status,'EXPIRED');
  });
  test(`${prefix} : preuve remise à temps peut être validée après échéance`,async()=>{
    const f=await fixture(),id=await f.accepted({durationMinutes:1});await f.submit(await f.prepareProof(id));f.advance(60000);await assert.rejects(f.prepareClose(id,{decision:'EXPIRE'}),{code:'CONTRACT_NOT_OVERDUE'});await f.review(await f.prepareReview(id));assert.equal((await f.account(f.bob)).account.balance,37);
  });
  test(`${prefix} : demande de complément conserve l’ancien récit et les fonds`,async()=>{
    const f=await fixture(),id=await f.accepted();await f.submit(await f.prepareProof(id,'Premier récit'));await f.review(await f.prepareReview(id,{decision:'RETURN',reason:'Précisez le lieu'}));assert.equal((await f.detail(id)).contract.status,'ACTIVE');assert.equal((await f.account()).account.reserved,37);await f.submit(await f.prepareProof(id,'Second récit'));const d=await f.detail(id);assert.ok(d.history.some(e=>e.body==='Premier récit'));assert.ok(d.history.some(e=>e.body==='Second récit'));assert.ok(d.history.some(e=>e.reason==='Précisez le lieu'));
  });
  test(`${prefix} : refus et annulation sont visibles et une nouvelle proposition reste possible`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract());await f.cmd('declineContract',f.bob,{sessionId:f.sessionId,contractId:r.id,revision:1});const id=await f.accepted();await f.close(await f.prepareClose(id));const d=await f.detail(id);assert.equal(d.contract.status,'CANCELLED');assert.ok(d.history.some(e=>e.reason==='Annulation expliquée au candidat'));assert.equal((await f.account()).account.reserved,0);assert.equal((await f.account(f.bob)).account.balance,0);assert.equal((await f.announcement()).status,'OPEN');await f.propose(await f.prepareContract());
  });
  test(`${prefix} : validation et annulation concurrentes ne doublent pas le traitement des fonds`,async()=>{
    const f=await fixture(),id=await f.accepted();await f.submit(await f.prepareProof(id));const pay=await f.prepareReview(id),close=await f.prepareClose(id),rs=await Promise.allSettled([f.review(pay),f.close(close)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);const a=(await f.account()).account,b=(await f.account(f.bob)).account;assert.equal(a.reserved,0);assert.equal(a.balance+b.balance,100);assert.ok([0,37].includes(b.balance));
  });
  test(`${prefix} : révocation ou réattribution bloque ancien contrat et règlement au successeur`,async()=>{
    const f=await fixture(),id=await f.accepted();await f.submit(await f.prepareProof(id));const p=await f.prepareReview(id);await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[1],replace:true});await f.activate(f.eve);await assert.rejects(f.detail(id),{code:'FORBIDDEN'});await assert.rejects(f.detail(id,f.eve),{code:'FORBIDDEN'});await assert.rejects(f.review(p),{code:'STALE_CONTRACT'});assert.equal((await f.adminDetail(id)).candidateCurrent,false);await f.close(await f.prepareClose(id));assert.equal((await f.account()).account.reserved,0);
  });
  test(`${prefix} : réactivation ne ressuscite ni accord ni résultat idempotent`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id),requestId=randomUUID();await f.accept(r.id,p,f.bob,{requestId});await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});f.advance(2000);f.bob.authTime=102;await f.activate(f.bob);await assert.rejects(f.detail(r.id),{code:'FORBIDDEN'});await assert.rejects(f.accept(r.id,p,f.bob,{requestId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : droits MJ contrôlés avant proposition, accord et réessai`,async()=>{
    const f=await fixture(),grant=async role=>f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role,active:true,reason:'Test'});await grant('RECEPTION');for(const who of [f.bob,f.staff])for(const a of ['sessionContracts','sessionContract','prepareMissionContract','proposeMissionContract','prepareContractReview','reviewContract','prepareContractClosure','closeContract'])await assert.rejects(f.cmd(a,who,{sessionId:f.sessionId}),{code:'FORBIDDEN'});
    await grant('MJ');const p=await f.prepareContract({},f.staff),requestId=randomUUID(),r=await f.propose(p,f.staff,{requestId}),accept=await f.prepareAccept(r.id);await grant('RECEPTION');await assert.rejects(f.propose(p,f.staff,{requestId}),{code:'FORBIDDEN'});await assert.rejects(f.accept(r.id,accept),{code:'FORBIDDEN'});assert.equal((await f.account()).account.reserved,0);
  });
  test(`${prefix} : lecture explicite et confirmation périmée ne masquent pas les nouveautés`,async()=>{
    const f=await fixture(),id=await f.accepted(),d=await f.detail(id);assert.equal(d.contract.unread,true);await f.cmd('markContractRead',f.bob,{sessionId:f.sessionId,contractId:id,revision:d.contract.revision});assert.equal((await f.detail(id)).contract.unread,false);await f.close(await f.prepareClose(id));await assert.rejects(f.cmd('markContractRead',f.bob,{sessionId:f.sessionId,contractId:id,revision:d.contract.revision}),{code:'STALE_REVISION'});assert.equal((await f.detail(id)).contract.unread,true);
  });
  test(`${prefix} : pause, hors combat et fin de session encadrent l’engagement et l’archivage`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id);await f.stage('PAUSE');await assert.rejects(f.accept(r.id,p),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.damage(f.bob,10);await assert.rejects(f.prepareAccept(r.id),{code:'OUT_OF_COMBAT'});await f.stage('FINISHED');await assert.rejects(f.stage('ARCHIVED'),{code:'CONTRACTS_OPEN'});await f.close(await f.prepareClose(r.id));await f.stage('ARCHIVED');await assert.rejects(f.adminDetail(r.id),{code:'SESSION_CLOSED'});
  });
  test(`${prefix} : prime ouverte, question, acompte, garantie et valeurs invalides refusés`,async()=>{
    const f=await fixture();for(const patch of [{amount:0},{amount:1.5},{durationMinutes:0},{durationMinutes:10081},{advance:1},{guarantee:1},{funding:'FORGED'},{conditions:''},{proofExpected:''},{failureTerms:''},{reason:''},{sourceAccountId:accountId(f.characters[1])}])await assert.rejects(f.prepareContract(patch));const q=await f.apply(f.eve,'QUESTION');await assert.rejects(f.prepareContract({applicationId:q.id}),{code:'APPLICATION_CLOSED'});await f.edit({mode:'OPEN_BOUNTY'});await assert.rejects(f.prepareContract(),{code:'ASSIGNMENT_REQUIRED'});
  });
  test(`${prefix} : nouvelle identité du payeur invalide son autorisation en attente`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id);await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[0],replace:true});await f.activate(f.eve);await assert.rejects(f.accept(r.id,p),{code:'STALE_CONTRACT'});
  });
  test(`${prefix} : panne avant commit ne laisse ni réservation, attribution ni paiement partiel`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id),run=f.store.runTransaction.bind(f.store);let abort=false;f.store.runTransaction=cb=>run(async tx=>{const x=await cb(tx);if(abort){abort=false;throw new Error('Panne synthétique contrat');}return x;});abort=true;await assert.rejects(f.accept(r.id,p),/Panne synthétique/);assert.equal((await f.account()).account.reserved,0);assert.equal((await f.announcement()).assignedCount,0);assert.equal((await f.detail(r.id)).contract.status,'PROPOSED');await f.accept(r.id,p);await f.submit(await f.prepareProof(r.id));const pay=await f.prepareReview(r.id);abort=true;await assert.rejects(f.review(pay),/Panne synthétique/);assert.equal((await f.account(f.bob)).account.balance,0);assert.equal((await f.account()).account.reserved,37);await f.review(pay);assert.equal((await f.account(f.bob)).account.balance,37);
  });
  test(`${prefix} : financement par caisse de groupe sans exposer son nom secret au titulaire`,async()=>{
    const f=await fixture(),sid=f.sessionId,{id:gid}=await f.cmd('saveSessionGroup',f.owner,{sessionId:sid,revision:(await f.session()).revision,name:'GROUPE_SECRET_FINANCEUR',publicationState:'PUBLISHED',visibility:'SECRET',members:[],reason:'Test'});
    const cfg={sessionId:sid,revision:(await f.session()).revision,groupId:gid,label:'CAISSE_CONFIDENTIELLE',reason:'Test'},cp=await f.read('prepareGroupWallet',f.owner,cfg),g=await f.cmd('setGroupWallet',f.owner,{...cfg,confirmation:cp.confirmation});
    const funding={sessionId:sid,revision:(await f.session()).revision,groupId:gid,mode:'CREDIT',amount:80,memo:'Dotation synthétique',reason:'Test'},fp=await f.read('prepareCreditAdjustment',f.owner,funding);await f.cmd('applyCreditAdjustment',f.owner,{...funding,confirmation:fp.confirmation});
    const id=await f.accepted({sourceAccountId:g.accountId});assert.equal(JSON.stringify(await f.detail(id)).includes('CAISSE_CONFIDENTIELLE'),false);assert.equal(JSON.stringify(await f.detail(id)).includes('GROUPE_SECRET'),false);await f.submit(await f.prepareProof(id));await f.review(await f.prepareReview(id));const a=await f.store.get(`sessions/${sid}/accounts/${g.accountId}`);assert.equal(a.balance,43);assert.equal(a.reserved,0);assert.equal((await f.account(f.bob)).account.balance,37);
  });
  test(`${prefix} : désactiver l’économie bloque le règlement mais permet la restitution des réservations`,async()=>{
    const f=await fixture(),id=await f.accepted();await f.submit(await f.prepareProof(id));const s=await f.session();await f.cmd('saveSessionEconomy',f.owner,{sessionId:f.sessionId,revision:s.revision,rules:{...s.economyRules,enabled:false},reason:'Arrêt temporaire'});await assert.rejects(f.prepareReview(id),{code:'ECONOMY_DISABLED'});await f.close(await f.prepareClose(id));const a=await f.store.get(`sessions/${f.sessionId}/accounts/${accountId(f.characters[0])}`);assert.equal(a.balance,100);assert.equal(a.reserved,0);
  });
  test(`${prefix} : une confirmation ne permet pas de forger montant, durée ou bénéficiaire`,async()=>{
    const f=await fixture(),r=await f.propose(await f.prepareContract()),p=await f.prepareAccept(r.id);await f.accept(r.id,p,f.bob,{amount:100000,durationMinutes:5000,characterId:f.characters[2],sourceAccountId:accountId(f.characters[2])});assert.equal((await f.detail(r.id)).contract.terms.amount,37);assert.equal((await f.detail(r.id)).contract.remainingGameMs,600000);await f.submit(await f.prepareProof(r.id));const pay=await f.prepareReview(r.id);await f.review(pay,f.owner,{amount:999,characterId:f.characters[2]});assert.equal((await f.account(f.bob)).account.balance,37);assert.equal((await f.account(f.eve)).account.balance,0);
  });
  test(`${prefix} : commandes privées anonymes et contrat hors session inaccessibles`,async()=>{
    const f=await fixture(),id=await f.accepted();for(const a of contractCommands)await assert.rejects(f.cmd(a,null,{sessionId:f.sessionId,contractId:id}),{code:'LOGIN_REQUIRED'});await assert.rejects(f.read('contractDetail',f.bob,{sessionId:randomUUID(),contractId:id}),{code:'FORBIDDEN'});const badge=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[1]});assert.equal(JSON.stringify(badge).includes('Mission synthétique'),false);
  });
}
