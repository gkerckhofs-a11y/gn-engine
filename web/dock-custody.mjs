import {escapeHtml as esc} from './groups.mjs';

// Both inventory screens consume the same role-limited server projection.
export function dockCustodyHtml(d){
 const rows=d.storageCustody??[];if(!rows.length)return '';
 return `<section class="panel"><h2>Marchandises en garde distincte</h2>${rows.map(l=>`<article><h3>${esc(l.item.name)} · ${esc(l.quantity)} ${esc(l.item.unit)}</h3><p>${l.owner?'Votre propriété légale est conservée. ':''}${l.holder?'Ces marchandises sont sous votre garde, à la destination de l’opération.':'La localisation et l’identité du détenteur ne sont pas communiquées.'}</p>${!d.preview&&l.holder&&l.theftId?`<a class="button quiet" href="#/dock-theft/${esc(d.session.id)}/${esc(l.theftId)}">Voir mon opération</a>`:''}</article>`).join('')}<p>La revente et les remises ordinaires de ces lots ne sont pas ouvertes. Contactez le MJ pour une restitution.</p></section>`;
}
