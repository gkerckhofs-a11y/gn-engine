import {escapeHtml as esc} from './groups.mjs';
import {skillLevel} from './player-capabilities.mjs';
import {analysisSkills,analysisProfile} from '../src/shared/space-outlaws-analysis.mjs';
import {playerTargetPath} from './player-spaces.mjs';

// Presentation of implemented native workflows only. Never grants a server permission.
export function actionMenuItems(own,context={}){
 const flags=own.session.spaceOutlaws??{},items=[],add=(id,title,group,mode,extra={})=>items.push({id,title,group,mode,...extra});
 if(!flags.actionsVersion)return items;
 if(flags.healthVersion===1&&skillLevel(own.character,'ROG-01')>0)add('ROG-01','Neutralisation furtive · après la scène','Techniques physiques','physical-report',{skill:'ROG-01',fixed:true,cost:0,description:'Enregistrer une tentative déjà annoncée et consulter sa récupération, à l’abri.'});
 if(flags.searchVersion===1)add('search','Fouiller un lieu','Actions communes','field',{kind:'SEARCH',cost:1,description:'Chercher les trouvailles accessibles sur place.'});
 add('discover','Examiner un élément interactif','Actions communes','discover',{description:'Ouvrir une information accessible avec son code.'});
 if(flags.personLootVersion===1){add('loot-common','Fouiller un personnage','Actions communes','person',{kind:'LOOT_COMMON',cost:1,description:'À couvert, sur une cible hors combat ou capturée ; une unité choisie par la victime.'});if(skillLevel(own.character,'TRA-02')>0)add('TRA-02','Fouille méthodique','Analyses','person',{kind:'LOOT_METHODICAL',skill:'TRA-02',cost:1,description:'Choisir une unité pillable ; révéler les caches de niveau égal ou inférieur.'});}
 if(flags.concealmentVersion===1&&skillLevel(own.character,'DISSIMULATION')>0)add('DISSIMULATION','Dissimuler un objet','Discrétion','person',{kind:'CONCEAL',skill:'DISSIMULATION',self:true,cost:1,description:'Choisir une unité admissible du sac et préparer sa cache à couvert.'});
 if(flags.fictionalTracesVersion===1)for(const [skill,title,traceMode] of [['FIL-01','Pister une interaction','TRACK'],['EFF-01','Effacer une trace','ERASE']])if(skillLevel(own.character,skill)>0)add(skill,title,'Traces fictives','field',{skill,traceMode,kind:'ANALYZE',cost:1,description:'Identifier le point de jeu autorisé. Les journaux techniques restent confidentiels et intacts.'});
 if(flags.toxicologyVersion===1&&skillLevel(own.character,'TOXI-01')>0){add('TOXI-01-craft','Fabriquer une dose','Toxicologie','person',{skill:'TOXI-01',kind:'TOXI_CRAFT',self:true,cost:1,description:'Choisir une recette connue, identifier son laboratoire et réserver les composants.'});add('TOXI-01-treat','Traiter une intoxication','Toxicologie','person',{skill:'TOXI-01',kind:'TOXI_TREAT',cost:1,description:'Identifier le patient puis la substance et utiliser un antidote compatible.'});}
 if(flags.medicalDiagnosisVersion===1&&skillLevel(own.character,'MED-01')>0)add('MED-01','Diagnostic médical','Soins et secours','person',{skill:'MED-01',kind:'DIAGNOSIS',cost:1,description:'Identifier le patient ; une minute à couvert pour examiner ses états fictifs.'});
 if(flags.healthVersion===1){
  add('stabilize','Porter les premiers secours','Soins et secours','person',{kind:'STABILIZE',cost:0,urgent:true,description:'Rester auprès d’une victime pour la stabiliser, sans consommable.'});
  for(const [skill,title,group] of [['MED-02','Soigner un personnage','Soins et secours'],['MEC-02','Réparer un droïde','Technique et mécanique'],['ENTRETIEN_PROTECTION','Restaurer une protection','Technique et mécanique']])if(skillLevel(own.character,skill)>0)add(skill,title,group,'person',{skill,kind:skill==='ENTRETIEN_PROTECTION'?'PROTECTION':'FIELD_CARE',cost:1,urgent:skill!=='ENTRETIEN_PROTECTION',description:'Choisir le bénéficiaire ; le matériel compatible et les conditions seront vérifiés.'});
 }
 if(flags.healthVersion===1&&skillLevel(own.character,'MED-03')>=2&&skillLevel(own.character,'MED-02')>=2)for(const [kind,key,label] of [['CLINIC_SAFE','safe','sûr'],['CLINIC_FAST','fast','accéléré']])add(`MED-03-${key}`,`Traitement clinique ${label}`,'Soins et secours','person',{skill:'MED-03',kind,minLevel:2,cost:1,urgent:true,description:'Choisir le patient et la clinique équipée ; trousse médicale et bacta requis.'});
 if(flags.workshopVersion===1&&flags.healthVersion===1&&skillLevel(own.character,'MEC-02')>=2&&skillLevel(own.character,'MEC-01')>=2)for(const [kind,key,label] of [['CLINIC_SAFE','safe','sûre'],['CLINIC_FAST','fast','accélérée']])add(`MEC-02-workshop-${key}`,`Révision intégrale ${label}`,'Technique et mécanique','person',{skill:'MEC-02',kind,minLevel:2,cost:1,urgent:true,description:'Choisir le droïde et l’atelier équipé ; composant compatible et lot de pièces de 50 Cr requis.'});
 if(flags.sabotageVersion===1){if(skillLevel(own.character,'SABOTAGE')>0)add('SABOTAGE','Saboter une installation','Technique et mécanique','field',{skill:'SABOTAGE',kind:'SABOTAGE',cost:1,description:'Installation simple ou protégée préparée par le MJ ; cinq minutes et un kit au jet.'});if(skillLevel(own.character,'MEC-02')>=2)add('MEC-02-restart','Remettre une installation en service','Technique et mécanique','field',{skill:'MEC-02',kind:'REPAIR',cost:1,minLevel:2,description:'Lever une neutralisation temporaire : trois minutes, sans pièces ni restauration de PV.'});}
 if(flags.merchantNegotiationVersion===1&&skillLevel(own.character,'COU-02')>0)add('COU-02','Négociation commerciale','Commerce','field',{skill:'COU-02',kind:'ANALYZE',cost:1,description:'Identifier une offre négociable du comptoir ; 120 secondes pour une remise de 10 %.'});
 for(const [skill,title] of analysisSkills){if(skillLevel(own.character,skill)<1||skill==='COU-03'&&flags.merchantContactsVersion!==1||skill==='COU-01'&&flags.merchantAnalysisVersion!==1||skill==='PIL-01'&&flags.routeAnalysisVersion!==1)continue;const p=analysisProfile(skill);add(skill,title,skill==='MEC-01'?'Technique et mécanique':skill==='PIL-01'?'Pilotage et navigation':'Analyses','field',{skill,kind:'ANALYZE',routeCode:skill==='PIL-01',cost:p.cost,description:`${p.durationByLevel[skillLevel(own.character,skill)]??p.durationSeconds} secondes sur une cible préparée et accessible.`});}
 for(const [skill,flag,title,mode] of [['INF-01','inf01Version','Tenter une intrusion','intrusion'],['INF-02','inf02Version','Déchiffrer un document','decryption'],['INF-03','inf03Version','Falsifier un document','forgery'],['ROG-02','pickpocketVersion','Tenter un vol à la tire','pickpocket'],['ROG-03','escapeVersion','Tenter une évasion','escape']])if(flags[flag]===1&&skillLevel(own.character,skill)>0)add(skill,title,skill.startsWith('INF')?'Informatique':'Discrétion',mode,{skill,cost:1,description:skill==='ROG-02'?'Au poste organisation, avec l’identité fictive de la cible.':skill==='ROG-03'?'Depuis une captivité et une issue préparées par l’organisation.':skill==='INF-02'?'Choisir parmi les documents chiffrés déjà obtenus.':'Sur une cible préparée et autorisée.'});
 if(flags.navigationVersion===1&&skillLevel(own.character,'PIL-01')>0)add('flight','Préparer un vol','Pilotage et navigation','ship',{description:'Choisir un vaisseau autorisé puis préparer son départ.'});
 if(flags.logisticsVersion===1&&skillLevel(own.character,'MEC-02')>=2)add('maintenance','Mes interventions sur vaisseaux','Technique et mécanique','maintenance',{skill:'MEC-02',minLevel:2,description:'Ouvrir les interventions proposées et les accords à confirmer.'});
 if(flags.moduleMandatesVersion===1&&skillLevel(own.character,'MEC-03')>0)add('modules','Mes travaux de modules','Technique et mécanique','modules',{skill:'MEC-03',description:'Ouvrir les mandats et travaux autorisés sur les modules.'});
 if(context.person?.skills?.length)add('aid','Proposer mon aide','Coopération','aid',{cost:0,description:'Choisir un allié et l’une de vos compétences admissibles.'});
 return items.map(item=>({...item,level:item.skill?skillLevel(own.character,item.skill):null,blocked:actionBlocked(item,own,context)}));
}
export function actionBlocked(item,own,context={}){
 const h=own.health??{},stage=own.session.stage;
 if(h.safetyStopped)return 'Jeu suspendu par un STOP sécurité.';
 if(item.mode==='physical-report')return ['EN_JEU','PAUSE'].includes(stage)?null:'Enregistrement disponible pendant le jeu ou une pause ordinaire.';
 if(h.status==='DEAD')return 'Votre personnage est décédé.';
 if(stage!=='EN_JEU'&&!(stage==='PAUSE'&&item.urgent))return 'Disponible pendant le jeu.';
 if(h.toxicology?.status==='ACTIVE')return 'Malaise en cours : aucune compétence active ni combat pendant cet état.';
 if(item.mode==='discover')return null;
 if(h.outOfCombat||h.hp===0)return 'Votre personnage est hors combat.';
 if((context.person?.convalescenceMs??h.convalescenceMs??0)>0)return 'Convalescence en cours.';
 if(context.escape?.captivity?.status==='ACTIVE'&&item.mode!=='escape')return 'Votre personnage est captif.';
 if(item.mode==='escape'&&context.escape?.captivity?.status!=='ACTIVE')return 'Aucune captivité active déclarée.';
 const open=['ACTIVE','CONTINUING','AWAITING_PICK','AWAITING_HANDOVER','RUNNING','CHOOSING'];
 if([...(context.field?.actions??[]),...(context.person?.actions??[])].some(a=>open.includes(a.status))||[context.pickpocket?.active,context.escape?.active,context.decryption?.active].some(a=>a&&open.includes(a.status)))return 'Une action est en cours. Retrouvez-la ci-dessous.';
 const state=context[item.mode];if(state?.cooldownMs>0)return `Récupération : ${Math.ceil(state.cooldownMs/1000)} secondes de jeu.`;
 if(own.actionPoints&&item.cost>own.actionPoints.available)return 'PA disponibles insuffisants.';
 return null;
}
export function actionMenuHtml(own,context){
 const items=actionMenuItems(own,context),sid=own.session.id,groups=[...new Set(items.map(i=>i.group))];
 return `<h1>Mes actions</h1>${own.session.spaceOutlaws?.fictionalTracesVersion===1?`<a class="button quiet" href="#/trace-consents/${esc(sid)}">Mes accords de brouillage</a>`:''}${own.session.spaceOutlaws?.toxicologyVersion===1?`<a class="button quiet" href="#/toxicology/${esc(sid)}">Mes doses et activation d’un objet fictif</a>`:''}<p class="rp lead">Choisissez votre action, puis sa cible.</p><div class="row"><button class="quiet" data-action="refresh">Actualiser</button><button class="quiet" data-action="actionHistory">Mes actions en cours et historique</button></div><section aria-label="Mes capacités"><h2>Mes capacités</h2>${groups.map(group=>`<section class="action-family"><h3>${esc(group)}</h3><div class="action-menu-grid">${items.filter(i=>i.group===group).map(i=>`<a class="panel action-choice ${i.blocked?'is-blocked':''}" href="#/act/${esc(sid)}/${esc(i.id)}" ${i.blocked?'aria-disabled="true" tabindex="-1"':''}><strong>${esc(i.title)}</strong><p>${esc(i.description)}</p>${i.skill?`<small>${esc(i.skill)} · ${i.fixed?'Technique acquise':`niveau ${i.level}`}${i.minLevel?` · N${i.minLevel} requis`:''}</small>`:''}<p>${i.cost===undefined?'Coût et matériel : selon le protocole':`${i.cost} PA${['pickpocket','escape'].includes(i.mode)?' seulement si l’effet prévu se produit':''}`}</p><span class="action-status">${esc(i.blocked??(['field','person','discover','intrusion','forgery'].includes(i.mode)?'Action contextuelle · scanner ou saisir un code':i.mode==='ship'?'Choisir un vaisseau':'Ouvrir le parcours'))}</span></a>`).join('')}</div></section>`).join('')}</section>`;
}
export function actionTargetHtml(sid,item){return `<h1>${esc(item.title)}</h1><p>Votre choix est conservé. Identifiez la cible pour vérifier les conditions.</p><form class="panel" data-form="actionTarget" data-sid="${esc(sid)}" data-intent="${esc(item.id)}"><label>${item.id==='TRA-03'?'QR du document ou code DOC:identifiant (ou code du point d’analyse)':item.routeCode?'Code de la liaison':item.mode==='person'?'QR ou ID du personnage':'QR ou code de la cible'}<input name="code" required maxlength="2048" autocomplete="off" autofocus></label><button class="primary">Vérifier cette cible</button></form><a href="#/action/${esc(sid)}">Retour à mes actions</a>`;}
export function selectedTargetPath(raw,item,origin,sid){
 if(item.id==='TRA-03'){const code=String(raw).trim(),explicit=/^DOC:([A-Za-z0-9_-]{1,128})$/i.exec(code);if(explicit)return `?document=${explicit[1]}`;try{const u=new URL(code,origin),m=/^#\/act\/([A-Za-z0-9_-]{1,128})\/TRA-03\?document=([A-Za-z0-9_-]{1,128})$/.exec(u.hash);if(m&&u.origin===origin&&u.pathname==='/'&&!u.search&&!u.username&&!u.password&&m[1]===sid)return `?document=${m[2]}`;}catch{}}
 if(item.routeCode){const code=String(raw).trim();if(!/^[A-Za-z0-9_-]{1,128}$/.test(code))throw Error('Saisissez le code de la liaison indiqué au spatioport.');return code;}
 const kind=item.mode==='person'?'person':item.mode;
 const path=playerTargetPath(raw,kind,origin,sid),[found,,target]=path.split('/');
 if(found!==kind&&!(item.traceMode&&['field','intrusion','forgery'].includes(found)))throw Error('Ce code ne correspond pas au type de cible de l’action choisie.');
 return target;
}
export function focusActionTarget(item,d){
 const profiles=d.profiles.filter(p=>p.kind===item.kind&&(!item.skill||p.skillId===item.skill)&&(p.qualified!==false));
 return {...d,profiles};
}
export function actionTargetUnavailable(sid){return `<p role="status">Cette cible ne propose pas l’action choisie à votre personnage. Aucun PA n’a été dépensé.</p><a href="#/action/${esc(sid)}">Mes actions</a>`;}
// An automatic preview is read-only. Never submit a start/finish form here.
export function previewSelectedAction(root){
 const form=root.querySelector('[data-field-form="prepare"], [data-person-form="prepare"]');if(!form)return;
 if((root.querySelectorAll?.('[data-field-form="prepare"], [data-person-form="prepare"]')?.length??1)>1)return;
 if(form.querySelector('[name="tradeQuantity"], [name="concealLotId"], [name="laboratoryId"], [name="substanceId"]'))return;
 for(const select of form.querySelectorAll('select')){
  if(select.options.length===1)select.selectedIndex=0;
  if((select.name.startsWith('supply_')||select.name==='consumableLotId')&&!select.options.length){const p=root.ownerDocument.createElement('p');p.textContent='Fourniture compatible absente de votre sac.';form.append(p);form.querySelector('button.primary').disabled=true;return;}
 }
 const button=form.querySelector('button.primary');if(button?.disabled)return;
 form.requestSubmit();
}
