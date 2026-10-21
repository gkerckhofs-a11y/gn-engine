import {seedShip} from './navigation-state.mjs';
import {seedFieldTargets} from './field-state.mjs';
import {documentId,whole,requireThat} from './validation.mjs';
import {createClock} from './clock.mjs';
import {initialHealth} from './health-state.mjs';
import {actionPointMaximum} from './action-point-state.mjs';
import {recordPublication} from './narrative.mjs';
import {seedWallets} from './economy-state.mjs';
import {seedInventory} from './inventory-state.mjs';
import {seedKnowledge} from './knowledge.mjs';
const text=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),'INVALID_TEXT');return v.trim();};
const optional=(v,max)=>text(v??'',max);
const charPath=(sid,cid)=>`sessions/${sid}/characters/${cid}`;
export const scenarioCollections=['characters','groups','knowledge','skills','classes','items','fieldTargets','personProfiles','warehouses','ships','routes','commodityPrices','priceEvents'];
export async function readScenarioVersion(tx,id,vid){
 const v=await tx.get(`scenarios/${id}/versions/${vid}`);requireThat(v,'NOT_FOUND');
  const [chars,groups,knowledge,skills,classes,items,fieldTargets,personProfiles,warehouses,ships,routes,commodityPrices,priceEvents]=await Promise.all(scenarioCollections.map(k=>tx.list(`scenarios/${id}/versions/${vid}/${k}`)));
 return {v,chars,groups,knowledge,skills,classes,items,fieldTargets,personProfiles,warehouses,ships,routes,commodityPrices,priceEvents};
}
export function sessionFromVersion(input,data,newId,actor,at){
 const {v,chars,groups}=data,id=documentId(input.scenarioId),vid=documentId(input.versionId);
        const capacity=whole(input.capacity); requireThat(capacity>0,'INVALID_CAPACITY');
        const fields=Array.isArray(input.fields) ? input.fields : []; requireThat(fields.length<=20,'TOO_MANY_FIELDS');
        const cleanFields=fields.map(f=>({id:documentId(f.id),label:text(f.label,200,true),required:f.required===true}));
        requireThat(new Set(cleanFields.map(f=>f.id)).size===cleanFields.length,'DUPLICATE_FIELD');
        const s={id:newId,ownerUid:actor.uid,scenarioId:id,versionId:vid,title:text(input.title,150,true),summary:v.summary,
          date:optional(input.date,40),time:optional(input.time,80),place:optional(input.place,500),practical:optional(input.practical,4000),
          privacy:text(input.privacy,4000,true),capacity,accepted:0,registrationOpen:false,stage:'PREPARATION',fields:cleanFields,
          transportRules:v.transportRules??null,clock:createClock(),revision:1,createdAt:at,economyRules:v.economyRules??null,healthRules:v.healthRules??null,modules:{groups:groups.length>0}};
        if(v.masterRowBaseline?.length)s.masterRowBaseline=v.masterRowBaseline;
        if(v.actionPointRules){s.actionPointRules=v.actionPointRules;s.actionPointRulesRevision=1;s.actionPointSchedule={nextAtGameMs:v.actionPointRules.renewalMinutes*60000};for(const c of chars)actionPointMaximum(v.actionPointRules,c);}
        return s;
}
export function seedScenarioSession(tx,s,data,actor,at){
 const {v,chars,groups,knowledge,skills,classes,items}=data,newId=s.id;
        tx.set(`sessions/${newId}`,s);
        for(const c of chars) {
          const next={...c,...initialHealth(v.healthRules,c),sessionId:newId,publicCode:c.id,assignedUid:null,contentRevision:1,historyStarted:true};
          tx.set(charPath(newId,c.id),next);
          recordPublication(tx,`sessions/${newId}/characters`,null,next,{id:newId,at,actorUid:actor.uid,reason:'Création depuis la version de scénario',stage:'PREPARATION'});
        }
        for(const g of groups) {
          const next={...g,revision:1};tx.set(`sessions/${newId}/groups/${g.id}`,next);
          tx.set(`sessions/${newId}/groups/${g.id}/history/${newId}`,{id:newId,at,actorUid:actor.uid,actorEmail:actor.email,reason:'Création depuis la version de scénario',before:null,after:next});
        }
        for(const k of skills)tx.set(`sessions/${newId}/skills/${k.id}`,k);
        for(const k of classes)tx.set(`sessions/${newId}/classes/${k.id}`,k);
        for(const k of items)tx.set(`sessions/${newId}/items/${k.id}`,k);
        seedFieldTargets(tx,s,data.fieldTargets);
        for(const p of data.personProfiles??[])tx.set(`sessions/${newId}/personProfiles/${p.id}`,p);
        for(const w of data.warehouses??[])tx.set(`sessions/${newId}/warehouses/${w.id}`,{...w,tenantType:'CHARACTER',tenantId:null,expiresAtGameMs:null,revision:1});
        for(const ship of data.ships??[])tx.set(`sessions/${newId}/ships/${ship.id}`,seedShip(ship));
        for(const route of data.routes??[])tx.set(`sessions/${newId}/routes/${route.id}`,route);
        for(const kind of ['commodityPrices','priceEvents'])for(const record of data[kind]??[])tx.set(`sessions/${newId}/${kind}/${record.id}`,record);
        seedWallets(tx,s,chars,at,actor.uid,groups);
        seedInventory(tx,newId,chars,at,actor.uid);
        seedKnowledge(tx,newId,knowledge,at);
}
