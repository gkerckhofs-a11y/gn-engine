// SPACE OUTLAWS V0.7, §§17–18 / CDC V3.5 A.5–A.6. Definitions, never live state.
export const spaceShipProfiles=Object.freeze([
 Object.freeze({id:'FIGHTER',label:'Chasseur léger',referencePrice:5000,hullMax:3,shieldMax:1,maneuverability:2,cargoCapacity:0,seats:1,moduleSlots:1,tankCapacity:8,size:1}),
 Object.freeze({id:'CARGO',label:'Cargo léger',referencePrice:10000,hullMax:4,shieldMax:2,maneuverability:1,cargoCapacity:20,seats:6,moduleSlots:2,tankCapacity:16,size:2}),
 Object.freeze({id:'TRANSPORT',label:'Transport renforcé',referencePrice:20000,hullMax:6,shieldMax:3,maneuverability:0,cargoCapacity:50,seats:15,moduleSlots:3,tankCapacity:24,size:3}),
]);
export const spaceDistances=Object.freeze([
 Object.freeze({id:'SHORT',label:'Courte',durationSeconds:300,distanceFactor:1}),
 Object.freeze({id:'MEDIUM',label:'Moyenne',durationSeconds:600,distanceFactor:2}),
 Object.freeze({id:'LONG',label:'Longue',durationSeconds:900,distanceFactor:3}),
]);
export const spaceRisks=Object.freeze([
 Object.freeze({id:'SECURED',label:'Sécurisée',eventFaces:1}),
 Object.freeze({id:'DANGEROUS',label:'Dangereuse',eventFaces:2}),
 Object.freeze({id:'HOSTILE',label:'Hostile',eventFaces:3}),
]);
