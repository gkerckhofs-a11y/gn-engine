import {escapeHtml as esc} from './groups.mjs';
import {admissionClasses} from '../src/shared/admission-rules.mjs';
import {initialCharacterProfile} from '../src/shared/initial-character-profile.mjs';

export function centralPlanPayload(v){
 if(v.profileMode===undefined)return {};
 return {creationPlan:v.profileMode==='PLAYER'?{classId:v.profileClass,speciesId:v.profileSpecies.trim(),secondaryId:v.profileSecondary}:null};
}
export function centralPlanPreview(plan){
 const p=plan&&initialCharacterProfile(plan.classId,plan.secondaryId);
 return p?`<p><strong>${esc(p.className)}</strong> · socle initial prévu</p><ul>${p.skills.map(s=>`<li>${esc(s.id)} · ${esc(s.name)} : ${s.kind==='FIXED'?'acquis fixe':`N${s.level}`}${s.source==='INITIATION'?' · initiation':''}</li>`).join('')}</ul><p>Une place secondaire occupée sur cinq. Aucun effet, compte ou ressource activé.</p>`:'<p>Choisissez une classe et une initiation d’une autre classe pour voir le socle initial prévu.</p>';
}
export function centralPlanForm(d,plan){
 const enabled=!!plan,attrs=enabled?'required':'disabled';
 return `<fieldset><legend>Profil joueur initial · V0.7</legend><label>Préparation<select name="profileMode"><option value="NONE" ${!enabled?'selected':''}>Fiche narrative seule</option><option value="PLAYER" ${enabled?'selected':''}>Préparer un profil joueur initial</option></select></label><p>Huit classes joueurs. Les profils PNJ, la Force, les achats XP et la relève se préparent dans leurs parcours dédiés. Les choix ci-dessous restent privés et ne confirment aucune place.</p>
 <label>Classe<select name="profileClass" ${attrs}><option value="">À choisir</option>${admissionClasses.map(c=>`<option value="${c.id}" ${plan?.classId===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label>
 <label>ID de l’espèce narrative<input name="profileSpecies" value="${esc(plan?.speciesId??'')}" list="central-profile-species" maxlength="128" ${attrs}></label><datalist id="central-profile-species">${(d.references?.species??[]).map(s=>`<option value="${esc(s.id)}">${esc(s.label)} · ${esc(s.nature)}${s.available?'':' · non proposée aux nouvelles candidatures'}</option>`).join('')}</datalist><p>Référence au catalogue narratif M2 partagé. Une espèce manquante peut être préparée ensuite ; sa nature doit correspondre à celle de la fiche. Aucun bonus d’espèce n’est ajouté.</p>
 <label>Initiation secondaire N1<select name="profileSecondary" ${attrs}><option value="">À choisir dans une autre classe</option>${admissionClasses.map(c=>`<option value="${c.secondaryId}" ${c.id===plan?.classId?'disabled':''} ${c.secondaryId===plan?.secondaryId?'selected':''}>${esc(c.label)} · ${c.secondaryId} · ${esc(c.secondaryLabel)}</option>`).join('')}</select></label><div data-central-profile-preview aria-live="polite">${enabled?centralPlanPreview(plan):'<p>Aucun profil joueur préparé.</p>'}</div><p>Choisir « Fiche narrative seule » retire explicitement le plan de création du brouillon lors de l’enregistrement. Les textes narratifs sont conservés.</p></fieldset>`;
}
export function syncCentralPlanForm(form){
 const fields=form.elements,enabled=fields.profileMode.value==='PLAYER';
 for(const name of ['profileClass','profileSpecies','profileSecondary']){fields[name].disabled=!enabled;fields[name].required=enabled;}
 for(const option of fields.profileSecondary.options)option.disabled=!!fields.profileClass.value&&option.value.startsWith(`${fields.profileClass.value}-`);
 if(fields.profileSecondary.selectedOptions[0]?.disabled)fields.profileSecondary.value='';
 form.querySelector('[data-central-profile-preview]').innerHTML=enabled?centralPlanPreview({classId:fields.profileClass.value,secondaryId:fields.profileSecondary.value}):'<p>Aucun profil joueur préparé.</p>';
}
