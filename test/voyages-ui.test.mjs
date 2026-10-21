import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoyageUi} from '../web/voyages.mjs';
import {createCargoUi} from '../web/cargo.mjs';
const button=(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link=(label,path)=>`<a href="#/${path}">${label}</a>`;
const ui=createVoyageUi({button}),base={session:{id:'session',stage:'EN_JEU'},ship:{shipId:'ship',name:'<img src=x>',configured:true,local:true,docked:true,enabled:true,portId:'local',fuel:5,tankCapacity:10,journey:null},canPilot:true,canAct:true,confirmation:'consent',fuelName:'Carburant',fuelUnit:'unité',lots:[],routes:[{id:'route',name:'<script>danger</script>',toPort:'remote',durationSeconds:60,fuelCost:3,affordable:true}]};
test('Navigation UI : droits et étapes, arrivée seulement à échéance et échappement',()=>{
 let html=ui.panel(base);assert.ok(html.includes('data-kind="refuel"'));assert.ok(html.includes('data-kind="depart"'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 html=ui.panel({...base,canPilot:false});assert.ok(!html.includes('data-form='));
 html=ui.panel({...base,ship:{...base.ship,local:false}});assert.ok(!html.includes('data-kind="refuel"'));assert.ok(html.includes('data-kind="depart"'));
 const travel={...base,ship:{...base.ship,journey:{name:'Route',fromPort:'local',toPort:'remote',remainingSeconds:0}},canArrive:false};assert.ok(!ui.panel(travel).includes('data-command="arriveShip"'));assert.ok(ui.panel({...travel,canArrive:true}).includes('data-command="arriveShip"'));
});
test('Navigation UI : coût confirmé, don de carburant explicite et configuration sans barème',()=>{
 const fuel=ui.confirm('refuel',{shipName:'Bande',quantity:3,before:0,after:3,capacity:10,fuelUnit:'unité',fuelName:'Carburant',fromPersonalBag:true,confirmation:'ok'},{shipId:'s'});assert.ok(fuel.includes('quitte votre sac'));assert.ok(fuel.includes('refuelShip'));
 const editor=ui.editor({session:{id:'s',revision:1}});assert.ok(editor.includes('name="fuelCost"'));assert.ok(editor.includes('name="durationSeconds"'));assert.ok(!editor.includes('value="300"'));
 const form=ui.shipFields({items:[]},{});assert.ok(form.includes('ne réinitialisent ni le carburant'));assert.ok(form.includes('name="initialFuel"'));
});
test('Navigation UI : parcours soute et arbitrage de l’organisation intégrés',()=>{
 const cargo=createCargoUi({button,link}),html=cargo.hold({session:base.session,hold:{location:{id:'ship'},name:'Cargo',used:0,capacity:20,incoming:0,local:true,docked:true,enabled:true},stock:[],canRead:false,navigation:base});assert.ok(html.includes('Faire le plein'));assert.ok(html.includes('Navigation'));
 const admin=cargo.admin({session:{id:'s',revision:1},ships:[],transfers:[],owners:[],routes:[],items:[]});assert.ok(admin.includes('transportRules'));assert.ok(admin.includes('routeEditor'));
 const resolve=ui.resolve('s',{id:'ship',revision:1,journey:{name:'Route',fromPort:'a',toPort:'b'}});assert.ok(resolve.includes('name="reason"'));assert.ok(resolve.includes('reste dépensé'));
});
