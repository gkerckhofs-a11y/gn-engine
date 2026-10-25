import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEntryUi,entrySkills} from '../web/space-outlaws-entry.mjs';
import {initialCharacterProfile} from '../src/shared/initial-character-profile.mjs';
import {playerShell} from '../web/player-spaces.mjs';
const ui=createEntryUi({button:(text,action,attrs)=>`<button data-action="${action}" ${attrs}>${text}</button>`,link:(text,path)=>`<a href="#/${path}">${text}</a>`});
test('Entrée SO UI : fiche fixe sans faux niveau, informations échappées et options explicites',()=>{
 const html=entrySkills(initialCharacterProfile('COM','MED-02'));assert.match(html,/Vétéran<\/strong> — acquise/);assert.match(html,/Soins de terrain<\/strong> — niveau 1/);
 const options=ui.options('sid','uid','<script>');assert.doesNotMatch(options,/<script>/);assert.match(options,/<option value="">Choisir/);assert.match(options,/startingInformation/);
 const blocked=ui.release({characters:1,approved:1,blockers:[{message:'<bad>',entityId:'x',code:'BLOCKED'}]});assert.match(blocked,/&lt;bad&gt;/);assert.doesNotMatch(blocked,/data-form="soRelease"/);
});
test('Entrée SO UI : accès privé seulement après naissance et navigation de briefing',()=>{
 assert.match(ui.mine({session:{id:'s',title:'Titre'},characterId:'c',accessActive:true}),/#\/play\/s/);
 assert.doesNotMatch(ui.mine({session:{id:'s',title:'Titre'},characterId:'c',accessActive:false}),/#\/play/);
 const html=playerShell({session:{id:'s',title:'T',stage:'BRIEFING',spaceOutlaws:{}},character:{id:'c',displayName:'A'},health:{hp:4,maxHp:4}},{space:'character',page:'play'},'Fiche');assert.match(html,/#\/bag\/s/);assert.doesNotMatch(html,/#\/(action|health|market|contracts)\//);assert.match(html,/playerBadge/);
});
test('Entrée SO UI : parcours câblé depuis la session, confirmation et candidature',()=>{
 const app=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');for(const action of ['previewSpaceOutlawsRelease','releaseSpaceOutlaws','previewSpaceOutlawsBirth','birthSpaceOutlaws','mySpaceOutlawsEntry'])assert.ok(app.includes(action));assert.match(app,/pendingEntry=null;dialog.close\(\);await route\(\)/);assert.match(app,/entry\.released|entry\?\.released/);
});
