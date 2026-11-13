import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
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
