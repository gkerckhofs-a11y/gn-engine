// V0.7 creation choices, not ability definitions or grants. Never add NPC powers here.
export const admissionClasses=Object.freeze([
 ['COM','Combattant','COM-03','Lecture tactique'],['ROG','Rogue','ROG-03','Évasion'],
 ['TRA','Traqueur','TRA-01','Lecture des traces'],['MED','Médecin','MED-02','Soins de terrain'],
 ['MEC','Mécano','MEC-02','Réparation'],['PIL','Pilote','PIL-01','Navigation'],
 ['COU','Courtier','COU-01','Expertise marchande'],['INF','Infiltrateur','INF-02','Déchiffrement'],
].map(([id,label,secondaryId,secondaryLabel])=>Object.freeze({id,label,secondaryId,secondaryLabel})));
