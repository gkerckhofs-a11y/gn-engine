import test from 'node:test';
import assert from 'node:assert/strict';
import {detourHtml,detourConfirmHtml} from '../web/space-detours.mjs';
const d={session:{id:'s'},ship:{shipId:'ship',journey:{}},canAct:true,detour:{level:2,canAttempt:true}};
test('PIL-01 UI : aperçu privé du meneur, indisponibilité et quota utilisé',()=>{
 const h=detourHtml(d);assert.match(h,/soDetourPrepare/);assert.match(h,/name="navigationCode"/);assert.match(h,/un essai par trajet, 1 PA/);assert.equal(detourHtml({...d,canAct:false}),'');assert.equal(detourHtml({...d,detour:null}),'');assert.equal(detourHtml({...d,detour:{...d.detour,canAttempt:false}}),'');const used=detourHtml({...d,ship:{...d.ship,journey:{detour:{roll:4,level:2,total:6,success:false,surcharge:2,extraFuel:0}}}});assert.match(used,/échec, liaison initiale conservée/);assert.doesNotMatch(used,/soDetourPrepare/);
});
test('PIL-01 UI : conséquences, coût par appareil, confirmation et absence de bouton sans ressources',()=>{
 const view={route:{name:'Route <script>',fromPort:'home',toPort:'away'},remainingSeconds:120,convoy:true,ships:[{name:'Cargo',surcharge:2,extraFuel:2,canPay:true},{name:'Escorte',surcharge:1,extraFuel:1,canPay:true}],canPay:true,hasActionPoint:true,confirmation:'proof'},html=detourConfirmHtml(view,{sessionId:'s',shipId:'ship',navigationCode:'code'});assert.match(html,/attemptSoDetour/);assert.match(html,/type="checkbox" required/);assert.match(html,/seulement sur réussite/);assert.match(html,/Le port de livraison contractuel ne change pas/);assert.doesNotMatch(html,/<script>|name="roll"|name="level"/);const poor=detourConfirmHtml({...view,canPay:false},{});assert.match(poor,/séparation du convoi/);assert.doesNotMatch(poor,/attemptSoDetour/);assert.doesNotMatch(detourConfirmHtml({...view,hasActionPoint:false},{}),/attemptSoDetour/);
});
