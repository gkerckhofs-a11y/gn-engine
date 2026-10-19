import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransferUi} from '../web/transfers.mjs';
import {createInventoryUi} from '../web/inventory.mjs';
import {createHealthUi} from '../web/health.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`};
const ui=createTransferUi(helpers),evil='<img src=x onerror="bad()">';
const item={id:'item',name:evil,description:evil,unit:'dose',kind:'STACKABLE',category:'Médical',revision:1,consumable:true};
const transfer={id:'proposal',source:{id:'alice',name:evil},recipient:{id:'bob',name:evil},item,lotId:'lot',quantity:8,before:20,remaining:12,confirmation:'proof',status:'PENDING',direction:'IN',canAccept:true,canClose:true};
test('remise UI : quantité bornée, badge et récapitulatif avant proposition sans retrait immédiat',()=>{
  const form=ui.form('session',{id:'lot',item,quantity:20});assert.match(form,/name="badgeUrl" type="url" required/);assert.match(form,/name="quantity"[^>]*max="20"/);assert.match(form,/stock n’est pas réservé/);assert.doesNotMatch(form,/<img/);
  const confirm=ui.confirm(transfer,{sessionId:'session',quantity:8});assert.match(confirm,/20 → 12/);assert.match(confirm,/seulement après acceptation/);assert.match(confirm,/proposeLotTransfer/);assert.doesNotMatch(confirm,/<img/);
});
test('remise UI : acceptation avec consentement obligatoire, refus et annulation distincts',()=>{
  const received=ui.detail('session',transfer);assert.match(received,/name="received" required/);assert.match(received,/acceptLotTransfer/);assert.match(received,/declineLotTransfer/);assert.doesNotMatch(received,/cancelLotTransfer|<img/);
  const sent=ui.detail('session',{...transfer,direction:'OUT',canAccept:false});assert.match(sent,/cancelLotTransfer/);assert.doesNotMatch(sent,/acceptLotTransfer|declineLotTransfer/);
  const closed=ui.detail('session',{...transfer,status:'ACCEPTED',canAccept:false,canClose:false,receivedLotId:'received'});assert.doesNotMatch(closed,/<form/);assert.match(closed,/Lot reçu : received/);
});
test('sac UI : remises visibles sans actions en aperçu et sans exposer le stock de l’expéditeur',()=>{
  const inv=createInventoryUi(helpers),d={session:{id:'session',stage:'EN_JEU'},character:{id:'bob',name:'Joueur'},lots:[],transfers:[transfer],canTransfer:true};
  const html=inv.page(d);assert.match(html,/Mes remises/);assert.match(html,/transferDetail/);assert.doesNotMatch(html,/<img|remaining|20 →/);
  const preview=inv.page({...d,preview:true,canTransfer:false});assert.doesNotMatch(preview,/<button|<a /);
  const stale=ui.detail('session',{...transfer,status:'STALE',canAccept:false});assert.match(stale,/À refaire/);assert.doesNotMatch(stale,/acceptLotTransfer/);
});
test('santé UI : permission explicite pour les remises hors combat, désactivée par défaut',()=>{
  const health=createHealthUi(helpers),context={id:'s',revision:1};const html=health.rules(context,'scenario');assert.match(html,/name="transfer"/);assert.doesNotMatch(html,/name="transfer" checked/);
});
