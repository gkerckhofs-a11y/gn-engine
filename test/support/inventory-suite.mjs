import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
export function inventorySuite(makeStore,prefix='Inventaire'){
  const err=code=>({code});
  async function fixture(quantity=3){
    const store=await makeStore(),suffix=randomUUID();let time=100000;
    const actor=n=>({uid:`${n}-${suffix}`,email:`${n}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
    const owner=actor('owner'),alice=actor('alice'),bob=actor('bob'),eve=actor('eve'),staff=actor('staff');
    const workflow=createWorkflow({store,ownerEmail:owner.email,now:()=>time});
    const read=(a,who=owner,i={})=>workflow.dispatch(a,who,i),cmd=(a,who=owner,i={})=>read(a,who,{requestId:randomUUID(),...i});
    const {id:scenarioId}=await cmd('createScenario',owner,{title:'Inventaire synthétique'}),scenario=()=>read('scenario',owner,{scenarioId}),characters=[];
    for(const name of ['Soignant','Patient','Secours'])characters.push((await cmd('saveCharacter',owner,{scenarioId,revision:(await scenario()).revision,displayName:name,biography:'BIO_STABLE',publicationState:'PUBLISHED'})).id);
    const items=[];
    for(const [name,kind,consumable] of [['Injecteur','STACKABLE',true],['Insigne','INDIVIDUAL',false]])items.push((await cmd('saveItem',owner,{scenarioId,revision:(await scenario()).revision,name,kind,consumable,description:'Texte joueur',unit:'unité',category:'Matériel',unitVolume:1,publicationState:'PUBLISHED',gmNotes:'ORIGINE_SECRETE_MJ'})).id);
    const seed=async(cid,choices)=>{const input={scenarioId,revision:(await scenario()).revision,characterId:cid,items:choices};const p=await read('prepareStartingInventory',owner,input);return cmd('setStartingInventory',owner,{...input,confirmation:p.confirmation});};
    if(quantity!==null){await seed(characters[0],[{itemId:items[0],quantity},{itemId:items[1],quantity:1}]);await seed(characters[2],[{itemId:items[0],quantity}]);}
    const skills=[];
    for(const kind of ['ACTIVE_TARGET','ACTIVE_SELF'])skills.push((await cmd('saveSkill',owner,{scenarioId,revision:(await scenario()).revision,name:kind,kind,publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:3,uses:null,cooldownSeconds:0,consumable:{itemId:items[0],quantity:1}}})).id);
    for(const characterId of [characters[0],characters[2]]){const input={scenarioId,revision:(await scenario()).revision,characterId,classId:null,overrides:skills.map(skillId=>({skillId,level:1})),published:true};const p=await read('prepareAbilityProfile',owner,input);await cmd('setAbilityProfile',owner,{...input,confirmation:p.confirmation});}
    await cmd('saveScenarioHealth',owner,{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,defaultMaxHp:10,returnMode:'MJ',allowed:{}}});
    const {id:versionId}=await cmd('publishScenario',owner,{scenarioId,revision:(await scenario()).revision}),sessionInput={scenarioId,versionId,title:'Stocks de test',capacity:3,privacy:'Fictif'};
    const {id:sessionId}=await cmd('createSession',owner,sessionInput),session=()=>read('session',owner,{sessionId});
    const stage=value=>session().then(s=>cmd('setStage',owner,{sessionId,revision:s.revision,stage:value}));
    const activate=async who=>{const token=randomBytes(32).toString('base64url');await cmd('issueInvitation',owner,{sessionId,uid:who.uid,tokenHash:hash(token),hours:1});await read('redeem',who,{sessionId,token});};
    await cmd('setRegistrationOpen',owner,{sessionId,revision:1,open:true});
    for(const [i,who] of [alice,bob,eve].entries()){await cmd('register',who,{sessionId,name:'Test'});await cmd('assign',owner,{sessionId,uid:who.uid,characterId:characters[i]});await activate(who);}
    await stage('BRIEFING');await stage('EN_JEU');
    const bag=(who=alice,patch={})=>read('myInventory',who,{sessionId,...patch});
    const health=(who=alice)=>read('myHealth',who,{sessionId});
    const initialLots=(await session()).inventory;
    const lot=async(who=alice)=>{const b=await bag(who),initial=initialLots.find(l=>l.holderId===b.character.id&&l.item.id===items[0]);return b.lots.find(l=>l.id===initial?.id);};
    const damage=async(who=bob,amount=6)=>{const input={sessionId,amount},p=await read('prepareDamage',who,input);return cmd('applyDamage',who,{...input,confirmation:p.confirmation});};
    const prepare=async(who=alice,targetId=characters[1],skillId=skills[0],patch={})=>{const input={sessionId,skillId,targetId,lotId:(await lot(who))?.id,...patch};return {input,result:await read('prepareTreatment',who,input)};};
    const treat=(p,who=alice,patch={})=>cmd('applyTreatment',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const grant=async(characterId=characters[0],itemId=items[0],quantity=2,patch={})=>{const input={sessionId,revision:(await session()).revision,characterId,itemId,quantity,reason:'DON_PRIVE_MJ'};const p=await read('prepareGrantItem',owner,input);return cmd('grantItem',owner,{...input,confirmation:p.confirmation,...patch});};
    const correct=async(lid,patch={})=>{const s=await session(),l=s.inventory.find(l=>l.id===lid);return cmd('correctLot',owner,{sessionId,revision:s.revision,lotId:lid,lotRevision:l.revision,quantity:l.quantity,status:l.status,reason:'MOTIF_PRIVE_MJ',...patch});};
    return {store,read,cmd,owner,alice,bob,eve,staff,scenarioId,sessionId,scenario,session,sessionInput,characters,items,skills,seed,stage,activate,bag,lot,health,damage,prepare,treat,grant,correct,advance:ms=>time+=ms};
  }
  test(`${prefix} : matériel préparé sans effet puis confirmé, copie des modèles sans notes MJ`,async()=>{
    const f=await fixture(null),input={scenarioId:f.scenarioId,revision:(await f.scenario()).revision,characterId:f.characters[0],items:[{itemId:f.items[0],quantity:4}]};
    const p=await f.read('prepareStartingInventory',f.owner,input);assert.equal((await f.scenario()).characters.find(c=>c.id===f.characters[0]).startingInventory,undefined);assert.equal(JSON.stringify(p).includes('ORIGINE_SECRETE_MJ'),false);
    const requestId=randomUUID(),r=await f.cmd('setStartingInventory',f.owner,{...input,confirmation:p.confirmation,requestId});assert.deepEqual(await f.cmd('setStartingInventory',f.owner,{...input,confirmation:p.confirmation,requestId}),r);
    assert.equal((await f.bag()).lots.length,0);assert.equal((await f.scenario()).characters.find(c=>c.id===f.characters[0]).startingInventory.items[0].quantity,4);
  });
  test(`${prefix} : version et sessions indépendantes, pas de stock repris ni réapprovisionné depuis une partie`,async()=>{
    const f=await fixture();await f.damage();await f.treat(await f.prepare());await f.seed(f.characters[0],[{itemId:f.items[0],quantity:20}]);
    const {id:sid}=await f.cmd('createSession',f.owner,f.sessionInput),s=await f.read('session',f.owner,{sessionId:sid});
    assert.equal(s.inventory.find(l=>l.holderId===f.characters[0]&&l.item.id===f.items[0]).quantity,3);assert.equal((await f.lot()).quantity,2);
    assert.equal((await f.scenario()).characters.find(c=>c.id===f.characters[0]).hp,null);
  });
  test(`${prefix} : préparation périmée et références invalides ne changent pas le matériel`,async()=>{
    const f=await fixture(),base={scenarioId:f.scenarioId,revision:(await f.scenario()).revision,characterId:f.characters[0],items:[{itemId:f.items[0],quantity:2}]},p=await f.read('prepareStartingInventory',f.owner,base);
    const d=(await f.scenario()).items.find(d=>d.id===f.items[0]);await f.cmd('saveItem',f.owner,{...d,scenarioId:f.scenarioId,revision:base.revision,name:'Nouvelle version'});
    await assert.rejects(f.cmd('setStartingInventory',f.owner,{...base,revision:(await f.scenario()).revision,confirmation:p.confirmation}),err('STALE_REVISION'));
    for(const items of [[{itemId:f.items[0],quantity:0}],[{itemId:f.items[1],quantity:2}],[{itemId:f.items[0],quantity:1},{itemId:f.items[0],quantity:1}],[{itemId:randomUUID(),quantity:1}]])await assert.rejects(f.read('prepareStartingInventory',f.owner,{...base,revision:(await f.scenario()).revision,items}));
    assert.equal((await f.lot()).quantity,3);
  });
  test(`${prefix} : attribution MJ confirmée et répétition unique, pas de fusion de lots`,async()=>{
    const f=await fixture(),input={sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[0],itemId:f.items[0],quantity:2,reason:'DON_PRIVE_MJ'},p=await f.read('prepareGrantItem',f.owner,input);
    assert.equal((await f.bag()).lots.length,2);const requestId=randomUUID(),r=await f.cmd('grantItem',f.owner,{...input,confirmation:p.confirmation,requestId});assert.deepEqual(await f.cmd('grantItem',f.owner,{...input,confirmation:p.confirmation,requestId}),r);
    const b=await f.bag();assert.equal(b.lots.length,3);assert.equal(b.lots.find(l=>l.id===r.id).quantity,2);assert.equal(JSON.stringify(b).includes('DON_PRIVE_MJ'),false);assert.equal(JSON.stringify(b).includes('origin'),false);
    const h=await f.read('itemHistory',f.owner,{sessionId:f.sessionId,kind:'inventory',id:r.id});assert.equal(h.events.length,1);assert.equal(h.events[0].reason,'DON_PRIVE_MJ');
  });
  test(`${prefix} : joueur, Accueil, badge et aperçu ne contournent pas la confidentialité des stocks`,async()=>{
    const f=await fixture();assert.equal((await f.bag(f.bob,{characterId:f.characters[0],uid:f.alice.uid})).lots.length,0);
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});
    const s=await f.read('session',f.staff,{sessionId:f.sessionId});assert.equal('inventory' in s,false);assert.equal('items' in s,false);assert.equal(JSON.stringify(s).includes('Injecteur'),false);
    for(const who of [f.alice,f.staff])for(const action of ['prepareGrantItem','grantItem','correctLot','itemHistory','previewInventory','saveSessionItem'])await assert.rejects(f.cmd(action,who,{sessionId:f.sessionId,characterId:f.characters[0]}),err('FORBIDDEN'));
    const preview=await f.read('previewInventory',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]});assert.deepEqual(preview.lots,(await f.bag()).lots);assert.equal(JSON.stringify(preview).includes('ORIGINE_SECRETE_MJ'),false);
    assert.equal(JSON.stringify(await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]})).includes('Injecteur'),false);
  });
  test(`${prefix} : le soin consomme le lot choisi et restaure les PV dans la même opération`,async()=>{
    const f=await fixture();await f.damage(f.bob,1);const p=await f.prepare();assert.equal(p.result.restored,1);assert.equal(p.result.consumable.remaining,2);assert.equal((await f.lot()).quantity,3);
    const r=await f.treat(p);assert.equal((await f.health(f.bob)).health.hp,10);assert.equal((await f.lot()).quantity,2);assert.equal(r.consumable.quantity,1);
    const h=await f.read('itemHistory',f.owner,{sessionId:f.sessionId,kind:'inventory',id:r.consumable.lotId});assert.ok(h.events.some(e=>e.healthEventId===r.id&&e.before.quantity===3&&e.after.quantity===2));
    const received=(await f.health(f.bob)).events.find(e=>e.id===r.id);assert.deepEqual(received.consumable,{name:'Injecteur',unit:'unité',quantity:1});assert.equal('remaining' in received.consumable,false);
  });
  test(`${prefix} : dernière unité consommée une fois malgré réessai ou recharge`,async()=>{
    const f=await fixture(1);await f.damage();const p=await f.prepare(),requestId=randomUUID(),r=await f.treat(p,f.alice,{requestId});assert.deepEqual(await f.treat(p,f.alice,{requestId}),r);
    assert.equal((await f.lot()).quantity,0);assert.equal((await f.lot()).status,'CONSUMED');assert.equal((await f.health()).skills.find(s=>s.id===f.skills[0]).used,1);
    await assert.rejects(f.treat(p),err('INSUFFICIENT_STOCK'));assert.equal((await f.health(f.bob)).health.hp,7);
  });
  test(`${prefix} : deux cibles se disputant le dernier consommable ne sont pas toutes les deux soignées`,async()=>{
    const f=await fixture(1);await f.damage();await f.damage(f.eve);const a=await f.prepare(),b=await f.prepare(f.alice,f.characters[2]);const r=await Promise.allSettled([f.treat(a),f.treat(b)]);
    assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'INSUFFICIENT_STOCK');assert.equal((await f.health(f.bob)).health.hp+(await f.health(f.eve)).health.hp,11);assert.equal((await f.lot()).quantity,0);
  });
  test(`${prefix} : deux soignants concurrents conservent le consommable de l’intervention refusée`,async()=>{
    const f=await fixture(1);await f.damage();const a=await f.prepare(),b=await f.prepare(f.eve);const r=await Promise.allSettled([f.treat(a),f.treat(b,f.eve)]);
    assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.lot()).quantity+(await f.lot(f.eve)).quantity,1);assert.equal((await f.health(f.bob)).health.hp,7);
  });
  test(`${prefix} : aucun stock perdu si la cible, la pause ou le hors combat interdit le soin`,async()=>{
    const f=await fixture();await assert.rejects(f.prepare(),err('NO_HEAL_NEEDED'));await f.damage();const p=await f.prepare();await f.damage(f.bob,1);await assert.rejects(f.treat(p),err('STALE_REVISION'));
    const fresh=await f.prepare();await f.stage('PAUSE');await assert.rejects(f.treat(fresh),err('SESSION_NOT_RUNNING'));await f.stage('EN_JEU');await f.damage(f.alice,10);await assert.rejects(f.prepare(),err('OUT_OF_COMBAT'));
    assert.equal((await f.lot()).quantity,3);assert.equal((await f.health()).skills.find(s=>s.id===f.skills[0]).used,0);
  });
  test(`${prefix} : lot d’autrui, non consommable, inexistant ou quantité forgée refusés`,async()=>{
    const f=await fixture();await f.damage();
    for(const lotId of [(await f.lot(f.eve)).id,(await f.bag()).lots.find(l=>l.item.id===f.items[1]).id,randomUUID()])await assert.rejects(f.prepare(f.alice,f.characters[1],f.skills[0],{lotId}),err('INVALID_CONSUMABLE'));
    const p=await f.prepare(f.alice,f.characters[1],f.skills[0],{quantity:0,consumable:null});assert.equal(p.result.consumable.quantity,1);await f.treat(p);assert.equal((await f.lot()).quantity,2);
  });
  test(`${prefix} : saisie et correction périmée bloquent une consommation sans effacer les autres données`,async()=>{
    const f=await fixture();await f.damage();const p=await f.prepare(),l=await f.lot();await f.correct(l.id,{status:'SEIZED'});await assert.rejects(f.treat(p),err('INSUFFICIENT_STOCK'));
    await f.correct(l.id,{status:'AVAILABLE',quantity:5});await assert.rejects(f.treat(p),err('STALE_REVISION'));assert.equal((await f.health(f.bob)).health.hp,4);
    const c=(await f.session()).characters.find(c=>c.id===f.characters[0]);assert.equal(c.biography,'BIO_STABLE');assert.equal(c.hp,10);assert.equal((await f.lot()).ownerId,f.characters[0]);
    assert.equal(JSON.stringify(await f.bag()).includes('MOTIF_PRIVE_MJ'),false);
  });
  test(`${prefix} : correction de stock préparée avant un soin ne le réapprovisionne pas silencieusement`,async()=>{
    const f=await fixture(),s=await f.session(),l=await f.lot(),input={sessionId:f.sessionId,revision:s.revision,lotId:l.id,lotRevision:l.revision,quantity:10,status:'AVAILABLE',reason:'Correction'};await f.damage();await f.treat(await f.prepare());
    await assert.rejects(f.cmd('correctLot',f.owner,input),err('STALE_REVISION'));assert.equal((await f.lot()).quantity,2);
    const next={...input,lotRevision:(await f.lot()).revision};const r=await Promise.allSettled([f.cmd('correctLot',f.owner,next),f.cmd('correctLot',f.owner,{...next,quantity:11})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
  });
  test(`${prefix} : modèle modifié sans transformation rétroactive et version du consommable contrôlée`,async()=>{
    const f=await fixture();await f.damage();const s=await f.session(),d=s.items.find(x=>x.id===f.items[0]);await f.cmd('saveSessionItem',f.owner,{...d,sessionId:f.sessionId,revision:s.revision,name:'Injecteur version 2',consumable:true,reason:'Évolution du modèle'});
    assert.equal((await f.lot()).item.name,'Injecteur');const created=await f.grant();assert.equal((await f.bag()).lots.find(l=>l.id===created.id).item.revision,2);
    await assert.rejects(f.prepare(f.alice,f.characters[1],f.skills[0],{lotId:created.id}),err('INVALID_CONSUMABLE'));await f.treat(await f.prepare());assert.equal((await f.lot()).quantity,2);
  });
  test(`${prefix} : révocation et réattribution ferment les anciens accès sans donner le stock à un autre personnage`,async()=>{
    const f=await fixture();await f.damage();const p=await f.prepare(),requestId=randomUUID();await f.treat(p,f.alice,{requestId});
    await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[0],replace:true});await f.activate(f.eve);
    await assert.rejects(f.bag(),err('FORBIDDEN'));await assert.rejects(f.treat(p,f.alice,{requestId}),err('FORBIDDEN'));assert.equal((await f.lot(f.eve)).quantity,2);
    await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.eve.uid});await assert.rejects(f.bag(f.eve),err('FORBIDDEN'));
  });
  test(`${prefix} : fermeture terminale des lots et nouveau don conservant la provenance`,async()=>{
    const f=await fixture(1);await f.damage();await f.treat(await f.prepare());const l=await f.lot();await assert.rejects(f.correct(l.id,{quantity:1,status:'AVAILABLE'}),err('LOT_CLOSED'));
    const other=(await f.bag()).lots.find(l=>l.item.id===f.items[1]);await f.correct(other.id,{quantity:0,status:'DESTROYED'});await assert.rejects(f.correct(other.id,{quantity:1,status:'AVAILABLE'}),err('LOT_CLOSED'));
    const created=await f.grant();assert.notEqual(created.id,l.id);assert.equal((await f.bag()).lots.find(x=>x.id===l.id).status,'CONSUMED');
  });
  test(`${prefix} : champs invalides, référence étrangère et coût incompatible refusés sans écriture`,async()=>{
    const f=await fixture(),s=await f.scenario(),base={scenarioId:f.scenarioId,revision:s.revision,name:'Objet',kind:'STACKABLE',consumable:true,publicationState:'PUBLISHED'};
    for(const patch of [{consumable:'oui'},{unitVolume:-1},{unitVolume:1.5},{kind:'UNKNOWN'},{legality:'HIDDEN'}])await assert.rejects(f.cmd('saveItem',f.owner,{...base,...patch}),err('INVALID_ITEM'));
    for(const itemId of [f.items[1],randomUUID()])await assert.rejects(f.cmd('saveSkill',f.owner,{scenarioId:f.scenarioId,revision:s.revision,name:'Soin invalide',kind:'ACTIVE_TARGET',publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:3,uses:null,cooldownSeconds:0,consumable:{itemId,quantity:1}}}),err('INVALID_CONSUMABLE'));
    assert.equal((await f.scenario()).revision,s.revision);
    for(const action of ['myInventory','previewInventory','saveItem','saveSessionItem','prepareStartingInventory','setStartingInventory','prepareGrantItem','grantItem','correctLot','itemHistory'])await assert.rejects(f.cmd(action,null,{}),err('LOGIN_REQUIRED'));
  });
  test(`${prefix} : un échec transactionnel ne laisse ni soin, ni consommation, ni historique partiel`,async()=>{
    const f=await fixture();await f.damage();const p=await f.prepare(),run=f.store.runTransaction.bind(f.store);let abort=true;
    f.store.runTransaction=cb=>run(async tx=>{const r=await cb(tx);if(abort){abort=false;throw new Error('Panne synthétique avant commit');}return r;});
    await assert.rejects(f.treat(p),/Panne synthétique/);assert.equal((await f.health()).events.length,0);const history=await f.read('itemHistory',f.owner,{sessionId:f.sessionId,kind:'inventory',id:(await f.lot()).id});assert.equal(history.events.length,1);assert.equal(history.events[0].kind,'INITIAL');assert.equal((await f.lot()).quantity,3);assert.equal((await f.health(f.bob)).health.hp,4);assert.equal((await f.health()).skills.find(s=>s.id===f.skills[0]).used,0);
    await f.treat(p);assert.equal((await f.lot()).quantity,2);assert.equal((await f.health(f.bob)).health.hp,7);
  });
  test(`${prefix} : MJ délégué autorisé puis révocation prioritaire au résultat mémorisé et archive fermée`,async()=>{
    const f=await fixture();await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'Délégation'});
    const input={sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[0],itemId:f.items[0],quantity:2,reason:'Don du MJ'},p=await f.read('prepareGrantItem',f.staff,input),requestId=randomUUID();
    await f.cmd('grantItem',f.staff,{...input,confirmation:p.confirmation,requestId});
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:false,reason:'Fin de mission'});
    await assert.rejects(f.cmd('grantItem',f.staff,{...input,confirmation:p.confirmation,requestId}),err('FORBIDDEN'));
    await f.stage('PAUSE');assert.ok((await f.bag()).lots.length);await f.stage('FINISHED');assert.ok((await f.bag()).lots.length);await f.stage('ARCHIVED');await assert.rejects(f.bag(),err('FORBIDDEN'));await assert.rejects(f.grant(),err('SESSION_CLOSED'));
  });
  test(`${prefix} : auto-soin à plusieurs unités, quantité prise dans un seul lot explicitement choisi`,async()=>{
    const f=await fixture(),s=await f.session(),skill=s.skills.find(k=>k.id===f.skills[1]);
    await f.cmd('saveSessionSkill',f.owner,{...skill,sessionId:f.sessionId,revision:s.revision,healing:{...skill.healing,consumable:{itemId:f.items[0],quantity:2}},reason:'Deux unités'});
    const input={sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[0],classId:null,overrides:[{skillId:f.skills[1],level:1}],published:true,reason:'Appliquer le coût'},p=await f.read('prepareAbilityProfile',f.owner,input);await f.cmd('setAbilityProfile',f.owner,{...input,confirmation:p.confirmation});
    await f.damage(f.alice,5);await f.treat(await f.prepare(f.alice,f.characters[0],f.skills[1]));assert.equal((await f.lot()).quantity,1);assert.equal((await f.health()).health.hp,8);
    await f.grant(f.characters[0],f.items[0],1);await assert.rejects(f.prepare(f.alice,f.characters[0],f.skills[1]),err('INSUFFICIENT_STOCK'));
    const fresh=await f.grant(f.characters[0],f.items[0],2);await f.treat(await f.prepare(f.alice,f.characters[0],f.skills[1],{lotId:fresh.id}));assert.equal((await f.health()).health.hp,10);assert.equal((await f.bag()).lots.find(l=>l.id===fresh.id).quantity,0);
  });
}
