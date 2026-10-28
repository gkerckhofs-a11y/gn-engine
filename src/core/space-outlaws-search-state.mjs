import {documentId,requireThat,whole} from './validation.mjs';
import {searchFindKinds,placeSearchProfile,isPlaceSearch} from '../shared/space-outlaws-search.mjs';
import {abilityLevel} from './abilities.mjs';
import {personalLot} from './inventory-state.mjs';
export {isPlaceSearch};
const check=v=>requireThat(v,'INVALID_PLACE_SEARCH');
const text=(v,max,required=false)=>{check(typeof v==='string'&&v.length<=max&&(!required||v.trim()));return v.trim();};
const number=(v,max,min=0)=>{whole(v,'INVALID_PLACE_SEARCH');check(v>=min&&v<=max);return v;};
export function searchTargetInput(v,id,old={}){
 check(v.kind==='SEARCH'&&v.searchVersion===1&&['DRAFT','READY','PUBLISHED'].includes(v.publicationState));
 const q=v.search;check(q&&typeof q.active==='boolean'&&typeof q.showDifficulty==='boolean');
 const difficulty=number(q.difficulty,12,1),maxAttempts=q.maxAttempts==null?null:number(q.maxAttempts,100,1);
 check(Array.isArray(q.bonuses??[])&&(q.bonuses??[]).length<=10);
 const bonuses=(q.bonuses??[]).map(b=>{check(['SKILL','ITEM'].includes(b.kind));return {id:documentId(b.id),kind:b.kind,sourceId:documentId(b.sourceId),value:number(b.value,12,1),minLevel:b.kind==='SKILL'?number(b.minLevel,5,1):null,rule:text(b.rule,500,true)};});
 check(new Set(bonuses.map(b=>b.id)).size===bonuses.length);
 check(Array.isArray(v.finds)&&v.finds.length<=20);
 const finds=v.finds.map(f=>{check(searchFindKinds.includes(f.kind)&&typeof f.active==='boolean');return {id:documentId(f.id),kind:f.kind,title:text(f.title,150,true),active:f.active,difficulty:f.difficulty==null?null:number(f.difficulty,12,1),quantity:f.kind==='INDICE_A_VOIR'||f.kind==='INDICE_A_PRENDRE'?1:number(f.quantity,1000000,1),knowledgeId:f.kind.startsWith('INDICE_')?documentId(f.knowledgeId):null,itemId:f.kind==='OBJET_A_TROUVER'?documentId(f.itemId):null,characterIds:(f.characterIds??[]).map(documentId)};});
 check(new Set(finds.map(f=>f.id)).size===finds.length&&finds.every(f=>f.characterIds.length<=100));
 return {id,kind:'SEARCH',searchVersion:1,search:{active:q.active,showDifficulty:q.showDifficulty,difficulty,maxAttempts,bonuses},finds,title:text(v.title,150,true),description:text(v.description??'',6000),gmNotes:text(v.gmNotes??'',10000),publicationState:v.publicationState,profiles:{SEARCH:{kind:'SEARCH',...placeSearchProfile(difficulty)}},rewards:[],dependencyId:null,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,revision:(old.revision??0)+1};
}
export function searchBonuses(t,c,lots){
 return t.search.bonuses.flatMap(b=>{
  const lot=b.kind==='ITEM'?lots.find(l=>l.item.id===b.sourceId&&l.quantity>0&&l.status==='AVAILABLE'&&personalLot(l,c.id)):null;
  return (b.kind==='SKILL'?abilityLevel(c,b.sourceId)>=b.minLevel:!!lot)?[{...b,lotId:lot?.id??null}]:[];
 });
}
export const initialSearchState=t=>({epoch:1,attempts:{},finds:Object.fromEntries(t.finds.map(f=>[f.id,{status:f.kind.startsWith('INDICE_')?'AVAILABLE':'UNFUNDED',generation:1,discoveredBy:[],takenBy:null,takenAt:null}]))});
