import test from 'node:test';
import assert from 'node:assert/strict';
import {playerCapabilities} from '../web/player-capabilities.mjs';
import {initialCharacterProfile} from '../src/shared/initial-character-profile.mjs';
import {admissionClasses} from '../src/shared/admission-rules.mjs';
import {terminalHtml,playerRoute,playerShell} from '../web/player-spaces.mjs';
import {entrySkills} from '../web/space-outlaws-entry.mjs';
import {directoryHtml,portraitEditor} from '../web/player-identity.mjs';
const session={id:'test',spaceOutlaws:{navigationVersion:1,logisticsVersion:1,towingWorkVersion:1,combatVersion:1,shopsVersion:1,missionsVersion:1}};
test('8 classes: only acquired specialist capabilities; commerce remains common',()=>{
 for(const {id} of admissionClasses){
  const profile=initialCharacterProfile(id,id==='MED'?'COM-03':'MED-02'),d={session,character:{spaceOutlawsSkills:profile},economyEnabled:true,terminal:{shops:{shops:[{id:'shop'}]}}},cap=playerCapabilities(d),html=terminalHtml(d);
  assert.equal(cap.pickpocket,id==='ROG');assert.equal(cap.escape,id==='ROG');assert.equal(cap.decryption,id==='INF');assert.equal(cap.maintenance,id==='MEC');
  assert.equal(html.includes('#/space-maintenance/'),false);assert.equal(html.includes('#/spaceport/'),false);
  assert.ok(html.includes('#/shops/'));assert.ok(html.includes('#/wallet/'));
  const skills=entrySkills(profile);assert.ok(skills.includes('class="rp"'));assert.ok(skills.includes('<em>'));assert.equal((skills.match(/class="panel skill-card"/g)||[]).length,4);
 }
});
test('secondary skills and actual published abilities override class stereotypes',()=>{
 const profile=initialCharacterProfile('COM','MEC-02'),d={session,character:{spaceOutlawsSkills:profile}};
 assert.equal(playerCapabilities(d).maintenance,false);
 d.character.abilities={skills:[{id:'MEC-02',level:2},{id:'ROG-02',level:1}]};assert.equal(playerCapabilities(d).maintenance,true);assert.equal(playerCapabilities(d).pickpocket,true);
 d.character.abilities={skills:[]};assert.equal(playerCapabilities(d).maintenance,false);assert.equal(playerCapabilities(d).pickpocket,false);
 d.ownsShip=true;d.terminal={ships:{ships:[{id:'own'}]},maintenance:{jobs:[{id:'job',status:'OFFERED'}]}};assert.ok(terminalHtml(d).includes('#/space-maintenance/'));assert.ok(terminalHtml(d).includes('#/spaceport/'));
});
test('directory menu requires permission; player identity rendering escapes public content',()=>{
 const d={session,character:{id:'one',displayName:'Test'}};
 assert.ok(!terminalHtml(d).includes('#/directory/'));d.directoryAllowed=true;assert.ok(terminalHtml(d).includes('#/directory/'));
 assert.equal(playerRoute('directory','test').space,'terminal');assert.equal(playerRoute('directory-admin','test'),null);
 const html=directoryHtml({sessionId:'test',characters:[{id:'one',name:'<script>',description:'<img onerror=evil>',profession:'Pilote'}]});assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(portraitEditor({contentRevision:1},{scopeId:'test'}).includes('accept="image/jpeg,image/png,image/webp"'));
 assert.ok(playerShell(d,playerRoute('skills','test'),entrySkills(initialCharacterProfile('MED','COM-03'))).includes('player-scene'));
});
