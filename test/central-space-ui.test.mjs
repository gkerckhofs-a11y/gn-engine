import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralUi} from '../web/central-master.mjs';
import {centralSpacePayload} from '../web/central-space.mjs';
import {centralWorkshops} from '../src/shared/central-workshops.mjs';
import {centralSpaceInput} from '../src/core/central-space.mjs';
import {centralTestShipModel,centralTestPort,centralTestRoute} from './support/central-space-suite.mjs';
const ui=createCentralUi({button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const changes=Object.entries({shipModel:centralTestShipModel,port:centralTestPort,route:centralTestRoute}).map(([type,v])=>({type,entityId:type,operation:'UPSERT',data:centralSpaceInput(type,{...v,name:'<b>Nom</b>',description:'<img src=x>',gmNotes:'<script>Notes'},type)}));
const d={campaign:{id:'campaign',title:'Préparation'},draft:{revision:3},rights:{readWorkshops:['M3'],editWorkshops:[],manageStaff:false},workshop:'M3',workshops:centralWorkshops.map(w=>({...w,canRead:w.id==='M3',canEdit:false})),changes,history:[],staff:[],references:{ports:[{id:'origin',name:'<b>Port</b>',archived:true,revision:2,source:'WEB'}]},diagnostics:[{entityType:'route',entityId:'route',field:'fromPort',reference:'<script>',message:'Port absent'}]};
test('M3 central UI : lecture échappée sans édition ni import implicites',()=>{
 const h=ui.page(d);assert.match(h,/Modèles de vaisseaux/);assert.match(h,/&lt;b&gt;Nom/);assert.match(h,/&lt;img src=x&gt;/);assert.match(h,/&lt;script&gt;/);assert.doesNotMatch(h,/<b>|<img|<script>|data-action="central(?:Space|Import)/);assert.match(h,/SECRET-CODE-PORT/);assert.match(h,/import\/export Excel M3 réunit modèles, ports et routes/);assert.match(ui.staffForm(d),/name="edit_M3"/);
});
test('M3 central UI : formulaires des trois types, révisions et valeurs fixes',()=>{
 for(const c of changes){const h=ui.spaceForm(d,c.type,c.entityId,c);assert.match(h,/data-draft="3"/);assert.match(h,/data-revision="1"/);assert.match(h,/name="name"[^>]+value="&lt;b&gt;Nom/);assert.match(h,/name="reason"[^>]+required/);assert.doesNotMatch(h,/name="(fuel|fuelCost|durationSeconds|referencePrice|hullMax|enabled|ownerId|publicationState)"/);}
 const model=ui.spaceForm(d,'shipModel','new');assert.match(model,/value="FIGHTER"/);assert.match(model,/value="CARGO"/);assert.match(model,/value="TRANSPORT"/);assert.match(model,/<td>0<\/td>/);assert.match(model,/places comprenant le pilote/);assert.doesNotMatch(model,/ selected/);
 const route=ui.spaceForm(d,'route','new');assert.match(route,/value="SHORT"/);assert.match(route,/value="HOSTILE"/);assert.match(route,/>15 min</);assert.match(route,/Aucun tirage ni débit/);assert.doesNotMatch(route,/ selected/);
});
test('M3 central UI : suggestions de ports avec provenance et archives',()=>{
 const h=ui.spaceForm(d,'route','route',changes[2]);assert.match(h,/list="central-space-ports"/);assert.match(h,/option value="origin">&lt;b&gt;Port/);assert.match(h,/archivé · r2 · WEB/);assert.match(h,/name="fromPort" value="origin"/);assert.match(h,/name="distanceId"/);assert.match(h,/value="SHORT" selected/);assert.match(ui.spaceForm(d,'port','new'),/name="locationTargetId" value=""/);
});
test('M3 central UI : charges utiles distinctes sans champs privilégiés',()=>{
 const v={...centralTestRoute,profileId:'CARGO',locationTargetId:' place ',fromPort:' a ',toPort:' b ',referencePrice:1,fuel:10,durationSeconds:1,publicationState:'PUBLISHED'};
 assert.deepEqual(Object.keys(centralSpacePayload('shipModel',v)).sort(),['description','gmNotes','name','profileId']);assert.deepEqual(Object.keys(centralSpacePayload('port',v)).sort(),['description','gmNotes','locationTargetId','name','navigationCode']);const route=centralSpacePayload('route',v);assert.equal(route.fromPort,'a');assert.equal(route.toPort,'b');assert.equal(route.profileId,undefined);assert.equal(route.durationSeconds,undefined);assert.equal(route.fuel,undefined);assert.equal(centralSpacePayload('port',{...v,locationTargetId:' '}).locationTargetId,null);assert.throws(()=>centralSpacePayload('unknown',v));
});
test('M3 central UI : archives et restauration gardent le type et les identifiants',()=>{
 const edit={...d,rights:{...d.rights,editWorkshops:['M3']}};assert.match(ui.page(edit),/data-action="centralSpaceArchive" data-type="port" data-id="port"/);const c={...changes[1],operation:'ARCHIVE'},h=ui.page({...edit,changes:[c]});assert.match(h,/Restaurer \/ modifier/);assert.doesNotMatch(h,/data-action="centralSpaceArchive"/);const form=ui.spaceArchiveForm(d,c);assert.match(form,/data-form="centralSpaceArchive" data-type="port"/);assert.match(form,/data-id="port"/);assert.match(form,/références entrantes seront signalées/);assert.match(form,/&lt;b&gt;Nom/);
});
