import test from 'node:test';
import assert from 'node:assert/strict';
import {createInventoryUi,lotMatches} from '../web/inventory.mjs';
import {createHealthUi} from '../web/health.mjs';
import {createAbilityUi} from '../web/abilities.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`,input:()=>'',textarea:()=>'',pill:x=>x};
const ui=createInventoryUi(helpers),evil='<img src=x onerror="bad()">';
const item={id:'medical',name:evil,description:evil,category:'Médical',unit:'dose',consumable:true,kind:'STACKABLE',legality:'UNSPECIFIED',unitVolume:1,revision:1,publicationState:'PUBLISHED',gmNotes:'SECRET_MJ'};
const lot={id:'lot-a',item,quantity:2,status:'AVAILABLE',revision:1};
const context={id:'scenario',revision:1,items:[item],characters:[{id:'character',public:{displayName:evil}}]};
test('sac UI : recherche et filtres combinés, lots épuisés conservés mais masqués par défaut',()=>{
  assert.equal(lotMatches(lot,' BAD','AVAILABLE','Médical'),true);assert.equal(lotMatches(lot,'','AVAILABLE','Autre'),false);assert.equal(lotMatches({...lot,status:'CONSUMED'}),false);assert.equal(lotMatches({...lot,status:'CONSUMED'},'','ALL'),true);
  const d={session:{id:'session'},character:{id:'character',name:evil},healthEnabled:false,lots:[lot,{...lot,id:'used',quantity:0,status:'CONSUMED'}]},html=ui.page(d);
  assert.doesNotMatch(html,/<img|SECRET_MJ|PV et soins/);assert.match(html,/data-inventory-lot="used"[^>]*hidden/);assert.match(html,/data-inventory-value=/);assert.doesNotMatch(ui.page({...d,preview:true}),/<button|<a /);
});
test('matériel UI : duplication brouillon, comparaison du matériel et don explicitement confirmé',()=>{
  const copy=ui.editor(context,'scenario',item,true);assert.match(copy,/data-id=""/);assert.match(copy,/<option value="DRAFT" selected>/);assert.doesNotMatch(copy,/<img/);
  const seed=ui.seedConfirm({characterName:evil,before:null,after:{items:[{item,quantity:2}]},confirmation:'proof'},{reason:evil});assert.match(seed,/Aucun objet prévu/);assert.match(seed,/2 dose/);assert.match(seed,/data-command="setStartingInventory"/);assert.doesNotMatch(seed,/<img/);
  const grant=ui.grantConfirm({characterName:evil,item,quantity:3,confirmation:'proof'},{reason:evil});assert.match(grant,/3 dose/);assert.match(grant,/data-command="grantItem"/);assert.doesNotMatch(grant,/<img/);
});
test('soins UI : modèle et lot exigés, manque de stock visible et confirmation de la consommation',()=>{
  const healthUi=createHealthUi(helpers),cost={itemId:item.id,name:evil,unit:'dose',quantity:2,itemRevision:1},skill={id:'skill',name:'Soin',kind:'ACTIVE_SELF',description:'',instructions:'',healing:{amount:3,uses:null,cooldownSeconds:0,consumable:cost},remaining:null,waitMs:0,lots:[lot]};
  const h={hp:4,maxHp:10,outOfCombat:false,returnMode:'MJ',allowed:{heal:false}},d={session:{id:'session',stage:'EN_JEU'},character:{id:'character',name:'Joueur'},health:h,skills:[skill],events:[]};
  assert.match(healthUi.page({...d,skills:[{...skill,lots:[{...lot,quantity:1}]}]}),/data-action="treatmentForm"[^>]*disabled/);
  const form=healthUi.treatmentForm('session',skill,'character');assert.match(form,/name="lotId" required/);assert.match(form,/data-target="character"/);assert.doesNotMatch(form,/name="badgeUrl"|<img/);
  const confirmed=healthUi.confirm('applyTreatment',{before:h,after:{...h,hp:7},skill,target:{name:'Joueur'},restored:3,remainingAfter:null,cooldownSeconds:0,consumable:{...cost,lotId:lot.id,before:2,remaining:0},confirmation:'proof'},{lotId:lot.id});assert.match(confirmed,/Quantité du lot : 2 → 0/);assert.match(confirmed,/2 dose/);assert.doesNotMatch(confirmed,/<img/);
});
test('catalogue et correction UI : coût facultatif, motif MJ et aucune réouverture d’un lot consommé',()=>{
  const abilities=createAbilityUi(helpers),html=abilities.editor(context,'scenario','skills',{kind:'ACTIVE_TARGET',healing:{amount:3,uses:null,cooldownSeconds:0,consumable:{itemId:item.id,quantity:2}}});
  assert.match(html,/Aucun objet consommé/);assert.match(html,/value="medical" selected/);assert.match(html,/name="healItemQuantity"[^>]*value="2"/);assert.doesNotMatch(html,/<img/);
  const correction=ui.correction(context,lot);assert.match(correction,/name="reason"[^>]*required/);assert.match(correction,/créez un nouveau lot/);
  const admin=ui.admin({...context,inventory:[{...lot,status:'CONSUMED',quantity:0}]},'session');assert.doesNotMatch(admin,/data-action="correctLotForm"/);
});
