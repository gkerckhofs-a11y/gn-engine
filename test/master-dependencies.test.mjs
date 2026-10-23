import test from 'node:test';
import assert from 'node:assert/strict';
import {masterDependencies} from '../src/shared/master-dependencies.mjs';
import {dependenciesHtml} from '../web/master-dependencies.mjs';
import {moduleBundleHtml} from '../web/master-module-export.mjs';
test('Dépendances : identités par catalogue, listes et références conditionnelles',()=>{
 const sheets={Classes:[{id:'classe',competences:'commun:2;autre:1;commun:3'}],Competences:[{id:'commun',consommable_id:'commun'}],Vaisseaux:[{id:'v',proprietaire_type:'GROUP',proprietaire_id:'g',carburant_objet_id:'commun'}],EvenementsEco:[{id:'e',cible_type:'ROUTE',route_id:'r',objet_id:'ignore',declenchement:'MANUAL',installation_id:'ignore'}],Tarifs:[{id:'t',beneficiaire_type:'SINK',beneficiaire_id:'ignore',objet_id:'!EFFACER'}],Interactions:[{id:'i',prerequis:'commun:2',bonus_objets:'bonus:3',consommables_supplementaires:'kit:2;kit:4'}]};
 const refs=masterDependencies(sheets,{Competences:[{id:'commun',archived:false}],Objets:[{id:'commun',archived:true}],Groupes:[{id:'g',archived:false}],Routes:[{id:'r',archived:false}]});
 assert.equal(refs.filter(r=>r.sheet==='Classes').length,2);assert.ok(refs.some(r=>r.sheet==='Classes'&&r.targetId==='commun'&&r.presence==='PRESENT'&&r.included==='ROW'&&r.scope==='INTERNAL'));assert.ok(refs.some(r=>r.sheet==='Competences'&&r.targetId==='commun'&&r.presence==='ARCHIVED'&&r.scope==='EXTERNAL'));
 assert.ok(refs.some(r=>r.targetId==='autre'&&r.presence==='MISSING'));assert.ok(refs.some(r=>r.targetSheet==='Groupes'&&r.column==='proprietaire_id'));assert.ok(!refs.some(r=>r.targetId==='ignore'||r.targetId==='!EFFACER'));assert.equal(refs.filter(r=>r.column==='consommables_supplementaires').length,1);
});
test('Dépendances : archives, cellules vides, limites de couverture et état inconnu explicites',()=>{
 const sheets={Personnages:[{id:'p',portrait_media_id:'media'}],Routes:[{id:'r',depart_port:'port'}],Relations:[{id:'rel',operation:'ARCHIVER',personnage_id:'p',cible_id:'x'}],Connaissances:[{id:'k',personnages_initiaux:'p;q',qr_personnages:'!EFFACER',qr_competence_id:''}],ActionsTerrain:[{id:'a',lieu_id:'l',competence_id:'s',consommable_id:'',bonus_objets:''}],Lieux:[{id:'l',operation:'ARCHIVER'}]};
 const refs=masterDependencies(sheets);assert.equal(refs.length,4);assert.ok(refs.every(r=>r.presence==='UNKNOWN'));assert.ok(refs.some(r=>r.targetId==='l'&&r.included==='ARCHIVE'));assert.ok(!refs.some(r=>r.targetId==='media'||r.targetId==='port'));
 const html=dependenciesHtml(sheets);assert.match(html,/Non vérifiée/);assert.match(html,/médias, codes de ports/);assert.match(html,/dépendances indirectes/);assert.match(html,/aperçu d’import reste obligatoire/);
});
test('Dépendances : panneau intégré à l’export, textes échappés et absence limitée aux champs analysés',()=>{
 const meta=[{module:'communication',destination_id:'s',base_revision:'1'}],part={module:'communication',sheet:'Objectifs',meta,rows:[{row:{id:'<source>',personnage_id:'<cible>'}}],errors:[]};
 const w={module:'communication',bundle:true,meta,workspaces:[part],referenceIndex:{Personnages:[]},editable:true};const html=moduleBundleHtml(w);
 assert.match(html,/Références du classeur/);assert.match(html,/&lt;source&gt;/);assert.match(html,/&lt;cible&gt;/);assert.match(html,/Absente/);assert.match(html,/ligne 2/);assert.ok(html.includes('moduleDownloadAll'));
 assert.match(dependenciesHtml({Objets:[]},{}),/Aucune référence de catalogue relevée dans les champs analysés/);
});
