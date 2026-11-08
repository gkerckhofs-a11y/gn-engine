import {requireThat} from './validation.mjs';
import {campaignPagesFor,campaignLimits} from './campaigns.mjs';
import {soGroupDefinitionBlockers} from './space-outlaws-group-state.mjs';
import {shopBlockers,moduleOfferValid} from './space-outlaws-shop-state.mjs';
import {isPlaceSearch} from './space-outlaws-search-state.mjs';

const supported=new Set(['group','speciesCatalogue','item','classKit','character','knowledge','fieldTarget','shop','offer','shipModel','port','route','mission']);

// Checks the configuration needed for a new game, independently of existing sessions.
export function soReleaseDefinitionChecks(changes){
 const groups=soGroupDefinitionBlockers(changes).map(d=>({...d,changeId:d.code==='SO_GROUP_DEFINITION_LIMIT'?null:`group_${d.entityId}`}));
 const blockers=[];
 for(const ch of changes)if(ch.operation==='UPSERT'&&ch.type==='item'&&ch.data?.shipModule&&!changes.some(o=>o.operation==='UPSERT'&&o.type==='offer'&&o.data.itemId===ch.entityId&&o.data.buybackPrice===null&&moduleOfferValid({...o.data,item:ch.data},{hiddenCargo:true,towing:true})))blockers.push({code:'SO_SHIP_MODULE_NOT_CONNECTED',detailField:'shipModule',changeId:ch.id,entityId:ch.entityId,message:'Ce module doit être relié à une offre PNJ au tarif canonique de son gabarit, sans rachat. Le montage reste distinct de l’achat.'});
 for(const ch of changes)if(ch.operation==='UPSERT'&&ch.type==='classKit'&&ch.data.bindings.some(b=>changes.some(i=>i.operation==='UPSERT'&&i.type==='item'&&i.entityId===b.itemId&&i.data.shipModule)))blockers.push({code:'SO_MODULE_INITIAL_KIT',detailField:'bindings',changeId:ch.id,entityId:ch.entityId,message:'Un module de vaisseau ne fait pas partie du kit initial. Choisir le modèle canonique de cet élément.'});
 for(const ch of changes)if(ch.operation==='UPSERT'&&!supported.has(ch.type))blockers.push({code:'SO_DOMAIN_NOT_CONNECTED',changeId:ch.id,entityId:ch.entityId,message:`${ch.workshop} : ${ch.type} doit être raccordé au jeu avant publication. Le brouillon reste intact.`});
 for(const ch of changes)if(ch.operation==='UPSERT'&&ch.type==='fieldTarget'&&ch.data?.kind!=='ANALYSIS'&&!isPlaceSearch(ch.data))blockers.push({code:'SO_DOMAIN_NOT_CONNECTED',detailField:'kind',changeId:ch.id,entityId:ch.entityId,message:'Seules les analyses V0.7 et les fouilles de lieux V3.6 sont raccordées au jeu.'});
 const active=changes.filter(ch=>ch.operation==='UPSERT'),knowledge=active.filter(ch=>ch.type==='knowledge'),targets=active.filter(ch=>ch.type==='fieldTarget');
 const maxInitial=Math.max(0,...active.filter(ch=>ch.type==='character').map(ch=>knowledge.filter(k=>Array.isArray(k.data?.initialCharacterIds)&&k.data.initialCharacterIds.includes(ch.entityId)).length));
 if(knowledge.length+2*targets.length+maxInitial+active.filter(ch=>['group','shop','offer','shipModel','port','route','item','mission'].includes(ch.type)).length>440)blockers.push({code:'SO_RUNTIME_LIMIT',entityId:'M6',message:'Trop de définitions et informations initiales pour une activation atomique (440 écritures de définitions maximum). Réduire la version de départ.'});
 return {groupAndShop:[...groups,...shopBlockers(changes)],definitions:blockers};
}

export function soReleaseManifest(changes){
 const entries=[...changes].sort((a,b)=>a.id.localeCompare(b.id)).map(data=>({path:`changes/${data.id}`,data}));
 requireThat(Buffer.byteLength(JSON.stringify(entries))<=campaignLimits.bytes,'SO_RELEASE_LIMIT');
 const pages=campaignPagesFor(entries);requireThat(pages.length>0&&pages.length<=100,'SO_RELEASE_LIMIT');
 return {entries,pages};
}
