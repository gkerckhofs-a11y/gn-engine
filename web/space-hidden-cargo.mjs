import {escapeHtml as esc} from './groups.mjs';

const kinds={ORDINARY:'Contrôle documentaire',DEEP:'Inspection approfondie'},statuses={ACTIVE:'En cours',COMPLETED:'Terminé',CANCELLED:'Annulé'};
const link=(path,label)=>`<a class="button quiet" href="#/${esc(path)}">${esc(label)}</a>`;
const check=(name,label)=>`<label class="check"><input type="checkbox" name="${name}" required>${label}</label>`;
const reason='<label>Motif<input name="reason" maxlength="500" required></label>';
const select=(name,label,rows)=>`<label>${label}<select name="${name}" required><option value="">Choisir…</option>${rows.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label>`;
const form=(action,p,content,label)=>`<form class="${action.startsWith('cancel')?'customs-cancel':''}" data-form="hiddenCargoCommand" data-command="${action}" data-payload="${esc(JSON.stringify(p))}">${content}<button class="${action.startsWith('cancel')?'quiet':'primary'}">${label}</button></form>`;
const active=d=>d.session.stage==='EN_JEU'&&!d.session.safetyStopped;
const refresh='<button class="quiet" data-action="refresh">Actualiser</button>';
const stop=d=>d.session.safetyStopped?'<p role="status">STOP SÉCURITÉ : attendez la reprise du MJ.</p>':d.session.stage==='PAUSE'?'<p role="status">En pause : les délais de jeu sont suspendus.</p>':'';
const portPolicyLabels={PUBLISHED:'classification publiée du port',NOT_CONFIGURED:'classification non configurée dans ce port',PORT_UNAVAILABLE:'port indisponible',VERSION_MISMATCH:'port d’une autre version de session',SHIP_NOT_DOCKED:'vaisseau non stationné à quai',INVALID_POLICY:'classification du port incohérente'};
const customsStatusLabels={FREE:'libre',REGULATED:'réglementée',PROHIBITED:'interdite',UNKNOWN:'indéterminée'};
const cargoRows=lots=>lots.length?`<ul>${lots.map(l=>`<li>${esc(l.item.name)} · ${esc(l.quantity)} ${esc(l.item.unit??'')}</li>`).join('')}</ul>`:'<p>Aucun nouveau lot découvert par ce contrôle.</p>';
const licenseQuoteForm=d=>'<section class="panel"><h2>Licences douanières · estimation</h2>'
 +'<p>LIC-01 : 100 Cr, licence commerciale permanente sous réserve de révocation. '
 +'LIC-02 : 2 % de la valeur de référence, minimum 50 Cr, pour une cargaison et un voyage. '
 +'LIC-03 : tarif fixé par le MJ pour une mission, des biens et une durée déterminés.</p>'
 +'<p>Cette consultation n’émet pas de licence, ne vérifie pas les documents et ne débite aucun compte. '
 +'Vérifiez la valeur de référence réelle du chargement, pas celle d’un manifeste éventuellement sous-déclaré.</p>'
 +form('customsLicenseQuote',{sessionId:d.session.id},
  select('code','Type de licence',[{id:'LIC-01',name:'LIC-01 · Commerciale'},
   {id:'LIC-02',name:'LIC-02 · Marchandises réglementées'},
   {id:'LIC-03',name:'LIC-03 · Exception MJ'}])
  +'<label>Vaisseau réel (facultatif, LIC-02 uniquement)<select name="shipId"><option value="">Sans rattachement</option>'
  +d.ships.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('')+'</select></label>'
  +'<label>Valeur de référence en Cr (obligatoire uniquement pour LIC-02)'
  +'<input type="number" name="referenceValue" step="1" min="1" inputmode="numeric"></label>',
  'Consulter le tarif canonique')+'</section>';
const scopeForm=q=>{
 const ctx=q.cargoContext;
 if(q.code!=='LIC-02'||ctx?.portPolicy?.status!=='PUBLISHED'||!ctx.sessionId||!ctx.routeChoices?.length)return '';
 const eligible=ctx.lots.filter(l=>l.customsStatus==='REGULATED'&&l.referenceTotalCr!=null&&l.status==='AVAILABLE');
 if(!eligible.length)return '<p>Aucun lot réglementé disponible et valorisé pour un aperçu de périmètre.</p>';
 return '<section class="panel"><h3>Préparer le périmètre LIC-02</h3>'
  +'<p>Sélectionnez les lots entiers présents et une liaison publiée. Un trajet identifié n’est pas encore autorisé par la douane.</p>'
  +form('customsLicenseScopePreview',{sessionId:ctx.sessionId,shipId:ctx.ship.id},
   '<fieldset><legend>Lots envisagés</legend>'+eligible.map(l=>'<label class="check"><input type="checkbox" name="lot_'+esc(l.id)+'"> '+esc(l.name)+' · '+esc(l.quantity)+' '+esc(l.unit)+' · '+esc(l.referenceTotalCr)+' Cr</label>').join('')+'</fieldset>'
   +select('routeId','Liaison publiée envisagée',ctx.routeChoices.map(r=>({id:r.id,name:r.name+' · vers '+r.toPort})))
   +(ctx.applicantChoices?.length?select('applicantCharacterId','Titulaire pressenti (identité uniquement, mandat non établi)',ctx.applicantChoices):'<p>Aucun titulaire actif proposé. L’aperçu sans titulaire ne constitue pas une habilitation.</p>'),
   'Prévisualiser le périmètre')+'</section>';
};
export function customsLicenseScopeHtml(q){
 return '<div class="cargo-customs"><h2>LIC-02 · périmètre proposé (non délivré)</h2>'
  +'<p>Vaisseau : '+esc(q.ship.name)+' · port '+esc(q.ship.portId)+'.</p>'
  +'<p>Liaison M3 identifiée : '+esc(q.route.name)+' ('+esc(q.route.fromPort)+' → '+esc(q.route.toPort)+'). Ce n’est pas une autorisation douanière de voyage.</p>'
  +(q.applicant?'<p>Titulaire pressenti actif : '+esc(q.applicant.name)+' ('+esc(q.applicant.id)+'). Son identité ne vaut pas mandat.</p>':'<p>Aucun titulaire pressenti identifié : mandat non vérifié.</p>')
  +'<h3>Lots réglementés sélectionnés</h3><ul>'+q.selectedLots.map(l=>'<li>'+esc(l.name)+' · '+esc(l.quantity)+' '+esc(l.unit)+' · propriétaire '+esc(l.ownerId)+' · '+esc(l.referenceTotalCr)+' Cr</li>').join('')+'</ul>'
  +(q.ownershipEvidence?.length?'<h3>Propriété et mandats à vérifier</h3><ul>'+q.ownershipEvidence.map(e=>'<li>Lot '+esc(e.lotId)+' · '+esc(e.relation==='DIRECT_OWNER'?'propriété directe du titulaire pressenti':e.relation==='THIRD_PARTY'?'propriétaire différent, mandat nécessaire':e.relation==='NON_PERSONAL_OWNER'?'propriété collective ou commerciale, habilitation à établir':'titulaire non renseigné, droit à établir')+'</li>').join('')+'</ul>':'')
  +(q.shipOwnershipEvidence?'<p>Vaisseau : '+esc(q.shipOwnershipEvidence.relation==='DIRECT_OWNER'?'même propriétaire pressenti':'droit d’utilisation à vérifier séparément')+'. Aucun mandat de pilotage ou d’exploitation n’est attesté.</p>':'')
  +(q.voyageScopeEvidence?'<p>Escale de référence : '+esc(q.voyageScopeEvidence.sourcePortVisitId)+' · Master '+esc(q.voyageScopeEvidence.masterVersionId)+'. Période de validité du permis non définie et voyage non autorisé.</p>':'')
  +'<p>Valeur de référence totale envisagée : <strong>'+esc(q.totalReferenceCr)+' Cr</strong>.</p>'
  +'<p>Tarif LIC-02 indicatif, 2 % avec minimum 50 Cr : <strong>'+esc(q.exactFeeCr.replace('.',','))+' Cr</strong>.</p>'
  +'<p>Titulaire, mandats des propriétaires, autres marchandises et voyage autorisé restent à vérifier. Aucun titre n’est émis, aucun crédit prélevé et aucun lot réservé.</p></div>';
}
export function customsLicenseQuoteHtml(q){
 return '<div class="cargo-customs"><h2>'+esc(q.code)+' · '+esc(q.title)+'</h2>'
  +'<p>Tarif de référence : <strong>'+(q.exactFeeCr===null?'à fixer par le MJ':esc(q.exactFeeCr.replace('.',','))+' Cr')+'</strong>.</p>'
  +(q.referenceValue?'<p>Valeur de référence utilisée : '+esc(q.referenceValue)+' Cr.</p>':'')
  +'<p>Portée : '+esc(q.scope)+'</p>'
  +(q.cargoContext?'<section class="panel"><h3>Fret réel rattaché · lecture MJ</h3>'
    +'<p>Vaisseau : '+esc(q.cargoContext.ship.name)+' · port '+esc(q.cargoContext.ship.portId??'non renseigné')+'.</p>'
    +(q.cargoContext.voyage?'<p>Voyage engagé : '+esc(q.cargoContext.voyage.id)+' · route '+esc(q.cargoContext.voyage.routeId??'non renseignée')+'.</p>':'<p>Aucun voyage engagé : la portée du permis reste à vérifier.</p>')
    +(q.cargoContext.portPolicy?'<p>Politique locale : '+esc(portPolicyLabels[q.cargoContext.portPolicy.status]??'statut inconnu')+'.</p>':'<p>Politique locale non vérifiée.</p>')
    +(q.cargoContext.lots.length?'<ul>'+q.cargoContext.lots.map(l=>'<li>'+esc(l.name)+' · '+esc(l.quantity)+' '+esc(l.unit)+' · '+esc(l.status)+(l.customsStatus?' · régime local : '+esc(customsStatusLabels[l.customsStatus]??'indéterminé'):'')+(l.referenceTotalCr!=null?' · valeur de référence du lot : '+esc(l.referenceTotalCr)+' Cr':'')+(l.referenceUnitValueCr!=null?' · valeur M1 : '+esc(l.referenceUnitValueCr)+' Cr / unité (instantané du lot)':' · valeur M1 absente')+'</li>').join('')+'</ul>':'<p>Aucun lot réel présent en soute.</p>')
    +(q.cargoContext.regulatedKnownSubtotalCr!==undefined?'<p>Lots réglementés explicitement classés : '+esc(q.cargoContext.regulatedLots)+'. Sous-total indicatif des valeurs M1 connues : '+esc(q.cargoContext.regulatedKnownSubtotalCr)+' Cr. '+esc(q.cargoContext.regulatedMissingReference)+' lot(s) réglementé(s) sans valeur ; '+esc(q.cargoContext.unclassifiedLots)+' lot(s) non classé(s) ; '+esc(q.cargoContext.prohibitedLots)+' lot(s) interdit(s).</p>':'')
    +'<p>Ce sous-total ne constitue pas une assiette fiscale certifiée : biens couverts, titulaire, voyage autorisé et paiement restent à vérifier. Aucune licence ni taxe n’est produite.</p></section>':'')
  +scopeForm(q)
  +'<h3>Éléments à vérifier avant toute délivrance</h3><ul>'
  +(q.requiredEvidence??[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'
  +'<p>Cette liste est indicative : aucun élément n’est automatiquement vérifié ou validé par ce devis.</p>'
  +'<p>Aucun crédit n’a été prélevé et aucun titre n’a été délivré. '
  +'Pour LIC-02, les fractions de crédit sont affichées sans arrondi : le règlement et '
  +'la quittance restent à raccorder selon les règles de transaction validées.</p></div>';
}
const controlForm=(d,admin)=>form(admin?'prepareCustomsInspectionAdmin':'prepareCustomsInspection',{sessionId:d.session.id},select('shipId','Vaisseau présent au port',d.ships.filter(s=>s.canInspect!==false))+(admin?select('agentId','Agent PNJ habilité',d.characters.filter(c=>!c.player&&c.authority?.level>=1)):'' )+select('kind','Contrôle',[{id:'ORDINARY',name:'Documentaire · 2 min · 0 PA'},{id:'DEEP',name:`Approfondi · 2 min · ${admin?'0':'1'} PA`}]),'Vérifier le contrôle');

export const hiddenCargoErrors={HIDDEN_CARGO_FULL:'Le volume du lot entier dépasse la place disponible dans le compartiment.',INVALID_CUSTOMS_AUTHORITY:'Choisissez un poste et un niveau de contrôle de 0 à 5.',INVALID_CUSTOMS_KIND:'Choisissez un contrôle documentaire ou une inspection approfondie.',CUSTOMS_ATTEMPT_USED:'Une inspection approfondie a déjà été résolue pour ce vaisseau à cette escale. Une nouvelle tentative exige une décision motivée du MJ.',CUSTOMS_ATTEMPT_UNAVAILABLE:'Aucune tentative à renouveler pour cette escale.',CUSTOMS_INSPECTION_CLOSED:'Ce contrôle est fermé ou ses réservations ont changé. Actualisez.',CUSTOMS_NOT_READY:'Le délai de deux minutes de jeu n’est pas terminé.',CUSTOMS_RESERVATION:'La réservation de PA ne correspond plus au contrôle. Faites vérifier le dossier par le MJ.',SO_CUSTOMS_LICENSE_KIND:'Choisissez une licence LIC-01, LIC-02 ou LIC-03.',SO_CUSTOMS_LICENSE_VALUE:'LIC-02 exige une valeur de référence entière positive en crédits.',SO_CUSTOMS_LICENSE_SHIP:'Le périmètre demande un vaisseau existant, libre et à quai.',SO_CUSTOMS_LICENSE_SCOPE:'Sélectionnez 1 à 100 lots distincts.',SO_CUSTOMS_LICENSE_POLICY:'Classification publiée absente ou périmée : actualisez.',SO_CUSTOMS_LICENSE_ROUTE:'Liaison invalide ou port de destination incompatible avec la version.',SO_CUSTOMS_LICENSE_LOT:'Lot introuvable en soute. Actualisez.',SO_CUSTOMS_LICENSE_LOT_UNAVAILABLE:'Lot réservé, détenu ou indisponible.',SO_CUSTOMS_LICENSE_NOT_REGULATED:'Seuls les lots explicitement réglementés sont éligibles à LIC-02.',SO_CUSTOMS_LICENSE_VALUE_MISSING:'La valeur de référence M1 de ce lot est absente.',SO_CUSTOMS_LICENSE_APPLICANT:'Le titulaire pressenti doit être un personnage actif de cette session. Cette identité ne crée pas de mandat.'};

export function hiddenCargoHtml(d){
 const sid=d.session.id;
 return `<div class="narrow cargo-customs"><h1>Mon compartiment · ${esc(d.ship.name)}</h1>${stop(d)}${refresh}<section class="panel"><h2>${esc(d.hiddenUsed)} / ${esc(d.hiddenInstalledCapacity??d.hiddenCapacity)} unités dissimulées</h2><p>Le compartiment fait partie des ${esc(d.ship.capacity)} unités de la soute. Il n’ajoute aucun volume. Pendant une neutralisation, les biens déjà rangés restent cachés ; les inspections habituelles restent possibles, mais aucun nouveau rangement. Le rangement porte sur le lot entier ; fractionnez-le d’abord par la manutention habituelle si nécessaire.</p>${d.hiddenCapacity===0&&d.hiddenInstalledCapacity>0?'<p role="status">Compartiment neutralisé : aucun nouveau rangement. Les biens déjà rangés restent cachés.</p>':''}<p>Sortir puis replacer une marchandise déjà découverte ne la rend pas inconnue.</p></section>${d.stock.map(l=>{const volume=l.quantity*l.item.unitVolume,canMove=active(d)&&d.canMove&&l.status==='AVAILABLE'&&Number.isSafeInteger(volume)&&volume>0&&(l.concealed||d.hiddenCapacity-d.hiddenUsed>=volume);return `<article class="panel"><h2>${esc(l.item.name)} · ${esc(l.quantity)} ${esc(l.item.unit??'')}</h2><p>${l.concealed?'Dans le compartiment':'Dans la soute ordinaire'}${l.discovered?' · déjà découvert':''}.</p>${canMove?form('prepareCargoConcealment',{sessionId:sid,shipId:d.ship.id,lotId:l.id,conceal:!l.concealed},'',l.concealed?'Sortir du compartiment':'Ranger dans le compartiment'):''}</article>`;}).join('')||'<p>Aucun lot personnel en soute.</p>'}${link(`hold/${sid}/${d.ship.id}`,'Cargaison et manutention')}${link(`module-mandates/${sid}`,'Accords de modules')}</div>`;
}
export function customsDeskHtml(d){
 return `<div class="narrow cargo-customs"><h1>Poste de douane</h1>${stop(d)}${refresh}<p>Habilitation de contrôle : N${esc(d.level)}. Le contrôle documentaire ne révèle aucun contenu caché inconnu. L’inspection approfondie réserve 1 PA pour deux minutes de jeu ; succès sur 1D6 + niveau ≥ 7.</p><p>Une tentative approfondie par vaisseau et escale, tous agents confondus. Aucun contrôle ne prélève automatiquement taxe ou amende.</p>${active(d)&&d.ships.some(s=>s.canInspect!==false)?controlForm(d,false):'<p>Aucun contrôle ne peut être préparé ici pour le moment.</p>'}${inspectionLinks(d,false)}${link(`cargo/${d.session.id}`,'Soutes et fret')}</div>`;
}
function inspectionLinks(d,admin){return `<section class="panel"><h2>Contrôles suivis</h2>${d.inspections.map(r=>link(`customs-inspection${admin?'-admin':''}/${d.session.id}/${r.id}`,`${r.shipName} · ${kinds[r.kind]} · ${statuses[r.status]}`)).join('')||'<p>Aucun contrôle enregistré.</p>'}</section>`;}
export function customsAdminHtml(d){
 const sid=d.session.id,enabled=!d.session.safetyStopped;
 return `<div class="narrow cargo-customs"><h1>Régie des douanes</h1>${stop(d)}${refresh}<p>L’habilitation organisation N1 à N5 est indépendante des classes et des XP. Le niveau 0 la révoque. Pour un PNJ, le poste choisi détermine le port de ses contrôles.</p>${d.characters.map(c=>`<section class="panel"><h2>${esc(c.name)} · ${c.player?'joueur':'PNJ'}</h2><p>Habilitation : N${esc(c.authority?.level??0)}.</p>${enabled?form('setCustomsAuthority',{sessionId:sid,characterId:c.id,authorityRevision:c.authority?.revision??0},select('level','Niveau',[{id:0,name:'0 · Révoquer'},...Array.from({length:5},(_,i)=>({id:i+1,name:`N${i+1}`}))])+select('portId','Poste douanier',d.ports)+reason,'Enregistrer l’habilitation'):''}</section>`).join('')}${active(d)&&d.ships.some(s=>s.canInspect!==false)&&d.characters.some(c=>!c.player&&c.authority?.level>=1)?`<section class="panel"><h2>Contrôle par un PNJ</h2>${controlForm(d,true)}</section>`:''}<section class="panel"><h2>Nouvelles tentatives</h2><p>Une nouvelle inspection approfondie nécessite un indice nouveau ou une décision MJ motivée. Changer d’agent ne renouvelle pas la tentative.</p>${enabled?d.ships.filter(s=>s.canRetry&&s.attempt?.used&&!s.attempt.retryAuthorized).map(s=>`<article><h3>${esc(s.name)}</h3>${form('authorizeCustomsRetry',{sessionId:sid,shipId:s.id,confirmation:s.confirmation},reason,'Autoriser une nouvelle tentative')}</article>`).join(''):''}</section>${inspectionLinks(d,true)}${enabled?licenseQuoteForm(d):''}${link(`cargo-admin/${sid}`,'Régie du fret')}</div>`;
}
export function customsInspectionHtml(d,admin=false){
 const r=d.inspection,sid=d.session.id,p={sessionId:sid,inspectionId:r.id,confirmation:d.confirmation},suffix=admin?'Admin':'',result=r.result;
 return `<div class="narrow cargo-customs"><h1>${esc(kinds[r.kind])} · ${esc(r.shipName)}</h1>${stop(d)}${refresh}<section class="panel"><h2>${esc(statuses[r.status])}</h2>${r.status==='ACTIVE'?`<p>${esc(r.remainingSeconds)} secondes de jeu restantes. Aucune résolution automatique à l’échéance.</p>`:''}${admin&&!r.pnj?'<p>Seul l’agent joueur peut finaliser son contrôle. La régie peut l’interrompre et restituer ses réservations.</p>':''}${r.canFinish&&(!admin||r.pnj)?form(`finishCustomsInspection${suffix}`,p,check('present','Je suis présent au vaisseau.')+check('performed','Le contrôle a été réellement effectué.'),'Confirmer le contrôle'):''}${r.canCancel?form(`cancelCustomsInspection${suffix}`,p,'<h3>Interruption</h3><p>Aucun résultat ne sera appliqué. Le PA réservé sera libéré.</p>'+reason,'Interrompre le contrôle'):''}${result?r.kind==='ORDINARY'?`<p>Contrôle documentaire attesté, sans nouvelle révélation du compartiment. Cette attestation ne valide ni l’authenticité des documents, ni les licences ou les droits fiscaux.</p><h3>Biens déjà connus</h3>${cargoRows(result.knownCargo)}`:`<p>D6 ${esc(result.roll)} + N${esc(result.level)} = ${esc(result.total)} · ${result.success?'inspection réussie':'seuil non atteint'}.</p><h3>Nouveaux lots découverts</h3>${cargoRows(result.discovered)}${result.knownCargo?.length?'<h3>Lots déjà découverts lors d’un contrôle antérieur</h3>'+cargoRows(result.knownCargo):''}<p>Une découverte ne donne aucun code de coffre et n’autorise aucune saisie automatique.</p>`:''}</section>${link(`customs${admin?'-admin':''}/${sid}`,'Retour aux douanes')}</div>`;
}
export function hiddenCargoConfirmHtml(action,d,p){
 if(action==='prepareCargoConcealment')return `<div class="cargo-customs"><h2>${d.conceal?'Ranger dans le compartiment':'Sortir du compartiment'}</h2><p>${esc(d.name)} · ${esc(d.volume)} unités de volume. ${d.discovered?'La découverte reste enregistrée.':''}</p>${form('setCargoConcealment',{...p,confirmation:d.confirmation},check('present','Je confirme ma présence et le déplacement réel du lot entier.'),'Confirmer le rangement')}</div>`;
 const admin=action==='prepareCustomsInspectionAdmin';
 return `<div class="cargo-customs"><h2>${esc(kinds[d.kind])} · ${esc(d.shipName)}</h2><p>Deux minutes de jeu · ${esc(d.actionPoints)} PA${d.actionPoints?' réservé':''}. Habilitation N${esc(d.level)}.</p>${d.kind==='DEEP'?'<p>Succès sur 1D6 + niveau ≥ 7. Une tentative partagée par vaisseau et escale ; une annulation avant résolution ne la consomme pas.</p>':'<p>Contrôle documentaire sans révélation nouvelle et sans validation automatique de l’authenticité, des licences ou des taxes.</p>'}${form(`startCustomsInspection${admin?'Admin':''}`,{...p,confirmation:d.confirmation},check('present','Je confirme la présence de l’agent au vaisseau.'),'Démarrer le contrôle')}</div>`;
}

// Explicit form protocol: editable fields never include cost, die or authority revision.
const commands=['prepareCargoConcealment','setCargoConcealment','prepareCustomsInspection','prepareCustomsInspectionAdmin','startCustomsInspection','startCustomsInspectionAdmin','finishCustomsInspection','finishCustomsInspectionAdmin','cancelCustomsInspection','cancelCustomsInspectionAdmin','setCustomsAuthority','authorizeCustomsRetry','customsLicenseQuote','customsLicenseScopePreview'];
export function hiddenCargoRequest(action,p,values){
 if(!commands.includes(action))throw Error('Commande de douane inconnue.');
 const next={...p};
 if(action==='customsLicenseQuote'){next.code=values.code;if(values.referenceValue!==undefined&&values.referenceValue!=='')next.referenceValue=Number(values.referenceValue);if(values.shipId!==undefined&&values.shipId!=='')next.shipId=values.shipId;}
 if(action==='customsLicenseScopePreview'){next.routeId=values.routeId;if(values.applicantCharacterId!==undefined&&values.applicantCharacterId!=='')next.applicantCharacterId=values.applicantCharacterId;next.lotIds=Object.keys(values).filter(k=>/^lot_[A-Za-z0-9_-]{1,128}$/.test(k)&&values[k]==='on').map(k=>k.slice(4));}
 if(action.startsWith('prepareCustomsInspection')){next.shipId=values.shipId;next.kind=values.kind;if(action.endsWith('Admin'))next.agentId=values.agentId;}
 if(action==='setCustomsAuthority'){if(!/^[0-5]$/.test(String(values.level??'')))throw Error('Choisissez un niveau de 0 à 5.');next.level=Number(values.level);next.portId=values.portId;}
 if(action.startsWith('cancel')||['setCustomsAuthority','authorizeCustomsRetry'].includes(action))next.reason=values.reason;
 if(action.startsWith('start')||action==='setCargoConcealment'||action.startsWith('finish'))next.present=values.present==='on';
 if(action.startsWith('finish'))next.performed=values.performed==='on';
 return next;
}

// Same controller in the app and bounded DOM tests; authorization stays on the server.
export async function submitHiddenCargo(action,payload,values,hooks){
 const p=hiddenCargoRequest(action,payload,values);
 if(action==='customsLicenseQuote'||action==='customsLicenseScopePreview'){
  const result=await hooks.read(action,p);if(!hooks.isCurrent())return;
  hooks.confirm(action==='customsLicenseQuote'?customsLicenseQuoteHtml(result):customsLicenseScopeHtml(result));return;
 }
 if(action.startsWith('prepare')){const d=await hooks.read(action,p);if(!hooks.isCurrent())return;hooks.confirm(hiddenCargoConfirmHtml(action,d,p));return;}
 const r=await hooks.write(action,p);if(!hooks.isCurrent())return;
 hooks.close();hooks.announce('Opération confirmée. Consultez le dossier actualisé.');
 if(action.startsWith('startCustomsInspection')){hooks.navigate(`#/customs-inspection${action.endsWith('Admin')?'-admin':''}/${p.sessionId}/${r.id}`);return;}
 await hooks.refresh();
}
