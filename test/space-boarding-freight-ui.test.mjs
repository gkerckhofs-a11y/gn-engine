import test from 'node:test';
import assert from 'node:assert/strict';
import {boardingHtml,boardingCargoConfirmHtml} from '../web/space-boarding.mjs';
import {boardingCustodyHtml} from '../web/boarding-custody.mjs';
import {boardingFreightFixture} from './support/space-boarding-freight-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('UI fret sous contrat abordé : propriétaire et transporteur distincts, retour à sa soute sans salaire automatique',async()=>{
 const f=await boardingFreightFixture(()=>new MemoryStore()),q=await f.prepare(),preview=boardingCargoConfirmHtml('prepareBoardingCargoTransfer',q,f.input);assert.match(preview,/soute de son transporteur d’origine/);const t=await f.take(),d=await f.read('cargoAdmin',{},f.owner),h=boardingCustodyHtml(d.boardingCustody);assert.match(h,/Transporteur d’origine/);assert.match(h,/aucun salaire validé par la prise/);assert.doesNotMatch(h,/OWNER_ACCESS_CHANGED|Propriétaire décédé|data-form=|data-command=/);const crew=boardingHtml(await f.board(f.other));assert.doesNotMatch(crew,/SECRET_|transportContractId|sourceAccountId|boardingCargoCommand/);await f.arrive();const restore=await f.prepare({direction:'RETURN',lotId:t.lotId});assert.equal(restore.destinationName,(await f.ship()).name);
});
test('UI fret sous contrat abordé : nom du transporteur échappé et alerte dédiée sans succession',()=>{
 const d={sessionId:'s',totalVolume:1,loading:0,lots:[{lotId:'l',name:'Caisse',quantity:1,unit:'unité',volume:1,owner:{name:'Comptoir'},holder:{name:'Gardien'},carrier:{name:'<script>faux</script>'},ship:{name:'Cargo'},port:{name:'Port'},combatId:'c',boardingId:'b',loading:null,alerts:['CARRIER_ACCESS_CHANGED','CARRIER_DEAD']}]},h=boardingCustodyHtml(d);assert.doesNotMatch(h,/<script>|data-form=|data-command=/);assert.match(h,/&lt;script&gt;/);assert.match(h,/Transporteur décédé/);assert.match(h,/Accès du transporteur d’origine indisponible/);
});
