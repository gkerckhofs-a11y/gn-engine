// SO_Regles_V07 ch. 4/15, A15. Native N3–N5 require an explicit published system profile.
export function installationProfiles({minLevel=1,kitId,threshold=6,bonusItems=[],instructions='',system=null}={}){
 const restore=system?systemRestoration(system):{mec02:2,seconds:180};
 const common={durationByLevel:{},cost:1,cooldownSeconds:600,instructions,successText:'Intervention terminée.',failureText:'Aucun effet obtenu.'};
 return {SABOTAGE:{...common,skillId:'SABOTAGE',minLevel,durationSeconds:300,test:'D6',threshold,bonusItems,consumable:{itemId:kitId,quantity:1}},REPAIR:{...common,skillId:'MEC-02',minLevel:restore.mec02,durationSeconds:restore.seconds,test:'AUTO',threshold:0,bonusItems:[],consumable:null}};
}
export function validSoInstallation(t){
 if(t?.kind!=='INSTALLATION'||t.dependencyId||(t.rewards??[]).length||t.offlineSeconds<=0||t.offlineSeconds>900||t.failureLockSeconds!==300||t.repairProtectionSeconds!==900)return false;
 const a=t.profiles?.SABOTAGE,b=t.profiles?.REPAIR,x=t.sabotageSystem;if(x&&!sabotageSystemValid(x,a?.minLevel))return false;const restore=x?systemRestoration(x):{mec02:2,seconds:180};
 return !!(a&&b&&Object.keys(t.profiles).length===2&&a.skillId==='SABOTAGE'&&(x?sabotageSystemValid(x,a.minLevel):[1,2].includes(a.minLevel))&&a.durationSeconds===300&&a.test==='D6'&&Number.isInteger(a.threshold)&&a.threshold>=1&&a.threshold<=10000&&a.cost===1&&a.cooldownSeconds===600&&Object.keys(a.durationByLevel??{}).length===0&&a.consumable?.itemId&&a.consumable.quantity===1&&b.skillId==='MEC-02'&&b.minLevel===restore.mec02&&b.durationSeconds===restore.seconds&&b.test==='AUTO'&&b.threshold===0&&b.cost===1&&b.cooldownSeconds===600&&Object.keys(b.durationByLevel??{}).length===0&&!b.consumable&&!(b.bonusItems??[]).length);
}

// The published sheet declares the exact function; a later scene binding may
// select an installed instance, never broaden the declared effect.
export function sabotageSystemValid(x,level){
 if(!x||typeof x!=='object'||Array.isArray(x)||!Object.keys(x).every(k=>['kind','code','exceptional','restore'].includes(k))||!['DROID_MODULE','SHIP_MODULE'].includes(x.kind)||typeof x.exceptional!=='boolean')return false;
 if(!(x.kind==='DROID_MODULE'?/^DR-0[1-6]$/:/^MOD-0[1-6]$/).test(x.code))return false;
 if(!x.exceptional)return level===(x.kind==='DROID_MODULE'?3:4)&&x.restore===undefined;
 const r=x.restore;return level===5&&r&&Object.keys(r).every(k=>['mec02','mec03','seconds'].includes(k))&&Number.isInteger(r.mec02)&&r.mec02>=1&&r.mec02<=5&&Number.isInteger(r.mec03)&&r.mec03>=0&&r.mec03<=5&&Number.isInteger(r.seconds)&&r.seconds>=1&&r.seconds<=86400;
}
export function systemRestoration(x){return x.exceptional?x.restore:x.kind==='DROID_MODULE'?{mec02:2,mec03:0,seconds:180}:{mec02:3,mec03:2,seconds:300};}
