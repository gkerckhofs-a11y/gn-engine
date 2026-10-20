import {escapeHtml as esc} from './groups.mjs';

const spaces=[['character','Mon personnage','play','◉'],['group','Mon groupe','groups','♟'],['action','Action','action','⚡'],['terminal','Terminal','terminal','▤']];
const stages={PREPARATION:'Préparation',BRIEFING:'Briefing',EN_JEU:'En jeu',PAUSE:'En pause',FINISHED:'Terminée',ARCHIVED:'Archivée'};
const routes={play:'character',skills:'character',bag:'character',wallet:'character',health:'character',infos:'character',knowledge:'character',notes:'character',note:'character',groups:'group',group:'group','group-missions':'group',accounts:'group',account:'group',action:'action',actions:'action',interactions:'action',field:'action',person:'action',discover:'action',terminal:'terminal',market:'terminal',missions:'terminal',mission:'terminal',application:'terminal',bounties:'terminal',bounty:'terminal',contracts:'terminal',contract:'character'};
const href=(path,label,kind='button quiet')=>`<a class="${kind}" href="#/${esc(path)}">${label}</a>`;
const card=(path,title,text)=>`<a class="panel player-card" href="#/${esc(path)}"><h2>${esc(title)} <span aria-hidden="true">→</span></h2><p>${esc(text)}</p></a>`;

export function playerRoute(page,id,token){
 const space=page==='contracts'&&token==='personal'?'character':page==='accounts'&&token!=='groups'?'character':routes[page];
 return space&&/^[A-Za-z0-9_-]{1,128}$/.test(id??'')?{space,page,sessionId:id}:null;
}
export function createPlayerRenderer({version,getVersion,context,route,root}){
 const render=(content,space)=>{if(version===getVersion())root.innerHTML=playerShell(context,space?{...route,space}:route,content);};
 render.current=()=>version===getVersion();
 return render;
}
export function playerShell(d,route,content){
 if(!d?.character||!route)return content;
 const sid=d.session.id,ap=d.actionPoints,h=d.health;
 const sections=[['play','Fiche'],['skills','Compétences'],['bag','Sac'],['infos','Informations'],['notes','Carnet'],['contracts','Missions']];
 const current={wallet:'bag',knowledge:'infos',note:'notes',contract:'contracts',health:'play'}[route.page]??route.page;
 return `<div class="player-shell"><div class="player-session"><p><strong>${esc(d.session.title)}</strong><br><span>${esc(d.character.displayName)} · ${esc(stages[d.session.stage]??d.session.stage)}</span></p><button type="button" class="quiet small" data-action="playerBadge" data-sid="${esc(sid)}" data-id="${esc(d.character.id)}">Mon QR</button></div><nav class="player-nav" aria-label="Espaces joueur">${spaces.map(([key,label,path,icon])=>`<a href="#/${path}/${esc(sid)}" ${route.space===key?'aria-current="page"':''}><span aria-hidden="true">${icon}</span>${label}</a>`).join('')}</nav><div class="player-vitals" aria-label="État du personnage"><span>Niveau ${esc(d.globalLevel??ap?.globalLevel??1)}</span>${ap?`<span><strong>${esc(ap.available)} / ${esc(ap.maximum)} PA</strong>${ap.reserved?` · ${esc(ap.reserved)} engagés`:''}</span><span>Renouvellement : ~${Math.ceil(ap.nextRefillInMs/60000)} min de jeu${d.session.stage==='PAUSE'?' · pause':''}</span>`:''}${h?href(`health/${sid}`,`<strong>${esc(h.hp)} / ${esc(h.maxHp)} PV</strong>${h.convalescenceMs>0?' · convalescence':h.outOfCombat?' · hors combat':''}`,'player-health'):''}<button type="button" class="quiet small" data-action="refresh" aria-label="Actualiser mon espace">↻ Actualiser</button></div>${route.space==='character'?`<nav class="player-subnav" aria-label="Mon personnage">${sections.map(([path,label])=>`<a href="#/${path}/${esc(sid)}${path==='contracts'?'/personal':''}" ${current===path?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`:''}<div class="player-content">${content}</div></div>`;
}

export function groupHomeHtml(d,cards){
 const sid=d.session.id,groups=d.groups??[];
 return `<h1>Mon groupe</h1><p class="lead">Vos affiliations, les informations partagées et vos responsabilités.</p>${groups.length?cards:`<section class="panel"><h2>Vous jouez en indépendant</h2><p>Aucun groupe ne vous est actuellement accessible. Votre personnage et le Terminal restent disponibles.</p>${href(`terminal/${sid}`,'Ouvrir le Terminal')}</section>`}${d.economyEnabled&&groups.some(g=>g.permissions?.readWallet||g.permissions?.payWallet)?`<p>${href(`accounts/${sid}/groups`,'Mes caisses de groupe')}</p>`:''}`;
}
export function groupMissionLink(d){
 return d.group.permissions.representMissions?`<p>${href(`group-missions/${d.session.id}/${d.group.id}`,'Missions de ce groupe')}</p>`:'';
}
export function selectContracts(contracts,kind,id){
 return contracts.filter(c=>!kind||(c.applicant?.kind===kind&&(!id||c.applicant.id===id)));
}
export function walletSummaryHtml(d){
 if(!d)return '';
 return `<section class="panel gold"><h2>Mes crédits</h2><p><strong>${esc(d.account.available)} ${esc(d.currency.unit)}</strong> disponibles · solde total : ${esc(d.account.balance)} ${esc(d.currency.unit)}.</p><div class="row"><button type="button" class="primary" data-action="paymentForm" data-sid="${esc(d.session.id)}" ${!d.canPay||d.account.available===0?'disabled':''}>Donner des crédits</button>${href(`wallet/${d.session.id}`,'Historique des crédits')}</div></section>`;
}
export function terminalHtml(d){
 const sid=d.session.id,r=d.playerRules;
 return `<h1>Terminal</h1><p class="lead">Trouver une mission, faire affaire et consulter les informations de la session.</p><div class="player-cards">${card(`missions/${sid}`,'Petites annonces','Emplois, missions et échanges avec les commanditaires.')}${card(`contracts/${sid}`,'Missions et contrats','Suivre vos accords personnels et ceux des groupes que vous représentez.')}${d.economyEnabled?card(`market/${sid}`,'Marché','Acheter, négocier et gérer vos offres.')+card(`bounties/${sid}`,'Primes ouvertes','Consulter les objectifs et suivre vos preuves.'):''}</div><section class="panel"><h2>Univers de cette session</h2><p class="prose">${esc(d.session.summary||'Aucune présentation publiée pour cette session.')}</p></section><section class="panel"><h2>Informations pratiques</h2><p>${esc([d.session.date,d.session.time,d.session.place].filter(Boolean).join(' · '))}</p><p class="prose">${esc(d.session.practical||'Aucune consigne pratique supplémentaire.')}</p></section><section class="panel"><h2>Règles en vigueur</h2>${r?`<p>État de la session : <strong>${esc(stages[d.session.stage]??d.session.stage)}</strong>. Les valeurs ci-dessous sont celles du dernier chargement.</p>${r.actionPoints?`<h3>Points d’action</h3><p>Renouvellement toutes les ${esc(r.actionPoints.renewalMinutes)} minutes de jeu. Coût de base : ${esc(r.actionPoints.cost)} PA. Récupération personnelle : ${esc(r.actionPoints.cooldownSeconds)} secondes ; patient : ${esc(r.actionPoints.patientCooldownSeconds)} secondes. Une action peut avoir ses propres conditions : son aperçu fait foi. Le temps de jeu est arrêté en pause.</p><p class="muted">Règles PA · version ${esc(r.actionPoints.revision)}</p>`:'<p>Cette session n’utilise pas de points d’action.</p>'}${r.health?`<h3>PV et soins</h3><p>Les dégâts sont déclarés après le combat. ${r.health.returnMode==='MJ'?'Le retour en jeu doit être autorisé par le MJ.':'Un soin ramenant les PV au-dessus de zéro permet le retour en jeu, sous réserve de la convalescence.'}</p><p>Les conditions et fournitures de chaque soin sont affichées avant confirmation.</p>`:''}${r.economy?`<h3>Échanges</h3><p>Monnaie : ${esc(r.economy.name)} (${esc(r.economy.unit)}). Vérifiez le destinataire et le montant avant de confirmer un paiement. Les objets se remettent depuis le sac.</p>`:''}`:'<p>Aucune règle numérique communiquée.</p>'}</section>`;
}

export function actionIntroHtml(sid,cid){
 return `<h1>Action</h1><p class="lead">Rencontrer un personnage, explorer un lieu ou découvrir une information.</p><form class="panel" data-form="playerCode" data-sid="${esc(sid)}"><h2>Ouvrir une cible</h2><p>Scannez son QR avec l’appareil photo de votre téléphone. Vous pouvez aussi coller son lien ou saisir son code ci-dessous.</p><label>Type de cible pour un code saisi<select name="targetKind"><option value="field">Lieu ou installation</option><option value="person">Personnage</option><option value="discover">Information</option></select></label><label>Lien QR ou code<input name="code" required maxlength="2048" autocomplete="off" placeholder="Collez le lien ou saisissez le code"></label><p class="muted">Un lien QR reconnaît automatiquement le type de cible. L’ouverture ne dépense aucun PA.</p><button type="submit" class="primary">Ouvrir la cible</button></form><div class="row">${href(`person/${sid}/${cid}`,'Soins sur moi')}${href(`skills/${sid}`,'Mes compétences')}</div>`;
}
export function playerTargetPath(value,kind,origin,sid){
 const code=String(value??'').trim(),valid=/^[A-Za-z0-9_-]{1,128}$/;
 if(!valid.test(sid)||!['field','person','discover'].includes(kind))throw new Error('Choisissez un type de cible valide.');
 if(valid.test(code))return `${kind}/${sid}/${code}`;
 let u;try{u=new URL(code,origin);}catch{throw new Error('Saisissez un code ou un lien QR de cette session.');}
 const match=/^#\/(field|person|badge|discover)\/([A-Za-z0-9_-]{1,128})\/([A-Za-z0-9_-]{1,128})$/.exec(u.hash);
 if(u.origin!==origin||u.pathname!=='/'||u.search||u.username||u.password||!match||match[2]!==sid)throw new Error('Ce QR doit désigner un lieu, un personnage ou une information de cette session.');
 return `${match[1]==='badge'?'person':match[1]}/${sid}/${match[3]}`;
}
