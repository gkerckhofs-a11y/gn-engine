import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {contractFixture} from './contracts-suite.mjs';
import {groupAccountId} from '../../src/core/economy-state.mjs';
export async function missionPartiesFixture(makeStore,{wallet=true}={}){
  const f=await contractFixture(makeStore),sid=f.sessionId;
  const member=(i,permissions={representMissions:true},patch={})=>({characterId:f.characters[i],active:true,revealed:true,visibleToMembers:false,publicAffiliation:false,permissions,...patch});
  const {id:gid}=await f.cmd('saveSessionGroup',f.owner,{sessionId:sid,revision:(await f.session()).revision,name:'BANDE_SECRETE_MISSIONS',visibility:'SECRET',publicationState:'PUBLISHED',gmNotes:'VERITE_BANDE_MJ',members:[member(1),member(2)],reason:'Test'});
  await f.cmd('setGroupModule',f.owner,{sessionId:sid,revision:(await f.session()).revision,enabled:true,reason:'Test'});
  const group=async()=>(await f.session()).groups.find(g=>g.id===gid);
  const editGroup=async patch=>f.cmd('saveSessionGroup',f.owner,{...await group(),...patch,sessionId:sid,groupId:gid,revision:(await f.session()).revision,reason:'Test'});
  const configure=async()=>{const p={sessionId:sid,groupId:gid,revision:(await f.session()).revision,label:'Comptoir des missions',reason:'Test'},d=await f.read('prepareGroupWallet',f.owner,p);await f.cmd('setGroupWallet',f.owner,{...p,confirmation:d.confirmation});};if(wallet)await configure();
  await f.edit({participation:'EITHER'});
  const prepareApplication=async(who=f.bob,patch={})=>{const input={sessionId:sid,announcementId:f.aid,groupId:gid,intent:'APPLICATION',body:'Engagement collectif',proposedReward:'',...patch};return {input,result:await f.read('prepareAnnouncementResponse',who,input)};};
  const applyGroup=(p,who=f.bob,patch={})=>f.cmd('respondAnnouncement',who,{...p.input,confirmation:p.result.confirmation,...patch});
  const apply=async(who=f.bob,patch={})=>applyGroup(await prepareApplication(who,patch),who);
  const appDetail=(id,who=f.bob)=>f.read('applicationDetail',who,{sessionId:sid,applicationId:id});
  const offer=async()=>{const a=await apply();return f.propose(await f.prepareContract({applicationId:a.id}));};
  const accepted=async(who=f.bob)=>{const c=await offer();await f.accept(c.id,await f.prepareAccept(c.id,who),who);return c.id;};
  const cash=()=>f.store.get(`sessions/${sid}/accounts/${groupAccountId(gid)}`);
  const startBounty=async(participation='GROUP',places=1)=>{await f.edit({mode:'OPEN_BOUNTY',rewardType:'FIXED',participation,places});const input={sessionId:sid,announcementId:f.aid,amount:37,funding:'ACCOUNT',sourceAccountId:(await f.account()).account.id,reason:'Test'},d=await f.read('prepareBounty',f.owner,input);return f.cmd('openBounty',f.owner,{...input,confirmation:d.confirmation});};
  const prepareClaim=async(who=f.bob,patch={})=>{const input={sessionId:sid,bountyId:f.aid,groupId:gid,body:'PREUVE_BANDE',...patch};return {input,result:await f.read('prepareBountyClaim',who,input)};};
  const claim=(p,who=f.bob,extra={})=>f.cmd('submitBountyClaim',who,{...p.input,confirmation:p.result.confirmation,...extra});
  const bounty=(who=f.bob)=>f.read('bountyDetail',who,{sessionId:sid,bountyId:f.aid});
  const prepareBountyPay=async(who=f.bob,patch={})=>{const c=(await bounty(who)).claims.find(c=>c.applicant.kind==='GROUP'),input={sessionId:sid,bountyId:f.aid,claimId:c.id,decision:'PAY',reason:'Test',...patch};return {input,result:await f.read('prepareBountyReview',f.owner,input)};};
  const payBounty=(p,patch={})=>f.cmd('reviewBounty',f.owner,{...p.input,confirmation:p.result.confirmation,...patch});
  return {...f,gid,member,group,editGroup,configure,prepareApplication,applyGroup,apply,appDetail,offer,accepted,cash,startBounty,prepareClaim,claim,bounty,prepareBountyPay,payBounty};
}
export function missionPartiesSuite(makeStore,prefix='Participation aux missions'){
  const fixture=options=>missionPartiesFixture(makeStore,options);
  test(`${prefix} : trois modes explicites, anciennes annonces personnelles et refus des faux modes`,async()=>{
    const f=await fixture();for(const participation of ['PERSONAL','GROUP','EITHER']){
      await f.edit({participation});const d=await f.read('announcementDetail',f.bob,{sessionId:f.sessionId,announcementId:f.aid});assert.equal(d.announcement.participation,participation);
      if(participation==='PERSONAL')await assert.rejects(f.prepareApplication(),{code:'PARTICIPATION_NOT_ALLOWED'});else await f.prepareApplication();
      if(participation==='GROUP')await assert.rejects(f.prepareApplication(f.bob,{groupId:null}),{code:'PARTICIPATION_NOT_ALLOWED'});
    }
    await assert.rejects(f.edit({participation:'TOUT_LE_MONDE'}),{code:'INVALID_PARTICIPATION'});
    await f.store.runTransaction(async tx=>{const a=await tx.get(`sessions/${f.sessionId}/announcements/${f.aid}`);delete a.participation;tx.set(`sessions/${f.sessionId}/announcements/${f.aid}`,a);});
    assert.equal((await f.read('announcementDetail',f.bob,{sessionId:f.sessionId,announcementId:f.aid})).announcement.participation,'PERSONAL');await assert.rejects(f.prepareApplication(),{code:'PARTICIPATION_NOT_ALLOWED'});
  });
  test(`${prefix} : caisse et mandat distincts, aucune délégation implicite par appartenance`,async()=>{
    const f=await fixture();await f.editGroup({members:[f.member(1,{readWallet:true,payWallet:true}),f.member(2)]});await assert.rejects(f.prepareApplication(),{code:'FORBIDDEN'});assert.equal((await f.read('announcementDetail',f.bob,{sessionId:f.sessionId,announcementId:f.aid})).participantOptions.some(p=>p.kind==='GROUP'),false);
    await f.prepareApplication(f.eve);await assert.rejects(f.read('readAccount',f.eve,{sessionId:f.sessionId,accountId:groupAccountId(f.gid)}),{code:'FORBIDDEN'});
    await f.editGroup({members:[f.member(1,{}, {revealed:false}),f.member(2)]});await assert.rejects(f.prepareApplication(),{code:'FORBIDDEN'});
  });
  test(`${prefix} : caisse manquante signalée avant candidature collective`,async()=>{
    const f=await fixture({wallet:false});await f.edit({participation:'GROUP'});const d=await f.read('announcementDetail',f.bob,{sessionId:f.sessionId,announcementId:f.aid});assert.equal(d.canRespond,false);await assert.rejects(f.prepareApplication(),{code:'GROUP_WALLET_REQUIRED'});await f.configure();await f.prepareApplication();
  });
  test(`${prefix} : deux représentants ouvrent un seul échange, lecture individuelle et retrait commun`,async()=>{
    const f=await fixture(),a=await f.prepareApplication(),b=await f.prepareApplication(f.eve),rs=await Promise.allSettled([f.applyGroup(a),f.applyGroup(b,f.eve)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);
    const id=rs.find(r=>r.status==='fulfilled').value.id,alice=await f.appDetail(id,f.bob),eve=await f.appDetail(id,f.eve);assert.equal(alice.application.applicant.kind,'GROUP');assert.equal(eve.application.applicant.id,f.gid);
    const unseen=alice.application.unread?f.bob:f.eve,seen=unseen===f.bob?f.eve:f.bob;assert.equal((await f.appDetail(id,unseen)).application.unread,true);await f.cmd('markApplicationRead',seen,{sessionId:f.sessionId,applicationId:id,revision:1,announcementRevision:(await f.announcement()).revision});assert.equal((await f.appDetail(id,unseen)).application.unread,true);
    await f.apply(f.eve,{body:'Message du second représentant'});assert.equal((await f.appDetail(id)).messageCount,2);const d=await f.appDetail(id);await f.cmd('withdrawApplication',f.bob,{sessionId:f.sessionId,applicationId:id,confirmation:d.confirmation});assert.equal((await f.appDetail(id,f.eve)).application.status,'WITHDRAWN');
    const all=(await f.read('sessionApplications',f.owner,{sessionId:f.sessionId,announcementId:f.aid})).applications;assert.equal(all.filter(t=>t.applicant.kind==='GROUP').length,1);
  });
  test(`${prefix} : candidature personnelle et collective séparées, aucune lecture personnelle par la bande`,async()=>{
    const f=await fixture(),g=await f.apply();assert.notEqual(g.id,f.application.id);await assert.rejects(f.appDetail(f.application.id,f.eve),{code:'FORBIDDEN'});assert.equal((await f.appDetail(g.id,f.eve)).application.applicant.id,f.gid);const mine=await f.read('myApplications',f.eve,{sessionId:f.sessionId});assert.equal(mine.applications.length,1);assert.equal(mine.applications[0].id,g.id);
  });
  test(`${prefix} : mission collective réserve une place et paie la caisse, jamais le représentant`,async()=>{
    const f=await fixture(),id=await f.accepted(f.eve);assert.equal((await f.account()).account.reserved,37);assert.equal((await f.announcement()).assignedCount,1);assert.equal((await f.detail(id,f.bob)).contract.briefing,'BRIEFING_CONTRAT_RESERVE');
    await f.submit(await f.prepareProof(id,'Preuve de la bande',f.bob));const p=await f.prepareReview(id);await f.review(p,f.owner,{characterId:f.characters[2],groupId:randomUUID(),amount:9999});assert.equal((await f.cash()).balance,37);assert.equal((await f.account(f.bob)).account.balance,0);assert.equal((await f.account(f.eve)).account.balance,0);assert.equal((await f.account()).account.balance,63);
    const visible=JSON.stringify(await f.account());assert.equal(visible.includes('BANDE_SECRETE_MISSIONS'),false);assert.ok(visible.includes('Comptoir des missions'));assert.equal((await f.detail(id,f.eve)).contract.status,'PAID');
  });
  test(`${prefix} : deux représentants n’acceptent qu’une fois le même contrat`,async()=>{
    const f=await fixture(),c=await f.offer(),a=await f.prepareAccept(c.id),b=await f.prepareAccept(c.id,f.eve),rs=await Promise.allSettled([f.accept(c.id,a),f.accept(c.id,b,f.eve)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.account()).account.reserved,37);assert.equal((await f.announcement()).assignedCount,1);
    const d=await f.detail(c.id);await f.cmd('markContractRead',f.bob,{sessionId:f.sessionId,contractId:c.id,revision:d.contract.revision});assert.equal((await f.detail(c.id)).contract.unread,false);assert.equal((await f.detail(c.id,f.eve)).contract.unread,true);
  });
  test(`${prefix} : mission personnelle conserve son portefeuille malgré l’appartenance à une bande`,async()=>{
    const f=await fixture(),c=await f.propose(await f.prepareContract());await f.accept(c.id,await f.prepareAccept(c.id));await assert.rejects(f.detail(c.id,f.eve),{code:'FORBIDDEN'});await f.submit(await f.prepareProof(c.id));await f.review(await f.prepareReview(c.id));assert.equal((await f.account(f.bob)).account.balance,37);assert.equal((await f.cash()).balance,0);
  });
  test(`${prefix} : mandat retiré ferme lectures et réessais, la bande garde son engagement`,async()=>{
    const f=await fixture(),c=await f.offer(),p=await f.prepareAccept(c.id),requestId=randomUUID();await f.accept(c.id,p,f.bob,{requestId});await f.editGroup({members:[f.member(1,{}),f.member(2)]});await assert.rejects(f.detail(c.id),{code:'FORBIDDEN'});await assert.rejects(f.accept(c.id,p,f.bob,{requestId}),{code:'FORBIDDEN'});
    await f.submit(await f.prepareProof(c.id,'Le relais est assuré',f.eve),f.eve);await f.review(await f.prepareReview(c.id));assert.equal((await f.cash()).balance,37);
    await f.editGroup({members:[f.member(1),f.member(2)]});await assert.rejects(f.accept(c.id,p,f.bob,{requestId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : réattribution du personnage initial ne retire pas le contrat à la bande`,async()=>{
    const f=await fixture(),id=await f.accepted();await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});await assert.rejects(f.detail(id),{code:'FORBIDDEN'});await f.submit(await f.prepareProof(id,'Autre représentant',f.eve),f.eve);await f.review(await f.prepareReview(id));assert.equal((await f.cash()).balance,37);
  });
  test(`${prefix} : retrait de tous les mandats bloque le paiement mais laisse la clôture MJ`,async()=>{
    const f=await fixture(),id=await f.accepted();await f.submit(await f.prepareProof(id));await f.editGroup({members:[f.member(1,{}),f.member(2,{})]});await assert.rejects(f.prepareReview(id),{code:'STALE_CONTRACT'});await f.close(await f.prepareClose(id));assert.equal((await f.account()).account.reserved,0);assert.equal((await f.cash()).balance,0);
  });
  test(`${prefix} : audience ciblée encore exigée pour candidater et accepter au nom de la bande`,async()=>{
    const f=await fixture();await f.edit({audience:{kind:'TARGETED',characterIds:[f.characters[1]],groupIds:[]}});const c=await f.offer();await assert.rejects(f.prepareApplication(f.eve),{code:'FORBIDDEN'});await assert.rejects(f.prepareAccept(c.id,f.eve),{code:'FORBIDDEN'});await f.accept(c.id,await f.prepareAccept(c.id));assert.equal((await f.detail(c.id,f.eve)).contract.briefing,'BRIEFING_CONTRAT_RESERVE');
  });
  test(`${prefix} : membre sans mandat, accueil et autre session ne voient pas les secrets collectifs`,async()=>{
    const f=await fixture();await assert.rejects(f.prepareApplication(f.alice),{code:'FORBIDDEN'});const id=await f.accepted();await f.editGroup({members:[f.member(1),f.member(2,{readBriefing:true,readWallet:true})]});await assert.rejects(f.detail(id,f.eve),{code:'FORBIDDEN'});assert.equal((await f.read('myContracts',f.eve,{sessionId:f.sessionId})).contracts.length,0);await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});await assert.rejects(f.read('sessionContract',f.staff,{sessionId:f.sessionId,contractId:id}),{code:'FORBIDDEN'});await assert.rejects(f.read('contractDetail',f.bob,{sessionId:randomUUID(),contractId:id}),{code:'FORBIDDEN'});
    const badge=JSON.stringify(await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[1]}));assert.equal(badge.includes('BANDE_SECRETE'),false);assert.equal(badge.includes('BRIEFING_CONTRAT'),false);
  });
  test(`${prefix} : changer le mode invalide une offre en attente et le fige après acceptation`,async()=>{
    const f=await fixture(),c=await f.offer(),p=await f.prepareAccept(c.id);await f.edit({participation:'PERSONAL'});await assert.rejects(f.accept(c.id,p),{code:'STALE_CONTRACT'});await f.close(await f.prepareClose(c.id));await f.edit({participation:'EITHER'});const next=await f.propose(await f.prepareContract({applicationId:(await f.apply()).id}));await f.accept(next.id,await f.prepareAccept(next.id));await assert.rejects(f.edit({participation:'GROUP'}),{code:'MISSION_PLACES_LOCKED'});
  });
  test(`${prefix} : primes par bande, une preuve commune et une récompense malgré deux représentants`,async()=>{
    const f=await fixture();await f.startBounty();const a=await f.prepareClaim(),b=await f.prepareClaim(f.eve),rs=await Promise.allSettled([f.claim(a),f.claim(b,f.eve)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.bounty()).claims.length,1);assert.equal((await f.bounty(f.eve)).claims[0].applicant.id,f.gid);await assert.rejects(f.prepareClaim(f.eve),{code:'BOUNTY_CLAIM_EXISTS'});
    const p=await f.prepareBountyPay(),requestId=randomUUID(),paid=await f.payBounty(p,{requestId});assert.deepEqual(await f.payBounty(p,{requestId}),paid);assert.equal((await f.cash()).balance,37);assert.equal((await f.account(f.bob)).account.balance,0);assert.equal((await f.bounty()).bounty.status,'EXHAUSTED');assert.equal(JSON.stringify(await f.account()).includes('BANDE_SECRETE_MISSIONS'),false);
  });
  test(`${prefix} : prime personnelle refuse le choix bande, prime collective refuse le choix personnel`,async()=>{
    const a=await fixture();await a.startBounty('PERSONAL');await assert.rejects(a.prepareClaim(),{code:'PARTICIPATION_NOT_ALLOWED'});await a.claim(await a.prepareClaim(a.bob,{groupId:null}));assert.equal((await a.bounty()).claims[0].applicant.kind,'CHARACTER');
    const b=await fixture();await b.startBounty('GROUP');await assert.rejects(b.prepareClaim(b.bob,{groupId:null}),{code:'PARTICIPATION_NOT_ALLOWED'});assert.equal((await b.bounty()).participantOptions.every(p=>p.kind==='GROUP'),true);
  });
  test(`${prefix} : prime au choix distingue les bénéficiaires et leurs portefeuilles`,async()=>{
    const f=await fixture();await f.startBounty('EITHER',2);await f.claim(await f.prepareClaim());await f.claim(await f.prepareClaim(f.eve,{groupId:null}),f.eve);assert.equal((await f.bounty(f.eve)).claims.length,2);assert.equal((await f.bounty()).claims.length,1);await f.payBounty(await f.prepareBountyPay());
    const c=(await f.bounty(f.eve)).claims.find(c=>c.applicant.kind==='CHARACTER'),input={sessionId:f.sessionId,bountyId:f.aid,claimId:c.id,decision:'PAY',reason:'Autre bénéficiaire'},p=await f.read('prepareBountyReview',f.owner,input);await f.cmd('reviewBounty',f.owner,{...input,confirmation:p.confirmation});assert.equal((await f.cash()).balance,37);assert.equal((await f.account(f.eve)).account.balance,37);assert.equal((await f.account()).account.reserved,0);
  });
  test(`${prefix} : complément et révocation d’un représentant de prime sans détourner les crédits`,async()=>{
    const f=await fixture();await f.startBounty();const p=await f.prepareClaim(),requestId=randomUUID();await f.claim(p,f.bob,{requestId});await f.payBounty(await f.prepareBountyPay(f.bob,{decision:'RETURN'}));await f.editGroup({members:[f.member(1,{}),f.member(2)]});assert.equal((await f.bounty()).claims.length,0);await assert.rejects(f.claim(p,f.bob,{requestId}),{code:'FORBIDDEN'});await f.claim(await f.prepareClaim(f.eve,{body:'Complément du second représentant'}),f.eve);assert.ok((await f.bounty(f.eve)).history.some(e=>e.body==='PREUVE_BANDE'));await f.payBounty(await f.prepareBountyPay(f.eve));assert.equal((await f.cash()).balance,37);
  });
  test(`${prefix} : changement des droits invalide une confirmation de candidature avant écriture`,async()=>{
    const f=await fixture(),p=await f.prepareApplication();await f.editGroup({description:'Nouvelle version du mandat'});await assert.rejects(f.applyGroup(p),{code:'STALE_REVISION'});const fresh=await f.prepareApplication(),requestId=randomUUID();await f.applyGroup(fresh,f.bob,{requestId});await f.editGroup({members:[f.member(1,{}),f.member(2)]});await assert.rejects(f.applyGroup(fresh,f.bob,{requestId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : groupe dépublié et module fermé bloquent lecture et dépôt collectif`,async()=>{
    const f=await fixture();await f.startBounty();await f.claim(await f.prepareClaim());await f.cmd('setGroupModule',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,enabled:false,reason:'Test'});assert.equal((await f.bounty()).claims.length,0);await assert.rejects(f.prepareClaim(),{code:'FORBIDDEN'});await f.cmd('setGroupModule',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,enabled:true,reason:'Test'});await f.editGroup({publicationState:'DRAFT'});assert.equal((await f.bounty()).claims.length,0);await assert.rejects(f.prepareBountyPay());
  });
}
