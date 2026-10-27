import test from 'node:test';
import assert from 'node:assert/strict';
import {transportFixture} from './support/space-transport-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {transportEditor,transportPayload,transportPanel,transportTerms} from '../web/space-transport.mjs';
import {createCargoUi} from '../web/cargo.mjs';
const helpers={button:(l,a)=>`<button data-action="${a}">${l}</button>`,link:(l,p)=>`<a href="#/${p}">${l}</a>`};
test('Interface transport : proposition renseignée, montant explicite et route privée après accord',async()=>{
 const f=await transportFixture(()=>new MemoryStore()),d=await f.read('sessionApplication',{applicationId:f.application.id},f.owner);const html=transportEditor(d);for(const name of ['transportShip','transportRoute','transportOffer','transportQuantity','transportRecipient','transportExpenses'])assert.match(html,new RegExp(`name="${name}"`));assert.doesNotMatch(html,/OUT-SECRET|AWAY-CODE|SECRET_MJ/);assert.deepEqual(transportPayload({}),{});assert.equal(transportPayload({transportShip:'ship',transportRoute:'out',transportOffer:'supply',transportQuantity:'6',transportRate:'ORDINARY',transportRecipient:'A',transportExpenses:'B'}).transport.quantity,6);
 const before=await f.view();assert.equal(transportPanel(before),'');await f.accept();const after=await f.view();assert.match(transportPanel(after),/AWAY-CODE|QR de manutention/);assert.match(transportTerms({...after.contract.terms.transport,recipient:'<script>bad</script>'}),/&lt;script&gt;/);assert.doesNotMatch(transportTerms({...after.contract.terms.transport,recipient:'<script>bad</script>'}),/<script>/);
});
test('Interface transport : seules destinations autorisées et suivi de tranche',async()=>{
 const f=await transportFixture(()=>new MemoryStore(),{quantity:5});await f.accept();const lot=(await f.lots())[0],d=await f.read('cargoLot',{lotId:lot.id}),ui=createCargoUi(helpers),html=ui.lot(d);assert.match(html,/HOLD:ship/);assert.doesNotMatch(html,/PORT:away|CHARACTER:/);assert.match(html,/Comptoir PNJ/);const t=await f.start(lot,{kind:'HOLD',id:'ship'});assert.match(transportPanel(await f.view()),new RegExp(`cargo-transfer/${f.sid}/${t.id}`));
});

test('Interface transport QR : cible de port reconnue, sans origine, session ou régie étrangère',async()=>{
 const {cargoDestination}=await import('../web/cargo.mjs'),{playerTargetPath,playerRoute,actionIntroHtml}=await import('../web/player-spaces.mjs'),origin='https://gn.example',sid='s';
 assert.equal(playerTargetPath(`${origin}/#/cargo-port/s/away`,'field',origin,sid),'cargo-port/s/away');assert.deepEqual(cargoDestination(`${origin}/#/cargo-port/s/away`,origin,sid),{kind:'PORT',id:'away'});assert.equal(playerRoute('cargo-port',sid).space,'terminal');assert.equal(playerRoute('cargo-port-admin',sid),null);
 for(const url of [`https://foreign.example/#/cargo-port/s/away`,`${origin}/#/cargo-port/other/away`,`${origin}/#/cargo-port-admin/s/away`,`${origin}/?x=1#/cargo-port/s/away`,`${origin}/path/#/cargo-port/s/away`])assert.throws(()=>playerTargetPath(url,'field',origin,sid));
 assert.match(actionIntroHtml(sid,'c',true,true,true,true),/option value="cargo-port"/);assert.doesNotMatch(actionIntroHtml(sid,'c',true,true,true,false),/option value="cargo-port"/);
});
test('Interface transport QR : formulaire de remise, délai et consentement physique',async()=>{
 const f=await transportFixture(()=>new MemoryStore(),{quantity:5}),ui=createCargoUi(helpers);await f.accept();await f.load();await f.arrive();let d=await f.read('cargoPort',{portId:'away'}),html=ui.port(d);
 assert.match(html,/data-form="cargoPrepare"/);assert.match(html,/data-port="away"/);assert.match(html,/name="destination" value="PORT:away"/);assert.match(html,/max="5"/);assert.match(html,/name="destinationQr" value=""/);assert.match(transportPanel(await f.view()),new RegExp(`cargo-port/${f.sid}/away`));
 const t=await f.start(d.contracts[0].lots[0].lot,{kind:'PORT',id:'away'});d=await f.read('cargoPort',{portId:'away'});html=ui.port(d);assert.match(html,/180 secondes/);assert.doesNotMatch(html,/data-command="receiveCargoTransfer"|data-form="cargoPrepare"/);f.advance(180000);d=await f.read('cargoPort',{portId:'away'});html=ui.port(d);assert.match(html,/data-command="receiveCargoTransfer"/);assert.match(html,/name="received" type="checkbox" required/);assert.match(html,/&quot;portId&quot;:&quot;away&quot;/);assert.match(html,/remise physique/);assert.match(html,new RegExp(`cargo-transfer/${f.sid}/${t.id}`));assert.doesNotMatch(html,/settleContract|reviewContract|AWAY-CODE|SECRET_/);
});
test('Interface transport QR : régie affiche la cible et le titulaire sans recevoir à sa place',async()=>{
 const f=await transportFixture(()=>new MemoryStore(),{quantity:5}),ui=createCargoUi({...helpers,button:(l,a,extra)=>`<button data-action="${a}" ${extra}>${l}</button>`});await f.accept();await f.load();await f.arrive();await f.start((await f.lots())[0],{kind:'PORT',id:'away'});f.advance(180000);
 const d=await f.read('cargoPortAdmin',{portId:'away'},f.owner),html=ui.port(d);assert.match(html,/data-kind="cargo-port"/);assert.match(html,/Transporteur/);assert.match(html,new RegExp(`contract-admin/${f.sid}/${f.c.id}`));assert.doesNotMatch(html,/data-form="cargoPrepare"|data-command="receiveCargoTransfer"|AWAY-CODE|SECRET_/);assert.match(ui.admin(await f.read('cargoAdmin',{},f.owner)),new RegExp(`cargo-port-admin/${f.sid}/away`));
});
test('Interface transport QR : textes échappés et état reçu sans deuxième action',async()=>{
 const f=await transportFixture(()=>new MemoryStore(),{quantity:5}),ui=createCargoUi(helpers);await f.accept();await f.load();await f.arrive();await f.deliver();const d=await f.read('cargoPort',{portId:'away'});d.port.name='<script>port</script>';d.contracts[0].title='<script>titre</script>';d.contracts[0].recipient='<script>agent</script>';const html=ui.port(d);assert.doesNotMatch(html,/<script>|data-form="cargoPrepare"|data-command="receiveCargoTransfer"/);assert.match(html,/&lt;script&gt;/);assert.match(html,/livraison complète/);assert.match(html,/MJ contrôle la réception/);
});
