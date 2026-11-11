import test from 'node:test';
import assert from 'node:assert/strict';
import {soEscapeHtml,soEscapeAdminHtml} from '../web/space-escape.mjs';
test('ROG-03 : interface sans divulgation et champs échappés',()=>{
 const data={enabled:true,level:2,captivity:{status:'ACTIVE',kind:'CELL',guarded:false,remainingRealMs:800000},cooldownMs:0,active:null,releaseDue:false};
 const output=soEscapeHtml(data,'sid');assert.match(output,/soEscapeStart/);
 assert.doesNotMatch(output,/CODE_SECRET/);
 const html=soEscapeAdminHtml({characters:[{id:'test',name:'<script>alert(1)</script>'}],captivities:[]},'sid');
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
test('ROG-03 : gardien ou échéance bloquent le départ',()=>{
 const d={enabled:true,level:2,captivity:{status:'ACTIVE',kind:'CELL',guarded:true,remainingRealMs:10},cooldownMs:0,active:null,releaseDue:false};
 assert.doesNotMatch(soEscapeHtml(d,'sid'),/soEscapeStart/);
 d.releaseDue=true;assert.match(soEscapeHtml(d,'sid'),/20 minutes/);
});
