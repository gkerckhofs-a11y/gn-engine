import test from 'node:test';
import assert from 'node:assert/strict';
import {playerRoute,playerShell,createPlayerRenderer,groupHomeHtml,groupMissionLink,selectContracts,walletSummaryHtml,terminalHtml,actionIntroHtml,playerTargetPath} from '../web/player-spaces.mjs';
import {playerRules} from '../src/core/player-rules.mjs';
import {fieldMineHtml} from '../web/field-actions.mjs';
import {personMineHtml} from '../web/person-actions.mjs';
const context=()=>({session:{id:'s1',title:'Session <secrète>',stage:'PAUSE',summary:'Une ville',practical:'À lire'},character:{id:'c1',displayName:'Pilote'},globalLevel:2,groups:[],economyEnabled:false,actionPoints:{available:5,maximum:8,reserved:1,nextRefillInMs:60000},health:{hp:2,maxHp:3,outOfCombat:false,convalescenceMs:0}});

test('Navigation joueur : les quatre entrées restent présentes, une seule active, QR et état accessibles',()=>{
 for(const [page,space] of [['play','character'],['groups','group'],['action','action'],['terminal','terminal']]){
  const html=playerShell(context(),playerRoute(page,'s1'),'<h1>Contenu</h1>');
  const nav=html.match(/<nav class="player-nav"[\s\S]*?<\/nav>/)[0];
  assert.equal((nav.match(/<a /g)??[]).length,4);assert.equal((nav.match(/aria-current="page"/g)??[]).length,1);
  assert.ok(nav.includes(`href="#/${page}/s1" aria-current="page"`));assert.equal(playerRoute(page,'s1').space,space);
  for(const label of ['Mon personnage','Mon groupe','Action','Terminal'])assert.ok(nav.includes(label));
  assert.ok(html.includes('Mon QR'));assert.ok(html.includes('Niveau 2'));assert.ok(html.includes('5 / 8 PA'));assert.ok(html.includes('2 / 3 PV'));assert.ok(html.includes('pause'));
  assert.ok(html.includes('Session &lt;secrète&gt;'));assert.ok(!html.includes('<secrète>'));
 }
});
test('Navigation joueur : routes anciennes conservées, espaces organisateur et badges publics exclus',()=>{
 for(const page of ['actions','interactions','person','field','discover'])assert.equal(playerRoute(page,'s1').space,'action');
 for(const page of ['bag','wallet','skills','health','knowledge','notes','note'])assert.equal(playerRoute(page,'s1').space,'character');
 assert.equal(playerRoute('contracts','s1','personal').space,'character');assert.equal(playerRoute('contracts','s1').space,'terminal');
 for(const page of ['group','group-missions'])assert.equal(playerRoute(page,'s1').space,'group');
 for(const page of ['scenario','session','person-admin','field-admin','badge','invite','join','media','campaign','contracts-admin'])assert.equal(playerRoute(page,'s1'),null);
 assert.equal(playerRoute('play','s1/other'),null);
 assert.equal(playerShell({...context(),character:null},playerRoute('play','s1'),'Accès fermé'),'Accès fermé');
 assert.equal(playerShell(context(),null,'Régie'),'Régie');
});
test('Navigation joueur : une réponse tardive ne restaure pas le contenu privé après une sortie',()=>{
 let version=1;const root={innerHTML:''},render=createPlayerRenderer({version,getVersion:()=>version,context:context(),route:playerRoute('play','s1'),root});
 render('Histoire privée');assert.ok(root.innerHTML.includes('Histoire privée'));
 version++;root.innerHTML='Connexion';render('Ancien secret');assert.equal(root.innerHTML,'Connexion');assert.equal(render.current(),false);
});
test('Groupes : état indépendant, caisses conditionnées par les droits et contrat unique filtré par titulaire',()=>{
 const d=context();assert.ok(groupHomeHtml(d,'').includes('Vous jouez en indépendant'));assert.ok(!groupHomeHtml(d,'').includes('caisses'));
 d.economyEnabled=true;d.groups=[{id:'g1',permissions:{readWallet:false,payWallet:false}}];assert.ok(!groupHomeHtml(d,'Groupe').includes('Mes caisses'));
 d.groups[0].permissions.payWallet=true;assert.ok(groupHomeHtml(d,'Groupe').includes('accounts/s1/groups'));
 const group={session:{id:'s1'},group:{id:'g1',permissions:{representMissions:false}}};assert.equal(groupMissionLink(group),'');group.group.permissions.representMissions=true;assert.ok(groupMissionLink(group).includes('group-missions/s1/g1'));
 const personal={id:'p',applicant:{kind:'CHARACTER',id:'c1'}},shared={id:'g',applicant:{kind:'GROUP',id:'g1'}},other={id:'x',applicant:{kind:'GROUP',id:'g2'}},all=[personal,shared,other];
 assert.deepEqual(selectContracts(all,'CHARACTER'),[personal]);assert.deepEqual(selectContracts(all,'GROUP','g1'),[shared]);assert.equal(selectContracts(all,'GROUP','g1')[0],shared);assert.deepEqual(selectContracts(all,null),all);
});
test('Sac : crédits disponibles et paiement autorisé, sans ajouter une monnaie quand elle est désactivée',()=>{
 assert.equal(walletSummaryHtml(null),'');
 const d={session:{id:'s1'},currency:{unit:'CR'},account:{available:25,balance:40},canPay:true};let html=walletSummaryHtml(d);assert.ok(html.includes('25 CR'));assert.ok(html.includes('40 CR'));assert.ok(!html.includes('disabled'));
 d.canPay=false;assert.ok(walletSummaryHtml(d).includes('disabled'));d.canPay=true;d.account.available=0;assert.ok(walletSummaryHtml(d).includes('disabled'));
});
test('Terminal : règles projetées explicitement et modules conditionnels, sans secrets du scénario',()=>{
 const source={actionPointRules:{enabled:true,renewalMinutes:300,cost:1,cooldownSeconds:600,patientCooldownSeconds:600,gmNotes:'SECRET'},actionPointRulesRevision:7,healthRules:{enabled:true,returnMode:'MJ',gmNotes:'SECRET'},economyRules:{enabled:true,name:'Crédits',unit:'CR',gmNotes:'SECRET'},gmNotes:'SECRET'};
 const d={...context(),playerRules:playerRules(source),economyEnabled:true};let html=terminalHtml(d);assert.ok(html.includes('300 minutes'));assert.ok(html.includes('version 7'));assert.ok(html.includes('market/s1'));assert.ok(html.includes('missions/s1'));assert.ok(!JSON.stringify(d.playerRules).includes('SECRET'));
 d.economyEnabled=false;html=terminalHtml(d);assert.ok(!html.includes('market/s1'));assert.ok(!html.includes('bounties/s1'));
 assert.deepEqual(playerRules({}),{actionPoints:null,health:null,economy:null});
});
test('Action : liens et codes des trois cibles, ouverture seule, anciennes URL de badge compatibles',()=>{
 const origin='https://gn-engine.web.app';
 for(const kind of ['field','person','discover']){
  assert.equal(playerTargetPath(' cible-1 ',kind,origin,'s1'),`${kind}/s1/cible-1`);
  assert.equal(playerTargetPath(`${origin}/#/${kind}/s1/cible-1`,'field',origin,'s1'),`${kind}/s1/cible-1`);
 }
 assert.equal(playerTargetPath(`${origin}/#/badge/s1/c1`,'discover',origin,'s1'),'person/s1/c1');
 assert.equal(playerTargetPath('#/field/s1/cache','person',origin,'s1'),'field/s1/cache');
 const html=actionIntroHtml('s1','c1');assert.ok(html.includes('data-form="playerCode"'));assert.ok(html.includes('person/s1/c1'));assert.ok(html.includes('appareil photo'));assert.ok(!html.includes('Lancer le dé'));
});
test('Action : refus des autres sessions, origines et liens privés ou arbitraires',()=>{
 const origin='https://gn-engine.web.app';
 for(const code of [`${origin}/#/field/s2/cache`,'https://evil.invalid/#/badge/s1/c1',`${origin}/autre#/field/s1/cache`,`${origin}/?token=secret#/field/s1/cache`,`${origin}/#/invite/s1/secret`,`${origin}/#/session/s1`,`${origin}/#/field/s1/cache/extra`,'javascript:alert(1)','https://user:pass@gn-engine.web.app/#/badge/s1/c1',''])assert.throws(()=>playerTargetPath(code,'field',origin,'s1'));
 assert.throws(()=>playerTargetPath('cache','invite',origin,'s1'));
});
test('Action : les deux historiques sont intégrables sans multiplier les champs de code',()=>{
 const field={session:{id:'s1',stage:'PAUSE'},actions:[{id:'a',targetTitle:'Cache',status:'ACTIVE',kind:'SEARCH',cost:1,instructions:'Attendre',remainingMs:2000,test:'D6'}]};
 const fh=fieldMineHtml(field,{embedded:true});assert.ok(!fh.includes('data-field-form="code"'));assert.ok(fh.includes('data-field-form="finish"'));assert.ok(fh.includes('data-field-timer="2000"'));assert.ok(fh.includes('disabled'));assert.ok(fieldMineHtml(field).includes('data-field-form="code"'));
 const person={session:{id:'s1',stage:'PAUSE'},character:{id:'c1'},convalescenceMs:0,captureMs:0,encounter:{taken:false},skills:[],aidOffers:[],actions:[]};
 const ph=personMineHtml(person,{embedded:true});assert.ok(!ph.includes('data-person-form="badge"'));assert.ok(ph.includes('data-person-form="offer"'));assert.ok(personMineHtml(person).includes('data-person-form="badge"'));
});
