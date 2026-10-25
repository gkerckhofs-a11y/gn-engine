import test from 'node:test';
import assert from 'node:assert/strict';
import {soSpaceportHtml,soNavigationHtml,soFlightConfirmHtml,passengerCodesInput} from '../web/space-outlaws-voyages.mjs';
import {playerRoute,terminalHtml} from '../web/player-spaces.mjs';
const profile={label:'Cargo',seats:6,cargoCapacity:20,hullMax:4,shieldMax:2};
const ship={shipId:'ship',name:'Vaisseau <script>',profile,hull:4,shield:2,fuel:4,tankCapacity:16,portId:'home',confirmation:'proof',operation:null,journey:null};
test('Vols SO UI : terminal et navigation privés, saisie du code et manifeste',()=>{
 const d={session:{id:'s',spaceOutlaws:{navigationVersion:1}}};assert.match(terminalHtml(d),/spaceport\/s/);assert.equal(playerRoute('flight','s','ship').space,'terminal');const html=soNavigationHtml({session:d.session,ship,canPilot:true,canAct:true,lots:[],confirmation:'proof'});assert.match(html,/name="navigationCode"/);assert.match(html,/name="passengerCodes"/);assert.match(html,/Deux minutes, 0 PA/);assert.doesNotMatch(html,/<script>/);
 assert.deepEqual(passengerCodesInput('public-id\nhttps://example.invalid/#/badge/s/other\n'),['public-id','other']);
});
test('Vols SO UI : aperçu avant réservation PA et confirmation physique',()=>{
 const html=soFlightConfirmHtml('depart',{shipName:'Nom',route:{fromPort:'a',toPort:'b',durationSeconds:300,fuelCost:2},remainingFuel:2,durationSeconds:180,manifest:[{name:'Pilote <script>'}],confirmation:'proof'},{sessionId:'s',shipId:'ship',navigationCode:'code',passengerCodes:[]});assert.match(html,/1 PA réservé puis consommé/);assert.match(html,/name="present" type="checkbox" required/);assert.match(html,/departShip/);assert.doesNotMatch(html,/<script>/);
});
test('Vols SO UI : fin de préparation, transit suspendu et lecture passager',()=>{
 const d={session:{id:'s'},ship:{...ship,operation:{kind:'PREPARE',remainingSeconds:0,manifest:[{name:'Pilote'}]}},canPilot:true,canAct:true,confirmation:'proof'};assert.match(soNavigationHtml(d),/finishSoPreparation/);assert.match(soNavigationHtml(d),/cancelSoNavigation/);const j={name:'Vol',fromPort:'a',toPort:'b',remainingSeconds:300,manifest:[{name:'Pilote'}],suspended:true,event:{label:'Patrouille',fuelDebt:0}};const html=soNavigationHtml({...d,ship:{...ship,journey:j},canPilot:false,canAct:false});assert.match(html,/Voyage suspendu/);assert.doesNotMatch(html,/arriveShip|departShip|refuelShip|cancelSoNavigation/);
});
test('Vols SO UI : attribution MJ explicite et aucune reprise sans carburant',()=>{
 const admin=soSpaceportHtml({session:{id:'s'},admin:true,models:[],ports:[],items:[],characters:[],ships:[{...ship,journey:{remainingSeconds:300,suspended:true,event:{label:'Panne',fuelDebt:1}}}]});assert.match(admin,/name="source"/);assert.match(admin,/name="pilotId"/);assert.match(admin,/sans carburant ni cargaison/);assert.match(admin,/Le dépannage n’est pas encore raccordé/);assert.doesNotMatch(admin,/continueSoVoyage|<script>/);
});
