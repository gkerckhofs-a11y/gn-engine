import {isDeepStrictEqual} from 'node:util';
import {requireThat} from './validation.mjs';

// Server-only transaction capability, never supplied by a request body.
export const spaceOutlawsTransaction=Symbol('spaceOutlawsBirth');
export function guardSpaceOutlawsEntry(session,pending,authorized){
 if(authorized){
  const next=pending.get(`sessions/${session.id}`);
  requireThat(next?.spaceOutlaws?.ruleProfile==='SPACE_OUTLAWS_V07'&&next.stage==='BRIEFING'&&next.revision===session.revision+1,'SO_BIRTH_CONFLICT');
  return true;
 }
 if(!session?.spaceOutlaws)return false;
 const base=`sessions/${session.id}/`;
 // Entry milestone: only access and briefing receipts may mutate through legacy
 // services. Never reinterpret the canonical instance as a historical scenario.
 for(const [path] of pending){
  if(!path.startsWith(base)&&path!==base.slice(0,-1))continue;
  if(path.startsWith(`${base}audit/`))continue;
  if(path===base.slice(0,-1)){const {revision:beforeRevision,...before}=session,{revision:afterRevision,...after}=pending.get(path);requireThat(afterRevision===beforeRevision+1&&isDeepStrictEqual(before,after),'SO_GAMEPLAY_NOT_OPEN');continue;}
  if(/^registrations\/[a-f0-9]{64}$/.test(path.slice(base.length)))continue;
  requireThat(false,'SO_GAMEPLAY_NOT_OPEN');
 }
 return true;
}
export function guardSpaceOutlawsRegistration(before,after){
 const allowed=new Set(['accessActive','accessVersion','minAuthTime','briefingReadAt','briefingReadRevision']);
 const fixed=x=>Object.fromEntries(Object.entries(x??{}).filter(([k])=>!allowed.has(k)));
 requireThat(before&&isDeepStrictEqual(fixed(before),fixed(after)),'SO_GAMEPLAY_NOT_OPEN');
}
