import {soInventoryHtml} from '../web/shops.mjs';
import {createInventoryUi} from '../web/inventory.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {dockTheftForm,dockTheftsHtml} from '../web/dock-theft.mjs';
test('Vol de stockage : destination obligatoire et absence de sac dans le choix',()=>{
 const d={theftEnabled:true,warehouse:{id:'w'},destinations:[],revealed:[]};assert.doesNotMatch(dockTheftForm(d),/data-theft="prepare"/);const html=dockTheftForm({...d,destinations:[{name:'<cellule>',location:{kind:'WAREHOUSE',id:'dest'}}],revealed:[{id:'lot',name:'<secret>',quantity:3}]});assert.match(html,/WAREHOUSE:dest/);assert.match(html,/data-qr/);assert.match(html,/5 unités de volume/);assert.doesNotMatch(html,/<secret>|CHARACTER/);assert.match(html,/&lt;cellule&gt;/);
});
test('Vol de stockage : attestation physique uniquement dans la régie MJ',()=>{
 const d={session:{id:'s',stage:'EN_JEU'},thefts:[{id:'t',status:'HANDOVER',remainingMs:0,warehouseName:'Source',destinationName:'Destination',name:'Caisses',quantity:3,volume:3,physical:true}]};assert.doesNotMatch(dockTheftsHtml(d),/data-theft="handover"/);assert.match(dockTheftsHtml({...d,admin:true}),/data-theft="handover"/);assert.match(dockTheftsHtml({...d,admin:true}),/handedOver/);assert.doesNotMatch(dockTheftsHtml({...d,admin:true}),/Faire réussir|Décider du résultat/);
});

test('Garde des docks : le véritable sac Space Outlaws et le sac générique montrent la garde sans vente ni transfert',()=>{
 const d={session:{id:'s',spaceOutlaws:{dockStorageVersion:1}},character:{name:'Bela'},lots:[],storageCustody:[{id:'lot',item:{name:'Caisses <script>',unit:'lot'},quantity:3,owner:false,holder:true,theftId:'operation'}]},generic=createInventoryUi({button:()=>'',link:()=>''});
 for(const html of [soInventoryHtml(d,null),generic.page(d)]){assert.match(html,/Marchandises en garde distincte/);assert.match(html,/Caisses &lt;script&gt; · 3 lot/);assert.match(html,/#\/dock-theft\/s\/operation/);assert.doesNotMatch(html,/<script>|data-action="(?:saleForm|transferForm)"/);}
 assert.doesNotMatch(soInventoryHtml({...d,storageCustody:[]},null),/Marchandises en garde distincte/);
});
test('Garde des docks : victime et aperçu ne révèlent ni destination, ni détenteur, ni lien d’opération',()=>{
 const d={session:{id:'s'},character:{name:'Victime'},lots:[],storageCustody:[{item:{name:'Eau',unit:'lot'},quantity:3,owner:true,holder:false,theftId:'SECRET_OPERATION',location:{id:'SECRET_LOCATION'},holderId:'SECRET_HOLDER'}]},generic=createInventoryUi({button:()=>'',link:()=>''});
 for(const html of [soInventoryHtml(d,null),generic.page(d)]){assert.match(html,/Votre propriété légale est conservée/);assert.match(html,/ne sont pas communiquées/);assert.doesNotMatch(html,/SECRET_|#\/dock-theft/);}
 const preview={...d,preview:true,storageCustody:[{...d.storageCustody[0],holder:true}]};assert.doesNotMatch(soInventoryHtml(preview,null),/#\/dock-theft/);assert.doesNotMatch(generic.page(preview),/#\/dock-theft/);
});
