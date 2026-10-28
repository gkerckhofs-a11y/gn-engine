import {requireThat} from './validation.mjs';

export const isRouteAnalysis=t=>t?.kind==='ANALYSIS'&&t.profiles?.ANALYZE?.skillId==='PIL-01';
export const requireRouteAnalysis=s=>requireThat(s.spaceOutlaws?.routeAnalysisVersion===1&&s.spaceOutlaws.navigationVersion===1,'SO_GAMEPLAY_NOT_OPEN');
const characterPort=(s,c)=>c.spacePortId??s.transportRules?.homePort;

// Resolve only a known code from the character's actual departure port. Never
// enumerate routes, prepared rewards or another character's flight plan.
export async function routeAnalysisByCode(tx,s,c,code){
 requireRouteAnalysis(s);
 requireThat(typeof code==='string'&&code.trim().length>0&&code.length<=80,'SO_ROUTE_DOSSIER_UNAVAILABLE');
 const base=`sessions/${s.id}`,routes=await tx.list(`${base}/routes`),ports=await tx.list(`${base}/ports`);
 const candidates=routes.filter(r=>r.versionId===s.versionId&&r.fromPort===characterPort(s,c)&&(r.navigationCode===code.trim()||ports.some(p=>p.versionId===s.versionId&&p.id===r.toPort&&p.navigationCode===code.trim())));
 requireThat(candidates.length===1&&candidates[0].analysisTargetId,'SO_ROUTE_DOSSIER_UNAVAILABLE');
 return candidates[0];
}
export function routeAnalysisBinding(s,c,t,route){
 requireRouteAnalysis(s);
 requireThat(isRouteAnalysis(t)&&route?.versionId===s.versionId&&route.analysisTargetId===t.id&&route.fromPort===characterPort(s,c),'SO_ROUTE_DOSSIER_UNAVAILABLE');
 return {routeId:route.id,revision:route.revision,versionId:route.versionId,fromPort:route.fromPort,targetId:t.id};
}
