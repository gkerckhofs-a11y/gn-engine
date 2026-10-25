import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCentralUi} from '../web/central-master.mjs';
import {centralGroupPayload} from '../web/central-groups.mjs';
import {MemoryStore} from './support/memory.mjs';
import {centralGroupsFixture,centralTestGroup} from './support/central-groups-suite.mjs';
const ui=createCentralUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
test('Groupes centraux UI : formulaire privé et permissions sans sélection implicite',async()=>{
 const f=await centralGroupsFixture(()=>new MemoryStore()),d=await f.view('M2'),html=ui.groupForm(d,'group');assert.match(html,/data-form="centralGroup"/);assert.match(html,/name="reason"/);assert.match(html,/aucun accès de session/i);assert.doesNotMatch(html,/name="publicationState"|name="wallet|name="roster/);const row=ui.groupMemberRow(d,{characterId:'future',active:true},'SECRET');assert.match(row,/Fiche à préparer/);assert.match(row,/Appartenance proposée active/);assert.doesNotMatch(row,/data-member-field="(?:readBriefing|readWallet|payWallet|pilotShip)" checked/);assert.match(row,/data-member-field="publicAffiliation"[^>]*disabled/);
});
test('Groupes centraux UI : lecture seule des textes, archive et contenus échappés',async()=>{
 const f=await centralGroupsFixture(()=>new MemoryStore());await f.group({group:{...centralTestGroup,name:'<script>Nom</script>',briefing:'<img onerror=x>'}});const d=await f.view('M2'),html=ui.page(d);assert.match(html,/Groupes et factions préparés/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script>|<img /);assert.match(html,/Secret de faction M2/);assert.match(html,/centralGroupArchive/);const read=ui.page({...d,rights:{...d.rights,editWorkshops:[]}});assert.doesNotMatch(read,/data-action="centralGroup(?:Archive)?"/);assert.match(read,/Briefing réservé/);const archive=ui.groupArchiveForm(d,d.changes[0]);assert.match(archive,/aucun groupe de session n’est modifié/);assert.match(archive,/data-revision="1"/);
});
test('Groupes centraux UI : payload natif limité aux propositions',()=>{
 const members=[{characterId:'c',active:true,permissions:{readWallet:true}}],v={...centralTestGroup,publicationState:'PUBLISHED',walletConfig:{amount:200},roster:{leaderId:'c'}};const p=centralGroupPayload(v,members);assert.deepEqual(Object.keys(p),['name','description','briefing','gmNotes','visibility','members']);assert.deepEqual(p.members,members);
});
test('Groupes centraux UI : branchement serveur, doublons et changement de visibilité',()=>{
 const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(source,/mutate\(kind==='centralGroup'\?'saveCentralGroup':'archiveCentralGroup'/);assert.match(source,/group:centralGroupPayload\(v,groupMembers\(form\)\)/);assert.match(source,/rows.children.length>=100\|\|\[\.\.\.rows.children\].some\(row=>row.dataset.character===id\)/);assert.match(source,/\[data-form="centralGroup"\] select\[name="visibility"\]/);assert.match(source,/field.disabled=event.target.value==='SECRET';if\(field.disabled\)field.checked=false/);assert.match(source,/if\(submitVersion!==routeVersion\)return;/);
});
