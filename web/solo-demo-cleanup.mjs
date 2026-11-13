// Only the explicitly selected former test sessions are affected. Native closure
// refuses outstanding voyages, contracts, survival timers or active actions.
export async function removeFormerTests(api,mutate,sessionIds,scenarioIds=[]){
 const removed=[];
 for(const sessionId of sessionIds){
  let s=await api('session',{sessionId});
  if(s.spaceOutlaws?.healthVersion&&['EN_JEU','PAUSE'].includes(s.stage)){
   const health=await api('survivalAdmin',{sessionId});
   if(health.session.safetyStopped){await mutate('resumeSafety',{sessionId,revision:health.session.revision,reason:'Clôture de cet ancien essai fictif, remplacé par la session commune'});s=await api('session',{sessionId});}
  }
  if(['EN_JEU','PAUSE'].includes(s.stage)){await mutate('setStage',{sessionId,revision:s.revision,stage:'FINISHED'});s=await api('session',{sessionId});}
  await mutate('trashRecord',{kind:'session',id:sessionId,revision:s.revision});removed.push(sessionId);
 }
 for(const id of scenarioIds){const s=await api('scenario',{scenarioId:id});await mutate('trashRecord',{kind:'scenario',id,revision:s.revision});}
 return removed;
}
