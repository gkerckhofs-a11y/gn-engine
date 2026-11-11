// Explicit, opt-in draft-PR scopes. These successes are never global baselines.
const infrastructure=['.github/workflows/check.yml','scripts/ci-plan.mjs','scripts/ci-scope.mjs','scripts/ci-targeted.mjs','scripts/ci-run-tests.mjs','test/ci-selection.test.mjs','test/ci-targeted.test.mjs'];
const diagnosticTests=['test/space-technical-analysis.test.mjs','test/space-technical-analysis-ui.test.mjs','test/space-outlaws-actions.test.mjs','test/space-outlaws-actions-ui.test.mjs','test/field-actions.test.mjs','test/field-ui.test.mjs','test/action-points.test.mjs','test/knowledge.test.mjs','test/knowledge-ui.test.mjs','test/space-episodes.test.mjs','test/space-episodes-ui.test.mjs','test/central-field-targets.test.mjs','test/central-field-targets-ui.test.mjs'];
const moduleCatalogTests=['test/space-ship-module-catalog.test.mjs','test/central-master.test.mjs','test/central-ui.test.mjs','test/central-import.test.mjs','test/central-import-ui.test.mjs','test/central-snapshots.test.mjs','test/central-class-kits.test.mjs','test/central-shops.test.mjs','test/inventory.test.mjs','test/inventory-ui.test.mjs','test/space-outlaws-entry.test.mjs','test/space-outlaws-entry-ui.test.mjs','test/space-outlaws-shops.test.mjs','test/space-outlaws-shops-ui.test.mjs'];
export const targetedProfiles={
 ci:{tests:['test/ci-selection.test.mjs','test/ci-targeted.test.mjs'],suites:[],httpPattern:null,files:infrastructure},
 'module-catalog':{tests:[...moduleCatalogTests,'test/ci-selection.test.mjs','test/ci-targeted.test.mjs'],suites:['space-ship-module-catalog','central-master','central-import','central-snapshots','central-class-kits','central-shops','inventory','space-outlaws-entry','space-outlaws-shops'],httpPattern:'^HTTP \\+ Auth : (modules M1 calibrés,|Master central,|XLSX central,)',files:[...infrastructure,...moduleCatalogTests,'src/shared/space-ship-modules.mjs','src/core/inventory-state.mjs','src/core/central-master.mjs','src/core/space-outlaws-entry.mjs','web/central-master.mjs','test/support/space-ship-module-catalog-suite.mjs','test/support/firestore-suites.mjs','test/integration/http.test.mjs']},
 diagnostic:{tests:[...diagnosticTests,'test/ci-selection.test.mjs','test/ci-targeted.test.mjs'],suites:['space-technical-analysis','space-outlaws-actions','field','action-points','knowledge','space-episodes','central-field-targets'],httpPattern:'^HTTP \\+ Auth : diagnostic MEC-01 préparé,',files:[...infrastructure,...diagnosticTests,'src/core/space-technical-analysis.mjs','web/field-actions.mjs','web/central-field-targets.mjs','test/support/space-technical-analysis-suite.mjs','test/integration/http.test.mjs']},
};
// Purchase scope includes the earlier catalogue changes since the global baseline.
targetedProfiles['module-purchases']={
 tests:[...targetedProfiles['module-catalog'].tests,'test/space-module-purchases.test.mjs','test/economy.test.mjs','test/sales.test.mjs','test/space-episodes.test.mjs','test/space-episodes-ui.test.mjs','test/central-shops-ui.test.mjs','test/space-outlaws-voyages.test.mjs'],
 suites:[...targetedProfiles['module-catalog'].suites,'space-module-purchases','economy','sales','space-episodes','space-outlaws-voyages'],
 httpPattern:'^HTTP \\+ Auth : (achat de module calibré,|modules M1 calibrés,|Master central,|XLSX central,)',
 files:[...targetedProfiles['module-catalog'].files,'src/core/shops.mjs','src/core/space-outlaws-shop-state.mjs','web/shops.mjs','web/central-shops.mjs','test/space-module-purchases.test.mjs','test/support/space-module-purchases-suite.mjs','test/support/space-outlaws-shops-suite.mjs','test/economy.test.mjs','test/sales.test.mjs','test/space-episodes.test.mjs','test/space-episodes-ui.test.mjs','test/central-shops-ui.test.mjs','test/space-outlaws-voyages.test.mjs'],
};
// Preparatory consent only; the new service has no capability to write resources.
targetedProfiles['module-mandates']={
 tests:[...targetedProfiles['module-purchases'].tests,'test/space-module-mandates.test.mjs','test/space-module-mandates-ui.test.mjs','test/workflow.test.mjs','test/space-logistics.test.mjs','test/space-logistics-ui.test.mjs','test/space-ship-names.test.mjs','test/player-spaces.test.mjs'],
 suites:[...targetedProfiles['module-purchases'].suites,'space-module-mandates','workflow','space-logistics','space-ship-names'],
 httpPattern:'^HTTP \\+ Auth : (mandat de module,|achat de module calibré,|modules M1 calibrés,|Master central,|XLSX central,)',
 files:[...targetedProfiles['module-purchases'].files,'src/core/space-module-mandates.mjs','src/core/workflow.mjs','src/core/space-maintenance.mjs','src/core/space-outlaws-entry-guard.mjs','web/space-module-mandates.mjs','web/app.mjs','web/space-maintenance.mjs','web/player-spaces.mjs','test/space-module-mandates.test.mjs','test/space-module-mandates-ui.test.mjs','test/support/space-module-mandates-suite.mjs','test/support/space-outlaws-voyages-suite.mjs','test/support/space-logistics-suite.mjs','test/workflow.test.mjs','test/space-logistics.test.mjs','test/space-logistics-ui.test.mjs','test/space-ship-names.test.mjs','test/player-spaces.test.mjs'],
};
// Start/cancel reservations only. No module installation or financial mutation.
targetedProfiles['module-work']={
 tests:[...targetedProfiles['module-mandates'].tests,'test/space-module-work.test.mjs','test/space-module-work-ui.test.mjs','test/action-points.test.mjs','test/field-actions.test.mjs'],
 suites:[...targetedProfiles['module-mandates'].suites,'space-module-work','action-points','field'],
 httpPattern:'^HTTP \\+ Auth : (travail de module,|mandat de module,|achat de module calibré,|modules M1 calibrés,|Master central,|XLSX central,)',
 files:[...targetedProfiles['module-mandates'].files,'src/core/space-module-work.mjs','web/space-module-work.mjs','test/space-module-work.test.mjs','test/space-module-work-ui.test.mjs','test/support/space-module-work-suite.mjs','test/action-points.test.mjs','test/field-actions.test.mjs'],
};
// Finalisation à quai; equipped departures remain explicitly closed pending voyage effects.
targetedProfiles['module-installation']={
 tests:[...targetedProfiles['module-work'].tests,'test/space-module-installation.test.mjs','test/space-outlaws-voyages-ui.test.mjs','test/space-convoy.test.mjs','test/space-convoy-ui.test.mjs'],
 suites:[...targetedProfiles['module-work'].suites,'space-module-installation','space-convoy'],
 httpPattern:'^HTTP \\+ Auth : (montage de module,|travail de module,|mandat de module,|achat de module calibré,|modules M1 calibrés,|Master central,|XLSX central,)',
 files:[...targetedProfiles['module-work'].files,'src/core/space-outlaws-voyages.mjs','src/core/space-convoy.mjs','src/core/inventory.mjs','web/inventory.mjs','web/space-outlaws-voyages.mjs','test/space-module-installation.test.mjs','test/support/space-module-installation-suite.mjs','test/support/space-module-purchases-suite.mjs','test/support/space-outlaws-shops-suite.mjs','test/support/space-logistics-suite.mjs','test/space-outlaws-voyages-ui.test.mjs','test/space-convoy.test.mjs','test/space-convoy-ui.test.mjs'],
};
targetedProfiles['module-removal']={
 tests:[...targetedProfiles['module-installation'].tests,'test/space-module-removal.test.mjs'],
 suites:[...targetedProfiles['module-installation'].suites,'space-module-removal'],
 httpPattern:'^HTTP \\+ Auth : (retrait de module,|montage de module,|travail de module,|mandat de module,|achat de module calibré,|modules M1 calibrés,|Master central,|XLSX central,)',
 files:[...targetedProfiles['module-installation'].files,'test/space-module-removal.test.mjs','test/support/space-module-removal-suite.mjs'],
};
// Combat adapter only; equipped flight remains closed. Include native duel/fleet
// consumers and all accumulated module changes since the global baseline.
const moduleCombatSuites=['space-encounters','space-escort-maneuvers','space-alliance-convoy','space-alliance-duels','space-alliance-defense','space-pirate-alliances','space-targeted-ambushes'];
const moduleCombatTests=[...moduleCombatSuites.flatMap(id=>[`test/${id}.test.mjs`,`test/${id}-ui.test.mjs`]),'test/space-combat-state.test.mjs','test/space-convoy-combat.test.mjs','test/space-escort-maneuvers-state.test.mjs'];
targetedProfiles['module-combat']={
 tests:[...targetedProfiles['module-removal'].tests,...moduleCombatTests],
 suites:[...targetedProfiles['module-removal'].suites,...moduleCombatSuites],
 httpPattern:targetedProfiles['module-removal'].httpPattern.replace('retrait de module,|','duel privé,|convoi consenti,|alliance contre convoi à quatre,|retrait de module,|'),
 files:[...targetedProfiles['module-removal'].files,'src/core/space-combat.mjs','test/support/space-encounters-suite.mjs','test/support/space-convoy-suite.mjs',...moduleCombatTests],
};
// Equipped departures, timed outage and native voyage/maintenance consumers.
targetedProfiles['module-flight']={
 tests:[...targetedProfiles['module-combat'].tests,'test/space-module-flight.test.mjs','test/space-detours.test.mjs','test/space-detours-ui.test.mjs','test/space-transport.test.mjs','test/space-transport-ui.test.mjs'],
 suites:[...targetedProfiles['module-combat'].suites,'space-module-flight','space-detours','space-transport'],
 httpPattern:targetedProfiles['module-combat'].httpPattern.replace('duel privé,|','vol équipé,|duel privé,|'),
 files:[...targetedProfiles['module-combat'].files,'src/core/space-module-flight.mjs','src/core/space-pirate-alliances.mjs','src/core/space-outlaws-navigation-state.mjs','src/core/space-detours.mjs','test/space-module-flight.test.mjs','test/support/space-module-flight-suite.mjs','test/space-detours.test.mjs','test/space-detours-ui.test.mjs','test/space-transport.test.mjs','test/space-transport-ui.test.mjs'],
};
// Preparation-only MOD-04. Keep the live equipment/voyage consumers in scope
// because the shared catalogue now distinguishes defined from playable modules.
targetedProfiles['hidden-catalog']={...targetedProfiles['module-flight']};
// Unpublished hidden-cargo component and native movement/boarding consumers.
targetedProfiles['hidden-inspection']={
 tests:[...targetedProfiles['hidden-catalog'].tests,'test/space-hidden-cargo.test.mjs','test/cargo.test.mjs','test/space-boarding-cargo.test.mjs'],
 suites:[...targetedProfiles['hidden-catalog'].suites,'space-hidden-cargo','cargo','space-boarding-cargo'],
 httpPattern:targetedProfiles['hidden-catalog'].httpPattern.replace('vol équipé,|','fret caché préparatoire,|vol équipé,|'),
 files:[...targetedProfiles['hidden-catalog'].files,'src/core/space-hidden-cargo.mjs','src/core/cargo-batches.mjs','src/core/space-boarding-cargo.mjs','test/space-hidden-cargo.test.mjs','test/cargo.test.mjs','test/space-boarding-cargo.test.mjs','test/support/space-hidden-cargo-suite.mjs','test/support/cargo-suite.mjs','test/support/space-boarding-cargo-suite.mjs'],
};
// Removal-only extension of the closed hidden-cargo component.
targetedProfiles['hidden-removal']={...targetedProfiles['hidden-inspection']};
// Owner/agent/regie UI, native cargo entry links and page routing.
targetedProfiles['hidden-ui']={
 tests:[...targetedProfiles['hidden-removal'].tests,'test/space-hidden-cargo-ui.test.mjs','test/cargo-ui.test.mjs'],
 suites:[...targetedProfiles['hidden-removal'].suites],
 httpPattern:targetedProfiles['hidden-removal'].httpPattern,
 files:[...targetedProfiles['hidden-removal'].files,'src/core/cargo.mjs','web/cargo.mjs','web/space-hidden-cargo.mjs','test/space-hidden-cargo-ui.test.mjs','test/cargo-ui.test.mjs',
  // The central, Excel and inventory suites are already included in this scope.
  'src/core/central-import.mjs','src/shared/central-import-schema.mjs',
  'test/support/central-master-suite.mjs','test/support/central-import-suite.mjs'],
};
// Versioned MOD-04 equipment and decision B: no disclosure on outage.
targetedProfiles['hidden-flight']={...targetedProfiles['hidden-ui'],httpPattern:targetedProfiles['hidden-ui'].httpPattern.replace('fret caché préparatoire,|','MOD-04 équipé,|fret caché préparatoire,|'),files:[...targetedProfiles['hidden-ui'].files,'test/support/space-outlaws-voyages-suite.mjs','test/support/space-logistics-suite.mjs','test/support/space-module-installation-suite.mjs','test/support/space-module-mandates-suite.mjs','test/support/space-module-work-suite.mjs','test/support/space-module-purchases-suite.mjs','test/support/space-module-removal-suite.mjs','test/support/space-module-flight-suite.mjs','test/support/space-encounters-suite.mjs']};
// Targeted component DOM checks run locally with a separate bounded config.
// Keep the historical whole-app browser recipe disabled for this draft scope.
targetedProfiles['hidden-visual']={...targetedProfiles['hidden-flight'],files:[...targetedProfiles['hidden-flight'].files,'web/galactic.css','test/browser/hidden-cargo.spec.mjs','test/browser/hidden-cargo.config.mjs']};
// Preparation-only MOD-05; include all consumers of the shared catalogue.
targetedProfiles['towing-catalog']={...targetedProfiles['hidden-visual']};
// Closed towing consent/start/cancel; no attached departure or publication.
targetedProfiles['towing-work']={tests:[...targetedProfiles['towing-catalog'].tests,'test/space-towing-work.test.mjs'],suites:[...targetedProfiles['towing-catalog'].suites,'space-towing-work'],httpPattern:targetedProfiles['towing-catalog'].httpPattern.replace('MOD-04 équipé,|','attelage préparatoire,|MOD-04 équipé,|'),files:[...targetedProfiles['towing-catalog'].files,'src/core/space-towing-work.mjs','test/space-towing-work.test.mjs','test/support/space-towing-work-suite.mjs']};
targetedProfiles['towing-attachment']={...targetedProfiles['towing-work'],httpPattern:targetedProfiles['towing-work'].httpPattern.replace('attelage préparatoire,|','attelage finalisé,|attelage préparatoire,|')};
targetedProfiles['towing-flight']={tests:[...targetedProfiles['towing-attachment'].tests,'test/space-towing-flight.test.mjs'],suites:[...targetedProfiles['towing-attachment'].suites,'space-towing-flight'],httpPattern:targetedProfiles['towing-attachment'].httpPattern.replace('attelage finalisé,|','trajet remorqué sécurisé,|attelage finalisé,|'),files:[...targetedProfiles['towing-attachment'].files,'src/core/space-towing-flight.mjs','test/space-towing-flight.test.mjs','test/support/space-towing-flight-suite.mjs']};
targetedProfiles['towing-combat']={tests:[...targetedProfiles['towing-flight'].tests,'test/space-towing-combat.test.mjs'],suites:[...targetedProfiles['towing-flight'].suites,'space-towing-combat'],httpPattern:targetedProfiles['towing-flight'].httpPattern.replace('trajet remorqué sécurisé,|','largage remorqué,|trajet remorqué sécurisé,|'),files:[...targetedProfiles['towing-flight'].files,'src/core/space-towing-combat.mjs','test/space-towing-combat.test.mjs','test/support/space-towing-combat-suite.mjs']};
targetedProfiles['towing-ui']={...targetedProfiles['towing-combat'],tests:[...targetedProfiles['towing-combat'].tests,'test/space-towing-combat-ui.test.mjs'],files:[...targetedProfiles['towing-combat'].files,'web/space-encounters.mjs','web/space-towing-combat.mjs','test/space-towing-combat-ui.test.mjs','test/browser/towing-combat.spec.mjs','test/browser/towing-combat.config.mjs']};
targetedProfiles['towing-outage']={...targetedProfiles['towing-ui'],tests:[...targetedProfiles['towing-ui'].tests,'test/space-towing-outage.test.mjs'],suites:[...targetedProfiles['towing-ui'].suites,'space-towing-outage'],httpPattern:targetedProfiles['towing-ui'].httpPattern.replace('largage remorqué,|','attente MOD-05,|largage remorqué,|'),files:[...targetedProfiles['towing-ui'].files,'src/core/space-combat-state.mjs','src/core/space-towing-outage.mjs','test/space-towing-outage.test.mjs','test/support/space-towing-outage-suite.mjs']};
targetedProfiles['towing-desk']={...targetedProfiles['towing-outage'],tests:[...targetedProfiles['towing-outage'].tests,'test/space-towing-desk.test.mjs','test/space-towing-work-ui.test.mjs'],suites:[...targetedProfiles['towing-outage'].suites,'space-towing-desk'],httpPattern:targetedProfiles['towing-outage'].httpPattern.replace('attente MOD-05,|','bureau attelage,|attente MOD-05,|'),files:[...targetedProfiles['towing-outage'].files,'web/space-towing-work.mjs','test/space-towing-desk.test.mjs','test/space-towing-work-ui.test.mjs','test/support/space-towing-desk-suite.mjs','test/browser/towing-desk.spec.mjs','test/browser/towing-desk.config.mjs']};
targetedProfiles['towing-complete']={...targetedProfiles['towing-desk'],tests:[...targetedProfiles['towing-desk'].tests,'test/space-towing-completion.test.mjs','test/space-towing-recovery.test.mjs','test/space-towing-recovery-ui.test.mjs'],suites:[...targetedProfiles['towing-desk'].suites,'space-towing-completion','space-towing-recovery'],httpPattern:targetedProfiles['towing-desk'].httpPattern.replace('bureau attelage,|','remorquage complet,|récupération PNJ,|bureau attelage,|'),files:[...targetedProfiles['towing-desk'].files,'src/core/space-rescue.mjs','src/core/space-towing-recovery.mjs','web/space-towing-recovery.mjs','test/space-towing-completion.test.mjs','test/space-towing-recovery.test.mjs','test/space-towing-recovery-ui.test.mjs','test/support/space-towing-completion-suite.mjs','test/support/space-towing-recovery-suite.mjs']};
// First versioned connection of native session rosters; cumulative branch coverage.
targetedProfiles['space-groups']={...targetedProfiles['towing-complete'],
 tests:[...targetedProfiles['towing-complete'].tests,'test/space-groups.test.mjs','test/group-management.test.mjs','test/group-management-ui.test.mjs','test/groups.test.mjs','test/groups-ui.test.mjs','test/space-succession.test.mjs'],
 suites:[...targetedProfiles['towing-complete'].suites,'space-groups','group-management','groups','space-succession'],
 httpPattern:targetedProfiles['towing-complete'].httpPattern.replace('remorquage complet,|','groupes SO,|remorquage complet,|'),
 files:[...targetedProfiles['towing-complete'].files,'src/core/group-management.mjs','web/group-management.mjs','web/groups.mjs','web/space-outlaws-entry.mjs','test/space-groups.test.mjs','test/support/space-groups-suite.mjs','test/group-management.test.mjs','test/group-management-ui.test.mjs','test/groups.test.mjs','test/groups-ui.test.mjs','test/space-succession.test.mjs','test/browser/space-groups.spec.mjs','test/browser/space-groups.config.mjs'],
};
// M2 definitions are seeded once, memberships remain explicit native roster commands.
targetedProfiles['group-definitions']={...targetedProfiles['space-groups'],
 tests:[...targetedProfiles['space-groups'].tests,'test/space-group-definitions.test.mjs','test/central-groups.test.mjs','test/central-groups-ui.test.mjs'],
 suites:[...targetedProfiles['space-groups'].suites,'space-group-definitions','central-groups'],
 httpPattern:targetedProfiles['space-groups'].httpPattern.replace('groupes SO,|','groupes M2,|groupes SO,|'),
 files:[...targetedProfiles['space-groups'].files,'src/shared/space-outlaws-groups.mjs','src/core/space-outlaws-group-state.mjs','test/space-group-definitions.test.mjs','test/support/space-group-definitions-suite.mjs','test/central-groups.test.mjs','test/central-groups-ui.test.mjs','test/support/space-groups-suite.mjs'],
};
// Read-only private admission wishes, existing roster commands and cumulative branch guards.
targetedProfiles['friend-requests']={...targetedProfiles['group-definitions'],
 tests:[...targetedProfiles['group-definitions'].tests,'test/space-group-requests.test.mjs'],
 suites:[...targetedProfiles['group-definitions'].suites,'space-group-requests'],
 httpPattern:targetedProfiles['group-definitions'].httpPattern.replace('groupes M2,|','souhaits de groupe,|groupes M2,|'),
 files:[...targetedProfiles['group-definitions'].files,'src/core/space-outlaws-group-requests.mjs','test/space-group-requests.test.mjs','test/support/space-group-requests-suite.mjs','test/support/space-outlaws-actions-suite.mjs','test/support/space-outlaws-entry-suite.mjs','test/support/space-succession-suite.mjs'],
};
targetedProfiles['roster-search']={...targetedProfiles['friend-requests'],
 tests:[...targetedProfiles['friend-requests'].tests,'test/space-roster.test.mjs'],
 suites:[...targetedProfiles['friend-requests'].suites,'space-roster'],
 httpPattern:targetedProfiles['friend-requests'].httpPattern.replace('souhaits de groupe,|','catalogue de personnages,|souhaits de groupe,|'),
 files:[...targetedProfiles['friend-requests'].files,'src/core/space-outlaws-roster.mjs','test/space-roster.test.mjs','test/support/space-roster-suite.mjs'],
};
targetedProfiles['group-wallets']={...targetedProfiles['roster-search'],
 tests:[...targetedProfiles['roster-search'].tests,'test/collective.test.mjs','test/collective-ui.test.mjs','test/space-group-wallets.test.mjs'],
 suites:[...targetedProfiles['roster-search'].suites,'collective','space-group-wallets'],
 httpPattern:targetedProfiles['roster-search'].httpPattern.replace('catalogue de personnages,|','caisse SO,|catalogue de personnages,|'),
 files:[...targetedProfiles['roster-search'].files,'src/core/collective-accounts.mjs','web/collective-accounts.mjs','test/collective-ui.test.mjs','test/space-group-wallets.test.mjs','test/support/space-group-wallets-suite.mjs'],
};
targetedProfiles['group-stock']={...targetedProfiles['group-wallets'],
 tests:[...targetedProfiles['group-wallets'].tests,'test/logistics.test.mjs','test/logistics-ui.test.mjs','test/space-group-stock.test.mjs'],
 suites:[...targetedProfiles['group-wallets'].suites,'logistics','space-group-stock'],
 httpPattern:targetedProfiles['group-wallets'].httpPattern.replace('caisse SO,|','stock SO,|caisse SO,|'),
 files:[...targetedProfiles['group-wallets'].files,'src/core/logistics.mjs','src/core/storage-state.mjs','web/logistics.mjs','test/logistics-ui.test.mjs','test/space-group-stock.test.mjs','test/support/space-group-stock-suite.mjs'],
};
targetedProfiles['group-pilot']={...targetedProfiles['group-stock'],
 tests:[...targetedProfiles['group-stock'].tests,'test/space-group-pilot.test.mjs'],
 suites:[...targetedProfiles['group-stock'].suites,'space-group-pilot'],
 httpPattern:targetedProfiles['group-stock'].httpPattern.replace('stock SO,|','pilotage de groupe SO,|stock SO,|'),
 files:[...targetedProfiles['group-stock'].files,'test/space-group-pilot.test.mjs','test/support/space-group-pilot-suite.mjs'],
};
targetedProfiles['central-revision']={...targetedProfiles['group-pilot'],
 tests:[...targetedProfiles['group-pilot'].tests,'test/central-revision.test.mjs'],
 suites:[...targetedProfiles['group-pilot'].suites,'central-revision'],
 httpPattern:targetedProfiles['group-pilot'].httpPattern.replace('Master central,|','candidature, naissance,|Master central,|'),
 files:[...targetedProfiles['group-pilot'].files,'test/central-revision.test.mjs','test/support/central-revision-suite.mjs'],
};
targetedProfiles['central-revision-check']={...targetedProfiles['central-revision'],
 tests:[...targetedProfiles['central-revision'].tests,'test/central-check-ui.test.mjs'],
 suites:[...targetedProfiles['central-revision'].suites,'central-check','central-review'],
 files:[...targetedProfiles['central-revision'].files,'src/core/central-check.mjs','web/central-check.mjs','test/central-check-ui.test.mjs'],
};
targetedProfiles['central-revision-excel']={...targetedProfiles['central-revision-check'],
 suites:[...targetedProfiles['central-revision-check'].suites,'central-character-import','central-field-import','central-shop-import','central-space-import','central-story-import'],
 files:[...targetedProfiles['central-revision-check'].files,'src/core/central-import.mjs','web/central-import.mjs'],
};
targetedProfiles['central-revision-snapshots']={...targetedProfiles['central-revision-excel'],
 files:[...targetedProfiles['central-revision-excel'].files,'src/core/central-snapshots.mjs','web/central-snapshots.mjs','test/central-snapshots-ui.test.mjs'],
};
targetedProfiles['central-revision-release-check']={...targetedProfiles['central-revision-snapshots'],
 files:[...targetedProfiles['central-revision-snapshots'].files,'src/core/space-outlaws-release-check.mjs','src/core/space-outlaws-shop-state.mjs'],
};
targetedProfiles['central-revision-release']={...targetedProfiles['central-revision-release-check'],
 tests:[...new Set([...targetedProfiles['central-revision-release-check'].tests,'test/space-learning.test.mjs'])],
 suites:[...new Set([...targetedProfiles['central-revision-release-check'].suites,'space-learning'])],
 files:[...targetedProfiles['central-revision-release-check'].files,'src/core/space-outlaws-learning.mjs','src/core/space-outlaws-succession.mjs'],
};
targetedProfiles['episode-master']={...targetedProfiles['central-revision-release'],
 httpPattern:targetedProfiles['central-revision-release'].httpPattern.replace('candidature, naissance,|','épisode sur Master révisé,|candidature, naissance,|'),
 files:[...targetedProfiles['central-revision-release'].files,'src/core/campaigns.mjs','src/core/space-outlaws-episodes.mjs','web/campaigns.mjs','web/space-outlaws-episodes.mjs'],
};
targetedProfiles['rogue-pickpocket']={...targetedProfiles['episode-master'],
 tests:[...new Set([...targetedProfiles['episode-master'].tests,'test/space-pickpocket.test.mjs','test/space-pickpocket-ui.test.mjs','test/inventory.test.mjs','test/inventory-ui.test.mjs','test/central-import.test.mjs','test/central-ui.test.mjs','test/field-actions.test.mjs','test/person-actions.test.mjs'])],
 suites:[...new Set([...targetedProfiles['episode-master'].suites,'space-pickpocket','inventory','field','person','space-outlaws-actions','space-outlaws-entry'])],
 files:[...targetedProfiles['episode-master'].files,'src/core/space-pickpocket.mjs','src/core/workflow.mjs','src/core/inventory-state.mjs','src/core/space-outlaws-entry-guard.mjs','src/core/space-outlaws-entry.mjs','src/core/central-master.mjs','web/app.mjs','web/central-master.mjs','web/inventory.mjs','web/space-pickpocket.mjs','test/support/space-pickpocket-suite.mjs','test/space-pickpocket.test.mjs','test/space-pickpocket-ui.test.mjs','test/support/firestore-suites.mjs','scripts/ci-targeted.mjs'],
};
targetedProfiles['rogue-escape']={...targetedProfiles['rogue-pickpocket'],
 tests:[...new Set([...targetedProfiles['rogue-pickpocket'].tests.filter(p=>!['test/inventory-ui.test.mjs','test/central-import.test.mjs'].includes(p)),'test/space-escape.test.mjs','test/space-escape-ui.test.mjs'])],
 suites:[...new Set([...targetedProfiles['rogue-pickpocket'].suites,'space-escape'])],
 files:[...targetedProfiles['rogue-pickpocket'].files,'src/core/field-actions.mjs','src/core/person-actions.mjs','src/core/space-escape.mjs','web/space-escape.mjs','test/space-escape.test.mjs','test/space-escape-ui.test.mjs','test/support/space-escape-suite.mjs'],
};
// INF-02 retains the transitive Rogue/Master scope while selecting at most 100
// application files. Omitted tests are unrelated towing/group UI and remain covered
// by the full regression gate before merge.
targetedProfiles['infiltrator-decryption']={...targetedProfiles['rogue-escape'],
 tests:[...new Set([...targetedProfiles['rogue-escape'].tests.filter(p=>![
  'test/space-towing-combat-ui.test.mjs','test/space-towing-recovery-ui.test.mjs',
  'test/space-towing-work-ui.test.mjs','test/central-groups-ui.test.mjs'
 ].includes(p)),'test/space-decryption.test.mjs','test/space-decryption-ui.test.mjs',
 'test/central-knowledge.test.mjs','test/knowledge.test.mjs'])],
 suites:[...new Set([...targetedProfiles['rogue-escape'].suites,'space-decryption','central-knowledge','knowledge'])],
 files:[...targetedProfiles['rogue-escape'].files,
 'src/core/space-decryption.mjs','src/core/knowledge.mjs','src/core/central-knowledge.mjs',
 'web/space-decryption.mjs','web/central-knowledge.mjs',
 'test/support/space-decryption-suite.mjs','test/space-decryption.test.mjs','test/space-decryption-ui.test.mjs',
 'test/central-knowledge.test.mjs','test/knowledge.test.mjs'],
};
// Ordinary fictional INF-01 using M6 fieldTarget; no live device control.
targetedProfiles['infiltrator-intrusion']={...targetedProfiles['infiltrator-decryption'],
 tests:[...new Set([...targetedProfiles['infiltrator-decryption'].tests.filter(p=>![
  'test/space-towing-desk.test.mjs','test/space-towing-outage.test.mjs'
 ].includes(p)),'test/space-intrusion.test.mjs','test/space-intrusion-ui.test.mjs'])],
 suites:[...new Set([...targetedProfiles['infiltrator-decryption'].suites,'space-intrusion','central-field-targets'])],
 files:[...targetedProfiles['infiltrator-decryption'].files,
  'src/core/space-intrusion.mjs','src/core/field-state.mjs','src/core/central-field-targets.mjs',
  'src/core/space-outlaws-release-check.mjs',
  'web/space-intrusion.mjs','web/central-field-targets.mjs','web/field-actions.mjs',
  'test/support/space-intrusion-suite.mjs','test/space-intrusion.test.mjs','test/space-intrusion-ui.test.mjs'],
};
// INF-03: M6 fictional forgery templates, blank form stocks and private evidence.
targetedProfiles['infiltrator-forgery']={...targetedProfiles['infiltrator-intrusion'],
 tests:[...new Set([...targetedProfiles['infiltrator-intrusion'].tests.filter(p=>![
  'test/space-towing-work.test.mjs','test/space-towing-flight.test.mjs'
 ].includes(p)),'test/space-forgery.test.mjs','test/space-forgery-ui.test.mjs'])],
 suites:[...new Set([...targetedProfiles['infiltrator-intrusion'].suites,'space-forgery'])],
 files:[...targetedProfiles['infiltrator-intrusion'].files,
  'src/core/space-forgery.mjs','src/core/space-forgery-evidence.mjs','web/space-forgery.mjs','src/core/inventory-transfers.mjs','src/core/inventory.mjs','src/core/space-outlaws-entry-guard.mjs','web/inventory.mjs',
  'test/support/space-forgery-suite.mjs','test/space-forgery.test.mjs','test/space-forgery-ui.test.mjs'],
};
// Temporary fictional customs hold: strict 15-minute real-time expiry, no
// formal seizure or new sale/ownership powers.
targetedProfiles['customs-detention']={...targetedProfiles['infiltrator-forgery'],
 tests:[...new Set([...targetedProfiles['infiltrator-forgery'].tests.filter(p=>![
  'test/space-towing-combat.test.mjs','test/space-towing-recovery.test.mjs'
 ].includes(p)), 'test/space-customs-detention.test.mjs','test/space-customs-detention-ui.test.mjs'])],
 suites:[...new Set([...targetedProfiles['infiltrator-forgery'].suites,'space-customs-detention'])],
 files:[...targetedProfiles['infiltrator-forgery'].files,
  'src/core/space-customs-detention.mjs','src/core/inventory-state.mjs',
  'src/core/space-outlaws-entry.mjs','src/core/space-outlaws-entry-guard.mjs',
  'src/core/workflow.mjs','web/app.mjs','web/space-customs-detention.mjs',
  'web/inventory.mjs','test/support/space-customs-detention-suite.mjs',
  'test/space-customs-detention.test.mjs','test/space-customs-detention-ui.test.mjs'],
};
// Official, MJ-authorized confiscation after a temporary hold. This deliberately
// limits CI to adjacent inventory, forgery, customs, and authentication contracts.
targetedProfiles['customs-seizure']={
 tests:['test/space-customs-detention.test.mjs','test/space-customs-detention-ui.test.mjs',
  'test/space-customs-seizure.test.mjs','test/space-customs-seizure-ui.test.mjs',
  'test/space-forgery.test.mjs','test/space-forgery-ui.test.mjs',
  'test/space-pickpocket.test.mjs','test/inventory.test.mjs',
  'test/space-outlaws-entry.test.mjs','test/ci-targeted.test.mjs','test/ci-selection.test.mjs'],
 suites:['space-customs-detention','space-customs-seizure','space-forgery',
  'space-pickpocket','inventory','space-outlaws-entry','customs'],
 httpPattern:targetedProfiles['customs-detention'].httpPattern,
 files:[...targetedProfiles['customs-detention'].files,
  'src/core/space-customs-seizure.mjs','test/support/space-customs-seizure-suite.mjs',
  'test/space-customs-seizure.test.mjs','test/space-customs-seizure-ui.test.mjs'],
};
// Contestation de saisie : dépôt personnel et lecture MJ, sans mouvement de lots.
targetedProfiles['customs-appeal']={
 ...targetedProfiles['customs-seizure'],
 tests:[...targetedProfiles['customs-seizure'].tests,
  'test/space-customs-appeal.test.mjs','test/space-customs-appeal-ui.test.mjs'],
 suites:[...targetedProfiles['customs-seizure'].suites,'space-customs-appeal'],
 files:[...targetedProfiles['customs-seizure'].files,
  'src/core/space-customs-appeals.mjs','test/support/space-customs-appeal-suite.mjs',
  'test/space-customs-appeal.test.mjs','test/space-customs-appeal-ui.test.mjs'],
};
// Port-specific M3 item classifications plus the reference graph, Excel and UI.
targetedProfiles['customs-port']={
 ...targetedProfiles['hidden-ui'],
 tests:[...new Set([...targetedProfiles['hidden-ui'].tests,'test/player-spaces.test.mjs','test/central-space.test.mjs','test/central-space-ui.test.mjs','test/central-space-import.test.mjs','test/central-space-import-ui.test.mjs','test/central-check.test.mjs'])],
 suites:[...new Set([...targetedProfiles['hidden-ui'].suites,'central-space','central-space-import','central-check'])],
 files:[...targetedProfiles['hidden-ui'].files,'web/player-spaces.mjs','web/app.mjs','src/core/space-outlaws-entry-guard.mjs','test/player-spaces.test.mjs','src/shared/space-customs-rules.mjs',
  'src/core/central-space.mjs','src/core/central-space-import.mjs','src/core/central-check.mjs',
  'web/central-space.mjs','test/support/central-space-suite.mjs','test/support/central-space-import-suite.mjs',
  'test/central-space-ui.test.mjs','test/central-space-import-ui.test.mjs',
  'test/central-space.test.mjs','test/central-space-import.test.mjs']
};
targetedProfiles['pilot-recette']={
 tests:['test/recette.test.mjs','test/space-search.test.mjs','test/space-outlaws-voyages.test.mjs',
  'test/space-outlaws-entry.test.mjs','test/space-outlaws-shops.test.mjs',
  'test/ci-selection.test.mjs','test/ci-targeted.test.mjs'],
 suites:['space-search','space-outlaws-voyages','space-outlaws-entry','space-outlaws-shops'],
 httpPattern:null,
 files:[...infrastructure,'package.json','scripts/recette.mjs','scripts/recette/scenario.mjs',
  'scripts/recette/pilot.mjs','scripts/recette/serve.mjs','scripts/recette/cases.mjs',
  'scripts/recette/guide.mjs','test/recette.test.mjs','test/space-search.test.mjs',
  'test/space-outlaws-voyages.test.mjs','test/space-outlaws-entry.test.mjs',
  'test/space-outlaws-shops.test.mjs','docs/SO-RECETTE-LOCALE.md','docs/SO-PILOTE-GEL-V1.md']
};
export const isTargetedCommit=message=>typeof message==='string'&&message.includes('[ci targeted:');
export function requestedTarget(message){
 if(!isTargetedCommit(message))return null;
 const matches=[...message.matchAll(/\[ci targeted:([a-z-]+)\]/g)];
 if(matches.length!==1||message.split('[ci targeted:').length!==2||!Object.hasOwn(targetedProfiles,matches[0][1]))throw Error('Unknown or ambiguous targeted CI profile');
 return matches[0][1];
}
export function targetedScope(name,paths,{reliableBase=false}={}){
 const p=Object.hasOwn(targetedProfiles,name)?targetedProfiles[name]:null;
 if(!p||!reliableBase)throw Error('Targeted CI requires a verified global ancestor');
 for(const path of paths)if(!(path==='AGENTS.md'||path==='README.md'||path.startsWith('docs/')||p.files.includes(path)))throw Error(`File outside targeted CI profile ${name}: ${path}`);
 return {profile:`targeted-${name}`,reason:`Ciblage explicite ${name} ; résultat non global`,applicationTests:[...p.tests],suites:[...p.suites],http:!!p.httpPattern,httpPattern:p.httpPattern,browser:false};
}
