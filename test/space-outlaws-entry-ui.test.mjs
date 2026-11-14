import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEntryUi,entrySkills} from '../web/space-outlaws-entry.mjs';
import {initialCharacterProfile} from '../src/shared/initial-character-profile.mjs';
import {playerShell} from '../web/player-spaces.mjs';
import {soLearningCatalogue} from '../src/shared/space-outlaws-learning.mjs';
import {playerSkillRules} from '../web/player-skill-rules.mjs';
test('Fiche : chaque compétence acquise dispose de ses conditions, sans commande de combat',()=>{
 assert.equal(soLearningCatalogue.length,34);
 for(const skill of soLearningCatalogue){
  const html=entrySkills({className:'Compétences',skills:[{...skill,level:1}]});
  assert.ok(playerSkillRules[skill.id],skill.id);assert.match(html,/Voir les règles détaillées/);
  if(['COM-02','ROG-01','RIPOSTE','GARDE_DU_CORPS','LAS-01'].includes(skill.id)){
   assert.match(html,/Technique jouée physiquement/);assert.doesNotMatch(html,/<button|data-action=|data-form=/);
  }
 }
 assert.match(playerSkillRules['COM-02'],/Aucun contact sur blaster rigide/);
 assert.match(playerSkillRules.RIPOSTE,/une seule touche spéciale réussie par adversaire et confrontation/);
 assert.match(playerSkillRules.GARDE_DU_CORPS,/2 m maximum/);assert.match(playerSkillRules.GARDE_DU_CORPS,/ne transfère pas une Neutralisation furtive/);
 assert.match(playerSkillRules['LAS-01'],/La compétence et l’arme sont deux acquisitions séparées/);
 assert.match(playerSkillRules['LAS-01'],/Enregistrer les pertes à l’abri/);
});
const ui=createEntryUi({button:(text,action,attrs)=>`<button data-action="${action}" ${attrs}>${text}</button>`,link:(text,path)=>`<a href="#/${path}">${text}</a>`});
test('Entrée SO UI : fiche fixe sans faux niveau, informations échappées et options explicites',()=>{
 const html=entrySkills(initialCharacterProfile('COM','MED-02'));assert.match(html,/COM-01 · Technique acquise/);assert.match(html,/MED-02 · Niveau 1/);
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
test('Entrée SO UI : suspension, invitation après suspension et archive sans commande',()=>{
 const d={session:{id:'sid'},stage:'PAUSE'},r={uid:'joueur"<test>',characterId:'personnage',accessActive:true};
 const active=ui.access(d,r);assert.match(active,/Suspendre l’accès privé/);assert.match(active,/data-action="revoke"/);assert.doesNotMatch(active,/data-action="invite"/);assert.match(active,/joueur&quot;&lt;test&gt;/);
 const suspended=ui.access(d,{...r,accessActive:false});assert.match(suspended,/Créer une invitation de réouverture/);assert.match(suspended,/Révoquer les liens existants/);assert.match(suspended,/conserve le personnage, les biens et les obligations/);assert.match(suspended,/une nouvelle invitation ne rétablit pas leurs anciens droits/);
 assert.equal(ui.access(d,{...r,characterId:null}),'');
 const archived=ui.access({...d,stage:'ARCHIVED'},r);assert.doesNotMatch(archived,/data-action="(?:revoke|invite)"/);assert.match(archived,/Épisode archivé/);
});
