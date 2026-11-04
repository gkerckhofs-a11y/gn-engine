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
 files:[...targetedProfiles['hidden-removal'].files,'src/core/cargo.mjs','web/cargo.mjs','web/space-hidden-cargo.mjs','test/space-hidden-cargo-ui.test.mjs','test/cargo-ui.test.mjs'],
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
