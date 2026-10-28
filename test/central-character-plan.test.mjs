import test from 'node:test';
import assert from 'node:assert/strict';
import {centralCharacterPlanSuite} from './support/central-character-plan-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {initialCharacterProfile,initialSecondaryChoices} from '../src/shared/initial-character-profile.mjs';

centralCharacterPlanSuite(()=>new MemoryStore());
test('Profil initial V0.7 : huit socles, 56 combinaisons, traits fixes et initiation unique',()=>{
 const expected={COM:['COM-01','COM-02','COM-03'],ROG:['ROG-01','ROG-02','ROG-03'],TRA:['TRA-01','TRA-02','TRA-03'],MED:['MED-01','MED-02','MED-03'],MEC:['MEC-01','MEC-02','MEC-03'],PIL:['PIL-01','PIL-02','PIL-03'],COU:['COU-01','COU-02','COU-03'],INF:['INF-01','INF-02','INF-03']};
 const initiations=['COM-03','ROG-03','TRA-01','MED-02','MEC-02','PIL-01','COU-01','INF-02'];let count=0;
 for(const [classId,ids] of Object.entries(expected)){
  assert.deepEqual(initialSecondaryChoices(classId).map(x=>x.secondaryId),initiations.filter(x=>!x.startsWith(classId)));
  for(const secondary of initiations){
   const p=initialCharacterProfile(classId,secondary);if(secondary.startsWith(classId)){assert.equal(p,null);continue;}count++;
   assert.deepEqual(p.skills.map(x=>x.id),[...ids,secondary]);assert.equal(p.secondarySlotsUsed,1);assert.equal(p.skills.filter(x=>x.source==='INITIATION').length,1);assert.equal(p.skills[3].level,1);
   for(const s of p.skills.slice(0,3)){const fixed=['COM-01','COM-02','ROG-01'].includes(s.id);assert.equal(s.kind,fixed?'FIXED':'EVOLVING');assert.equal(s.level,fixed?null:2);}
  }
 }
 assert.equal(count,56);for(const secondary of ['FOR-01','LAS-01','COM-01','ROG-01','TOXI-01','MED-03',''])assert.equal(initialCharacterProfile('INF',secondary),null);
 assert.equal(initialCharacterProfile('PNJ_FORCE_SENSITIVE','MED-02'),null);
});
