import test from 'node:test';
import assert from 'node:assert/strict';
import {worldEncyclopedia} from '../web/world-encyclopedia-data.mjs';
import {holopediaIndexHtml,holopediaArticleHtml,holopediaCategories} from '../web/world-encyclopedia.mjs';

test('Holopédia : tous les chapitres publics, trente planètes et sept lieux, sans doublons',()=>{
 assert.equal(worldEncyclopedia.length,56);
 assert.equal(worldEncyclopedia.filter(a=>a.kind==='planète').length,30);
 assert.equal(worldEncyclopedia.filter(a=>a.kind==='lieu').length,7);
 assert.equal(worldEncyclopedia.filter(a=>a.id.startsWith('chapitre-')).length,16);
 assert.equal(new Set(worldEncyclopedia.map(a=>a.id)).size,worldEncyclopedia.length);
 assert.ok(worldEncyclopedia.every(a=>a.paragraphs.length>0));
 for(const category of new Set(worldEncyclopedia.map(a=>a.category)))assert.ok(holopediaCategories.includes(category));
});
test('Holopédia : route joueur lisible et recherche sur les articles publics',()=>{
 const html=holopediaIndexHtml('demo');
 assert.match(html,/#\/holopedia\/demo\/planete-corellia/);
 assert.match(html,/data-holopedia-search/);
 assert.match(html,/Lieux de Breach Port/);
 assert.equal((html.match(/data-holopedia-article="/g)||[]).length,56);
 assert.match(holopediaArticleHtml('demo','planete-corellia'),/CORELLIA|Corellia/);
 assert.match(holopediaArticleHtml('demo','lieu-le-comptoir'),/Comptoir/);
 assert.match(holopediaArticleHtml('demo','bad-id'),/Article introuvable/);
});
test('Holopédia : aucun pouvoir ou prix inventé dans les données publiques',()=>{
 const body=JSON.stringify(worldEncyclopedia);
 for(const secret of ['gmTruth','gmNotes','navigationCode','SECRET_MAP_ROUTE','playerSecrets','classKit'])assert.ok(!body.includes(secret),secret);
 assert.match(holopediaArticleHtml('demo','planete-geonosis'),/restreint|restreints|restreintes/);
});
