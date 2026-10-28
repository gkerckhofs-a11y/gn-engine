import test from 'node:test';
import assert from 'node:assert/strict';
import {masterFixture,masterExample} from './support/masters-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {moduleDraft,moduleEditorHtml,moduleFormSheets} from '../web/master-editor.mjs';
import {masterEditor} from '../src/shared/master-editors.mjs';
import {personAdminHtml} from '../web/person-actions.mjs';
import {createHealthUi} from '../web/health.mjs';

test('SO-01a interface : choix de nature transmis au Master, verrouillé dans une session existante',async()=>{
 const f=await masterFixture(()=>new MemoryStore());await f.apply(masterExample());
 const w=await f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages'}),d=moduleDraft(w);
 const html=moduleEditorHtml(w,d);assert.match(html,/name="nature"/);assert.match(html,/value="DROID"/);assert.match(html,/Humanoïde biologique/);
 assert.equal(moduleFormSheets(w,d,{...d.row,nom:'Nouvelle fiche',nature:'DROID'}).Personnages[0].nature,'DROID');
 const existing={...w,session:true},edit=moduleDraft(existing,w.rows[0].row.id);assert.doesNotMatch(moduleEditorHtml(existing,edit),/name="nature"/);
});
test('SO-01a interface : filtres de patient accessibles et retirés pour une fouille',()=>{
 const f=masterEditor('personnages','Interactions').fields.find(x=>x.name==='nature_patient');
 assert.deepEqual(f.when.type,['FIELD_CARE','CLINIC_SAFE','CLINIC_FAST']);assert.equal(f.inactiveValue,'!EFFACER');
 const html=personAdminHtml({scope:'scenario',parent:{id:'s'},personProfiles:[{id:'p',kind:'FIELD_CARE',name:'Réparation',patientNature:'DROID',publicationState:'PUBLISHED'}],actions:[]});
 assert.match(html,/Droïde/);
});
test('SO-01a interface : auto-soin incompatible désactivé et protocole lisible',()=>{
 const ui=createHealthUi({button:(label,action,attrs)=>`<button ${attrs}>${label}</button>`,link:()=>''});
 const html=ui.page({session:{id:'s',stage:'EN_JEU'},character:{id:'me',name:'Personnage'},health:{hp:1,maxHp:3,allowed:{},stage:'EN_JEU'},events:[],skills:[{id:'heal',name:'Réparation',kind:'ACTIVE_SELF',patientCompatible:false,healing:{amount:1,uses:null,cooldownSeconds:0,patientNature:'DROID'},remaining:null,waitMs:0}]});
 assert.match(html,/patient : Droïde/);assert.match(html,/disabled>Préparer ce soin/);
});
