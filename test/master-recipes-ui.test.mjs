import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {recipeMasterExample} from '../src/shared/recipe-example.mjs';
import {moduleDraft,moduleFormRow,moduleEditorHtml,moduleListHtml} from '../web/master-editor.mjs';
import {masterDependencies} from '../src/shared/master-dependencies.mjs';
import {recipeBundleSheets,moduleBundleHtml} from '../web/master-module-export.mjs';
import {readMasterXlsx} from '../web/master-xlsx.mjs';
import {writeMasterXlsx} from '../web/master-xlsx-write.mjs';

const workspace=()=>({module:'magasins',sheet:'Recettes',session:false,editable:true,errors:[],rows:[],newRow:{id:'new-recipe',operation:'CREER',version:'1'},meta:recipeMasterExample().Meta,references:{recipeItems:[{id:'ingredient',name:'<img src=x>'}],skills:[],recipeTargets:[],knowledge:[]}});
test('SO-06b interface : composants guidés, brouillon seul et texte échappé',()=>{
 const w=workspace(),d=moduleDraft(w),html=moduleEditorHtml(w,d);assert.match(html,/Quantité de &lt;img src=x&gt;/);assert.ok(!html.includes('<img'));assert.ok(!html.includes('value="PUBLISHED"'));
 assert.match(html,/aucune recette ne peut être publiée/);assert.match(moduleListHtml(w),/recipeExample/);
 const row=moduleFormRow(w,d,{...d.row,nom:'Formule',composants__levels:'1',composants__skill__ingredient:'OUI',composants__level__ingredient:'2'});
 assert.equal(row.composants,'ingredient:2');assert.equal(row.publication,'DRAFT');assert.ok(!Object.keys(row).some(k=>k.includes('__')));
});
test('SO-06b exemple : fidélité aux données proposées, aucune formule ni activation',async()=>{
 const source=JSON.parse(await readFile(new URL('../docs/source/SO_Recettes_V3_2.json',import.meta.url))),sheets=recipeMasterExample(),roundtrip=readMasterXlsx(writeMasterXlsx(sheets));
 assert.equal(sheets.Objets.length,15);assert.equal(sheets.Recettes.length,5);assert.ok(!JSON.stringify(sheets).includes('VLOOKUP'));assert.ok(!JSON.stringify(sheets).includes('SUMIF'));
 for(const sourceRow of source.Recettes.rows.slice(1)){
  const r=roundtrip.Recettes.find(r=>r.id===sourceRow[0]);assert.equal(r.nom,sourceRow[1]);assert.equal(r.niveau_minimum,String(sourceRow[3]));assert.equal(r.produit_id,sourceRow[4]);assert.equal(r.prix_indicatif,sourceRow[9]==null?'':String(sourceRow[9]));
  const components=source.Compositions.rows.slice(1).filter(c=>c[1]===r.id);assert.equal(r.composants,components.map(c=>`${c[2]}:${c[3]}`).join(';'));assert.equal(r.publication,'DRAFT');
 }
 for(const ingredient of source['Ingrédients'].rows.slice(1)){const i=sheets.Objets.find(i=>i.id===ingredient[0]);assert.equal(i.nom,ingredient[1]);assert.equal(i.description,ingredient[2]);assert.match(i.notes_mj,new RegExp(`Prix proposé : ${ingredient[4]} Cr`));}
 assert.ok(!sheets.Cours&&!sheets.Dotations&&!sheets.Connaissances&&!sheets.Lieux);
});
test('SO-06b export : objets référencés seulement et dépendances externes annoncées',()=>{
 const w=workspace(),meta=w.meta,recipe={id:'recette',operation:'MODIFIER',version:'2',nom:'Essai',produit_id:'dose',composants:'ingredient:2',connaissance_id:'secret',publication:'DRAFT'};
 const bundle={bundle:true,module:'magasins',meta,editable:true,workspaces:[{...w,sheet:'Objets',rows:['ingredient','dose','autre'].map(id=>({row:{id,operation:'MODIFIER',version:'1',nom:id},archived:false}))},{...w,rows:[{row:recipe,archived:false}]}]};
 const sheets=recipeBundleSheets(bundle);assert.deepEqual(sheets.Objets.map(i=>i.id),['ingredient','dose']);assert.deepEqual(Object.keys(sheets),['Meta','Objets','Recettes']);
 const refs=masterDependencies(sheets,{Objets:[{id:'dose'},{id:'ingredient'}],Connaissances:[{id:'secret'}]});assert.ok(refs.some(r=>r.targetId==='secret'&&r.scope==='EXTERNAL'&&r.included==='NONE'));
 assert.match(moduleBundleHtml(bundle),/moduleDownloadRecipes/);assert.throws(()=>recipeBundleSheets({...bundle,module:'personnages'}),/Boutiques/);
});
