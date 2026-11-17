// V0.7 ch.11. Prices are references, never an automatic stock or payment.
export const droidModules=Object.freeze([
 {code:'DR-01',name:'Blindage intégré',level:1,price:300},
 {code:'DR-02',name:'Outillage intégré',level:1,price:200},
 {code:'DR-03',name:'Scanner multispectral',level:2,price:350},
 {code:'DR-04',name:'Interface de données',level:2,price:350},
 {code:'DR-05',name:'Mémoire chiffrée',level:2,price:300},
 {code:'DR-06',name:'Compartiment dissimulé',level:2,price:400},
].map(Object.freeze));
export const droidModule=code=>droidModules.find(m=>m.code===code)??null;
export function droidModuleWork(code,operation){
 const m=droidModule(code);if(!m||!['INSTALL','REMOVE','REPAIR'].includes(operation))return null;
 return {...m,operation,skillId:operation==='REPAIR'?'MEC-02':'MEC-03',minLevel:operation==='REPAIR'?2:m.level,
  seconds:operation==='REMOVE'||m.level===1?300:600,partsValue:operation==='REPAIR'?Math.ceil(m.price/100)*25:0,
  pnjFee:operation==='REMOVE'?50:m.level*50};
}
