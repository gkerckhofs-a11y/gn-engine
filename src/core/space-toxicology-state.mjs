import {gameTime} from './clock.mjs';
export const malaiseId='STAT-MALAISE-01';
export const malaiseAt=(c,time)=>c?.toxicology?.effectId===malaiseId&&c.toxicology.status==='ACTIVE'&&c.toxicology.expiresAtGameMs>time;
export const activeMalaise=(s,c,at)=>s.spaceOutlaws?.toxicologyVersion===1&&malaiseAt(c,gameTime(s.clock,at))?c.toxicology:null;
export const toxicologySummary=(s,c,at)=>!c?.toxicology?null:{status:c.toxicology.status==='ACTIVE'&&!activeMalaise(s,c,at)?'EXPIRED':c.toxicology.status,effectId:c.toxicology.effectId,remainingMs:Math.max(0,c.toxicology.expiresAtGameMs-gameTime(s.clock,at))};
