import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {economyFixture} from './economy-suite.mjs';
import {accountId,groupAccountId} from '../../src/core/economy-state.mjs';
export function collectiveSuite(makeStore,prefix='Caisses'){
  async function fixture(){
    const f=await economyFixture(makeStore),member=(i,permissions={},patch={})=>({characterId:f.characters[i],role:'Membre',active:true,revealed:true,visibleToMembers:false,publicAffiliation:false,permissions,...patch});
    const {id:groupId}=await f.cmd('saveSessionGroup',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,name:'CELLULE_SECRETE',visibility:'SECRET',publicationState:'PUBLISHED',gmNotes:'VERITE_MJ',members:[member(0,{readWallet:true,payWallet:true}),member(1,{readWallet:true}),member(2,{readWallet:true,payWallet:true},{revealed:false})],reason:'Création'});
    await f.cmd('setGroupModule',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,enabled:true,reason:'Activer les groupes'});
    const group=async()=>(await f.session()).groups.find(g=>g.id===groupId);
    const edit=async patch=>f.cmd('saveSessionGroup',f.owner,{...await group(),sessionId:f.sessionId,groupId,revision:(await f.session()).revision,reason:'Modification des droits',...patch});
    const configure=async(patch={})=>{const input={sessionId:f.sessionId,groupId,revision:(await f.session()).revision,label:'Comptoir neutre',reason:'MOTIF_CAISSE_MJ',...patch},p=await f.read('prepareGroupWallet',f.owner,input);return {input,result:p};};
    const configureApply=p=>f.cmd('setGroupWallet',f.owner,{...p.input,confirmation:p.result.confirmation});
    await configureApply(await configure());
    const adjust=async patch=>f.adjust(await f.prepareAdjustment({groupId,...patch}));await adjust({amount:100});
    const aid=groupAccountId(groupId),accounts=(who=f.alice)=>f.read('myAccounts',who,{sessionId:f.sessionId});
    const detail=(who=f.alice,id=aid)=>f.read('readAccount',who,{sessionId:f.sessionId,accountId:id});
    const prepare=async(patch={},who=f.alice)=>{const input={sessionId:f.sessionId,fromAccountId:aid,recipientId:f.characters[2],amount:80,memo:'Paiement collectif',...patch};return {input,result:await f.read('prepareAccountPayment',who,input)};};
    const pay=(p,who=f.alice,patch={})=>f.cmd('payFromAccount',who,{...p.input,confirmation:p.result.confirmation,...patch});
    return {...f,groupId,aid,member,group,edit,configure,configureApply,adjustGroup:adjust,accounts,detail,prepareAccount:prepare,payAccount:pay};
  }
  test(`${prefix} : consultation et dépense distinctes, appartenance et révélation obligatoires`,async()=>{
    const f=await fixture();assert.equal((await f.accounts()).accounts.length,2);assert.equal((await f.accounts(f.eve)).accounts.length,1);const b=await f.detail(f.bob);assert.equal(b.balances.balance,100);assert.equal(b.canPay,false);
    await assert.rejects(f.prepareAccount({},f.bob),{code:'FORBIDDEN'});for(const id of [f.aid,randomUUID(),accountId(f.characters[0])])await assert.rejects(f.detail(f.eve,id),{code:'FORBIDDEN'});assert.equal((await f.detail()).balances.balance,100);
  });
  test(`${prefix} : payer sans consulter ne renvoie aucun solde ni historique`,async()=>{
    const f=await fixture();await f.edit({members:[f.member(0,{payWallet:true})]});const d=await f.detail();assert.equal(d.canPay,true);for(const key of ['balances','entries'])assert.equal(key in d,false);
    const p=await f.prepareAccount({amount:20});assert.equal('before' in p.result,false);assert.equal('after' in p.result,false);const r=await f.payAccount(p);assert.equal('account' in r,false);assert.equal((await f.wallet(f.eve)).account.balance,20);
    assert.equal(JSON.stringify(await f.accounts()).includes('balance'),false);await assert.rejects(f.prepareAccount({amount:90}),{code:'INSUFFICIENT_FUNDS'});
  });
  test(`${prefix} : alias visible à la contrepartie, identité secrète et opérateur réservés au MJ`,async()=>{
    const f=await fixture(),p=await f.prepareAccount();assert.equal((await f.detail()).balances.balance,100);const r=await f.payAccount(p),w=await f.wallet(f.eve),event=w.entries.find(e=>e.id===r.id);assert.equal(event.counterparty.name,'Comptoir neutre');
    for(const hidden of ['CELLULE_SECRETE','VERITE_MJ','MOTIF_CAISSE_MJ','operatorCharacterId',f.alice.uid])assert.equal(JSON.stringify(w).includes(hidden),false,hidden);
    const e=(await f.ledger()).find(e=>e.id===r.id);assert.equal(e.operatorCharacterId,f.characters[0]);assert.equal(e.entries.reduce((n,e)=>n+e.delta,0),0);assert.equal((await f.detail()).balances.balance,20);assert.equal(w.account.balance,80);
  });
  test(`${prefix} : deux caissiers ne dépensent pas deux fois les mêmes 100 crédits`,async()=>{
    const f=await fixture();await f.edit({members:[f.member(0,{readWallet:true,payWallet:true}),f.member(1,{readWallet:true,payWallet:true})]});const p=await f.prepareAccount(),q=await f.prepareAccount({recipientId:f.characters[0]},f.bob),r=await Promise.allSettled([f.payAccount(p),f.payAccount(q,f.bob)]);
    assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'INSUFFICIENT_FUNDS');assert.equal((await f.detail()).balances.balance,20);
  });
  test(`${prefix} : répétition unique et réutilisation de référence avec un autre montant refusée`,async()=>{
    const f=await fixture(),p=await f.prepareAccount(),requestId=randomUUID(),r=await f.payAccount(p,f.alice,{requestId});assert.deepEqual(await f.payAccount(p,f.alice,{requestId}),r);await assert.rejects(f.payAccount(p,f.alice,{requestId,amount:1}),{code:'REQUEST_ID_REUSED'});assert.equal((await f.wallet(f.eve)).account.balance,80);
    const d=await f.detail();assert.equal(d.entries.reduce((n,e)=>n+e.delta,0),d.balances.balance);
  });
  test(`${prefix} : retrait du droit de dépense ferme le réessai même si la lecture reste permise`,async()=>{
    const f=await fixture(),p=await f.prepareAccount(),requestId=randomUUID();await f.payAccount(p,f.alice,{requestId});await f.edit({members:[f.member(0,{readWallet:true})]});assert.equal((await f.detail()).balances.balance,20);await assert.rejects(f.payAccount(p,f.alice,{requestId}),{code:'FORBIDDEN'});
    await f.edit({members:[f.member(0,{readWallet:true,payWallet:true})]});await assert.rejects(f.payAccount(p,f.alice,{requestId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : retrait de lecture empêche de récupérer un ancien résultat contenant le solde`,async()=>{
    const f=await fixture(),p=await f.prepareAccount(),requestId=randomUUID();await f.payAccount(p,f.alice,{requestId});await f.edit({members:[f.member(0,{payWallet:true})]});await assert.rejects(f.payAccount(p,f.alice,{requestId}),{code:'FORBIDDEN'});assert.equal('balances' in await f.detail(),false);const fresh=await f.prepareAccount({amount:1});assert.equal('before' in fresh.result,false);
  });
  test(`${prefix} : préparation périmée après droit, publication ou alias modifié`,async()=>{
    const f=await fixture(),p=await f.prepareAccount();await f.edit({publicationState:'DRAFT'});await assert.rejects(f.payAccount(p),{code:'FORBIDDEN'});await f.edit({publicationState:'PUBLISHED'});await assert.rejects(f.payAccount(p),{code:'STALE_REVISION'});
    const q=await f.prepareAccount();await f.configureApply(await f.configure({label:'Autre couverture'}));await assert.rejects(f.payAccount(q),{code:'STALE_REVISION'});assert.equal((await f.detail()).balances.balance,100);assert.equal((await f.detail()).account.name,'Autre couverture');
  });
  for(const revokeFirst of [true,false])test(`${prefix} : INS-10 partiel — révocation et paiement concurrents (${revokeFirst?'révocation':'paiement'} lancé en premier)`,async()=>{
    const f=await fixture(),p=await f.prepareAccount({amount:20}),requestId=randomUUID();
    const before=await f.ledger(),versions=await f.store.list(`scenarios/${f.scenarioId}/versions`);
    const g=await f.group(),s=await f.session();
    const revoke=()=>f.cmd('saveSessionGroup',f.owner,{...g,sessionId:f.sessionId,groupId:f.groupId,
      revision:s.revision,members:[f.member(0,{readWallet:true})],reason:'Révocation concurrente du mandat de caisse'});
    const pay=()=>f.payAccount(p,f.alice,{requestId});
    const results=await Promise.allSettled((revokeFirst?[revoke,pay]:[pay,revoke]).map(run=>run()));
    const revoked=results[revokeFirst?0:1],paid=results[revokeFirst?1:0];
    assert.equal(revoked.status,'fulfilled');
    if(paid.status==='rejected')assert.equal(paid.reason.code,'FORBIDDEN');
    const amount=paid.status==='fulfilled'?20:0;
    assert.equal((await f.detail()).balances.balance,100-amount);
    assert.equal((await f.wallet(f.eve)).account.balance,amount);
    assert.equal((await f.group()).members[0].permissions.payWallet,false);
    const ledger=await f.ledger();
    assert.equal(ledger.length,before.length+(amount?1:0));
    for(const event of before)assert.deepEqual(ledger.find(e=>e.id===event.id),event);
    assert.equal((await f.detail()).account.id,f.aid);
    assert.deepEqual(await f.store.list(`scenarios/${f.scenarioId}/versions`),versions);
    // A payment serialized before revocation stays valid. After revocation,
    // neither its receipt nor an uncommitted stale quote grants spending rights.
    await assert.rejects(f.payAccount(p,f.alice,{requestId}),{code:'FORBIDDEN'});
    await assert.rejects(f.prepareAccount({amount:1}),{code:'FORBIDDEN'});
    assert.equal((await f.detail()).balances.balance,100-amount);
    assert.equal((await f.ledger()).length,ledger.length);
  });
  test(`${prefix} : configuration confirmée ne réinitialise pas le compte ni ses anciennes écritures`,async()=>{
    const f=await fixture();const paid=await f.payAccount(await f.prepareAccount()),p=await f.configure({label:'Nouveau libellé'}),input={...p.input,confirmation:p.result.confirmation,requestId:randomUUID()};assert.equal((await f.detail()).account.name,'Comptoir neutre');await f.cmd('setGroupWallet',f.owner,input);await f.cmd('setGroupWallet',f.owner,input);
    assert.equal((await f.detail()).balances.balance,20);assert.equal((await f.wallet(f.eve)).entries.find(e=>e.id===paid.id).counterparty.name,'Comptoir neutre');await f.edit({description:'Texte modifié'});assert.equal((await f.group()).walletConfig.label,'Nouveau libellé');assert.equal((await f.detail()).balances.balance,20);
    await assert.rejects(f.configure({amount:500}),{code:'INVALID_AMOUNT'});await assert.rejects(f.configure({label:' '}),{code:'INVALID_ECONOMY'});
  });
  test(`${prefix} : crédits de scénario figés, sessions indépendantes et ouverture tardive à zéro`,async()=>{
    const f=await fixture(),{id:gid}=await f.cmd('saveGroup',f.owner,{scenarioId:f.scenarioId,revision:(await f.scenario()).revision,name:'Groupe modèle',visibility:'SECRET',publicationState:'PUBLISHED',members:[f.member(0,{readWallet:true,payWallet:true})]});
    const configure=async amount=>{const input={scenarioId:f.scenarioId,revision:(await f.scenario()).revision,groupId:gid,label:'Caisse modèle',amount},p=await f.read('prepareGroupWallet',f.owner,input);await f.cmd('setGroupWallet',f.owner,{...input,confirmation:p.confirmation});};
    await configure(250);const {id:versionId}=await f.cmd('publishScenario',f.owner,{scenarioId:f.scenarioId,revision:(await f.scenario()).revision});await configure(900);
    const input={...f.sessionInput,versionId},a=await f.cmd('createSession',f.owner,input),b=await f.cmd('createSession',f.owner,input);for(const id of [a.id,b.id]){const s=await f.read('session',f.owner,{sessionId:id});assert.equal(s.accounts.find(a=>a.ownerType==='GROUP').balance,250);}
    const {id:late}=await f.cmd('saveSessionGroup',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,name:'Tardif',visibility:'PUBLIC',publicationState:'PUBLISHED',members:[],reason:'Création'});const p=await f.configure({groupId:late,label:'Caisse tardive'});assert.equal(p.result.opening,true);assert.equal((await f.session()).accounts.some(a=>a.groupId===late),false);await f.configureApply(p);assert.equal((await f.session()).accounts.find(a=>a.groupId===late).balance,0);
  });
  test(`${prefix} : versement personnel vers une caisse consultable sans droit de dépense`,async()=>{
    const f=await fixture();await f.adjust(await f.prepareAdjustment({characterId:f.characters[1],amount:30}));const p=await f.prepareAccount({fromAccountId:accountId(f.characters[1]),recipientId:undefined,toAccountId:f.aid,amount:20},f.bob);await f.payAccount(p,f.bob);assert.equal((await f.wallet(f.bob)).account.balance,10);assert.equal((await f.detail(f.bob)).balances.balance,120);
    await assert.rejects(f.prepareAccount({fromAccountId:accountId(f.characters[2]),recipientId:undefined,toAccountId:f.aid,amount:1},f.eve),{code:'FORBIDDEN'});
  });
  test(`${prefix} : caisse vers portefeuille propre ou autre caisse, sans auto-paiement`,async()=>{
    const f=await fixture();await f.payAccount(await f.prepareAccount({recipientId:f.characters[0],amount:10}));assert.equal((await f.wallet()).account.balance,110);
    const {id:gid}=await f.cmd('saveSessionGroup',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,name:'Seconde caisse',visibility:'PUBLIC',publicationState:'PUBLISHED',members:[f.member(0,{readWallet:true})],reason:'Création'});await f.configureApply(await f.configure({groupId:gid,label:'Caisse B'}));const aid=groupAccountId(gid);await f.payAccount(await f.prepareAccount({recipientId:undefined,toAccountId:aid,amount:30}));assert.equal((await f.detail(f.alice,aid)).balances.balance,30);assert.equal((await f.detail()).balances.balance,60);
    await assert.rejects(f.prepareAccount({recipientId:undefined,toAccountId:f.aid,amount:1}),{code:'INVALID_RECIPIENT'});await assert.rejects(f.prepareAccount({toAccountId:aid}),{code:'INVALID_RECIPIENT'});
  });
  test(`${prefix} : comptes et groupes étrangers refusés sans mouvement`,async()=>{
    const f=await fixture(),other=await fixture();await assert.rejects(f.prepareAccount({fromAccountId:other.aid}),{code:'FORBIDDEN'});await assert.rejects(f.prepareAccount({recipientId:undefined,toAccountId:other.aid}),{code:'FORBIDDEN'});await assert.rejects(f.prepareAccount({recipientId:other.characters[0]}),{code:'INVALID_RECIPIENT'});assert.equal((await f.detail()).balances.balance,100);
  });
  test(`${prefix} : exclusion, révocation et réattribution contrôlées avant tout accès`,async()=>{
    const f=await fixture(),p=await f.prepareAccount(),requestId=randomUUID();await f.payAccount(p,f.alice,{requestId});await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});await assert.rejects(f.detail(),{code:'FORBIDDEN'});await assert.rejects(f.payAccount(p,f.alice,{requestId}),{code:'FORBIDDEN'});
    await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[0],replace:true});await f.activate(f.eve);assert.equal((await f.detail(f.eve)).balances.balance,20);await f.edit({members:[f.member(0,{readWallet:true,payWallet:true},{active:false})]});await assert.rejects(f.detail(f.eve),{code:'FORBIDDEN'});
  });
  test(`${prefix} : nouvelle invitation et authentification périmée ne ressuscitent pas un consentement`,async()=>{
    const f=await fixture(),p=await f.prepareAccount(),requestId=randomUUID();await f.payAccount(p,f.alice,{requestId});await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});f.advance(2000);f.alice.authTime=102;await f.activate(f.alice);await assert.rejects(f.payAccount(p,f.alice,{requestId}),{code:'FORBIDDEN'});await assert.rejects(f.detail({...f.alice,authTime:100}),{code:'FORBIDDEN'});assert.equal((await f.detail()).balances.balance,20);
  });
  test(`${prefix} : corrections MJ périmées et réservations respectées`,async()=>{
    const f=await fixture(),p=await f.prepareAdjustment({groupId:f.groupId});await f.payAccount(await f.prepareAccount());await assert.rejects(f.adjust(p),{code:'STALE_REVISION'});assert.equal((await f.detail()).balances.balance,20);
    await f.store.runTransaction(async tx=>{const path=`sessions/${f.sessionId}/accounts/${f.aid}`,a=await tx.get(path);tx.set(path,{...a,reserved:15});});await assert.rejects(f.prepareAccount({amount:10}),{code:'INSUFFICIENT_FUNDS'});await assert.rejects(f.prepareAdjustment({groupId:f.groupId,mode:'DEBIT',amount:10}),{code:'INSUFFICIENT_FUNDS'});await f.adjustGroup({amount:5});const d=await f.detail();assert.equal(d.balances.available,10);assert.equal(JSON.stringify(d).includes('MOTIF_PRIVE_MJ'),false);
  });
  test(`${prefix} : deux encaissements concurrents et paiement sans perte de crédits`,async()=>{
    const f=await fixture();await f.edit({members:[f.member(0,{readWallet:true,payWallet:true}),f.member(2,{readWallet:true})]});await f.adjust(await f.prepareAdjustment({characterId:f.characters[2],amount:100}));const p=await f.prepareAccount({fromAccountId:accountId(f.characters[0]),recipientId:undefined,toAccountId:f.aid}),q=await f.prepareAccount({fromAccountId:accountId(f.characters[2]),recipientId:undefined,toAccountId:f.aid},f.eve);
    await Promise.all([f.payAccount(p),f.payAccount(q,f.eve)]);assert.equal((await f.detail()).balances.balance,260);assert.equal((await f.wallet()).account.balance,20);assert.equal((await f.wallet(f.eve)).account.balance,20);
  });
  test(`${prefix} : panne transactionnelle conserve comptes, journaux et résultat à rejouer`,async()=>{
    const f=await fixture(),p=await f.prepareAccount(),before=(await f.ledger()).length,run=f.store.runTransaction.bind(f.store);let abort=true;f.store.runTransaction=cb=>run(async tx=>{const r=await cb(tx);if(abort){abort=false;throw new Error('Panne avant commit');}return r;});await assert.rejects(f.payAccount(p),/Panne avant commit/);assert.equal((await f.detail()).balances.balance,100);assert.equal((await f.wallet(f.eve)).account.balance,0);assert.equal((await f.ledger()).length,before);await f.payAccount(p);assert.equal((await f.detail()).balances.balance,20);
  });
  test(`${prefix} : modules, hors combat, pause et archive s’appliquent aux caissiers`,async()=>{
    const f=await fixture(),p=await f.prepareAccount(),requestId=randomUUID(),r=await f.payAccount(p,f.alice,{requestId});await f.stage('PAUSE');assert.deepEqual(await f.payAccount(p,f.alice,{requestId}),r);await assert.rejects(f.prepareAccount({amount:1}),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.damage();await assert.rejects(f.prepareAccount({amount:1}),{code:'OUT_OF_COMBAT'});
    const s=await f.session();await f.cmd('setGroupModule',f.owner,{sessionId:f.sessionId,revision:s.revision,enabled:false,reason:'Fermeture'});assert.equal((await f.accounts()).accounts.length,1);await assert.rejects(f.payAccount(p,f.alice,{requestId}),{code:'FORBIDDEN'});await f.rules({enabled:false});await assert.rejects(f.accounts(),{code:'ECONOMY_DISABLED'});await f.stage('FINISHED');await f.stage('ARCHIVED');await assert.rejects(f.accounts(),{code:'FORBIDDEN'});
  });
  test(`${prefix} : aperçu neutre, Accueil exclu, badge public et anonymes sans accès`,async()=>{
    const f=await fixture();await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Accueil'});assert.equal('accounts' in await f.read('session',f.staff,{sessionId:f.sessionId}),false);
    for(const who of [f.alice,f.staff])for(const action of ['prepareGroupWallet','setGroupWallet','previewAccount','walletHistory'])await assert.rejects(f.cmd(action,who,{sessionId:f.sessionId,groupId:f.groupId,accountId:f.aid,characterId:f.characters[0]}),{code:'FORBIDDEN'});
    const p=await f.read('previewAccount',f.owner,{sessionId:f.sessionId,accountId:f.aid,characterId:f.characters[0]});assert.equal(p.preview,true);assert.equal(p.canPay,false);assert.deepEqual(p.entries,(await f.detail()).entries);assert.equal(JSON.stringify(await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]})).includes('Comptoir neutre'),false);
    for(const action of ['prepareGroupWallet','setGroupWallet','myAccounts','readAccount','previewAccount','prepareAccountPayment','payFromAccount'])await assert.rejects(f.cmd(action,null,{}),{code:'LOGIN_REQUIRED'});
  });
}
