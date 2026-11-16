import test from 'node:test';
import assert from 'node:assert/strict';
import {worldEncyclopedia} from '../world-encyclopedia-data.mjs';
import {wikiKeywords,wikiReferences,wikiTextHtml,publicWikiTargetIds} from '../world-encyclopedia-links.mjs';
import {holopediaArticleHtml,holopediaIndexHtml} from '../world-encyclopedia.mjs';

test('Liens : chaque terme renvoie uniquement vers une page publique existante',()=>{
 const ids=new Set(worldEncyclopedia.map(a=>a.id));
 assert.equal(worldEncyclopedia.length,56);
 assert.equal(worldEncyclopedia.filter(a=>a.kind==='planète').length,30);
 for(const id of publicWikiTargetIds)assert.ok(ids.has(id),'Destination inconnue : '+id);
 for(const page of worldEncyclopedia)for(const ref of wikiReferences(page))assert.ok(ids.has(ref),'Référence invalide : '+ref);
});
test('Liens : noms de planètes, lieux et organisation sont cliquables',()=>{
 const seen=new Set();
 const html=wikiTextHtml("À Breach Port, le Syndicat des Amarres négocie avec Corellia et Tatooine.",'prologue','public',seen);
 assert.match(html,/href="#\/holopedia\/public\/chapitre-03"/);
 assert.match(html,/href="#\/holopedia\/public\/chapitre-08"/);
 assert.match(html,/href="#\/holopedia\/public\/planete-corellia"/);
 assert.match(html,/href="#\/holopedia\/public\/planete-tatooine"/);
 assert.equal(seen.size,4);
});
test('Liens : une occurrence par cible, respect des mots entiers et pas de lien vers soi',()=>{
 const repeated=wikiTextHtml('Corellia, Corellia et les Corelliaens ; Mon Cala, Mon Calamari.','prologue');
 assert.equal((repeated.match(/planete-corellia/g)||[]).length,1);
 assert.equal((repeated.match(/planete-mon-cala/g)||[]).length,1);
 assert.doesNotMatch(repeated,/Corelliaens<\/a>/);
 assert.equal(wikiTextHtml('Corellia','planete-corellia'),'Corellia');
});
test('Liens : accents, apostrophes, texte échappé et données de session absentes',()=>{
 const html=wikiTextHtml("Le vent d’aiguilles et l'Atelier ; <img src=x onerror=alert(1)>.",'prologue');
 assert.match(html,/chapitre-04/);
 assert.match(html,/lieu-l-atelier/);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 const planet=holopediaArticleHtml('public','planete-tatooine');
 assert.match(planet,/wiki-keywords/);
 assert.match(planet,/Mots-clés/);
 assert.doesNotMatch(planet,/gmTruth|gmNotes|SECRET_MAP_ROUTE|navigationCode/);
});
test('Mots-clés : index des sujets publics et URL de recherche encodée',()=>{
 const article=worldEncyclopedia.find(x=>x.id==='atlas');
 assert.ok(wikiKeywords(article).includes('Commerce')||wikiKeywords(article).includes('Navigation'));
 const html=holopediaArticleHtml('public','atlas');
 assert.match(html,/keyword=/);
 assert.match(holopediaIndexHtml('public'),/data-holopedia-search/);
});
