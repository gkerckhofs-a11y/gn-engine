import {gameTime} from './clock.mjs';
// The point is a single shared reserve. A disabled module does not absorb damage,
// but neutralization or damage never manufactures or silently spends that reserve.
export function effectiveDroidProtection(s,c,at){
 const value=c.protection??0;
 if(s.spaceOutlaws?.droidModulesVersion!==1||!c.protectionSourceLotId)return value;
 const m=c.droidModules?.find(m=>m.lotId===c.protectionSourceLotId&&m.code==='DR-01');
 return m&&(m.status!=='OPERATIONAL'||(m.neutralizedUntilGameMs??0)>gameTime(s.clock,at))?0:value;
}
