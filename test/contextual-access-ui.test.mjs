import test from 'node:test';
import assert from 'node:assert/strict';
import {localTerminalHtml,localAccessAdminHtml} from '../web/contextual-access.mjs';
import {playerTargetPath,playerRoute} from '../web/player-spaces.mjs';
test('Terminal local : QR de même session, fallback ID et refus de lien externe',()=>{
 assert.equal(playerTargetPath('desk','local','https://game.invalid','s'),'local/s/desk');assert.equal(playerTargetPath('https://game.invalid/#/local/s/desk','local','https://game.invalid','s'),'local/s/desk');
 for(const url of ['https://evil.invalid/#/local/s/desk','https://game.invalid/#/local/other/desk','https://game.invalid/?secret=x#/local/s/desk'])assert.throws(()=>playerTargetPath(url,'local','https://game.invalid','s'));
 assert.equal(playerRoute('local','s','desk').space,'terminal');
});
test('Terminal local : confirmation de présence, durée explicite, HTML échappé',()=>{
 const d={terminal:{id:'desk',name:'<script>',durationSeconds:60},operations:[{action:'shop',resourceId:'counter',allowed:false}]},html=localTerminalHtml(d,'s');assert.match(html,/&lt;script&gt;/);assert.match(html,/name="present" required/);assert.doesNotMatch(html,/href="#\/shop/);assert.match(html,/data-qr/);
 const admin=localAccessAdminHtml({terminals:[],journal:[]});assert.match(admin,/name="durationSeconds" required/);assert.match(admin,/Révoquer sa présence/);
});
test('Terminal local QR : matrice réelle et lien public distinct du service professionnel verrouillé',()=>{
 const d={terminal:{id:'desk',name:'Comptoir',durationSeconds:60},remainingSeconds:0,operations:[{action:'commodityMarket',resourceId:'s',allowed:true},{action:'galacticMarkets',resourceId:'s',allowed:false,reason:'FORBIDDEN'}]},html=localTerminalHtml(d,'s');
 assert.match(html,/#\/public-prices\/s/);assert.doesNotMatch(html,/href="#\/galactic\/s/);assert.match(html,/Accès expiré ou absent/);assert.match(html,/Retour à mon terminal/);
});
