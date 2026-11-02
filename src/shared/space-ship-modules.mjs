import {spaceShipProfiles} from './space-outlaws-navigation.mjs';

// SPACE OUTLAWS V0.7, chapter 17. Catalogue only; no live ship effects.
export const standardShipModules=Object.freeze([
 Object.freeze({code:'MOD-01',label:'Bouclier renforcé',pricePercent:15,installLevel:2,installSeconds:600}),
 Object.freeze({code:'MOD-02',label:'Blindage supplémentaire',pricePercent:15,installLevel:2,installSeconds:600}),
 Object.freeze({code:'MOD-03',label:'Propulseurs améliorés',pricePercent:25,installLevel:3,installSeconds:900}),
 Object.freeze({code:'MOD-06',label:'Canon lourd',pricePercent:20,installLevel:3,installSeconds:900}),
]);

export function standardShipModuleQuote(calibration){
 if(!calibration||typeof calibration!=='object')return null;
 const {code,size}=calibration;
 const module=standardShipModules.find(m=>m.code===code),ship=spaceShipProfiles.find(p=>p.size===size);
 if(!module||!ship)return null;
 return {code,size,label:module.label,shipLabel:ship.label,price:ship.referencePrice*module.pricePercent/100,
  install:{skillId:'MEC-03',level:module.installLevel,seconds:module.installSeconds,actionPoints:1},
  remove:{skillId:'MEC-03',level:2,seconds:300,actionPoints:1}};
}
