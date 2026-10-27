import {firestoreSuites} from '../test/support/firestore-suites.mjs';

export const allSuites = [...firestoreSuites, {id:'firestore-rules',seconds:1}];
const allIds = allSuites.map(s=>s.id);
// Explicit boundary for the current spatial slice, including its native consumers.
// Unknown files and shared foundations deliberately fall back to the full suite.
const spatialModules = new Set([
  'space-bounties', 'space-contract-appeals', 'space-route-analysis', 'space-detours', 'space-escort', 'space-escort-amendments', 'space-escort-maneuvers', 'space-convoy', 'space-convoy-combat', 'space-transport',
  'space-outlaws-voyages', 'space-outlaws-navigation-state',
  'space-combat', 'space-combat-state', 'space-combat-round',
  'space-maintenance', 'space-rescue',
  'space-outlaws-mission-state', 'space-outlaws-mission-evidence', 'space-outlaws-mission-rewards',
]);
// These leaf fixtures are used only by the spatial consumers below (and HTTP).
// Foundational fixtures such as entry/shops/inventory also feed unrelated suites.
const spatialFixtures = new Set(['space-bounties', 'space-contract-appeals', 'space-route-analysis', 'space-detours','space-escort','space-escort-amendments','space-escort-maneuvers','space-convoy','space-transport']);
export const spatialSuites = [
  'workflow', 'space-outlaws-entry', 'space-outlaws-actions', 'space-outlaws-health',
  'space-outlaws-shops', 'space-outlaws-voyages', 'space-encounters', 'space-logistics',
  'space-missions', 'mission-execution', 'space-episodes', 'space-succession', 'space-learning',
  'space-transport', 'space-convoy', 'space-bounties', 'space-contract-appeals', 'space-route-analysis', 'space-detours', 'space-escort', 'space-escort-amendments', 'space-escort-maneuvers',
  'voyages', 'cargo', 'logistics', 'customs', 'contracts', 'announcements', 'bounties',
  'mission-parties', 'economy', 'collective', 'inventory', 'transfers', 'action-points',
  'firestore-rules',
];

export function scopeForChanges(paths, {forceFull=false, reliableBase=true}={}) {
  const full = reason=>({profile:'full',reason,suites:allIds,http:true});
  if(forceFull)return full('Vérification complète demandée');
  if(!reliableBase)return full('Aucun ancêtre CI réussi vérifiable');
  let spatial=false, http=false;
  for(const path of paths){
    if(path==='AGENTS.md'||path==='README.md'||path.startsWith('docs/'))continue;
    if(/^web\//.test(path)){http=true;continue;}
    if(/^test\/[^/]+\.test\.mjs$/.test(path))continue; // All application tests always run.
    if(path==='test/integration/http.test.mjs'){http=true;continue;}
    const core=path.match(/^src\/core\/([^/]+)\.mjs$/);
    const support=path.match(/^test\/support\/([^/]+)-suite\.mjs$/);
    if(core&&spatialModules.has(core[1])||support&&spatialFixtures.has(support[1])){
      spatial=true;http=true;continue;
    }
    return full(`Fichier transversal ou non classé : ${path}`);
  }
  return {profile:spatial?'spatial':http?'http':'application',
    reason:spatial?'Navigation, escorte et dépendances métier':http?'Interface ou parcours HTTP':'Documentation ou tests applicatifs uniquement',
    suites:spatial?spatialSuites:[],http};
}

export function assignShards(ids,total){
  const bins=Array.from({length:total},(_,i)=>({index:i+1,seconds:0})),assigned=new Map();
  const sorted=allSuites.filter(s=>ids.includes(s.id))
    .sort((a,b)=>b.seconds-a.seconds||(a.id<b.id?-1:a.id>b.id?1:0));
  for(const suite of sorted){
    bins.sort((a,b)=>a.seconds-b.seconds||a.index-b.index);
    const bin=bins[0];assigned.set(suite.id,bin.index);bin.seconds+=suite.seconds;
  }
  return assigned;
}

export function selectFirestoreSuites(env={}){
  const ids=env.GN_FIRESTORE_SUITES===undefined?allIds:JSON.parse(env.GN_FIRESTORE_SUITES);
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!allIds.includes(id)))
    throw new Error('Invalid or empty Firestore suite selection');
  const raw=env.GN_FIRESTORE_SHARD??'1/1',match=/^([1-9]\d*)\/([1-9]\d*)$/.exec(raw);
  if(!match||+match[1]>+match[2]||+match[2]>16)throw new Error('Invalid Firestore shard');
  const assigned=assignShards(ids,+match[2]);
  const selected=allSuites.filter(s=>assigned.get(s.id)===+match[1]);
  if(!selected.length)throw new Error('Empty Firestore shard');
  return selected;
}

export function matrixFor(suites){
  if(!suites.length)return [];
  const total=suites.length===allIds.length?6:4;
  const assigned=assignShards(suites,total);
  return Array.from({length:total},(_,i)=>({shard:`${i+1}/${total}`}))
    .filter((_,i)=>[...assigned.values()].includes(i+1));
}
