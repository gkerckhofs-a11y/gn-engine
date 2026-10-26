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
