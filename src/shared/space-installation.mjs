// SO_Regles_V07, ch. 4 et 15, A15 N1–N2. No droid or ship target is implied.
export function installationProfiles({minLevel=1,kitId,threshold=6,bonusItems=[],instructions=''}={}){
 const common={durationByLevel:{},cost:1,cooldownSeconds:600,instructions,successText:'Intervention terminée.',failureText:'Aucun effet obtenu.'};
 return {SABOTAGE:{...common,skillId:'SABOTAGE',minLevel,durationSeconds:300,test:'D6',threshold,bonusItems,consumable:{itemId:kitId,quantity:1}},REPAIR:{...common,skillId:'MEC-02',minLevel:2,durationSeconds:180,test:'AUTO',threshold:0,bonusItems:[],consumable:null}};
}
export function validSoInstallation(t){
 if(t?.kind!=='INSTALLATION'||t.dependencyId||(t.rewards??[]).length||t.offlineSeconds<=0||t.offlineSeconds>900||t.failureLockSeconds!==300||t.repairProtectionSeconds!==900)return false;
 const a=t.profiles?.SABOTAGE,b=t.profiles?.REPAIR;
 return !!(a&&b&&Object.keys(t.profiles).length===2&&a.skillId==='SABOTAGE'&&[1,2].includes(a.minLevel)&&a.durationSeconds===300&&a.test==='D6'&&Number.isInteger(a.threshold)&&a.threshold>=1&&a.threshold<=10000&&a.cost===1&&a.cooldownSeconds===600&&Object.keys(a.durationByLevel??{}).length===0&&a.consumable?.itemId&&a.consumable.quantity===1&&b.skillId==='MEC-02'&&b.minLevel===2&&b.durationSeconds===180&&b.test==='AUTO'&&b.threshold===0&&b.cost===1&&b.cooldownSeconds===600&&Object.keys(b.durationByLevel??{}).length===0&&!b.consumable&&!(b.bonusItems??[]).length);
}
