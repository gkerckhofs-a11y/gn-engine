import {escapeHtml as esc} from './groups.mjs';
export function quickHealthSlider(h,sid,kind='hp',preview=false){
 if(preview)return '';
 const protection=kind==='protection',value=protection?(h.protection??0):h.hp;
 const allowed=!preview&&!h.safetyStopped&&h.hp>0&&(h.stage==='EN_JEU'||(h.spaceOutlaws&&h.stage==='PAUSE'));
 return `<form class="quick-health" data-form="quickDamage" data-sid="${esc(sid)}" data-kind="${kind}" data-before="${value}" data-hp="${h.hp}" data-protection="${h.protection??0}"><label>${protection?'Protection restante':'PV restants'} : <output>${value}</output><input aria-label="${protection?'Protection restante':'PV restants'}" type="range" name="remaining" min="0" max="${value}" step="1" value="${value}" ${allowed&&value>0?'':'disabled'}></label>${!protection&&h.spaceOutlaws?'<label data-down-time hidden>Si 0 PV : secondes déjà écoulées depuis la chute<input name="secondsSinceDown" type="number" min="0" max="86400" value="0" required></label>':''}${h.spaceOutlaws?'<p class="muted">Dégâts ordinaires : la protection est consommée avant les PV. Comptez les touches selon la fenêtre de deux secondes.</p>':''}<button class="primary" type="submit" ${allowed&&value>0?'':'disabled'}>Vérifier la diminution</button></form>`;
}
export function quickDamagePayload(d,data,v){
 const h=d.health,kind=data.kind,remaining=Number(v.remaining),before=Number(data.before);
 if(!['hp','protection'].includes(kind)||!Number.isInteger(remaining)||remaining<0||remaining>=before)throw new Error('Diminuez le curseur pour déclarer des dégâts.');
 if(h.hp!==Number(data.hp)||(h.protection??0)!==Number(data.protection))throw new Error('Votre état a changé. Actualisez avant de déclarer des dégâts.');
 const amount=before-remaining+(kind==='hp'&&h.spaceOutlaws?(h.protection??0):0);
 return {sessionId:d.session.id,amount,...(h.spaceOutlaws?{damageKind:'ORDINARY',counted:true,secondsSinceDown:Number(v.secondsSinceDown??0)}:{})};
}
