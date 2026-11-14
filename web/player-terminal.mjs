import {shipCardHtml,shipInvitationHtml} from './ship-workspace.mjs';
import {skillLevel} from './player-capabilities.mjs';
import {escapeHtml as esc} from './groups.mjs';
import {isTracker,isBroker} from '../src/shared/player-access.mjs';
const count=(d,...keys)=>keys.reduce((n,k)=>n+(Array.isArray(d?.[k])?d[k].length:0),0);
const closed=new Set(['CLOSED','CANCELLED','DECLINED','COMPLETED','FINISHED','SETTLED','PAID','RETURNED','REVOKED']);
const active=rows=>(rows??[]).filter(x=>x.status&&!closed.has(x.status)).length;
// Read only the native player projections: no catalogue of private ships or accounts.
export async function loadTerminal(api,own){
 const f=own.session.spaceOutlaws;if(!f)return {};
 const tasks=[['sabacc','sabaccHome',true],['shops','shops',f.shopsVersion===1],['market','market',own.economyEnabled&&isBroker(own.character)],['missions','announcements',f.missionsVersion===1],['contracts','myContracts',f.missionsVersion===1],['intelligence','myIntelligence',f.intelligenceVersion===1],['bounties','bounties',f.bountyVersion===1&&isTracker(own.character)],['ships','myShips',f.navigationVersion===1],['crewInvitations','myShipInvitations',f.navigationVersion===1],['cargo','myCargo',f.logisticsVersion===1],['maintenance','spaceMaintenance',f.logisticsVersion===1],['towing','towingDesk',f.towingWorkVersion===1],['modules','moduleMandates',f.moduleMandatesVersion===1],['combats','spaceCombats',f.combatVersion===1],['rescues','spaceRescues',f.combatVersion===1],['consents','myCustomsConsents',f.hiddenCargoVersion===1],['customs','customsDesk',f.hiddenCargoVersion===1],['receipts','myCustomsSeizures',f.customsDetentionVersion===1],['accounts','myAccounts',own.economyEnabled&&(own.groups??[]).some(g=>g.permissions?.readWallet||g.permissions?.payWallet)]];
 const context={errors:[]};
 await Promise.all(tasks.filter(([, ,enabled])=>enabled).map(async([key,action])=>{
  try{context[key]=await api(action,action==='sabaccHome'?{}:{sessionId:own.session.id});}
  catch(e){if(!['FORBIDDEN','SO_GAMEPLAY_NOT_OPEN','SESSION_CLOSED','SO_CUSTOMS_HOLD_CLOSED','ECONOMY_DISABLED'].includes(e.code))context.errors.push(key);}
 }));
 return context;
}
export function terminalItems(own,d={}){
 const f=own.session.spaceOutlaws??{},sid=own.session.id,items=[];
 const add=(id,title,group,description,rows=[],extra={})=>items.push({id,path:`${id}/${sid}`,title,group,description,pending:active(rows),history:rows.length>0&&active(rows)===0,...extra});
 const shipIds=new Set((d.ships?.ships??[]).map(s=>s.id??s.shipId));
 const outside=rows=>(rows??[]).filter(r=>!r.shipId||!shipIds.has(r.shipId));
 const port='Services du port',special='Mes services spécialisés',assets='Mes biens, vaisseaux et mandats';
 if(f.shopsVersion===1&&count(d.shops,'shops','orders'))add('shops','Boutiques d’objets personnels',port,'Acheter des fournitures et retirer mes commandes.',d.shops.orders);
 if(own.economyEnabled)add('public-prices','Cours publics',port,'Consulter gratuitement les cours publiés.');
 if(own.economyEnabled)add('wallet','Mes crédits',port,`${own.wallet?.account?.available??'—'} crédits disponibles · paiements et historique.`);
 if(isBroker(own.character)&&d.market?.economyEnabled){if(f.itemCircuitsVersion===1)add('galactic','Bourse galactique',port,'Comparer les planètes, acheter à distance et revendre les lots livrés.');else add('market','Centrale commerciale',port,'Cours, achats, ventes et négociations.');}
 if(f.missionsVersion===1&&count(d.missions,'announcements'))add('missions','Missions proposées',port,'Consulter les offres qui me sont accessibles.');
 if(count(d.contracts,'contracts'))add('contracts','Mes contrats',port,'Mes engagements personnels et collectifs.',d.contracts.contracts);
 if(f.intelligenceVersion===1&&count(d.intelligence,'offers'))add('intelligence','Réseau d’informateurs',port,'Consulter les offres et mes renseignements achetés.',d.intelligence.offers);
 if(d.sabacc?.enabled)add('sabacc','Sabacc — Cantina',port,'Rejoindre une table avec son code.',[],{url:own.demo?.table?`/sabacc/?table=${encodeURIComponent(own.demo.table.id)}&key=${encodeURIComponent(own.demo.table.qrToken)}&demoSession=${encodeURIComponent(sid)}&demoRole=${own.demo.selected}`:'/sabacc/'});
 if(own.directoryAllowed)add('directory','Registre des identités',port,'Consulter les identités publiques autorisées.');
 if(f.merchantNegotiationVersion===1&&skillLevel(own.character,'COU-02')>0)add('merchant-negotiation','Négociation commerciale',special,'Ouvrir les offres explicitement négociables des boutiques.',[],{path:`shops/${sid}`});
 if(f.merchantContactsVersion===1&&skillLevel(own.character,'COU-03')>0)add('merchant-contacts','Réseau de contacts',special,'Rechercher une information, un fournisseur, un acheteur ou un contrat préparé.',[],{path:`act/${sid}/COU-03`});
 if(f.merchantAnalysisVersion===1&&skillLevel(own.character,'COU-01')>0)add('merchant-analysis','Expertise marchande',special,'Analyser une marchandise ou une offre préparée.',[],{path:`act/${sid}/COU-01`});
 if(f.bountyVersion===1&&isTracker(own.character)&&d.bounties)add('bounties','Primes ouvertes',special,'Cibles recherchées et suivi de mes preuves.',d.bounties.bounties);
 for(const ship of d.ships?.ships??[])items.push({id:`ship-${ship.id??ship.shipId}`,path:`ship/${sid}/${ship.id??ship.shipId}`,title:ship.name??'Vaisseau',group:'Mes vaisseaux',description:'Ouvrir le vaisseau',ship,pending:ship.operation||ship.journey?1:0});
 if((d.cargo?.holds??[]).some(h=>!shipIds.has(h.location?.id??h.id))||(d.cargo?.transfers??[]).some(t=>![t.source?.id,t.destination?.id].some(id=>shipIds.has(id))))add('cargo','Soutes et fret',assets,'Soutes autorisées et transferts de marchandises.',d.cargo.transfers);
 if(outside(d.maintenance?.jobs).length)add('space-maintenance','Entretien des vaisseaux',assets,'Accorder ou suivre une intervention ; réaliser les travaux autorisés.',d.maintenance.jobs);
 if(outside(d.modules?.jobs).length)add('module-mandates','Travaux de modules',assets,'Mes accords et interventions sur les modules.',d.modules.jobs);
 if(count(d.towing,'jobs')||count(d.towing?.recovery,'jobs'))add('towing','Mes attelages',assets,'Accords, attelages et récupérations qui me concernent.',[...(d.towing.jobs??[]),...(d.towing.recovery?.jobs??[])]);
 if([...(d.combats?.combats??[]),...(d.combats?.ambushes??[])].some(r=>!shipIds.has(r.ownShipId??r.shipId)))add('space-combats','Rencontres spatiales',assets,'Consulter la rencontre et les commandes autorisées.',d.combats.combats);
 if(outside(d.rescues?.rescues).length)add('space-rescues','Assistance spatiale',assets,'Mes offres de dépannage et leur suivi.',d.rescues.rescues);
 if(count(d.consents,'eligible','eligibleShips','consents','shipConsents'))add('customs-consents','Autorisations de transport',assets,'Accorder ou retirer un consentement sur mes biens.',[...(d.consents.consents??[]),...(d.consents.shipConsents??[])],{history:!count(d.consents,'eligible','eligibleShips')&&!active([...(d.consents.consents??[]),...(d.consents.shipConsents??[])])});
 if(d.customs?.level>=1)add('customs','Contrôle douanier',special,'Accès lié à mon habilitation des douanes.',d.customs.inspections);
 if(count(d.receipts,'receipts'))add('customs-receipts','Mes dossiers douaniers',assets,'Reçus, contestations et restitutions de mes marchandises.',d.receipts.receipts);
 if(d.accounts?.accounts?.some(a=>a.kind==='GROUP'))add('accounts','Caisses de groupe',assets,'Consulter ou payer selon mes permissions.',[],{path:`accounts/${sid}/groups`});
 const paused=own.health?.safetyStopped?'Opérations suspendues : STOP sécurité.':own.session.stage==='PAUSE'?'Jeu en pause : consultation disponible.':null;
 return items.map(i=>({...i,state:i.history?'READ_ONLY':paused?'BLOCKED':'AVAILABLE',reason:i.history?'Historique consultable.':paused??'Ouvrir le service'}));
}
export function personalTerminalHtml(own,d={}){
 const items=terminalItems(own,d),groups=['Mes vaisseaux','Services du port','Mes services spécialisés','Mes biens, vaisseaux et mandats'];
 const card=i=>i.ship?shipCardHtml(own.session.id,i.ship):`<a class="panel player-card terminal-card" href="${esc(i.url??`#/${i.path}`)}" data-terminal="${esc(i.id)}" data-state="${i.state}"><h3>${esc(i.title)} <span aria-hidden="true">→</span></h3><p>${esc(i.description)}</p>${i.pending?`<strong>${i.pending} dossier(s) à suivre</strong>`:''}<small>${esc(i.reason)}</small></a>`;
 return `<h1>Terminal</h1><p class="rp lead">Vos comptoirs, vos services et vos opérations au port.</p><button class="quiet" data-action="refresh">Actualiser mes services</button>${d.errors?.length?'<p role="status">Certains services n’ont pas pu être vérifiés. Actualisez pour réessayer.</p>':''}${(d.crewInvitations?.invitations??[]).filter(p=>p.status==='PENDING'||p.status==='STALE').map(p=>shipInvitationHtml(own.session.id,p)).join('')}${groups.filter(g=>items.some(i=>i.group===g)).map(g=>`<section class="terminal-family"><h2>${esc(g)}</h2><div class="player-cards">${items.filter(i=>i.group===g).sort((a,b)=>b.pending-a.pending).map(card).join('')}</div></section>`).join('')}${!items.length?'<p>Aucun service accessible actuellement.</p>':''}`;
}
