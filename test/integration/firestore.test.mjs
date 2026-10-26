import {spaceSearchSuite} from '../support/space-search-suite.mjs';
import {spaceEpisodesSuite} from '../support/space-episodes-suite.mjs';
import {missionExecutionSuite} from '../support/mission-execution-suite.mjs';
import {spaceMissionsSuite} from '../support/space-missions-suite.mjs';
import {spaceLogisticsSuite} from '../support/space-logistics-suite.mjs';
import {spaceEncountersSuite} from '../support/space-encounters-suite.mjs';
import {spaceOutlawsVoyagesSuite} from '../support/space-outlaws-voyages-suite.mjs';
import {spaceOutlawsShopsSuite} from '../support/space-outlaws-shops-suite.mjs';
import {spaceOutlawsHealthSuite} from '../support/space-outlaws-health-suite.mjs';
import {spaceOutlawsActionsSuite} from '../support/space-outlaws-actions-suite.mjs';
import {spaceOutlawsEntrySuite} from '../support/space-outlaws-entry-suite.mjs';
import {centralFieldImportSuite} from '../support/central-field-import-suite.mjs';
import {centralFieldTargetsSuite} from '../support/central-field-targets-suite.mjs';
import {centralGroupsSuite} from '../support/central-groups-suite.mjs';
import {centralSnapshotsSuite} from '../support/central-snapshots-suite.mjs';
import {admissionM2CheckSuite} from '../support/admission-m2-check-suite.mjs';
import {admissionM2Suite} from '../support/admission-m2-suite.mjs';
import {admissionM2ReconciliationSuite} from '../support/admission-m2-reconciliation-suite.mjs';
import {centralSpaceImportSuite} from '../support/central-space-import-suite.mjs';
import {centralShopImportSuite} from '../support/central-shop-import-suite.mjs';
import {centralStoryImportSuite} from '../support/central-story-import-suite.mjs';
import {centralSpaceSuite} from '../support/central-space-suite.mjs';
import {centralMissionsSuite} from '../support/central-missions-suite.mjs';
import {centralKnowledgeSuite} from '../support/central-knowledge-suite.mjs';
import {centralShopsSuite} from '../support/central-shops-suite.mjs';
import {centralClassKitsSuite} from '../support/central-class-kits-suite.mjs';
import {centralInitialCoherenceSuite} from '../support/central-initial-coherence-suite.mjs';
import {centralCharacterImportSuite} from '../support/central-character-import-suite.mjs';
import {centralCharacterPlanSuite} from '../support/central-character-plan-suite.mjs';
import {centralReviewSuite} from '../support/central-review-suite.mjs';
import {centralCheckSuite} from '../support/central-check-suite.mjs';
import {centralCharactersSuite} from '../support/central-characters-suite.mjs';
import {centralImportSuite} from '../support/central-import-suite.mjs';
import {groupManagementSuite} from '../support/group-management-suite.mjs';
import {centralMasterSuite} from '../support/central-master-suite.mjs';
import {centralRecipesSuite} from '../support/central-recipes-suite.mjs';
import {admissionReviewsSuite} from '../support/admission-reviews-suite.mjs';
import {admissionsSuite} from '../support/admissions-suite.mjs';
import {characterNatureSuite} from '../support/character-nature-suite.mjs';
import {preparationsSuite} from '../support/preparations-suite.mjs';
import {pricesSuite} from '../support/prices-suite.mjs';
import {voyagesSuite} from '../support/voyages-suite.mjs';
import {cargoSuite} from '../support/cargo-suite.mjs';
import {customsSuite} from '../support/customs-suite.mjs';
import {logisticsSuite} from '../support/logistics-suite.mjs';
import {personSuite} from '../support/person-suite.mjs';
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
import {negotiationsSuite} from '../support/negotiations-suite.mjs';
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
preparationsSuite(()=>firestoreStore(firestore),'Préparation SO sur Firestore');
centralFieldImportSuite(()=>firestoreStore(firestore),'Excel lieux C2q sur Firestore');
centralFieldTargetsSuite(()=>firestoreStore(firestore),'Lieux centraux C2p sur Firestore');
centralGroupsSuite(()=>firestoreStore(firestore),'Groupes centraux C2o sur Firestore');
centralSnapshotsSuite(()=>firestoreStore(firestore),'Instantanés centraux C2n sur Firestore');
centralMasterSuite(()=>firestoreStore(firestore),'Master central C1b sur Firestore');
centralShopsSuite(()=>firestoreStore(firestore),'Boutiques centrales C2g sur Firestore');
admissionM2Suite(()=>firestoreStore(firestore),'Admission vers M2 I3a sur Firestore');
admissionM2CheckSuite(()=>firestoreStore(firestore),'Contrôle dossiers M2 I3c sur Firestore');
admissionM2ReconciliationSuite(()=>firestoreStore(firestore),'Rapprochement M2 I3b sur Firestore');
centralSpaceImportSuite(()=>firestoreStore(firestore),'Excel spatial C2m sur Firestore');
centralShopImportSuite(()=>firestoreStore(firestore),'Excel boutiques et offres C2l sur Firestore');
centralKnowledgeSuite(()=>firestoreStore(firestore),'Informations centrales C2h sur Firestore');
centralSpaceSuite(()=>firestoreStore(firestore),'Spatioport central C2j sur Firestore');
centralMissionsSuite(()=>firestoreStore(firestore),'Missions centrales C2i sur Firestore');
centralStoryImportSuite(()=>firestoreStore(firestore),'Excel informations et missions C2k sur Firestore');
centralClassKitsSuite(()=>firestoreStore(firestore),'Kits initiaux C2e sur Firestore');
centralInitialCoherenceSuite(()=>firestoreStore(firestore),'Cohérence initiale C2f sur Firestore');
centralRecipesSuite(()=>firestoreStore(firestore),'Recettes centrales C1c sur Firestore');
centralImportSuite(()=>firestoreStore(firestore),'Excel central C1d sur Firestore');
centralCharacterImportSuite(()=>firestoreStore(firestore),'Excel personnages C2d sur Firestore');
centralCharactersSuite(()=>firestoreStore(firestore),'Personnages centraux C1e sur Firestore');
centralCharacterPlanSuite(()=>firestoreStore(firestore),'Plan initial C2c sur Firestore');
centralReviewSuite(()=>firestoreStore(firestore),'Délégation C2b sur Firestore');
centralCheckSuite(()=>firestoreStore(firestore),'Contrôle central C2a sur Firestore');
admissionsSuite(()=>firestoreStore(firestore),'Admissions SO sur Firestore');
characterNatureSuite(()=>firestoreStore(firestore),'SO-01a natures sur Firestore');
groupManagementSuite(()=>firestoreStore(firestore),'Régie groupes I2b sur Firestore');
groupsSuite(()=>firestoreStore(firestore),'Groupes sur Firestore');
knowledgeSuite(()=>firestoreStore(firestore),'Connaissances sur Firestore');
notebookSuite(()=>firestoreStore(firestore),'Carnet sur Firestore');
abilitiesSuite(()=>firestoreStore(firestore),'Compétences sur Firestore');
healthSuite(()=>firestoreStore(firestore),'PV et soins sur Firestore');
inventorySuite(()=>firestoreStore(firestore),'Inventaire sur Firestore');
pricesSuite(()=>firestoreStore(firestore),'Cours sur Firestore');
voyagesSuite(()=>firestoreStore(firestore),'Navigation sur Firestore');
cargoSuite(()=>firestoreStore(firestore),'Cargaisons sur Firestore');
customsSuite(()=>firestoreStore(firestore),'Douanes sur Firestore');
logisticsSuite(()=>firestoreStore(firestore),'Logistique sur Firestore');
transfersSuite(()=>firestoreStore(firestore),'Remises sur Firestore');
economySuite(()=>firestoreStore(firestore),'Crédits sur Firestore');
collectiveSuite(()=>firestoreStore(firestore),'Caisses sur Firestore');
salesSuite(()=>firestoreStore(firestore),'Ventes sur Firestore');
marketSuite(()=>firestoreStore(firestore),'Marché sur Firestore');
negotiationsSuite(()=>firestoreStore(firestore),'Négociation sur Firestore');
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

personSuite(()=>firestoreStore(firestore),'Interactions sur Firestore');

admissionReviewsSuite(()=>firestoreStore(firestore),'Décisions SO sur Firestore');

spaceOutlawsEntrySuite(()=>firestoreStore(firestore),'Entrée SO sur Firestore');
spaceOutlawsActionsSuite(()=>firestoreStore(firestore),'Actions SO sur Firestore');

spaceOutlawsShopsSuite(()=>firestoreStore(firestore),'Boutiques SO sur Firestore');
spaceOutlawsHealthSuite(()=>firestoreStore(firestore),'Santé SO sur Firestore');

spaceOutlawsVoyagesSuite(()=>firestoreStore(firestore),'Vols SO sur Firestore');

spaceEncountersSuite(()=>firestoreStore(firestore),'Rencontres spatiales SO sur Firestore');

spaceLogisticsSuite(()=>firestoreStore(firestore),'Entretien et fret SO sur Firestore');

spaceMissionsSuite(()=>firestoreStore(firestore),'Missions SO sur Firestore');

missionExecutionSuite(()=>firestoreStore(firestore),'Exécution missions SO sur Firestore');

spaceEpisodesSuite(()=>firestoreStore(firestore),'Épisodes SO sur Firestore');

spaceSearchSuite(()=>firestoreStore(firestore),'Fouilles V3.6 sur Firestore');
