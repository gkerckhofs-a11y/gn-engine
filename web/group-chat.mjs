import {escapeHtml as esc} from './groups.mjs';

export function groupMessagesHtml(messages) {
  return messages.map(m=>`<article class="group-chat-message"><p class="eyebrow"><strong>${esc(m.authorName)}</strong> · <time datetime="${esc(new Date(m.at).toISOString())}">${esc(new Date(m.at).toLocaleString('fr-FR'))}</time></p><p class="prose">${esc(m.body)}</p></article>`).join('')||'<p class="empty">Aucun message reçu. Lancez la conversation !</p>';
}
export function groupChatHtml(d,sid,gid){
 return `<section class="panel group-chat" data-group-chat><h2>Messagerie du groupe</h2><p class="muted"><em>Échangez avec les membres qui connaissent ce groupe. Votre message porte le nom de votre personnage et leur révèle donc votre présence. Les nouveaux membres reçoivent uniquement les messages envoyés après leur arrivée.</em></p><p class="muted"><em>Les 50 derniers messages reçus s’affichent ici. La conversation s’actualise toutes les 5 secondes lorsque cette page est visible.</em></p><div class="group-chat-feed" data-group-chat-feed role="log" aria-label="Messages du groupe" aria-live="polite" tabindex="0">${groupMessagesHtml(d.messages)}</div><p data-group-chat-status role="status">${d.canSend?'':'L’envoi est indisponible pour votre personnage ou tant que le jeu est interrompu ou terminé.'}</p><form data-form="groupMessage" data-sid="${esc(sid)}" data-id="${esc(gid)}"><label>Votre message<textarea name="body" rows="3" maxlength="2000" required ${d.canSend?'':'disabled'} placeholder="Écrire au groupe…"></textarea></label><small><em>Signé : ${esc(d.characterName)} · 2 000 caractères maximum.</em></small><button type="submit" class="primary" ${d.canSend?'':'disabled'}>Envoyer au groupe</button></form></section>`;
}
// Patch only the feed and availability: polling must never replace a draft.
export function watchGroupChat({root,read,isCurrent,schedule=setTimeout,cancel=clearTimeout,visible=()=>!document.hidden}){
 let stopped=false,timer,last;
 const feed=root.querySelector('[data-group-chat-feed]');
 const scroll=()=>{feed.scrollTop=feed.scrollHeight;};scroll();
 const poll=async()=>{
  if(stopped||!isCurrent())return;
  try{
   if(visible()){
    const d=await read();if(stopped||!isCurrent())return;
    const next=JSON.stringify(d.messages);
    if(next!==last){const bottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<80;feed.innerHTML=groupMessagesHtml(d.messages);if(bottom)scroll();last=next;}
    root.querySelector('[data-group-chat-status]').textContent=d.canSend?'':'L’envoi est indisponible pour votre personnage ou tant que le jeu est interrompu ou terminé.';
    for(const el of root.querySelectorAll('textarea,button[type="submit"]'))el.disabled=!d.canSend;
   }
  }catch{
   if(stopped||!isCurrent())return;
   root.innerHTML='<h2>Messagerie du groupe</h2><p role="alert">Impossible de vérifier votre accès à la conversation. Actualisez la page pour réessayer.</p>';stopped=true;return;
  }
  if(!stopped&&isCurrent())timer=schedule(poll,5000);
 };
 timer=schedule(poll,5000);
 return ()=>{stopped=true;cancel(timer);};
}
