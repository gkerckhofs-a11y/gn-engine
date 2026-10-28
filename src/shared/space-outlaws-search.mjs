// V3.6 changes only place searches. TRA-02 and analysis dice stay unchanged.
export const searchFindKinds=['INDICE_A_VOIR','INDICE_A_PRENDRE','OBJET_A_TROUVER','CREDITS_A_TROUVER'];
export const placeSearchProfile=(difficulty=6)=>({skillId:null,minLevel:1,instructions:'Restez sur le lieu pendant toute la fouille.',durationSeconds:60,durationByLevel:{},test:'D12',threshold:difficulty,cost:1,cooldownSeconds:600,bonusItems:[],consumable:null,successText:'Découvertes accessibles.',failureText:'Vous ne trouvez rien de plus.'});
export const isPlaceSearch=t=>t?.kind==='SEARCH'&&t.searchVersion===1;
