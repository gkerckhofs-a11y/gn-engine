import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {masterExample} from '../../src/shared/master-examples.mjs';
import {masterSheets} from '../../src/shared/master-schema.mjs';
import {moduleDraft,moduleFormRow,moduleMasterSheets} from '../../web/master-editor.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
import {groupAccountId} from '../../src/core/economy-state.mjs';
import {groupPermissions,groupVisible,publicAffiliations} from '../../src/core/groups.mjs';
const view=(f,sheet,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet,...extra});
const payload=(w,row)=>({Meta:w.meta,[w.sheet]:[row]});
const edited=(w,id,values={})=>{const d=moduleDraft(w,id);return moduleFormRow(w,d,{...d.row,...values});};
const example=()=>{const s=masterExample();s.Personnages.push({id:'contact',operation:'CREER',version:'1',nom:'Contact fictif',publication:'PUBLISHED',publication_publique:'PUBLISHED'});s.Groupes.push({id:'public',operation:'CREER',version:'1',nom:'Groupe public fictif',publication:'PUBLISHED',visibilite:'PUBLIC'});s.Relations=[{id:'lien-pilote',operation:'CREER',version:'1',personnage_id:'pilote',cible_id:'contact',titre:'Contact connu',description:'Relation fictive',publication:'OUI',notes_mj:'SECRET_MJ_RELATION'}];return s;};
export function masterSocialEditorsSuite(fixture,prefix){
 test(`${prefix} : relations et membres exportent leur identité historique et restent réservés au propriétaire`,async()=>{
  const f=await fixture();await f.apply(example());
  for(const sheet of ['Relations','Membres']){
   const w=await view(f,sheet);assert.deepEqual(w.errors,[]);assert.equal(w.rows.length,1);
   for(const key of Object.keys(w.rows[0].row))assert.ok(masterSheets[sheet].includes(key));
   const file=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w)));assert.deepEqual(Object.keys(file),['Meta',sheet]);await f.apply(file,{module:'personnages'});assert.equal((await f.apply(file,{module:'personnages'})).unchanged,true);
   await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet},f.player),{code:'FORBIDDEN'});
   await assert.rejects(view(f,sheet,{module:'communication'}),{code:'INVALID_MASTER_SHEET'});
  }
  const w=await view(f,'Membres');assert.equal(w.rows[0].row.id,'membre-pilote');assert.equal(w.rows[0].row.version,'3');assert.deepEqual(w.references.groupPermissions.map(p=>p.id),groupPermissions);
 });
 test(`${prefix} : appartenance unique, droits explicites, désactivation et réactivation sans déplacement d’identité`,async()=>{
  const f=await fixture();await f.apply(example());let w=await view(f,'Membres');
  const row=edited(w,'',{groupe_id:'public',personnage_id:'contact',role:'Observateur',droits__checks:'1'});for(const key of ['actif','revele','visible_membres','affiliation_publique'])assert.equal(row[key],'NON');assert.equal(row.droits,'!EFFACER');await f.apply(payload(w,row));
  const path=`scenarios/${f.scenarioId}/groups/public`;let group=await f.store.get(path);assert.equal(groupVisible(group,'contact'),false);assert.deepEqual(publicAffiliations([group],'contact'),[]);assert.ok(Object.values(group.members[0].permissions).every(v=>v===false));
  w=await view(f,'Membres');const updated=edited(w,row.id,{groupe_id:'equipage',personnage_id:'pilote',actif:'OUI',revele:'OUI',affiliation_publique:'OUI',droits__checks:'1',droits__choice__readStock:'OUI',droits__choice__withdrawStock:'OUI'});assert.equal(updated.groupe_id,'public');assert.equal(updated.personnage_id,'contact');await f.apply(payload(w,updated));
  group=await f.store.get(path);assert.equal(groupVisible(group,'contact'),true);assert.equal(publicAffiliations([group],'contact').length,1);assert.equal(group.members[0].permissions.withdrawStock,true);assert.equal(group.members[0].permissions.payWallet,false);
  w=await view(f,'Membres');const duplicate=edited(w,'',{groupe_id:'public',personnage_id:'contact'});assert.equal((await f.prepare(payload(w,duplicate))).canApply,false);assert.throws(()=>moduleDraft(w,row.id,'duplicate'),/unique/);
  const archive=moduleFormRow(w,moduleDraft(w,row.id,'archive'),{});assert.deepEqual(Object.keys(archive).sort(),['groupe_id','id','operation','personnage_id','version']);await f.apply(payload(w,archive));
  group=await f.store.get(path);assert.equal(group.members[0].active,false);assert.equal(group.members[0].permissions.withdrawStock,true);assert.equal(groupVisible(group,'contact'),false);
  w=await view(f,'Membres');await f.apply(payload(w,edited(w,row.id,{actif:'OUI',droits__checks:'1'})));group=await f.store.get(path);assert.ok(Object.values(group.members[0].permissions).every(v=>v===false));assert.equal(group.members.length,1);
 });
 test(`${prefix} : relation non réciproque, duplication non publiée et dépublication conservant les notes`,async()=>{
  const f=await fixture();await f.apply(example());let w=await view(f,'Relations');
  const row=edited(w,'',{personnage_id:'contact',cible_id:'pilote',titre:'Lien de test',description:'Texte fictif',notes_mj:'NOTE_PRIVEE'});assert.equal(row.publication,'NON');await f.apply(payload(w,row));
  w=await view(f,'Relations');await f.apply(payload(w,edited(w,row.id,{personnage_id:'pilote',publication:'OUI',cible_id:''})));
  let c=await f.store.get(`scenarios/${f.scenarioId}/characters/contact`);assert.equal(c.relations[0].targetId,null);assert.equal(c.relations[0].published,true);assert.equal(c.relations[0].gmNotes,'NOTE_PRIVEE');
  w=await view(f,'Relations');const d=moduleDraft(w,row.id,'duplicate'),copy=moduleFormRow(w,d,d.row);assert.notEqual(copy.id,row.id);assert.equal(copy.publication,'NON');await f.apply(payload(w,copy));
  w=await view(f,'Relations');await f.apply(payload(w,moduleFormRow(w,moduleDraft(w,row.id,'archive'),{})));
  c=await f.store.get(`scenarios/${f.scenarioId}/characters/contact`);assert.equal(c.relations.find(r=>r.id===row.id).published,false);assert.equal(c.relations.find(r=>r.id===row.id).gmNotes,'NOTE_PRIVEE');
  assert.equal((await f.store.get(`scenarios/${f.scenarioId}/characters/pilote`)).relations.length,1);
 });
 test(`${prefix} : appartenance sans reçu possède un identifiant stable, ambiguïtés historiques bloquent sans renommage`,async()=>{
  const f=await fixture();await f.apply(example());const path=`scenarios/${f.scenarioId}/groups/public`;
  await f.store.runTransaction(async tx=>{const g=await tx.get(path);tx.set(path,{...g,members:[{characterId:'contact',role:'Ancien outil',active:false,revealed:false,visibleToMembers:false,publicAffiliation:false,permissions:{}}]});});
  let w=await view(f,'Membres'),row=w.rows.find(r=>r.row.groupe_id==='public').row;assert.match(row.id,/^membre-[a-f0-9]{64}$/);assert.equal((await view(f,'Membres')).rows.find(r=>r.row.groupe_id==='public').row.id,row.id);assert.equal(row.version,'1');
  await f.apply(payload(w,edited(w,row.id,{role:'Conservé'})));w=await view(f,'Membres');assert.equal(w.rows.find(r=>r.row.groupe_id==='public').row.id,row.id);
  await f.apply({Meta:example().Meta,Membres:[{id:'alias-historique',version:'1',operation:'MODIFIER',groupe_id:'public',personnage_id:'contact',role:'Autre import'}]});
  const before=await f.store.get(path);w=await view(f,'Membres');assert.ok(w.errors.some(e=>e.includes('Plusieurs identifiants')));assert.throws(()=>moduleMasterSheets(w),/Plusieurs identifiants/);assert.throws(()=>edited(w,'membre-pilote',{role:'Interdit'}),/ne peut pas être modifié/);assert.deepEqual(await f.store.get(path),before);
  // Old narrative tools allow the same relation id in different character sheets.
  await f.store.runTransaction(async tx=>{const c=await tx.get(`scenarios/${f.scenarioId}/characters/contact`);tx.set(`scenarios/${f.scenarioId}/characters/contact`,{...c,relations:[{id:'lien-pilote',title:'Autre relation',description:'',published:false,gmNotes:'',targetId:'pilote'}]});});
  const relations=await view(f,'Relations');assert.ok(relations.errors.some(e=>e.includes('Identifiant répété')));assert.throws(()=>moduleMasterSheets(relations),/Identifiant répété/);
 });
 test(`${prefix} : Masters sociaux de session conservent profils, caisses, stocks et messages`,async()=>{
  const f=await fixture();await f.apply(example());const config={scenarioId:f.scenarioId,revision:(await f.read('scenario',{scenarioId:f.scenarioId})).revision,groupId:'equipage',label:'Caisse fictive',amount:31},p=await f.read('prepareGroupWallet',config);await f.cmd('setGroupWallet',{...config,confirmation:p.confirmation});
  const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`,message={id:'message-test',title:'Message existant',body:'Fictif',at:1};
  await f.store.runTransaction(async tx=>tx.set(`${base}/groups/equipage/inboxes/pilote/updates/message-test`,message));
  const accounts=await f.store.list(`${base}/accounts`),inventory=await f.store.list(`${base}/inventory`),character=await f.store.get(`${base}/characters/pilote`),group=await f.store.get(`${base}/groups/equipage`);
  let w=await view(f,'Membres',extra);assert.equal(w.rows[0].row.id,'membre-pilote');await f.apply(payload(w,edited(w,'membre-pilote',{role:'Nouveau rôle',droits__checks:'1',droits__choice__readWallet:'OUI'})),extra);
  w=await view(f,'Relations',extra);await f.apply(payload(w,edited(w,'lien-pilote',{titre:'Lien corrigé'})),extra);
  const after=await f.store.get(`${base}/characters/pilote`);assert.deepEqual(after.abilityProfile,character.abilityProfile);assert.equal(after.hp,character.hp);assert.deepEqual(after.objectives,character.objectives);
  assert.deepEqual((await f.store.get(`${base}/groups/equipage`)).walletConfig,group.walletConfig);assert.deepEqual(await f.store.list(`${base}/accounts`),accounts);assert.deepEqual(await f.store.list(`${base}/inventory`),inventory);assert.deepEqual(await f.store.get(`${base}/groups/equipage/inboxes/pilote/updates/message-test`),message);assert.ok(await f.store.get(`${base}/accounts/${groupAccountId('equipage')}`));
  const current=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:current.revision,stage:'BRIEFING'});assert.equal((await view(f,'Membres',extra)).editable,false);await assert.rejects(f.prepare(moduleMasterSheets(await view(f,'Relations',extra)),extra),{code:'MASTER_PREPARATION_REQUIRED'});
  const close={sessionId:s.id,reason:'Fin de recette fictive',cancelOffers:false},closure=await f.read('prepareCampaignClosure',close);await f.cmd('closeCampaignSession',{...close,confirmation:closure.confirmation});
  const input={campaignId:s.campaignId,title:'Suite des liens sociaux',capacity:60,privacy:'Notice fictive',healthPolicy:'PRESERVE',reason:'Test de continuité'},preview=await f.read('prepareCampaignEpisode',input);let next=await f.cmd('beginCampaignEpisode',{...input,confirmation:preview.confirmation});
  while(next.status!=='READY')next=await f.cmd('advanceCampaignEpisode',{campaignId:s.campaignId,buildId:next.buildId??(await f.read('campaign',{campaignId:s.campaignId})).activeBuildId});
  const inherited=await view(f,'Membres',{scenarioId:undefined,sessionId:next.id});assert.equal(inherited.rows[0].row.id,'membre-pilote');assert.equal(inherited.rows[0].row.role,'Nouveau rôle');assert.equal(inherited.rows[0].row.droits,'readWallet');assert.equal(inherited.rows[0].row.version,'3');
  assert.equal((await view(f,'Relations',{scenarioId:undefined,sessionId:next.id})).rows[0].row.titre,'Lien corrigé');

 });
 test(`${prefix} : affiliations, droits et cibles invalides refusés, concurrence et réessai contrôlés`,async()=>{
  const f=await fixture();await f.apply(example());
  for(const [sheet,id,patch] of [['Membres','membre-pilote',{affiliation_publique:'OUI'}],['Membres','membre-pilote',{droits:'adminFirebase'}],['Relations','lien-pilote',{cible_id:'pilote'}],['Relations','lien-pilote',{cible_id:'absent'}]]){
   const w=await view(f,sheet),file=payload(w,edited(w,id,patch));assert.equal((await f.prepare(file)).canApply,false);await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets:file,reason:'Test',confirmation:'invalide'}),{code:'INVALID_MASTER'});
  }
  const w=await view(f,'Membres'),inputs=await Promise.all(['A','B'].map(async role=>{const sheets=payload(w,edited(w,'membre-pilote',{role})),preview=await f.prepare(sheets);return {scenarioId:f.scenarioId,module:'personnages',sheets,reason:'Import de test',confirmation:preview.confirmation,requestId:randomUUID()};}));
  const results=await Promise.allSettled(inputs.map(input=>f.cmd('applyMasterImport',input)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(['INVALID_MASTER','STALE_REVISION'].includes(results.find(r=>r.status==='rejected').reason.code));const i=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('applyMasterImport',inputs[i]),results[i].value);
 });
}
