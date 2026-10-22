import {masterEditor} from '../shared/master-editors.mjs';
import {groupAccountId} from './economy-state.mjs';
import {requireThat} from './validation.mjs';

const blank=v=>v==null||v===''?'!EFFACER':String(v);
const yn=v=>v===true?'OUI':'NON';
const list=v=>blank((v??[]).join(';'));
// Explicit projections of editable definitions, never instances, accounts or participant identities.
export function masterEditorProjection({module,sheet,records,stamps,session,newId}){
 const def=masterEditor(module,sheet);requireThat(def,'INVALID_MASTER_SHEET');
 const versions=new Map(stamps.filter(s=>s.sheet===def.sheet).map(s=>[s.rowId,s.version]));
 const source=def.sheet==='Objectifs'?records.characters.flatMap(c=>(c.objectives??[]).map(o=>({...o,characterId:c.id,characterName:c.public.displayName}))):records[def.collection];
 const rows=source.map(d=>{
  const row={id:d.id,operation:'MODIFIER',version:String((versions.get(d.id)??0)+1)};
  if(def.sheet==='Personnages')Object.assign(row,{nom:d.public.displayName,metier:blank(d.public.profession),description_publique:blank(d.public.description),publication_publique:d.public.publicationState,publication:d.publicationState,histoire:blank(d.biography),interpretation:blank(d.roleplay),secrets_joueur:blank(d.playerSecrets),notes_mj:blank(d.gmNotes),portrait_media_id:blank(d.mediaImages?.portrait?.id),image_privee_media_id:blank(d.mediaImages?.private?.id),...(!session?{...(d.globalLevel!=null?{niveau_global:String(d.globalLevel)}:{}),...(d.initialMaxHp!=null?{pv_max_initiaux:String(d.initialMaxHp)}:{})}:{})});
  if(def.sheet==='Objectifs')Object.assign(row,{personnage_id:d.characterId,titre:d.title,description:blank(d.description),publication:yn(d.published),notes_mj:blank(d.gmNotes)});
  if(def.sheet==='Objets')Object.assign(row,{nom:d.name,description:blank(d.description),categorie:blank(d.category),unite:d.unit,type:d.kind,consommable:yn(d.consumable),volume_unitaire:blank(d.unitVolume),legalite:d.legality,publication:d.publicationState,notes_mj:blank(d.gmNotes),image_media_id:blank(d.mediaImages?.illustration?.id),pillable:yn(d.pillable),billes_par_recharge:blank(d.laserRecharge?.pelletsPerUnit)});
  if(def.sheet==='Competences')Object.assign(row,{nom:d.name,description:blank(d.description),instructions:blank(d.instructions),categorie:blank(d.category),type:d.kind,publication:d.publicationState,notes_mj:blank(d.gmNotes),...(d.kind!=='PASSIVE'?{
   soin_pv:String(d.healing.amount),usages:blank(d.healing.uses),recuperation_secondes:String(d.healing.cooldownSeconds),portee_recuperation:d.healing.cooldownScope??'ACTOR',consommable_id:blank(d.healing.consumable?.itemId),...(d.healing.consumable?{consommable_quantite:String(d.healing.consumable.quantity)}:{})}:{} )});
  if(def.sheet==='Classes')Object.assign(row,{nom:d.name,description:blank(d.description),publication:d.publicationState,notes_mj:blank(d.gmNotes),competences:blank(d.skills.map(s=>`${s.skillId}:${s.level}`).join(';'))});
  if(def.sheet==='Groupes')Object.assign(row,{nom:d.name,description:blank(d.description),briefing:blank(d.briefing),visibilite:d.visibility,publication:d.publicationState,notes_mj:blank(d.gmNotes)});
  if(def.sheet==='Routes')Object.assign(row,{nom:d.name,description:blank(d.description),depart_port:d.fromPort,arrivee_port:d.toPort,duree_secondes:String(d.durationSeconds),carburant_cout:String(d.fuelCost),ouvert:yn(d.enabled)});
  if(def.sheet==='Vaisseaux')Object.assign(row,{nom:d.name,description:blank(d.description),proprietaire_type:d.ownerType,proprietaire_id:d.ownerId,capacite_volume:String(d.capacity),ouvert:yn(d.enabled),...(!session?{a_quai:yn(d.docked)}:{}),carburant_objet_id:blank(d.navigation?.fuelItemId),...(d.navigation?{capacite_reservoir:String(d.navigation.tankCapacity),...(!session?{carburant_initial:String(d.navigation.initialFuel),port_initial:d.navigation.initialPort}:{})}:{})});
  if(def.sheet==='Cours')Object.assign(row,{prix_base:String(d.baseUnitPrice),actif:yn(d.enabled)});
  if(def.sheet==='EvenementsEco')Object.assign(row,{titre:d.title,description:blank(d.description),cible_type:d.targetKind??'COMMODITY',objet_id:blank(d.itemId),route_id:blank(d.routeId),variation_prix_pct:String(d.percent),commerce_suspendu:yn(d.tradeBlocked),variation_carburant_pct:String(d.fuelPercent??0),variation_duree_pct:String(d.durationPercent??0),depart_suspendu:yn(d.departureBlocked),declenchement:d.trigger,installation_id:blank(d.targetId),actif:yn(d.enabled)});
  if(def.sheet==='Entrepots'){
   const group=records.groups.find(g=>groupAccountId(g.id)===d.rentAccountId);requireThat(!d.rentAccountId||group,'INVALID_WAREHOUSE');
   Object.assign(row,{nom:d.name,description:blank(d.description),capacite_volume:String(d.capacity),loyer:String(d.rent),periode_minutes:String(d.periodMinutes),ouvert:yn(d.enabled),loyer_groupe_id:blank(group?.id)});
  }
  if(def.sheet==='Connaissances')Object.assign(row,{titre:d.title,texte:d.body,origine:blank(d.origin),type:d.kind,publication:d.publicationState,partage:d.shareMode,verite_mj:blank(d.gmTruth),notes_mj:blank(d.gmNotes),...(!session?{personnages_initiaux:list(d.initialCharacterIds)}:{}),qr_actif:yn(d.qrEnabled),qr_audience:d.qrAudience,qr_personnages:list(d.qrCharacterIds),qr_competence_id:blank(d.qrSkillId),...(d.qrSkillId?{qr_niveau:String(d.qrSkillLevel)}:{})});
  return {row,...(def.sheet==='Vaisseaux'?{navigationInitialized:!!d.navigation}:{}),archived:d.masterArchived===true,title:def.sheet==='Cours'?(records.items.find(i=>i.id===d.id)?.name??d.item.name):row[def.name],ownerLabel:d.characterName??'',state:d.masterArchived===true?'archived':(row.publication==='PUBLISHED'||row.publication==='OUI'||row.ouvert==='OUI'||row.actif==='OUI')?'active':'draft'};
 }).sort((a,b)=>a.title.localeCompare(b.title)||a.row.id.localeCompare(b.row.id));
 // Legacy objectives can share an id across characters; never silently rename or export ambiguous identities.
 const seen=new Set(),collisions=new Set();for(const {row} of rows){if(seen.has(row.id))collisions.add(row.id);seen.add(row.id);}
 return {module,sheet:def.sheet,session,newRow:{id:def.identity?'':newId,operation:'CREER',version:'1'},rows,errors:[...collisions].map(id=>`Identifiant répété : ${id}. Corrigez les objectifs dans les fiches avant d’utiliser ce Master.`),references:{
  characters:records.characters.map(c=>({id:c.id,name:c.public.displayName})),
  groups:records.groups.map(g=>({id:g.id,name:g.name})),
  items:records.items.map(i=>({id:i.id,name:`${i.name} — ${i.unit}`})),
  unpricedItems:records.items.filter(i=>i.publicationState==='PUBLISHED'&&!records.commodityPrices.some(p=>p.id===i.id)).map(i=>({id:i.id,name:`${i.name} — ${i.unit}`})),
  fuels:records.items.filter(i=>i.consumable&&i.kind==='STACKABLE'&&!i.laserRecharge).map(i=>({id:i.id,name:`${i.name} — ${i.unit}`})),
  routes:records.routes.map(r=>({id:r.id,name:r.name})),
  installations:records.fieldTargets.filter(t=>t.kind==='INSTALLATION').map(t=>({id:t.id,name:t.title})),
  skills:records.skills.filter(s=>s.kind==='PASSIVE').map(s=>({id:s.id,name:s.name})),
  allSkills:records.skills.map(s=>({id:s.id,name:s.name,publication:s.publicationState})),
  consumables:records.items.filter(i=>i.consumable&&i.publicationState==='PUBLISHED').map(i=>({id:i.id,name:`${i.name} — ${i.unit}`})),
  wallets:records.groups.filter(g=>g.walletConfig).map(g=>({id:g.id,name:g.walletConfig.label})),
 }};
}
