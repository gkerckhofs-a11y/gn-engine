import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worldEncyclopedia} from '../world-encyclopedia-data.mjs';
import {wikiKeywords,wikiReferences,wikiTextHtml,publicWikiTargetIds} from '../world-encyclopedia-links.mjs';
import {holopediaArticleHtml,holopediaIndexHtml,holopediaSidebarHtml,encyclopediaCategories} from '../world-encyclopedia.mjs';

test('Liens : chaque terme renvoie uniquement vers une page publique existante',()=>{
 const ids=new Set(worldEncyclopedia.map(a=>a.id));
 assert.equal(worldEncyclopedia.length,62);
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

test('Histoire : République, guerre des Clones, Ordre 66 et Empire en cinq articles sourcés',()=>{
 const ids=['histoire-republique-a-empire','histoire-ancienne-republique-et-jedi','histoire-guerre-des-clones','histoire-ordre-66-et-disparition-des-jedi','histoire-naissance-empire'];
 const found=ids.map(id=>worldEncyclopedia.find(a=>a.id===id));
 assert.ok(found.every(Boolean));
 assert.ok(found.every(a=>a.category==='Histoire'&&a.paragraphs.length>=5));
 assert.ok(found.every(a=>a.sources?.length>=2));
 assert.ok(found.every(a=>a.sources.every(s=>new URL(s.url).hostname==='www.starwars.com')));
 const index=holopediaIndexHtml('public');
 for(const id of ids)assert.match(index,new RegExp(id));
 const html=holopediaArticleHtml('public','histoire-republique-a-empire');
 assert.match(html,/Guerres des Clones|guerre des Clones/);
 assert.match(html,/Ordre 66/);
 assert.doesNotMatch(html,/hors.jeu|starwars\.com|récit historique neutre/i);
 assert.match(html,/Bureau impérial/i);
 assert.match(html,/Archives impériales|Bureau impérial/i);
 const link=wikiTextHtml('L’Ordre 66 a suivi la guerre des Clones.','prologue');
 assert.match(link,/histoire-ordre-66-et-disparition-des-jedi/);
 assert.match(link,/histoire-guerre-des-clones/);
});

test('Histoire impériale : six archives, six illustrations dont cinq affiches renouvelées',()=>{
 const pages=worldEncyclopedia.filter(x=>x.imperialArchive===true);
 assert.equal(pages.length,6);
 assert.equal(worldEncyclopedia.filter(x=>x.kind==='planète').length,30);
 assert.equal(worldEncyclopedia.filter(x=>x.category==='Histoire').length,7);
 const manifest=JSON.parse(readFileSync('assets-source/history-posters.json','utf8')).history_posters;
 const expectedPosters={
  'histoire-republique-a-empire':'republique-empire',
  'histoire-guerre-des-clones':'guerre-clones',
  'histoire-ordre-66-et-disparition-des-jedi':'ordre-66',
  'histoire-naissance-empire':'naissance-empire',
  'histoire-crise-separatiste':'crise-separatiste'
 };
 assert.equal(Object.keys(manifest).length,5);
 assert.equal(new Set(Object.values(manifest)).size,5);
 for(const [id,slug] of Object.entries(expectedPosters)){
  const a=worldEncyclopedia.find(x=>x.id===id);
  assert.equal(a.poster,'posters/'+slug+'.webp',id);
  assert.match(manifest[slug],/^[A-Za-z0-9_-]{20,100}$/);
  assert.match(holopediaArticleHtml('public',id),/poster-webp/);
  assert.match(holopediaIndexHtml('public'),new RegExp('posters/'+slug+'\\.webp'));
 }
 assert.equal(worldEncyclopedia.find(x=>x.id==='histoire-ancienne-republique-et-jedi').poster,'posters/republic.svg','Préserver la seule affiche ancienne non remplacée');
 const posters=new Set(pages.map(x=>x.poster));
 assert.equal(posters.size,6);
 for(const article of pages){
  assert.equal(article.category,'Histoire');
  assert.ok(article.slogan&&article.paragraphs.length>=5);
  assert.ok(article.paragraphs[0].startsWith('ARCHIVES'));
  assert.match(article.poster,/^posters\/[a-z0-9-]+\.(?:svg|webp)$/);
  assert.ok(!/Darth Sidious|Darth Vader|Anakin Skywalker|Yoda|Obi-Wan Kenobi/.test(article.paragraphs.join(' ')));
  const html=holopediaArticleHtml('public',article.id);
  assert.match(html,/history-banner/);
  assert.match(html,/history-poster-hero/);
  assert.match(html,/history-stamp/);
  assert.match(html,/archive|officielle|propagande/i);
  assert.match(html,/Retour à votre terminal/);
 }
 const newPage=worldEncyclopedia.find(x=>x.id==='histoire-crise-separatiste');
 assert.equal(newPage.title,'La crise séparatiste');
 assert.match(holopediaIndexHtml('public'),/histoire-crise-separatiste/);
});


test('Chroniqueurs impériaux : chacune des 56 autres pages a une voix d’archives explicite',()=>{
 const oldPublic=worldEncyclopedia.filter(a=>!a.imperialArchive);
 const officialHistory=worldEncyclopedia.filter(a=>a.imperialArchive);
 assert.equal(worldEncyclopedia.length,62);
 assert.equal(oldPublic.length,56);
 assert.equal(officialHistory.length,6);
 assert.equal(oldPublic.filter(a=>a.imperialRecord).length,56);
 assert.equal(oldPublic.filter(a=>a.kind==='planète').length,30);
 assert.equal(oldPublic.filter(a=>a.kind==='lieu').length,7);
 assert.equal(oldPublic.filter(a=>a.id.startsWith('chapitre-')).length,16);
 for(const a of oldPublic){
  assert.ok(a.archivist?.length>=15,'Chroniqueur manquant : '+a.id);
  assert.ok(a.archiveLabel?.includes('impériale'),'Édition manquante : '+a.id);
  assert.ok(a.paragraphs.length>=2,'Notice incomplète : '+a.id);
  assert.ok(a.paragraphs.every(t=>t.trim().length>80),'Paragraphe trop court : '+a.id);
  const html=holopediaArticleHtml('public',a.id);
  assert.match(html,/archive-byline/,'Attribution invisible : '+a.id);
  assert.match(html,/Retour à votre terminal/);
  assert.ok(!html.includes('history-poster-hero'),'Une affiche de guerre apparaît à tort dans '+a.id);
 }
});
test('Chroniqueurs : préserver les faits publics et les limites de connaissances',()=>{
 const get=id=>worldEncyclopedia.find(a=>a.id===id).paragraphs.join(' ');
 assert.match(get('chapitre-02'),/Bordure médiane/);
 assert.match(get('chapitre-04'),/vent d.aiguilles/);
 assert.match(get('chapitre-08'),/Syndicat des Amarres/);
 assert.match(get('chapitre-11'),/Signataires/);
 assert.match(get('chapitre-11'),/Bras du Quai/);
 assert.match(get('chapitre-11'),/Cercle des Rivets/);
 assert.match(get('chapitre-11'),/Guetteurs/);
 assert.match(get('planete-kessel'),/Syndicat Pyke/);
 assert.match(get('planete-geonosis'),/accès restreint/);
 assert.match(get('planete-bespin'),/géante gazeuse/);
 assert.match(get('planete-kashyyyk'),/exploitation contestée/);
 assert.match(get('lieu-le-comptoir'),/casino clandestin/);
 assert.match(get('atlas'),/ne constitue cependant ni un code de navigation/);
 assert.match(get('chapitre-15'),/Jedi/);
 assert.equal(worldEncyclopedia.filter(a=>a.category==='Histoire').length,7);
 const all=worldEncyclopedia.filter(a=>a.imperialRecord).map(a=>a.paragraphs.join(' ')).join(' ');
 assert.doesNotMatch(all,/Darth Sidious|Darth Vader|Anakin Skywalker|Yoda|Obi-Wan Kenobi|gmTruth|gmNotes|navigationCode/);
 assert.match(holopediaIndexHtml('public'),/chroniqueurs impériaux/);
});


test('Images planétaires : 30 vues orbitales uniques couvrant chaque monde public',()=>{
 const planets=worldEncyclopedia.filter(a=>a.kind==='planète');
 assert.equal(planets.length,30);
 const images=planets.filter(a=>a.planetImage);
 assert.equal(images.length,30,'Chaque planète doit posséder sa propre illustration');
 assert.equal(new Set(images.map(a=>a.planetImage)).size,30);
 const manifest=JSON.parse(readFileSync('assets-source/planet-images.json','utf8'));
 const ids=Object.values(manifest.planet_images);
 assert.equal(ids.length,30,'Manifeste incomplet');
 assert.equal(new Set(ids).size,30,'Réutilisation non autorisée d’un même fichier Drive');
 for(const a of images){
   const slug=a.id.replace('planete-','');
   assert.equal(a.planetImage,'images/planets/'+slug+'.webp','Chemin invalide pour '+a.title);
   assert.ok(a.planetImageAlt?.includes(a.title),'Texte alternatif manquant : '+a.title);
   assert.match(manifest.planet_images[slug],/^[A-Za-z0-9_-]{20,100}$/,'Source Drive manquante : '+a.title);
   const page=holopediaArticleHtml('public',a.id);
   assert.match(page,/planet-hero-image/);
   assert.match(page,/Relevé orbital/);
   assert.ok(page.includes('images/planets/'+slug+'.webp'),'Image absente de la fiche : '+a.title);
 }
});

test('Images des lieux de Breach Port : sept fiches, cinq scènes exactes, sans révélation',()=>{
 const manifest=JSON.parse(readFileSync('assets-source/place-images.json','utf8')).place_images;
 assert.equal(Object.keys(manifest).length,5,'Cinq fichiers sources attendus');
 assert.equal(new Set(Object.values(manifest)).size,5,'Chaque scène source doit être distincte');
 const mapping={
   'lieu-la-cantina-de-la-traverse':['breach-port-cantina','center'],
   'lieu-le-spatioport':['breach-port-spatioport','center'],
   'lieu-la-maison-du-prefet-et-la-prison':['breach-port-imperial-office-docks','left'],
   'lieu-les-docks':['breach-port-imperial-office-docks','right'],
   'lieu-le-comptoir':['breach-port-comptoir','center'],
   'lieu-l-hospice':['breach-port-hospice-workshop','left'],
   'lieu-l-atelier':['breach-port-hospice-workshop','right']
 };
 const places=worldEncyclopedia.filter(a=>a.category==='Lieux de Breach Port');
 assert.equal(places.length,7);
 assert.equal(places.filter(a=>a.placeImage).length,7);
 for(const [id,[slug,focus]] of Object.entries(mapping)){
   const article=worldEncyclopedia.find(a=>a.id===id);
   assert.ok(article&&article.kind==='lieu',id+' introuvable');
   assert.equal(article.placeImage,'images/places/'+slug+'.webp');
   assert.equal(article.placeImageFocus,focus);
   assert.ok(article.placeImageAlt?.length>50);
   assert.match(manifest[slug],/^[A-Za-z0-9_-]{20,100}$/);
   const html=holopediaArticleHtml('public',id);
   assert.match(html,/place-hero-image/);
   assert.match(html,/Archives visuelles/);
   assert.ok(html.includes('images/places/'+slug+'.webp'));
   assert.doesNotMatch(html,/gmTruth|gmNotes|SECRET_MAP_ROUTE|navigationCode/);
 }
 const index=holopediaIndexHtml('public');
 assert.equal((index.match(/data-place-image="true"/g)||[]).length,7);
});

test('Accueil et menu latéral : Histoire, Breach Port, Lieux, Culture, Planètes',()=>{
 const expected=['Histoire','Breach Port','Lieux de Breach Port','Culture et galaxie','Planètes'];
 assert.deepEqual(encyclopediaCategories,expected);
 const html=holopediaIndexHtml('public');
 const actual=[...html.matchAll(/data-holopedia-section="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(actual,expected,'Ordre des sections modifié');
 const sidebar=holopediaSidebarHtml('public');
 assert.match(sidebar,/data-wiki-sidebar/);
 assert.match(sidebar,/data-wiki-nav-toggle/);
 assert.deepEqual([...sidebar.matchAll(/<summary>([^<]+)<span class="wiki-side-count">/g)].map(m=>m[1]),['Histoire','Breach Port','Lieux','Culture','Planètes']);
 assert.match(sidebar,/lieu-la-cantina-de-la-traverse/);
 assert.match(sidebar,/histoire-ordre-66-et-disparition-des-jedi/);
 const selected=holopediaSidebarHtml('public','lieu-les-docks');
 assert.match(selected,/href="#\/holopedia\/public\/lieu-les-docks" aria-current="page"/);
 const app=readFileSync('app.mjs','utf8');
 assert.match(app,/class="wiki-layout"/);
 assert.match(app,/data-wiki-nav-toggle/);
});

test('Holopédia intégralement RP : aucune référence extérieure visible sur 62 notices',()=>{
 const html=[holopediaIndexHtml('public'),holopediaSidebarHtml('public'),...worldEncyclopedia.map(a=>holopediaArticleHtml('public',a.id))].join('\n');
 assert.doesNotMatch(html,/hors.jeu|\ben jeu\b|fictiv(?:e|es)?|reconstitution orbitale|document fictif|récit historique neutre|propagande fictive|starwars\.com|Space Outlaws/i);
 assert.doesNotMatch(html,/gmTruth|gmNotes|SECRET_MAP_ROUTE|navigationCode/);
 assert.match(html,/Bureau impérial/);
 const page=readFileSync('index.html','utf8');
 assert.doesNotMatch(page,/Space Outlaws|hors.jeu|\ben jeu\b|joueur/i);
 assert.match(page,/Bureau impérial des archives civiles/);
 const pageCSS=readFileSync('style.css','utf8');
 assert.match(pageCSS,/\.wiki-layout/);
 assert.match(pageCSS,/\.wiki-nav-toggle/);
});
