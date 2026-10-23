import {naturePatch} from './character-nature.mjs';
import {cargoTariffInput,validateCargoTariffReferences} from './customs-state.mjs';
import {shipInput,routeInput,transportRulesInput,validateNavigationReferences} from './navigation-state.mjs';
import {priceInput,priceEventInput,validateEconomicReferences} from './price-state.mjs';
import {personProfileInput,validatePersonReferences} from './person-state.mjs';
import {fieldTargetInput,validateFieldReferences} from './field-state.mjs';
import {actionPointRulesInput,actionPointMaximum,globalLevel} from './action-point-state.mjs';
import {requireThat,documentId,whole} from './validation.mjs';
import {narrativeInput} from './narrative.mjs';
import {groupInput} from './groups.mjs';
import {knowledgeInput} from './knowledge.mjs';
import {skillInput,classInput} from './abilities.mjs';
import {itemInput,publicItem,itemQuantity} from './inventory-state.mjs';
import {healthRulesInput} from './health-state.mjs';
import {economyRulesInput} from './economy-state.mjs';
import {groupAccountId} from './economy-state.mjs';
import {warehouseInput} from './storage-state.mjs';
import {imageReferences,mediaHash,mediaLimits} from './media-state.mjs';

export const packageLimits=Object.freeze({manifestBytes:2*1024*1024,archiveBytes:128*1024*1024,records:500,images:250});
export const scenarioCollections=['characters','groups','knowledge','skills','classes','items','fieldTargets','personProfiles','warehouses','ships','routes','commodityPrices','priceEvents','cargoTariffs'];
const fail=c=>requireThat(c,'INVALID_SCENARIO_PACKAGE');
const object=v=>{fail(v&&typeof v==='object'&&!Array.isArray(v));return v;};
const text=(v,max,required=false)=>{fail(typeof v==='string'&&v.length<=max&&(!required||v.trim()));return v.trim();};
const revision=v=>{whole(v,'INVALID_SCENARIO_PACKAGE');fail(v>0);return v;};
const publication=v=>{fail(['DRAFT','READY','PUBLISHED'].includes(v));return v;};
const array=(v,max=500)=>{fail(Array.isArray(v)&&v.length<=max);return v;};
const bool=v=>{fail(typeof v==='boolean');return v;};
const ref=(v,set)=>{const id=documentId(v);fail(set.has(id));return id;};
const unique=rows=>{fail(new Set(rows.map(x=>x.id)).size===rows.length);return rows;};
const imageFields=(v,allowed)=>{
  if(v?.mediaImages===undefined)return {};
  const clean={};for(const [key,value] of Object.entries(object(v.mediaImages))){fail(allowed.includes(key));if(value===null){clean[key]=null;continue;}fail(value.version===1);clean[key]={id:documentId(value.id),version:1};}
  return {mediaImages:clean};
};
function healing(v){
  const clean=skillInput({...v,publicationState:'PUBLISHED'},v.id).healing;
  if(clean?.consumable){const original=v.healing.consumable;clean.consumable={...clean.consumable,itemRevision:revision(original.itemRevision),name:text(original.name,150,true),unit:text(original.unit,50,true)};}
  return clean;
}
function item(v,snapshot=false){
  object(v);const clean=itemInput({...v,publicationState:snapshot?'PUBLISHED':v.publicationState},documentId(v.id));clean.revision=revision(v.revision);
  return {...(snapshot?publicItem(clean):clean),...imageFields(v,['illustration'])};
}
function profile(v){
  object(v);const model=v.class===null?null:{id:documentId(v.class.id),name:text(v.class.name,150,true),description:text(v.class.description,6000),revision:revision(v.class.revision)};
  const skills=unique(array(v.skills,60).map(s=>({id:documentId(s.id),name:text(s.name,150,true),description:text(s.description,6000),instructions:text(s.instructions,6000),category:text(s.category,150),kind:s.kind,healing:healing(s),revision:revision(s.revision),level:revision(s.level)})));
  const choices=object(v.choices),overrides=array(choices.overrides,60).map(x=>({skillId:documentId(x.skillId),level:whole(x.level,'INVALID_SCENARIO_PACKAGE')}));fail(new Set(overrides.map(x=>x.skillId)).size===overrides.length);
  return {revision:revision(v.revision),published:bool(v.published),class:model,skills,choices:{classId:choices.classId===null?null:documentId(choices.classId),overrides}};
}
function character(v){
  object(v);const p=object(v.public),state=publication(v.publicationState);
  const c={id:documentId(v.id),public:{displayName:text(p.displayName,150,true),profession:text(p.profession??'',150),description:text(p.description??'',4000),publicationState:publication(p.publicationState)},publicationState:state,biography:text(v.biography??'',20000),roleplay:text(v.roleplay??'',10000),playerSecrets:text(v.playerSecrets??'',20000),gmNotes:text(v.gmNotes??'',20000),objectives:narrativeInput(v.objectives??[],'objectives'),relations:narrativeInput(v.relations??[],'relations'),hp:null,maxHp:null,historyStarted:true,contentRevision:revision(v.contentRevision??1),...imageFields(v,['portrait','private'])};
  Object.assign(c,naturePatch(v));
  if(v.globalLevel!==undefined)c.globalLevel=globalLevel(v.globalLevel);
  if(v.initialMaxHp!==undefined)c.initialMaxHp=revision(v.initialMaxHp);
  if(v.abilityProfile)c.abilityProfile=profile(v.abilityProfile);
  if(v.startingCredits)c.startingCredits={amount:whole(v.startingCredits.amount,'INVALID_SCENARIO_PACKAGE'),revision:revision(v.startingCredits.revision)};
  if(v.startingInventory){const entries=array(v.startingInventory.items,60).map(x=>{const i=item(x.item,true);return {item:i,quantity:itemQuantity(i,x.quantity)};});fail(new Set(entries.map(x=>x.item.id)).size===entries.length);c.startingInventory={revision:revision(v.startingInventory.revision),items:entries};}
  return c;
}
function group(v){const g=groupInput(object(v),documentId(v.id));g.revision=revision(v.revision);if(v.walletConfig)g.walletConfig={label:text(v.walletConfig.label,100,true),amount:whole(v.walletConfig.amount,'INVALID_SCENARIO_PACKAGE'),revision:revision(v.walletConfig.revision)};return g;}
// Explicit projections discard runtime identities, grants, account balances and tokens.
export function cleanScenarioSnapshot(input){
  object(input);const root=object(input.scenario),records=object(input.records);
  const scenario={title:text(root.title,150,true),summary:text(root.summary??'',4000),economyRules:root.economyRules==null?null:economyRulesInput(root.economyRules),healthRules:root.healthRules==null?null:healthRulesInput(root.healthRules)};
  if(root.transportRules)scenario.transportRules=transportRulesInput(root.transportRules);
  if(root.actionPointRules)scenario.actionPointRules=actionPointRulesInput(root.actionPointRules);
  const cleaners={characters:character,groups:group,knowledge:v=>({...knowledgeInput(object(v),documentId(v.id)),revision:revision(v.revision)}),skills:v=>({...skillInput(object(v),documentId(v.id)),healing:healing(v),revision:revision(v.revision)}),classes:v=>({...classInput(object(v),documentId(v.id)),revision:revision(v.revision)}),items:item,personProfiles:v=>({...personProfileInput(v,documentId(v.id)),revision:revision(v.revision)}),fieldTargets:v=>({...fieldTargetInput(v,documentId(v.id)),revision:revision(v.revision)})};
  cleaners.ships=v=>({...shipInput(object(v),documentId(v.id)),revision:revision(v.revision)});
  cleaners.routes=v=>({...routeInput(object(v),documentId(v.id)),revision:revision(v.revision)});
  cleaners.commodityPrices=v=>{object(v);const i=item(v.item,true);fail(i.id===documentId(v.id));return {...priceInput(v,{...i,publicationState:'PUBLISHED'}),revision:revision(v.revision)};};
  cleaners.priceEvents=v=>({...priceEventInput(object(v),documentId(v.id)),revision:revision(v.revision)});
  cleaners.cargoTariffs=v=>({...cargoTariffInput(object(v),documentId(v.id)),revision:revision(v.revision)});
  cleaners.warehouses=v=>({...warehouseInput(object(v),documentId(v.id)),revision:revision(v.revision)});
  const clean={};let count=0;for(const kind of scenarioCollections){clean[kind]=unique(array(records[kind]??(['fieldTargets','personProfiles','warehouses','ships','routes','commodityPrices','priceEvents','cargoTariffs'].includes(kind)?[]:undefined)).map(v=>cleaners[kind](v))).sort((a,b)=>a.id.localeCompare(b.id));count+=clean[kind].length;for(const record of clean[kind])requireThat(Buffer.byteLength(JSON.stringify(record))<750000,'SCENARIO_PACKAGE_TOO_LARGE');}
  requireThat(count<=packageLimits.records,'SCENARIO_PACKAGE_TOO_LARGE');
  const sets=Object.fromEntries(scenarioCollections.map(k=>[k,new Set(clean[k].map(x=>x.id))]));
  const checkCost=s=>{if(s.healing?.consumable){const x=s.healing.consumable;ref(x.itemId,sets.items);const model=clean.items.find(i=>i.id===x.itemId);if(model.revision===x.itemRevision){fail(model.consumable);itemQuantity(model,x.quantity);}}};
  for(const c of clean.characters){
    if(scenario.actionPointRules)actionPointMaximum(scenario.actionPointRules,c);
    for(const r of c.relations)if(r.targetId){ref(r.targetId,sets.characters);fail(r.targetId!==c.id);}
    const p=c.abilityProfile;if(p){if(p.class)ref(p.class.id,sets.classes);if(p.choices.classId)ref(p.choices.classId,sets.classes);for(const o of p.choices.overrides)ref(o.skillId,sets.skills);for(const s of p.skills){ref(s.id,sets.skills);checkCost(s);}}
    for(const x of c.startingInventory?.items??[])ref(x.item.id,sets.items);
  }
  for(const ship of clean.ships)validateNavigationReferences(ship,clean);
  validateEconomicReferences(clean);
  validateCargoTariffReferences({...clean,economyRules:scenario.economyRules});
  for(const g of clean.groups)for(const m of g.members)ref(m.characterId,sets.characters);
  for(const w of clean.warehouses)if(w.rentAccountId)fail(clean.groups.some(g=>g.walletConfig&&groupAccountId(g.id)===w.rentAccountId));
  for(const k of clean.knowledge){for(const id of [...k.initialCharacterIds,...k.qrCharacterIds])ref(id,sets.characters);if(k.qrSkillId)ref(k.qrSkillId,sets.skills);}
  for(const k of clean.classes)for(const s of k.skills)ref(s.skillId,sets.skills);
  for(const s of clean.skills)checkCost(s);
  for(const p of clean.personProfiles)validatePersonReferences(p,clean);
  for(const t of clean.fieldTargets)validateFieldReferences(t,clean);
  return {scenario,records:clean};
}
export function packageImage(a,source){
  const id=documentId(a.id);fail(a.version===1);const tags=array(a.tags??[],20).map(t=>text(t,500,true));
  fail(tags.join(',').length<=500&&tags.every(t=>!t.includes(',')));
  fail(['image/png','image/jpeg','image/webp'].includes(source.mime));whole(source.bytes,'INVALID_SCENARIO_PACKAGE');fail(source.bytes>0&&source.bytes<=mediaLimits.variantBytes);
  const ext={ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[source.mime];
  return {id,version:1,name:text(a.name,150,true),category:text(a.category??'',80),universe:text(a.universe??'',100),credit:text(a.credit??'',500),tags,source:{path:`images/${id}.${ext}`,mime:source.mime,bytes:source.bytes,...(source.sha256!==undefined?{sha256:source.sha256}:{})}};
}
export function cleanScenarioPackage(input,{requireHashes=true}={}){
  object(input);fail(input.format==='gn-engine-scenario'&&input.version===1);
  requireThat(Buffer.byteLength(JSON.stringify(input))<=packageLimits.manifestBytes,'SCENARIO_PACKAGE_TOO_LARGE');
  const snapshot=cleanScenarioSnapshot(input),references=imageReferences(snapshot.records),seen=new Set();
  const images=array(input.images,packageLimits.images).map(a=>{object(a);object(a.source);const clean=packageImage(a,a.source);fail(!seen.has(clean.id)&&references.has(clean.id)&&clean.source.path===a.source.path);seen.add(clean.id);if(requireHashes)fail(typeof clean.source.sha256==='string'&&/^[a-f0-9]{64}$/.test(clean.source.sha256));return clean;}).sort((a,b)=>a.id.localeCompare(b.id));
  fail(seen.size===references.size);requireThat(images.reduce((n,a)=>n+a.source.bytes,0)+Buffer.byteLength(JSON.stringify(input))<=packageLimits.archiveBytes,'SCENARIO_PACKAGE_TOO_LARGE');
  const source=object(input.source);fail(['CURRENT','VERSION'].includes(source.kind));
  return {format:'gn-engine-scenario',version:1,source:{kind:source.kind,revision:revision(source.revision)},...snapshot,images};
}
export const packageDigest=manifest=>mediaHash(JSON.stringify(manifest));
export const packageSummary=m=>({title:m.scenario.title,counts:Object.fromEntries(scenarioCollections.map(k=>[k,m.records[k].length])),images:m.images.length,bytes:m.images.reduce((n,a)=>n+a.source.bytes,0),source:m.source});
export function remapPackageImages(value,map){
  if(Array.isArray(value))return value.map(v=>remapPackageImages(v,map));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,key==='mediaImages'?Object.fromEntries(Object.entries(v).map(([slot,r])=>[slot,r?{id:ref(r.id,new Set(map.keys()))&&map.get(r.id),version:1}:null])):remapPackageImages(v,map)]));
}
