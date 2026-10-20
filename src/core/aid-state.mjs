import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {abilityLevel} from './abilities.mjs';
import {gameTime} from './clock.mjs';
import {requireGameAction} from './health-state.mjs';
export const aidHash=v=>createHash('sha256').update(v).digest('hex');
export const characterPath=(sid,cid)=>`sessions/${sid}/characters/${cid}`;
export const cooldownPath=(sid,cid,family)=>`${characterPath(sid,cid)}/fieldCooldowns/${aidHash(family)}`;
export async function activeCharacter(tx,sid,cid){
 const c=await tx.get(characterPath(sid,documentId(cid)));requireThat(c?.assignedUid&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','INVALID_RECIPIENT');
 const r=await tx.get(`sessions/${sid}/registrations/${aidHash(c.assignedUid)}`);requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId===c.id,'INVALID_RECIPIENT');return {c,r};
}
export async function prepareAid(tx,s,c,input,p,family,at){
 if(!input.aidOfferId)return null;
 requireThat(p.test==='D6'&&p.skillId,'AID_NOT_ALLOWED');
 const offer=await tx.get(`sessions/${s.id}/aidOffers/${documentId(input.aidOfferId)}`);
 requireThat(offer?.status==='OFFERED'&&offer.recipientId===c.id&&offer.skillId===p.skillId&&offer.recipientUid===c.assignedUid,'AID_UNAVAILABLE');
 const recipient=await activeCharacter(tx,s.id,c.id);requireThat(recipient.r.accessVersion===offer.recipientAccessVersion,'AID_UNAVAILABLE');
 const helper=await activeCharacter(tx,s.id,offer.helperId);
 requireThat(helper.c.id!==c.id&&helper.c.assignedUid===offer.helperUid&&helper.r.accessVersion===offer.accessVersion,'AID_UNAVAILABLE');
 requireGameAction(s,helper.c,'discover',at);requireThat(!helper.c.activeFieldActionId&&!helper.c.activePersonActionId,'FIELD_ACTOR_BUSY');
 requireThat(abilityLevel(helper.c,p.skillId)>=p.minLevel,'FIELD_SKILL_REQUIRED');for(const req of p.prerequisites??[])requireThat(abilityLevel(helper.c,req.skillId)>=req.minLevel,'FIELD_SKILL_REQUIRED');
 const use=await tx.get(cooldownPath(s.id,helper.c.id,family));requireThat((use?.readyAtGameMs??0)<=gameTime(s.clock,at),'COOLDOWN_ACTIVE');
 return {offer,character:helper.c,accessVersion:helper.r.accessVersion};
}
export function reserveAid(tx,s,a,aid,collection){
 if(!aid)return;
 tx.set(characterPath(s.id,aid.character.id),{...aid.character,activeFieldActionId:a.id,activeAidId:aid.offer.id});
 tx.set(`sessions/${s.id}/aidOffers/${aid.offer.id}`,{...aid.offer,status:'ACTIVE',actionId:a.id,collection});
}
export async function checkAid(tx,s,a,at){
 if(!a.aid)return;
 const helper=await activeCharacter(tx,s.id,a.aid.characterId),offer=await tx.get(`sessions/${s.id}/aidOffers/${a.aid.offerId}`);
 requireThat(helper.c.assignedUid===a.aid.uid&&helper.r.accessVersion===a.aid.accessVersion&&helper.c.activeFieldActionId===a.id&&offer?.status==='ACTIVE','AID_UNAVAILABLE');
 requireThat(!(s.healthRules?.enabled&&(helper.c.hp===0||helper.c.outOfCombat))&&!(helper.c.convalescentUntilGameMs>gameTime(s.clock,at)),'OUT_OF_COMBAT');
 requireThat(abilityLevel(helper.c,a.profile.skillId)>=a.profile.minLevel,'FIELD_SKILL_REQUIRED');for(const req of a.profile.prerequisites??[])requireThat(abilityLevel(helper.c,req.skillId)>=req.minLevel,'FIELD_SKILL_REQUIRED');
}
export const aidSnapshot=aid=>aid?{offerId:aid.offer.id,characterId:aid.character.id,name:aid.character.public.displayName,uid:aid.character.assignedUid,accessVersion:aid.accessVersion}:null;
export async function finishAid(tx,s,a,at,{cancel=false,release=true,cooldown=true}={}){
 if(!a.aid)return;
 const path=characterPath(s.id,a.aid.characterId),c=await tx.get(path),offer=await tx.get(`sessions/${s.id}/aidOffers/${a.aid.offerId}`);
 if(!cancel&&cooldown)tx.set(cooldownPath(s.id,a.aid.characterId,a.family),{readyAtGameMs:gameTime(s.clock,at)+a.cooldownSeconds*1000,actionId:a.id});
 if(release){
  if(c?.activeFieldActionId===a.id)tx.set(path,{...c,activeFieldActionId:null,activeAidId:null});
  if(offer)tx.set(`sessions/${s.id}/aidOffers/${offer.id}`,{...offer,status:cancel?'CANCELLED':'FINISHED',finishedAt:at});
 }
}
