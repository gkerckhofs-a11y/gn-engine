import test from 'node:test';
import assert from 'node:assert/strict';
import {soPickpocketHtml} from '../web/space-pickpocket.mjs';
test('ROG-02 : formulaire de QR sans divulgation du sac ou identité',()=>{
 const result=soPickpocketHtml({enabled:true,level:1,durationSeconds:60,cooldownMs:0,active:null},{alerts:[]},'sid');
 assert.match(result,/data-form="soPickpocketStart"/);assert.match(result,/badgeUrl/);assert.doesNotMatch(result,/inventaire privé.*Jeton secret/);
});
test('ROG-02 : choix retardé échappé et non accessible avant résolution',()=>{
 const first=soPickpocketHtml({enabled:true,level:3,durationSeconds:45,cooldownMs:0,active:{id:'a',status:'RUNNING',remainingMs:1000,durationSeconds:45}},{alerts:[]},'sid');
 assert.doesNotMatch(first,/data-form="soPickpocketChoose"/);
 const after=soPickpocketHtml({enabled:true,level:3,durationSeconds:45,cooldownMs:0,active:{id:'a',status:'CHOOSING',choices:[{itemId:'id',name:'<script>x</script>'}]}},{alerts:[]},'sid');
 assert.match(after,/soPickpocketChoose/);assert.match(after,/&lt;script&gt;/);assert.doesNotMatch(after,/<script>/);
});
