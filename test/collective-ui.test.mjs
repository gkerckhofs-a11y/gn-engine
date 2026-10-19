import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollectiveUi} from '../web/collective-accounts.mjs';
import {createGroupsUi,escapeHtml} from '../web/groups.mjs';
import {createEconomyUi} from '../web/economy.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`,pill:escapeHtml,input:()=>'',textarea:()=>''};
const ui=createCollectiveUi(helpers),evil='<img src=x onerror="bad()">',currency={enabled:true,name:'Test',unit:'crédit'},a={id:'group-account',kind:'GROUP',name:evil,canRead:true,canSpend:false},d={session:{id:'s',stage:'EN_JEU'},character:{name:'Alias'},currency,account:a,canRead:true,canPay:false,balances:{balance:100,reserved:20,available:80},entries:[]};
test('caisses UI : consultation et paiement seuls présentent des sections différentes',()=>{
  const reader=ui.detail(d);assert.match(reader,/Solde total|Dernières opérations/);assert.doesNotMatch(reader,/accountPaymentForm|<img/);
  const spender=ui.detail({...d,account:{...a,canRead:false,canSpend:true},canRead:false,canPay:true,balances:undefined,entries:undefined});assert.match(spender,/accountPaymentForm/);assert.doesNotMatch(spender,/Solde total|Dernières opérations|100|<img/);assert.doesNotMatch(ui.detail({...d,preview:true}),/<button|<a /);
});
test('caisses UI : confirmation sans accès au solde et alias échappés',()=>{
  const input={source:{name:evil},recipient:{name:evil},amount:20,memo:evil,currency,confirmation:'proof'},html=ui.confirm(input,{fromAccountId:'group-account'});assert.match(html,/ne donne pas accès au solde/);assert.match(html,/payFromAccount/);assert.doesNotMatch(html,/undefined|NaN|Solde :|<img/);
  const form=ui.payment({...d,canRead:false},[a,{id:'own',kind:'CHARACTER',name:evil}]);assert.match(form,/name="toAccountId"/);assert.match(form,/value="own"/);assert.doesNotMatch(form,/value="group-account"|Disponible :|<img/);
});
test('caisses UI : ouverture de session sans dotation et nom de couverture expliqué',()=>{
  const g={id:'g',name:evil,walletConfig:{label:evil,amount:400}},c={id:'s',revision:1,economyRules:currency};const session=ui.configure(c,'session',g),scenario=ui.configure(c,'scenario',g);assert.match(session,/ouverte à zéro/);assert.match(session,/nom de couverture/);assert.doesNotMatch(session,/name="amount"|<img/);assert.match(scenario,/name="amount"/);assert.doesNotMatch(scenario,/<img/);
  const confirm=ui.configConfirm({group:g,currency,scenario:false,opening:true,after:g.walletConfig,confirmation:'proof'},{});assert.match(confirm,/Ouverture à zéro/);assert.match(confirm,/setGroupWallet/);assert.doesNotMatch(confirm,/<img/);
});
test('caisses UI : droits de groupe indépendants et portefeuilles MJ séparés des caisses',()=>{
  const groups=createGroupsUi(helpers),row=groups.memberRow({permissions:{readWallet:true,payWallet:false}},{id:'c',public:{displayName:'Alias'}},'SECRET');assert.match(row,/data-member-field="readWallet" checked/);assert.doesNotMatch(row,/data-member-field="payWallet" checked/);
  const c={id:'s',revision:1,economyRules:currency,characters:[],groups:[{id:'g',name:evil,walletConfig:{label:'Caisse',amount:0}}],accounts:[{ownerType:'GROUP',id:'group-account',groupId:'g',balance:100,reserved:0}]};assert.doesNotMatch(createEconomyUi(helpers).admin(c,'session'),/Ajouter \/ retirer|Personnage<\/h3>/);assert.match(ui.admin(c,'session'),/groupCreditAdjustment/);assert.doesNotMatch(ui.admin(c,'session'),/<img/);
});
