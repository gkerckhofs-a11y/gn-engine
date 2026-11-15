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

// Rare values are fabrication costs, never shop prices. The other three
// references remain closed until their effects and physical custody exist.
export const sensorJammer=Object.freeze({code:'R04-01',label:'Brouilleur de capteurs',level:4});
export function sensorJammerQuote(calibration){
 const ship=spaceShipProfiles.find(p=>p.size===calibration?.size);
 if(calibration?.code!==sensorJammer.code||!ship)return null;
 return {code:sensorJammer.code,size:ship.size,label:sensorJammer.label,shipLabel:ship.label,
  price:ship.referencePrice*30/100,commonCost:ship.referencePrice*20/100,rareCost:ship.referencePrice*10/100,
  install:{skillId:'MEC-03',level:4,seconds:1200,actionPoints:1},
  remove:{skillId:'MEC-03',level:4,seconds:600,actionPoints:1}};
}

export const regenerativeShield=Object.freeze({code:'R05-01',label:'Bouclier régénératif',level:5});
export function regenerativeShieldQuote(calibration){
 const ship=spaceShipProfiles.find(p=>p.size===calibration?.size);
 if(calibration?.code!==regenerativeShield.code||!ship)return null;
 return {code:regenerativeShield.code,size:ship.size,label:regenerativeShield.label,shipLabel:ship.label,price:ship.referencePrice*50/100,commonCost:ship.referencePrice*30/100,rareCost:ship.referencePrice*20/100,install:{skillId:'MEC-03',level:5,seconds:1800,actionPoints:1},remove:{skillId:'MEC-03',level:5,seconds:900,actionPoints:1}};
}
export const rareShipModuleQuote=calibration=>sensorJammerQuote(calibration)||regenerativeShieldQuote(calibration);

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
export function playableShipModuleQuote(calibration,{hiddenCargo=false,towing=false,rare=false,regenerative=false}={}){
 if(rare&&calibration?.code===sensorJammer.code)return sensorJammerQuote(calibration);
 if(regenerative&&calibration?.code===regenerativeShield.code)return regenerativeShieldQuote(calibration);
 const q=standardShipModuleQuote(calibration);
 return q&&(!q.requiresTowing||towing)&&(!q.requiresHiddenCargo||hiddenCargo)?q:null;
}

// Recalculate from the canonical base; never compound an already upgraded profile.
export function installedShipProfile(profile,modules,options={}){
 const base=spaceShipProfiles.find(p=>p.id===profile?.id);
 if(!base||!Array.isArray(modules)||modules.length>base.moduleSlots||modules.some(m=>!(playableShipModuleQuote(m,options)||options.towingProfile===true&&m.code==='MOD-05'&&standardShipModuleQuote(m))||m.size!==base.size||!(m.status==='OPERATIONAL'||options.durableModules===true&&m.status==='DAMAGED'))||new Set(modules.map(m=>m.code)).size!==modules.length)return null;
 const has=code=>modules.some(m=>m.code===code&&m.status==='OPERATIONAL');
 return {...base,hullMax:base.hullMax+Number(has('MOD-02')),shieldMax:base.shieldMax+Number(has('MOD-01')),maneuverability:Math.min(3,base.maneuverability+Number(has('MOD-03'))),...(has('MOD-06')?{weapon:'HEAVY'}:{})};
}

export const towingVersionKeys=Object.freeze(['towingWorkVersion','towingAttachmentVersion','towingFlightVersion','towingCombatVersion','towingOutageVersion','towingRecoveryVersion']);

// V0.7 chapter 17: a repair is distinct from fitting, hull and shield work.
export function shipModuleRepairPlan(module){
 const q=standardShipModuleQuote(module)||rareShipModuleQuote(module);if(!q)return null;
 return {kind:'MODULE',points:1,unitCost:q.price/4,secondsPerPoint:q.code===regenerativeShield.code?900:q.code===sensorJammer.code?600:300,moduleLotId:module.lotId,moduleCode:q.code,moduleName:q.label,moduleLevel:q.install.level};
}
