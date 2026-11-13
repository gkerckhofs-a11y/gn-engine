import test from 'node:test';
import assert from 'node:assert/strict';
import {organizerRoute,organizerTools,organizerShell,organizerOverview,organizerAlerts,loadOrganizer,organizerCharacters} from '../web/organizer-dashboard.mjs';
const session={id:'s',title:'Port <Brèche>',role:'MJ',stage:'PAUSE',permissions:{content:true},spaceOutlaws:{navigationVersion:1,missionsVersion:1},accepted:2,registrations:[{accessActive:true}],characters:[{id:'c',assignedUid:'u',public:{displayName:'Bela <Venn>',profession:'Pilote'}}]};
const context={session,route:organizerRoute('session','s','animate'),view:'animate',loadedAt:new Date(0),unavailable:[]};
test('Navigation orga : routes joueur et cockpit isolées, portée session explicite',()=>{
 for(const page of ['play','identity','cockpit','admit','central','scenario'])assert.equal(organizerRoute(page,'s'),null);
 assert.equal(organizerRoute('field-admin','scenario','s'),null);
 assert.equal(organizerRoute('field-admin','session','s').sessionId,'s');
 assert.equal(organizerRoute('session','bad/route'),null);
 assert.equal(organizerRoute('session','s','supervise').view,'supervise');
});
test('Navigation orga : accueil sans secrets, MJ sans droit Sabacc implicite',()=>{
 const reception={...session,role:'RECEPTION',permissions:{reception:true}};
 assert.deepEqual(organizerTools(reception,{admin:true}).map(x=>x.view),['prepare','supervise']);
 assert.equal(organizerCharacters(reception),'');
 assert.ok(!organizerTools(session,{admin:false}).some(x=>x.path.startsWith('/sabacc')));
 assert.ok(organizerTools(session,{admin:true}).some(x=>x.path==='/sabacc/?view=admin'));
});
test('Navigation orga : préparation et anciennes versions ne proposent pas les modules absents',()=>{
 assert.ok(!organizerTools(session).some(x=>x.path.includes('shops-admin')));
 const prep={...session,spaceOutlaws:undefined,preparationKind:'SPACE_OUTLAWS',campaignId:'c',role:'OWNER'};
 const tools=organizerTools(prep);assert.equal(tools.filter(x=>x.path.startsWith('central/')).length,7);
 assert.ok(!tools.some(x=>x.path.includes('contracts-admin')||x.path.includes('cargo-admin')));
});
test('Navigation orga : droits relus et aucune lecture métier pour la réception',async()=>{
 const calls=[];const api=async(action)=>{calls.push(action);return {...session,permissions:{reception:true}};};
 await loadOrganizer(api,context.route);assert.deepEqual(calls,['session']);
 await assert.rejects(loadOrganizer(async()=>{throw Error('FORBIDDEN');},context.route),/FORBIDDEN/);
});
test('Navigation orga : défaillance partielle visible, aucun zéro inventé',async()=>{
 const c=await loadOrganizer(async(action)=>{if(action==='session')return session;if(action==='sabaccHome')return {admin:false};throw Error('OFFLINE');},context.route);
 assert.deepEqual(c.unavailable,['spaceport']);
 const html=organizerOverview(c);assert.match(html,/indisponibles/);assert.doesNotMatch(html,/0 · vaisseaux/);
});
test('Navigation orga : alertes distinctes par vaisseau, décisions réglées exclues',()=>{
 const c={...context,spaceport:{ships:[{shipId:'a',name:'A',cockpit:{status:'WAITING'}},{shipId:'b',name:'B',cockpit:{status:'WAITING'}},{shipId:'a',name:'A',cockpit:{status:'WAITING'}}]},appeals:{appeals:[{id:'p',status:'PENDING'},{id:'done',status:'DECIDED'}]},health:{session:{safetyStopped:true},characters:[{id:'h',name:'Blessé',status:'URGENT'}]}};
 assert.equal(organizerAlerts(c).length,5);assert.equal(new Set(organizerAlerts(c).map(x=>x.key)).size,5);
});
test('Navigation orga : HTML échappé, états de jeu et publication distincts',()=>{
 const html=organizerShell(context,'<p>Contenu autorisé</p>');
 assert.match(html,/Port &lt;Brèche&gt;/);assert.match(html,/En pause/);assert.match(html,/Version : non renseignée/);
 assert.match(html,/aria-current="page"/);assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 assert.match(organizerCharacters(session),/Bela &lt;Venn&gt;/);
 assert.doesNotMatch(organizerCharacters(session),/editCharacter/);
 assert.match(organizerOverview(context),/ne mesurent pas les joueurs actuellement connectés/);
});
