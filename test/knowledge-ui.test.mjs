import test from 'node:test';
import assert from 'node:assert/strict';
import {createKnowledgeUi,badgeRecipient} from '../web/knowledge.mjs';
import {escapeHtml} from '../web/groups.mjs';
const ui=createKnowledgeUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`,pill:escapeHtml,input:()=>'',textarea:()=>''});
const detail=(stage='EN_JEU',preview=false,canCopy=true)=>({session:{id:'session',stage},preview,knowledge:{id:'info',title:'Titre',body:'Texte',kind:'CLUE',origin:'Témoin',sourceName:'Alias',receivedAt:1000,revision:1,receiptRevision:1,canCopy,readAt:null}});
test('interface connaissances : partage uniquement autorisé en jeu, aperçu neutre et HTML échappé',()=>{
  assert.match(ui.detail(detail()),/data-action="knowledgeShare"/);
  assert.match(ui.detail(detail()),/data-receipt="1"/);
  for(const d of [detail('PAUSE'),detail('FINISHED'),detail('EN_JEU',true),detail('EN_JEU',false,false)])assert.doesNotMatch(ui.detail(d),/data-action="knowledgeShare"/);
  assert.doesNotMatch(ui.detail(detail('EN_JEU',true)),/data-action="knowledgeRead"/);
  const d=detail();for(const key of ['title','body','origin','sourceName'])d.knowledge[key]='<img src=x onerror="bad()">';
  assert.doesNotMatch(ui.detail(d),/<img/);assert.match(ui.detail(d),/&lt;img/);
  const list=ui.list({session:{id:'session'},items:[d.knowledge]});assert.doesNotMatch(list,/<img/);assert.match(list,/data-knowledge-kind="CLUE"/);
});
test('partage : le lien doit être le badge du même site et de la même session',()=>{
  assert.equal(badgeRecipient('https://gn-engine.web.app/#/badge/session/character','https://gn-engine.web.app','session'),'character');
  for(const value of ['https://evil.invalid/#/badge/session/character','https://gn-engine.web.app/#/badge/other/character','https://gn-engine.web.app/#/invite/session/token','javascript:alert(1)','character','https://gn-engine.web.app/#/badge/session/character/extra'])assert.throws(()=>badgeRecipient(value,'https://gn-engine.web.app','session'));
});
