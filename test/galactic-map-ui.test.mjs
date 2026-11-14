import test from 'node:test';
import assert from 'node:assert/strict';
import {mapStorageKey,saveMapCodes,loadMapCodes,mapHref,galacticMapHtml,mapPositions} from '../web/galactic-map.mjs';
const fixture=()=>({session:{id:'s'},admin:false,canNavigate:true,ships:[{id:'ship',name:'Cargo',profile:'Cargo léger',fuel:4,tankCapacity:16}],shipId:'ship',origin:'home',destinationId:'away',ports:[{id:'home',name:'Breach Port',current:true},{id:'away',name:'Relais <privé>'}],routes:[{id:'out',name:'Liaison',fromPort:'home',toPort:'away',distance:'Courte',durationSeconds:300,fuelCost:2,available:true,risk:null}],itineraries:[{modes:['TIME','FUEL'],legs:['out'],durationSeconds:300,fuelCost:2,refuels:[],remainingFuelWithoutExtraStock:2}],unavailableCodes:[],canOpenFlight:true,canAnalyze:true});
test('Carte : codes conservés par compte, session et personnage, jamais dans les URL',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},key=mapStorageKey('uid','s','pilot');
 saveMapCodes(storage,key,[' CODE ','CODE','AUTRE']);assert.deepEqual(loadMapCodes(storage,key),['CODE','AUTRE']);for(const k of [mapStorageKey('other','s','pilot'),mapStorageKey('uid','else','pilot'),mapStorageKey('uid','s','medic')])assert.deepEqual(loadMapCodes(storage,k),[]);
 storage.setItem(key,'invalid');assert.deepEqual(loadMapCodes(storage,key),[]);storage.setItem(key,'[null,12,"ok"]');assert.deepEqual(loadMapCodes(storage,key),['ok']);assert.equal(mapHref('s','ship','away'),'#/galactic-map/s?ship=ship&destination=away');
});
test('Carte : liens clavier, alternative textuelle, HRP et échappement',()=>{
 const d=fixture(),html=galacticMapHtml(d,['<script>']);assert.match(html,/role="group" aria-label="Carte/);assert.match(html,/Destinations et liaisons en texte/);assert.match(html,/class="map-system selected" href="#\/galactic-map\/s\?ship=ship&amp;destination=away"/);assert.match(html,/class="hrp"/);assert.match(html,/data-action="mapFlight"/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|Relais <privé>|navigationCode=/);assert.match(html,/Dangers non analysés/);assert.match(html,/map-link-planned/);assert.match(html,/<th>Distance<\/th>/);assert.match(html,/Courte/);assert.equal(mapPositions(d.ports,'home').get('home').x,500);
 d.canOpenFlight=false;assert.doesNotMatch(galacticMapHtml(d),/data-action="mapFlight"/);d.admin=true;assert.match(galacticMapHtml(d),/#\/session\/s/);assert.doesNotMatch(galacticMapHtml(d),/data-form="mapCode"/);
});
