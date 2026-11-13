import {documentId,requireThat} from './validation.mjs';
export function tracePolicyInput(v){
 if(v===undefined||v===null)return null;
 const check=x=>requireThat(x,'SO_TRACE_POLICY');check(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['minLevel','actions','falseLeads','routes'].includes(k)));
 check([1,2].includes(v.minLevel)&&Array.isArray(v.actions)&&v.actions.length>0&&v.actions.length<=7&&new Set(v.actions).size===v.actions.length&&v.actions.every(k=>['SEARCH','ANALYZE','SABOTAGE','REPAIR','INTRUSION','FORGERY','DEPARTURE'].includes(k)));
 check(!v.actions.includes('DEPARTURE')||v.actions.length===1);
 const routes=v.routes??[];check(Array.isArray(routes)&&routes.length<=50&&(!routes.length||v.actions.includes('DEPARTURE')));
 const preparedRoutes=routes.map(r=>{check(r&&Object.keys(r).every(k=>['routeId','nextSegment','arrivalWindow'].includes(k))&&typeof r.nextSegment==='string'&&r.nextSegment.length<=2000&&typeof r.arrivalWindow==='string'&&r.arrivalWindow.length<=2000);return {routeId:documentId(r.routeId),nextSegment:r.nextSegment.trim(),arrivalWindow:r.arrivalWindow.trim()};});check(new Set(preparedRoutes.map(r=>r.routeId)).size===preparedRoutes.length);
 const falseLeads=v.falseLeads??[];check(Array.isArray(falseLeads)&&falseLeads.length<=10);
 const rows=falseLeads.map(x=>{check(x&&Object.keys(x).every(k=>['id','label','text','scenarioAuthorized'].includes(k))&&x.scenarioAuthorized===true);check(typeof x.label==='string'&&x.label.trim()&&x.label.length<=150&&typeof x.text==='string'&&x.text.trim()&&x.text.length<=2000);return {id:documentId(x.id),label:x.label.trim(),text:x.text.trim(),scenarioAuthorized:true};});check(new Set(rows.map(x=>x.id)).size===rows.length);
 return {minLevel:v.minLevel,actions:v.actions,falseLeads:rows,...(preparedRoutes.length?{routes:preparedRoutes}:{})};
}
export const activeTraceMask=(s,m)=>m?.sessionId===s.id&&m.status==='ACTIVE';
