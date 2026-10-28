import test from 'node:test';
import assert from 'node:assert/strict';
import {spaceCombatsHtml,spaceRescuesHtml,spaceConfirmHtml,spaceFormInput} from '../web/space-encounters.mjs';
import {playerRoute,terminalHtml} from '../web/player-spaces.mjs';
const encounter={id:'c',status:'ROUND',round:1,quietRounds:0,ships:[{id:'s',name:'Moi <script>',hull:4,shield:2,fuel:4,maneuverability:1,pil03Used:false},{id:'b',name:'Adversaire',hull:4,shield:2}],ownShipId:'s',canOrder:true,skillLevel:2,surrenderOffers:[],remainingSeconds:90,confirmation:'proof'};
test('Rencontres UI : routes Terminal, ordre privé, repli et consentements explicites',()=>{
 for(const path of ['space-combats','space-combat','space-rescues'])assert.equal(playerRoute(path,'sid','id').space,'terminal');assert.match(terminalHtml({session:{id:'sid',spaceOutlaws:{combatVersion:1}}}),/space-rescues/);
 const html=spaceCombatsHtml({session:{id:'sid'},combat:encounter});assert.match(html,/spaceOrder/);assert.match(html,/name="fallback"/);assert.match(html,/name="acceptSurrender"/);assert.match(html,/PIL03_2/);assert.doesNotMatch(html,/PIL03_5|<script>|resolveSpaceRound/);
});
test('Rencontres UI : fin du délai, lecture équipage et lancement MJ distincts',()=>{
 const html=spaceCombatsHtml({session:{id:'sid'},combat:{...encounter,remainingSeconds:0}});assert.match(html,/resolveSpaceRound/);assert.doesNotMatch(html,/spaceOrder/);assert.doesNotMatch(spaceCombatsHtml({session:{id:'sid'},combat:{...encounter,canOrder:false}}),/spaceOrder|resolveSpaceRound/);
 const admin=spaceCombatsHtml({session:{id:'sid'},admin:true,ships:[],combats:[{...encounter,status:'ENCOUNTER'}]});assert.match(admin,/name="briefed" type="checkbox" required/);assert.match(admin,/prepareSpaceInterception/);
});
test('Dépannage UI : prix, fonds réservés, présence et réception obligatoires',()=>{
 const html=spaceConfirmHtml('prepareSpaceRescue',{intervention:100,fuelPrice:25,quantity:2,amount:150,before:{available:200},after:{available:50},confirmation:'p'},{sessionId:'s',rescueId:'r'});assert.match(html,/100 Cr \+ 2 × 25 Cr = 150 Cr/);assert.match(html,/name="present" type="checkbox" required/);const ready=spaceRescuesHtml({session:{id:'s'},rescues:[{id:'r',status:'ACTIVE',shipName:'<script>',provider:'PNJ',quantity:2,amount:150,remainingSeconds:0}]});assert.match(ready,/name="received" type="checkbox" required/);assert.doesNotMatch(ready,/<script>/);
});
test('Rencontres UI : payload conserve accord, ne fabrique ni dé ni résultat',()=>{
 const form={dataset:{form:'spaceOrder',payload:JSON.stringify({sessionId:'s',combatId:'c',shipId:'ship',confirmation:'p'})},elements:{namedItem:n=>['acceptSurrender','ceasefire'].includes(n)?{checked:n==='acceptSurrender'}:null}};const p=spaceFormInput(form,{kind:'SURRENDER',fallback:'FLEE',die:'6'});assert.deepEqual(p.order,{kind:'SURRENDER',fallback:'FLEE',acceptSurrender:true,ceasefire:false});assert.equal(p.die,undefined);
});
