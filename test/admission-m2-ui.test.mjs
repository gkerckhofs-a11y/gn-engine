import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdmissionUi,admissionErrors} from '../web/admissions.mjs';
const ui=createAdmissionUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const preview={campaignId:'campaign',sessionId:'session',sourceRevision:3,confirmation:'snapshot',character:{public:{displayName:'<script>Ari</script>'},nature:'HUMANOID',biography:'<img src=x onerror=alert(1)>',creationPlan:{classId:'COM',speciesId:'<svg>',secondaryId:'MED-02'}}};
const admin=(status,canPrepareM2,m2Preparation=null)=>ui.admin({sessionId:'session',settings:{open:true},invitations:[],canPrepareM2,registrations:[{uid:'participant',email:'private@example.invalid',m2Preparation,admission:{status,proposal:{firstName:'Ari',lastName:'Test'}}}]});
test('Admission vers M2 UI : accès selon droits et état, consultation après retrait',()=>{
 assert.match(admin('APPROVED',true),/data-action="previewAdmissionM2" data-uid="participant"/);
 assert.doesNotMatch(admin('APPROVED',false),/data-action="previewAdmissionM2"/);
 for(const status of ['DRAFT','SUBMITTED','CORRECTION','WAITLISTED','REFUSED','WITHDRAWN'])assert.doesNotMatch(admin(status,true),/data-action="previewAdmissionM2"/);
 const html=admin('WITHDRAWN',true,{changedSincePreparation:true,approved:false});assert.match(html,/Consulter la préparation M2/);assert.match(html,/rapprochement nécessaire/);assert.match(html,/actuellement non approuvée/);
});
test('Admission vers M2 UI : fiction échappée et frontière privée explicite',()=>{
 const html=ui.m2Preview(preview,'participant');assert.doesNotMatch(html,/<script>|<img |<svg>/);assert.match(html,/&lt;script&gt;Ari/);assert.match(html,/Biographie privée/);assert.match(html,/organisateurs habilités/);assert.match(html,/souhaits d’amis/);assert.match(html,/aucun personnage actif, kit, crédit ou QR/);assert.doesNotMatch(html,/name="(?:email|credits|characterId|classId|role)"/);
});
test('Admission vers M2 UI : motif et confirmation exigés, empreinte transmise sans données éditables',()=>{
 const html=ui.m2Preview({...preview,confirmation:'" onmouseover="x'},'" onclick="x');assert.match(html,/data-form="prepareAdmissionM2" data-sid="session"/);assert.match(html,/data-uid="&quot; onclick=&quot;x"/);assert.match(html,/data-confirmation="&quot; onmouseover=&quot;x"/);assert.match(html,/name="reason" maxlength="500" required/);assert.match(html,/name="confirmed" type="checkbox" required/);
 const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(source,/kind==='prepareAdmissionM2'\)\{if\(v.confirmed!=='on'\)return;await mutate\('prepareAdmissionM2',\{sessionId:form.dataset.sid,uid:form.dataset.uid,confirmation:form.dataset.confirmation,reason:v.reason\}\)/);
});
test('Admission vers M2 UI : fiche existante archivée sans nouvelle confirmation ni restauration',()=>{
 const html=ui.m2Preview({campaignId:'campaign',alreadyPrepared:{characterId:'existing'},archived:true,state:{changedSincePreparation:true,approved:false}},'participant');assert.doesNotMatch(html,/data-form=|type="submit"|name="confirmed"/);assert.match(html,/ne remplace pas les éditions ultérieures/);assert.match(html,/restauration relève de l’éditeur M2/);assert.match(html,/vérifier le rapprochement/);assert.match(html,/plus approuvée/);assert.match(html,/href="#\/central\/campaign\/M2"/);
});
test('Admission vers M2 UI : erreurs actionnables et aucune nouvelle liaison exposée au joueur',()=>{
 for(const code of ['ADMISSION_NOT_APPROVED','ADMISSION_M2_STALE','ADMISSION_M2_NAME_TOO_LONG','ADMISSION_M2_COLLISION','ADMISSION_M2_LINK_BROKEN'])assert.ok(admissionErrors[code]?.length>30,code);
 const html=ui.proposal({session:{id:'s',title:'Titre'},status:'APPROVED',editable:false,proposal:{firstName:'Ari'},classes:[],secondaryChoices:[],species:[],m2Preparation:{characterId:'private-character-id'}});assert.doesNotMatch(html,/private-character-id|previewAdmissionM2|prepareAdmissionM2/);
});
