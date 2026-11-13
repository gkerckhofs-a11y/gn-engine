import test from 'node:test';
import assert from 'node:assert/strict';
import {quickDamagePayload,quickHealthSlider} from '../web/quick-health.mjs';
import {cleanCharacterNames} from '../web/character-label.mjs';
import {playerShell,playerRoute,playerTargetPath} from '../web/player-spaces.mjs';
import {cargoDestination} from '../web/cargo.mjs';
import {badgeRecipient} from '../web/knowledge.mjs';
const d={session:{id:'s1'},health:{hp:3,protection:1,spaceOutlaws:true,stage:'EN_JEU'}},data={kind:'hp',before:'3',hp:'3',protection:'1'};
test('curseur PV : retire la protection avant les PV, sans possibilité de soin',()=>{
 assert.deepEqual(quickDamagePayload(d,data,{remaining:'2'}),{sessionId:'s1',amount:2,damageKind:'ORDINARY',counted:true,secondsSinceDown:0});
 for(const remaining of ['4','3','-1','1.5','bad'])assert.throws(()=>quickDamagePayload(d,data,{remaining}));
 assert.equal(quickDamagePayload(d,data,{remaining:'0',secondsSinceDown:'45'}).secondsSinceDown,45);
});
test('curseur protection : ne retire aucun PV et refuse une saisie devenue obsolète',()=>{
 assert.equal(quickDamagePayload(d,{...data,kind:'protection',before:'1'},{remaining:'0'}).amount,1);
 assert.throws(()=>quickDamagePayload({...d,health:{...d.health,protection:0}},data,{remaining:'2'}));
 assert.match(quickHealthSlider({...d.health,safetyStopped:true},'s1'),/value="3" disabled/);
 assert.equal(quickHealthSlider(d.health,'s1','hp',true),'');
});
test('résumé : ID, crédits disponibles et lien vers portefeuille, sans renouvellement',()=>{
 const html=playerShell({...d,character:{id:'hero',shortCode:'ABC123',displayName:'Hero'},economyEnabled:true,wallet:{account:{available:42,balance:100}},session:{id:'s1',spaceOutlaws:{healthVersion:1}}},playerRoute('identity','s1'),'');
 assert.match(html,/ID : <strong>ABC123/);assert.match(html,/href="#\/wallet\/s1"[^>]*><strong>42/);assert.doesNotMatch(html,/Renouvellement/);
 assert.match(html,/data-kind="hp"/);assert.match(html,/data-kind="protection"/);
});
test('QR et ID : mêmes types de cibles et frontières de session',()=>{
 const origin='https://example.test';
 assert.equal(badgeRecipient('hero',origin,'s1'),'hero');
 for(const kind of ['field','person','discover','cargo','hold','warehouse','cargo-port','forgery','intrusion','escape']){
  assert.equal(playerTargetPath('id-1',kind,origin,'s1'),`${kind}/s1/id-1`);
  assert.equal(playerTargetPath(`${origin}/#/${kind}/s1/id-1`,kind,origin,'s1'),`${kind}/s1/id-1`);
  assert.throws(()=>playerTargetPath(`${origin}/#/${kind}/other/id-1`,kind,origin,'s1'));
 }
 assert.deepEqual(cargoDestination('ship',origin,'s1','hold'),{kind:'HOLD',id:'ship'});
 assert.deepEqual(cargoDestination('dock',origin,'s1','cargo-port'),{kind:'PORT',id:'dock'});
 assert.throws(()=>badgeRecipient(`${origin}/?private=1#/badge/s1/hero`,origin,'s1'));
});
test('suffixe des personnages : présentation sans modification des IDs ni des textes',()=>{
 const original={character:{id:'Recette',displayName:'Bela Recette',name:'Bela Recette',biography:'Texte Recette'},characters:[{name:'Ari Recette'}],confirmation:'preuve Recette'};
 const out=cleanCharacterNames(original);assert.equal(out.character.displayName,'Bela');assert.equal(out.characters[0].name,'Ari');assert.equal(out.character.id,'Recette');assert.equal(out.character.biography,'Texte Recette');assert.equal(out.confirmation,original.confirmation);assert.equal(original.character.name,'Bela Recette');
});

test('décodage local d’un vrai QR, sans service distant',async()=>{
 const {default:QRCode}=await import('qrcode'),{default:jsQR}=await import('jsqr');
 const payload='https://example.test/#/hold/s1/ship-42',qr=QRCode.create(payload),scale=6,margin=4,size=(qr.modules.size+margin*2)*scale,data=new Uint8ClampedArray(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const row=Math.floor(y/scale)-margin,col=Math.floor(x/scale)-margin,dark=row>=0&&col>=0&&row<qr.modules.size&&col<qr.modules.size&&qr.modules.get(row,col),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=dark?0:255;data[i+3]=255;}
 assert.equal(jsQR(data,size,size).data,payload);
});

test('Sabacc : code manuel équivalent au QR, clé de révocation conservée',async()=>{
 const {sabaccTarget}=await import('../web/sabacc/qr-target.mjs'),origin='https://example.test';
 assert.deepEqual(sabaccTarget('table-1.key-1',origin),sabaccTarget(origin+'/sabacc/?table=table-1&key=key-1',origin));
 for(const x of ['table-1',origin+'/sabacc/?table=table-1','https://other.test/sabacc/?table=t&key=k',origin+'/?table=t&key=k'])assert.throws(()=>sabaccTarget(x,origin));
});

test('menus Action et Terminal : résumé avec liens, sans grands panneaux de santé répétés',()=>{
 const own={...d,character:{id:'hero',shortCode:'ABC123',displayName:'Hero'},session:{id:'s1',spaceOutlaws:{healthVersion:1}}};
 for(const page of ['action','terminal']){const html=playerShell(own,playerRoute(page,'s1'),'');assert.doesNotMatch(html,/class="quick-states"/);assert.match(html,/#\/health\/s1/);assert.match(html,/#\/protection\/s1/);}
});
