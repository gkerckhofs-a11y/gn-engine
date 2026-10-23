import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {masterFixture,masterExample} from './masters-suite.mjs';
import {cleanScenarioSnapshot,scenarioCollections} from '../../src/core/scenario-package.mjs';
import {economyFixture} from './economy-suite.mjs';
import {groupPermissions,groupVisible} from '../../src/core/groups.mjs';
import {groupAccountId} from '../../src/core/economy-state.mjs';
import {storageGroups,warehouseAccess} from '../../src/core/storage-state.mjs';
import {participantAccess} from '../../src/core/mission-parties.mjs';

export const rosterMembership=(grants=[],patch={})=>({role:'Membre',revealed:true,visibleToMembers:false,publicAffiliation:false,permissions:Object.fromEntries(groupPermissions.map(p=>[p,grants.includes(p)])),...patch});
export async function rosterFixture(makeStore){
 const f=await economyFixture(makeStore),base=`sessions/${f.sessionId}`;
 const group=id=>f.store.get(`${base}/groups/${id}`);
 const config=async(id,patch={},who=f.owner)=>{const old=await group(id);return f.cmd('saveGroupRoster',who,{sessionId:f.sessionId,groupId:id,groupRevision:old?.revision??0,name:old?.name??id,description:'',briefing:'SECRET_GROUPE',gmNotes:'SECRET_MJ',visibility:'SECRET',publicationState:'PUBLISHED',kind:old?.roster?.kind??'TEAM',capacity:old?.roster?.capacity??null,leaderId:old?.roster?.leaderId??null,reason:'Configuration de test',...patch});};
 const prepare=async(cid,from,to,patch={},who=f.owner)=>{const input={sessionId:f.sessionId,characterId:cid,sourceGroupId:from,targetGroupId:to,membership:to?rosterMembership():null,authorizePermissions:false,reason:'Opération de test',...patch};return {input,preview:await f.read('prepareGroupMembership',who,input)};};
 const apply=(p,patch={},who=f.owner)=>f.cmd('applyGroupMembership',who,{...p.input,confirmation:p.preview.confirmation,...patch});
 const assign=async(cid,to,grants=[])=>apply(await prepare(cid,null,to,{membership:rosterMembership(grants),authorizePermissions:grants.length>0}));
 const archive=async(id,value=true)=>f.cmd('setGroupArchived',f.owner,{sessionId:f.sessionId,groupId:id,groupRevision:(await group(id)).revision,archived:value,reason:'Archivage de test'});
 const assets=async()=>Object.fromEntries(await Promise.all(['accounts','inventory','ledger','ships','warehouses','contracts','knowledgeReceipts'].map(async col=>[col,(await f.store.list(`${base}/${col}`)).sort((a,b)=>a.id.localeCompare(b.id))])));
 await f.cmd('setGroupModule',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,enabled:true,reason:'Test de régie'});
 return {...f,base,group,config,prepareRoster:prepare,applyRoster:apply,assignRoster:assign,archive,assets};
}
export function groupManagementSuite(makeStore,prefix='Régie groupes I2b'){
 const fixture=()=>rosterFixture(makeStore);
 test(`${prefix} : configuration explicite, capacités nulles ou zéro et aucune dotation`,async()=>{
  const f=await fixture(),before=await f.assets();await f.config('a',{capacity:0});await f.config('b',{kind:'FACTION'});
  assert.deepEqual(await f.assets(),before);assert.deepEqual((await f.group('b')).roster,{kind:'FACTION',capacity:null,leaderId:null,archived:false});
  await assert.rejects(f.assignRoster(f.characters[0],'a'),{code:'GROUP_CAPACITY_FULL'});
  for(const patch of [{capacity:-1},{capacity:1.5},{kind:'JEDI'},{leaderId:f.characters[0]},{extra:true}])await assert.rejects(f.config('a',patch));
  assert.equal((await f.group('a')).revision,1);
 });
 test(`${prefix} : préparation sans effet et consentement explicite aux nouvelles permissions`,async()=>{
  const f=await fixture();await f.config('a');const before=await f.session(),p=await f.prepareRoster(f.characters[0],null,'a');assert.deepEqual(await f.session(),before);
  await assert.rejects(f.prepareRoster(f.characters[0],null,'a',{membership:rosterMembership(['readWallet'])}),{code:'GROUP_GRANT_CONFIRMATION_REQUIRED'});
  await assert.rejects(f.prepareRoster(f.characters[0],null,'a',{membership:{...rosterMembership(),permissions:{readWallet:true}},authorizePermissions:true}),{code:'INVALID_GROUP_ROSTER'});
  await f.applyRoster(p);const m=(await f.group('a')).members[0];assert.ok(Object.values(m.permissions).every(p=>p===false));assert.equal(m.revealed,true);
  await f.config('a',{leaderId:f.characters[0]});assert.deepEqual((await f.group('a')).members[0].permissions,m.permissions);
 });
 test(`${prefix} : transfert atomique, révocation totale, responsable libéré et patrimoine inchangé`,async()=>{
  const f=await fixture();await f.config('a');await f.config('b');await f.assignRoster(f.characters[0],'a',groupPermissions);await f.config('a',{leaderId:f.characters[0]});
  await f.store.runTransaction(async tx=>{for(const [col,row] of [['inventory',{id:'lot',ownerType:'GROUP',ownerId:'a',quantity:7}],['ships',{id:'ship',ownerType:'GROUP',ownerId:'a'}],['warehouses',{id:'warehouse',tenantType:'GROUP',tenantId:'a'}],['contracts',{id:'contract',participant:{kind:'GROUP',id:'a'},status:'ACCEPTED'}]])tx.set(`${f.base}/${col}/${row.id}`,row);});
  const before=await f.assets(),versions=await f.store.list(`scenarios/${f.scenarioId}/versions`);
  const p=await f.prepareRoster(f.characters[0],'a','b',{membership:rosterMembership(['readBriefing']),authorizePermissions:true}),r=await f.applyRoster(p),a=await f.group('a'),b=await f.group('b');
  assert.equal(p.preview.clearsLeader,true);assert.equal(a.roster.leaderId,null);assert.equal(a.members[0].active,false);for(const key of ['revealed','visibleToMembers','publicAffiliation'])assert.equal(a.members[0][key],false);assert.ok(Object.values(a.members[0].permissions).every(p=>!p));
  assert.equal(b.members[0].permissions.readBriefing,true);assert.equal(b.members[0].permissions.payWallet,false);assert.deepEqual(await f.assets(),before);assert.deepEqual(await f.store.list(`scenarios/${f.scenarioId}/versions`),versions);
  for(const gid of ['a','b']){const e=await f.store.get(`${f.base}/groups/${gid}/history/${r.id}`);assert.equal(e.characterId,f.characters[0]);assert.equal(e.fromGroupId,'a');assert.equal(e.toGroupId,'b');assert.equal(e.actorUid,f.owner.uid);assert.ok(e.before&&e.after);}
 });
 test(`${prefix} : équipe unique, factions cumulables et changement de type contrôlé`,async()=>{
  const f=await fixture();for(const gid of ['a','b'])await f.config(gid);await f.config('f',{kind:'FACTION'});await f.assignRoster(f.characters[0],'a');await f.assignRoster(f.characters[0],'f');
  await assert.rejects(f.assignRoster(f.characters[0],'b'),{code:'GROUP_PRIMARY_CONFLICT'});await assert.rejects(f.config('f',{kind:'TEAM'}),{code:'GROUP_PRIMARY_CONFLICT'});
  await f.applyRoster(await f.prepareRoster(f.characters[0],'a','b'));assert.equal((await f.group('f')).members[0].active,true);
 });
 test(`${prefix} : dernière place concurrente sans sur-réservation, membres cachés comptés`,async()=>{
  const f=await fixture();await f.config('a',{capacity:1});const p=await f.prepareRoster(f.characters[0],null,'a',{membership:rosterMembership([],{revealed:false})}),q=await f.prepareRoster(f.characters[1],null,'a');
  const result=await Promise.allSettled([f.applyRoster(p),f.applyRoster(q)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.ok(['STALE_REVISION','GROUP_CAPACITY_FULL'].includes(result.find(r=>r.status==='rejected').reason.code));assert.equal((await f.group('a')).members.filter(m=>m.active).length,1);
 });
 test(`${prefix} : deux affectations concurrentes du même personnage dans deux équipes`,async()=>{
  const f=await fixture();await f.config('a');await f.config('b');const p=await f.prepareRoster(f.characters[0],null,'a'),q=await f.prepareRoster(f.characters[0],null,'b');const result=await Promise.allSettled([f.applyRoster(p),f.applyRoster(q)]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.ok(['STALE_REVISION','GROUP_PRIMARY_CONFLICT'].includes(result.find(r=>r.status==='rejected').reason.code));assert.equal((await f.store.list(`${f.base}/groups`)).filter(g=>g.members.some(m=>m.active)).length,1);
 });
 test(`${prefix} : réessai après réponse perdue, double clic et identifiant détourné`,async()=>{
  const f=await fixture();await f.config('a');const p=await f.prepareRoster(f.characters[0],null,'a'),requestId=randomUUID(),before=(await f.session()).revision;
  const [r,s]=await Promise.all([f.applyRoster(p,{requestId}),f.applyRoster(p,{requestId})]);assert.deepEqual(r,s);assert.deepEqual(await f.applyRoster(p,{requestId}),r);assert.equal((await f.session()).revision,before+1);assert.equal((await f.store.list(`${f.base}/groups/a/history`)).length,2);
  await assert.rejects(f.applyRoster(p,{requestId,reason:'Autre'}),{code:'REQUEST_ID_REUSED'});await assert.rejects(f.applyRoster(p),{code:'GROUP_MEMBER_CHANGED'});
 });
 test(`${prefix} : interruption avant commit ne laisse aucun demi-transfert`,async()=>{
  const f=await fixture();await f.config('a');await f.config('b');await f.assignRoster(f.characters[0],'a');const p=await f.prepareRoster(f.characters[0],'a','b'),before=await f.session(),requestId=randomUUID(),run=f.store.runTransaction.bind(f.store);
  f.store.runTransaction=cb=>run(async tx=>{await cb(tx);throw new Error('Interruption synthétique');});await assert.rejects(f.applyRoster(p,{requestId}),/Interruption synthétique/);f.store.runTransaction=run;assert.deepEqual(await f.session(),before);await f.applyRoster(p,{requestId});assert.equal((await f.group('a')).members[0].active,false);assert.equal((await f.group('b')).members[0].active,true);
 });
 test(`${prefix} : mandat modifié sur place, retrait puis contre-opération revalidée`,async()=>{
  const f=await fixture();await f.config('a',{capacity:1});await f.assignRoster(f.characters[0],'a',['readWallet']);await f.applyRoster(await f.prepareRoster(f.characters[0],'a','a'));
  assert.equal((await f.group('a')).members.length,1);assert.equal((await f.group('a')).members[0].permissions.readWallet,false);
  const r=await f.applyRoster(await f.prepareRoster(f.characters[0],'a',null));await f.assignRoster(f.characters[1],'a');await assert.rejects(f.prepareRoster(f.characters[0],null,'a',{reversesEventId:r.id}),{code:'GROUP_CAPACITY_FULL'});
  await f.applyRoster(await f.prepareRoster(f.characters[1],'a',null));const counter=await f.applyRoster(await f.prepareRoster(f.characters[0],null,'a',{reversesEventId:r.id}));assert.equal((await f.store.get(`${f.base}/audit/${counter.id}`)).reversesEventId,r.id);
  assert.ok(Object.values((await f.group('a')).members.find(m=>m.characterId===f.characters[0]).permissions).every(p=>!p));await assert.rejects(f.prepareRoster(f.characters[1],'a',null,{reversesEventId:r.id}));
 });
 test(`${prefix} : archivage révoque tout, restauration sans réactivation ni suppression`,async()=>{
  const f=await fixture();await f.config('a');await f.assignRoster(f.characters[0],'a',groupPermissions);await f.config('a',{leaderId:f.characters[0]});const before=await f.assets();await f.archive('a');let g=await f.group('a');assert.equal(groupVisible(g,f.characters[0]),false);assert.equal(g.roster.leaderId,null);assert.ok(g.members.every(m=>!m.active&&Object.values(m.permissions).every(p=>!p)));
  await assert.rejects(f.assignRoster(f.characters[1],'a'),{code:'GROUP_ROSTER_REQUIRED'});await f.archive('a',false);g=await f.group('a');assert.equal(g.members[0].active,false);assert.equal(groupVisible(g,f.characters[0]),false);assert.deepEqual(await f.assets(),before);
 });
 test(`${prefix} : fin, archive et préparation C1a refusent les mutations`,async()=>{
  const f=await fixture();await f.config('a');const p=await f.prepareRoster(f.characters[0],null,'a');await f.stage('FINISHED');assert.equal((await f.read('groupManagement',f.owner,{sessionId:f.sessionId})).closed,true);await assert.rejects(f.applyRoster(p),{code:'SESSION_CLOSED'});await f.stage('ARCHIVED');await assert.rejects(f.config('a'),{code:'SESSION_CLOSED'});
  const {id}=await f.cmd('createSpaceOutlawsPreparation',f.owner,{creationId:randomUUID(),campaignTitle:'Test',title:'Préparation',capacity:3,privacy:'Test'});await assert.rejects(f.read('groupManagement',f.owner,{sessionId:id}),{code:'PREPARATION_ONLY'});
 });
 test(`${prefix} : propriétaire et MJ, Accueil/joueur exclus, révocation avant reçu`,async()=>{
  const f=await fixture();await f.config('a');const staff=async(role,active=true)=>f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role,active,reason:'Délégation test'});
  for(const actor of [f.alice,null])await assert.rejects(f.read('groupManagement',actor,{sessionId:f.sessionId}));await staff('RECEPTION');await assert.rejects(f.read('groupManagement',f.staff,{sessionId:f.sessionId}),{code:'FORBIDDEN'});
  await staff('MJ');const p=await f.prepareRoster(f.characters[0],null,'a',{},f.staff),requestId=randomUUID();await f.applyRoster(p,{requestId},f.staff);await staff('MJ',false);await assert.rejects(f.applyRoster(p,{requestId},f.staff),{code:'FORBIDDEN'});
  const other=await f.cmd('createSession',f.owner,f.sessionInput);await assert.rejects(f.read('prepareGroupMembership',f.owner,{...p.input,sessionId:other.id}),{code:'NOT_FOUND'});
 });
 test(`${prefix} : accès briefing, stock, pilotage et représentation révoqués par transfert`,async()=>{
  const f=await fixture();await f.config('a');await f.config('b');await f.assignRoster(f.characters[0],'a',groupPermissions);
  const context={c:(await f.session()).characters[0],version:'test'},record={participant:{kind:'GROUP',id:'a'}};context.c=(await f.session()).characters.find(c=>c.id===f.characters[0]);
  const access=async()=>{const s=await f.store.get(f.base),gs=await f.store.list(`${f.base}/groups`),sg=storageGroups(s,gs,f.characters[0]);return {stock:warehouseAccess({tenantType:'GROUP',tenantId:'a'},f.characters[0],sg),pilot:sg.find(g=>g.id==='a')?.permissions.pilotShip??false,mission:await f.store.runTransaction(tx=>participantAccess(tx,s,context,f.alice,record))};};
  assert.equal((await f.read('myGroup',f.alice,{sessionId:f.sessionId,groupId:'a'})).group.briefing,'SECRET_GROUPE');const before=await access();assert.equal(before.stock.withdraw,true);assert.equal(before.pilot,true);assert.ok(before.mission);
  await f.applyRoster(await f.prepareRoster(f.characters[0],'a','b'));await assert.rejects(f.read('myGroup',f.alice,{sessionId:f.sessionId,groupId:'a'}),{code:'FORBIDDEN'});const after=await access();assert.equal(after.stock.access,false);assert.equal(after.pilot,false);assert.equal(after.mission,null);
  const own=await f.read('mySession',f.alice,{sessionId:f.sessionId});assert.doesNotMatch(JSON.stringify(own),/SECRET_GROUPE|SECRET_MJ|roster/);
 });
 for(const moveFirst of [true,false])test(`${prefix} : INS-10 transfert/paiement concurrents (${moveFirst?'transfert':'paiement'} lancé en premier)`,async()=>{
  const f=await fixture();await f.config('a');await f.config('b');await f.assignRoster(f.characters[0],'a',['readWallet','payWallet']);
  const wallet={sessionId:f.sessionId,groupId:'a',revision:(await f.session()).revision,label:'Comptoir',reason:'Test'},q=await f.read('prepareGroupWallet',f.owner,wallet);await f.cmd('setGroupWallet',f.owner,{...wallet,confirmation:q.confirmation});await f.adjust(await f.prepareAdjustment({groupId:'a',amount:100}));
  const input={sessionId:f.sessionId,fromAccountId:groupAccountId('a'),recipientId:f.characters[2],amount:20,memo:'Test'},quote=await f.read('prepareAccountPayment',f.alice,input),requestId=randomUUID(),pay=()=>f.cmd('payFromAccount',f.alice,{...input,confirmation:quote.confirmation,requestId});const p=await f.prepareRoster(f.characters[0],'a','b'),move=()=>f.applyRoster(p);
  const before=await f.ledger(),results=await Promise.allSettled((moveFirst?[move,pay]:[pay,move]).map(fn=>fn())),moved=results[moveFirst?0:1],paid=results[moveFirst?1:0];assert.equal(moved.status,'fulfilled',moved.reason?.code);if(paid.status==='rejected')assert.equal(paid.reason.code,'FORBIDDEN');const amount=paid.status==='fulfilled'?20:0;
  assert.equal((await f.store.get(`${f.base}/accounts/${groupAccountId('a')}`)).balance,100-amount);assert.equal((await f.wallet(f.eve)).account.balance,amount);const ledger=await f.ledger();assert.equal(ledger.length,before.length+(amount?1:0));for(const e of before)assert.deepEqual(ledger.find(x=>x.id===e.id),e);
  await assert.rejects(pay(),{code:'FORBIDDEN'});await assert.rejects(f.read('readAccount',f.alice,{sessionId:f.sessionId,accountId:groupAccountId('a')}),{code:'FORBIDDEN'});assert.equal((await f.group('b')).members[0].permissions.payWallet,false);
 });
 test(`${prefix} : éditeur historique conserve la régie et interdit le contournement des mandats`,async()=>{
  const f=await fixture();await f.config('a');await f.assignRoster(f.characters[0],'a');const g=await f.group('a'),edit=patch=>f.cmd('saveSessionGroup',f.owner,{...g,sessionId:f.sessionId,groupId:'a',revision:(0),reason:'Test',...patch});
  await assert.rejects(edit({revision:(await f.session()).revision,members:[]}),{code:'GROUP_ROSTER_MANAGED'});await edit({revision:(await f.session()).revision,name:'Nouveau nom'});assert.deepEqual((await f.group('a')).roster,g.roster);
  const old=await f.cmd('saveSessionGroup',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,name:'Historique',visibility:'SECRET',publicationState:'DRAFT',members:[],reason:'Test'});assert.equal((await f.group(old.id)).roster,undefined);
 });
 test(`${prefix} : scellement préserve la consultation et refuse les commandes avant reçu`,async()=>{
  const f=await fixture();await f.config('a');const p=await f.prepareRoster(f.characters[0],null,'a'),requestId=randomUUID();await f.applyRoster(p,{requestId});
  await f.store.runTransaction(async tx=>{const s=await tx.get(f.base);tx.set(f.base,{...s,campaignSealed:true});});
  assert.equal((await f.read('groupManagement',f.owner,{sessionId:f.sessionId})).closed,true);await assert.rejects(f.applyRoster(p,{requestId}),{code:'SESSION_CLOSED'});await assert.rejects(f.config('a'),{code:'SESSION_CLOSED'});
 });
 test(`${prefix} : Masters historiques conservent la régie et refusent les membres gérés`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(masterExample());const s=await f.session(),group=await f.store.get(`sessions/${s.id}/groups/equipage`);
  await f.cmd('saveGroupRoster',{sessionId:s.id,groupId:group.id,groupRevision:group.revision,name:group.name,visibility:group.visibility,publicationState:group.publicationState,kind:'TEAM',capacity:3,leaderId:null,reason:'Configuration explicite'});
  let w=await f.read('masterWorkspace',{sessionId:s.id,module:'personnages',sheet:'Membres'});const row={...w.rows[0].row,role:'Tentative de contournement',version:String(Number(w.rows[0].row.version)+1)};
  const refused=await f.read('prepareMasterImport',{sessionId:s.id,sheets:{Meta:w.meta,Membres:[row]},reason:'Test'});assert.equal(refused.canApply,false);assert.match(JSON.stringify(refused.errors),/GROUP_ROSTER_MANAGED/);
  w=await f.read('masterWorkspace',{sessionId:s.id,module:'personnages',sheet:'Groupes'});const g=w.rows.find(r=>r.row.id==='equipage').row,before=await f.store.get(`sessions/${s.id}/groups/equipage`);
  await f.apply({Meta:w.meta,Groupes:[{...g,nom:'Titre corrigé',version:String(Number(g.version)+1)}]},{scenarioId:undefined,sessionId:s.id});assert.deepEqual((await f.store.get(`sessions/${s.id}/groups/equipage`)).roster,before.roster);assert.deepEqual((await f.store.get(`sessions/${s.id}/groups/equipage`)).members,before.members);
 });
 test(`${prefix} : archive de scénario conserve la politique et valide les équipes et références`,async()=>{
  const f=await fixture();await f.config('a');await f.config('b');await f.assignRoster(f.characters[0],'a');
  const records=Object.fromEntries(await Promise.all(scenarioCollections.map(async k=>[k,await f.store.list(`${f.base}/${k}`)]))),input={scenario:await f.store.get(f.base),records};
  const clean=cleanScenarioSnapshot(input);assert.deepEqual(clean.records.groups[0].roster,records.groups[0].roster);assert.deepEqual(cleanScenarioSnapshot(clean),clean);
  const invalid=structuredClone(input);invalid.records.groups.find(g=>g.id==='b').members=structuredClone(invalid.records.groups.find(g=>g.id==='a').members);assert.throws(()=>cleanScenarioSnapshot(invalid),{code:'GROUP_PRIMARY_CONFLICT'});
  const ref=structuredClone(input);ref.records.groups.find(g=>g.id==='a').roster.leaderId='absent';assert.throws(()=>cleanScenarioSnapshot(ref),{code:'GROUP_LEADER_NOT_MEMBER'});
 });

}
