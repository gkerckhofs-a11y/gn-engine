import {gameTime} from './clock.mjs';
import {requireThat} from './validation.mjs';

export const hasSoHealth=s=>s.spaceOutlaws?.healthVersion===1;
export const vitalTime=(s,at)=>gameTime(s.vitalClock,at);
export function survival(s,c,at){
 if(!hasSoHealth(s))return null;
 const remainingMs=c.survival?.deadline==null?null:Math.max(0,c.survival.deadline-vitalTime(s,at));
 return {status:c.survival?.dead?'DEAD':c.hp>0?'ACTIVE':c.survival?.stabilized?'STABILIZED':remainingMs===0?'EXPIRED':'URGENT',remainingMs,safetyStopped:s.safetyStop?.active===true,protection:c.protection??0};
}
// These native person profiles are sealed in the release manifest. Item IDs
// come from the existing M1 class-kit bindings, never from an item name.
export function soCareProfiles(changes){
 const common={publicationState:'PUBLISHED',revision:1,skillId:null,minLevel:0,test:'AUTO',threshold:0,cost:0,cooldownSeconds:0,bonusItems:[],consumable:null,extraConsumables:[],prerequisites:[],durationSeconds:60,durationByLevel:{},continuationSeconds:0,healAmount:0,reviveLevel:0,convalescenceSeconds:600,patientCooldownSeconds:600,successText:'',failureText:''};
 const profiles=[{...common,id:'SO-STABILIZE',kind:'STABILIZE',name:'Secours communs',instructions:'60 secondes continues auprès de la victime, avant la fin de ses cinq minutes de survie. Aucun PA ni consommable. La victime reste à 0 PV.'}];
 for(const [classId,slotId,skillId,patientNature,name] of [['MED','medical-supplies','MED-02','HUMANOID','Soins de terrain'],['MEC','repair-supplies','MEC-02','DROID','Réparation des PV']]){
  const kit=changes.find(ch=>ch.type==='classKit'&&ch.entityId===classId&&ch.operation==='UPSERT');
  const itemId=kit?.data.bindings.find(b=>b.slotId===slotId)?.itemId;
  if(!itemId)continue;
  requireThat(changes.some(ch=>ch.type==='item'&&ch.entityId===itemId&&ch.operation==='UPSERT'&&ch.data.consumable),'CLASS_KIT_INCOMPLETE');
  profiles.push({...common,id:`SO-${skillId}`,kind:'FIELD_CARE',name,skillId,minLevel:1,patientNature,cost:1,healAmount:1,reviveLevel:2,durationSeconds:120,durationByLevel:{1:120,2:105,3:90,4:75,5:60},consumable:{itemId,quantity:1},instructions:'À couvert, sur un patient consentant ou hors combat. +1 PV automatique. À 0 PV : N2 minimum, stabilisation après 60 secondes continues avant échéance, puis 10 minutes de convalescence/recalibrage. Un soin réussi par patient toutes les 10 minutes de jeu ; aucun délai personnel.'});
 }
 return profiles;
}
export function requireSoPatient(s,t,at){
 if(!hasSoHealth(s))return;
 requireThat(!t.survival?.dead,'SO_PATIENT_DEAD');
 if(t.hp===0)requireThat(t.survival?.stabilized||survival(s,t,at).status==='URGENT','SO_SURVIVAL_EXPIRED');
}
export const careTime=(s,a,at)=>a.urgent?vitalTime(s,at):gameTime(s.clock,at);
// A continuous intervention secures the patient at its 60-second milestone.
// Cancellation after that point keeps stabilization, but refunds unspent care.
export function securedPatient(s,a,c,t,at){
 if(!hasSoHealth(s)||!a.urgent||t.hp>0||t.survival?.stabilized||t.survival?.dead)return t;
 if(c.healthRevision!==a.actorHealthRevision||t.healthRevision!==a.targetHealthRevision)return t;
 const securedAt=a.startedVitalMs+60000;
 if(vitalTime(s,at)<securedAt||securedAt>=t.survival?.deadline)return t;
 return {...t,survival:{...t.survival,stabilized:true,stabilizedAt:securedAt},healthRevision:t.healthRevision+1};
}
