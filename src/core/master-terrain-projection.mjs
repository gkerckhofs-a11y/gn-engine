import {createHash} from 'node:crypto';
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const blank=v=>v==null||v===''?'!EFFACER':String(v);
export function terrainMasterRows(targets,stamps){
 const receipts=[...new Map(stamps.map(s=>[s.id,s])).values()],errors=[];
 const actions=receipts.filter(s=>s.sheet==='ActionsTerrain');
 if(actions.some(s=>!s.identity))errors.push('Un ancien reçu ActionsTerrain ne précise pas son lieu et son type. Clarifier cet historique avant l’édition ou l’export.');
 const version=(sheet,id)=>String((receipts.find(s=>s.sheet===sheet&&s.rowId===id)?.version??0)+1);
 const row=(sheet,id)=>({id,operation:'MODIFIER',version:version(sheet,id)});
 const rows=targets.map(t=>({
  row:{...row('Lieux',t.id),titre:t.title,type:t.kind,publication:t.publicationState,description:blank(t.description),notes_mj:blank(t.gmNotes),installation_id:blank(t.dependencyId),panne_secondes:String(t.offlineSeconds),verrou_echec_secondes:String(t.failureLockSeconds),protection_reparation_secondes:String(t.repairProtectionSeconds)},
  actions:Object.values(t.profiles).map(p=>{
   const identity=digest([t.id,p.kind]),matches=actions.filter(s=>s.identity===identity);
   if(matches.length>1)errors.push(`Plusieurs identifiants Master pour l’action ${p.kind} du lieu ${t.id}. Aucun identifiant n’a été remplacé.`);
   const id=matches[0]?.rowId??`action-${identity}`;
   if(actions.some(s=>s.rowId===id&&s.identity!==identity))errors.push(`Identifiant d’action déjà lié à un autre profil : ${id}.`);
   return {...row('ActionsTerrain',id),lieu_id:t.id,type:p.kind,competence_id:blank(p.skillId),niveau_minimum:String(p.minLevel),instructions:blank(p.instructions),duree_secondes:String(p.durationSeconds),durees_niveaux:blank(Object.entries(p.durationByLevel).map(([l,s])=>`${l}:${s}`).join(';')),test:p.test,seuil:String(p.threshold),cout_pa:blank(p.cost),recuperation_secondes:blank(p.cooldownSeconds),bonus_objets:blank(p.bonusItems.map(b=>`${b.itemId}:${b.bonus}`).join(';')),consommable_id:blank(p.consumable?.itemId),...(p.consumable?{consommable_quantite:String(p.consumable.quantity)}:{}),texte_reussite:blank(p.successText),texte_echec:blank(p.failureText)};
  }),
  rewards:t.rewards.map(r=>({...row('Recompenses',r.id),lieu_id:t.id,type:r.kind,objet_id:blank(r.itemId),connaissance_id:blank(r.knowledgeId),quantite:String(r.quantity),stock_initial:String(r.stock),limite_personnage:String(r.perCharacter)})),
  archived:t.masterArchived===true,title:t.title,ownerLabel:t.kind==='SEARCH'?'Fouille':'Installation',state:t.masterArchived?'archived':t.publicationState==='PUBLISHED'?'active':'draft'
 })).sort((a,b)=>a.title.localeCompare(b.title)||a.row.id.localeCompare(b.row.id));
 for(const [sheet,key] of [['ActionsTerrain','actions'],['Recompenses','rewards']]){
  const seen=new Set();for(const entry of rows)for(const r of entry[key]){
   if(seen.has(r.id))errors.push(`Identifiant répété dans ${sheet} : ${r.id}. Clarifier les lieux concernés avant l’édition ou l’export.`);seen.add(r.id);
   if(sheet==='Recompenses'&&receipts.some(s=>s.sheet===sheet&&s.rowId===r.id&&s.identity&&s.identity!==digest([r.lieu_id])))errors.push(`Récompense ${r.id} liée à un autre lieu dans son historique.`);
  }
 }
 return {rows,errors};
}
