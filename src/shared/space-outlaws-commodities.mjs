// Canonical catalogue, V0.7 chapter 23. Explicit mapping; never inferred from names.
export const spaceCommodities=[
 ['WATER','Eau purifiée',40,'FREE'],['RATIONS','Rations alimentaires',60,'FREE'],['ORE','Minerai brut',100,'FREE'],['ALLOYS','Alliages industriels',160,'FREE'],['PARTS','Pièces détachées',50,'FREE'],['ELECTRONICS','Composants électroniques',200,'FREE'],['ENERGY','Cellules énergétiques',140,'FREE'],['DROID_PARTS','Pièces de droïdes',200,'FREE'],['BACTA','Fournitures médicales au bacta',320,'REGULATED'],['ARMS','Armement militaire conditionné',450,'REGULATED'],['SPICE','Épices prohibées fictives',500,'ILLEGAL'],['ARTIFACTS','Technologies interdites / artefacts sensibles',700,'ILLEGAL']
].map(([id,name,referencePrice,legality])=>({id,name,referencePrice,legality}));
export const planetMarketStates={SURPLUS:{label:'Surabondance',percent:-15},NORMAL:{label:'Normal',percent:0},TENSION:{label:'Tension',percent:15},SHORTAGE:{label:'Pénurie',percent:30}};
