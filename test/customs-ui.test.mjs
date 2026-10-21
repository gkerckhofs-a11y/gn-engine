import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomsUi,cargoFeeBreakdown} from '../web/customs.mjs';
import {createCargoUi} from '../web/cargo.mjs';
const helpers={button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`},ui=createCustomsUi(helpers),cargo=createCargoUi(helpers),evil='<img src=x onerror="bad()">';
const fees={direction:'LOAD',total:12,currency:{unit:evil},lines:[{kind:'CUSTOMS',title:evil,description:evil,flatAmount:2,unitAmount:5,quantity:2,amount:12,beneficiary:{name:evil}}]};
const d={session:{id:'s'},transfer:{id:'t',lotId:'l',name:evil,quantity:2,status:'LOADING',sourceName:evil,destinationName:evil,clearance:fees},canReceive:true,canCancel:true,confirmation:'read-proof'};
test('Douanes UI : prix et bénéficiaires échappés, choix du payeur avant réception payante',()=>{
 const html=cargo.transfer(d,[{id:'pay',name:evil,kind:'GROUP',canSpend:true},{id:'read-only',name:'Lecture seule',canSpend:false}]);assert.match(html,/data-form="cargoReceiptPrepare"/);assert.match(html,/value="pay"/);assert.doesNotMatch(html,/read-only|name="received"|data-command="receiveCargoTransfer"|<img|onerror="bad/);assert.match(html,/data-command="cancelCargoTransfer"/);assert.match(html,/12/);
 assert.match(cargoFeeBreakdown({...fees,total:0,lines:[]}),/Aucun tarif applicable/);
 assert.doesNotMatch(cargo.transfer({...d,canReceive:false}),/data-form="cargoReceiptPrepare"/);
});
test('Douanes UI : confirmation monétaire, réception requise et absence de solde pour une caisse restreinte',()=>{
 const p={sessionId:'s',transferId:'t',fromAccountId:'pay'},result={...d,fees,payer:{name:evil},confirmation:'payment-proof'};
 const html=ui.receiptConfirm(result,p);assert.match(html,/payment-proof/);assert.match(html,/name="received" type="checkbox" required/);assert.match(html,/Payer 12/);assert.match(html,/solde de cette caisse n’est pas consultable/);assert.doesNotMatch(html,/Solde disponible|<img|onerror="bad/);
 assert.match(ui.receiptConfirm({...result,before:{available:100},after:{available:88}},p),/100 → 88/);
 assert.match(cargo.transfer({...d,canReceive:false,canCancel:false,transfer:{...d.transfer,status:'RECEIVED',feeReceipt:{id:evil,total:12,currency:fees.currency,payer:{name:evil}}}}),/Frais réglés : 12/);
});
test('Douanes UI : configuration sans montant implicite ni activation, aperçu avant sauvegarde',()=>{
 const admin={session:{id:'s',revision:1},items:[{id:'i',name:evil,publicationState:'PUBLISHED'}],recipients:[{accountId:'a',kind:'GROUP',name:evil}],tariffs:[],history:[],currency:{unit:evil},economyEnabled:true};
 const html=ui.editor(admin);assert.match(html,/data-form="cargoTariffPrepare"/);assert.match(html,/name="flatAmount"[^>]*value=""/);assert.doesNotMatch(html,/name="enabled"[^>]*checked|<img|onerror="bad/);
 assert.match(ui.admin(admin),/Aucun tarif configuré/);
 const result={before:null,after:{id:'r',title:evil,description:evil,kind:'CORRUPTION',direction:'LOAD',flatAmount:2,unitAmount:5,recipientAccountId:'a',enabled:true},reason:evil,confirmation:'save-proof'};
 const confirm=ui.confirm(result,{sessionId:'s'},admin);assert.match(confirm,/data-form="cargoTariffSave"/);assert.match(confirm,/Avant/);assert.match(confirm,/Après/);assert.doesNotMatch(confirm,/<img|onerror="bad/);
});
