import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdmissionUi} from '../web/admissions.mjs';
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
test('Admissions UI : consultation MJ ne prétend pas confirmer les places ni activer une fiche',()=>{
 const html=ui.admin({sessionId:'s',settings:{open:true},invitations:[],registrations:[{email:'<script>',admission:{status:'SUBMITTED',proposal:{...d.proposal,firstName:'<svg>',lastName:'A',friends:'<img>'}}}]});
 assert.match(html,/Aucune place n’est réservée/);assert.doesNotMatch(html,/<script>|<svg>|<img>|data-action="assign"|Approuver/);
});
