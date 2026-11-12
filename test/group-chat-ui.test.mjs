import test from 'node:test';
import assert from 'node:assert/strict';
import {groupChatHtml,groupMessagesHtml,watchGroupChat} from '../web/group-chat.mjs';
test('Messagerie : contenu échappé, signature, plafond et lecture seule',()=>{
 const d={canSend:false,characterName:'<script>',messages:[{id:'a',at:1000,authorName:'<img>',body:'<script>alert(1)</script>'}]};
 const html=groupChatHtml(d,'s','g');assert.doesNotMatch(html,/<script>|<img>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/maxlength="2000"/);assert.equal((html.match(/disabled/g)||[]).length,2);assert.match(groupMessagesHtml([]),/Aucun message/);
});
test('Messagerie : actualisation préserve le brouillon, ferme sur refus et ignore une réponse tardive',async()=>{
 let task,stopped=false,result={canSend:true,messages:[{at:1000,authorName:'Pilote',body:'Reçu'}]};
 const feed={innerHTML:'',scrollTop:0,scrollHeight:100,clientHeight:100},status={textContent:''},editor={value:'Brouillon',disabled:false},button={disabled:false};
 const root={innerHTML:'salon',querySelector:s=>s.includes('feed')?feed:status,querySelectorAll:()=>[editor,button]};
 const stop=watchGroupChat({root,read:async()=>{if(result instanceof Error)throw result;return result;},isCurrent:()=>!stopped,visible:()=>true,schedule:fn=>{task=fn;return 1;},cancel:()=>{}});
 await task();assert.equal(editor.value,'Brouillon');assert.match(feed.innerHTML,/Reçu/);
 result={...result,canSend:false};await task();assert.equal(button.disabled,true);assert.equal(editor.value,'Brouillon');
 result=new Error('FORBIDDEN');await task();assert.match(root.innerHTML,/Impossible de vérifier/);stop();
 let resolve;root.innerHTML='autre page';stopped=false;
 const end=watchGroupChat({root,read:()=>new Promise(r=>{resolve=r;}),isCurrent:()=>!stopped,visible:()=>true,schedule:fn=>{task=fn;return 1;},cancel:()=>{}});
 const pending=task();end();resolve({canSend:true,messages:[]});await pending;assert.equal(root.innerHTML,'autre page');
});
