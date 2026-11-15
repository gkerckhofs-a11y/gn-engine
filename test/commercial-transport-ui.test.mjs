import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {commercialTransportFixture} from './support/commercial-transport-suite.mjs';
import {commercialTransportsHtml,commercialTransportHtml,freightConfirmation} from '../web/commercial-transport.mjs';
test('Fret : boutons selon le rôle, textes exacts et anciennes routes de contrat',async()=>{
 const f=await commercialTransportFixture(()=>new MemoryStore()),board=await f.read('commercialTransports',{},f.client);assert.match(commercialTransportsHtml(board),/data-form="freightRequest"/);assert.match(commercialTransportsHtml(board),/class="hrp"/);
 const a=await f.publish({conditions:'<script>fiction</script>'}),t=await f.offer(a),d=await f.read('commercialTransport',{announcementId:a.id},f.client),html=commercialTransportHtml(d);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/data-form="freightSelect"/);assert.match(html,/data-counter="true"/);
 const admin=await f.read('commercialTransportAdmin',{announcementId:a.id},f.owner);assert.doesNotMatch(commercialTransportHtml(admin),/data-form="freight/);
 const c=await f.select(a,t),client=commercialTransportHtml(await f.read('commercialTransport',{announcementId:a.id},f.client));assert.match(client,new RegExp('#/contract/'+f.sid+'/'+c.id));assert.doesNotMatch(client,/data-form="freightQuote"|data-form="freightClose"/);
});
test('Fret : récapitulatif chiffré, frais, minimum de carburant et requête stable',()=>{
 const p={sessionId:'s',announcementId:'a',revision:1,body:'<message>'},q={confirmation:'exact',quote:{amount:120,durationMinutes:45,expenses:'Frais <réels>'},path:[{name:'Liaison',durationSeconds:300,fuelCost:2,minimumDepartureFuel:3}]},html=freightConfirmation('quote',q,p,'stable');
 assert.match(html,/120 Cr/);assert.match(html,/45 minutes/);assert.match(html,/Minimum au départ : 3 unités/);assert.match(html,/Frais &lt;réels&gt;/);assert.match(html,/type="checkbox" required/);const encoded=html.match(/data-payload="([^"]+)"/)[1].replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');assert.deepEqual(JSON.parse(encoded),{...p,confirmation:'exact',requestId:'stable'});
});
