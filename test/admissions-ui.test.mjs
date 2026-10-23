import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdmissionUi,filterAdmissions} from '../web/admissions.mjs';
import {admissionClasses} from '../src/shared/admission-rules.mjs';
const ui=createAdmissionUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const d={session:{id:'s',title:'<script>',summary:'<img onerror=x>',privacy:'<svg>',practical:'A',date:'',time:'',place:''},policyRevision:1,draftRevision:1,revision:1,editable:true,instructions:'<script>',species:[{id:'test',label:'<svg>',nature:'HUMANOID'}],classes:admissionClasses,secondaryChoices:admissionClasses,proposal:{classId:'COM',background:'<img onerror=x>'}};
test('Admissions UI : formulaire privé échappé, consentement et distinction brouillon/soumission',()=>{
 const html=ui.proposal(d);assert.doesNotMatch(html,/<script>|<img |<svg>/);assert.match(html,/name="consent" required/);
 assert.match(html,/value="draft"/);assert.match(html,/value="submit"/);assert.match(html,/<option value="COM-03"[^>]*disabled/);
 assert.doesNotMatch(html,/FOR-01|JEDI|SITH|name="nature"|name="credits"|name="role"/);
 assert.doesNotMatch(ui.proposal({...d,editable:false}),/data-form="admissionProposal"/);
 assert.doesNotMatch(ui.invitation(d),/<script>|<img |<svg>/);
});
test('Admissions UI : catalogue sans JSON technique, ajout non soumettant et ouverture explicite',()=>{
 const html=ui.config({sessionId:'s',policyRevision:0,draftRevision:0,settings:{open:false,instructions:'',quotas:Object.fromEntries(admissionClasses.map(c=>[c.id,0])),species:[]}});
 assert.equal((html.match(/name="quota_/g)||[]).length,8);assert.match(html,/<button type="button"[^>]*data-action="addAdmissionSpecies"/);
 assert.doesNotMatch(html,/name="open" checked/);assert.match(ui.speciesRow({id:'s',label:'<img>',nature:'DROID'}),/value="DROID" selected/);
});
test('Admissions UI : décision MJ distincte de la préparation M2 et de la dotation',()=>{
 const html=ui.admin({sessionId:'s',settings:{open:true},invitations:[],registrations:[{email:'<script>',admission:{status:'SUBMITTED',proposal:{...d.proposal,firstName:'<svg>',lastName:'A',friends:'<img>'}}}]});
 assert.match(html,/aucun kit, crédit ou QR actif/);assert.match(html,/data-action="reviewAdmission"/);assert.doesNotMatch(html,/<script>|<svg>|<img>|data-action="assign"/);
});

test('Admissions UI : candidat confirmé verrouillé, message privé échappé et retrait explicite',()=>{
 const html=ui.proposal({...d,status:'APPROVED',editable:false,decision:{revision:3,reason:'<script>secret</script>'},decisionReadRevision:0});
 assert.match(html,/Place confirmée/);assert.match(html,/data-action="withdrawAdmission"/);assert.match(html,/data-action="ackAdmission"/);assert.match(html,/Contactez le MJ/);
 assert.doesNotMatch(html,/<script>|data-form="admissionProposal"|aucune place confirmée/);
 assert.match(ui.proposal({...d,classes:admissionClasses.map(c=>({...c,remaining:0}))}),/complet, candidature en attente possible/);
 assert.doesNotMatch(ui.proposal({...d,status:'WITHDRAWN'}),/data-action="withdrawAdmission"/);
});
test('Admissions UI : filtres combinés, sans modifier les dossiers ni ignorer le souhait d’amis',()=>{
 const rows=[{uid:'a',admission:{status:'SUBMITTED',proposal:{classId:'COM',speciesId:'s',nature:'HUMANOID',firstName:'Ari',friends:'Avec Lola'}}},{uid:'b',admission:{status:'APPROVED',proposal:{classId:'ROG',speciesId:'s',nature:'DROID',firstName:'Lola'}}}];
 assert.deepEqual(filterAdmissions(rows,{query:' LOLA ',status:'SUBMITTED',classId:'COM',speciesId:'s',nature:'HUMANOID'}),[rows[0]]);
 assert.deepEqual(filterAdmissions(rows,{nature:'HUMANOID',classId:'ROG'}),[]);assert.equal(rows.length,2);
});
test('Admissions UI : exception explicitement choisie et historique échappé',()=>{
 const settings={quotas:Object.fromEntries(admissionClasses.map(c=>[c.id,2]))},r={uid:'u',admission:{revision:2,status:'SUBMITTED',proposal:{...d.proposal,firstName:'<svg>'}}};
 const html=ui.review({sessionId:'s',policyRevision:1,draftRevision:1,settings},r);
 assert.match(html,/value="APPROVE"/);assert.match(html,/value="OVERRIDE_APPROVE"/);assert.doesNotMatch(html,/name="classId"|<svg>/);
 const change=ui.review({sessionId:'s',settings},{...r,admission:{...r.admission,status:'APPROVED'}});assert.match(change,/value="CHANGE_CLASS"/);assert.match(change,/value="OVERRIDE_CHANGE_CLASS"/);
 assert.doesNotMatch(ui.history({versions:[{at:1,revision:2,status:'SUBMITTED',proposal:d.proposal,decision:{reason:'<script>'}}]}),/<script>|<img/);
});
