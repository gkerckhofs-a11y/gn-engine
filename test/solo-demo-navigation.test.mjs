import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkflow} from '../src/core/workflow.mjs';
import {MemoryStore} from './support/memory.mjs';
import {seedSoloDemo} from '../web/solo-demo-setup.mjs';
import {organizerRoute,loadOrganizer,organizerShell,organizerTools} from '../web/organizer-dashboard.mjs';
import {playerShell,playerRoute} from '../web/player-spaces.mjs';
import {demoAdministrationPath,demoPlayerPath,selectDemoRole,demoRolePath,sessionActionsHtml,loadDemoCharacters,dashboardDemoContexts,demoCharactersHtml,preparationSteps,preparationGuideHtml,loadPreparationStatus} from '../web/solo-demo-navigation.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
// seedSoloDemo supplies its fictional roles through its third argument; this
// adapter matches runSoloDemo, which normally adds them to the request.
async function nativeFixture(){
 const owner={uid:'owner-nav',email:'owner-nav@example.invalid',emailVerified:true,provider:'google.com',authTime:100},store=new MemoryStore(),w=createWorkflow({store,ownerEmail:owner.email,now:()=>100000});let sid;
 const api=async(a,i={})=>{const r=await w.dispatch(a,owner,i);if(a==='mySession'&&r.character)r.character.shortCode=(await w.dispatch('ensureCharacterCode',owner,{sessionId:i.sessionId,characterId:r.character.id})).code;return r;};
 const result=await seedSoloDemo(async(a,i,role='owner')=>{const r=await api(a,{...i,...(role==='owner'?{}:{demoRole:role,demoSession:sid})});if(a==='createSoloDemo')sid=r.id;return r;});return {owner,store,w,api,...result,sid};
}
test('Navigation essai : huit profils directs, identifiants publics, lecture sans changement de jeu même pendant une action',async()=>{
 const f=await nativeFixture(),sid=f.sid,p={sessionId:sid,targetId:'counter-place',kind:'ANALYZE',demoRole:'COM'},q=await f.api('prepareFieldAction',p);
 await f.api('startFieldAction',{...p,confirmation:q.confirmation,present:true,requestId:randomUUID()});
 const before=structuredClone(f.store.data),c=await loadOrganizer(f.api,organizerRoute('session',sid,'prepare'));
 await loadPreparationStatus(f.api,c,await f.api('spaceOutlawsEntry',{sessionId:sid}));
 assert.equal(c.demo.characters.length,8);assert.ok(c.demo.characters.every(x=>x.own.character.shortCode.match(/^[A-Z]{3}\d{3}$/)));assert.ok(c.demo.characters.every(x=>x.own.character.abilities.skills.length));
 const cache=storage();for(const {profile} of c.demo.characters){const path=demoPlayerPath(sid,profile.id),selected=selectDemoRole(c.demo,path.split('?')[1],cache,sid),own=await f.api('mySession',{sessionId:sid,demoRole:selected});assert.equal(own.character.primaryClassId,profile.id);cache.setItem(`demo-role:${sid}`,selected);assert.equal(selectDemoRole(c.demo,'',cache,sid),profile.id);assert.equal(demoAdministrationPath(sid),`#/session/${sid}`);}
 assert.equal(c.demo.characters.find(x=>x.profile.id==='COM').own.actionPoints.reserved,1);
 assert.deepEqual(f.store.data,before,'Navigation et lecture des profils ne modifient aucune donnée');
 const html=demoCharactersHtml(c.demo,'https://gn.test');assert.equal((html.match(/>Tester ce personnage/g)||[]).length,8);assert.equal((html.match(/>Copier le lien/g)||[]).length,8);assert.doesNotMatch(html,/demo_[a-f0-9]{64}|owner-nav@example|qrToken|SECRET_RECETTE/);
 assert.match(organizerShell(c,'Test'),/Tester la session/);assert.ok(preparationSteps(c).every(s=>s.state==='Terminé'||s.state==='Version publiée'));
});
test('Navigation essai : lien copié sans pouvoir, compte ordinaire et profil invalide refusés côté serveur',async()=>{
 const f=await nativeFixture(),ordinary={...f.owner,uid:'ordinary',email:'ordinary@example.invalid'};
 assert.equal(await f.w.dispatch('soloDemoContext',ordinary,{sessionId:f.sid}),null);
 for(const role of ['PIL','MED','bad'])await assert.rejects(f.w.dispatch('mySession',ordinary,{sessionId:f.sid,demoRole:role}),{code:'FORBIDDEN'});
 await assert.rejects(f.api('mySession',{sessionId:f.sid,demoRole:'bad'}),{code:'FORBIDDEN'});
 await assert.rejects(f.w.dispatch('session',ordinary,{sessionId:f.sid}),{code:'FORBIDDEN'});
 assert.throws(()=>selectDemoRole(null,'demoRole=PIL',storage(),f.sid));
 const context=await f.api('soloDemoContext',{sessionId:f.sid});assert.throws(()=>selectDemoRole(context,'demoRole=bad',storage(),f.sid));
 const s=await f.api('session',{sessionId:f.sid});assert.equal(await loadDemoCharacters(f.api,{...s,role:'MJ'},context),null);
 assert.equal(await loadDemoCharacters(f.api,{...s,stage:'ARCHIVED'},context),null);
 assert.doesNotMatch(sessionActionsHtml({...s,role:'MJ'},context),/Tester comme joueur/);
});
test('Navigation essai : anciennes routes, priorité administration et sélection explicite persistante',()=>{
 const ctx={table:{id:'t'},profiles:[{id:'PIL'},{id:'MED'}]},cache=storage();cache.setItem('demo-role:s','MED');
 assert.equal(selectDemoRole(ctx,'',cache,'s'),'MED');assert.equal(selectDemoRole(ctx,'demoRole=PIL',cache,'s'),'PIL');
 cache.setItem('demo-role:s','forged');assert.equal(selectDemoRole(ctx,'',cache,'s'),'PIL');
 assert.equal(demoRolePath('#/play/s?demoRole=MED','PIL'),'#/play/s?demoRole=PIL');
 assert.equal(demoRolePath('#/act/s/FIL-01/b?traceId=t','MED'),'#/act/s/FIL-01/b?traceId=t&demoRole=MED');
 assert.ok(playerRoute('play','s'));assert.ok(organizerRoute('session','s'));
 const h=sessionActionsHtml({id:'s',role:'OWNER'},ctx);assert.ok(h.indexOf('Administrer la session')<h.indexOf('Tester comme joueur'));
 assert.doesNotMatch(sessionActionsHtml({id:'s',role:'PLAYER'},ctx),/Administrer|Tester/);
 const own={session:{id:'s',stage:'PAUSE'},character:{displayName:'Test'},demo:{...ctx,selected:'MED'}};
 assert.match(playerShell(own,playerRoute('play','s'),'Jeu'),/Retour à l’administration/);
 assert.doesNotMatch(playerShell({...own,demo:undefined},playerRoute('play','s'),'Jeu'),/Retour à l’administration/);
});
test('Préparer : blocages réels, contrôle distinct de la publication, ateliers avancés conservés',async()=>{
 const c={session:{id:'s',capacity:8,role:'OWNER',campaignId:'c',stage:'PREPARATION',permissions:{content:true},preparationKind:'SPACE_OUTLAWS',characters:[]},view:'prepare',unavailable:[]};
 await loadPreparationStatus(async()=>({blockers:[{entityId:'kit',message:'Fourniture manquante'}]}),c,{versionId:null,canRelease:true,registrations:[]});
 assert.equal(preparationSteps(c)[3].state,'Bloqué');assert.match(preparationGuideHtml(c),/Fourniture manquante/);assert.equal(preparationSteps(c)[4].state,'À ouvrir');
 const tools=organizerTools(c.session);assert.equal(tools.filter(t=>t.advanced).length,7);
 const html=organizerShell({...c,route:organizerRoute('session','s','prepare'),loadedAt:new Date(),view:'prepare'},'');assert.match(html,/Configuration avancée/);assert.match(html,/aria-label="Ateliers Master M1 à M7"/);
 const unavailable={...c,unavailable:[]};delete unavailable.releasePreview;await loadPreparationStatus(async()=>{throw Error('OFFLINE');},unavailable,{canRelease:true});assert.deepEqual(unavailable.unavailable,['publication']);assert.equal(preparationSteps(unavailable)[3].state,'Contrôle indisponible');
});
