import test from 'node:test';
import assert from 'node:assert/strict';
import {soShipNameConfirmHtml,soPilotConfirmHtml,soSpaceportHtml,soNavigationHtml,soFlightConfirmHtml,passengerCodesInput} from '../web/space-outlaws-voyages.mjs';
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
 const admin=soSpaceportHtml({session:{id:'s'},admin:true,models:[],ports:[],items:[],characters:[],ships:[{...ship,journey:{remainingSeconds:300,suspended:true,event:{label:'Panne',fuelDebt:1}}}]});assert.match(admin,/name="source"/);assert.match(admin,/name="pilotId"/);assert.match(admin,/sans carburant ni cargaison/);assert.match(admin,/Ouvrez Dépannage PNJ/);assert.doesNotMatch(admin,/continueSoVoyage|<script>/);
});

test('Vols SO UI : relève MJ avec aperçu, attestation et états bloqués',()=>{
 const d={session:{id:'s'},admin:true,models:[],ports:[],items:[],characters:[{id:'old',name:'Ancien'},{id:'new',name:'Nouveau <script>'}],ships:[{...ship,docked:true,enabled:true,pilotId:'old'}]};
 assert.match(soSpaceportHtml(d),/soPilotPrepare/);assert.match(soSpaceportHtml(d),/Pilote mandaté : Ancien/);assert.doesNotMatch(soSpaceportHtml({...d,admin:false}),/soPilotPrepare/);assert.doesNotMatch(soSpaceportHtml({...d,ships:[{...d.ships[0],convoy:{id:'busy'}}]}),/soPilotPrepare/);
 const html=soPilotConfirmHtml({shipName:'<script>',portId:'home',previousPilotName:'Ancien',pilotName:'Nouveau',reason:'Accord',confirmation:'proof'},{sessionId:'s',shipId:'ship',pilotId:'new',reason:'Accord'});assert.match(html,/changeSoPilot/);assert.match(html,/name="present" type="checkbox" required/);assert.match(html,/propre plan de vol/);assert.doesNotMatch(html,/<script>/);
});

test('Vols SO UI : nom d’usage réservé au propriétaire et identité permanente lisible',()=>{
 const d={session:{id:'s'},ship:{...ship,identity:{transponder:'permanent_<script>',previousNames:['Ancien <img>']}},canPilot:false,canAct:false,canRename:true,lots:[],confirmation:'proof'},h=soNavigationHtml(d);assert.match(h,/soShipNamePrepare/);assert.match(h,/name="name" maxlength="150" required/);assert.match(h,/Anciens noms/);assert.match(h,/permanent_&lt;script&gt;/);assert.match(h,/Ancien &lt;img&gt;/);assert.doesNotMatch(h,/<script>|<img>/);const port=soSpaceportHtml({session:{id:'s'},admin:false,ships:[d.ship]});assert.match(port,/permanent_&lt;script&gt;/);assert.match(port,/anciens noms/);assert.doesNotMatch(port,/<script>|<img>/);assert.doesNotMatch(soNavigationHtml({...d,canRename:false}),/soShipNamePrepare/);assert.doesNotMatch(soNavigationHtml({...d,ship}),/soShipNamePrepare|Anciens noms/);
});
test('Vols SO UI : confirmation de nom sans changement de propriété ou de papiers',()=>{
 const h=soShipNameConfirmHtml({previousName:'Ancien <script>',name:'Nouveau <img>',transponder:'permanent',portId:'home',confirmation:'proof'},{sessionId:'s',shipId:'ship',name:'Nouveau <img>'});assert.match(h,/renameSoShip/);assert.match(h,/name="present" type="checkbox" required/);assert.match(h,/anciens noms sont conservés/);assert.match(h,/ne falsifie aucun document/);assert.doesNotMatch(h,/<script>|<img>|name="ownerId"|name="transponder"/);
});

test('Vols SO UI : modules montés affichés, plein disponible et départ équipé fermé',()=>{
 const h=soNavigationHtml({session:{id:'s'},ship:{...ship,moduleFlightBlocked:true,modules:[{code:'<script>MOD-01',size:2,status:'OPERATIONAL'}]},canAct:true,canPilot:true,lots:[]});assert.match(h,/Modules montés à quai/);assert.match(h,/Ce vaisseau doit rester à quai/);assert.match(h,/Faire le plein/);assert.doesNotMatch(h,/data-kind="depart"|<script>/);
});
