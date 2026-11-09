import {escapeHtml as esc} from './groups.mjs';
export const soEscapeErrors={
 SO_ESCAPE_CLOSED:'ROG-03 indisponible dans cette version de session.',
 SO_ESCAPE_SKILL:'Votre niveau de ROG-03 ne permet pas cette occasion.',
 SO_ESCAPE_UNAVAILABLE:'Aucune captivité active compatible. Consultez le MJ.',
 SO_ESCAPE_CAPTIVE:'Ce personnage est déjà captif.',
 SO_ESCAPE_GUARDED:'Un gardien surveille cette tentative.',
 SO_ESCAPE_RELEASE_DUE:'Vingt minutes réelles écoulées : libération par le MJ, sans PA.',
 SO_ESCAPE_COOLDOWN:'Récupération personnelle ou tentative déjà engagée.',
 SO_ESCAPE_QR:'Cette occasion nécessite le QR préparé par le MJ.',
 SO_ESCAPE_PRESENCE:'Vous devez être à l’occasion réelle préparée.',
 SO_ESCAPE_TOO_EARLY:'La durée d’évasion n’est pas écoulée.',
 SO_ESCAPE_SAFE_EXIT:'Le passage physique sûr doit être confirmé.',
 SO_ESCAPE_STALE:'La tentative est terminée ou modifiée. Actualisez.',
 SO_ESCAPE_OPPORTUNITY:'Le MJ doit valider une sortie physique sûre.',
 SO_CAPTIVITY_OPEN:'Libérez les captifs avant de terminer la session.',
};
const fmt=n=>Math.ceil(n/1000)+' secondes';
export function soEscapeHtml(d,sid,code=''){
 if(!d?.enabled)return '<section class="panel"><h2>ROG-03 · Évasion</h2><p>Compétence indisponible pour ce personnage.</p></section>';
 const c=d.captivity;
 let body='<p>Évasion fictive seulement : aucun QR ne déverrouille une serrure. Le MJ supervise la sortie physique.</p>';
 if(c?.status==='ACTIVE'){
  if(d.releaseDue)body+='<p role="status">20 minutes réelles atteintes : demandez votre libération immédiate au MJ. Aucun PA dû.</p>';
  else if(d.active?.status==='RUNNING'){
   body+='<p>Action engagée : '+fmt(d.active.remainingMs)+' de jeu restantes.</p>';
   body+='<form data-form="soEscapeFinish" data-sid="'+esc(sid)+'" data-id="'+esc(d.active.id)+'"><label><input name="safeExit" type="checkbox" required>Le passage réel est sûr et autorisé</label><button type="submit" '+(d.active.remainingMs>0?'disabled':'')+'>Achever l’évasion</button></form>';
   body+='<form data-form="soEscapeCancel" data-sid="'+esc(sid)+'" data-id="'+esc(d.active.id)+'"><button type="submit">Annuler sans PA ni récupération</button></form>';
  }else if(c.guarded)body+='<p>Gardien présent : impossible de démarrer.</p>';
  else if(d.cooldownMs>0)body+='<p>Récupération personnelle : '+fmt(d.cooldownMs)+'.</p>';
  else{
   body+='<p>Captivité '+esc(c.kind)+' · niveau '+esc(d.level)+' · limite réelle : '+fmt(c.remainingRealMs)+'.</p>';
   body+='<form data-form="soEscapeStart" data-sid="'+esc(sid)+'"><label>QR de l’issue préparée<input name="code" maxlength="128" value="'+esc(code)+'" placeholder="Code du QR, sauf occasion N5"></label><label><input type="checkbox" name="present" required>Je suis au passage autorisé</label><button type="submit">Commencer</button></form>';
  }
 }else if(c)body+='<p>Cette captivité est terminée.</p>';
 else body+='<p>Vous n’avez aucune captivité déclarée par un MJ.</p>';
 return '<section class="panel"><h2>ROG-03 · Évasion</h2>'+body+'<p class="muted">60 / 45 / 45 / 30 / 30 secondes selon niveau ; 1 PA seulement si réussi. Découverte : récupération 10 minutes. Un STOP suspend l’action.</p></section>';
}
export function soEscapeAdminHtml(d,sid){
 const people=d.characters.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
 let caps='';
 for(const c of d.captivities){
  const name=d.characters.find(x=>x.id===c.characterId)?.name??c.characterId;
  caps+='<article class="card"><h3>'+esc(name)+'</h3><p>'+esc(c.kind)+' · '+esc(c.status)+' · '+(c.guarded?'Gardien actif':'Non surveillé')+(c.releaseDue?' · Libération due':'')+'</p>';
  if(c.status==='ACTIVE'){
   caps+='<button type="button" data-action="soEscapeQr" data-sid="'+esc(sid)+'" data-code="'+esc(c.code)+'">Afficher le QR</button>';
   caps+='<form data-form="soEscapeGuard" data-sid="'+esc(sid)+'" data-id="'+esc(c.characterId)+'"><label>Gardien<select name="guarded"><option value="false" '+(!c.guarded?'selected':'')+'>Pas de surveillance</option><option value="true" '+(c.guarded?'selected':'')+'>Gardien présent : découverte</option></select></label><button>Enregistrer</button></form>';
   caps+='<form data-form="soEscapeRelease" data-sid="'+esc(sid)+'" data-id="'+esc(c.characterId)+'"><button>Libérer le personnage</button></form>';
  }
  caps+='</article>';
 }
 return '<div class="narrow"><h1>ROG-03 — Captivités</h1><p>Maximum 20 minutes réelles. Toujours préparer un passage physique sûr ; aucune serrure pilotée par l’application.</p>'
 +'<form class="panel" data-form="soEscapeAdminCreate" data-sid="'+esc(sid)+'"><h2>Déclarer une captivité</h2><label>Personnage<select name="characterId" required>'+people+'</select></label><label>Occasion<select name="kind"><option value="CELL">Cellule / QR serrure</option><option value="ESCORT">Escorte prévue (N3+)</option><option value="OPEN">Occasion MJ sans QR (N5)</option></select></label><label><input type="checkbox" name="guarded">Garde présent</label><label><input type="checkbox" name="safePath" required>Sortie physique sûre prévue</label><label>Motif<input name="reason" maxlength="500" required></label><button>Enregistrer</button></form>'
 +(caps||'<p>Aucune captivité enregistrée.</p>')+'</div>';
}
