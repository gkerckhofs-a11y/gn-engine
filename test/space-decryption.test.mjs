import {soReleaseDefinitionChecks} from '../src/core/space-outlaws-release-check.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {soDecryptionSuite} from './support/space-decryption-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {centralKnowledgeInput} from '../src/core/central-knowledge.mjs';
soDecryptionSuite(()=>new MemoryStore());
const document={kind:'DOCUMENT',title:'Cryptogramme',body:'Texte chiffré',origin:'',
 shareMode:'SHOW',gmTruth:'',gmNotes:'',initialCharacterIds:[],qrEnabled:false,
 qrAudience:'ALL_PLAYERS',qrCharacterIds:[],qrSkillId:null,qrSkillLevel:null};
test('M6 INF-02 : texte secret distinct, seuil validé et compatibilité ancienne fiche',()=>{
 const cipher={minLevel:2,threshold:6,plaintext:'SECRET_REVELE_SEULEMENT_APRES_TEST'};
 const created=centralKnowledgeInput({...document,cipher},'encrypted');
 assert.equal(created.cipher.plaintext,cipher.plaintext);
 assert.equal(created.body,'Texte chiffré');
 const old=centralKnowledgeInput(document,'old');
 assert.equal(old.cipher,undefined);
 const updated=centralKnowledgeInput({...document,title:'Révision'},'encrypted',created);
 assert.deepEqual(updated.cipher,cipher);
});
test('M6 INF-02 : seules les informations complètes et documents de type DOCUMENT sont permis',()=>{
 const cipher={minLevel:1,threshold:6,plaintext:'CONFIDENTIEL'};
 for(const broken of [{...cipher,minLevel:0},{...cipher,threshold:13},{...cipher,plaintext:''}]){
  assert.throws(()=>centralKnowledgeInput({...document,cipher:broken},'invalid'));
 }
 assert.throws(()=>centralKnowledgeInput({...document,kind:'KNOWLEDGE',cipher},'invalid'));
 assert.throws(()=>centralKnowledgeInput({...document,body:'CONFIDENTIEL',cipher},'invalid'));
});

test('M6 INF-02 : compatibilités bornées, doublons refusés, publication sans référence impossible',()=>{
 const cipher={minLevel:1,threshold:6,plaintext:'Secret',bonusItemIds:['decoder']};
 assert.deepEqual(centralKnowledgeInput({...document,cipher},'doc').cipher.bonusItemIds,['decoder']);
 for(const ids of [['decoder','decoder'],Array.from({length:21},(_,i)=>'item'+i),['bad/id']])assert.throws(()=>centralKnowledgeInput({...document,cipher:{...cipher,bonusItemIds:ids}},'doc'));
 const k={id:'knowledge_doc',entityId:'doc',type:'knowledge',operation:'UPSERT',data:{cipher}},i={id:'item_decoder',entityId:'decoder',type:'item',operation:'UPSERT',data:{consumable:false}};
 assert.equal(soReleaseDefinitionChecks([k,i]).definitions.length,0);
 for(const items of [[],[{...i,data:{consumable:true}}]])assert.ok(soReleaseDefinitionChecks([k,...items]).definitions.some(b=>b.code==='SO_INF02_BONUS_ITEM'));
});
