import {installationRepairTarget} from './space-installation-repair.mjs';
import {documentId,requireThat} from './validation.mjs';
import {aidHash as hash,activeCharacter} from './aid-state.mjs';
import {abilityLevel} from './abilities.mjs';
import {gameTime} from './clock.mjs';
import {effectiveFieldState} from './field-state.mjs';
import {isTechnicalAnalysis} from './space-technical-analysis.mjs';
import {droidModule,droidModuleWork} from '../shared/space-droid-modules.mjs';
import {maintenancePlan} from './space-maintenance.mjs';
import {flightShip,activeModuleOutages} from './space-module-flight.mjs';
const base=s=>`sessions/${s.id}`;
const ready=s=>s.spaceOutlaws?.nativeTechnicalAnalysisVersion===1;
const requireReady=s=>requireThat(ready(s),'SO_GAMEPLAY_NOT_OPEN');
const min=(c,id,n)=>abilityLevel(c,id)>=n;
const local=(s,c,t)=>!c.activeVoyageId&&!t.activeVoyageId&&!t.activeNavigationId&&(c.spacePortId??s.transportRules?.homePort)===(t.spacePortId??s.transportRules?.homePort);
export async function technicalAdmin(tx,s){
 if(!ready(s))return null;
 const targets=await tx.list(`${base(s)}/fieldTargets`),characters=await tx.list(`${base(s)}/characters`),ships=await tx.list(`${base(s)}/ships`);
 return {bindings:await tx.list(`${base(s)}/technicalBindings`),targets:targets.filter(isTechnicalAnalysis).map(t=>({id:t.id,name:t.title})),entities:[...characters.filter(c=>c.nature==='DROID'&&c.assignedUid).map(c=>({kind:'DROID',id:c.id,name:c.public.displayName})),...targets.filter(t=>t.kind==='INSTALLATION').map(t=>({kind:'INSTALLATION',id:t.id,name:t.title})),...ships.filter(s=>s.soProfile).map(s=>({kind:'SHIP',id:s.id,name:s.name}))]};
}
export async function bindTechnicalTarget(tx,s,input,at,id,actor){
 requireReady(s);requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SO_GAMEPLAY_NOT_OPEN');
 const tid=documentId(input.targetId),entityId=documentId(input.entityId),kind=input.entityKind;
 requireThat(['DROID','INSTALLATION','SHIP'].includes(kind)&&typeof input.active==='boolean','SO_TECHNICAL_BINDING');
 const t=await tx.get(`${base(s)}/fieldTargets/${tid}`),state=await tx.get(`${base(s)}/fieldStates/${tid}`),old=await tx.get(`${base(s)}/technicalBindings/${tid}`);
 requireThat(isTechnicalAnalysis(t)&&t.publicationState==='PUBLISHED'&&state&&!state.activeActionId,'FIELD_UNAVAILABLE');requireThat((old?.revision??0)===input.revision,'STALE_REVISION');
 const entity=await tx.get(`${base(s)}/${{DROID:'characters',INSTALLATION:'fieldTargets',SHIP:'ships'}[kind]}/${entityId}`);
 requireThat(entity&&(kind==='DROID'?entity.nature==='DROID'&&entity.publicationState==='PUBLISHED':kind==='SHIP'?!!entity.soProfile:entity.kind==='INSTALLATION'&&entity.publicationState==='PUBLISHED'),'SO_TECHNICAL_BINDING');
 requireThat(!old||old.entityKind===kind&&old.entityId===entityId,'SO_TECHNICAL_BINDING');
 requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');
 const observations=input.observations??[],bonusItems=input.bonusItems??[];
 requireThat(Array.isArray(observations)&&observations.length<=20&&Array.isArray(bonusItems)&&bonusItems.length<=20&&new Set(bonusItems).size===bonusItems.length,'SO_TECHNICAL_BINDING');
 for(const o of observations)requireThat(o&&Object.keys(o).every(k=>['level','hidden','text'].includes(k))&&Number.isInteger(o.level)&&o.level>=1&&o.level<=5&&typeof o.hidden==='boolean'&&(!o.hidden||o.level>=3)&&typeof o.text==='string'&&o.text.trim()&&o.text.length<=2000,'SO_TECHNICAL_BINDING');
 for(const id of bonusItems){const item=await tx.get(`${base(s)}/items/${documentId(id)}`);requireThat(item?.versionId===s.versionId&&!item.consumable&&!item.shipModule,'FIELD_REFERENCE');}
 const next={id:tid,entityKind:kind,entityId,active:input.active,observations:observations.map(o=>({...o,text:o.text.trim()})),bonusItems,revision:(old?.revision??0)+1};
 tx.set(`${base(s)}/technicalBindings/${tid}`,next);tx.set(`${base(s)}/audit/${id}`,{id,at,action:'bindTechnicalTarget',actorUid:actor.uid,targetId:tid,reason:input.reason.trim(),before:old??null,after:next});return {id:tid,revision:next.revision};
}
async function snapshot(tx,s,c,b,level,at){
 const time=gameTime(s.clock,at),rows=[],interventions=[],add=(label,text)=>rows.push({label,text});
 if(b.entityKind==='DROID'){
  const {c:t,r}=await activeCharacter(tx,s.id,b.entityId);requireThat(t.nature==='DROID'&&local(s,c,t),'FIELD_UNAVAILABLE');
  add('État du droïde',`${t.hp} / ${t.maxHp} PV${t.survival?.dead?' · destruction définitive':t.hp===0?' · hors combat':''}`);
  add('Protection personnelle',`${t.protection??0} / 1 · réserve distincte des PV`);
  const modules=[],reservations=[];
  for(const m of t.droidModules??[]){const l=await tx.get(`${base(s)}/inventory/${m.lotId}`);requireThat(l&&l.ownerId===t.id&&l.holderId===t.id&&l.location?.kind==='DROID_MODULE'&&l.location.id===t.id&&['INSTALLED','FIELD_RESERVED'].includes(l.status),'FIELD_STATE_CHANGED');
   const def=droidModule(m.code);requireThat(def,'FIELD_STATE_CHANGED');const neutralized=(m.neutralizedUntilGameMs??0)>time;
   modules.push([m.lotId,m.code,m.status,m.neutralizedUntilGameMs??0,neutralized]);reservations.push([l.id,l.revision,l.status]);
   if(m.code==='DR-06'&&level<4)continue;
   add(def.name,`${m.status==='DAMAGED'?'Panne durable':'État opérationnel'}${neutralized?' · neutralisation temporaire':''}${m.code==='DR-01'?` · blindage ${t.protectionSourceLotId===m.lotId?t.protection:0}/1`:''}${l.status==='FIELD_RESERVED'?' · intervention en cours':''}`);
   if(level>=2&&m.status==='DAMAGED'){const q=droidModuleWork(m.code,'REPAIR');interventions.push({name:`Réparer ${def.name}`,seconds:q.seconds,partsCr:q.partsValue,requirements:`MEC-02 N2 + MEC-03 N${q.level}, atelier, accord du propriétaire, 1 PA`,qualified:min(c,'MEC-02',2)&&min(c,'MEC-03',q.level),href:`#/person/${s.id}/${t.id}`});}
   if(level>=2&&m.code==='DR-01'&&(t.protection??0)===0)interventions.push({name:'Recharger le blindage',requirements:'MEC-02 N1, fourniture compatible, module opérationnel et non neutralisé, 1 PA',qualified:min(c,'MEC-02',1)&&m.status==='OPERATIONAL'&&!neutralized,href:`#/person/${s.id}/${t.id}`});
  }
  if(level>=2&&t.hp<t.maxHp&&!t.survival?.dead)interventions.push({name:'Réparation des PV ou révision intégrale',requirements:'Choisir le soin ou le protocole d’atelier ; aucune panne de module ni protection rechargée par ce soin',qualified:min(c,'MEC-02',1),href:`#/person/${s.id}/${t.id}`});
  return {name:t.public.displayName,rows,interventions,concurrency:reservations,state:[t.id,t.assignedUid,r.accessVersion,t.healthRevision,t.hp,t.maxHp,t.protection,t.protectionSourceLotId??null,modules]};
 }
 if(b.entityKind==='SHIP'){
  const raw=await tx.get(`${base(s)}/ships/${b.entityId}`),ship=raw?flightShip(s,raw,time):null;requireThat(ship?.soProfile,'FIELD_UNAVAILABLE');
  requireThat(ship.journey?ship.journey.suspended&&c.activeVoyageId===ship.journey.id&&ship.journey.manifest.some(m=>m.id===c.id):ship.docked&&!c.activeVoyageId&&(c.spacePortId??s.transportRules?.homePort)===ship.portId,'SHIP_NOT_LOCAL');
  add('Coque',`${ship.hull} / ${ship.soProfile.hullMax}`);add('Bouclier',`${ship.shield} / ${ship.soProfile.shieldMax}`);add('Révision',ship.revisionRequired?'Révision requise':'Aucune révision requise');
  const outages=activeModuleOutages(raw,time);
  for(const m of ship.modules??[]){if(['MOD-04','R04-02'].includes(m.code)&&level<4)continue;add(`Module ${m.code}`,m.status==='DAMAGED'?'Panne durable':outages.some(n=>n.lotId===m.lotId)?'Neutralisé temporairement':'Opérationnel');}
  if(level>=2&&s.spaceOutlaws.moduleRepairVersion===1)for(const m of ship.modules??[])if(m.status==='DAMAGED'&&(!['MOD-04','R04-02'].includes(m.code)||level>=4)){const q=maintenancePlan(ship,'MODULE',1,m.lotId);interventions.push({name:`Réparer ${q.moduleName}`,seconds:q.secondsPerPoint,partsCr:q.unitCost,requirements:`MEC-02 N2 + MEC-03 N${q.moduleLevel}, atelier à quai, mandat et pièces compatibles, 1 PA`,qualified:min(c,'MEC-02',2)&&min(c,'MEC-03',q.moduleLevel),href:`#/space-maintenance/${s.id}`});}
  if(level>=2)for(const [kind,name,points] of [['REVISION','Révision',ship.revisionRequired?1:0],['HULL','Réparer la coque',Math.max(0,ship.soProfile.hullMax-ship.hull)],['SHIELD','Recharger le bouclier',Math.max(0,ship.soProfile.shieldMax-ship.shield)]])if(points){const q=maintenancePlan(ship,kind,points);interventions.push({name,seconds:q.secondsPerPoint*q.points,partsCr:q.unitCost*q.points,requirements:'MEC-02 N2, fournitures et mandat du propriétaire ; frais PNJ éventuels vérifiés dans le devis natif',qualified:min(c,'MEC-02',2),href:`#/space-maintenance/${s.id}`});}
  return {name:ship.name,rows,interventions,concurrency:[raw.revision??null,raw.maintenanceId??null,raw.operation??null,raw.ownerId,raw.pilotId,raw.portId],state:[ship.id,ship.hull,ship.shield,ship.revisionRequired,ship.soProfile,ship.modules??[],outages]};
 }
 let t=await tx.get(`${base(s)}/fieldTargets/${b.entityId}`),raw=await tx.get(`${base(s)}/fieldStates/${b.entityId}`);requireThat(t?.publicationState==='PUBLISHED'&&t.kind==='INSTALLATION'&&raw&&!c.activeVoyageId,'FIELD_UNAVAILABLE');const state=effectiveFieldState(s,raw,at);t=await installationRepairTarget(tx,s,t,state);
 if(state.durableFailure)add('Panne durable','Réparation spécifique nécessaire ; aucune expiration automatique');
 add('Installation',state.status==='ONLINE'?'En service':state.offlineUntilGameMs!==null?'Neutralisation temporaire':'Hors service');
 if(level>=2&&state.status==='OFFLINE')for(const kind of ['REPAIR','REPAIR_DURABLE'])if(t.profiles?.[kind]&&(kind==='REPAIR_DURABLE'||!state.durableFailure||state.offlineUntilGameMs>time)){const p=t.profiles[kind];interventions.push({name:kind==='REPAIR_DURABLE'?'Réparer la panne durable de l’installation':'Remise en service après sabotage',seconds:p.durationByLevel?.[abilityLevel(c,p.skillId)]??p.durationSeconds,supplies:p.consumable?{quantity:p.consumable.quantity,itemId:p.consumable.itemId}:null,requirements:`${p.skillId} N${p.minLevel} ; ${p.cost??1} PA ; ${p.test==='D6'?`test au seuil ${p.threshold}`:'sans jet'} ; ${p.consumable?`${p.consumable.quantity} pièces consommées au jet, même sur échec`:'sans pièces'}`,qualified:min(c,p.skillId,p.minLevel),href:`#/field/${s.id}/${t.id}`});}
 return {name:t.title,rows,interventions,state:[t.revision,state.status,state.offlineUntilGameMs,state.protectedUntilGameMs,raw.revision??null,t.durableWork??null]};
}
export async function nativeTechnicalTarget(tx,s,c,t,at,levelOverride=null){
 if(!isTechnicalAnalysis(t)||!c)return t;const b=await tx.get(`${base(s)}/technicalBindings/${t.id}`);if(!b)return t;requireReady(s);requireThat(b.active,'FIELD_UNAVAILABLE');
 const level=levelOverride??abilityLevel(c,'MEC-01'),report=await snapshot(tx,s,c,b,level,at),hidden=b.observations.filter(o=>o.hidden&&o.level<=level),ordinary=b.observations.filter(o=>!o.hidden&&o.level<=level),p=t.profiles.ANALYZE,version=hash(JSON.stringify([b,t.revision,report.state]));
 return {...t,rewards:[],profiles:{...t.profiles,ANALYZE:{...p,minLevel:hidden.length?Math.max(...hidden.map(o=>o.level)):1,test:hidden.length?'D6':'AUTO',threshold:hidden.length?6:0,bonusItems:hidden.length?b.bonusItems.map(itemId=>({itemId,bonus:1})):[],instructions:'Diagnostic de l’état actuel : 60 secondes, 1 PA. Les états ordinaires sont acquis sans jet ; le D6 éventuel porte uniquement sur le complément caché préparé. Aucune réparation automatique.'}},technicalWork:{version,binding:hash(JSON.stringify([version,report.concurrency??null])),entityKind:b.entityKind,entityId:b.entityId,report:{name:report.name,rows:report.rows,interventions:report.interventions,ordinary:ordinary.map(o=>o.text),hidden:hidden.map(o=>o.text)}}};
}
export function technicalOutcome(a,success,at){const r=a.technicalWork.report;return {name:r.name,observedAt:at,rows:r.rows,interventions:r.interventions,information:[...r.ordinary,...(success?r.hidden:[])],hiddenSuccess:a.profile.test==='D6'?success:null};}

export const technicalDone=(state,cid,t)=>{const old=state.technicalAnalyses?.[cid];return old?.version===t.technicalWork?.version&&(old.hidden||t.profiles.ANALYZE.test==='AUTO');};
