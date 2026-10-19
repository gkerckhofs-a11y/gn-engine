import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroupsUi,escapeHtml} from '../web/groups.mjs';
const ui=createGroupsUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`,pill:escapeHtml,input:()=>'',textarea:()=>''});
const detail=(permissions,stage='EN_JEU',preview=false)=>({session:{id:'session',stage},characterName:'Alias',preview,
  group:{id:'group',name:'Nom',visibility:'SECRET',role:'Membre',description:'Texte',permissions,briefing:'Brief',members:[],updates:[]}});
test('interface groupes : les sections suivent les droits et les formulaires de publication disparaissent en pause et en aperçu',()=>{
  assert.doesNotMatch(ui.detail(detail({})),/data-form="groupUpdate"|Briefing du groupe|Membres révélés|Informations partagées avec vous/);
  assert.match(ui.detail(detail({publishUpdates:true})),/data-form="groupUpdate"/);
  for(const stage of ['PREPARATION','BRIEFING','PAUSE','FINISHED','ARCHIVED'])assert.doesNotMatch(ui.detail(detail({publishUpdates:true},stage)),/data-form="groupUpdate"/);
  assert.doesNotMatch(ui.detail(detail({publishUpdates:true},'EN_JEU',true)),/data-form="groupUpdate"/);
  assert.equal(ui.cards([], 'session'),'');
});
test('interface groupes : contenu saisi et identités sont échappés dans les textes et attributs',()=>{
  const attack='<img src=x onerror="alert(1)">',d=detail({readUpdates:true,readMembers:true,readBriefing:true});
  d.group.name=attack;d.group.role=attack;d.group.briefing=attack;d.group.updates=[{id:'message',at:1000,title:attack,body:attack,authorName:attack}];d.group.members=[{displayName:attack,role:attack}];
  assert.doesNotMatch(ui.detail(d),/<img/);assert.match(ui.detail(d),/&lt;img/);
  assert.doesNotMatch(ui.memberRow({role:attack},{id:'character',public:{displayName:attack}},'SECRET'),/<img|value="<img/);
});
