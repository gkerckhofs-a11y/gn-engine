import {spaceShipProfiles} from './space-outlaws-navigation.mjs';

// SPACE OUTLAWS V0.7, chapter 17. Canonical catalogue and installed profile.
export const standardShipModules=Object.freeze([
 Object.freeze({code:'MOD-01',label:'Bouclier renforcé',pricePercent:15,installLevel:2,installSeconds:600}),
 Object.freeze({code:'MOD-02',label:'Blindage supplémentaire',pricePercent:15,installLevel:2,installSeconds:600}),
 Object.freeze({code:'MOD-03',label:'Propulseurs améliorés',pricePercent:25,installLevel:3,installSeconds:900}),
 Object.freeze({code:'MOD-04',label:'Soute clandestine',pricePercent:10,installLevel:2,installSeconds:600,minimumSize:2,requiresHiddenCargo:true}),
 Object.freeze({code:'MOD-05',label:'Remorquage',pricePercent:10,installLevel:2,installSeconds:600,minimumSize:2,requiresTowing:true}),
 Object.freeze({code:'MOD-06',label:'Canon lourd',pricePercent:20,installLevel:3,installSeconds:900}),
]);

export function standardShipModuleQuote(calibration){
 if(!calibration||typeof calibration!=='object')return null;
 const {code,size}=calibration;
 const module=standardShipModules.find(m=>m.code===code),ship=spaceShipProfiles.find(p=>p.size===size);
 if(!module||!ship||ship.size<(module.minimumSize??1))return null;
 return {code,size,label:module.label,shipLabel:ship.label,price:ship.referencePrice*module.pricePercent/100,
  ...(module.requiresTowing?{requiresTowing:true}:{}),
  ...(module.requiresHiddenCargo?{requiresHiddenCargo:true,hiddenCargoCapacity:size===2?5:10,cargoCapacity:ship.cargoCapacity}:{}),
  install:{skillId:'MEC-03',level:module.installLevel,seconds:module.installSeconds,actionPoints:1},
  remove:{skillId:'MEC-03',level:2,seconds:300,actionPoints:1}};
}

// A definition alone never grants a session-specific equipment capability.
export function playableShipModuleQuote(calibration,{hiddenCargo=false,towing=false}={}){
 const q=standardShipModuleQuote(calibration);
 return q&&(!q.requiresTowing||towing)&&(!q.requiresHiddenCargo||hiddenCargo)?q:null;
}

// Recalculate from the canonical base; never compound an already upgraded profile.
export function installedShipProfile(profile,modules,options={}){
 const base=spaceShipProfiles.find(p=>p.id===profile?.id);
 if(!base||!Array.isArray(modules)||modules.length>base.moduleSlots||modules.some(m=>!(playableShipModuleQuote(m,options)||options.towingProfile===true&&m.code==='MOD-05'&&standardShipModuleQuote(m))||m.size!==base.size||m.status!=='OPERATIONAL')||new Set(modules.map(m=>m.code)).size!==modules.length)return null;
 const has=code=>modules.some(m=>m.code===code);
 return {...base,hullMax:base.hullMax+Number(has('MOD-02')),shieldMax:base.shieldMax+Number(has('MOD-01')),maneuverability:Math.min(3,base.maneuverability+Number(has('MOD-03'))),...(has('MOD-06')?{weapon:'HEAVY'}:{})};
}

export const towingVersionKeys=Object.freeze(['towingWorkVersion','towingAttachmentVersion','towingFlightVersion','towingCombatVersion','towingOutageVersion','towingRecoveryVersion']);
