import {escapeHtml as esc} from './groups.mjs';
import {mediaFigure} from './media.mjs';
export function portraitEditor(c,context){
 return `<form data-form="playerPortrait" data-sid="${esc(context.scopeId)}" data-revision="${c.contentRevision}" class="portrait-editor"><p class="rp">Votre visage accompagne votre identité dans les registres du port.</p><p><em>Choisissez un portrait de personnage. Il sera visible sur votre badge public et dans le répertoire des classes autorisées par le MJ. JPEG, PNG ou WebP, 5 Mo maximum ; cadrage centré au format 3:4.</em></p><label>Portrait d’identité<input type="file" name="portrait" accept="image/jpeg,image/png,image/webp" required></label><div data-portrait-preview class="identity-photo" hidden></div><button type="submit" class="primary">Enregistrer mon portrait</button></form>${c.mediaImages?.portrait?`<form data-form="removePlayerPortrait" data-sid="${esc(context.scopeId)}" data-revision="${c.contentRevision}"><button type="submit" class="quiet">Retirer mon portrait</button></form>`:''}`;
}
export function directoryHtml(d){
 return `<div class="narrow"><h1>Registre des identités</h1><p class="rp lead">Les visages du port défilent sur votre terminal. À vous de reconnaître vos prochains alliés.</p><p><em>Seules les identités publiques des personnages actifs de cette session sont affichées.</em></p><div class="player-cards">${d.characters.map(c=>`<article class="panel"><div class="identity-photo">${mediaFigure(c.portrait,{mode:'public',scope:'session',scopeId:d.sessionId,kind:'character',id:c.id},'portrait')||'<p class="rp">Portrait non déposé</p>'}</div><h2>${esc(c.name)}</h2><p class="rp">${esc(c.profession)}</p><p class="prose">${esc(c.description)}</p></article>`).join('')||'<p><em>Aucune identité publiée.</em></p>'}</div></div>`;
}
export function directorySettingsHtml(d){
 return `<div class="narrow"><a href="#/session/${esc(d.sessionId)}">Régie de session</a><h1>Accès au répertoire</h1><p>Choisissez les classes pouvant consulter les identités publiques. Aucune classe cochée : répertoire fermé aux joueurs. Une compétence secondaire ne donne pas accès au répertoire.</p><form data-form="directorySettings" data-sid="${esc(d.sessionId)}" data-revision="${d.revision}">${d.classes.map(c=>`<label class="check"><input type="checkbox" name="classIds" value="${c.id}" ${d.classIds.includes(c.id)?'checked':''}>${esc(c.label)}</label>`).join('')}<button type="submit" class="primary">Enregistrer les accès</button></form></div>`;
}
export async function portraitBase64(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Choisissez une image JPEG, PNG ou WebP de 5 Mo maximum.');
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
}
