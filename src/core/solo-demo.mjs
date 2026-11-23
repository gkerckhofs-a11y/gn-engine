import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {isPreparation} from './preparation-state.mjs';
import {commerceCounters,commerceFuel} from '../shared/commerce-solo.mjs';
export const demoProfiles=[['COM','Combattant','Arden','Korr'],['ROG','Rogue','Jax','Vale'],['TRA','Traqueur','Soren','Drax'],['MED','Médecin','Mira','Sen'],['MEC','Mécano','Tess','Renn'],['PIL','Pilote','Bela','Venn'],['COU','Courtier','Orin','Voss'],['INF','Infiltrateur','Nyx','Sable']].map(([id,label,firstName,lastName])=>({id,label,firstName,lastName}));
const hash=s=>createHash('sha256').update(s).digest('hex');
export function demoActors(creationId){return demoProfiles.map(p=>({...p,uid:`demo_${hash(`${creationId}:${p.id}`)}`}));}
export async function resolveDemoActor({store,actor,input,isAdmin}){
 const sid=documentId(input.demoSession??input.sessionId),d=await store.get(`soloDemos/${sid}`),s=await store.get(`sessions/${sid}`);
 requireThat(isAdmin(actor)&&d?.ownerUid===actor.uid&&s?.ownerUid===actor.uid&&s.stage!=='ARCHIVED','FORBIDDEN');
 requireThat(!input.sessionId||input.sessionId===sid,'FORBIDDEN');
 requireThat(!input.campaignId||input.campaignId===d.campaignId,'FORBIDDEN');
 if(input.tableId){const table=await store.get(`sabaccTables/${documentId(input.tableId)}`);requireThat(table?.mode==='GN'&&table.sessionId===sid,'FORBIDDEN');}
 const p=d.profiles.find(p=>p.id===input.demoRole);requireThat(p,'FORBIDDEN');
 return {uid:p.uid,email:`${p.uid}@example.invalid`,emailVerified:true,provider:'google.com',authTime:d.authTime};
}

export async function prepareCommerceSolo(store,actor,input,now){
 const sid=documentId(input.sessionId),base=`sessions/${sid}`,path=`soloDemos/${sid}`;
 return store.runTransaction(async tx=>{
  const s=await tx.get(base),existing=await tx.get(path);
  requireThat(s?.ownerUid===actor.uid,'FORBIDDEN');
  if(existing){
   requireThat(existing.ownerUid===actor.uid&&existing.kind==='COMMERCE'&&!existing.completed,'INVALID_STATUS');
   return {id:sid,campaignId:existing.campaignId,profiles:existing.profiles};
  }
  requireThat(isPreparation(s)&&s.stage==='PREPARATION'&&s.capacity>=demoProfiles.length&&!s.accepted,'INVALID_STATUS');
  const at=now();
  const [campaign,registrations,invitations]=await Promise.all([
   tx.get(`campaigns/${s.campaignId}`),
   tx.list(`${base}/registrations`),
   tx.list('invitations',['sessionId',sid]),
  ]);
  requireThat(campaign?.ownerUid===actor.uid&&campaign.preparationSessionId===sid&&!registrations.length
   &&!invitations.some(i=>i.purpose==='ADMISSION'&&i.status==='ACTIVE'&&i.expiresAt>at),'INVALID_STATUS');
  const changes=`campaigns/${s.campaignId}/masterDrafts/initial/changes`;
  const offers=[...commerceCounters.flatMap(c=>c.markets.map(m=>({...m,shopId:c.shopId}))),commerceFuel];
  for(const {offerId,shopId,itemId} of offers){
   const change=await tx.get(`${changes}/offer_${offerId}`);
   requireThat(change?.operation==='UPSERT'&&change.data.shopId===shopId&&change.data.itemId===itemId,'COMMERCE_SOLO_MASTER_REQUIRED');
  }
  const profiles=demoActors(`commerce:${sid}`);
  tx.set(path,{kind:'COMMERCE',sessionId:sid,campaignId:s.campaignId,ownerUid:actor.uid,authTime:Math.floor(at/1000),profiles});
  return {id:sid,campaignId:s.campaignId,profiles};
 });
}
