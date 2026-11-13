import {seedSoloDemo} from './solo-demo-setup.mjs';
// Persist each pending command before sending it: retries keep the same native
// requestId even when the response was lost. Completed reads replay the plan.
export async function runSoloDemo(api,storage,key,onProgress=()=>{}){
 let state=JSON.parse(storage.getItem(key)||'null')??{steps:[],pending:null},index=0,sid;
 const save=()=>storage.setItem(key,JSON.stringify(state));
 const result=await seedSoloDemo(async(action,input,role='owner')=>{
  const i=index++,cached=state.steps[i];onProgress(i+1);
  if(cached){if(cached.action!==action)throw Error('Le plan de création a changé. Contactez l’organisateur.');if(action==='createSoloDemo')sid=cached.result.id;return cached.result;}
  if(!state.pending){state.pending={action,input:{...input,...(role==='owner'?{}:{demoRole:role,demoSession:sid})},role};save();}
  if(state.pending.action!==action||state.pending.role!==role)throw Error('Étape de création incohérente.');
  const r=await api(action,state.pending.input,role==='owner');
  state.steps.push({action,result:r});state.pending=null;save();if(action==='createSoloDemo')sid=r.id;return r;
 });
 storage.removeItem(key);return result;
}
