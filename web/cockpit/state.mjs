// Visual state only: never calculates game damage, costs, dice or permissions.
export const phases = {
 docked: {label:'À quai', line:'Port-Brèche · baie 07', message:'Équipage, bienvenue à bord. En attente de vos instructions.'},
 launch: {label:'Décollage', line:'Sortie du spatioport', message:'Verrous libérés. Couloir de sortie dégagé.'},
 cruise: {label:'Navigation', line:'En route vers le relais', message:'Trajectoire stabilisée. Veille longue portée active.'},
 hyperspace: {label:'Hyperespace', line:'Transit supraluminique', message:'Saut engagé. Gardez vos positions.'},
 contact: {label:'Contact inconnu', line:'Signature détectée à tribord', message:'Un appareil approche. Aucune identification reçue.'},
 combat: {label:'Alerte combat', line:'Rencontre en cours', message:'Postes de combat. Attente des ordres du pilote.'},
 approach: {label:'Approche', line:'Relais des Confins', message:'Autorisation d’approche reçue. Réduction de la poussée.'},
 landed: {label:'Amarré', line:'Relais des Confins · quai 03', message:'Amarrage confirmé. Vous pouvez débarquer.'}
};
export function initialState(){return {phase:'docked',hull:4,maxHull:4,shield:2,maxShield:2,fuel:8,maxFuel:12,paused:false,reducedMotion:false,seen:[],effect:null,message:phases.docked.message};}
export function applyVisualEvent(state,event){
 if(!event||typeof event.id!=='string'||!event.id||state.seen.includes(event.id))return state;
 if(!['phase','shot','impact','message','telemetry'].includes(event.type))throw new Error('Unknown visual event');
 if(event.type==='phase'&&!phases[event.phase])throw new Error('Unknown phase');
 const next={...state,effect:null,seen:[...state.seen,event.id].slice(-256)};
 if(event.type==='phase'){next.phase=event.phase;next.message=phases[event.phase].message;}
 if(event.type==='shot'||event.type==='impact')next.effect=event.type;
 if(event.type==='message')next.message=String(event.text??'').slice(0,500);
 // Values must come from an authoritative projection; animations never subtract them.
 if(event.type==='telemetry')for(const key of ['hull','shield','fuel']){
  if(event[key]!==undefined){const max=next['max'+key[0].toUpperCase()+key.slice(1)];if(!Number.isFinite(event[key])||event[key]<0||event[key]>max)throw new Error('Invalid telemetry');next[key]=event[key];}
 }
 return next;
}
