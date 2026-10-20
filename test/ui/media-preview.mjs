// Isolated browser fixture. No production account, endpoint or data.
import {createMediaController} from '../../web/media.mjs';
const images=[{id:'portrait',name:'Portrait de la messagère',category:'Personnage',universe:'Port-Brèche',tags:['portrait','messagère'],credit:'Recette fictive',width:640,height:480,bytes:40000,status:'READY',usageCount:2,revision:1,createdAt:3},{id:'objet',name:'Boussole ancienne',category:'Objet',universe:'Port-Brèche',tags:['navigation'],credit:'',width:640,height:480,bytes:30000,status:'READY',usageCount:0,revision:1,createdAt:2},{id:'mission',name:'Plan du comptoir',category:'Mission',universe:'Port-Brèche',tags:['briefing'],credit:'',width:640,height:480,bytes:60000,status:'READY',usageCount:0,revision:1,createdAt:1}];
const fixtures=JSON.parse(document.querySelector('#fixture-images').textContent),events=[];
const ctx={sessionId:'session-test'};
async function api(action,input={}){
  events.push(action);document.querySelector('#calls').textContent=events.slice(-8).join(' → ');
  if(action==='mediaCatalog'){const list=images.filter(a=>a.status===(input.status??'READY')&&(!input.search||a.name.toLowerCase().includes(input.search.toLowerCase()))&&(input.usage==='used'?a.usageCount>0:input.usage==='unused'?a.usageCount===0:true));return {images:list,total:list.length,next:null,quota:{bytes:130000,pendingBytes:0,count:images.length},limits:{storedBytes:536870912,images:1000},storageConfigured:true};}
  if(action==='mediaRead')return {mime:'image/png',data:fixtures[input.mediaId??'portrait']??fixtures.portrait};
  if(action==='mediaTargets')return {title:'Recette Port-Brèche',targets:[{scope:'session',scopeId:'session-test',kind:'character',id:'c1',slot:'portrait',label:'La messagère · portrait public',mediaId:'portrait'},{scope:'session',scopeId:'session-test',kind:'item',id:'i1',slot:'illustration',label:'Boussole · illustration',mediaId:null},{scope:'session',scopeId:'session-test',kind:'announcement',id:'a1',slot:'briefing',label:'Retrouver le navire · briefing privé',mediaId:null}]};
  if(action==='prepareMediaAssignments')return {confirmation:'test',preview:input.targets.map(t=>({target:t,name:t.id,slot:t.slot,before:null,after:t.mediaId?{id:t.mediaId,version:1}:null,afterName:images.find(a=>a.id===t.mediaId)?.name??'Sans image',sessionStage:'EN_JEU'}))};
  if(action==='assignMedia')return {updated:input.targets.length};
  if(action==='prepareMediaRemoval')return {confirmation:'test',rows:images.filter(a=>input.ids.includes(a.id)).map(a=>({...a,usages:a.usageCount?[{scope:'session',scopeId:'session-test',path:'sessions/session-test/characters/c1',immutable:false},{scope:'scenario',scopeId:'scenario-test',path:'scenarios/scenario-test/versions/v1/characters/c1',immutable:true}]:[],otherUsages:0}))};
  if(action==='trashMedia'||action==='restoreMedia'){for(const a of images.filter(a=>input.ids.includes(a.id))){a.status=action==='trashMedia'?'TRASHED':'READY';a.purgeAfter=action==='trashMedia'?Date.now()+30*86400000:null;}return {};}
  if(action==='mediaMetadata'){Object.assign(images.find(a=>a.id===input.mediaId),input,{tags:input.tags.split(',')});return {};}
  if(action==='mediaCheckFiles')return {duplicates:[]};
  if(action==='mediaCleanup')return {cleaned:0};
  throw new Error(`Fixture does not implement ${action}`);
}
const ui=createMediaController({api,mutate:api,auth:{currentUser:{getIdToken:async()=>'test-only'}},notice:(message)=>document.querySelector('#notice').textContent=message});
await ui.page('session',ctx.sessionId,html=>document.querySelector('#app').innerHTML=html);
