// Liens internes derives uniquement des titres publics du Livre du monde.
// Aucune route technique, aucun contact confidentiel, aucune fiche MJ n'est resolu ici.
import {worldEncyclopedia} from './world-encyclopedia-data.mjs';
import {escapeHtml as esc} from './groups.mjs';

const normalize=text=>String(text??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLocaleLowerCase('fr').trim();
const byId=new Map(worldEncyclopedia.map(a=>[a.id,a]));
const wordChar=value=>!!value&&/[\p{L}\p{N}]/u.test(value);
const termMap=new Map();
for(const article of worldEncyclopedia){
 if(article.kind==='planète')termMap.set(normalize(article.title),{label:article.title,id:article.id});
}
const aliases=[
 ["Breach Port","chapitre-03"],
 ["Syndicat des Amarres","chapitre-08"],
 ["vent d'aiguilles","chapitre-04"],
 ["Guerres des Clones","chapitre-01"],
 ["guerre des Clones","chapitre-01"],
 ["République","chapitre-01"],
 ["Empire","chapitre-01"],
 ["Jedi","chapitre-15"],
 ["la Force","chapitre-15"],
 ["Comptoir","lieu-le-comptoir"],
 ["spatioport","lieu-le-spatioport"],
 ["astroport","lieu-le-spatioport"],
 ["les docks","lieu-les-docks"],
 ["docks","lieu-les-docks"],
 ["l'Hospice","lieu-l-hospice"],
 ["Hospice","lieu-l-hospice"],
 ["l'Atelier","lieu-l-atelier"],
 ["Atelier","lieu-l-atelier"],
 ["la Traverse","lieu-la-cantina-de-la-traverse"],
 ["cantina de la Traverse","lieu-la-cantina-de-la-traverse"],
 ["maison du préfet","lieu-la-maison-du-prefet-et-la-prison"]
];
for(const [label,id] of aliases)if(byId.has(id))termMap.set(normalize(label),{label,id});
const exprEscape=s=>[...s].map(ch=>".*+?^$()[]{}|\\".includes(ch)?"\\"+ch:ch).join('').replace(/['’]/g,"['’]");
const patterns=[...termMap.values()].sort((a,b)=>b.label.length-a.label.length||a.label.localeCompare(b.label,'fr')).map(x=>exprEscape(x.label));
const linkPattern=new RegExp(patterns.join('|'),'giu');
const topics=[
 {label:'Navigation',pattern:/\b(route|routes|pilote|pilotes|vaisseaux?|astroport|spatioport|escales?|capitaines?)\b/iu},
 {label:'Commerce',pattern:/\b(commerce|marchands?|marchandises?|cours|prix|cargaisons?|fret|acheteurs?|négociants?|contrats?)\b/iu},
 {label:'Empire',pattern:/\b(Empire|impérial(?:e|es|es)?)\b/iu},
 {label:'Guerres des Clones',pattern:/guerres? des [Cc]lones/iu},
 {label:'Industrie',pattern:/\b(industri(?:e|el|elle)|usines?|ateliers?|minerais?|réparations?|mécaniciens?)\b/iu},
 {label:'Contrebande',pattern:/\b(contrebande|clandestins?|trafics?|criminels?)\b/iu},
 {label:'La Force',pattern:/\b(Jedi|Force)\b/u}
];
export function wikiKeywords(article){
 if(!article)return [];
 const whole=[article.title,article.subtitle??'',...article.paragraphs].join(' ');
 return topics.filter(tag=>tag.pattern.test(whole)).map(tag=>tag.label).slice(0,6);
}
export function wikiReferences(article){
 if(!article)return [];
 const text=article.paragraphs.join(' ');
 const refs=new Set();
 for(const match of text.matchAll(linkPattern)){
  const start=match.index,end=start+match[0].length;
  if(wordChar(text[start-1])||wordChar(text[end]))continue;
  const ref=termMap.get(normalize(match[0]));
  if(ref&&ref.id!==article.id)refs.add(ref.id);
 }
 return [...refs].filter(id=>byId.has(id));
}
// Etat seen partage entre les paragraphes d'un meme article : un lien par cible,
// sans transformer chaque repetition de Breach Port ou de l'Empire en lien.
export function wikiTextHtml(text,currentId,sessionId='public',seen=new Set()){
 const raw=String(text??'');
 let html='',offset=0;
 for(const match of raw.matchAll(linkPattern)){
  const start=match.index,end=start+match[0].length;
  if(wordChar(raw[start-1])||wordChar(raw[end]))continue;
  const ref=termMap.get(normalize(match[0]));
  if(!ref||ref.id===currentId||seen.has(ref.id)||seen.size>=16)continue;
  html+=esc(raw.slice(offset,start));
  html+='<a class="wiki-inline-link" href="#/holopedia/'+encodeURIComponent(sessionId)+'/'+encodeURIComponent(ref.id)+'" title="Lire : '+esc(byId.get(ref.id)?.title||ref.label)+'">'+esc(match[0])+'</a>';
  offset=end;seen.add(ref.id);
 }
 return html+esc(raw.slice(offset));
}
export const publicWikiTargetIds=Object.freeze([...new Set(termMap.values().map(x=>x.id))]);
