import {treatmentLot,treatmentStock,consumeTreatmentLot,personalLot,publicLot,effectiveLot} from './inventory-state.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {healthRulesInput,healthState,healthSummary,initialHealth,requireGameAction} from './health-state.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const reason=v=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=500,'INVALID_HEALTH');return v.trim();};
const charPath=(sid,cid)=>`sessions/${sid}/characters/${cid}`;
const usePath=(sid,cid,kid)=>`${charPath(sid,cid)}/skillUses/${kid}`;
const activeSkill=(c,id)=>{
  const skill=c.abilityProfile?.published?c.abilityProfile.skills.find(s=>s.id===id):null;
  requireThat(skill&&['ACTIVE_SELF','ACTIVE_TARGET'].includes(skill.kind)&&skill.healing?.effect==='HEAL_HP','FORBIDDEN');return skill;
};
const available=(skill,use,time)=>({used:use?.used??0,remaining:skill.healing.uses===null?null:Math.max(0,skill.healing.uses-(use?.used??0)),
  waitMs:use?.lastUsedGameMs==null?0:Math.max(0,skill.healing.cooldownSeconds*1000-(time-use.lastUsedGameMs))});
const projectEvent=e=>({id:e.id,kind:e.kind,at:e.at,sourceName:e.sourceName??'',targetName:e.targetName??'',skillName:e.skillName??'',before:e.before,after:e.after,restored:e.restored??null,consumable:e.consumable?{name:e.consumable.name,quantity:e.consumable.quantity,unit:e.consumable.unit}:null});
const writes=new Set(['saveScenarioHealth','saveSessionHealth','correctHealth','applyDamage','applyTreatment']);
export const healthAction=a=>writes.has(a)||['myHealth','previewHealth','healthHistory','prepareDamage','prepareTreatment'].includes(a);

export function createHealthService({store,signed,checkSession,checkScenario,now,uuid}){
  const player=async(tx,actor,input,preview=false)=>{
    const sid=documentId(input.sessionId),s=preview?await checkSession(tx,actor,sid):await tx.get(`sessions/${sid}`);
    requireThat(s&&s.stage!=='ARCHIVED','FORBIDDEN');
    const r=preview?null:await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);
    if(!preview)requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
    const c=await tx.get(charPath(sid,preview?documentId(input.characterId):r.characterId));
    requireThat(c&&(preview||c.assignedUid===actor.uid),'FORBIDDEN');
    requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'BRIEFING_CLOSED');
    requireThat(c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','CONTENT_UNPUBLISHED');
    requireThat(s.healthRules?.enabled,'HEALTH_DISABLED');healthState(c);
    return {s,c,r};
  };
  const treatmentContext=async(tx,ctx,input,at)=>{
    const {s,c,r}=ctx,skill=activeSkill(c,documentId(input.skillId));requireGameAction(s,c,'heal');
    const targetId=documentId(input.targetId);requireThat(skill.kind==='ACTIVE_SELF'?targetId===c.id:targetId!==c.id,'INVALID_RECIPIENT');
    const t=targetId===c.id?c:await tx.get(charPath(s.id,targetId));
    requireThat(t?.publicationState==='PUBLISHED'&&t.public?.publicationState==='PUBLISHED'&&t.assignedUid,'INVALID_RECIPIENT');
    const tr=targetId===c.id?r:await tx.get(`sessions/${s.id}/registrations/${hash(t.assignedUid)}`);
    requireThat(tr?.status==='ACCEPTED'&&tr.accessActive&&tr.characterId===t.id,'INVALID_RECIPIENT');healthState(t);
    const use=await tx.get(usePath(s.id,c.id,skill.id));
    const lot=await treatmentLot(tx,s.id,c.id,skill.healing.consumable,input.lotId,at);
    return {skill,t,tr,use,lot};
  };
  const damage=(ctx,input)=>{
    const {s,c,r}=ctx,before=healthState(c),amount=whole(input.amount,'INVALID_HEALTH');
    requireThat(amount>0&&before.hp>0,'NO_DAMAGE_POSSIBLE');
    const hp=Math.max(0,before.hp-amount),after={...before,hp,outOfCombat:hp===0||before.outOfCombat,revision:before.revision+1};
    const confirmation=hash(JSON.stringify([s.id,s.healthRules,c.id,c.public.displayName,r.accessVersion,before,amount]));
    return {characterName:c.public.displayName,before,after,amount,confirmation};
  };
  const treatment=(ctx,x,at)=>{
    const {s,c,r}=ctx,{skill,t,tr,use}=x,time=gameTime(s.clock,at),cost=available(skill,use,time),before=healthState(t);
    requireThat(cost.remaining===null||cost.remaining>0,'NO_USES_LEFT');requireThat(cost.waitMs===0,'COOLDOWN_ACTIVE');
    requireThat(before.hp<before.maxHp,'NO_HEAL_NEEDED');
    const consumable=treatmentStock(skill.healing.consumable,x.lot);
    const restored=Math.min(skill.healing.amount,before.maxHp-before.hp),hp=before.hp+restored;
    const after={...before,hp,outOfCombat:s.healthRules.returnMode==='HP_POSITIVE'?false:before.outOfCombat,revision:before.revision+1};
    // The clock is deliberately absent: a valid ready action can be confirmed a few seconds later.
    const confirmation=hash(JSON.stringify([s.id,s.healthRules,c.id,c.public.displayName,r.accessVersion,c.abilityProfile.revision,healthState(c),skill,t.id,t.public.displayName,t.assignedUid,tr.accessVersion,before,use,consumable]));
    return {sourceName:c.public.displayName,target:{id:t.id,name:t.public.displayName},skill:{id:skill.id,name:skill.name,healing:skill.healing},before,after,restored,
      remainingAfter:cost.remaining===null?null:cost.remaining-1,cooldownSeconds:skill.healing.cooldownSeconds,consumable,confirmation};
  };
  return async(action,actor,input)=>{
    signed(actor);const at=now(),newId=uuid();
    if(['saveScenarioHealth','saveSessionHealth','correctHealth','healthHistory'].includes(action))return store.runTransaction(async tx=>{
      const scenario=action==='saveScenarioHealth',id=documentId(scenario?input.scenarioId:input.sessionId);
      const s=scenario?await checkScenario(tx,actor,id):await checkSession(tx,actor,id),base=`${scenario?'scenarios':'sessions'}/${id}`;
      if(action==='healthHistory'){
        const cid=documentId(input.characterId);requireThat(await tx.get(`${base}/characters/${cid}`),'NOT_FOUND');
        return {events:await tx.list(`${base}/characters/${cid}/healthHistory`,null,{orderBy:'at',direction:'desc',limit:30})};
      }
      requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
      const requestId=documentId(input.requestId),op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=hash(JSON.stringify([action,input]));
      const previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
      requireThat(s.revision===input.revision,'STALE_REVISION');const memo=scenario?'Configuration du scénario':reason(input.reason);
      let result,event={id:newId,action,at,actorUid:actor.uid,reason:memo};
      if(action==='correctHealth'){
        requireThat(s.healthRules?.enabled,'HEALTH_DISABLED');const cid=documentId(input.characterId),c=await tx.get(charPath(id,cid));requireThat(c,'NOT_FOUND');
        const before=healthState(c);requireThat(before.revision===input.healthRevision,'STALE_REVISION');
        const hp=whole(input.hp,'INVALID_HEALTH'),maxHp=whole(input.maxHp,'INVALID_HEALTH');
        requireThat(maxHp>0&&hp<=maxHp&&typeof input.outOfCombat==='boolean'&&(hp!==0||input.outOfCombat),'INVALID_HEALTH');
        const after={hp,maxHp,outOfCombat:input.outOfCombat,revision:before.revision+1};
        event={...event,kind:'GM',characterId:cid,before,after};
        tx.set(charPath(id,cid),{...c,hp,maxHp,outOfCombat:after.outOfCombat,healthRevision:after.revision});
        tx.set(`${charPath(id,cid)}/healthHistory/${newId}`,event);result={id:newId,health:after};
      }else{
        const rules=healthRulesInput(input.rules),chars=!scenario&&rules.enabled?await tx.list(`${base}/characters`):[];
        // Enabling a legacy session initializes only characters without health, never heals an existing one.
        for(const c of chars)if(c.maxHp==null)tx.set(`${base}/characters/${c.id}`,{...c,...initialHealth(rules)});
        event={...event,before:s.healthRules??null,after:rules};result={enabled:rules.enabled};
        tx.set(base,{...s,healthRules:rules,revision:s.revision+1});
      }
      if(action==='correctHealth')tx.set(base,{...s,revision:s.revision+1});
      tx.set(`${base}/healthHistory/${newId}`,event);if(!scenario)tx.set(`${base}/audit/${newId}`,event);
      tx.set(op,{fingerprint,result,at});return result;
    });
    return store.runTransaction(async tx=>{
      const preview=action==='previewHealth',ctx=await player(tx,actor,input,preview),{s,c,r}=ctx;
      if(action==='myHealth'||preview){
        const skills=c.abilityProfile?.published?c.abilityProfile.skills.filter(k=>['ACTIVE_SELF','ACTIVE_TARGET'].includes(k.kind)&&k.healing?.effect==='HEAL_HP'):[];
        const stock=skills.some(k=>k.healing.consumable)?(await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id])).map(l=>effectiveLot(l,at)).filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.item.consumable):[];
        const items=[];for(const k of skills){const use=await tx.get(usePath(s.id,c.id,k.id));items.push({id:k.id,name:k.name,description:k.description,instructions:k.instructions,kind:k.kind,healing:k.healing,lots:k.healing.consumable?stock.filter(l=>l.item.id===k.healing.consumable.itemId&&l.item.revision===k.healing.consumable.itemRevision).map(publicLot):[],...available(k,use,gameTime(s.clock,at))});}
        const history=await tx.list(`${charPath(s.id,c.id)}/healthHistory`,null,{orderBy:'at',direction:'desc',limit:30});
        return {session:{id:s.id,stage:s.stage},preview,character:{id:c.id,name:c.public.displayName},health:healthSummary(s,c),skills:items,events:history.map(projectEvent)};
      }
      const healing=action==='prepareTreatment'||action==='applyTreatment',x=healing?await treatmentContext(tx,ctx,input,at):null;
      if(action==='prepareDamage'||action==='prepareTreatment'){
        requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');return healing?treatment(ctx,x,at):damage(ctx,input);
      }
      const requestId=documentId(input.requestId),op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=hash(JSON.stringify([action,input]));
      const previous=await tx.get(op);
      if(previous){
        requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');
        requireThat(previous.characterId===c.id&&previous.accessVersion===r.accessVersion,'FORBIDDEN');
        if(healing)requireThat(previous.targetUid===x.t.assignedUid&&previous.targetAccessVersion===x.tr.accessVersion,'FORBIDDEN');
        return previous.result;
      }
      requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');
      const prepared=healing?treatment(ctx,x,at):damage(ctx,input);
      requireThat(input.confirmation===prepared.confirmation,'STALE_REVISION');
      const t=healing?x.t:c,after=prepared.after,kind=healing?'HEAL':'DAMAGE';
      const event={id:newId,kind,at,actorUid:actor.uid,sourceName:c.public.displayName,targetName:t.public.displayName,characterId:t.id,
        before:prepared.before,after,consumable:prepared.consumable??null,skillName:healing?x.skill.name:'',restored:healing?prepared.restored:null};
      const used=healing?whole((x.use?.used??0)+1,'INVALID_HEALING'):null;
      tx.set(charPath(s.id,t.id),{...t,hp:after.hp,maxHp:after.maxHp,outOfCombat:after.outOfCombat,healthRevision:after.revision});
      tx.set(`${charPath(s.id,t.id)}/healthHistory/${newId}`,event);
      if(healing){
        consumeTreatmentLot(tx,s.id,x.lot,prepared.consumable,{id:newId,at,actorUid:actor.uid,skillId:x.skill.id});
        tx.set(usePath(s.id,c.id,x.skill.id),{used,lastUsedGameMs:gameTime(s.clock,at)});
        if(t.id!==c.id)tx.set(`${charPath(s.id,c.id)}/healthHistory/${newId}`,{...event,kind:'HEAL_SENT'});
      }
      tx.set(`sessions/${s.id}/audit/${newId}`,{...event,action});
      const result={id:newId,kind,targetName:t.public.displayName,health:after,restored:prepared.restored??null,consumable:prepared.consumable??null,remainingAfter:prepared.remainingAfter??null};
      tx.set(op,{fingerprint,result,at,characterId:c.id,accessVersion:r.accessVersion,...(healing?{targetUid:t.assignedUid,targetAccessVersion:x.tr.accessVersion}:{})});
      return result;
    });
  };
}
