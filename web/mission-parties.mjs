import {escapeHtml as esc} from './groups.mjs';
export const participationLabels={PERSONAL:'En son nom uniquement',GROUP:'Au nom d’une bande uniquement',EITHER:'En son nom ou au nom d’une bande'};
export const participantLabel=p=>`${p?.kind==='GROUP'?'Bande · ':''}${esc(p?.name??'')}`;
export const paymentDestination=p=>p?.kind==='GROUP'?`Caisse de la bande ${esc(p.name)}`:`Portefeuille de ${esc(p?.name??'')}`;
export function participantSelect(choices=[{kind:'CHARACTER',name:'Mon personnage',ready:true}]){
  return `<label>Je participe<select name="participant" required>${choices.map(p=>`<option value="${p.kind==='GROUP'?esc(p.id):'PERSONAL'}" ${p.ready===false?'disabled':''}>${p.kind==='GROUP'?`Au nom de la bande ${esc(p.name)}`:`En mon nom · ${esc(p.name)}`}${p.ready===false?' · caisse à configurer':''}</option>`).join('')}</select></label><p class="muted">Le bénéficiaire choisi reste celui de cet engagement. Une bande occupe une seule place et reçoit le paiement dans sa caisse. Ses représentants habilités partagent l’échange, le briefing accepté et les preuves.</p>`;
}
