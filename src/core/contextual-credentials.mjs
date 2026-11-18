import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {personalLot} from './inventory-state.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export const localCodeDigest=(terminalId,code)=>hash(JSON.stringify([terminalId,code]));
export const credentialView=c=>({id:c.id,terminalId:c.terminalId,kind:c.kind,name:c.name,active:c.active,revision:c.revision,characterId:c.characterId??null,lotId:c.lotId??null});
export async function localCredentialAllowed(tx,{s,c},terminal,rule,presence,code=null){
 const ids=rule.credentialIds??[];if(!ids.length)return true;
 const values=[];
 for(const id of ids){
  const g=await tx.get(`localAccess/${s.id}/credentials/${id}`);let ok=false;
  if(g?.active&&g.terminalId===terminal.id){
   if(g.kind==='LICENSE')ok=g.characterId===c.id;
   if(g.kind==='CODE')ok=presence?.codeProofs?.[g.id]===g.revision||typeof code==='string'&&localCodeDigest(terminal.id,code)===g.codeDigest;
   if(g.kind==='KEY'){const lot=await tx.get(`sessions/${s.id}/inventory/${g.lotId}`);ok=!!lot&&lot.quantity===1&&lot.item.kind==='INDIVIDUAL'&&lot.status==='AVAILABLE'&&personalLot(lot,c.id);}
  }
  values.push(ok);
 }
 return rule.credentialMode==='ANY'?values.some(Boolean):values.every(Boolean);
}
export async function saveLocalCredential({tx,s,input,actor,at,eventId}){
 admissionKeys(input,['sessionId','terminalId','credential','revision','requestId']);const terminalId=documentId(input.terminalId),b=`localAccess/${s.id}`,t=await tx.get(`${b}/terminals/${terminalId}`);requireThat(t,'NOT_FOUND');
 const v=input.credential;requireThat(v&&typeof v==='object','INVALID_LOCAL_CREDENTIAL');admissionKeys(v,['id','kind','name','active','characterId','lotId','code']);
 const id=documentId(v.id),old=await tx.get(`${b}/credentials/${id}`);requireThat(!old||old.terminalId===terminalId,'FORBIDDEN');
 requireThat(['LICENSE','CODE','KEY'].includes(v.kind)&&typeof v.name==='string'&&v.name.trim()&&v.name.length<=160&&typeof v.active==='boolean','INVALID_LOCAL_CREDENTIAL');
 const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify(['saveLocalCredential',input])),prior=await tx.get(op);
 if(prior){requireThat(prior.fingerprint===hash(fingerprint),'REQUEST_ID_REUSED');return prior.result;}
 requireThat((old?.revision??0)===input.revision,'STALE_REVISION');
 const all=await tx.list(`${b}/credentials`,null,{limit:501});requireThat(old||all.length<500,'LOCAL_LIMIT');
 const next={id,terminalId,kind:v.kind,name:v.name.trim(),active:v.active,revision:(old?.revision??0)+1};
 if(v.kind==='LICENSE'){next.characterId=documentId(v.characterId);requireThat(await tx.get(`sessions/${s.id}/characters/${next.characterId}`),'NOT_FOUND');requireThat(!v.lotId&&!v.code,'INVALID_LOCAL_CREDENTIAL');}
 if(v.kind==='KEY'){next.lotId=documentId(v.lotId);const lot=await tx.get(`sessions/${s.id}/inventory/${next.lotId}`);requireThat(lot?.quantity===1&&lot.item.kind==='INDIVIDUAL','LOCAL_KEY_REQUIRED');requireThat(!v.characterId&&!v.code,'INVALID_LOCAL_CREDENTIAL');}
 if(v.kind==='CODE'){
  requireThat(!v.characterId&&!v.lotId,'INVALID_LOCAL_CREDENTIAL');
  if(v.code==null||v.code===''){requireThat(old?.kind==='CODE','INVALID_LOCAL_CREDENTIAL');next.codeDigest=old.codeDigest;}
  else {requireThat(typeof v.code==='string'&&v.code.length>=4&&v.code.length<=100&&v.code.trim()===v.code,'INVALID_LOCAL_CREDENTIAL');next.codeDigest=localCodeDigest(terminalId,v.code);}
 }
 // Neither clear codes nor their digests enter the audit or response.
 const result=credentialView(next);tx.set(`${b}/credentials/${id}`,next);tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action:'saveLocalCredential',credentialId:id,terminalId,actorUid:actor.uid,active:next.active,revision:next.revision,before:old?credentialView(old):null,after:result});tx.set(op,{fingerprint:hash(fingerprint),result});
 // Store only a double hash of the request fingerprint: a shared code is never persisted verbatim.
 return result;
}
