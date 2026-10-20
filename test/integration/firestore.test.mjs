import {fieldSuite} from '../support/field-suite.mjs';
import {mastersSuite} from '../support/masters-suite.mjs';
import {campaignsSuite} from '../support/campaigns-suite.mjs';
import {actionPointsSuite} from '../support/action-points-suite.mjs';
import {mediaSuite} from '../support/media-suite.mjs';
import {archiveSuite} from '../support/scenario-archive-suite.mjs';
import {missionPartiesSuite} from '../support/mission-parties-suite.mjs';
import {bountiesSuite} from '../support/bounties-suite.mjs';
import {contractsSuite} from '../support/contracts-suite.mjs';
import {announcementsSuite} from '../support/announcements-suite.mjs';
import {marketSuite} from '../support/market-suite.mjs';
import {salesSuite} from '../support/sales-suite.mjs';
import {collectiveSuite} from '../support/collective-suite.mjs';
import {economySuite} from '../support/economy-suite.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {firestoreStore} from '../../src/adapters/firestore.mjs';
import {notebookSuite} from '../support/notebook-suite.mjs';
import {abilitiesSuite} from '../support/abilities-suite.mjs';
import {healthSuite} from '../support/health-suite.mjs';
import {inventorySuite} from '../support/inventory-suite.mjs';
import {transfersSuite} from '../support/transfers-suite.mjs';
import {knowledgeSuite} from '../support/knowledge-suite.mjs';
import {groupsSuite} from '../support/groups-suite.mjs';
import {workflowSuite} from '../support/workflow-suite.mjs';
if(!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required; never run this suite against production.');
const projectId='demo-gn-engine';
initializeApp({projectId});const firestore=getFirestore();
workflowSuite(()=>firestoreStore(firestore),'Firestore réel émulé');
groupsSuite(()=>firestoreStore(firestore),'Groupes sur Firestore');
knowledgeSuite(()=>firestoreStore(firestore),'Connaissances sur Firestore');
notebookSuite(()=>firestoreStore(firestore),'Carnet sur Firestore');
abilitiesSuite(()=>firestoreStore(firestore),'Compétences sur Firestore');
healthSuite(()=>firestoreStore(firestore),'PV et soins sur Firestore');
inventorySuite(()=>firestoreStore(firestore),'Inventaire sur Firestore');
transfersSuite(()=>firestoreStore(firestore),'Remises sur Firestore');
economySuite(()=>firestoreStore(firestore),'Crédits sur Firestore');
collectiveSuite(()=>firestoreStore(firestore),'Caisses sur Firestore');
salesSuite(()=>firestoreStore(firestore),'Ventes sur Firestore');
marketSuite(()=>firestoreStore(firestore),'Marché sur Firestore');
announcementsSuite(()=>firestoreStore(firestore),'Petites annonces sur Firestore');
contractsSuite(()=>firestoreStore(firestore),'Contrats sur Firestore');
test('règles Firestore : un client non authentifié ne peut lire ni écrire les secrets',async()=>{
  const root=`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents`;
  await firestore.doc('private/test').set({secret:'invisible'});
  const r=await fetch(`${root}/private/test`);assert.equal(r.status,403);
  const w=await fetch(`${root}/private/new`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{admin:{booleanValue:true}}})});assert.equal(w.status,403);
});


bountiesSuite(()=>firestoreStore(firestore),'Primes sur Firestore');

missionPartiesSuite(()=>firestoreStore(firestore),'Participation sur Firestore');

mediaSuite(()=>firestoreStore(firestore),'Médiathèque sur Firestore');
archiveSuite(()=>firestoreStore(firestore),'Archives sur Firestore');

actionPointsSuite(()=>firestoreStore(firestore),'PA sur Firestore');

campaignsSuite(()=>firestoreStore(firestore),'Campagnes sur Firestore');

mastersSuite(()=>firestoreStore(firestore),'Masters sur Firestore');

fieldSuite(()=>firestoreStore(firestore),'Firestore terrain');
