import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export const isCharacterCode=value=>typeof value==='string'&&/^[a-z]{3}[0-9]{3}$/i.test(value.trim());
export function codeCandidate(sessionId,characterId,attempt=0){
 let n=Number.parseInt(hash(JSON.stringify([sessionId,characterId,attempt])).slice(0,12),16)%(26**3*1000);
 const digits=String(n%1000).padStart(3,'0');n=Math.floor(n/1000);
 return String.fromCharCode(65+Math.floor(n/676),65+Math.floor(n/26)%26,65+n%26)+digits;
}
// A separate public alias preserves every existing technical ID and QR link.
export function createCharacterCodeService({store,signed,isAdmin,checkSession}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId);
  return store.runTransaction(async tx=>{
   const s=await tx.get(`sessions/${sid}`);requireThat(s&&s.stage!=='ARCHIVED','FORBIDDEN');
   let own=null;
   let staff=false;try{await checkSession(tx,actor,sid);staff=true;}catch(e){if(e.code!=='FORBIDDEN')throw e;}
   if(!staff)own=(await inventoryPlayer(tx,actor,input)).c;
   const base=`characterCodes/${sid}`,byCharacter=`${base}/characters`,byCode=`${base}/codes`;
   if(action==='resolveCharacterCode'){
    requireThat(isCharacterCode(input.code),'INVALID_ID');
    const entry=await tx.get(`${byCode}/${input.code.trim().toUpperCase()}`);
    const c=await tx.get(`sessions/${sid}/characters/${entry?.characterId??documentId(input.code.trim())}`);
    requireThat(c?.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','NOT_FOUND');
    return {characterId:c.id};
   }
   const cid=documentId(input.characterId);requireThat(!own||own.id===cid,'FORBIDDEN');
   const c=await tx.get(`sessions/${sid}/characters/${cid}`);requireThat(c,'NOT_FOUND');
   const old=await tx.get(`${byCharacter}/${cid}`);if(old)return {code:old.code};
   for(let attempt=0;attempt<100;attempt++){
    const code=codeCandidate(sid,cid,attempt),taken=await tx.get(`${byCode}/${code}`);
    if(taken||await tx.get(`sessions/${sid}/characters/${code}`)||await tx.get(`sessions/${sid}/characters/${code.toLowerCase()}`))continue;
    const entry={code,characterId:cid,sessionId:sid};
    tx.set(`${byCode}/${code}`,entry);tx.set(`${byCharacter}/${cid}`,entry);return {code};
   }
   requireThat(false,'CHARACTER_CODE_UNAVAILABLE');
  });
 };
}
