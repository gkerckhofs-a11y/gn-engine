import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotebookUi,noteMatches} from '../web/notebook.mjs';
const ui=createNotebookUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const d=()=>({session:{id:'session',stage:'EN_JEU'},character:{id:'char',displayName:'Alias'},note:{id:'note',revision:1,title:'Privé',body:'Rumeur',archived:false,createdAt:1000,updatedAt:2000},shares:[]});
test('carnet UI : échappement du texte privé et du nom de destinataire, confirmation du texte complet',()=>{
  const attack='<img src=x onerror="bad()">',data=d();data.note.title=attack;data.note.body=attack;
  for(const html of [ui.editor('session',data.note),ui.detail(data),ui.list({...data,notes:[data.note]}),ui.confirm('session',{note:data.note,recipient:{id:'recipient',displayName:attack},recipientVersion:'version',author:{id:'char',displayName:attack},shareMode:'SHOW'})]){assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);}
  const confirm=ui.confirm('session',{note:data.note,recipient:{id:'recipient',displayName:'Contact'},recipientVersion:'version',author:{id:'char',displayName:'Alias'},shareMode:'SHOW'});
  assert.match(confirm,/MJ pourront consulter cette copie/);assert.match(confirm,/data-recipient-version="version"/);assert.match(confirm,/Aucune nouvelle copie numérique/);
});
test('carnet UI : partage fermé hors jeu ou note classée, filtres limités au carnet affiché',()=>{
  const data=d();assert.match(ui.detail(data),/data-action="prepareNoteShare"/);
  for(const stage of ['BRIEFING','PAUSE','FINISHED'])assert.doesNotMatch(ui.detail({...data,session:{...data.session,stage}}),/data-action="prepareNoteShare"/);
  assert.doesNotMatch(ui.detail({...data,note:{...data.note,archived:true}}),/data-action="prepareNoteShare"|data-action="editNote"/);
  assert.equal(noteMatches({title:'Mon Indice',archived:false},'  INDICE  ','ACTIVE'),true);
  assert.equal(noteMatches({title:'Mon Indice',archived:true},'indice','ACTIVE'),false);
  assert.equal(noteMatches({title:'Mon Indice',archived:true},'indice','ARCHIVED'),true);
  assert.equal(noteMatches({title:'Mon Indice',archived:true},'autre','ALL'),false);
});
