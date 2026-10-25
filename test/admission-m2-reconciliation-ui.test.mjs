import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdmissionUi} from '../web/admissions.mjs';
import {reconciliationFixture} from './support/admission-m2-reconciliation-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const ui=createAdmissionUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const d={campaignId:'c',sessionId:'s',status:'DIFFERENCES',lastReview:null,blockers:[],differences:['displayName','biography'],speciesLabels:{species:'Espèce narrative'},current:{displayName:'<script>Ancien</script>',nature:'HUMANOID',classId:'COM',speciesId:'species',secondaryId:'MED-02',biography:'<img onerror=x>',gmNotes:'Secret non comparé'},proposed:{displayName:'<svg>Nouveau</svg>',nature:'DROID',classId:'ROG',speciesId:'species',secondaryId:'MED-02',biography:'<iframe>'},confirmations:{KEEP:'keep-token',PROPOSAL:'proposal-token'}};
test('Rapprochement M2 UI : accès seulement au dossier préparé et à la double autorité',()=>{
 const base={sessionId:'s',settings:{open:true},invitations:[],registrations:[{uid:'u',email:'fictif@example.invalid',m2Preparation:{approved:false,changedSincePreparation:true},admission:{status:'WITHDRAWN',proposal:{firstName:'Ari'}}}]};assert.match(ui.admin({...base,canPrepareM2:true}),/data-action="previewAdmissionM2Reconciliation" data-uid="u"/);assert.doesNotMatch(ui.admin({...base,canPrepareM2:false}),/data-action="previewAdmissionM2Reconciliation"/);assert.doesNotMatch(ui.admin({...base,canPrepareM2:true,registrations:[{...base.registrations[0],m2Preparation:null}]}),/data-action="previewAdmissionM2Reconciliation"/);
});
test('Rapprochement M2 UI : comparaison échappée, libellés et portée préparatoire explicites',()=>{
 const html=ui.reconciliationPreview(d,'u');assert.doesNotMatch(html,/<script>|<svg>|<img |<iframe>|Secret non comparé/);assert.match(html,/&lt;script&gt;Ancien/);assert.match(html,/Espèce narrative/);assert.match(html,/Combattant/);assert.match(html,/Soins de terrain/);assert.match(html,/à modifier/);assert.match(html,/n’autorise aucune publication ni activation/);assert.match(html,/objectifs et relations sont conservés/);const missing=ui.reconciliationPreview({...d,speciesLabels:{},current:{...d.current,speciesId:'constructor'}},'u');assert.match(missing,/<td>constructor<\/td>/);assert.doesNotMatch(missing,/function Object/);
});
test('Rapprochement M2 UI : conservation par défaut et remplacement expressément sélectionné',()=>{
 const html=ui.reconciliationPreview(d,'" onclick="x');assert.match(html,/data-form="reconcileAdmissionM2"/);assert.match(html,/data-keep="keep-token" data-proposal="proposal-token"/);assert.match(html,/data-uid="&quot; onclick=&quot;x"/);assert.match(html,/value="KEEP" checked required/);assert.match(html,/value="PROPOSAL" required/);assert.match(html,/name="reason" maxlength="500" required/);assert.match(html,/name="confirmed" required/);assert.doesNotMatch(html,/name="(?:characterId|credits|classId|nature|publicationState)"/);
});
test('Rapprochement M2 UI : blocage sans commande, relecture devenue ancienne signalée',()=>{
 const html=ui.reconciliationPreview({...d,status:'BLOCKED',blockers:['ADMISSION_M2_ARCHIVED','ADMISSION_NOT_APPROVED'],confirmations:null,lastReview:{at:1,revisionsUnchanged:false}},'u');assert.match(html,/Rapprochement bloqué/);assert.match(html,/restauration exige une décision distincte/);assert.match(html,/a changé depuis cette relecture/);assert.doesNotMatch(html,/data-form=|type="submit"|name="confirmed"/);assert.match(html,/href="#\/central\/c\/M2"/);
});
test('Rapprochement M2 UI : véritable aperçu serveur et choix transmis par le formulaire',async()=>{
 const f=await reconciliationFixture(()=>new MemoryStore()),p=await f.check(),html=ui.reconciliationPreview(p,f.player.uid);assert.match(html,/enregistrera seulement la relecture privée/);assert.match(html,/value="KEEP" checked/);assert.ok(html.includes(p.confirmations.PROPOSAL));const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(source,/confirmation:v.biographyMode==='PROPOSAL'\?form.dataset.proposal:form.dataset.keep,biographyMode:v.biographyMode,reason:v.reason/);assert.match(source,/if\(v.confirmed!=='on'\|\|!\['KEEP','PROPOSAL'\].includes\(v.biographyMode\)\)return/);
});
